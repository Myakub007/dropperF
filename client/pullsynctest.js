// client/test-pulldiff.js
const { diffAgainstServer } = require('./pullsync');

const fakeServerTree = {
    "name": "/",
    "type": "folder",
    "children": [
        {
            "name": "Timeline 1.mp4",
            "type": "file",
            "path": "/Timeline 1.mp4",
            "hashes": ["9c7ca52fd32e47a5f4619e386604497e1698435eb8c82bae92aa8b0506c397e7","dc86168130b8aa71d4b0a11c9f489b7f150531b5a461506d9ffbf9acc0381e77"]
        },
        {
            "name": "final.txt",
            "type": "file",
            "path": "/final.txt",
            "hashes": ["928dd186816ca0947c38b93c5905f77d66801da4baa32ebee10ec9faf719b70f"]
        }
    ]
};

const result = diffAgainstServer(fakeServerTree);
console.log('Needs download:', result);