const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chunkFileToArray, Chunk_Size } = require('./chunkGen');

console.log(Chunk_Size);

const TEST_FILE = path.join(__dirname, '__test_20mb.bin');
const TEST_SIZE = 20 * 1024 * 1024; // 20MB

async function main() {
  console.log(`Generating ${TEST_SIZE / 1024 / 1024}MB test file...`);
  // Random bytes so we're not just testing against zeros
  const buf = crypto.randomBytes(TEST_SIZE);
  fs.writeFileSync(TEST_FILE, buf);

  console.log('Chunking...');
  const chunks = await chunkFileToArray(TEST_FILE, Chunk_Size);

  console.log(`Produced ${chunks.length} chunks:`);
  chunks.forEach((c, i) => {
    console.log(`  chunk ${i}: ${c.length} bytes`);
  });

  const expectedFullChunks = Math.floor(TEST_SIZE / Chunk_Size); // 5
  const remainder = TEST_SIZE % Chunk_Size; // 0 for exactly 20MB/4MB

  const expectedCount = remainder > 0 ? expectedFullChunks + 1 : expectedFullChunks;

  const totalBytes = chunks.reduce((sum, c) => sum + c.length, 0);
  const allFullSizeExceptLast = chunks.every((c, i) =>
    i === chunks.length - 1 ? c.length <= Chunk_Size : c.length === Chunk_Size
  );

  const pass =
    chunks.length === expectedCount &&
    totalBytes === TEST_SIZE &&
    allFullSizeExceptLast;

  console.log('\n--- Results ---');
  console.log(`Expected chunk count: ${expectedCount}, got: ${chunks.length}`);
  console.log(`Total bytes reassembled: ${totalBytes}, expected: ${TEST_SIZE}`);
  console.log(pass ? 'PASS ✅' : 'FAIL ❌');

  fs.unlinkSync(TEST_FILE);
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});