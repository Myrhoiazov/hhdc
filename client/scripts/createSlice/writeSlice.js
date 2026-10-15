const fs = require('fs');
const path = require('path');
const resolveRoot = require('./resolveRoot');

// Writes the files of a new slice. An existing slice is never touched: extending one is a
// change made by hand.
module.exports = (layer, slice, files) => {
    const root = resolveRoot('src', layer, slice);
    if (fs.existsSync(root)) throw new Error(`src/${layer}/${slice} already exists`);
    for (const file of files) {
        const target = path.join(root, ...file.path);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, file.content);
    }
    return files.map((file) => path.join('src', layer, slice, ...file.path));
};
