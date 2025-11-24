exports.config = { runtime: 'nodejs' };

function getCfg(){
  return {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function ensureBucket(url, key, bucket){
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const check = await fetch(`${url}/storage/v1/bucket/${bucket}`, { headers: h });
  if (check.ok) return true;
  const create = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...h, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: bucket, public: false })
  });
  return create.ok;
}

async function storageGet(url, key, bucket, object){
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const resp = await fetch(`${url}/storage/v1/object/${bucket}/${object}`, { headers: h });
  if (!resp.ok) return null;
  const txt = await resp.text();
  try { return JSON.parse(txt); } catch { return null; }
}

async function storagePut(url, key, bucket, object, data){
  const h = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'x-upsert': 'true' };
  const resp = await fetch(`${url}/storage/v1/object/${bucket}/${object}`, { method: 'POST', headers: h, body: JSON.stringify(data) });
  return resp.ok;
}

async function supabaseIncrease(){
  const { url, key } = getCfg();
  if (!url || !key) return 0;
  const bucket = 'site-metrics';
  const object = 'visit_counter.json';
  await ensureBucket(url, key, bucket);
  const cur = await storageGet(url, key, bucket, object);
  const current = cur && typeof cur.total === 'number' ? cur.total : 0;
  const next = current + 1;
  await storagePut(url, key, bucket, object, { total: next });
  return next;
}

async function supabaseGet(){
  const { url, key } = getCfg();
  if (!url || !key) return 0;
  const bucket = 'site-metrics';
  const object = 'visit_counter.json';
  await ensureBucket(url, key, bucket);
  const cur = await storageGet(url, key, bucket, object);
  const current = cur && typeof cur.total === 'number' ? cur.total : 0;
  return current;
}

module.exports = async function(req, res){
  const peek = req.query && ('peek' in req.query);
  let count = 0;
  if (!peek) count = await supabaseIncrease();
  else count = await supabaseGet();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ count });
}
