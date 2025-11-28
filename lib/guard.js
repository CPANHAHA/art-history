const { verify } = require('./jwt');
function parseCookies(req){ const header = req.headers && req.headers.cookie; const out={}; if(!header) return out; header.split(';').forEach(kv=>{ const i=kv.indexOf('='); if(i>0){ out[kv.slice(0,i).trim()] = decodeURIComponent(kv.slice(i+1)); } }); return out; }
function getSession(req){ const cookies = parseCookies(req); const token = cookies.session; const secret = process.env.SESSION_SECRET || ''; if(!token||!secret) return null; const payload = verify(token, secret); return payload || null; }
function requireRole(req, res, roles){ const sess = getSession(req); if(!sess || !roles.includes(sess.status)){ res.status(401).json({ error:'unauthorized' }); return null; } return sess; }
module.exports = { parseCookies, getSession, requireRole };
