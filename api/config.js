exports.config = { runtime: 'nodejs' };
const { getCfg } = require('../lib/supabase');

module.exports = async function(req, res){
  const { url, anon } = getCfg();
  res.status(200).json({ url, anon });
}
