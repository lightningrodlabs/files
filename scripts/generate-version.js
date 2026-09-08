const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');
const crypto = require('crypto');

/** */
function getFileSHA256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (chunk) => {
            hash.update(chunk);
        });

        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
}

/** */
function writeVersionJs(happSha256) {
    const content = `
export const APP_VERSION = '${packageJson.version}';
export const HAPP_SHA256 = '${happSha256}';
`;
    // src/generated/ is gitignored, so on a fresh clone these directories do
    // not exist yet. Without the mkdir, writeFileSync threw, the rejection was
    // swallowed by the .catch below, this script exited 0, and the build failed
    // several steps later with "Cannot find module '../generated/version'".
    for (const out of ['./webapp/src/generated/version.js', './webcomponents/src/generated/version.js']) {
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, content);
    }
}


getFileSHA256('./artifacts/files.happ')
    .then(hash => {
        console.log('SHA256:', hash);
        writeVersionJs(hash);
    })
    .catch(err => { console.error('Error:', err); process.exit(1); });

