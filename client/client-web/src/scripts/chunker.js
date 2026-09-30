const ChunkSize = 4*1024*1024;

async function* chunkFileBrowser(file){
    let offset = 0;
    while(offset < file.size){
        const slice = file.slice(offset,offset+ChunkSize);
        const buffer = await slice.arrayBuffer();
        yield buffer;
        offset += ChunkSize;
    }
}

export default chunkFileBrowser;