const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chunkFile } = require('./chunkGen');

const Storage_Dir = path.join(__dirname,'..','server/server-storage');


function hashChunk(buffer){
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function chunkPath(hash,storageDir = Storage_Dir){
    const subdir = hash.slice(0,2);
    return path.join(storageDir,subdir,hash);
}


async function storeChunk(buffer,storageDir = Storage_Dir){
    const hash = hashChunk(buffer);
    const dest = chunkPath(hash,storageDir);

    if(fs.existsSync(dest)){
        return {hash, isNew:false}
    }

    await fs.promises.mkdir(path.dirname(dest),{recursive:true});
    await fs.promises.writeFile(dest,buffer);
    return {hash,isNew:true};
}

async function readChunk(hash,storageDir=Storage_Dir) {
    return fs.promises.readFile(chunkPath(hash,storageDir));
}

async function chunkAndStoreFile(filepath,{chunkSize, storageDir}={}){
    const hashes = [];
    for await (const chunk of chunkFile(filepath,chunkSize)){
        const {hash} = await storeChunk(chunk,storageDir)
        hashes.push(hash);
    }
    return hashes;
}


module.exports = {
    hashChunk,
    chunkPath,
    storeChunk,
    readChunk,
    chunkAndStoreFile,
    Storage_Dir,
};