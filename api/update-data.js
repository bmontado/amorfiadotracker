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

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN no configurado en Vercel' });

  const { date, note, dailyTracks, algoDailyTracks, algoEnabled } = req.body ?? {};
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

  // ── 4. Algo streams diarios (opcional) ────────────────────────────────────
  // algoDailyTracks: streams algorítmicos del día (como dailyTracks pero para algo)
  // Se almacenan en algoLog y se calculan rolling windows de 7d y 28d
  if (algoEnabled && algoDailyTracks && Object.keys(algoDailyTracks).length > 0) {

    // Upsert algoLog — igual que dailyLog pero para streams algorítmicos diarios
    const parsedAlgo = {};
    Object.entries(algoDailyTracks).forEach(([t, v]) => {
      const val = parseInt(v, 10) || 0;
      if (val > 0) parsedAlgo[t] = val;
    });
    const algoLog = (current.algoLog ?? []).filter(d => d.date !== date);
    algoLog.push({ date, label: dailyLabel, tracks: parsedAlgo });
    algoLog.sort((a, b) => a.date.localeCompare(b.date));
    newData.algoLog = algoLog;

    // Rebuild algorithmicHistory: para cada fecha en algoLog, computar ventanas 7d y 28d
    const algoHistory = algoLog.map(algoEntry => {
      const d28ago = addDays(algoEntry.date, -27);
      const d7ago  = addDays(algoEntry.date, -6);

      const tracks28d = {};
      const tracks7d  = {};
      TRACKS.forEach(t => { tracks28d[t] = 0; tracks7d[t] = 0; });

      // Sumar todas las entradas de algoLog dentro de cada ventana
      algoLog.forEach(e => {
        if (e.date <= algoEntry.date) {
          TRACKS.forEach(t => {
            if (e.date >= d28ago) tracks28d[t] += e.tracks?.[t] ?? 0;
            if (e.date >= d7ago)  tracks7d[t]  += e.tracks?.[t] ?? 0;
          });
        }
      });

      // Streams totales del álbum en la ventana de 28d (denominador para el %)
      const album28dStreams = dailyLog
        .filter(e => e.date >= d28ago && e.date <= algoEntry.date)
        .reduce((sum, e) => sum + TRACKS.reduce((s, t) => s + (e.tracks?.[t] ?? 0), 0), 0);

      const albumAlgo28d = TRACKS.reduce((s, t) => s + tracks28d[t], 0);
      const albumAlgo7d  = TRACKS.reduce((s, t) => s + tracks7d[t], 0);
      const album28dPct  = album28dStreams > 0
        ? parseFloat(((albumAlgo28d / album28dStreams) * 100).toFixed(2))
        : 0;

      // Stats por track
      const trackStats = {};
      TRACKS.forEach(t => {
        const tStreams28d = dailyLog
          .filter(e => e.date >= d28ago && e.date <= algoEntry.date)
          .reduce((sum, e) => sum + (e.tracks?.[t] ?? 0), 0);
        const pct28d = tStreams28d > 0
          ? parseFloat(((tracks28d[t] / tStreams28d) * 100).toFixed(2))
          : 0;
        trackStats[t] = { streams28d: tracks28d[t], streams7d: tracks7d[t], pct28d };
      });

      const dayN = daysSinceLaunch(algoEntry.date);
      return {
        date: algoEntry.date,
        label: `D+${dayN}`,
        recordedAt: new Date().toISOString(),
        albumAlgorithmicTotal28d: albumAlgo28d,
        albumAlgorithmicTotal7d: albumAlgo7d,
        albumAlgorithmicPct28d: album28dPct,
        tracks: trackStats,
      };
    });
    newData.algorithmicHistory = algoHistory;

    // Mantener algorithmicData como valores diarios crudos por track/fecha (para gráficos)
    const algD = {};
    TRACKS.forEach(t => { algD[t] = {}; });
    algoLog.forEach(e => {
      TRACKS.forEach(t => {
        if (e.tracks?.[t]) {
          algD[t][e.date] = { streams: e.tracks[t] };
        }
      });
    });
    newData.algorithmicData = algD;
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
