const { fileExistsLocally } = require('./conflictHelper');
const { getKnownState } = require('./state');

function flattenTreeToFiles(node,files = []){
    if(node.type === 'file'){
        files.push({path:node.path,hashes:node.hashes});
    }else if(node.children){
        for(const child of node.children){
            flattenTreeToFiles(child,files);
        }
    }
    return files;
}

function diffAgainstServer(serverTree){
    const serverFiles = flattenTreeToFiles(serverTree);
    const known = getKnownState();

    const needsDownload =[];
    const needsDelete=[];

    const serverPaths = new Set(serverFiles.map(f=>f.path));

    for(const file of serverFiles){
        const local = known[file.path];

        if(!local){
            needsDownload.push(file);
        } else{
            const sameHashes = JSON.stringify(local.hashList) === JSON.stringify(file.hashes);
            if(!sameHashes){
                needsDownload.push(file);
            }
        }
    }

    for (const localPath of Object.keys(known)){
        if(!serverPaths.has(localPath)){
            needsDelete.push(localPath)
        }
    }

    return {needsDownload,needsDelete};
}

module.exports = { diffAgainstServer,flattenTreeToFiles};