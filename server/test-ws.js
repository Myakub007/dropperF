// client/test-ws.js
const WebSocket = require('ws');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc4ODM3MjU1OCwiZXhwIjoxNzg4OTc3MzU4fQ.Avw4OaRk-mbAneCASLZjHz1LKiJ_rU2lpg4hceidO0E';
const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

ws.on('open', () => console.log('Connected!'));
ws.on('message',(msg)=> console.log('EVENT:',msg.toString()));
ws.on('close', (code, reason) => console.log('Closed:', code, reason.toString()));
ws.on('error', (err) => console.log('Error:', err.message));