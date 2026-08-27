const {chunkFile } = require('../shared/chunkGen');
const {hashChunk } = require('../shared/hasher');

const fs = require('fs');
async function getCurrentLocalHashes(filePath){
    const hashes=[];
    for await (const buffer of chunkFile(filePath)){
        hashes.push(hashChunk(buffer));
    }
    return hashes;
}

function fileExistsLocally(filePath){
    return fs.existsSync(filePath)
}

module.exports = {getCurrentLocalHashes,fileExistsLocally};