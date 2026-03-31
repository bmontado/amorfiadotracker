// Vercel serverless function — recibe datos del panel admin y los pushea a GitHub
// Variables de entorno requeridas: GITHUB_TOKEN
// mode: 'edit' → recibe dailyTracks (streams del día), recalcula cumulativos

const OWNER = 'bmontado';
const REPO  = 'amorfiadotracker';
const PATH  = 'public/data.json';
const LAUNCH_DATE = new Date('2026-03-19T00:00:00Z');

function daysSinceLaunch(dateStr) {
  return Math.round((new Date(dateStr + 'T12:00:00Z') - LAUNCH_DATE) / 86400000);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN no configurado en Vercel' });

  const { date, note, dailyTracks, algoStreams, algoEnabled } = req.body ?? {};
  if (!date || !dailyTracks) return res.status(400).json({ error: 'Faltan: date, dailyTracks' });

  // ── 1. Fetch data.json desde GitHub ────────────────────────────────────────
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'amorfiadotracker-admin',
  };
  const fileRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
    { headers: ghHeaders }
  );
  if (!fileRes.ok) return res.status(500).json({ error: `GitHub fetch: ${await fileRes.text()}` });
  const fileData = await fileRes.json();
  const sha      = fileData.sha;
  const current  = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));

  const n         = daysSinceLaunch(date);
  const liveLabel = `D+${n}`;
  const dailyLabel = `D${new Date(date + 'T12:00:00Z').getUTCDate()}`;
  const newData   = { ...current };

  // ── 2. Upsert dailyLog ─────────────────────────────────────────────────────
  const parsed = {};
  let dayTotal = 0;
  Object.entries(dailyTracks).forEach(([t, v]) => {
    const val = parseInt(v, 10) || 0;
    parsed[t] = val; dayTotal += val;
  });

  const dailyLog = (current.dailyLog ?? []).filter(d => d.date !== date && d.tracks != null);
  dailyLog.push({ date, label: dailyLabel, note: note || '', tracks: parsed });
  dailyLog.sort((a, b) => a.date.localeCompare(b.date));
  newData.dailyLog = dailyLog;

  // ── 3. Recalcular cumulativos desde dailyLog ────────────────────────────────
  const TRACKS = [
    'CUANDO ESCRIBÍA ASIMETRÍA', 'MAN OF WORD', 'ATBLM', 'CALL ME',
    'ALQUILER', 'HIELO', 'UN GUSTO', 'CHANGES',
    'OJOS TRISTES', 'HAZLO CALLAO', 'YA NO', 'TOP TIER',
  ];
  const cumulative = {};
  TRACKS.forEach(t => { cumulative[t] = 0; });
  dailyLog.forEach(entry => {
    TRACKS.forEach(t => { cumulative[t] += entry.tracks?.[t] ?? 0; });
  });
  const albumTotal = Object.values(cumulative).reduce((s, v) => s + v, 0);

  newData.liveTotals     = cumulative;
  newData.albumLiveTotal = albumTotal;
  newData.lastUpdated    = { ...(current.lastUpdated ?? {}), spotify: new Date().toISOString() };

  // Rebuild liveHistory desde dailyLog (running sum)
  const liveHistory = [];
  const running = {};
  TRACKS.forEach(t => { running[t] = 0; });
  dailyLog.forEach(entry => {
    TRACKS.forEach(t => { running[t] += entry.tracks?.[t] ?? 0; });
    const snap = { ...running };
    const tot  = Object.values(snap).reduce((s, v) => s + v, 0);
    const dayN = daysSinceLaunch(entry.date);
    liveHistory.push({ date: entry.date, label: `D+${dayN}`, albumTotal: tot, tracks: snap });
  });
  newData.liveHistory = liveHistory;

  // ── 4. Algo streams (opcional) ─────────────────────────────────────────────
  if (algoEnabled && algoStreams && Object.keys(algoStreams).length > 0) {
    // algorithmicData
    const algD = { ...(current.algorithmicData ?? {}) };
    Object.entries(algoStreams).forEach(([track, rawVal]) => {
      const streams = parseInt(rawVal, 10) || 0;
      if (!algD[track]) algD[track] = {};
      algD[track][date] = { streams, breakdown: { algorithmicPlaylists: streams, radio: 0 } };
    });
    newData.algorithmicData = algD;

    // algorithmicHistory
    const algoTotal = Object.values(algoStreams).reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
    const algoPct   = albumTotal > 0 ? parseFloat(((algoTotal / albumTotal) * 100).toFixed(2)) : 0;
    const tm = current.trackMetrics ?? {};
    const algoHistTracks = {};
    Object.entries(algoStreams).forEach(([track, rawVal]) => {
      const streams = parseInt(rawVal, 10) || 0;
      const tot28   = tm[track]?.streams28d ?? 0;
      algoHistTracks[track] = { streams28d: streams, pct28d: tot28 > 0 ? parseFloat(((streams / tot28) * 100).toFixed(2)) : 0 };
    });
    const algoHist = (current.algorithmicHistory ?? []).filter(h => h.date !== date);
    algoHist.push({
      date, label: liveLabel, recordedAt: new Date().toISOString(), partial: false,
      albumAlgorithmicTotal28d: algoTotal, albumAlgorithmicPct28d: algoPct,
      tracks: algoHistTracks,
    });
    algoHist.sort((a, b) => a.date.localeCompare(b.date));
    newData.algorithmicHistory = algoHist;
  }

  // ── 5. Push a GitHub ────────────────────────────────────────────────────────
  const content = Buffer.from(JSON.stringify(newData, null, 2)).toString('base64');
  const message = `data: ${liveLabel} manual entry ${date} — +${dayTotal.toLocaleString('es-AR')} streams`;
  const pushRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
    {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content, sha }),
    }
  );
  if (!pushRes.ok) return res.status(500).json({ error: `GitHub push: ${await pushRes.text()}` });

  return res.status(200).json({ success: true, albumTotal, dayTotal, liveLabel, message });
}
