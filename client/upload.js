const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function chunkExistsOnServer(hash,token){
    try{
        await axios.get(`${API_BASE}/chunks/${hash}`,{
            headers : { Authorization: `Bearer ${token}`}
        });
        return true;
    }catch(err){
        if(err.response?.status === 404){
            return false;
        }
        throw err;
    }
}

async function uploadChunk(hash,buffer,token){
    const res = await axios.post(`${API_BASE}/chunks/${hash}`,buffer,{
        headers:{
            Authorization: `Bearer ${token}`,
            "Content-Type":'application/octet-stream'
        }
    })
    return res.data;
}

module.exports = {chunkExistsOnServer,uploadChunk};