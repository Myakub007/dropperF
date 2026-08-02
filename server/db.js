const pg = require('pg');

if(process.env.NODE_ENV !== "production"){
    require('dotenv').config({path:"../.env"});
}

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password:process.env.DB_PASSWORD,
    port:process.env.DB_PORT,
    database:process.env.DB_DATABASE
})

module.exports = pool;

