exports.config = { runtime: 'nodejs' };
const { getUserByUsername } = require('./_lib/supabase');
const { verifyPassword } = require('./_lib/hash');
const { sign } = require('./_lib/jwt');

function bad(res, msg){ res.setHeader('Cache-Control','no-store'); res.status(400).json({ error: msg }); }
function ok(res, obj){ res.setHeader('Cache-Control','no-store'); res.status(200).json(obj); }

function setSessionCookie(res, token){
  const isProd = true;
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
  if (req.method !== 'POST'){ res.status(405).send('Method Not Allowed'); return; }
  const body = req.body || {};
  const username = (body.username || '').trim();
  const password = String(body.password || '');
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
}

