export const config = { runtime: 'nodejs' };

type Cfg = { url?: string; key?: string };
function getCfg(): Cfg {
  return {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function supabaseIncrease(): Promise<number> {
  const { url, key } = getCfg();
  if (!url || !key) return 0;
  const table = 'visit_counter';
  const id = 1;
  try {
    const headers: Record<string, string> = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
    // fetch current
    const curResp = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, { headers });
    if (!curResp.ok) throw new Error('fetch current failed');
    const rows = await curResp.json();
    const current = Array.isArray(rows) && rows[0] && typeof rows[0].total === 'number' ? rows[0].total : 0;
    const next = current + 1;
    // upsert
    const upsertResp = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ id, total: next }]),
    });
    if (!upsertResp.ok) throw new Error('upsert failed');
    return next;
  } catch {
    return 0;
  }
}

async function supabaseGet(): Promise<number> {
  const { url, key } = getCfg();
  if (!url || !key) return 0;
  const table = 'visit_counter';
  const id = 1;
  try {
    const headers: Record<string, string> = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    };
    const curResp = await fetch(`${url}/rest/v1/${table}?id=eq.${id}&select=total`, { headers });
    if (!curResp.ok) return 0;
    const rows = await curResp.json();
    const current = Array.isArray(rows) && rows[0] && typeof rows[0].total === 'number' ? rows[0].total : 0;
    return current;
  } catch {
    return 0;
  }
}

export default async function handler(req: any, res: any) {
  const peek = req.query && ('peek' in req.query);
  let count = 0;
  if (!peek) count = await supabaseIncrease();
  else count = await supabaseGet();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ count });
}
