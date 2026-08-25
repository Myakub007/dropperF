const fs = require('fs');
const path = require('path');

async function reassembleFile(hashes,destpath,token){
    const writeStream = fs.createWriteStream(destpath);
    for (const hash of hashes){
        const res = await fetch(`http://localhost:3000/chunks/${hash}`,{
            headers:{Authorization: ` Bearer ${token}`}
        });
        if(!res.ok){
            throw new Error(`failed to fetch chunk ${hash}: ${res.status}`);
        }
        const arrBuf = await res.arrayBuffer();
        const recievedBuf = Buffer.from(arrBuf);
        writeStream.write(recievedBuf);
    }
    await new Promise ((resolve,reject)=>{
        writeStream.end(resolve);
        writeStream.on('error',reject);
    })
}

module.exports = {reassembleFile};