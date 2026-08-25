const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const { chunkFile } = require('../shared/chunkGen');
const { hashChunk } = require('../shared/hasher');
const {chunkExistsOnServer,uploadChunk} = require('./upload');
const { saveFileState} = require('./state');
const axios = require('axios');

const WATCH_DIR = './watched-folder';
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc4NzY3NzUwNiwiZXhwIjoxNzg4MjgyMzA2fQ.TKx0G5lS3p-fXgz9Ta_T1bu0G4TyaPYmY8eCvIf9F_Q";
const API_BASE = 'http://localhost:3000';

const watcher = chokidar.watch(WATCH_DIR);

async function handleFileEvent(filePath) {
    console.log(`\nProcessing: ${filePath}`);
    const hashes = [];
    let uploaded = 0;
    let skipped = 0;

    for await (const buffer of chunkFile(filePath)){
        const hash = hashChunk(buffer);
        hashes.push(hash);
        
        const exists = await chunkExistsOnServer(hash,TOKEN);

        if(exists){
            console.log(`chunk ${hash} -- already on server,skipping`);
            skipped++;
        }else{
            await uploadChunk(hash,buffer,TOKEN);
            console.log(`chunk ${hash} -- uploaded`);
            uploaded++;
        }
    }


    const relativePath = '/' + path.relative(WATCH_DIR,filePath).replace(/\\/g,'/');
    await axios.post(`${API_BASE}/files`,{
        path: relativePath,
        hashes
    },{
        headers:{Authorization: `Bearer ${TOKEN}`}
    })

    const mtime = fs.statSync(filePath).mtimeMs;
    saveFileState(relativePath,hashes,mtime);

    console.log(`Done: ${uploaded} uploaded, ${skipped} skipped, metadata + state saved`);
}

watcher.on('add',handleFileEvent);
watcher.on('change',handleFileEvent);
watcher.on('unlink',filePath=>{
    console.log('File deleted:' , filePath);
});
