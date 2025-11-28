exports.config = { runtime: 'nodejs' };

module.exports = async function(req, res){
  if (req.method !== 'POST'){ res.status(405).send('Method Not Allowed'); return; }
  res.setHeader('Set-Cookie', 'session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ ok: true });
}

