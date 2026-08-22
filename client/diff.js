const fs = require('fs');
const path = require('path');
const { getKnownState } = require('./state');
const { chunkAndStoreFile } = require('../shared/hasher');

const WATCH_DIR = './watched-folder';

function scanCurrentState(dir, baseDir = dir){
    const results = {};
    const entries = fs.readdirSync(dir,{withFileTypes:true})

    for(const entry of entries){
        const fullPath = path.join(dir,entry.name);
        const relativePath = '/' + path.relative(baseDir,fullPath).replace(/\\/g,'/');

        if(entry.isDirectory()){
            Object.assign(results,  scanCurrentState(fullPath, baseDir));
        }else{
            const stat = fs.statSync(fullPath);
            results[relativePath] = {mtime: stat.mtimeMs, fullPath};
        }
    }

    return results;
}


function diff(){
    const known = getKnownState();
    const current = scanCurrentState(WATCH_DIR);

    const added = [];
    const modified = [];
    const deleted = [];

    for ( const [filePath,info] of Object.entries(current)){
        if(!known[filePath]){
            added.push(filePath);
        } else if (known[filePath].mtime !== info.mtime){
            modified.push(filePath);
        }
    }

    for(const filePath of Object.keys(known)){
        if(!current[filePath]){
            deleted.push(filePath);
        }
    }

    return {added,modified, deleted};
}

module.exports = {diff, scanCurrentState};