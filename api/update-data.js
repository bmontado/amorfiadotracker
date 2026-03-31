// Vercel serverless function — recibe datos del panel admin y los guarda en Vercel Blob
// Variables de entorno requeridas: BLOB_READ_WRITE_TOKEN (auto-configurado por Vercel Blob)

import { list, put } from '@vercel/blob';

const BLOB_KEY = 'data.json';
const GITHUB_FALLBACK = 'https://raw.githubusercontent.com/bmontado/amorfiadotracker/main/public/data.json';
const LAUNCH_DATE = new Date('2026-03-19T00:00:00Z');

function daysSinceLaunch(dateStr) {
  return Math.round((new Date(dateStr + 'T12:00:00Z') - LAUNCH_DATE) / 86400000);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

async function readCurrent() {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    const blob = blobs.find(b => b.pathname === BLOB_KEY);
    if (blob) {
      // Blob privado: requiere token en el header
      const res = await fetch(blob.url, {
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      });
      if (res.ok) return await res.json();
    }
  } catch { /* ignorar, intentar fallback */ }
  // Fallback: blob no existe aún — leer desde GitHub raw (migración inicial)
  const res = await fetch(`${GITHUB_FALLBACK}?t=${Date.now()}`);
  if (!res.ok) throw new Error('No se pudo leer data.json desde GitHub');
  return await res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { date, note, dailyTracks, algoDailyTracks, algoEnabled } = req.body ?? {};
  if (!date || !dailyTracks) return res.status(400).json({ error: 'Faltan: date, dailyTracks' });

  try {

  // ── 1. Leer estado actual desde Blob (o GitHub como fallback) ──────────────
  const current = await readCurrent();

  const n          = daysSinceLaunch(date);
  const liveLabel  = `D+${n}`;
  const dailyLabel = `D${new Date(date + 'T12:00:00Z').getUTCDate()}`;
  const newData    = { ...current };

  // ── 2. Upsert dailyLog ─────────────────────────────────────────────────────
  // Merge con los valores existentes del blob: si el frontend manda 0 pero el
  // blob ya tiene un valor positivo para ese track, se preserva el del blob.
  // Esto evita que datos stale del frontend sobreescriban datos reales.
  const existingEntry = (current.dailyLog ?? []).find(d => d.date === date);
  const parsed = {};
  let dayTotal = 0;
  Object.entries(dailyTracks).forEach(([t, v]) => {
    const incoming = parseInt(v, 10) || 0;
    const existing = existingEntry?.tracks?.[t] ?? 0;
    // Usar el valor existente si el incoming es 0 y ya había dato real
    parsed[t] = (incoming === 0 && existing > 0) ? existing : incoming;
    dayTotal += parsed[t];
  });

  const dailyLog = (current.dailyLog ?? []).filter(d => d.date !== date && d.tracks != null);
  dailyLog.push({ date, label: dailyLabel, note: note || '', tracks: parsed });
  dailyLog.sort((a, b) => a.date.localeCompare(b.date));
  newData.dailyLog = dailyLog;

  // ── 3. Recalcular cumulativos desde dailyLog ───────────────────────────────
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
  if (algoEnabled && algoDailyTracks && Object.keys(algoDailyTracks).length > 0) {
    const existingAlgoEntry = (current.algoLog ?? []).find(d => d.date === date);
    const parsedAlgo = {};
    Object.entries(algoDailyTracks).forEach(([t, v]) => {
      const incoming = parseInt(v, 10) || 0;
      const existing = existingAlgoEntry?.tracks?.[t] ?? 0;
      const val = (incoming === 0 && existing > 0) ? existing : incoming;
      if (val > 0) parsedAlgo[t] = val;
    });
    const algoLog = (current.algoLog ?? []).filter(d => d.date !== date);
    algoLog.push({ date, label: dailyLabel, tracks: parsedAlgo });
    algoLog.sort((a, b) => a.date.localeCompare(b.date));
    newData.algoLog = algoLog;

    // Rebuild algorithmicHistory con ventanas 7d y 28d desde algoLog
    const algoHistory = algoLog.map(algoEntry => {
      const d28ago = addDays(algoEntry.date, -27);
      const d7ago  = addDays(algoEntry.date, -6);
      const tracks28d = {};
      const tracks7d  = {};
      TRACKS.forEach(t => { tracks28d[t] = 0; tracks7d[t] = 0; });
      algoLog.forEach(e => {
        if (e.date <= algoEntry.date) {
          TRACKS.forEach(t => {
            if (e.date >= d28ago) tracks28d[t] += e.tracks?.[t] ?? 0;
            if (e.date >= d7ago)  tracks7d[t]  += e.tracks?.[t] ?? 0;
          });
        }
      });
      const album28dStreams = dailyLog
        .filter(e => e.date >= d28ago && e.date <= algoEntry.date)
        .reduce((sum, e) => sum + TRACKS.reduce((s, t) => s + (e.tracks?.[t] ?? 0), 0), 0);
      const albumAlgo28d = TRACKS.reduce((s, t) => s + tracks28d[t], 0);
      const albumAlgo7d  = TRACKS.reduce((s, t) => s + tracks7d[t], 0);
      const album28dPct  = album28dStreams > 0
        ? parseFloat(((albumAlgo28d / album28dStreams) * 100).toFixed(2)) : 0;
      const trackStats = {};
      TRACKS.forEach(t => {
        const tStreams28d = dailyLog
          .filter(e => e.date >= d28ago && e.date <= algoEntry.date)
          .reduce((sum, e) => sum + (e.tracks?.[t] ?? 0), 0);
        const pct28d = tStreams28d > 0
          ? parseFloat(((tracks28d[t] / tStreams28d) * 100).toFixed(2)) : 0;
        trackStats[t] = { streams28d: tracks28d[t], streams7d: tracks7d[t], pct28d };
      });
      const dayN = daysSinceLaunch(algoEntry.date);
      return {
        date: algoEntry.date, label: `D+${dayN}`,
        recordedAt: new Date().toISOString(),
        albumAlgorithmicTotal28d: albumAlgo28d, albumAlgorithmicTotal7d: albumAlgo7d,
        albumAlgorithmicPct28d: album28dPct, tracks: trackStats,
      };
    });
    newData.algorithmicHistory = algoHistory;

    const algD = {};
    TRACKS.forEach(t => { algD[t] = {}; });
    algoLog.forEach(e => {
      TRACKS.forEach(t => { if (e.tracks?.[t]) algD[t][e.date] = { streams: e.tracks[t] }; });
    });
    newData.algorithmicData = algD;
  }

  // ── 5. Guardar en Vercel Blob ──────────────────────────────────────────────
  await put(BLOB_KEY, JSON.stringify(newData, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });

  return res.status(200).json({ success: true, albumTotal, dayTotal, liveLabel });

  } catch (e) {
    console.error('update-data error:', e?.message ?? e);
    return res.status(500).json({ error: e?.message ?? 'Error interno del servidor' });
  }
}
