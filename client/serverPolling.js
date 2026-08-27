const axios = require('axios');
const fs = require('fs');
const path = require('path');
const {diffAgainstServer}= require('./pullsync');
const { reassembleFile } = require('../shared/reassembler');
const { saveFileState, deleteFileState, getKnownState } = require('./state'); 
const { fileExistsLocally, getCurrentLocalHashes } = require('./conflictHelper');

const API_BASE = "http://localhost:3000";
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc4Nzc2NjYxMiwiZXhwIjoxNzg4MzcxNDEyfQ.V_tmfzanSw-Cl8VJZ_gecEczw3q7-Dp73KMyiAhO6AU';
const WATCH_DIR = './watched-folder';
const POLL_INTERVAL_MS = 5000;

async function pollOnce(){
    console.log('\nPolling Server...');

    const res = await axios.get(`${API_BASE}/tree`,{
        headers:{
            Authorization:`Bearer ${TOKEN}`
        }
    })

    const serverTree = res.data.tree;
    // const needsDownload = diffAgainstServer(serverTree).needsDownload;
    // const needsDelete = diffAgainstServer(serverTree).needsDelete; 
    // multiple calls for no reason

    const {needsDownload,needsDelete} = diffAgainstServer(serverTree);

    if(needsDownload.length === 0){
        console.log('Nothing new.')
    }else{
            console.log('Needs download:',needsDownload.map(f=>f.path));
            for(const file of needsDownload){
                const destpath = path.join(WATCH_DIR,file.path);
                const known = getKnownState();
                const lastSyncedHashes = known[file.path]?.hashList || [];
                // console.log(destpath);

                let isConflict = false;
                if(fileExistsLocally(destpath)){
                    const CurrentLocalHashes = await getCurrentLocalHashes(destpath);
                    const localChangedSinceSync = JSON.stringify(CurrentLocalHashes) !== JSON.stringify(lastSyncedHashes);

                    if(localChangedSinceSync){
                        isConflict = true;
                    }
                }
                if(isConflict){
                    console.log(`CONFLICT detected: ${file.path}`);
                    const ext = path.extname(destpath);
                    const base = destpath.slice(0,-ext.length);
                    const conflictPath = `${base} (conflicted copy)${ext}`;
                    await reassembleFile(file.hashes, conflictPath, TOKEN);
                    console.log(`saved incoming version as ${conflictPath}`)
                }else{
                    await reassembleFile(file.hashes, destpath, TOKEN);
                    saveFileState(file.path,file.hashes,Date.now());
                    console.log(`-> ${file.path} downloaded`);
                }
            }
    }
    if(needsDelete.length === 0){
        console.log('Nothing to delete.');
    }else{
        console.log('Files removed from server:', needsDelete);
        for(const filePath of needsDelete){
            const localFullPath = path.join(WATCH_DIR,filePath)
            fs.rmSync(localFullPath);
            deleteFileState(filePath);
            console.log(`  -> ${filePath} deleted locally`);
        }
    }


}

setInterval(()=>{
    pollOnce().catch(err=>console.error('Poll failed:', err.message));
},POLL_INTERVAL_MS);

console.log(`Polling every ${POLL_INTERVAL_MS/1000}s...`)