exports.config = { runtime: 'nodejs' };
const { getUserByUsername } = require('../lib/supabase');
const { verifyPassword } = require('../lib/hash');
const { sign } = require('../lib/jwt');

function bad(res, msg){ res.setHeader('Cache-Control','no-store'); res.status(400).json({ error: msg }); }
function ok(res, obj){ res.setHeader('Cache-Control','no-store'); res.status(200).json(obj); }

function setSessionCookie(res, token){
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const attrs = [
    `session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isProd ? 'Secure' : '',
    `Max-Age=${7*24*3600}`,
  ].filter(Boolean).join('; ');
  res.setHeader('Set-Cookie', attrs);
}

module.exports = async function(req, res){
  try{
    if (req.method !== 'POST'){ res.status(405).json({ error: 'Method Not Allowed' }); return; }
    let body = req.body || {};
    if (typeof body === 'string'){
      try{ body = JSON.parse(body); } catch{ body = {}; }
    }
    const username = (body.username || '').trim();
    const password = String(body.password || '');
    if (!username || !password){ bad(res, '缺少用户名或密码'); return; }
    const supaUrl = process.env.SUPABASE_URL || '';
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    if (!supaUrl || !supaKey){ res.status(500).json({ error: '服务器未配置 Supabase (SUPABASE_URL 或 KEY)' }); return; }
    const row = await getUserByUsername(username);
    if (!row){ bad(res, '请先申请成为会员'); return; }
    if (row.status === 'pending'){ bad(res, '审核中'); return; }
    if (row.status === 'blacklisted'){ bad(res, '已被加入黑名单'); return; }
    const okPwd = verifyPassword(password, row.password_salt, row.password_hash);
    if (!okPwd){ bad(res, '密码错误'); return; }
    const secret = process.env.SESSION_SECRET || '';
    if (!secret){ bad(res, '服务器未配置 SESSION_SECRET'); return; }
    const token = sign({ uid: row.id, username: row.username, status: row.status }, secret, { expiresIn: 7*24*3600 });
    setSessionCookie(res, token);
    ok(res, { ok: true, user: { username: row.username, status: row.status } });
  }catch(err){
    res.setHeader('Cache-Control','no-store');
    res.status(500).json({ error: '服务器内部错误', detail: String(err && err.message || err) });
  }
}
