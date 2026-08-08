const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { chunkAndStoreFile, readChunk } = require('./hasher');

const TEST_FILE = path.join(__dirname, '__test_hash.bin');
const TEST_SIZE = 10 * 1024 * 1024; // 10MB, deliberately not a clean multiple of 4MB
const STORAGE_DIR = path.join(os.tmpdir(), 'chunker-test-storage-' + Date.now());

async function main() {
  console.log(`Generating ${TEST_SIZE / 1024 / 1024}MB test file...`);
  const buf = crypto.randomBytes(TEST_SIZE);
  fs.writeFileSync(TEST_FILE, buf);

  console.log('Chunking + hashing + storing (pass 1)...');
  const hashes1 = await chunkAndStoreFile(TEST_FILE, { storageDir: STORAGE_DIR });

  console.log('Chunking + hashing + storing (pass 2, same file)...');
  const hashes2 = await chunkAndStoreFile(TEST_FILE, { storageDir: STORAGE_DIR });

  console.log(`\nPass 1 hashes (${hashes1.length}):`);
  hashes1.forEach((h, i) => console.log(`  [${i}] ${h}`));

  // --- Check 1: determinism ---
  const deterministic =
    hashes1.length === hashes2.length &&
    hashes1.every((h, i) => h === hashes2[i]);

  // --- Check 2: reassembly integrity (read chunks back, concat, compare) ---
  const reassembled = Buffer.concat(
    await Promise.all(hashes1.map((h) => readChunk(h, STORAGE_DIR)))
  );
  const byteIdentical = Buffer.compare(reassembled, buf) === 0;

  // --- Check 3: dedup — a chunk that repeats within the file should only
  // produce one stored file on disk (same hash = same path). We check this
  // indirectly: unique hash count <= chunk count, and every hash resolves
  // to a real file on disk exactly once.
  const uniqueHashes = new Set(hashes1);
  let allFilesExist = true;
  for (const h of uniqueHashes) {
    const p = path.join(STORAGE_DIR, h.slice(0, 2), h);
    if (!fs.existsSync(p)) allFilesExist = false;
  }

  console.log('\n--- Results ---');
  console.log(`Deterministic (same hashes both passes): ${deterministic ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`Reassembled bytes match original: ${byteIdentical ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`All ${uniqueHashes.size} unique chunks exist on disk: ${allFilesExist ? 'PASS ✅' : 'FAIL ❌'}`);

  const pass = deterministic && byteIdentical && allFilesExist;
  console.log(pass ? '\nALL CHECKS PASSED ✅' : '\nSOME CHECKS FAILED ❌');

  // cleanup
  fs.unlinkSync(TEST_FILE);
  fs.rmSync(STORAGE_DIR, { recursive: true, force: true });

  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});