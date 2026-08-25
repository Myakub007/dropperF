// client/test-reassemble.js
const { reassembleFile } = require('./reassembler');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc4NzY3NzUwNiwiZXhwIjoxNzg4MjgyMzA2fQ.TKx0G5lS3p-fXgz9Ta_T1bu0G4TyaPYmY8eCvIf9F_Q';
const HASHES = [
    '9c7ca52fd32e47a5f4619e386604497e1698435eb8c82bae92aa8b0506c397e7',
    'dc86168130b8aa71d4b0a11c9f489b7f150531b5a461506d9ffbf9acc0381e77'
];

reassembleFile(HASHES, './test-output.mp4', TOKEN)
    .then(() => console.log('Done! Check test-output.mp4'))
    .catch(err => console.error('Failed:', err));