const express = require("express");
const app = express();
const WebSocket = require('ws');
const pool = require("./db");
const fs = require('fs');
const { type } = require("os");
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const url = require('url');
const { storeChunk, Storage_Dir, hashChunk, readChunk } = require("../shared/hasher");

app.use(express.json());
app.use(express.urlencoded({extended:true}));

function broadcastToUser(userId,event){
    const sockets = userSockets.get(userId);
    if(!sockets) return;

    const message = JSON.stringify(event);
    for(const socket of sockets){
        if(socket.readyState === WebSocket.OPEN){
            socket.send(message);
        }
    }
}

function requireAuth(req,res,next){
    const authHeader = req.headers.authorization;
    console.log('DEBUG authHeader:', authHeader, typeof authHeader); // ADD THIS
    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({success:false,message:'no token provided'});
    }

    const token = authHeader.split(' ')[1];
    
    try{
        const payload = jwt.verify(token,process.env.JWT_SECRET);
        req.userId = payload.userId;
        next();
    }catch(err){
        return res.status(401).json({success:false,message:"Login required!"});
    }
}

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

app.get("/chunks/:hash",requireAuth, async (req,res)=>{
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

app.post("/chunks/:hash",requireAuth,express.raw({type:"application/octet-stream",limit: "10mb"}),async (req,res)=>{
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

app.post('/files',requireAuth,async (req,res)=>{
    
    try{
        const {path,hashes} = req.body; 
        const userId = req.userId;
    
        const existing = await pool.query(
            'SELECT id FROM files WHERE user_id = $1 and path = $2',
            [userId,path]
        );
        
        let fileId;
    
        if(existing.rows.length >0){
            fileId = existing.rows[0].id;
        }else{
            const inserted = await pool.query(
                'INSERT INTO files (user_id, path) VALUES ($1 ,$2) RETURNING id',
                [userId,path]
            );
            fileId = inserted.rows[0].id;
        }
    
        const version = await pool.query(
            'INSERT INTO file_versions (file_id, hash_array) VALUES ($1, $2::text[]) RETURNING id,created_at',
            [fileId,hashes]
        );

        broadcastToUser(req.userId,{event: 'file_changed',path});
        
        res.status(201).json({
            success: true,
            fileId,
            versionId: version.rows[0].id,
            createdAt: version.rows[0].created_at
        });

    }catch(err){
        console.error(err);
        res.status(500).send({success: false,message: 'something went wrong!'})
    }
    
})


app.get('/files/:id',requireAuth,async (req,res)=>{
    try{
        const fileId = req.params.id;

        const fileResult = await pool.query('SELECT * FROM files WHERE id = $1',[fileId]);
        if(fileResult.rows.length === 0){
            return res.status(404).send({success:false,message:'file not found'});
        }
        
        const versionResult = await pool.query(
            'SELECT * FROM file_versions WHERE file_id = $1 ORDER BY created_at DESC LIMIT 1',[fileId]
        );
        if(versionResult.rows.length === 0){
            return res.status(404).send({success:false,message: 'no version found'})
        }
        
        const file = fileResult.rows[0];
        const version = versionResult.rows[0];

        res.status(200).send({
            success: true,
            file: {id: file.id,path:file.path,createdAt:file.created_at},
            latestVersion: {id: version.id,hashArray: version.hash_array,createdAt: version.created_at},
        });
    }catch(err){
        console.error(err);
        res.status(500).send({success:false,message: 'something went wrong!'});
    }
})

app.delete('/files',requireAuth,async(req,res)=>{
    try{
        const {path} = req.body;
        const userId = req.userId;
        
        const result = await pool.query(
            'DELETE FROM files WHERE user_id = $1 AND path = $2 RETURNING id',[userId,path]
        );
        if(result.rows.length === 0 ){
            return res.status(404).send({success:false,message:'file not found'});
        }

        broadcastToUser(req.userId,{event:'file_deleted',path});

        res.json({success:true,message: 'file deleted!'});


    }catch(err){
        console.error(err.message);
    }
})


app.post('/auth/login', async (req,res)=>{
    try {
        const {email,password} = req.body;

        const result = await pool.query('SELECT * FROM users WHERE email = $1',[email]);
        if(result.rows.length === 0){
            return res.status(401).json({success:false,message:"email/password incorrect!"})
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password,user.password_hash);

        if(!match){
            return res.status(401).json({success:false,message:"email/password incorrect!"});
        }
        
        const token = jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'7d'});

        res.json({success:true,token,user:{id:user.id,email:user.email}})
    } catch (err) {
        console.error(err);
        res.status(500).json({success:false,message:'something went wrong!'});
    }
})
app.post('/auth/register',async (req,res)=>{
    try{
            const {username,email,password} = req.body;
    const existing = await pool.query('SELECT id FROM users WHERE email = $1',[email]);
    if(existing.rows.length >0){
        return res.status(409).json({success:false,message:"User already registered!"})
    }
    const passhash = await bcrypt.genSalt(10).then(salt=>bcrypt.hash(password,salt));
    const result = await pool.query(
        'INSERT INTO users (username,email,password_hash) VALUES ($1,$2,$3) RETURNING id,email',[username,email,passhash]
    )
    
    const user = result.rows[0];
    const token = jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn: "7d"});

    res.status(201).json({success:true,token,user:{id:user.id,email:user.email}});
}catch(err){
        console.error(err);
        res.status(500).json({success:false,message:'something went wrong!'});
    }
})

