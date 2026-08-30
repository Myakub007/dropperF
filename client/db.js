const Database = require('better-sqlite3');
const dbPath =  process.env.DB_PATH || "sync-state.db";
const db = new Database(`${dbPath}`);

db.exec(`
    CREATE TABLE IF NOT EXISTS file_state(
        path TEXT PRIMARY KEY,
        hash_list TEXT NOT NULL,
        mtime INTEGER NOT NULL
    )
    `);

module.exports = db;