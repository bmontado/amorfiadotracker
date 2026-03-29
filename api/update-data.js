// Vercel serverless function — recibe datos del panel admin y los pushea a GitHub
// Variables de entorno requeridas: GITHUB_TOKEN
// Repo hardcodeado: bmontado/amorfiadotracker

const OWNER = 'bmontado';
const REPO  = 'amorfiadotracker';
const PATH  = 'public/data.json';
const LAUNCH_DATE = new Date('2026-03-19T00:00:00Z');

function daysSinceLaunch(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return Math.round((d - LAUNCH_DATE) / (1000 * 60 * 60 * 24));
}

export default async function handler(req, res) {
  // CORS para el dashboard propio
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN no configurado en Vercel' });

  const { date, note, liveTotals, algoStreams, algoEnabled } = req.body ?? {};
  if (!date || !liveTotals) return res.status(400).json({ error: 'Faltan campos: date, liveTotals' });

  // ── 1. Fetch data.json actual desde GitHub ──────────────────────────────────
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'amorfiadotracker-admin',
  };
  const fileRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
    { headers: ghHeaders }
  );
  if (!fileRes.ok) {
    const err = await fileRes.text();
    return res.status(500).json({ error: `GitHub fetch error: ${err}` });
  }
  const fileData = await fileRes.json();
  const sha = fileData.sha;
  const current = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));

  // ── 2. Calcular delta diario ────────────────────────────────────────────────
  const prevTotals = current.liveTotals ?? {};
  const dailyTracks = {};
  let dayTotal = 0;
  Object.entries(liveTotals).forEach(([track, rawVal]) => {
    const newTotal = parseInt(rawVal, 10) || 0;
    const prev = prevTotals[track] ?? 0;
    const delta = Math.max(0, newTotal - prev);
    dailyTracks[track] = delta;
    dayTotal += delta;
  });

  const albumTotal = Object.values(liveTotals).reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
  const n = daysSinceLaunch(date);
  const liveLabel = `D+${n}`;
  const dailyLabel = `D${new Date(date + 'T12:00:00Z').getUTCDate()}`;

  // ── 3. Merge en data.json ───────────────────────────────────────────────────
  const newData = { ...current };

  // liveTotals y albumLiveTotal
  const parsedTotals = {};
  Object.entries(liveTotals).forEach(([t, v]) => { parsedTotals[t] = parseInt(v, 10) || 0; });
  newData.liveTotals    = parsedTotals;
  newData.albumLiveTotal = albumTotal;
  newData.lastUpdated   = { ...(current.lastUpdated ?? {}), spotify: new Date().toISOString() };

  // liveHistory — upsert por fecha
  const liveHistEntry = {
    date,
    label: liveLabel,
    albumTotal,
    tracks: parsedTotals,
  };
  const liveHistory = (current.liveHistory ?? []).filter(h => h.date !== date && h.tracks != null);
  liveHistory.push(liveHistEntry);
  liveHistory.sort((a, b) => a.date.localeCompare(b.date));
  newData.liveHistory = liveHistory;

  // dailyLog — upsert por fecha (solo si hay delta real)
  if (dayTotal > 0) {
    const dailyEntry = {
      date,
      label: dailyLabel,
      note: note || '',
      tracks: dailyTracks,
    };
    const dailyLog = (current.dailyLog ?? []).filter(d => d.date !== date && d.tracks != null);
    dailyLog.push(dailyEntry);
    dailyLog.sort((a, b) => a.date.localeCompare(b.date));
    newData.dailyLog = dailyLog;
  }

  // algorithmicData — opcional
  if (algoEnabled && algoStreams && Object.keys(algoStreams).length > 0) {
    const algD = { ...(current.algorithmicData ?? {}) };
    const tm   = current.trackMetrics ?? {};
    Object.entries(algoStreams).forEach(([track, rawVal]) => {
      const streams = parseInt(rawVal, 10) || 0;
      if (!algD[track]) algD[track] = {};
      algD[track][date] = {
        streams,
        breakdown: { algorithmicPlaylists: streams, radio: 0 },
      };
    });
    newData.algorithmicData = algD;

    // algorithmicHistory — upsert
    const algoTotal = Object.values(algoStreams).reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
    const algoPct   = albumTotal > 0 ? parseFloat(((algoTotal / albumTotal) * 100).toFixed(2)) : 0;
    const algoHistTracks = {};
    Object.entries(algoStreams).forEach(([track, rawVal]) => {
      const streams = parseInt(rawVal, 10) || 0;
      const total28 = tm[track]?.streams28d ?? 0;
      const pct28   = total28 > 0 ? parseFloat(((streams / total28) * 100).toFixed(2)) : 0;
      algoHistTracks[track] = { streams28d: streams, pct28d: pct28 };
    });
    const algoHist = (current.algorithmicHistory ?? []).filter(h => h.date !== date);
    algoHist.push({
      date,
      label: liveLabel,
      recordedAt: new Date().toISOString(),
      partial: false,
      albumAlgorithmicTotal28d: algoTotal,
      albumAlgorithmicPct28d: algoPct,
      tracks: algoHistTracks,
    });
    algoHist.sort((a, b) => a.date.localeCompare(b.date));
    newData.algorithmicHistory = algoHist;
  }

  // ── 4. Push a GitHub ────────────────────────────────────────────────────────
  const content = Buffer.from(JSON.stringify(newData, null, 2)).toString('base64');
  const message = `data: ${liveLabel} manual entry ${date} — álbum ${albumTotal.toLocaleString('es-AR')} (+${dayTotal.toLocaleString('es-AR')})`;

  const pushRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
    {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content, sha }),
    }
  );
  if (!pushRes.ok) {
    const err = await pushRes.text();
    return res.status(500).json({ error: `GitHub push error: ${err}` });
  }

  return res.status(200).json({
    success: true,
    albumTotal,
    dayTotal,
    liveLabel,
    message,
  });
}
