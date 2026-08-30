// client/sync.js
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const axios = require('axios');

const { chunkFile } = require('../shared/chunkGen');
const { hashChunk } = require('../shared/hasher');
const { chunkExistsOnServer, uploadChunk } = require('./upload');
const { saveFileState, deleteFileState, getKnownState } = require('./state');
const { getServerHashesForPath } = require('./checkServer');
const { diffAgainstServer } = require('./pullsync');
const { reassembleFile } = require('../shared/reassembler');
const { getCurrentLocalHashes, fileExistsLocally } = require('./conflictHelper');

const WATCH_DIR = process.env.WATCH_DIR || './watched-folder';
const TOKEN = process.env.TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc4ODExMzM0NSwiZXhwIjoxNzg4NzE4MTQ1fQ.teVnm4C6eiSq0X_r7wAzKKTmaXFvieN8aSaB3xKU7eI';
const API_BASE = 'http://localhost:3000';
const POLL_INTERVAL_MS = 5000;

// ─── A simple in-process lock, so push and pull never run at the same time ───
let syncBusy = false;

// ─── PUSH SIDE (from watch-test.js) ───

const watcher = chokidar.watch(WATCH_DIR);

async function handleFileEvent(filePath) {
    if (syncBusy) {
        console.log('Busy syncing — will pick up this change next cycle');
        return; // simplest approach: skip, chokidar/OS will still show the file as changed later if needed
    }
    syncBusy = true;
    try {
        const relativePath = '/' + path.relative(WATCH_DIR, filePath).replace(/\\/g, '/');
        console.log(`\nProcessing: ${relativePath}`);

        const known = getKnownState();
        const lastSyncHashes = known[relativePath]?.hashList || null;

        if (lastSyncHashes) {
            const serverHashes = await getServerHashesForPath(relativePath, TOKEN);
            if (serverHashes && JSON.stringify(serverHashes) !== JSON.stringify(lastSyncHashes)) {
                console.log(`  CONFLICT: server changed independently. Skipping push.`);
                return;
            }
        }

        const hashes = [];
        let uploaded = 0, skipped = 0;

        for await (const buffer of chunkFile(filePath)) {
            const hash = hashChunk(buffer);
            hashes.push(hash);
            const exists = await chunkExistsOnServer(hash, TOKEN);
            if (exists) { skipped++; } else { await uploadChunk(hash, buffer, TOKEN); uploaded++; }
        }

        await axios.post(`${API_BASE}/files`, { path: relativePath, hashes }, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        const mtime = fs.statSync(filePath).mtimeMs;
        saveFileState(relativePath, hashes, mtime);

        console.log(`Done: ${uploaded} uploaded, ${skipped} skipped`);
    } finally {
        syncBusy = false;
    }
}

watcher.on('add', handleFileEvent);
watcher.on('change', handleFileEvent);
watcher.on('unlink', async (filePath) => {
    if (syncBusy) return;
    syncBusy = true;
    try {
        const relativePath = '/' + path.relative(WATCH_DIR, filePath).replace(/\\/g, '/');
        console.log('File deleted:', relativePath);
        deleteFileState(relativePath);
        try {
            await axios.delete(`${API_BASE}/files`, {
                headers: { Authorization: `Bearer ${TOKEN}` },
                data: { path: relativePath }
            });
        } catch (err) { console.error('Failed to notify server:', err.message); }
    } finally {
        syncBusy = false;
    }
});

// ─── PULL SIDE (from pull.js) ───

async function pollOnce() {
    if (syncBusy) {
        console.log('Busy — skipping this poll cycle');
        return;
    }
    syncBusy = true;
    try {
        console.log('\nPolling Server...');
        const res = await axios.get(`${API_BASE}/tree`, { headers: { Authorization: `Bearer ${TOKEN}` } });
        const { needsDownload, needsDelete } = diffAgainstServer(res.data.tree);

        for (const file of needsDownload) {
            const destpath = path.join(WATCH_DIR, file.path);
            const known = getKnownState();
            const lastSyncedHashes = known[file.path]?.hashList || [];
            let isConflict = false;

            if (fileExistsLocally(destpath)) {
                const currentLocalHashes = await getCurrentLocalHashes(destpath);
                if (JSON.stringify(currentLocalHashes) !== JSON.stringify(lastSyncedHashes)) {
                    isConflict = true;
                }
            }

            if (isConflict) {
                const ext = path.extname(destpath);
                const base = destpath.slice(0, -ext.length);
                const conflictPath = `${base} (conflicted copy)${ext}`;
                if (!fs.existsSync(conflictPath)) {
                        await reassembleFile(file.hashes, conflictPath, TOKEN);
                        console.log(`  CONFLICT -> saved as ${conflictPath}`);
                    }
            } else {
                await reassembleFile(file.hashes, destpath, TOKEN);
                saveFileState(file.path, file.hashes, Date.now());
                console.log(`  -> ${file.path} downloaded`);
            }
        }

        for (const filePath of needsDelete) {
            const localFullPath = path.join(WATCH_DIR, filePath);
            if (fs.existsSync(localFullPath)) fs.rmSync(localFullPath);
            deleteFileState(filePath);
            console.log(`  -> ${filePath} deleted locally`);
        }
    } finally {
        syncBusy = false;
    }
}

setInterval(() => { pollOnce().catch(err => console.error('Poll failed:', err.message)); }, POLL_INTERVAL_MS);

console.log(`Watching ${WATCH_DIR}, polling every ${POLL_INTERVAL_MS / 1000}s...`);