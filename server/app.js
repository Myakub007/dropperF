const express = require("express");
const app = express();
const pool = require("./db");
const fs = require('fs');
const { type } = require("os");
const crypto = require('crypto');
const { storeChunk, Storage_Dir, hashChunk, readChunk } = require("../shared/hasher");

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get("/health", async (req,res)=>{
        try{
        await pool.connect();
        const dbres = await pool.query("SELECT NOW()");
        console.log(dbres.rows[0].now);
        console.log("connection succesfull");
        res.send({success:true});
    }catch(err){
        console.log("connection failed");
        console.error(err);
    }
})

app.get("/chunks/:hash", async (req,res)=>{
    const claimedHash = req.params.hash;
    try{
        const acquiredBuf =await readChunk(claimedHash);

        res.set('Content-type','application/octet-stream');
        res.status(200).send(acquiredBuf);
    }catch(err){
        if(err.code === 'ENOENT'){
            res.status(404).send({success:false,message:"chunk not found"});
        }
        else{
            console.error(err);
            res.status(500).send({success:false,message:"something went wrong!"});
        }
    }
})

app.post("/chunks/:hash",express.raw({type:"application/octet-stream",limit: "10mb"}),async (req,res)=>{
    try{
    const chunkBuf = req.body;
    const claimedHash = req.params.hash;

    if (!chunkBuf || chunkBuf.length === 0) {
    return res.status(400).send({ success: false, message: "empty body" });
    }
    
    const computedHash = hashChunk(chunkBuf);
    if(computedHash === claimedHash){
        const file = await storeChunk(chunkBuf);
        res.status(200).send({success:true,message:"chunk stored",hash:file.hash,isNew:file.isNew});
    }else{
        res.status(400).send({success:false,message:"chunk does not match"});
    }
    }catch(err){
        console.error(err)
        res.status(500).send({success:false,message:"something went wrong!"})
    }
})

app.listen(3000,()=>{
    console.log("server running....");
})