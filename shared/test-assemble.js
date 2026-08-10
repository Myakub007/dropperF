const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { chunkAndStoreFile, readChunk } = require('./hasher');
const { reassembleFile } = require('./reassembler');

const TEST_FILE = path.join(__dirname, '__test_hash.bin');
const TEST_SIZE = 10 * 1024 * 1024; // 10MB, deliberately not a clean multiple of 4MB
const STORAGE_DIR = path.join(__dirname,'..','storage');
async function generateTesthashes() {
  console.log(`Generating ${TEST_SIZE / 1024 / 1024}MB test file...`);
  const buf = crypto.randomBytes(TEST_SIZE);
  fs.writeFileSync(TEST_FILE, buf);

  console.log('Chunking + hashing + storing (pass 1)...');
  const hashes1 = await chunkAndStoreFile(TEST_FILE, { storageDir: STORAGE_DIR });
  console.log(hashes1);
  return hashes1;
}

async function uploadingChunks(){
    const hashes = await generateTesthashes();

    
    for(const hash of hashes){
        const chunkBuf = await readChunk(hash,STORAGE_DIR)
        const res = await fetch(`http://localhost:3000/chunks/${hash}`,{
            method:"POST",
            headers:{
                "Content-Type":"application/octet-stream"
            },
            body:chunkBuf
        });

        if (!res.ok) {
      throw new Error(`Upload failed for ${hash}: ${res.status}`);
    }
    console.log(`Uploaded ${hash}`);
    }

    return hashes;
}

const reassemble = async ()=>{
    const hashes = await uploadingChunks();
    await reassembleFile(hashes,path.join(__dirname,"..","reassembled.bin"));
    const reassembled = fs.readFileSync(path.join(__dirname, "..", "reassembled.bin"));
const original = fs.readFileSync(path.join(__dirname, "..", "shared", "__test_hash.bin"));

const result = Buffer.compare(original,reassembled);

if(result === 0){
    console.log("pass");

}else{
    console.log("fail");
}
}

reassemble();

