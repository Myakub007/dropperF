const fs = require('fs');
const path = require('path');

const Chunk_Size = 4*1024*1024; //4MB

async function* chunkFile(filepath,chunkSize = Chunk_Size) {
    const stream = fs.createReadStream(filepath,{highWaterMark:Chunk_Size})
    let leftover = Buffer.alloc(0);

    for await (const data of stream){
        let buf = leftover.length ? Buffer.concat([leftover,data]):data;

        while(buf.length >= chunkSize){
            yield buf.subarray(0,chunkSize);
            buf = buf.subarray(chunkSize);
        }

        leftover = buf;
    }
    if(leftover.length >0){
        yield leftover;
    }
}

async function chunkFileToArray(filepath,chunkSize = Chunk_Size) {
    const chunks = [];
    for await (const chunk of chunkFile(filepath,chunkSize)){
        chunks.push(chunk);
    }    
    return chunks;
}

module.exports = {chunkFile , chunkFileToArray , Chunk_Size} ;