app.get('/tree',requireAuth,async (req,res)=>{
    try{
        const result = await pool.query(
            'SELECT DISTINCT ON (f.id) f.id, f.path, fv.hash_array FROM files f LEFT JOIN file_versions fv ON fv.file_id = f.id WHERE f.user_id = $1 ORDER BY f.id, fv.created_at DESC',[req.userId]
        )
        console.log("DEBUG rows:", result.rows);
        
        const root = {name:'/',type: 'folder',children:{}};
        
        for (const file of result.rows){
            const parts = file.path.split('/').filter(Boolean) // removes empty strings
            let current = root;

            parts.forEach((part,index)=>{
                const isFile = index === parts.length -1;
                
                if(isFile){
                    current.children[part] = {name: part,type:'file',id: file.id,path:file.path,hashes:file.hash_array};
                }else{
                    if(!current.children[part]){
                        current.children[part] = {name: part,type:'folder',children:{}}
                    }
                    
                    current = current.children[part];
                }
            })
        }
        
        const toArray = (node)=>{
            if(node.type === 'file') return node;
            return{
                name: node.name,
                type: 'folder',
                children:Object.values(node.children).map(toArray)
            }
        }

        res.json({success: true,tree: toArray(root)});
    }catch(err){
        console.error(err);
        res.status(500).json({success:false,message:'something went wrong!'});
    }
})






const server = app.listen(3000,()=>{
    console.log("server running....");
})
const wss = new WebSocket.Server({server:server});

const userSockets = new Map();

wss.on('connection',(ws,req)=>{

    const {query} = url.parse(req.url,true);
    const token = query.token;

    if(!token){
        ws.close(1008,'No token provided');
        return;
    }

    let userId;
    try{
        const payload = jwt.verify(token,process.env.JWT_SECRET);
        userId = payload.userId;
    }catch(err){
        console.log('DEBUG token verify failed:',err.message);
        ws.close(1008,'Invalid token');
        return;
    }
    console.log(`WebSocket connected: user ${userId}`);

    if(!userSockets.has(userId)){
        userSockets.set(userId,new Set());
    }
    userSockets.get(userId).add(ws);

    ws.on('close',()=>{
        console.log(`WebSocket disconnected: user ${userId}`);
        userSockets.get(userId)?.delete(ws);
    })
})