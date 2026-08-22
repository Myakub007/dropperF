// test-diff.js
const { diff, scanCurrentState } = require('./diff');
const { getKnownState,saveFileState,deleteFileState } = require('./state');

const WATCH_DIR = './watched-folder';

function commitState(){
    const current = scanCurrentState(WATCH_DIR);
    const known = getKnownState();

    for (const [filePath,info] of Object.entries(current)){
        saveFileState(filePath,[],info.mtime);
    }

    for(const filePath of Object.keys(known)){
        if(!current[filePath]){
            deleteFileState(filePath);
        }
    }
}

console.log('Known state:', getKnownState());
console.log('Current state:', scanCurrentState('./watched-folder'));

const result = diff();
console.log('Added:', result.added);
console.log('Modified:', result.modified);
console.log('Deleted:', result.deleted);

commitState();
console.log('State committed.')