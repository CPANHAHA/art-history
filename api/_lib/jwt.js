exports.config = { runtime: 'nodejs' };
const crypto = require('crypto');

function base64url(input){
  return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

function sign(payload, secret, opts){
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now()/1000);
  const exp = opts && opts.expiresIn ? iat + opts.expiresIn : iat + 7*24*3600;
  const data = { ...payload, iat, exp };
  const p1 = base64url(JSON.stringify(header));
  const p2 = base64url(JSON.stringify(data));
  const toSign = `${p1}.${p2}`;
  const sig = crypto.createHmac('sha256', secret).update(toSign).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${toSign}.${sig}`;
}

function verify(token, secret){
  try{
    const [p1,p2,sig] = token.split('.');
    if (!p1 || !p2 || !sig) return null;
    const toSign = `${p1}.${p2}`;
    const expect = crypto.createHmac('sha256', secret).update(toSign).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    if (expect !== sig) return null;
    const payload = JSON.parse(Buffer.from(p2.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'));
    const now = Math.floor(Date.now()/1000);
    if (payload.exp && now > payload.exp) return null;
    return payload;
  }catch{ return null; }
}

module.exports = { sign, verify };

