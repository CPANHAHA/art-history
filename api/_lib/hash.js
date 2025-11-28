exports.config = { runtime: 'nodejs' };
const crypto = require('crypto');

function randomSaltHex(len=16){
  return crypto.randomBytes(len).toString('hex');
}

function hashPassword(password, saltHex){
  const key = crypto.pbkdf2Sync(String(password), Buffer.from(saltHex,'hex'), 100000, 32, 'sha256');
  return key.toString('hex');
}

function verifyPassword(password, saltHex, hashHex){
  try{
    const calc = hashPassword(password, saltHex);
    // constant-time compare
    const a = Buffer.from(calc, 'utf8');
    const b = Buffer.from(hashHex, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a,b);
  }catch{ return false; }
}

module.exports = { randomSaltHex, hashPassword, verifyPassword };

