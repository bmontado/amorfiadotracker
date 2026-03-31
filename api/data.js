// GET /api/data — devuelve el data.json actual desde Vercel Blob
// Si el blob no existe todavía, hace fallback a GitHub raw (migración)

import { list } from '@vercel/blob';

const BLOB_KEY = 'data.json';
const GITHUB_FALLBACK = 'https://raw.githubusercontent.com/bmontado/amorfiadotracker/main/public/data.json';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  try {
    let blob = null;
    try {
      const { blobs } = await list({ prefix: BLOB_KEY });
      blob = blobs.find(b => b.pathname === BLOB_KEY) ?? null;
    } catch { /* si list falla, caer al fallback */ }

    if (blob) {
      const dataRes = await fetch(`${blob.url}?t=${Date.now()}`);
      if (dataRes.ok) {
        const data = await dataRes.json();
        return res.status(200).json(data);
      }
    }

    // Fallback: blob no existe o falló — leer desde GitHub raw
    const ghRes = await fetch(`${GITHUB_FALLBACK}?t=${Date.now()}`);
    if (!ghRes.ok) throw new Error('GitHub fallback failed');
    const data = await ghRes.json();
    return res.status(200).json(data);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
