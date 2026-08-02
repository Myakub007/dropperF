const express = require("express");
const app = express();
const pool = require("./db");

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
        console.log(err);
    }
})
app.listen(3000,()=>{
    console.log("server running....");
})