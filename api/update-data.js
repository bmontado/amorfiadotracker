// Vercel serverless function — guarda datos en Vercel Blob
// Soporta modo batch: un solo read + N merges en memoria + un solo write
// Elimina race conditions del ciclo leer-modificar-escribir secuencial

import { list, put, head } from '@vercel/blob';

const BLOB_KEY = 'data.json';
const GITHUB_FALLBACK = 'https://raw.githubusercontent.com/bmontado/amorfiadotracker/main/public/data.json';
const LAUNCH_DATE = new Date('2026-03-19T00:00:00Z');

const TRACKS = [
  'CUANDO ESCRIBÍA ASIMETRÍA', 'MAN OF WORD', 'ATBLM', 'CALL ME',
  'ALQUILER', 'HIELO', 'UN GUSTO', 'CHANGES',
  'OJOS TRISTES', 'HAZLO CALLAO', 'YA NO', 'TOP TIER',
];

function daysSinceLaunch(dateStr) {
  return Math.round((new Date(dateStr + 'T12:00:00Z') - LAUNCH_DATE) / 86400000);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

async function readCurrent() {
  // Usar head() para obtener el downloadUrl firmado del blob privado
  // NUNCA caer al fallback de GitHub en el write path
  const { blobs } = await list({ prefix: BLOB_KEY });
  const blob = blobs.find(b => b.pathname === BLOB_KEY);
  if (!blob) throw new Error('Blob no encontrado — inicializá el blob antes de guardar');
  const blobMeta = await head(blob.url);
  const res = await fetch(blobMeta.downloadUrl);
  if (!res.ok) throw new Error(`No se pudo leer el blob (HTTP ${res.status})`);
  return await res.json();
}

function rebuildCumulatives(dailyLog) {
  const cumulative = {};
  TRACKS.forEach(t => { cumulative[t] = 0; });
  dailyLog.forEach(e => { TRACKS.forEach(t => { cumulative[t] += e.tracks?.[t] ?? 0; }); });
  return cumulative;
}

function rebuildLiveHistory(dailyLog) {
  const history = [];
  const running = {};
  TRACKS.forEach(t => { running[t] = 0; });
  dailyLog.forEach(e => {
    TRACKS.forEach(t => { running[t] += e.tracks?.[t] ?? 0; });
    const snap = { ...running };
    const tot  = Object.values(snap).reduce((s, v) => s + v, 0);
    history.push({ date: e.date, label: `D+${daysSinceLaunch(e.date)}`, albumTotal: tot, tracks: snap });
  });
  return history;
}

function rebuildAlgoHistory(algoLog, dailyLog) {
  return algoLog.map(algoEntry => {
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
      .reduce((s, e) => s + TRACKS.reduce((a, t) => a + (e.tracks?.[t] ?? 0), 0), 0);
    const albumAlgo28d = TRACKS.reduce((s, t) => s + tracks28d[t], 0);
    const albumAlgo7d  = TRACKS.reduce((s, t) => s + tracks7d[t], 0);
    const album28dPct  = album28dStreams > 0
      ? parseFloat(((albumAlgo28d / album28dStreams) * 100).toFixed(2)) : 0;
    const trackStats = {};
    TRACKS.forEach(t => {
      const tStreams28d = dailyLog
        .filter(e => e.date >= d28ago && e.date <= algoEntry.date)
        .reduce((s, e) => s + (e.tracks?.[t] ?? 0), 0);
      trackStats[t] = {
        streams28d: tracks28d[t], streams7d: tracks7d[t],
        pct28d: tStreams28d > 0 ? parseFloat(((tracks28d[t] / tStreams28d) * 100).toFixed(2)) : 0,
      };
    });
    return {
      date: algoEntry.date, label: `D+${daysSinceLaunch(algoEntry.date)}`,
      recordedAt: new Date().toISOString(),
      albumAlgorithmicTotal28d: albumAlgo28d, albumAlgorithmicTotal7d: albumAlgo7d,
      albumAlgorithmicPct28d: album28dPct, tracks: trackStats,
    };
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body ?? {};
    // Soporte batch (entries[]) y single (date + dailyTracks)
    const entries = body.entries ?? (body.date ? [body] : null);
    if (!entries?.length) return res.status(400).json({ error: 'Faltan datos' });

    // ── 1. UN SOLO READ ────────────────────────────────────────────────────────
    const current = await readCurrent();
    let dailyLog = [...(current.dailyLog ?? []).filter(d => d.tracks != null)];
    let algoLog  = [...(current.algoLog   ?? [])];
    let hasAlgo  = false;

    // ── 2. MERGEAR TODAS LAS FECHAS EN MEMORIA ────────────────────────────────
    for (const entry of entries) {
      const { date, note, dailyTracks, algoDailyTracks, algoEnabled } = entry;
      if (!date || !dailyTracks) continue;

      const dailyLabel = `D${new Date(date + 'T12:00:00Z').getUTCDate()}`;

      // Merge streams: preservar valores del blob si el incoming es 0
      const existingDay = dailyLog.find(d => d.date === date);
      const parsed = {};
      Object.entries(dailyTracks).forEach(([t, v]) => {
        const incoming = parseInt(v, 10) || 0;
        const existing = existingDay?.tracks?.[t] ?? 0;
        parsed[t] = (incoming === 0 && existing > 0) ? existing : incoming;
      });
      dailyLog = dailyLog.filter(d => d.date !== date);
      dailyLog.push({ date, label: dailyLabel, note: note || '', tracks: parsed });
      dailyLog.sort((a, b) => a.date.localeCompare(b.date));

      // Merge algo streams
      if (algoEnabled && algoDailyTracks) {
        const existingAlgo = algoLog.find(d => d.date === date);
        const parsedAlgo = {};
        Object.entries(algoDailyTracks).forEach(([t, v]) => {
          const incoming = parseInt(v, 10) || 0;
          const existing = existingAlgo?.tracks?.[t] ?? 0;
          const val = (incoming === 0 && existing > 0) ? existing : incoming;
          if (val > 0) parsedAlgo[t] = val;
        });
        if (Object.keys(parsedAlgo).length > 0) {
          algoLog = algoLog.filter(d => d.date !== date);
          algoLog.push({ date, label: dailyLabel, tracks: parsedAlgo });
          algoLog.sort((a, b) => a.date.localeCompare(b.date));
          hasAlgo = true;
        }
      }
    }

    // ── 3. RECALCULAR DERIVADOS ────────────────────────────────────────────────
    const cumulative = rebuildCumulatives(dailyLog);
    const albumTotal = Object.values(cumulative).reduce((s, v) => s + v, 0);

    const newData = {
      ...current,
      dailyLog,
      liveTotals:     cumulative,
      albumLiveTotal: albumTotal,
      liveHistory:    rebuildLiveHistory(dailyLog),
      lastUpdated:    { ...(current.lastUpdated ?? {}), spotify: new Date().toISOString() },
    };

    if (hasAlgo) {
      newData.algoLog           = algoLog;
      newData.algorithmicHistory = rebuildAlgoHistory(algoLog, dailyLog);
      const algD = {};
      TRACKS.forEach(t => { algD[t] = {}; });
      algoLog.forEach(e => {
        TRACKS.forEach(t => { if (e.tracks?.[t]) algD[t][e.date] = { streams: e.tracks[t] }; });
      });
      newData.algorithmicData = algD;
    }

    // ── 4. UN SOLO WRITE ───────────────────────────────────────────────────────
    await put(BLOB_KEY, JSON.stringify(newData, null, 2), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });

    return res.status(200).json({
      success: true,
      albumTotal,
      datesProcessed: entries.length,
    });

  } catch (e) {
    console.error('update-data error:', e?.message ?? e);
    return res.status(500).json({ error: e?.message ?? 'Error interno' });
  }
}
