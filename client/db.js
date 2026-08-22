const Database = require('better-sqlite3');
const db = new Database("sync-state.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS file_state(
        path TEXT PRIMARY KEY,
        hash_list TEXT NOT NULL,
        mtime INTEGER NOT NULL
    )
    `);

module.exports = db;