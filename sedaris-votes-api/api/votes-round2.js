// Round 2 uses its own Blob prefix; round-one records are never read or changed.
// Vote store for the Sedaris dinner page. Each vote is a tiny blob whose path
// encodes voter and pick (votes-round2/<voter>--<pick>.txt), so reads only list paths.
// A voter is one of the four names, or an anonymous browser id ("a" + 12-32
// lowercase letters/digits). Naming yourself later moves your anonymous vote.
const { put, list, del } = require('@vercel/blob');

const NAMES = ['Micah', 'Irene', 'Preston', 'Sarah'];
const PICKS = ['sato', 'hinata', 'robin', 'kinkhao', 'nari'];
const ORIGINS = ['https://malpern.github.io'];
const isAnon = v => typeof v === 'string' && /^a[a-z0-9]{12,32}$/.test(v);
const isVoter = v => NAMES.includes(v) || isAnon(v);

async function allVotes() {
  const out = {};
  let cursor;
  do {
    const r = await list({ prefix: 'votes-round2/', cursor, limit: 1000 });
    for (const b of r.blobs) {
      const m = b.pathname.match(/^votes-round2\/([A-Za-z0-9]+)--([a-z]+)\.txt$/);
      if (m && isVoter(m[1]) && PICKS.includes(m[2])) {
        const prev = out[m[1]];
        if (!prev || b.uploadedAt > prev.at) out[m[1]] = { pick: m[2], at: b.uploadedAt };
      }
    }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}

async function clear(voter) {
  const r = await list({ prefix: 'votes-round2/' + voter + '--' });
  if (r.blobs.length) await del(r.blobs.map(b => b.url));
}

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  if (ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      body = body || {};
      const { voter, pick, from } = body;
      if (!isVoter(voter)) return res.status(400).json({ error: 'unknown voter' });
      if (pick !== null && !PICKS.includes(pick)) return res.status(400).json({ error: 'unknown pick' });
      if (from !== undefined && from !== null && !isAnon(from)) return res.status(400).json({ error: 'bad from' });
      if (from && from !== voter) await clear(from);
      await clear(voter);
      if (pick) await put('votes-round2/' + voter + '--' + pick + '.txt', '1', { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'text/plain' });
    } else if (req.method !== 'GET') {
      return res.status(405).json({ error: 'method not allowed' });
    }
    const v = await allVotes();
    const votes = {};
    for (const k of Object.keys(v)) votes[k] = v[k].pick;
    return res.status(200).json({ votes });
  } catch (e) {
    return res.status(500).json({ error: 'store unavailable' });
  }
};
