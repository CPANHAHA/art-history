exports.config = { runtime: 'nodejs' };
const { randomSaltHex, hashPassword } = require('../lib/hash');
const { insertPendingUser, getUserByUsername } = require('../lib/supabase');

function bad(res, msg){ res.setHeader('Cache-Control','no-store'); res.status(400).json({ error: msg }); }
function ok(res, obj){ res.setHeader('Cache-Control','no-store'); res.status(200).json(obj); }

function validUsername(u){ return typeof u === 'string' && /^[A-Za-z0-9]{6,8}$/.test(u); }
function validPassword(p){ return typeof p === 'string' && /^.{8}$/.test(p); }

module.exports = async function(req, res){
  if (req.method !== 'POST'){ res.status(405).send('Method Not Allowed'); return; }
  const body = req.body || {};
  const username = (body.username || '').trim();
  const password = String(body.password || '');
  if (!validUsername(username)) { bad(res, '账号需为 6–8 位字母或数字'); return; }
  if (!validPassword(password)) { bad(res, '密码需为 8 位'); return; }
  const exists = await getUserByUsername(username);
  if (exists){ bad(res, '账号已存在'); return; }
  const salt = randomSaltHex(16);
  const hash = hashPassword(password, salt);
  const row = await insertPendingUser(username, hash, salt);
  if (!row){ bad(res, '注册失败'); return; }
  ok(res, { ok: true, message: '已提交，等待审核' });
}
