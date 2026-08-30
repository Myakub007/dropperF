const axios = require('axios');
const API_BASE = 'http://localhost:3000';

async function getServerHashesForPath(targetPath,token){
    const res = await axios.get(`${API_BASE}/tree`,{
        headers:{
            Authorization:`Bearer ${token}`
        }
    })

    function search(node){
        if(node.type==='file' && node.path === targetPath){
            return node.hashes;
        }
        if(node.children){
            for(const child of node.children){
                const found = search(child);
                if(found) return found;
            }
        }
        return null;
    }

    return search(res.data.tree);
}

module.exports = {getServerHashesForPath};