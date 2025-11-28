exports.config = { runtime: 'nodejs' };
const { getSession } = require('./_lib/guard');

module.exports = async function(req, res){
  const sess = getSession(req);
  res.setHeader('Cache-Control','no-store');
  if (!sess){ res.status(200).json({ loggedIn: false }); return; }
  res.status(200).json({ loggedIn: true, user: { username: sess.username, status: sess.status } });
}

