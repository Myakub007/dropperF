const db = require('./db');

function getKnownState(){
    const rows = db.prepare('SELECT * FROM file_state').all();
    const map = {};
    for (const row of rows){
        map[row.path] = {
            hashList: JSON.parse(row.hash_list),
            mtime: row.mtime
        };
    }
    return map;
}

function saveFileState(path,hashList,mtime){
    db.prepare(`
        INSERT INTO file_state (path,hash_list,mtime)
        VALUES (?,?,?)
        ON CONFLICT(path) DO UPDATE SET hash_list = excluded.hash_list, mtime = excluded.mtime
        `).run(path,JSON.stringify(hashList),mtime);
}

function deleteFileState(path){
    db.prepare('DELETE FROM file_state WHERE path = ?').run(path);
};


module.exports = {saveFileState,getKnownState,deleteFileState};