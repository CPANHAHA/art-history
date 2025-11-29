const crypto = require('crypto');
const password = String(process.argv[2]||'');
if (!password) { console.error('usage: node scripts/gen_password_hash.js <password>'); process.exit(1); }
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, Buffer.from(salt,'hex'), 100000, 32, 'sha256').toString('hex');
console.log(JSON.stringify({ password_length: password.length, password_hash_hex: hash, password_salt_hex: salt }, null, 2));
