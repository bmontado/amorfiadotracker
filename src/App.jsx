import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

// ─── Datos dinámicos — fuente de verdad en public/data.json ───────────────────
// Este objeto es el fallback inicial. La app lo reemplaza al cargar data.json
// y lo refresca automáticamente cada 5 minutos.
const DEFAULT_LIVE_DATA = {
  lastUpdated: {
    spotify: '2026-03-23T12:06:43-03:00',
    social:  '2026-03-22T15:00:00-03:00',
  },
  albumLiveTotal: 704025,
  liveTotals: {
    'CUANDO ESCRIBÍA ASIMETRÍA': 276622, 'ATBLM': 204181, 'UN GUSTO': 34953,
    'CALL ME': 26075, 'MAN OF WORD': 25068, 'OJOS TRISTES': 23695,
    'HIELO': 21708, 'CHANGES': 21535, 'ALQUILER': 20058,
    'YA NO': 18126, 'HAZLO CALLAO': 16594, 'TOP TIER': 15674,
  },
  dailyLog: [
    { date: '2026-03-19', label: 'D19', note: '~1 h post-lanzamiento (20:00 UTC-3)', tracks: { 'CUANDO ESCRIBÍA ASIMETRÍA': 5814, 'ATBLM': 8513, 'UN GUSTO': 806, 'CALL ME': 1032, 'MAN OF WORD': 1293, 'OJOS TRISTES': 649, 'HIELO': 753, 'ALQUILER': 879, 'CHANGES': 676, 'YA NO': 472, 'HAZLO CALLAO': 486, 'TOP TIER': 383 } },
    { date: '2026-03-20', label: 'D20', note: 'Primer día completo', tracks: { 'CUANDO ESCRIBÍA ASIMETRÍA': 10875, 'ATBLM': 14710, 'UN GUSTO': 16320, 'CALL ME': 11305, 'MAN OF WORD': 10998, 'OJOS TRISTES': 10905, 'HIELO': 9626, 'ALQUILER': 9166, 'CHANGES': 9170, 'YA NO': 8069, 'HAZLO CALLAO': 7584, 'TOP TIER': 7061 } },
    { date: '2026-03-21', label: 'D21', note: 'Segundo día completo', tracks: { 'CUANDO ESCRIBÍA ASIMETRÍA': 7079, 'ATBLM': 9742, 'UN GUSTO': 8254, 'CALL ME': 6294, 'MAN OF WORD': 5968, 'OJOS TRISTES': 5708, 'HIELO': 5334, 'ALQUILER': 4822, 'CHANGES': 5213, 'YA NO': 4388, 'HAZLO CALLAO': 4084, 'TOP TIER': 3864 } },
    { date: '2026-03-22', label: 'D22', note: 'Tercer día completo', tracks: { 'CUANDO ESCRIBÍA ASIMETRÍA': 5464, 'ATBLM': 7568, 'UN GUSTO': 6120, 'CALL ME': 4926, 'MAN OF WORD': 4487, 'OJOS TRISTES': 4220, 'HIELO': 4022, 'ALQUILER': 3493, 'CHANGES': 4534, 'YA NO': 3470, 'HAZLO CALLAO': 2966, 'TOP TIER': 2879 } },
  ],
  liveHistory: [
    { date: '2026-03-22', label: 'D+3', recordedAt: '2026-03-22T15:00:00-03:00', albumTotal: 678677, tracks: { 'CUANDO ESCRIBÍA ASIMETRÍA': 273884, 'ATBLM': 200669, 'UN GUSTO': 31749, 'CALL ME': 23750, 'MAN OF WORD': 22919, 'OJOS TRISTES': 21652, 'HIELO': 19885, 'CHANGES': 19758, 'ALQUILER': 18508, 'YA NO': 16522, 'HAZLO CALLAO': 15226, 'TOP TIER': 14298 } },
    { date: '2026-03-23', label: 'D+4', recordedAt: '2026-03-23T12:06:43-03:00', albumTotal: 704025, tracks: { 'CUANDO ESCRIBÍA ASIMETRÍA': 276622, 'ATBLM': 204181, 'UN GUSTO': 34953, 'CALL ME': 26075, 'MAN OF WORD': 25068, 'OJOS TRISTES': 23695, 'HIELO': 21708, 'CHANGES': 21535, 'ALQUILER': 20058, 'YA NO': 18126, 'HAZLO CALLAO': 16594, 'TOP TIER': 15674 } },
  ],
};

const AmorFiadoDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [growthZoom, setGrowthZoom] = useState('all'); // 'all' | 'zoom'
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [socialView, setSocialView] = useState('chart'); // 'list' | 'chart'
  const [decayView, setDecayView] = useState('chart'); // 'chart' | 'table'
  const [histGrouping, setHistGrouping] = useState('day'); // 'day' | 'month'
  const [rankDay, setRankDay] = useState('day20'); // 'day19' | 'day20' | 'day21'
  const [hoveredDecayTrack, setHoveredDecayTrack] = useState(null);
  const [decayTooltipPos, setDecayTooltipPos] = useState({ x: 0, y: 0 });
  const [decayMethodOpen, setDecayMethodOpen] = useState(false);
  const [socialMethodOpen, setSocialMethodOpen] = useState(false);
  const [liveData, setLiveData] = useState(DEFAULT_LIVE_DATA);
  const [dataFreshAt, setDataFreshAt] = useState(null);

  // Polling: carga data.json al montar y cada 5 minutos.
  // La scheduled task solo necesita actualizar data.json y hacer push —
  // el siguiente ciclo del polling lo refleja automáticamente en todos los componentes.
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/data.json?t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          setLiveData(json);
          setDataFreshAt(Date.now());
        }
      } catch { /* red caída o build en curso: mantiene el estado anterior */ }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000); // cada 5 min
    return () => clearInterval(id);
  }, []);
  const toggleDay = (date) => setExpandedDays(prev => { const s = new Set(prev); s.has(date) ? s.delete(date) : s.add(date); return s; });

  // Album metadata
  const albumName = 'AMOR FIADO';
  const artist = 'ZEBALLOS';
  const releaseDate = '19 de Marzo, 2026 — 20:00 (UTC-3)';

  // Last data update timestamps — updated automatically by the scrapers each run
  const formatLastUpdated = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // ── Derivados de liveData (se actualizan automáticamente con cada poll) ──
  const lastUpdated    = liveData.lastUpdated;
  const albumLiveTotal = liveData.albumLiveTotal;
  const liveTotals     = liveData.liveTotals;
  const dailyLog       = liveData.dailyLog;
  const liveHistory    = liveData.liveHistory;

  // growthHistory: memoizado para que reaccione al poll
  const growthHistory = useMemo(() => liveHistory.map(s => ({
    timestamp: s.label + ' · ' + new Date(s.recordedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
    albumTotal: s.albumTotal,
    ...Object.fromEntries(
      Object.entries(s.tracks).map(([k, v]) => [k === 'CUANDO ESCRIBÍA ASIMETRÍA' ? 'CEA' : k, v])
    ),
  })), [liveData]);

  // 28-day period metrics per track (Feb 22 - Mar 21, 2026) — scraped Mar 22
  const trackMetrics = {
    'CUANDO ESCRIBÍA ASIMETRÍA': { streams28d: 142541, listeners: 48293, streamsPerListener: 2.952, playlistAdds: 3239, saves: 9327, prevPeriod: 125709, change: 13.4 },
    'ATBLM': { streams28d: 192790, listeners: 66579, streamsPerListener: 2.896, playlistAdds: 7921, saves: 17036, prevPeriod: null, change: null },
    'UN GUSTO': { streams28d: 25380, listeners: 15341, streamsPerListener: 1.654, playlistAdds: 1670, saves: 7742, prevPeriod: null, change: null },
    'CALL ME': { streams28d: 18631, listeners: 8669, streamsPerListener: 2.149, playlistAdds: 1314, saves: 7184, prevPeriod: null, change: null },
    'MAN OF WORD': { streams28d: 18259, listeners: 9369, streamsPerListener: 1.949, playlistAdds: 1152, saves: 7133, prevPeriod: null, change: null },
    'OJOS TRISTES': { streams28d: 17262, listeners: 9297, streamsPerListener: 1.857, playlistAdds: 1262, saves: 7158, prevPeriod: null, change: null },
    'HIELO': { streams28d: 15713, listeners: 7587, streamsPerListener: 2.071, playlistAdds: 1168, saves: 7036, prevPeriod: null, change: null },
    'CHANGES': { streams28d: 15059, listeners: 7663, streamsPerListener: 1.965, playlistAdds: 1147, saves: 6975, prevPeriod: null, change: null },
    'ALQUILER': { streams28d: 14867, listeners: 7906, streamsPerListener: 1.88, playlistAdds: 913, saves: 6800, prevPeriod: null, change: null },
    'YA NO': { streams28d: 12929, listeners: 6512, streamsPerListener: 1.985, playlistAdds: 1041, saves: 6901, prevPeriod: null, change: null },
    'HAZLO CALLAO': { streams28d: 12154, listeners: 6927, streamsPerListener: 1.755, playlistAdds: 864, saves: 6742, prevPeriod: null, change: null },
    'TOP TIER': { streams28d: 11308, listeners: 6043, streamsPerListener: 1.871, playlistAdds: 955, saves: 6819, prevPeriod: null, change: null },
  };

  // Social posts related to Amor Fiado campaign — scraped from @zeballos17 (IG) and @zeballos1717 (TikTok)
  // Each post has a unique URL used for dedup by the scheduled scraper
  const socialPosts = [
    // === Instagram (@zeballos17) ===
    { date: '2026-02-02', url: '/reel/DURexnHjuy4/', caption: 'CEA teaser con Juan Minujín — Estreno jueves 5/2', track: 'CUANDO ESCRIBÍA ASIMETRÍA', type: 'teaser', views: 406000, likes: 17000, saves: 0, platform: 'instagram' },
    { date: '2026-02-06', url: '/reel/DUa9-8bjgmB/', caption: 'CUANDO ESCRIBÍA ASIMETRÍA — Ya disponible', track: 'CUANDO ESCRIBÍA ASIMETRÍA', type: 'release', views: 133000, likes: 6497, saves: 0, platform: 'instagram' },
    { date: '2026-02-12', url: '/reel/DUrNhIvDmv2/', caption: 'AMOR FIADO promo (audio: CEA)', track: 'CUANDO ESCRIBÍA ASIMETRÍA', type: 'promo', views: 108000, likes: 5609, saves: 0, platform: 'instagram' },
    { date: '2026-02-28', url: '/reel/DVUSGuKjviG/', caption: 'ATBLM — Segundo adelanto de Amor Fiado', track: 'ATBLM', type: 'release', views: 166000, likes: 9381, saves: 0, platform: 'instagram' },
    { date: '2026-03-10', url: '/reel/DVuLW64Dssw/', caption: 'Nueve días para AMOR FIADO (audio: CEA)', track: 'AMOR FIADO', type: 'promo', views: 116000, likes: 6556, saves: 0, platform: 'instagram' },
    { date: '2026-03-19', url: '/reel/DWEezrPjpH9/', caption: 'Gracias Buenos Aires, estrenamos AMOR FIADO', track: 'AMOR FIADO', type: 'launch', views: 89000, likes: 4902, saves: 0, platform: 'instagram' },
    { date: '2026-03-20', url: '/reel/DWFzDpbjpuS/', caption: 'AMOR FIADO YA DISPONIBLE en todas las plataformas', track: 'AMOR FIADO', type: 'launch', views: 95100, likes: 5679, saves: 0, platform: 'instagram' },
    { date: '2026-03-21', url: '/reel/DWJqPCdjqMF/', caption: 'UN GUSTO ft @mesita — Videoclip', track: 'UN GUSTO', type: 'release', views: 118000, likes: 7703, saves: 0, platform: 'instagram' },
    // === TikTok (@zeballos1717) ===
    { date: '2026-01-28', url: '/video/7600558176781520149', caption: '05.02 @asimetria17 — Teaser fecha CEA', track: 'CUANDO ESCRIBÍA ASIMETRÍA', type: 'teaser', views: 11800, likes: 948, saves: 40, platform: 'tiktok' },
    { date: '2026-01-30', url: '/video/7601302776626384149', caption: 'Se viene @asimetria17', track: 'AMOR FIADO', type: 'teaser', views: 59800, likes: 8118, saves: 251, platform: 'tiktok' },
    { date: '2026-02-04', url: '/video/7603157705921957141', caption: 'Es mañana mi gente @asimetria17 — CEA eve', track: 'CUANDO ESCRIBÍA ASIMETRÍA', type: 'teaser', views: 29400, likes: 4589, saves: 115, platform: 'tiktok' },
    { date: '2026-02-06', url: '/video/7603879276328373525', caption: 'Sigo haciendo temas de lo que me gusta — CEA lyrics', track: 'CUANDO ESCRIBÍA ASIMETRÍA', type: 'release', views: 43900, likes: 5915, saves: 267, platform: 'tiktok' },
    { date: '2026-02-12', url: '/video/7606141408382160149', caption: 'Pero afuera nada invita a ir #amorfiado — CEA promo', track: 'CUANDO ESCRIBÍA ASIMETRÍA', type: 'promo', views: 77200, likes: 11000, saves: 713, platform: 'tiktok' },
    { date: '2026-02-19', url: '/video/7608593812587416852', caption: 'ATBLM snippet — viral', track: 'ATBLM', type: 'teaser', views: 183900, likes: 25800, saves: 2782, platform: 'tiktok' },
    { date: '2026-02-21', url: '/video/7609155471529856276', caption: 'ATBLM snippet 2', track: 'ATBLM', type: 'teaser', views: 134500, likes: 23100, saves: 1422, platform: 'tiktok' },
    { date: '2026-02-21', url: '/video/7609510867570576661', caption: 'ATBLM snippet — pool vibes', track: 'ATBLM', type: 'teaser', views: 63700, likes: 10700, saves: 508, platform: 'tiktok' },
    { date: '2026-02-25', url: '/video/7610835979628203284', caption: 'ATBLM 26/02 Es mañana dalee', track: 'ATBLM', type: 'teaser', views: 43200, likes: 7366, saves: 209, platform: 'tiktok' },
    { date: '2026-02-26', url: '/video/7611317540157017364', caption: 'ATBLM YA DISPONIBLE @asimetria17', track: 'ATBLM', type: 'release', views: 37600, likes: 5552, saves: 297, platform: 'tiktok' },
    { date: '2026-02-28', url: '/video/7612070065856433428', caption: 'Segundo adelanto de AMOR FIADO — ATBLM video', track: 'ATBLM', type: 'release', views: 101700, likes: 15300, saves: 1059, platform: 'tiktok' },
    { date: '2026-03-10', url: '/video/7615777036631657749', caption: 'MENOS DE 9 DÍAS PARA AMOR FIADO @asimetria17', track: 'AMOR FIADO', type: 'promo', views: 16400, likes: 2665, saves: 123, platform: 'tiktok' },
    { date: '2026-03-14', url: '/video/7617125475596455189', caption: '5 días para AMOR FIADO', track: 'AMOR FIADO', type: 'promo', views: 24300, likes: 3670, saves: 73, platform: 'tiktok' },
    { date: '2026-03-21', url: '/video/7619728786610785556', caption: 'UN GUSTO ft @Mesa Tra', track: 'UN GUSTO', type: 'release', views: 18600, likes: 2445, saves: 120, platform: 'tiktok' },
    { date: '2026-03-22', url: '/video/7620071012536749333', caption: 'Ya escucharon ojos tristes ft @Rei?', track: 'OJOS TRISTES', type: 'promo', views: 9128, likes: 1013, saves: 24, platform: 'tiktok' },
  ];

  // Derived from dailyLog — no editar manualmente
  const mar21Verified = dailyLog.find(d => d.date === '2026-03-21')?.tracks ?? {};

  // Raw stream data - all 12 tracks with daily breakdown
  const streamData = {
    'CUANDO ESCRIBÍA ASIMETRÍA': {
      type: 'single',
      releaseDate: '2026-02-05',
      streams: {
        '2026-02-05': 1289, '2026-02-06': 18178, '2026-02-07': 9594, '2026-02-08': 6470,
        '2026-02-09': 8353, '2026-02-10': 8315, '2026-02-11': 8747, '2026-02-12': 7823,
        '2026-02-13': 8980, '2026-02-14': 7461, '2026-02-15': 4868, '2026-02-16': 5848,
        '2026-02-17': 6717, '2026-02-18': 6336,
        '2026-02-19': 5173, '2026-02-20': 5913, '2026-02-21': 5644, '2026-02-22': 4943,
        '2026-02-23': 6415, '2026-02-24': 5643, '2026-02-25': 5586, '2026-02-26': 5543,
        '2026-02-27': 6232, '2026-02-28': 4607, '2026-03-01': 3276, '2026-03-02': 4690,
        '2026-03-03': 5452, '2026-03-04': 5202, '2026-03-05': 4478, '2026-03-06': 5375,
        '2026-03-07': 4819, '2026-03-08': 3700, '2026-03-09': 4581, '2026-03-10': 4404,
        '2026-03-11': 4446, '2026-03-12': 4387, '2026-03-13': 4362, '2026-03-14': 3879,
        '2026-03-15': 3284, '2026-03-16': 4247, '2026-03-17': 4315, '2026-03-18': 4907,
        '2026-03-19': 5814, '2026-03-20': 10875, '2026-03-21': 7079, '2026-03-22': 5464,
      },
    },
    'ATBLM': {
      type: 'single',
      releaseDate: '2026-02-26',
      streams: {
        '2026-02-26': 951, '2026-02-27': 17719, '2026-02-28': 9915, '2026-03-01': 7375,
        '2026-03-02': 8102, '2026-03-03': 7923, '2026-03-04': 7541, '2026-03-05': 7866,
        '2026-03-06': 7414, '2026-03-07': 6347, '2026-03-08': 5559, '2026-03-09': 7681,
        '2026-03-10': 8485, '2026-03-11': 7458, '2026-03-12': 8165, '2026-03-13': 8139,
        '2026-03-14': 6627, '2026-03-15': 5713, '2026-03-16': 6869, '2026-03-17': 6617,
        '2026-03-18': 7359, '2026-03-19': 8513, '2026-03-20': 14710, '2026-03-21': 9742, '2026-03-22': 7568,
      },
    },
    'UN GUSTO': { type: 'album', streams: { '2026-03-19': 806, '2026-03-20': 16320, '2026-03-21': 8254, '2026-03-22': 6120 } },
    'CALL ME': { type: 'album', streams: { '2026-03-19': 1032, '2026-03-20': 11305, '2026-03-21': 6294, '2026-03-22': 4926 } },
    'MAN OF WORD': { type: 'album', streams: { '2026-03-19': 1293, '2026-03-20': 10998, '2026-03-21': 5968, '2026-03-22': 4487 } },
    'OJOS TRISTES': { type: 'album', streams: { '2026-03-19': 649, '2026-03-20': 10905, '2026-03-21': 5708, '2026-03-22': 4220 } },
    'HIELO': { type: 'album', streams: { '2026-03-19': 753, '2026-03-20': 9626, '2026-03-21': 5334, '2026-03-22': 4022 } },
    'ALQUILER': { type: 'album', streams: { '2026-03-19': 879, '2026-03-20': 9166, '2026-03-21': 4822, '2026-03-22': 3493 } },
    'CHANGES': { type: 'album', streams: { '2026-03-19': 676, '2026-03-20': 9170, '2026-03-21': 5213, '2026-03-22': 4534 } },
    'YA NO': { type: 'album', streams: { '2026-03-19': 472, '2026-03-20': 8069, '2026-03-21': 4388, '2026-03-22': 3470 } },
    'HAZLO CALLAO': { type: 'album', streams: { '2026-03-19': 486, '2026-03-20': 7584, '2026-03-21': 4084, '2026-03-22': 2966 } },
    'TOP TIER': { type: 'album', streams: { '2026-03-19': 383, '2026-03-20': 7061, '2026-03-21': 3864, '2026-03-22': 2879 } },
  };

  // Computed cumulative stream totals per day (closed-day granularity)
  // Built from streamData + all dailyLog entries — adding a new day to dailyLog
  // automatically extends this chart
  const dailyHistory = useMemo(() => {
    const nameMap = {
      'CUANDO ESCRIBÍA ASIMETRÍA': 'CEA', 'ATBLM': 'ATBLM', 'UN GUSTO': 'UN GUSTO',
      'CALL ME': 'CALL ME', 'MAN OF WORD': 'MAN OF WORD', 'OJOS TRISTES': 'OJOS TRISTES',
      'HIELO': 'HIELO', 'CHANGES': 'CHANGES', 'ALQUILER': 'ALQUILER',
      'YA NO': 'YA NO', 'HAZLO CALLAO': 'HAZLO CALLAO', 'TOP TIER': 'TOP TIER',
    };
    // Build full per-track daily streams from streamData
    const fullStreams = {};
    Object.entries(streamData).forEach(([name, data]) => {
      const short = nameMap[name] || name;
      fullStreams[short] = { ...data.streams };
    });
    // Overlay all dailyLog entries (covers D19, D20, D21, D22, …)
    dailyLog.forEach(entry => {
      Object.entries(entry.tracks).forEach(([name, val]) => {
        const short = nameMap[name] || name;
        if (!fullStreams[short]) fullStreams[short] = {};
        fullStreams[short][entry.date] = val;
      });
    });
    // Collect all dates and sort
    const allDates = new Set();
    Object.values(fullStreams).forEach(s => Object.keys(s).forEach(d => allDates.add(d)));
    const sortedDates = [...allDates].sort();
    const releaseIdx = sortedDates.indexOf('2026-03-19');
    // Walk dates accumulating cumulative totals per track
    const cumulatives = Object.fromEntries(Object.keys(fullStreams).map(k => [k, 0]));
    return sortedDates.map((date, idx) => {
      Object.entries(fullStreams).forEach(([name, s]) => {
        cumulatives[name] = (cumulatives[name] || 0) + (s[date] || 0);
      });
      const albumTotal = Object.values(cumulatives).reduce((a, b) => a + b, 0);
      const dayNum = releaseIdx >= 0 && idx >= releaseIdx ? idx - releaseIdx + 1 : null;
      const snap = { date, label: date.slice(5).replace('-', '/'), dayNum, albumTotal };
      Object.entries(cumulatives).forEach(([k, v]) => { snap[k] = v; });
      return { ...snap };
    });
  }, [liveData]);

  const metrics = useMemo(() => {
    // Use verified Mar 21 daily streams
    const mar21Streams = { ...mar21Verified };

    // Build fullStreamData: base streamData + every dailyLog entry overlaid
    // This ensures Singles, Crecimiento, and Decay charts see D21, D22, D23…
    const fullStreamData = {};
    Object.entries(streamData).forEach(([name, data]) => {
      const dailyOverlay = {};
      dailyLog.forEach(entry => {
        if (entry.tracks[name] != null) dailyOverlay[entry.date] = entry.tracks[name];
      });
      fullStreamData[name] = { ...data, streams: { ...data.streams, ...dailyOverlay } };
    });

    // Total live streams
    const totalLiveStreams = Object.values(liveTotals).reduce((a, b) => a + b, 0);

    // Streams by date
    const day19Streams = Object.values(streamData).reduce(
      (sum, track) => sum + (track.streams['2026-03-19'] || 0), 0
    );
    const day20Streams = Object.values(streamData).reduce(
      (sum, track) => sum + (track.streams['2026-03-20'] || 0), 0
    );
    const day21Streams = Object.values(mar21Streams).reduce((a, b) => a + b, 0);

    // Day 20 by track (for ranking)
    const day20ByTrack = Object.entries(streamData).map(([name, data]) => ({
      name: name.length > 20 ? name.substring(0, 18) + '...' : name,
      fullName: name,
      streams: data.streams['2026-03-20'] || 0,
      type: data.type,
    })).sort((a, b) => b.streams - a.streams);

    // Average per track on day 20 (album-only tracks)
    const albumOnlyDay20 = Object.entries(streamData)
      .filter(([, d]) => d.type === 'album')
      .map(([, d]) => d.streams['2026-03-20'] || 0);
    const avgDay20Album = Math.round(albumOnlyDay20.reduce((a, b) => a + b, 0) / albumOnlyDay20.length);

    // Most listened track on day 20
    const topTrackDay20 = day20ByTrack[0];

    // Pre-release singles analysis
    const singlesAnalysis = {};
    Object.entries(streamData).forEach(([name, data]) => {
      if (data.type === 'single') {
        const preAlbumStreams = Object.entries(data.streams)
          .filter(([date]) => date < '2026-03-19')
          .map(([, count]) => count);
        const preAlbumAvg = Math.round(preAlbumStreams.reduce((a, b) => a + b, 0) / preAlbumStreams.length);
        const preAlbumPeak = Math.max(...preAlbumStreams);
        const day20 = data.streams['2026-03-20'];
        const multiplier = (day20 / preAlbumAvg).toFixed(2);
        const decayFromPeak = ((preAlbumAvg - preAlbumPeak) / preAlbumPeak * 100).toFixed(1);

        singlesAnalysis[name] = {
          preAlbumAvg, preAlbumPeak, day20, multiplier, decayFromPeak,
          growth: day20 - preAlbumAvg,
          day21: mar21Streams[name],
          day21Multiplier: (mar21Streams[name] / preAlbumAvg).toFixed(2),
        };
      }
    });

    // Track analysis with decay and anomalies
    const allDay20NewTracks = Object.entries(streamData)
      .filter(([, d]) => d.type === 'album')
      .map(([, d]) => d.streams['2026-03-20'] || 0);
    const meanDay20New = allDay20NewTracks.reduce((a, b) => a + b, 0) / allDay20NewTracks.length;
    const stdDevDay20New = Math.sqrt(
      allDay20NewTracks.reduce((sum, val) => sum + Math.pow(val - meanDay20New, 2), 0) / allDay20NewTracks.length
    );

    const trackAnalysis = Object.entries(fullStreamData).map(([name, data]) => {
      const day19 = data.streams['2026-03-19'] || 0;
      const day20 = data.streams['2026-03-20'] || 0;
      const day21 = data.streams['2026-03-21'] || 0;
      const estimatedDay19Full = day19 * 8;

      // Decay: day 20 → day 21 (day 21 is partial, so we note that)
      const decayD20toD21 = day20 > 0 ? ((day21 - day20) / day20 * 100).toFixed(1) : 'N/A';

      let anomaly = null;
      let anomalyColor = null;

      if (data.type === 'single') {
        anomaly = 'Album Bump';
        anomalyColor = 'yellow';
      } else {
        const zScore = (day20 - meanDay20New) / (stdDevDay20New || 1);
        if (zScore > 1.5) {
          anomaly = 'Outperformer';
          anomalyColor = 'green';
        } else if (zScore < -1.5) {
          anomaly = 'Underperformer';
          anomalyColor = 'red';
        }
      }

      return {
        name, day19, day20, day21, estimatedDay19Full: Math.round(estimatedDay19Full),
        decayD20toD21, anomaly, anomalyColor, type: data.type,
        liveTotal: liveTotals[name],
      };
    }).sort((a, b) => b.day20 - a.day20);

    // Multi-day comparison — dynamic: auto-includes every entry in dailyLog (D19, D20, D21, D22…)
    const d20LogEntry = dailyLog.find(e => e.date === '2026-03-20');
    const multiDayData = Object.entries(fullStreamData).map(([name, data]) => {
      const row = {
        name: name.length > 18 ? name.substring(0, 16) + '...' : name,
        fullName: name,
        type: data.type,
      };
      dailyLog.forEach(entry => {
        row[entry.label] = entry.tracks[name] != null ? entry.tracks[name] : (data.streams[entry.date] || 0);
      });
      return row;
    }).sort((a, b) => {
      const key = d20LogEntry ? d20LogEntry.label : (dailyLog[1] || dailyLog[0])?.label;
      return (b[key] || 0) - (a[key] || 0);
    });

    // ── Album health & summary KPIs ──
    const LAUNCH_DATE = '2026-03-19';
    const daysLive = Math.max(1, Math.floor((Date.now() - new Date(LAUNCH_DATE + 'T23:00:00Z').getTime()) / 86400000));
    const albumDecayD20D21 = day20Streams > 0 ? (day21Streams - day20Streams) / day20Streams * 100 : null;
    const EXPECTED_DECAY_PCT = -46; // ref curve CEA+ATBLM D20→D21 ≈ -46%
    const decayDiff = albumDecayD20D21 !== null ? albumDecayD20D21 - EXPECTED_DECAY_PCT : null;
    const healthStatus = decayDiff === null ? 'Calculando'
      : decayDiff > 12  ? 'Buena retención'
      : decayDiff > -8  ? 'Decaimiento normal'
      : 'Bajo presión';
    const healthColor = decayDiff === null ? '#64748b'
      : decayDiff > 12  ? '#4ade80'
      : decayDiff > -8  ? '#fbbf24'
      : '#f87171';
    const albumTracksOnly = trackAnalysis.filter(t => t.type === 'album' && t.decayD20toD21 !== 'N/A');
    const sortedByRetention = [...albumTracksOnly].sort((a, b) => parseFloat(b.decayD20toD21) - parseFloat(a.decayD20toD21));
    const bestRetentionTrack  = sortedByRetention[0] || null;
    const worstDecayTrack     = sortedByRetention[sortedByRetention.length - 1] || null;
    const topLiveTrack        = [...trackAnalysis].sort((a, b) => (b.liveTotal || 0) - (a.liveTotal || 0))[0] || null;

    // Timeline chart data (for pre-release singles)
    // Extends automatically to the last date in dailyLog
    const timelineData = [];
    const dateRange = [];
    const lastLogDate = dailyLog.length > 0 ? dailyLog[dailyLog.length - 1].date : '2026-03-21';
    for (let d = new Date('2026-02-05'); d <= new Date(lastLogDate + 'T12:00:00'); d.setDate(d.getDate() + 1)) {
      dateRange.push(d.toISOString().split('T')[0]);
    }
    dateRange.forEach((date) => {
      const dp = {
        date: new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        fullDate: date,
      };
      dp['CUANDO ESCRIBÍA ASIMETRÍA'] = fullStreamData['CUANDO ESCRIBÍA ASIMETRÍA'].streams[date] || 0;
      dp['ATBLM'] = fullStreamData['ATBLM'].streams[date] || 0;
      timelineData.push(dp);
    });

    return {
      totalLiveStreams, day19Streams, day20Streams, day21Streams,
      day20ByTrack, avgDay20Album, topTrackDay20, singlesAnalysis,
      trackAnalysis, multiDayData, timelineData, mar21Streams,
      daysLive, albumDecayD20D21, healthStatus, healthColor, decayDiff,
      bestRetentionTrack, worstDecayTrack, topLiveTrack,
    };
  }, [liveData]);

  const formatNumber = (num) => new Intl.NumberFormat('es-AR').format(Math.round(num));

  const tabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'tracks', label: 'Tracks' },
    { id: 'growth', label: 'Crecimiento' },
    { id: 'metrics', label: 'Métricas S4A' },
    { id: 'singles', label: 'Singles' },
    { id: 'decay', label: 'Decay Intel (DM)' },
    { id: 'social', label: 'Social Impact' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #111827 50%, #0a0a0f 100%)', color: '#f1f5f9', fontFamily: "'Inter', -apple-system, sans-serif", padding: '2rem' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(251, 146, 60, 0.3)', paddingBottom: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
            {/* Cover art */}
            <img
              src="/cover.jpg"
              alt="Amor Fiado cover"
              style={{ width: '90px', height: '90px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
            />
            <div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>PCM Analytics</p>
              <h1 style={{ fontSize: '3rem', fontWeight: 800, background: 'linear-gradient(135deg, #f97316, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, lineHeight: 1.1 }}>{albumName}</h1>
              <p style={{ fontSize: '1.25rem', color: '#cbd5e1', marginTop: '0.25rem' }}>{artist}</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>{releaseDate}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>All-time Streams · LIVE</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f97316', margin: 0 }}>{formatNumber(albumLiveTotal)}</p>
            <p style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>12 tracks · S4A: <span style={{ color: '#f97316' }}>{formatLastUpdated(lastUpdated.spotify)}</span></span>
              {dataFreshAt && (Date.now() - dataFreshAt) < 90000 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '9999px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  Actualizado
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '9999px', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === tab.id ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(51, 65, 85, 0.5)',
              color: activeTab === tab.id ? '#fff' : '#94a3b8',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === OVERVIEW TAB === */}
      {activeTab === 'overview' && (
        <div>

          {/* ── 1. Estado del Álbum ── */}
          <div style={{ background: `linear-gradient(135deg, ${metrics.healthColor}0d, rgba(15,23,42,0.7))`, borderRadius: '12px', padding: '1.1rem 1.5rem', marginBottom: '1.5rem', border: `1px solid ${metrics.healthColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ background: `${metrics.healthColor}1a`, border: `1px solid ${metrics.healthColor}55`, color: metrics.healthColor, fontSize: '0.72rem', fontWeight: 800, padding: '0.3rem 0.9rem', borderRadius: '9999px', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {metrics.healthStatus}
              </span>
              <span style={{ color: '#475569', fontSize: '0.78rem' }}>D+{metrics.daysLive} · lanzamiento 19/03/26</span>
              {metrics.albumDecayD20D21 !== null && (
                <span style={{ fontSize: '0.73rem', color: '#475569' }}>
                  Decay D20→D21: <span style={{ color: metrics.healthColor, fontWeight: 700 }}>{metrics.albumDecayD20D21.toFixed(1)}%</span>
                  <span style={{ color: '#334155' }}> (esperado ~-46%)</span>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#475569', fontSize: '0.68rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Acumulado</p>
                <p style={{ color: '#f97316', fontSize: '1.6rem', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>{formatNumber(albumLiveTotal)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#475569', fontSize: '0.68rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ventana D28</p>
                <p style={{ color: '#94a3b8', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  {28 - metrics.daysLive > 0 ? `${28 - metrics.daysLive}d restantes` : 'completada'}
                </p>
              </div>
            </div>
          </div>

          {/* ── 2. KPI Cards ── */}
          {(() => {
            const socialByTrack = {};
            socialPosts.forEach(p => {
              if (!socialByTrack[p.track]) socialByTrack[p.track] = 0;
              socialByTrack[p.track] += p.views;
            });
            const topSocialEntry = Object.entries(socialByTrack).sort((a, b) => b[1] - a[1])[0];
            const cards = [
              { label: 'Streams acumulados', value: formatNumber(albumLiveTotal), sub: `12 tracks · ${formatLastUpdated(lastUpdated.spotify)}`, color: '#f97316' },
              { label: `Días activo`, value: `D+${metrics.daysLive}`, sub: 'Desde lanzamiento', color: '#38bdf8' },
              { label: 'Líder acumulado', value: metrics.topLiveTrack?.name || '—', sub: formatNumber(metrics.topLiveTrack?.liveTotal || 0) + ' streams live', color: '#4ade80' },
              { label: 'Mejor retención', value: metrics.bestRetentionTrack?.name || '—', sub: `D20→D21: ${metrics.bestRetentionTrack?.decayD20toD21}%`, color: '#a78bfa' },
              { label: 'Decay álbum D20→D21', value: metrics.albumDecayD20D21 !== null ? `${metrics.albumDecayD20D21.toFixed(1)}%` : '—', sub: 'esperado ~-46%', color: metrics.healthColor },
              { label: 'Top social', value: topSocialEntry ? topSocialEntry[0] : '—', sub: topSocialEntry ? formatNumber(topSocialEntry[1]) + ' views totales' : '', color: '#e879f9' },
            ];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
                {cards.map((card, i) => (
                  <div key={i} style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '10px', padding: '0.9rem 1rem', border: '1px solid rgba(51,65,85,0.45)' }}>
                    <p style={{ color: '#475569', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.4rem' }}>{card.label}</p>
                    <p style={{ color: card.color, fontSize: card.value.length > 10 ? '1rem' : '1.4rem', fontWeight: 700, margin: '0 0 0.2rem', lineHeight: 1.15 }}>{card.value}</p>
                    <p style={{ color: '#334155', fontSize: '0.67rem', margin: 0 }}>{card.sub}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── 3. Comparativa Diaria — dinámica desde dailyLog ── */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ color: '#f97316', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Comparativa Diaria por Track</h2>
              <span style={{ color: '#334155', fontSize: '0.7rem' }}>Se actualiza automáticamente con cada nuevo día en dailyLog</span>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={metrics.multiDayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={80} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '8px' }} formatter={v => formatNumber(v)} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                {dailyLog.map((entry, i) => {
                  const colors = ['#475569', '#f97316', '#fbbf24', '#4ade80', '#38bdf8', '#a78bfa', '#fb7185'];
                  return <Bar key={entry.label} dataKey={entry.label} name={`${entry.label} · ${entry.note}`} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />;
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── 4. Accionables ── */}
          {(() => {
            const socialByTrack = {};
            const lastPostByTrack = {};
            socialPosts.forEach(p => {
              if (!socialByTrack[p.track]) socialByTrack[p.track] = 0;
              socialByTrack[p.track] += p.views;
              if (!lastPostByTrack[p.track] || p.date > lastPostByTrack[p.track]) {
                lastPostByTrack[p.track] = p.date;
              }
            });
            const launchDate = new Date('2026-03-19');
            const needsPush = metrics.worstDecayTrack ? {
              track: metrics.worstDecayTrack.name,
              decay: metrics.worstDecayTrack.decayD20toD21,
              lastPost: lastPostByTrack[metrics.worstDecayTrack.name] || null,
              daysSincePost: lastPostByTrack[metrics.worstDecayTrack.name]
                ? Math.floor((new Date() - new Date(lastPostByTrack[metrics.worstDecayTrack.name])) / 86400000)
                : null,
            } : null;
            const momentumTrack = metrics.bestRetentionTrack;
            const nextMilestone = [7, 14, 21, 28].find(m => m > metrics.daysLive) || null;
            const daysToMilestone = nextMilestone ? nextMilestone - metrics.daysLive : null;
            const actions = [
              needsPush ? {
                color: '#f87171', badge: 'PUSH', category: 'Esta semana',
                title: `Activar ${needsPush.track}`,
                body: `Mayor decay del álbum (${needsPush.decay}%). ${needsPush.lastPost ? `Último post: hace ${needsPush.daysSincePost}d.` : 'Sin cobertura social desde lanzamiento.'}`,
                action: 'Publicar snippet o contenido de letra en TikTok o IG Reels.',
              } : null,
              momentumTrack ? {
                color: '#4ade80', badge: 'MOMENTUM', category: 'Playlist',
                title: `Pitch ${momentumTrack.name}`,
                body: `Mejor retención del álbum (${momentumTrack.decayD20toD21}% D20→D21). Señal de fidelidad de oyentes — perfil ideal para playlists editoriales.`,
                action: 'Enviar a curadoras de Spotify/Apple en los próximos días.',
              } : null,
              {
                color: '#38bdf8', badge: nextMilestone ? `D${nextMilestone}` : 'D28', category: 'Proyección',
                title: nextMilestone ? `Checkpoint D+${nextMilestone} en ${daysToMilestone}d` : 'Ventana D28 completada',
                body: `${nextMilestone ? `En ${daysToMilestone} día${daysToMilestone !== 1 ? 's' : ''} se puede comparar la proyección del modelo vs. datos reales del D+${nextMilestone}.` : 'Los primeros 28 días ya transcurrieron. Revisar retención mensual.'}`,
                action: nextMilestone ? 'Actualizar dailyLog y revisar precisión del modelo en Decay Intel.' : 'Analizar streams mensuales y streams/oyente.',
              },
            ].filter(Boolean);
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem', marginBottom: '1.75rem' }}>
                {actions.map((a, i) => (
                  <div key={i} style={{ background: 'rgba(15,23,42,0.6)', border: `1px solid ${a.color}33`, borderLeft: `3px solid ${a.color}`, borderRadius: '10px', padding: '1rem 1.1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ background: `${a.color}22`, color: a.color, fontSize: '0.6rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '9999px', letterSpacing: '0.1em' }}>{a.badge}</span>
                      <span style={{ color: '#475569', fontSize: '0.68rem' }}>{a.category}</span>
                    </div>
                    <p style={{ color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.4rem', lineHeight: 1.3 }}>{a.title}</p>
                    <p style={{ color: '#64748b', fontSize: '0.77rem', margin: '0 0 0.6rem', lineHeight: 1.5 }}>{a.body}</p>
                    <p style={{ color: a.color, fontSize: '0.73rem', margin: 0, fontWeight: 500 }}>→ {a.action}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── 5. Alcance Social por Track ── */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)' }}>
            <h2 style={{ color: '#a78bfa', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>Alcance Social por Track</h2>
            <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0 0 1rem' }}>Posts de la campaña atribuidos por track — IG + TikTok combinados</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(51,65,85,0.8)' }}>
                    {['Track', 'Posts', 'IG Views', 'TK Views', 'Total Views', 'Likes', 'TK Saves', 'Eng.', 'Streams Live'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Track' ? 'left' : 'right', padding: '0.6rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const byTrack = {};
                    socialPosts.forEach(p => {
                      const key = p.track;
                      if (!byTrack[key]) byTrack[key] = { posts: 0, igViews: 0, tkViews: 0, likes: 0, saves: 0 };
                      byTrack[key].posts++;
                      if (p.platform === 'instagram') byTrack[key].igViews += p.views;
                      else byTrack[key].tkViews += p.views;
                      byTrack[key].likes += p.likes;
                      byTrack[key].saves += p.saves;
                    });
                    return Object.entries(byTrack).sort((a, b) => (b[1].igViews + b[1].tkViews) - (a[1].igViews + a[1].tkViews)).map(([track, d]) => {
                      const total = d.igViews + d.tkViews;
                      const eng = ((d.likes / total) * 100).toFixed(1);
                      const liveStreams = liveTotals[track] || null;
                      return (
                        <tr key={track} style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                          <td style={{ padding: '0.6rem', color: '#f1f5f9', fontWeight: 500 }}>{track}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem', color: '#a78bfa', fontWeight: 700 }}>{d.posts}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem', color: '#e879f9' }}>{d.igViews > 0 ? formatNumber(d.igViews) : '—'}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem', color: '#22d3ee' }}>{d.tkViews > 0 ? formatNumber(d.tkViews) : '—'}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem', color: '#38bdf8', fontWeight: 700 }}>{formatNumber(total)}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem', color: '#f87171' }}>{formatNumber(d.likes)}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem', color: '#fbbf24' }}>{d.saves > 0 ? formatNumber(d.saves) : '—'}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem', color: '#4ade80' }}>{eng}%</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem', color: '#f97316', fontWeight: 700 }}>{liveStreams ? formatNumber(liveStreams) : '—'}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* === TRACKS TAB === */}
      {activeTab === 'tracks' && (
        <div>
          {/* ── 1. Streams Acumulados (Live) ── */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Streams Acumulados (Live)</h2>
            <div style={{ overflowX: 'auto' }}>
              {(() => {
                // Columnas de días dinámicas desde dailyLog
                const abbrevNote = (note) => {
                  if (note.includes('post-lanzamiento') || note.includes('~1')) return '~1h lanz.';
                  const m = note.match(/^(Primer|Segundo|Tercer|Cuarto|Quinto|Sexto|Séptimo)/);
                  if (m) return m[0].replace('Primer','1er').replace('Segundo','2do').replace('Tercer','3er').replace('Cuarto','4to').replace('Quinto','5to').replace('Sexto','6to').replace('Séptimo','7mo') + ' día';
                  return note.substring(0, 12);
                };
                const d20entry = dailyLog.find(e => e.date === '2026-03-20');
                const fullDays = dailyLog.filter(e => e.date >= '2026-03-20');
                const lastFullDay = fullDays[fullDays.length - 1];
                const decayColLabel = d20entry && lastFullDay && lastFullDay.date !== d20entry.date
                  ? `${d20entry.label}→${lastFullDay.label}`
                  : 'D20→D21';
                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(51,65,85,0.8)' }}>
                        <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>#</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Track</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem', color: '#f97316' }}>Live Total</th>
                        {dailyLog.map(entry => (
                          <th key={entry.date} style={{ textAlign: 'right', padding: '0.6rem 0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600 }}>{entry.label}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 400 }}>{abbrevNote(entry.note)}</div>
                          </th>
                        ))}
                        <th style={{ textAlign: 'right', padding: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{decayColLabel}</th>
                        <th style={{ textAlign: 'center', padding: '0.75rem', color: '#94a3b8' }}>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...metrics.trackAnalysis].sort((a, b) => b.liveTotal - a.liveTotal).map((t, i) => {
                        const d20streams = d20entry?.tracks[t.name] ?? 0;
                        const lastStreams = lastFullDay?.tracks[t.name] ?? 0;
                        const dynamicDecay = d20streams > 0 ? ((lastStreams - d20streams) / d20streams * 100).toFixed(1) : 'N/A';
                        const decayVal = parseFloat(dynamicDecay);
                        const decayColor = isNaN(decayVal) ? '#64748b' : decayVal >= 0 ? '#4ade80' : Math.abs(decayVal) > 55 ? '#f87171' : '#fbbf24';
                        return (
                          <tr key={t.name} style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                            <td style={{ padding: '0.75rem', color: '#64748b', fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: '0.75rem', color: '#f1f5f9', fontWeight: 500 }}>{t.name}</td>
                            <td style={{ textAlign: 'right', padding: '0.75rem', color: '#f97316', fontWeight: 700 }}>{formatNumber(t.liveTotal)}</td>
                            {dailyLog.map(entry => (
                              <td key={entry.date} style={{ textAlign: 'right', padding: '0.75rem', color: '#94a3b8' }}>
                                {formatNumber(entry.tracks[t.name] ?? 0)}
                              </td>
                            ))}
                            <td style={{ textAlign: 'right', padding: '0.75rem', color: decayColor, fontWeight: 600, fontSize: '0.8rem' }}>
                              {dynamicDecay === 'N/A' ? '—' : `${decayVal >= 0 ? '+' : ''}${dynamicDecay}%`}
                            </td>
                            <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                              <span style={{
                                padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600,
                                background: t.type === 'single' ? 'rgba(251,191,36,0.15)' : 'rgba(249,115,22,0.15)',
                                color: t.type === 'single' ? '#fbbf24' : '#f97316',
                                border: `1px solid ${t.type === 'single' ? 'rgba(251,191,36,0.3)' : 'rgba(249,115,22,0.3)'}`,
                              }}>
                                {t.type === 'single' ? 'Single' : 'Álbum'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>

          {/* ── 2. Ranking con selector de día ── */}
          {(() => {
            // rankDays derivado de dailyLog — se expande solo con D23, D24, etc.
            const rankDays = dailyLog.map(e => ({ key: e.date, label: e.label, sub: e.note }));
            // Si el rankDay actual no existe en la nueva lista (ej. venía de 'day20'), usar D20 o el último
            const validKey = rankDays.find(d => d.key === rankDay)
              ? rankDay
              : (rankDays.find(d => d.label === 'D20')?.key ?? rankDays[rankDays.length - 1]?.key);
            const idx = rankDays.findIndex(d => d.key === validKey);
            const current = rankDays[idx] || rankDays[0];
            // Streams del día seleccionado leídos directo del dailyLog
            const selectedEntry = dailyLog.find(e => e.key === validKey) || dailyLog.find(e => e.date === validKey);
            const rankData = [...metrics.trackAnalysis]
              .map(t => ({
                name: t.name.length > 22 ? t.name.substring(0, 20) + '…' : t.name,
                fullName: t.name,
                streams: selectedEntry?.tracks[t.name] ?? 0,
                type: t.type,
              }))
              .filter(t => t.streams > 0)
              .sort((a, b) => b.streams - a.streams);
            return (
              <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
                {/* Header + navigator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Ranking por Día</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => setRankDay(rankDays[Math.max(0, idx - 1)].key)}
                      disabled={idx <= 0}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(51,65,85,0.7)', background: idx <= 0 ? 'rgba(51,65,85,0.2)' : 'rgba(51,65,85,0.5)', color: idx <= 0 ? '#334155' : '#94a3b8', cursor: idx <= 0 ? 'default' : 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >‹</button>
                    <div style={{ textAlign: 'center', minWidth: '120px' }}>
                      <p style={{ color: '#f97316', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{current.label}</p>
                      <p style={{ color: '#64748b', fontSize: '0.7rem', margin: 0 }}>{current.sub}</p>
                    </div>
                    <button
                      onClick={() => setRankDay(rankDays[Math.min(rankDays.length - 1, idx + 1)].key)}
                      disabled={idx >= rankDays.length - 1}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(51,65,85,0.7)', background: idx >= rankDays.length - 1 ? 'rgba(51,65,85,0.2)' : 'rgba(51,65,85,0.5)', color: idx >= rankDays.length - 1 ? '#334155' : '#94a3b8', cursor: idx >= rankDays.length - 1 ? 'default' : 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >›</button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart layout="vertical" data={rankData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                    <XAxis type="number" stroke="#64748b" tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={200} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '8px' }} formatter={(v) => formatNumber(v)} />
                    <Bar dataKey="streams" radius={[0, 6, 6, 0]}>
                      {rankData.map((entry, idx2) => (
                        <Cell key={idx2} fill={entry.type === 'single' ? '#fbbf24' : '#f97316'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', background: '#fbbf24', borderRadius: '3px' }}></div>
                    <span style={{ color: '#94a3b8' }}>Singles pre-álbum</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', background: '#f97316', borderRadius: '3px' }}></div>
                    <span style={{ color: '#94a3b8' }}>Tracks nuevos</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── 3. Track Insights ── */}
          <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(30,41,59,0.6))', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(249,115,22,0.2)' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Análisis de Tracks</h2>
            {(() => {
              const top3 = metrics.day20ByTrack.slice(0, 3);
              const top3Pct = Math.round(top3.reduce((s, t) => s + t.streams, 0) / metrics.day20Streams * 100);
              const withDecay = [...metrics.trackAnalysis].filter(t => t.decayD20toD21 !== 'N/A');
              const sortedByDecay = [...withDecay].sort((a, b) => parseFloat(b.decayD20toD21) - parseFloat(a.decayD20toD21));
              const bestRetention = sortedByDecay[0];
              const worstRetention = sortedByDecay[sortedByDecay.length - 1];
              const outperformers = metrics.trackAnalysis.filter(t => t.anomaly === 'Outperformer');
              const underperformers = metrics.trackAnalysis.filter(t => t.anomaly === 'Underperformer');
              const bestRetVal = parseFloat(bestRetention.decayD20toD21);
              const worstRetVal = parseFloat(worstRetention.decayD20toD21);
              const insights = [
                { dot: top3Pct <= 55 ? '#4ade80' : '#fbbf24', text: `Top 3 tracks (${top3.map(t => t.fullName.split(' ')[0]).join(', ')}) concentran el ${top3Pct}% de los streams del D20. ${top3Pct <= 55 ? 'Distribución equilibrada — el long tail tiene potencial.' : 'Catálogo con hit dominante — los tracks menores necesitan más tracción.'}` },
                { dot: bestRetVal >= 0 ? '#4ade80' : '#fbbf24', text: `Mejor retención D20→D21: ${bestRetention.name} (${bestRetVal >= 0 ? '+' : ''}${bestRetention.decayD20toD21}%). ${bestRetVal >= 0 ? 'Creció en su segundo día completo — posible efecto de social media o playlist tardío.' : 'Menor caída entre todos los tracks del álbum.'}` },
                { dot: Math.abs(worstRetVal) > 55 ? '#f87171' : '#fb923c', text: `Mayor decay D20→D21: ${worstRetention.name} (${worstRetention.decayD20toD21}%). ${Math.abs(worstRetVal) > 55 ? 'Caída pronunciada — candidato para push en playlist o social.' : 'Dentro del rango esperado para el segundo día de un álbum nuevo.'}` },
                outperformers.length > 0 ? { dot: '#4ade80', text: `Outperformer${outperformers.length > 1 ? 's' : ''} estadístico${outperformers.length > 1 ? 's' : ''} (Z > 1.5): ${outperformers.map(t => t.name).join(', ')} — superaron significativamente el promedio del álbum en D20 (${formatNumber(metrics.avgDay20Album)} streams).` } : null,
                underperformers.length > 0 ? { dot: '#f87171', text: `Underperformer${underperformers.length > 1 ? 's' : ''} estadístico${underperformers.length > 1 ? 's' : ''} (Z < -1.5): ${underperformers.map(t => t.name).join(', ')} — por debajo del promedio. Candidatos para push en social o colaboración con el artista.` } : null,
              ].filter(Boolean);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ins.dot, flexShrink: 0, marginTop: '6px', boxShadow: `0 0 6px ${ins.dot}88` }} />
                      <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{ins.text}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* === CRECIMIENTO TAB === */}
      {activeTab === 'growth' && (
        <div>
          {/* KPI cards — from dailyHistory */}
          {(() => {
            const last = dailyHistory[dailyHistory.length - 1];
            const prev = dailyHistory[dailyHistory.length - 2];
            const dayDelta = last && prev ? last.albumTotal - prev.albumTotal : null;
            const topTrack = last ? Object.entries(last).filter(([k]) => k !== 'date' && k !== 'label' && k !== 'albumTotal').sort((a, b) => b[1] - a[1])[0] : null;
            const day19entry = dailyHistory.find(d => d.date === '2026-03-19');
            const day20entry = dailyHistory.find(d => d.date === '2026-03-20');
            const launchDayStreams = day19entry && day20entry ? day20entry.albumTotal - day19entry.albumTotal : null;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { label: 'Acumulado al ' + (last?.label || '—'), value: last ? formatNumber(last.albumTotal) : '—', color: '#f97316' },
                  { label: 'Streams D+1 (20/03)', value: launchDayStreams ? formatNumber(launchDayStreams) : '—', color: '#4ade80' },
                  { label: 'Días de datos', value: String(dailyHistory.length), color: '#38bdf8' },
                  { label: 'Track líder total', value: topTrack?.[0] || '—', sub: topTrack ? formatNumber(topTrack[1]) + ' streams' : '', color: '#fbbf24' },
                ].map((card, i) => (
                  <div key={i} style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(51,65,85,0.5)' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.4rem 0' }}>{card.label}</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
                    {card.sub && <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0.2rem 0 0 0' }}>{card.sub}</p>}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Album total cumulative — día cerrado */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Acumulado Total del Álbum</h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 1.5rem 0' }}>
              {(() => {
                const last = dailyHistory[dailyHistory.length - 1];
                const lastLabel = last ? last.date.slice(5).replace('-', '/') : '—';
                return `Streams acumulados a día cerrado — desde lanzamiento de CEA (05/02) hasta ${lastLabel}`;
              })()}
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyHistory} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradAlbum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} interval={6} />
                <YAxis stroke="#64748b" tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '8px' }} formatter={(v) => [formatNumber(v), 'Acumulado']} labelFormatter={(l) => 'Día ' + l} />
                <ReferenceLine x="02/05" stroke="#f97316" strokeDasharray="4 2" label={{ value: 'CEA', fill: '#f97316', fontSize: 10, position: 'top' }} />
                <ReferenceLine x="02/26" stroke="#fbbf24" strokeDasharray="4 2" label={{ value: 'ATBLM', fill: '#fbbf24', fontSize: 10, position: 'top' }} />
                <ReferenceLine x="03/19" stroke="#4ade80" strokeDasharray="4 2" label={{ value: '🚀 ÁLBUM', fill: '#4ade80', fontSize: 10, position: 'top' }} />
                <Area type="monotone" dataKey="albumTotal" stroke="#f97316" fill="url(#gradAlbum)" strokeWidth={3} name="Acumulado" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Per-track cumulative — día cerrado */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Acumulado por Track</h2>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[['all', 'Todos'], ['zoom', 'Zoom tracks menores']].map(([val, label]) => (
                  <button key={val} onClick={() => setGrowthZoom(val)} style={{ padding: '0.35rem 0.85rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, background: growthZoom === val ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'rgba(51,65,85,0.6)', color: growthZoom === val ? '#fff' : '#94a3b8' }}>{label}</button>
                ))}
              </div>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0.2rem 0 1.25rem 0' }}>
              {growthZoom === 'zoom' ? 'Mostrando solo tracks del álbum (excluye CEA y ATBLM para ver escala real)' : 'Streams acumulados a día cerrado — todos los tracks'}
            </p>
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={dailyHistory} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} interval={6} />
                <YAxis stroke="#64748b" tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '8px' }} formatter={(v) => formatNumber(v)} labelFormatter={(l) => 'Día ' + l} />
                <Legend />
                {/* Markers de hitos — singles + álbum */}
                <ReferenceLine x="02/05" stroke="#f97316" strokeDasharray="4 3" strokeWidth={1.5}
                  label={{ value: 'CEA ▸', fill: '#f97316', fontSize: 10, position: 'insideTopLeft', offset: 4 }} />
                <ReferenceLine x="02/28" stroke="#fbbf24" strokeDasharray="4 3" strokeWidth={1.5}
                  label={{ value: 'ATBLM ▸', fill: '#fbbf24', fontSize: 10, position: 'insideTopLeft', offset: 4 }} />
                <ReferenceLine x="03/19" stroke="#4ade80" strokeDasharray="4 3" strokeWidth={1.5}
                  label={{ value: '🚀 Álbum', fill: '#4ade80', fontSize: 10, position: 'insideTopLeft', offset: 4 }} />
                {growthZoom === 'all' && <>
                  <Line type="monotone" dataKey="CEA" stroke="#f97316" strokeWidth={2} dot={false} name="CEA" isAnimationActive={false} />
                  <Line type="monotone" dataKey="ATBLM" stroke="#fbbf24" strokeWidth={2} dot={false} name="ATBLM" isAnimationActive={false} />
                </>}
                <Line type="monotone" dataKey="UN GUSTO" stroke="#4ade80" strokeWidth={growthZoom === 'zoom' ? 2 : 1.5} dot={false} name="UN GUSTO" isAnimationActive={false} />
                <Line type="monotone" dataKey="CALL ME" stroke="#38bdf8" strokeWidth={growthZoom === 'zoom' ? 2 : 1.5} dot={false} name="CALL ME" isAnimationActive={false} />
                <Line type="monotone" dataKey="MAN OF WORD" stroke="#a78bfa" strokeWidth={1.5} dot={false} name="MAN OF WORD" isAnimationActive={false} />
                <Line type="monotone" dataKey="OJOS TRISTES" stroke="#fb7185" strokeWidth={1.5} dot={false} name="OJOS TRISTES" isAnimationActive={false} />
                <Line type="monotone" dataKey="HIELO" stroke="#67e8f9" strokeWidth={1.5} dot={false} name="HIELO" isAnimationActive={false} />
                <Line type="monotone" dataKey="CHANGES" stroke="#d946ef" strokeWidth={1.5} dot={false} name="CHANGES" isAnimationActive={false} />
                <Line type="monotone" dataKey="ALQUILER" stroke="#fdba74" strokeWidth={1.5} dot={false} name="ALQUILER" isAnimationActive={false} />
                <Line type="monotone" dataKey="YA NO" stroke="#86efac" strokeWidth={1.5} dot={false} name="YA NO" isAnimationActive={false} />
                <Line type="monotone" dataKey="HAZLO CALLAO" stroke="#c4b5fd" strokeWidth={1.5} dot={false} name="HAZLO CALLAO" isAnimationActive={false} />
                <Line type="monotone" dataKey="TOP TIER" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="TOP TIER" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla histórica día a día */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ color: '#f97316', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Histórico por Día — Acumulado</h2>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[['day', 'Por día'], ['month', 'Por mes']].map(([val, label]) => (
                  <button key={val} onClick={() => setHistGrouping(val)} style={{ padding: '0.25rem 0.7rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, background: histGrouping === val ? '#f97316' : 'rgba(51,65,85,0.5)', color: histGrouping === val ? '#0f172a' : '#94a3b8' }}>{label}</button>
                ))}
              </div>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0 0 1rem 0' }}>{histGrouping === 'day' ? 'Hacé clic en + para ver el desglose por track del día' : 'Streams totales y promedio diario agrupados por mes'}</p>
            {/* Vista mensual */}
            {histGrouping === 'month' && (() => {
              const byMonth = {};
              [...dailyHistory].forEach((snap, i, arr) => {
                const month = snap.date.slice(0, 7); // '2026-02'
                const prev = arr[i - 1];
                const dayStreams = prev ? snap.albumTotal - prev.albumTotal : snap.albumTotal;
                if (!byMonth[month]) byMonth[month] = { month, streams: 0, days: 0, acumEnd: 0, trackKeys: Object.keys(snap).filter(k => !['date','label','albumTotal','dayNum'].includes(k)) };
                byMonth[month].streams += dayStreams;
                byMonth[month].days += 1;
                byMonth[month].acumEnd = snap.albumTotal;
              });
              const months = Object.values(byMonth);
              const monthNames = { '2026-02': 'Febrero 2026', '2026-03': 'Marzo 2026', '2026-04': 'Abril 2026' };
              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(51,65,85,0.8)' }}>
                        {['Mes', 'Días', 'Streams del mes', 'Prom. diario', 'Acum. al cierre'].map(h => (
                          <th key={h} style={{ textAlign: h === 'Mes' ? 'left' : 'right', padding: '0.6rem 0.75rem', color: '#94a3b8' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {months.map(m => (
                        <tr key={m.month} style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                          <td style={{ padding: '0.6rem 0.75rem', color: '#f1f5f9', fontWeight: 600 }}>{monthNames[m.month] || m.month}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', color: '#64748b' }}>{m.days}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', color: '#4ade80', fontWeight: 700 }}>{formatNumber(m.streams)}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', color: '#94a3b8' }}>{formatNumber(Math.round(m.streams / m.days))}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', color: '#f97316', fontWeight: 700 }}>{formatNumber(m.acumEnd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Vista diaria */}
            {histGrouping === 'day' && <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(51,65,85,0.8)' }}>
                    {['', 'Fecha', 'Acumulado', 'Streams del día', '% var', 'Top Track'].map(h => (
                      <th key={h} style={{ textAlign: h === '' || h === 'Fecha' || h === 'Top Track' ? 'left' : 'right', padding: '0.6rem 0.75rem', color: '#94a3b8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...dailyHistory].reverse().map((snap, i, arr) => {
                    const prev = arr[i + 1];
                    const prev2 = arr[i + 2];
                    const dayStreams = prev ? snap.albumTotal - prev.albumTotal : snap.albumTotal;
                    const prevDayStreams = prev && prev2 ? prev.albumTotal - prev2.albumTotal : null;
                    const trackKeys = Object.keys(snap).filter(k => !['date','label','albumTotal'].includes(k));
                    const trackDay = trackKeys.map(k => ({ k, v: prev ? (snap[k] || 0) - (prev[k] || 0) : (snap[k] || 0) })).sort((a, b) => b.v - a.v);
                    const topTrack = trackDay[0];
                    const isExpanded = expandedDays.has(snap.date);
                    const isLaunch = snap.date === '2026-03-19';
                    return (
                      <>
                        <tr key={snap.date} style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(51,65,85,0.3)', background: isLaunch ? 'rgba(249,115,22,0.06)' : 'transparent', cursor: 'pointer' }} onClick={() => toggleDay(snap.date)}>
                          <td style={{ padding: '0.6rem 0.75rem', width: '28px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '4px', background: isExpanded ? 'rgba(249,115,22,0.25)' : 'rgba(51,65,85,0.6)', color: isExpanded ? '#f97316' : '#64748b', fontSize: '0.75rem', fontWeight: 700, lineHeight: 1 }}>
                              {isExpanded ? '−' : '+'}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', color: isLaunch ? '#f97316' : '#f1f5f9', fontWeight: isLaunch ? 700 : 400 }}>
                            {snap.dayNum
                              ? <>Día {snap.dayNum} <span style={{ color: '#64748b', fontWeight: 400 }}>({snap.label})</span>{isLaunch ? ' 🚀' : ''}</>
                              : snap.label}
                          </td>
                          <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', color: '#f97316', fontWeight: 700 }}>{formatNumber(snap.albumTotal)}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', color: '#4ade80' }}>+{formatNumber(dayStreams)}</td>
                          <td style={{ textAlign: 'right', padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.78rem', color: prevDayStreams ? (dayStreams >= prevDayStreams ? '#4ade80' : '#f87171') : '#64748b' }}>
                            {prevDayStreams
                              ? (dayStreams >= prevDayStreams ? '+' : '') + ((dayStreams - prevDayStreams) / prevDayStreams * 100).toFixed(1) + '%'
                              : '—'}
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', color: '#fbbf24' }}>{topTrack ? topTrack.k + ' (+' + formatNumber(topTrack.v) + ')' : '—'}</td>
                        </tr>
                        {isExpanded && (
                          <tr key={snap.date + '-detail'} style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                            <td colSpan={6} style={{ padding: '0 0.75rem 0.75rem 2.5rem', background: 'rgba(15,23,42,0.4)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.4rem', paddingTop: '0.6rem' }}>
                                {(() => {
                                  const dayTotal = trackDay.reduce((sum, t) => sum + Math.max(t.v, 0), 0);
                                  return trackDay.map(({ k, v }) => (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: '6px', background: 'rgba(30,41,59,0.5)' }}>
                                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{k}</span>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ color: v > 0 ? '#4ade80' : '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>{v > 0 ? '+' + formatNumber(v) : '—'}</span>
                                        {v > 0 && dayTotal > 0 && (
                                          <span style={{ color: '#64748b', fontSize: '0.7rem', background: 'rgba(100,116,139,0.15)', borderRadius: '4px', padding: '0 0.3rem' }}>
                                            {(v / dayTotal * 100).toFixed(1)}%
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>}
          </div>

          {/* Insights de Crecimiento */}
          <div style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(30,41,59,0.6))', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(56,189,248,0.2)', marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#38bdf8', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Insights de Crecimiento</h2>
            {(() => {
              const preAlbumSnaps = dailyHistory.filter(d => d.date < '2026-03-19');
              const postAlbumSnaps = dailyHistory.filter(d => d.date >= '2026-03-19');
              const preAvgDaily = preAlbumSnaps.length > 1
                ? Math.round(preAlbumSnaps.reduce((s, d, i, arr) => i === 0 ? s : s + (d.albumTotal - arr[i - 1].albumTotal), 0) / (preAlbumSnaps.length - 1))
                : 0;
              const d19 = dailyHistory.find(d => d.date === '2026-03-19');
              const d20 = dailyHistory.find(d => d.date === '2026-03-20');
              const d21 = dailyHistory.find(d => d.date === '2026-03-21');
              const d20Streams = d20 && d19 ? d20.albumTotal - d19.albumTotal : 0;
              const d21Streams = d21 && d20 ? d21.albumTotal - d20.albumTotal : 0;
              const launchMultiplier = preAvgDaily > 0 ? (d20Streams / preAvgDaily).toFixed(1) : null;
              // Spike detection: day with >1.5x prev day streams (only post-release)
              const spikes = [...dailyHistory].reduce((acc, snap, i, arr) => {
                if (i < 2) return acc;
                const today = snap.albumTotal - arr[i - 1].albumTotal;
                const yesterday = arr[i - 1].albumTotal - arr[i - 2].albumTotal;
                if (yesterday > 0 && today / yesterday >= 1.5) acc.push({ label: snap.label, ratio: (today / yesterday).toFixed(1), streams: today });
                return acc;
              }, []);
              const last = dailyHistory[dailyHistory.length - 1];
              const overallAvg = last ? Math.round(last.albumTotal / dailyHistory.length) : 0;
              const decay21vs20 = d20Streams > 0 ? ((d21Streams / d20Streams - 1) * 100).toFixed(1) : null;
              const insights = [
                launchMultiplier ? { dot: '#38bdf8', text: `Antes del álbum, el catálogo promedió ${formatNumber(preAvgDaily)} streams/día (CEA + ATBLM). El lanzamiento multiplicó ese volumen por ${launchMultiplier}x en el primer día completo (D20: ${formatNumber(d20Streams)}).` } : null,
                decay21vs20 ? { dot: parseFloat(decay21vs20) > -60 ? '#fbbf24' : '#f87171', text: `D20 → D21: el álbum pasó de ${formatNumber(d20Streams)} a ${formatNumber(d21Streams)} streams diarios (${parseFloat(decay21vs20) >= 0 ? '+' : ''}${decay21vs20}%). ${parseFloat(decay21vs20) > -50 ? 'Retención saludable para el segundo día.' : 'Caída pronunciada — patrón normal en lanzamientos nuevos.'}` } : null,
                spikes.length > 0 ? { dot: '#4ade80', text: `Spike${spikes.length > 1 ? 's' : ''} detectado${spikes.length > 1 ? 's' : ''} (>1.5× el día anterior): ${spikes.slice(0, 3).map(s => `${s.label} (×${s.ratio}, +${formatNumber(s.streams)})`).join(' · ')}. Pueden indicar playlist adds, notas de prensa o impacto viral.` } : { dot: '#64748b', text: 'No se detectaron spikes de crecimiento aún — se necesitan más días de datos para detectar anomalías post-lanzamiento.' },
                { dot: '#a78bfa', text: `El álbum acumula ${formatNumber(last?.albumTotal || 0)} streams en ${dailyHistory.length} días de datos. Promedio diario general: ${formatNumber(overallAvg)} streams/día. A medida que se agreguen días post-lanzamiento, se podrá trazar la curva de deceleración real.` },
              ].filter(Boolean);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ins.dot, flexShrink: 0, marginTop: '6px', boxShadow: `0 0 6px ${ins.dot}88` }} />
                      <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{ins.text}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Snapshots en tiempo real (scraper 8h) */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Snapshots en Tiempo Real</h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 1rem 0' }}>Capturados automáticamente cada 8 horas por el scraper de Spotify</p>
            {growthHistory.length < 2 && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                Primer snapshot capturado — las comparativas aparecerán a partir del segundo snapshot (~8h).
              </div>
            )}
            {growthHistory.length >= 2 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(51,65,85,0.8)' }}>
                      {['Timestamp', 'Album Total', 'Delta 8h', 'Top Track'].map(h => (
                        <th key={h} style={{ textAlign: h === 'Timestamp' || h === 'Top Track' ? 'left' : 'right', padding: '0.75rem', color: '#94a3b8' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...growthHistory].reverse().map((snap, i, arr) => {
                      const prev = arr[i + 1];
                      const delta = prev ? snap.albumTotal - prev.albumTotal : null;
                      const topTrack = Object.entries(snap).filter(([k]) => k !== 'timestamp' && k !== 'albumTotal').sort((a, b) => b[1] - a[1])[0];
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                          <td style={{ padding: '0.75rem', color: '#f1f5f9' }}>{snap.timestamp}</td>
                          <td style={{ textAlign: 'right', padding: '0.75rem', color: '#f97316', fontWeight: 700 }}>{formatNumber(snap.albumTotal)}</td>
                          <td style={{ textAlign: 'right', padding: '0.75rem', color: delta !== null ? '#4ade80' : '#64748b', fontWeight: 600 }}>{delta !== null ? '+' + formatNumber(delta) : '—'}</td>
                          <td style={{ padding: '0.75rem', color: '#fbbf24' }}>{topTrack ? topTrack[0] + ' (' + formatNumber(topTrack[1]) + ')' : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === MÉTRICAS S4A TAB === */}
      {activeTab === 'metrics' && (
        <div>
          {/* Album-level summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Album Live Total', value: formatNumber(albumLiveTotal), color: '#f97316' },
              { label: 'Streams 28d', value: formatNumber(Object.values(trackMetrics).reduce((s, t) => s + t.streams28d, 0)), color: '#fbbf24' },
              { label: 'Listeners 28d', value: formatNumber(Object.values(trackMetrics).reduce((s, t) => s + t.listeners, 0)), color: '#38bdf8' },
              { label: 'Saves 28d', value: formatNumber(Object.values(trackMetrics).reduce((s, t) => s + t.saves, 0)), color: '#4ade80' },
              { label: 'Playlist Adds 28d', value: formatNumber(Object.values(trackMetrics).reduce((s, t) => s + t.playlistAdds, 0)), color: '#a78bfa' },
            ].map((card, i) => (
              <div key={i} style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(51,65,85,0.5)' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.4rem 0' }}>{card.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Per-track metrics table */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Métricas por Track (28 días: Feb 22 - Mar 21)</h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Datos scrapeados directamente de cada página de track en Spotify for Artists</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(51,65,85,0.8)' }}>
                    {['Track', 'Live Total', 'Streams 28d', 'Listeners', 'Str/Listener', 'Playlist Adds', 'Saves'].map((h) => (
                      <th key={h} style={{ textAlign: h === 'Track' ? 'left' : 'right', padding: '0.75rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(trackMetrics).sort((a, b) => b[1].streams28d - a[1].streams28d).map(([name, m]) => (
                    <tr key={name} style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                      <td style={{ padding: '0.75rem', color: '#f1f5f9', fontWeight: 500, maxWidth: '200px' }}>{name}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem', color: '#f97316', fontWeight: 700 }}>{formatNumber(liveTotals[name])}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>{formatNumber(m.streams28d)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem', color: '#38bdf8' }}>{formatNumber(m.listeners)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem', color: '#cbd5e1' }}>{m.streamsPerListener.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem', color: '#a78bfa' }}>{formatNumber(m.playlistAdds)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem', color: '#4ade80' }}>{formatNumber(m.saves)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save Rate Analysis */}
          <div style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.08), rgba(30,41,59,0.6))', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(251,146,60,0.2)' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Insights de Engagement</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(() => {
                const topSaves = Object.entries(trackMetrics).sort((a, b) => b[1].saves - a[1].saves)[0];
                const topSPL = Object.entries(trackMetrics).sort((a, b) => b[1].streamsPerListener - a[1].streamsPerListener)[0];
                const topPL = Object.entries(trackMetrics).sort((a, b) => b[1].playlistAdds - a[1].playlistAdds)[0];
                const totalSaves = Object.values(trackMetrics).reduce((s, t) => s + t.saves, 0);
                const totalStreams28 = Object.values(trackMetrics).reduce((s, t) => s + t.streams28d, 0);
                const totalPlAdds = Object.values(trackMetrics).reduce((s, t) => s + t.playlistAdds, 0);
                const saveRate = (totalSaves / totalStreams28 * 100).toFixed(2);
                const topSaveRateEntry = Object.entries(trackMetrics).sort((a, b) => (b[1].saves / b[1].streams28d) - (a[1].saves / a[1].streams28d))[0];
                const prevTrack = Object.entries(trackMetrics).find(([, m]) => m.prevPeriod !== null);
                const insights = [
                  { dot: '#4ade80', text: `${topSaves[0]} lidera en saves con ${formatNumber(topSaves[1].saves)} — la mayor intención de playlist y retención a largo plazo del álbum.` },
                  { dot: '#4ade80', text: `${topSPL[0]} tiene el mayor ratio streams/listener (${topSPL[1].streamsPerListener.toFixed(2)}x) — señal fuerte de replay value y conexión emocional con la audiencia.` },
                  { dot: '#a78bfa', text: `${topPL[0]} acumula la mayor cantidad de playlist adds (${formatNumber(topPL[1].playlistAdds)} de ${formatNumber(totalPlAdds)} totales) — clave para el crecimiento orgánico. Alta tracción editorial.` },
                  { dot: parseFloat(saveRate) >= 10 ? '#4ade80' : '#fbbf24', text: `Save rate total del álbum: ${saveRate}% (${formatNumber(totalSaves)} saves / ${formatNumber(totalStreams28)} streams en 28d). ${parseFloat(saveRate) >= 10 ? 'Tasa muy alta — audiencia altamente comprometida.' : 'Tasa saludable para un álbum nuevo.'}` },
                  { dot: '#38bdf8', text: `Mayor save rate individual: ${topSaveRateEntry[0]} con ${(topSaveRateEntry[1].saves / topSaveRateEntry[1].streams28d * 100).toFixed(1)}% — por cada 100 streams, ${Math.round(topSaveRateEntry[1].saves / topSaveRateEntry[1].streams28d * 100)} personas guardaron el track.` },
                  prevTrack ? { dot: parseFloat(prevTrack[1].change) >= 0 ? '#4ade80' : '#f87171', text: `${prevTrack[0]} ${parseFloat(prevTrack[1].change) >= 0 ? 'creció' : 'cayó'} un ${Math.abs(prevTrack[1].change)}% vs. el período anterior (${formatNumber(prevTrack[1].prevPeriod)} → ${formatNumber(prevTrack[1].streams28d)} streams) — único track con comparativa histórica disponible.` } : null,
                ].filter(Boolean);
                return insights.map((ins, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ins.dot, flexShrink: 0, marginTop: '6px', boxShadow: `0 0 6px ${ins.dot}88` }} />
                    <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{ins.text}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* === SINGLES TAB === */}
      {activeTab === 'singles' && (
        <div>
          {/* Timeline chart */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Evolución de Singles Pre-lanzamiento</h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Streams diarios desde su lanzamiento hasta el efecto álbum</p>
            <ResponsiveContainer width="100%" height={380}>
              <AreaChart data={metrics.timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradCEA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradATBLM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '8px' }} formatter={(v) => formatNumber(v)} />
                <Legend />
                <ReferenceLine x="19 mar" stroke="rgba(251,146,60,0.6)" strokeDasharray="5 5" label={{ value: 'ALBUM DROP', position: 'top', fill: '#f97316', fontSize: 11, fontWeight: 700 }} />
                <Area type="monotone" dataKey="CUANDO ESCRIBÍA ASIMETRÍA" stroke="#f97316" fill="url(#gradCEA)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="ATBLM" stroke="#fbbf24" fill="url(#gradATBLM)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Singles detail cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {Object.entries(metrics.singlesAnalysis).map(([name, stats]) => (
              <div key={name} style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)' }}>
                <h3 style={{ color: '#fbbf24', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Promedio pre-álbum', value: formatNumber(stats.preAlbumAvg), color: '#cbd5e1' },
                    { label: 'Peak pre-álbum', value: formatNumber(stats.preAlbumPeak), color: '#cbd5e1' },
                    { label: 'Decay desde peak', value: stats.decayFromPeak + '%', color: '#f87171' },
                    { label: 'Streams Día 20 (album)', value: formatNumber(stats.day20), color: '#f97316' },
                    { label: 'Streams Día 21', value: formatNumber(stats.day21), color: '#fbbf24' },
                    { label: 'Album Bump Multiplier', value: stats.multiplier + 'x', color: '#4ade80', big: true },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{row.label}</span>
                      <span style={{ color: row.color, fontWeight: row.big ? 800 : 600, fontSize: row.big ? '1.25rem' : '0.95rem' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Singles Insights */}
          <div style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(30,41,59,0.6))', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(251,191,36,0.2)' }}>
            <h2 style={{ color: '#fbbf24', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Insights de Singles</h2>
            {(() => {
              const cea = metrics.singlesAnalysis['CUANDO ESCRIBÍA ASIMETRÍA'];
              const atblm = metrics.singlesAnalysis['ATBLM'];
              const avgMultiplier = ((parseFloat(cea.multiplier) + parseFloat(atblm.multiplier)) / 2).toFixed(2);
              const ceaD21Ratio = (cea.day21 / cea.preAlbumAvg).toFixed(1);
              const atblmD21Ratio = (atblm.day21 / atblm.preAlbumAvg).toFixed(1);
              const ceaDaysOld = Math.round((new Date('2026-03-21') - new Date('2026-02-06')) / 86400000);
              const atblmDaysOld = Math.round((new Date('2026-03-21') - new Date('2026-02-27')) / 86400000);
              const biggerBoost = parseFloat(atblm.multiplier) >= parseFloat(cea.multiplier) ? 'ATBLM' : 'CEA';
              const insights = [
                { dot: '#4ade80', text: `Album Bump promedio: ${avgMultiplier}x — el lanzamiento del álbum multiplicó los streams diarios de los singles por ${avgMultiplier} vs. su baseline pre-lanzamiento.` },
                { dot: '#fbbf24', text: `${biggerBoost} recibió el mayor boost (${biggerBoost === 'ATBLM' ? atblm.multiplier : cea.multiplier}x vs ${biggerBoost === 'ATBLM' ? cea.multiplier : atblm.multiplier}x), probablemente por ser el track más reciente al momento del lanzamiento — menos decay acumulado en el algoritmo.` },
                { dot: parseFloat(ceaD21Ratio) > 1 ? '#4ade80' : '#fbbf24', text: `En D21, CEA mantiene ${ceaD21Ratio}x su promedio pre-álbum (${formatNumber(cea.day21)} streams vs baseline ${formatNumber(cea.preAlbumAvg)}/día). Lleva ${ceaDaysOld} días desde su lanzamiento.` },
                { dot: parseFloat(atblmD21Ratio) > 1 ? '#4ade80' : '#fbbf24', text: `ATBLM mantiene ${atblmD21Ratio}x su baseline en D21 (${formatNumber(atblm.day21)} vs ${formatNumber(atblm.preAlbumAvg)}/día baseline). Lleva ${atblmDaysOld} días desde su lanzamiento.` },
                { dot: '#38bdf8', text: `Ambos singles siguen por encima de su baseline pre-álbum en D21 — el efecto álbum sigue activo. La proyección en Decay Intel muestra cuándo cada track vuelve a niveles de baseline.` },
              ];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ins.dot, flexShrink: 0, marginTop: '6px', boxShadow: `0 0 6px ${ins.dot}88` }} />
                      <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{ins.text}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* === DECAY INTEL TAB === */}
      {activeTab === 'decay' && (
        <div>

          {/* Curva de Velocidad de Decay por track — multi-día */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
            {(() => {
              const postAlbum = dailyLog.filter(e => e.date >= '2026-03-20');
              // Datos: una entrada por transición de día (D20→D21, D21→D22, …)
              const decayCurveData = postAlbum.slice(1).map((curr, i) => {
                const prev = postAlbum[i];
                const point = { label: `${prev.label}→${curr.label}` };
                metrics.trackAnalysis.forEach(t => {
                  const prevVal = prev.tracks[t.name] ?? 0;
                  const currVal = curr.tracks[t.name] ?? 0;
                  point[t.name] = prevVal > 0 ? parseFloat(((currVal - prevVal) / prevVal * 100).toFixed(1)) : null;
                });
                return point;
              });
              const trackColors = ['#4ade80','#38bdf8','#a78bfa','#fb7185','#67e8f9','#d946ef','#fdba74','#86efac','#c4b5fd','#94a3b8','#fbbf24','#f97316'];
              const trackList = metrics.trackAnalysis.map((t, i) => ({ name: t.name, color: trackColors[i % trackColors.length] }));
              // Valor de referencia: promedio de todos los tracks en el primer salto
              const firstPoint = decayCurveData[0];
              const refLine = firstPoint
                ? parseFloat((trackList.reduce((s, t) => s + (firstPoint[t.name] ?? 0), 0) / trackList.length).toFixed(1))
                : null;
              const lastTransition = decayCurveData[decayCurveData.length - 1];
              const lastRange = lastTransition ? `${lastTransition.label.split('→')[0]} → ${lastTransition.label.split('→')[1]}` : '';
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Curva de Decay por Track</h2>
                    {decayCurveData.length > 0 && (
                      <span style={{ fontSize: '0.7rem', color: '#475569', background: 'rgba(15,23,42,0.5)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(51,65,85,0.4)' }}>
                        {decayCurveData.length} transición{decayCurveData.length !== 1 ? 'es' : ''} · último: {lastRange}
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0 0 1.25rem' }}>
                    % de variación de streams entre días consecutivos por track. Una curva que sube hacia 0 indica que el decay se está frenando.
                  </p>
                  {decayCurveData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: '#475569', fontSize: '0.85rem' }}>Faltan al menos 2 días de datos para trazar la curva.</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={340}>
                        <LineChart data={decayCurveData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" />
                          <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 12 }} />
                          <YAxis
                            stroke="#64748b"
                            tick={{ fontSize: 11 }}
                            tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
                            domain={['auto', 5]}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '10px', fontSize: '0.75rem' }}
                            formatter={(v, name) => [
                              v != null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '—',
                              name,
                            ]}
                            itemSorter={(item) => -(item.value ?? -999)}
                          />
                          {/* Línea cero */}
                          <ReferenceLine y={0} stroke="rgba(148,163,184,0.3)" strokeWidth={1} label={{ value: '0%', fill: '#475569', fontSize: 9, position: 'insideLeft' }} />
                          {/* Promedio del primer salto como referencia */}
                          {refLine !== null && (
                            <ReferenceLine y={refLine} stroke="rgba(249,115,22,0.25)" strokeDasharray="5 3"
                              label={{ value: `prom. álbum D20→D21 (${refLine > 0 ? '+' : ''}${refLine}%)`, fill: '#f97316', fontSize: 9, position: 'insideRight' }} />
                          )}
                          <Legend wrapperStyle={{ fontSize: '0.68rem', paddingTop: '0.5rem' }} />
                          {trackList.map(t => (
                            <Line
                              key={t.name}
                              type="monotone"
                              dataKey={t.name}
                              stroke={t.color}
                              strokeWidth={2}
                              dot={{ r: 4, fill: t.color, stroke: '#0f172a', strokeWidth: 1.5 }}
                              activeDot={{ r: 6 }}
                              connectNulls
                              isAnimationActive={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                      {/* Tabla resumen: última transición por track */}
                      {decayCurveData.length >= 1 && (() => {
                        const latest = decayCurveData[decayCurveData.length - 1];
                        const rows = trackList
                          .map(t => ({ ...t, val: latest[t.name] }))
                          .filter(t => t.val != null)
                          .sort((a, b) => b.val - a.val);
                        return (
                          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'center' }}>
                            {rows.map(t => {
                              const c = t.val >= 0 ? '#4ade80' : t.val > -30 ? '#fbbf24' : t.val > -50 ? '#fb923c' : '#f87171';
                              return (
                                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(15,23,42,0.5)', padding: '0.2rem 0.55rem', borderRadius: '9999px', border: `1px solid ${c}33` }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.color }} />
                                  <span style={{ color: '#94a3b8', fontSize: '0.66rem' }}>{t.name.split(' ')[0]}</span>
                                  <span style={{ color: c, fontSize: '0.7rem', fontWeight: 700 }}>{t.val > 0 ? '+' : ''}{t.val.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </>
              );
            })()}
          </div>

          {/* Diagnóstico de Decay */}
          <div style={{ background: 'linear-gradient(135deg, rgba(248,113,113,0.08), rgba(30,41,59,0.6))', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(248,113,113,0.2)', marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#f87171', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Diagnóstico de Decay</h2>
            {(() => {
              // Rebuild reference ratio inline
              const ceaStr = streamData['CUANDO ESCRIBÍA ASIMETRÍA'].streams;
              const ceaDts = Object.keys(ceaStr).filter(d => d >= '2026-02-06' && d <= '2026-03-18').sort();
              const ceaD1v = ceaStr['2026-02-06'];
              const ceaN = ceaDts.map(d => ceaStr[d] / ceaD1v);
              const atStr = streamData['ATBLM'].streams;
              const atDts = Object.keys(atStr).filter(d => d >= '2026-02-27' && d <= '2026-03-18').sort();
              const atD1v = atStr['2026-02-27'];
              const atN = atDts.map(d => atStr[d] / atD1v);
              const refRatio = (ceaN[1] + atN[1]) / 2; // D2/D1 ratio from reference curve
              const expectedDecayPct = ((1 - refRatio) * 100).toFixed(0);
              const tracksWithDecay = metrics.trackAnalysis.filter(t => t.decayD20toD21 !== 'N/A');
              const growing = tracksWithDecay.filter(t => parseFloat(t.decayD20toD21) > 5);
              const inline = tracksWithDecay.filter(t => { const v = parseFloat(t.decayD20toD21); return v <= 5 && v >= -(parseFloat(expectedDecayPct) + 10); });
              const faster = tracksWithDecay.filter(t => parseFloat(t.decayD20toD21) < -(parseFloat(expectedDecayPct) + 10));
              // Estimate days to cross 500 streams/day using daily decay ≈ refRatio per day
              const approxDailyDecay = refRatio; // multiplicative factor per day
              const crossings = metrics.trackAnalysis
                .filter(t => t.day21 > 500)
                .map(t => {
                  const days = Math.ceil(Math.log(500 / t.day21) / Math.log(approxDailyDecay));
                  return { name: t.name, daysFromD21: Math.max(1, days) };
                })
                .sort((a, b) => a.daysFromD21 - b.daysFromD21);
              const insights = [
                { dot: '#38bdf8', text: `Decay de referencia D20→D21 (curva CEA+ATBLM): ~${expectedDecayPct}% de caída esperada. Los tracks dentro de ±10% de ese rango tienen un comportamiento normal.` },
                growing.length > 0 ? { dot: '#4ade80', text: `Tracks por encima de la referencia (creciendo o decay < ${Math.round(parseFloat(expectedDecayPct) - 10)}%): ${growing.map(t => `${t.name} (${parseFloat(t.decayD20toD21) >= 0 ? '+' : ''}${t.decayD20toD21}%)`).join(', ')} — posible impulso de social media o playlisting.` } : null,
                inline.length > 0 ? { dot: '#fbbf24', text: `Tracks dentro del rango esperado: ${inline.map(t => t.name).join(', ')} — comportamiento de decay normal para un lanzamiento nuevo.` } : null,
                faster.length > 0 ? { dot: '#f87171', text: `Tracks con decay por encima de lo esperado (>${parseInt(expectedDecayPct) + 10}%): ${faster.map(t => `${t.name} (${t.decayD20toD21}%)`).join(', ')} — candidatos para push en social o pitching a playlists.` } : null,
                crossings.length > 0 ? { dot: '#94a3b8', text: `Proyección de cruce a 500 streams/día (umbral "frío"): ${crossings.slice(0, 4).map(t => `${t.name} en ~${t.daysFromD21}d`).join(' · ')}. Los que cruzan más lento son los más saludables.` } : null,
              ].filter(Boolean);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ins.dot, flexShrink: 0, marginTop: '6px', boxShadow: `0 0 6px ${ins.dot}88` }} />
                      <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{ins.text}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Proyección con curva de referencia CEA + ATBLM */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Proyección 28 Días — Día 1 al Día 28</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontSize: '0.65rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>Curva ref: CEA + ATBLM</span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {[['chart', '▲ Absoluto'], ['norm', '% Retención'], ['table', '≡ Tabla']].map(([val, label]) => (
                    <button key={val} onClick={() => setDecayView(val)} style={{ padding: '0.25rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, background: decayView === val ? '#f97316' : 'rgba(51,65,85,0.5)', color: decayView === val ? '#0f172a' : '#94a3b8' }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0 0 1.25rem' }}>
              Proyección basada en el decay histórico de los dos singles de Zeballos (mismo fanbase). El <strong style={{ color: '#94a3b8' }}>factor de ajuste</strong> por track corrige en base al D21 real. La línea punteada marca el inicio de la proyección.
            </p>
            {(() => {
              // === Construir curva de referencia normalizada ===
              // Día 1 del álbum = D20 = primer día completo (Mar 20)
              // Referencia: CEA (41 días limpios) + ATBLM (20 días limpios), ambos pre-álbum

              const ceaStreams = streamData['CUANDO ESCRIBÍA ASIMETRÍA'].streams;
              const ceaDates = Object.keys(ceaStreams).filter(d => d >= '2026-02-06' && d <= '2026-03-18').sort();
              const ceaD1 = ceaStreams['2026-02-06'];
              const ceaNorm = ceaDates.map(d => ceaStreams[d] / ceaD1); // 41 valores

              const atblmStreams = streamData['ATBLM'].streams;
              const atblmDates = Object.keys(atblmStreams).filter(d => d >= '2026-02-27' && d <= '2026-03-18').sort();
              const atblmD1 = atblmStreams['2026-02-27'];
              const atblmNorm = atblmDates.map(d => atblmStreams[d] / atblmD1); // 20 valores

              // Días 1-20: promedio CEA + ATBLM
              // Días 21-28: solo CEA (ATBLM no tiene más datos pre-álbum)
              const TOTAL_DAYS = 28;
              const sharedLen = Math.min(ceaNorm.length, atblmNorm.length); // 20
              const refCurve = Array.from({ length: TOTAL_DAYS }, (_, i) => {
                if (i < sharedLen) return (ceaNorm[i] + atblmNorm[i]) / 2; // promedio días 1-20
                if (i < ceaNorm.length) return ceaNorm[i];                  // solo CEA días 21-28
                return ceaNorm[ceaNorm.length - 1] * Math.pow(0.97, i - ceaNorm.length + 1); // extrapolación suave
              });
              // refCurve[0] = 1.0 → Día 1 (D20)  |  refCurve[1] ≈ 0.54 → Día 2 (D21)

              // === Tracks y proyecciones ===
              const tracks = metrics.trackAnalysis.filter(t => t.day20 > 0 && t.day21 > 0).sort((a, b) => b.day21 - a.day21);
              const trackColors = ['#4ade80','#38bdf8','#a78bfa','#fb7185','#67e8f9','#d946ef','#fdba74','#86efac','#c4b5fd','#94a3b8'];

              // REAL_DAYS: días completos desde D20 con data real en dailyLog (auto-incrementa)
              const d20Idx = dailyLog.findIndex(e => e.date === '2026-03-20');
              const REAL_DAYS = d20Idx >= 0 ? dailyLog.length - d20Idx : 2;

              const trackData = tracks.map((t, idx) => {
                const factor = t.day21 / (t.day20 * refCurve[1]);
                const projected = Array.from({ length: TOTAL_DAYS - REAL_DAYS }, (_, i) => {
                  return Math.max(Math.round(t.day20 * refCurve[i + REAL_DAYS] * factor), 0);
                });
                return { ...t, factor, projected, color: trackColors[idx % trackColors.length] };
              });

              // Datos del gráfico: días 1 a 28
              // Para días reales, lee directamente de dailyLog; para proyectados, usa el modelo
              const chartData = Array.from({ length: TOTAL_DAYS }, (_, i) => {
                const albumDay = i + 1;
                const row = { day: `Día ${albumDay}`, isReal: albumDay <= REAL_DAYS };
                trackData.forEach(t => {
                  if (albumDay <= REAL_DAYS) {
                    const entry = dailyLog[d20Idx + albumDay - 1];
                    row[t.name] = entry?.tracks[t.name] ?? (albumDay === 1 ? t.day20 : t.day21);
                  } else {
                    row[t.name] = t.projected[albumDay - 1 - REAL_DAYS];
                  }
                });
                return row;
              });

              // === Datos normalizados (% retención relativa a D20 = 100%) ===
              const normChartData = chartData.map((row) => {
                const normRow = { day: row.day, isReal: row.isReal };
                trackData.forEach(t => {
                  const base = chartData[0][t.name] || 1;
                  normRow[t.name] = row[t.name] != null ? parseFloat((row[t.name] / base * 100).toFixed(1)) : null;
                });
                return normRow;
              });

              // === Velocidad de Decay — métricas reales del dailyLog ===
              const postAlbumEntries = dailyLog.filter(e => e.date >= '2026-03-20');
              const albumDayTotals = postAlbumEntries.map(e => ({
                label: e.label,
                total: Object.values(e.tracks).reduce((s, v) => s + v, 0),
              }));
              const decayRates = albumDayTotals.slice(1).map((curr, i) => {
                const prev = albumDayTotals[i];
                const pct = prev.total > 0 ? (curr.total - prev.total) / prev.total * 100 : null;
                return { label: `${prev.label}→${curr.label}`, pct };
              });
              const lastDecayRate = decayRates[decayRates.length - 1];
              const prevDecayRate = decayRates[decayRates.length - 2];
              const isDecelerating = lastDecayRate && prevDecayRate
                ? Math.abs(lastDecayRate.pct) < Math.abs(prevDecayRate.pct)
                : null;
              // Per-track retention: last real day vs D20
              const d20LogEntry = dailyLog.find(e => e.date === '2026-03-20');
              const lastRealEntry = postAlbumEntries[postAlbumEntries.length - 1];
              const trackRetentions = d20LogEntry && lastRealEntry
                ? trackData.map(t => ({
                    name: t.name, color: t.color,
                    retention: d20LogEntry.tracks[t.name] > 0
                      ? lastRealEntry.tracks[t.name] / d20LogEntry.tracks[t.name] * 100
                      : null,
                  })).filter(t => t.retention != null).sort((a, b) => b.retention - a.retention)
                : [];

              // === Confianza del Modelo ===
              // Para cada día del dailyLog posterior a D20, compara la proyección anterior vs el real.
              // D21: la proyección "a priori" (sin calibrar) usaba factor=1 → day20 × refCurve[1]
              // D22+: proyección calibrada con el factor de D21 → day20 × refCurve[idx] × factor
              const D20_DATE = '2026-03-20';
              const confidenceData = dailyLog
                .filter(e => e.date > D20_DATE)
                .map(entry => {
                  const albumDay = Math.round(
                    (new Date(entry.date) - new Date(D20_DATE)) / 86400000
                  ) + 1; // 1-indexed: D20=1, D21=2, D22=3…
                  let projTotal = 0;
                  trackData.forEach(t => {
                    const proj = albumDay === 2
                      ? t.day20 * refCurve[1]                         // D21: sin factor (sólo ref curve)
                      : t.day20 * refCurve[albumDay - 1] * t.factor;  // D22+: calibrado
                    projTotal += Math.max(proj, 0);
                  });
                  const actualTotal = Object.values(entry.tracks).reduce((s, v) => s + v, 0);
                  const biasPct = (actualTotal - projTotal) / projTotal * 100;
                  const errorPct = Math.abs(biasPct);
                  return { label: entry.label, note: entry.note, albumDay, actual: actualTotal, projected: Math.round(projTotal), biasPct, errorPct };
                });

              const avgError = confidenceData.length > 0
                ? confidenceData.reduce((s, p) => s + p.errorPct, 0) / confidenceData.length
                : null;
              const modelAccuracy = avgError !== null ? Math.max(0, 100 - avgError) : null;
              const accuracyColor = modelAccuracy === null ? '#64748b'
                : modelAccuracy >= 90 ? '#4ade80'
                : modelAccuracy >= 75 ? '#fbbf24'
                : '#f87171';

              return (
                <div>
                  {/* Totales proyectados a 28 días */}
                  {(() => {
                    const totals28 = trackData.map(t => {
                      const real = t.day20 + t.day21;
                      const proj = t.projected.reduce((s, v) => s + v, 0);
                      return { name: t.name, color: t.color, total: real + proj };
                    });
                    const albumTotal28 = totals28.reduce((s, t) => s + t.total, 0);
                    return (
                      <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(249,115,22,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total proyectado 28 días</span>
                          <span style={{ color: '#f97316', fontSize: '1.4rem', fontWeight: 800 }}>{formatNumber(albumTotal28)}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.3rem' }}>
                          {totals28.sort((a, b) => b.total - a.total).map(t => (
                            <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                                <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{t.name}</span>
                              </span>
                              <span style={{ color: '#e2e8f0', fontSize: '0.72rem', fontWeight: 600 }}>{formatNumber(t.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Confianza del Modelo */}
                  <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '10px', padding: '0.9rem 1.1rem', marginBottom: '1rem', border: `1px solid ${accuracyColor}33` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: confidenceData.length > 0 ? '0.75rem' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Precisión del Modelo</span>
                        <span style={{ color: '#475569', fontSize: '0.65rem' }}>— error sobre total diario del álbum</span>
                      </div>
                      {modelAccuracy !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: '80px', height: '5px', borderRadius: '3px', background: 'rgba(51,65,85,0.5)', overflow: 'hidden' }}>
                            <div style={{ width: `${modelAccuracy}%`, height: '100%', background: accuracyColor, borderRadius: '3px' }} />
                          </div>
                          <span style={{ color: accuracyColor, fontSize: '1rem', fontWeight: 800 }}>{modelAccuracy.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span style={{ color: '#475569', fontSize: '0.72rem' }}>Sin datos verificables aún</span>
                      )}
                    </div>
                    {confidenceData.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {confidenceData.map((p, i) => {
                          const errColor = p.errorPct < 8 ? '#4ade80' : p.errorPct < 18 ? '#fbbf24' : '#f87171';
                          const biasLabel = p.biasPct >= 0
                            ? `▲ +${p.biasPct.toFixed(1)}% (modelo subestimó)`
                            : `▼ ${p.biasPct.toFixed(1)}% (modelo sobrestimó)`;
                          const biasColor = p.biasPct >= 0 ? '#4ade80' : '#f87171';
                          return (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '4.5rem 1fr 1fr auto auto', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.65rem', background: 'rgba(30,41,59,0.5)', borderRadius: '6px', fontSize: '0.72rem' }}>
                              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{p.label}</span>
                              <span style={{ color: '#64748b' }}>Proyectado: <span style={{ color: '#94a3b8', fontWeight: 600 }}>{formatNumber(p.projected)}</span></span>
                              <span style={{ color: '#64748b' }}>Real: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{formatNumber(p.actual)}</span></span>
                              <span style={{ color: errColor, fontWeight: 700, whiteSpace: 'nowrap' }}>{p.errorPct.toFixed(1)}% error</span>
                              <span style={{ color: biasColor, fontSize: '0.67rem', whiteSpace: 'nowrap' }}>{biasLabel}</span>
                            </div>
                          );
                        })}
                        {avgError !== null && (
                          <div style={{ textAlign: 'right', paddingTop: '0.2rem', color: '#334155', fontSize: '0.67rem' }}>
                            MAPE: {avgError.toFixed(1)}% · {confidenceData.length} día{confidenceData.length > 1 ? 's' : ''} verificado{confidenceData.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Nota del factor de ajuste */}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', background: 'rgba(15,23,42,0.4)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(51,65,85,0.4)' }}>
                      <span style={{ color: '#94a3b8' }}>Día 2/Día 1 esperado: </span>
                      <span style={{ color: '#f97316', fontWeight: 700 }}>{(refCurve[1] * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', background: 'rgba(15,23,42,0.4)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(51,65,85,0.4)' }}>
                      <span style={{ color: '#94a3b8' }}>Ref días 1–20: </span>
                      <span style={{ color: '#fbbf24', fontWeight: 600 }}>CEA + ATBLM</span>
                      <span style={{ color: '#64748b' }}> · </span>
                      <span style={{ color: '#94a3b8' }}>días 21–28: </span>
                      <span style={{ color: '#fbbf24', fontWeight: 600 }}>solo CEA</span>
                    </div>
                  </div>

                  {/* === Cards de Velocidad de Decay === */}
                  {decayRates.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.65rem', marginBottom: '1.25rem' }}>
                      {/* Caída más reciente */}
                      {lastDecayRate && (
                        <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid rgba(51,65,85,0.5)' }}>
                          <p style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.3rem' }}>Caída {lastDecayRate.label}</p>
                          <p style={{ color: lastDecayRate.pct >= 0 ? '#4ade80' : '#f87171', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                            {lastDecayRate.pct != null ? `${lastDecayRate.pct >= 0 ? '+' : ''}${lastDecayRate.pct.toFixed(1)}%` : '—'}
                          </p>
                          <p style={{ color: '#475569', fontSize: '0.68rem', margin: '0.2rem 0 0', fontStyle: 'italic' }}>álbum total del día</p>
                        </div>
                      )}
                      {/* Tendencia: ¿se desacelera el decay? */}
                      {isDecelerating !== null && (
                        <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '0.75rem 1rem', border: `1px solid ${isDecelerating ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}` }}>
                          <p style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.3rem' }}>Tendencia del decay</p>
                          <p style={{ color: isDecelerating ? '#4ade80' : '#f87171', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                            {isDecelerating ? '↘ Desacelerando' : '↗ Acelerando'}
                          </p>
                          <p style={{ color: '#475569', fontSize: '0.68rem', margin: '0.2rem 0 0', fontStyle: 'italic' }}>
                            {isDecelerating ? 'Buen signo — la caída se modera' : 'Caída se profundiza día a día'}
                          </p>
                        </div>
                      )}
                      {/* Track con mejor retención */}
                      {trackRetentions.length > 0 && (
                        <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid rgba(51,65,85,0.5)' }}>
                          <p style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.3rem' }}>Mejor retención vs D20</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: trackRetentions[0].color, flexShrink: 0 }} />
                            <p style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {trackRetentions[0].name}
                            </p>
                          </div>
                          <p style={{ color: '#4ade80', fontSize: '1.1rem', fontWeight: 800, margin: '0.2rem 0 0' }}>
                            {trackRetentions[0].retention.toFixed(1)}% de D20
                          </p>
                        </div>
                      )}
                      {/* Track con mayor decay */}
                      {trackRetentions.length > 1 && (
                        <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid rgba(51,65,85,0.5)' }}>
                          <p style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.3rem' }}>Mayor decay vs D20</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: trackRetentions[trackRetentions.length - 1].color, flexShrink: 0 }} />
                            <p style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {trackRetentions[trackRetentions.length - 1].name}
                            </p>
                          </div>
                          <p style={{ color: '#f87171', fontSize: '1.1rem', fontWeight: 800, margin: '0.2rem 0 0' }}>
                            {trackRetentions[trackRetentions.length - 1].retention.toFixed(1)}% de D20
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* === VISTA GRÁFICO (absoluto) === */}
                  {decayView === 'chart' && (
                    <div>
                      <ResponsiveContainer width="100%" height={380}>
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" />
                          <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#64748b" tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'K' : v} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '8px', fontSize: '0.75rem' }}
                            formatter={(v, name) => [formatNumber(v), name]}
                          />
                          <ReferenceLine x={`Día ${REAL_DAYS + 1}`} stroke="rgba(148,163,184,0.35)" strokeDasharray="6 3"
                            label={{ value: '← real  proyectado →', fill: '#64748b', fontSize: 10, position: 'insideTopLeft' }} />
                          <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                          {trackData.map(t => (
                            <Line
                              key={t.name}
                              type="monotone"
                              dataKey={t.name}
                              stroke={t.color}
                              strokeWidth={1.8}
                              dot={(props) => {
                                const { cx, cy, index } = props;
                                if (index < REAL_DAYS) return <circle key={`dot-${t.name}-${index}`} cx={cx} cy={cy} r={3} fill={t.color} stroke="#0f172a" strokeWidth={1} />;
                                return <circle key={`dot-${t.name}-${index}`} cx={cx} cy={cy} r={2} fill="none" stroke={t.color} strokeWidth={1} />;
                              }}
                              isAnimationActive={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                      <p style={{ color: '#475569', fontSize: '0.7rem', textAlign: 'center', margin: '0.5rem 0 0' }}>
                        Puntos rellenos = datos reales (D20–D{(postAlbumEntries[postAlbumEntries.length - 1]?.label) || 'D21'}) · Puntos vacíos = proyección
                      </p>
                    </div>
                  )}
                  {/* === VISTA % RETENCIÓN === */}
                  {decayView === 'norm' && (
                    <div>
                      <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0 0 0.75rem' }}>
                        Todos los tracks normalizados a <strong style={{ color: '#f97316' }}>100% en D20</strong>. La pendiente muestra la velocidad de decay — cuanto más plana, mejor retención.
                      </p>
                      <ResponsiveContainer width="100%" height={380}>
                        <LineChart data={normChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" />
                          <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#64748b" tickFormatter={v => `${v}%`} domain={[0, 105]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '8px', fontSize: '0.75rem' }}
                            formatter={(v, name) => [`${v != null ? v.toFixed(1) : '—'}%`, name]}
                          />
                          <ReferenceLine x={`Día ${REAL_DAYS + 1}`} stroke="rgba(148,163,184,0.35)" strokeDasharray="6 3"
                            label={{ value: '← real  proyectado →', fill: '#64748b', fontSize: 10, position: 'insideTopLeft' }} />
                          <ReferenceLine y={75} stroke="rgba(148,163,184,0.12)" strokeDasharray="4 2" label={{ value: '75%', fill: '#334155', fontSize: 9, position: 'insideLeft' }} />
                          <ReferenceLine y={50} stroke="rgba(148,163,184,0.18)" strokeDasharray="4 2" label={{ value: '50%', fill: '#475569', fontSize: 9, position: 'insideLeft' }} />
                          <ReferenceLine y={25} stroke="rgba(148,163,184,0.12)" strokeDasharray="4 2" label={{ value: '25%', fill: '#334155', fontSize: 9, position: 'insideLeft' }} />
                          <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                          {trackData.map(t => (
                            <Line
                              key={t.name}
                              type="monotone"
                              dataKey={t.name}
                              stroke={t.color}
                              strokeWidth={2}
                              dot={(props) => {
                                const { cx, cy, index } = props;
                                if (index < REAL_DAYS) return <circle key={`ndot-${t.name}-${index}`} cx={cx} cy={cy} r={3} fill={t.color} stroke="#0f172a" strokeWidth={1} />;
                                return <circle key={`ndot-${t.name}-${index}`} cx={cx} cy={cy} r={2} fill="none" stroke={t.color} strokeWidth={1} />;
                              }}
                              isAnimationActive={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                      {/* Tabla de retención actual por track */}
                      {trackRetentions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem', justifyContent: 'center' }}>
                          {trackRetentions.map(t => (
                            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(15,23,42,0.5)', padding: '0.25rem 0.6rem', borderRadius: '9999px', border: '1px solid rgba(51,65,85,0.4)' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.color }} />
                              <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>{t.name.split(' ')[0]}</span>
                              <span style={{ color: t.retention >= 60 ? '#4ade80' : t.retention >= 40 ? '#fbbf24' : '#f87171', fontSize: '0.7rem', fontWeight: 700 }}>
                                {t.retention.toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p style={{ color: '#475569', fontSize: '0.7rem', textAlign: 'center', margin: '0.5rem 0 0' }}>
                        % respecto a streams de D20 — muestra quién cae más rápido en escala relativa
                      </p>
                    </div>
                  )}
                  {/* === VISTA TABLA === */}
                  {decayView === 'table' && <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(51,65,85,0.8)' }}>
                          <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>Track</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: '#f97316', whiteSpace: 'nowrap' }}>Día 1</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: '#fbbf24', whiteSpace: 'nowrap' }}>Día 2 (real)</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>Factor</th>
                          {Array.from({ length: TOTAL_DAYS - REAL_DAYS }, (_, i) => i + REAL_DAYS + 1).map(d => <th key={d} style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: '#475569', whiteSpace: 'nowrap' }}>D{d}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {trackData.map(t => {
                          const factorColor = t.factor >= 1.1 ? '#4ade80' : t.factor <= 0.9 ? '#f87171' : '#94a3b8';
                          return (
                            <tr key={t.name} style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                              <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: t.color, marginRight: '0.5rem' }} />
                                <span style={{ color: '#e2e8f0' }}>{t.name}</span>
                              </td>
                              <td style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: '#f97316', fontWeight: 600 }}>{formatNumber(t.day20)}</td>
                              <td style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: '#fbbf24', fontWeight: 600 }}>{formatNumber(t.day21)}</td>
                              <td style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: factorColor, fontWeight: 700 }}>{t.factor.toFixed(2)}×</td>
                              {t.projected.map((v, i) => (
                                <td key={i} style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: v < t.day21 * 0.4 ? '#f87171' : v < t.day21 * 0.6 ? '#fb923c' : '#94a3b8' }}>
                                  {formatNumber(v)}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>}
                </div>
              );
            })()}
          </div>

          {/* Metodología — colapsada */}
          <div style={{ borderRadius: '8px', border: '1px solid rgba(51,65,85,0.35)', overflow: 'hidden' }}>
            <button onClick={() => setDecayMethodOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', background: 'rgba(15,23,42,0.3)', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.75rem', fontWeight: 500 }}>
              <span>Metodología</span>
              <span style={{ fontSize: '0.65rem', transition: 'transform 0.2s', display: 'inline-block', transform: decayMethodOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
            </button>
            {decayMethodOpen && (
              <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem', color: '#64748b', background: 'rgba(15,23,42,0.2)', borderTop: '1px solid rgba(51,65,85,0.25)' }}>
                <p style={{ margin: 0 }}><strong style={{ color: '#94a3b8' }}>Decay D20→D21:</strong> Variación porcentual entre el día 20 y el día 21 completos.</p>
                <p style={{ margin: 0 }}><strong style={{ color: '#4ade80' }}>Outperformer:</strong> Z-score {'>'} 1.5 vs. promedio de tracks nuevos en D20.</p>
                <p style={{ margin: 0 }}><strong style={{ color: '#f87171' }}>Underperformer:</strong> Z-score {'<'} -1.5 vs. promedio.</p>
                <p style={{ margin: 0 }}><strong style={{ color: '#fbbf24' }}>Album Bump:</strong> Single pre-álbum con spike por efecto del lanzamiento.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === SOCIAL IMPACT TAB === */}
      {activeTab === 'social' && (() => {
        // Platform stats
        const igPosts = socialPosts.filter(p => p.platform === 'instagram');
        const tkPosts = socialPosts.filter(p => p.platform === 'tiktok');
        const igViews = igPosts.reduce((s, p) => s + p.views, 0);
        const tkViews = tkPosts.reduce((s, p) => s + p.views, 0);
        const igLikes = igPosts.reduce((s, p) => s + p.likes, 0);
        const tkLikes = tkPosts.reduce((s, p) => s + p.likes, 0);
        const tkSaves = tkPosts.reduce((s, p) => s + p.saves, 0);
        const totalViews = igViews + tkViews;
        const totalLikes = igLikes + tkLikes;
        const avgEngagement = ((totalLikes / totalViews) * 100).toFixed(1);

        // Sort all posts chronologically for timeline
        const sorted = [...socialPosts].sort((a, b) => a.date.localeCompare(b.date) || a.platform.localeCompare(b.platform));

        // Map posts to stream data for correlation
        const correlation = sorted.map(p => {
          const dateStr = p.date;
          const allTracksDay = Object.entries(streamData).reduce((sum, [, d]) => sum + (d.streams[dateStr] || 0), 0);
          const nextDate = new Date(dateStr + 'T12:00:00');
          nextDate.setDate(nextDate.getDate() + 1);
          const nextStr = nextDate.toISOString().split('T')[0];
          const allTracksNext = Object.entries(streamData).reduce((sum, [, d]) => sum + (d.streams[nextStr] || 0), 0);
          const mar21Total = Object.values(mar21Verified).reduce((a, b) => a + b, 0);
          const dayStreams = dateStr === '2026-03-21' ? mar21Total : allTracksDay;
          const hasNextData = nextStr === '2026-03-21' ? true : allTracksNext > 0;
          const nextDayStreams = nextStr === '2026-03-21' ? mar21Total : allTracksNext;
          const streamDelta = hasNextData ? nextDayStreams - dayStreams : null;
          return { ...p, dayStreams, nextDayStreams, streamDelta };
        });

        // Aggregate by date for the chart (combine both platforms per date)
        const byDateMap = {};
        sorted.forEach(p => {
          const key = p.date;
          if (!byDateMap[key]) byDateMap[key] = { date: key, igViews: 0, tkViews: 0, igLikes: 0, tkLikes: 0 };
          if (p.platform === 'instagram') { byDateMap[key].igViews += p.views; byDateMap[key].igLikes += p.likes; }
          else { byDateMap[key].tkViews += p.views; byDateMap[key].tkLikes += p.likes; }
        });
        const chartData = Object.values(byDateMap).map(d => ({
          date: new Date(d.date + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
          Instagram: d.igViews, TikTok: d.tkViews,
        }));

        // Type & platform colors
        const typeColors = { teaser: '#a78bfa', release: '#4ade80', promo: '#38bdf8', launch: '#f97316' };
        const typeLabels = { teaser: 'Teaser', release: 'Lanzamiento', promo: 'Promo', launch: 'Lanzamiento Álbum' };
        const platColors = { instagram: '#e879f9', tiktok: '#22d3ee' };

        return (
          <div>
            {/* Platform summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Posts', value: String(socialPosts.length), sub: `${igPosts.length} IG + ${tkPosts.length} TK`, color: '#a78bfa' },
                { label: 'Views Totales', value: formatNumber(totalViews), sub: `IG: ${formatNumber(igViews)} · TK: ${formatNumber(tkViews)}`, color: '#38bdf8' },
                { label: 'Likes Totales', value: formatNumber(totalLikes), sub: `Eng. rate: ${avgEngagement}%`, color: '#f87171' },
                { label: 'Instagram', value: formatNumber(igViews) + ' views', sub: `${igPosts.length} posts · ${((igLikes / igViews) * 100).toFixed(1)}% eng`, color: '#e879f9' },
                { label: 'TikTok', value: formatNumber(tkViews) + ' views', sub: `${tkPosts.length} posts · ${formatNumber(tkSaves)} saves`, color: '#22d3ee' },
                { label: 'TK Engagement', value: ((tkLikes / tkViews) * 100).toFixed(1) + '%', sub: `${formatNumber(tkLikes)} likes`, color: '#4ade80' },
              ].map((card, i) => (
                <div key={i} style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '1.1rem', border: '1px solid rgba(51,65,85,0.5)' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.35rem 0' }}>{card.label}</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
                  <p style={{ color: '#64748b', fontSize: '0.65rem', margin: '0.2rem 0 0 0' }}>{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Stacked bar chart: IG vs TK views by date */}
            <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
              <h2 style={{ color: '#a78bfa', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Views por Plataforma — Timeline</h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis stroke="#64748b" tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '8px' }} formatter={(v, name) => [formatNumber(v), name]} />
                  <Legend />
                  <Bar dataKey="Instagram" stackId="a" fill="#e879f9" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="TikTok" stackId="a" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Impacto Social → Streams */}
            {(() => {
              // Daily streams per day from dailyHistory
              const dailyStreamsArr = dailyHistory.map((snap, i, arr) => {
                const dayStreams = i > 0 ? snap.albumTotal - arr[i - 1].albumTotal : snap.albumTotal;
                return { date: snap.date, label: snap.label, streams: dayStreams };
              });
              // Map posts (with delta) by date
              const postsByDate = {};
              correlation.forEach(p => {
                if (!postsByDate[p.date]) postsByDate[p.date] = [];
                postsByDate[p.date].push(p);
              });
              // Merged dataset: every day in dailyHistory, with posts array attached
              const impactData = dailyStreamsArr.map(d => ({
                ...d,
                posts: postsByDate[d.date] || [],
              }));

              // Custom dot: invisible unless there's a social post that day
              const SocialDot = (props) => {
                const { cx, cy, payload } = props;
                if (!payload.posts || payload.posts.length === 0) return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={2} fill="rgba(148,163,184,0.2)" />;
                const hasIG = payload.posts.some(p => p.platform === 'instagram');
                const hasTK = payload.posts.some(p => p.platform === 'tiktok');
                const color = hasIG && hasTK ? '#a78bfa' : hasIG ? '#e879f9' : '#22d3ee';
                return (
                  <g key={`dot-${payload.date}`}>
                    <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.15} />
                    <circle cx={cx} cy={cy} r={5} fill={color} stroke="#0f172a" strokeWidth={1.5} />
                    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="7" fontWeight="900" fill="#0f172a">
                      {hasIG && hasTK ? '★' : hasIG ? '●' : '♪'}
                    </text>
                  </g>
                );
              };

              // Custom tooltip
              const ImpactTooltip = ({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d) return null;
                return (
                  <div style={{ background: '#0f172a', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '10px', padding: '0.7rem 0.9rem', fontSize: '0.74rem', maxWidth: '260px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>{label}</span>
                      <span style={{ color: '#f97316', fontWeight: 700 }}>{formatNumber(d.streams)} streams</span>
                    </div>
                    {d.posts.length === 0 && <p style={{ color: '#475569', margin: 0, fontStyle: 'italic' }}>Sin posts este día</p>}
                    {d.posts.map((p, i) => {
                      const platColor = p.platform === 'instagram' ? '#e879f9' : '#22d3ee';
                      const platLabel = p.platform === 'instagram' ? 'IG' : 'TK';
                      const engRate = (p.likes / p.views * 100).toFixed(1);
                      return (
                        <div key={i} style={{ borderTop: i > 0 ? '1px solid rgba(51,65,85,0.5)' : 'none', paddingTop: i > 0 ? '0.4rem' : 0, marginTop: i > 0 ? '0.4rem' : 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                            <span style={{ background: `${platColor}22`, color: platColor, fontWeight: 700, fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>{platLabel}</span>
                            <span style={{ color: typeColors[p.type] || '#94a3b8', fontSize: '0.65rem', fontWeight: 600 }}>{typeLabels[p.type] || p.type}</span>
                          </div>
                          <p style={{ color: '#e2e8f0', margin: '0 0 0.25rem', lineHeight: 1.3 }}>{p.caption.length > 55 ? p.caption.slice(0, 53) + '…' : p.caption}</p>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ color: '#38bdf8' }}>{formatNumber(p.views)} views</span>
                            <span style={{ color: '#e879f9' }}>{engRate}% eng</span>
                            {p.saves > 0 && <span style={{ color: '#a78bfa' }}>{formatNumber(p.saves)} saves</span>}
                          </div>
                          {p.streamDelta !== null && (
                            <div style={{ marginTop: '0.3rem', padding: '0.25rem 0.4rem', borderRadius: '5px', background: p.streamDelta > 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${p.streamDelta > 0 ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}` }}>
                              <span style={{ color: p.streamDelta > 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                                Streams D+1: {p.streamDelta > 0 ? '+' : ''}{formatNumber(p.streamDelta)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              };

              return (
                <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
                  <h2 style={{ color: '#a78bfa', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Impacto Social → Streams</h2>
                  <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0 0 1.25rem' }}>
                    Streams diarios del álbum con marcadores de posts. <span style={{ color: '#e879f9' }}>● Instagram</span> · <span style={{ color: '#22d3ee' }}>● TikTok</span> · <span style={{ color: '#a78bfa' }}>★ Ambos</span>. Hacé hover para ver el post y su impacto en D+1.
                  </p>
                  <ResponsiveContainer width="100%" height={360}>
                    <AreaChart data={impactData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradImpact" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" />
                      <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} interval={5} />
                      <YAxis stroke="#64748b" tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                      <Tooltip content={<ImpactTooltip />} />
                      <ReferenceLine x="03/19" stroke="#4ade80" strokeDasharray="4 2" label={{ value: '🚀', fill: '#4ade80', fontSize: 11, position: 'top' }} />
                      <Area
                        type="monotone"
                        dataKey="streams"
                        stroke="#a78bfa"
                        strokeWidth={2}
                        fill="url(#gradImpact)"
                        isAnimationActive={false}
                        dot={<SocialDot />}
                        activeDot={{ r: 6, fill: '#f97316', stroke: '#0f172a', strokeWidth: 2 }}
                        name="Streams/día"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[['#e879f9', '● Instagram'], ['#22d3ee', '● TikTok'], ['#a78bfa', '★ Ambos'], ['rgba(148,163,184,0.4)', '· Sin post']].map(([color, label]) => (
                      <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#64748b' }}>
                        <span style={{ color, fontWeight: 700 }}>{label.split(' ')[0]}</span>
                        <span>{label.split(' ').slice(1).join(' ')}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Timeline — All Posts with Stream Correlation */}
            <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ color: '#a78bfa', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Timeline Completo — IG + TikTok</h2>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {[['list', '≡ Lista'], ['chart', '◎ Gráfico']].map(([val, label]) => (
                    <button key={val} onClick={() => setSocialView(val)} style={{ padding: '0.3rem 0.85rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, background: socialView === val ? '#a78bfa' : 'rgba(51,65,85,0.5)', color: socialView === val ? '#0f172a' : '#94a3b8', transition: 'all 0.15s' }}>{label}</button>
                  ))}
                </div>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.5rem' }}>{socialPosts.length} posts de la campaña ordenados cronológicamente con engagement y correlación de streams.</p>

              {/* === VISTA GRÁFICO === */}
              {socialView === 'chart' && (() => {
                const origin = new Date('2026-01-28T12:00:00').getTime();
                const msPerDay = 86400000;
                const releaseDay = Math.round((new Date('2026-03-19T12:00:00').getTime() - origin) / msPerDay);
                const toX = date => Math.round((new Date(date + 'T12:00:00').getTime() - origin) / msPerDay);
                const igDots = correlation.filter(p => p.platform === 'instagram').map(p => ({
                  x: toX(p.date), y: p.views,
                  caption: p.caption, date: p.date, likes: p.likes, track: p.track, saves: p.saves, platform: 'instagram',
                }));
                const tkDots = correlation.filter(p => p.platform === 'tiktok').map(p => ({
                  x: toX(p.date), y: p.views,
                  caption: p.caption, date: p.date, likes: p.likes, track: p.track, saves: p.saves, platform: 'tiktok',
                }));

                // Instagram logo dot (rounded square + camera outline)
                const IGShape = ({ cx, cy }) => {
                  if (!cx || !cy) return null;
                  const s = 18, r = s / 2;
                  return (
                    <g>
                      <defs>
                        <radialGradient id="igGrad" cx="30%" cy="110%" r="140%" gradientUnits="objectBoundingBox">
                          <stop offset="0%"  stopColor="#fdf497"/>
                          <stop offset="10%" stopColor="#fdf497"/>
                          <stop offset="50%" stopColor="#fd5949"/>
                          <stop offset="68%" stopColor="#d6249f"/>
                          <stop offset="100%" stopColor="#285AEB"/>
                        </radialGradient>
                      </defs>
                      <rect x={cx - r} y={cy - r} width={s} height={s} rx={5} fill="url(#igGrad)" />
                      <rect x={cx - r + 4} y={cy - r + 4} width={s - 8} height={s - 8} rx={3} fill="none" stroke="white" strokeWidth="1.8" />
                      <circle cx={cx} cy={cy} r={3} fill="none" stroke="white" strokeWidth="1.5" />
                      <circle cx={cx + r - 5} cy={cy - r + 5} r={1.2} fill="white" />
                    </g>
                  );
                };

                // TikTok logo dot (black rounded square + musical note shape)
                const TKShape = ({ cx, cy }) => {
                  if (!cx || !cy) return null;
                  const s = 18, r = s / 2;
                  return (
                    <g>
                      <rect x={cx - r} y={cy - r} width={s} height={s} rx={4} fill="#010101" />
                      {/* TikTok "d" note shape */}
                      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="12" fontWeight="900" fill="white" fontFamily="Arial">♪</text>
                      {/* cyan accent top-right */}
                      <rect x={cx + r - 6} y={cy - r} width={6} height={3} rx={1} fill="#69C9D0" opacity="0.9" />
                    </g>
                  );
                };

                // Tooltip rico
                const ScatterTip = ({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  if (!d) return null;
                  const isIG = d.platform === 'instagram';
                  const platLabel = isIG ? 'Instagram' : 'TikTok';
                  const platColor = isIG ? '#e879f9' : '#22d3ee';
                  const engRate = ((d.likes / d.y) * 100).toFixed(1);
                  return (
                    <div style={{ background: '#0f172a', border: `1px solid ${platColor}55`, borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.75rem', maxWidth: '240px', boxShadow: `0 4px 20px ${platColor}22` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ color: platColor, fontWeight: 700, fontSize: '0.7rem' }}>{platLabel}</span>
                        <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{new Date(d.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <p style={{ color: '#e2e8f0', margin: '0 0 0.35rem', fontSize: '0.78rem', lineHeight: 1.3 }}>{d.caption}</p>
                      <p style={{ color: '#fbbf24', margin: '0 0 0.4rem', fontSize: '0.7rem' }}>🎵 {d.track}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.75rem', borderTop: '1px solid rgba(51,65,85,0.5)', paddingTop: '0.35rem' }}>
                        <span style={{ color: '#94a3b8' }}>Views</span>
                        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{formatNumber(d.y)}</span>
                        <span style={{ color: '#94a3b8' }}>Likes</span>
                        <span style={{ color: '#e879f9', fontWeight: 600 }}>{formatNumber(d.likes)}</span>
                        <span style={{ color: '#94a3b8' }}>Eng. rate</span>
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>{engRate}%</span>
                        {d.saves > 0 && <><span style={{ color: '#94a3b8' }}>Saves</span><span style={{ color: '#a78bfa', fontWeight: 600 }}>{formatNumber(d.saves)}</span></>}
                      </div>
                    </div>
                  );
                };

                return (
                  <ResponsiveContainer width="100%" height={360}>
                    <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
                      <defs>
                        <radialGradient id="igGrad2" cx="30%" cy="110%" r="140%" gradientUnits="objectBoundingBox">
                          <stop offset="0%" stopColor="#fdf497"/>
                          <stop offset="50%" stopColor="#fd5949"/>
                          <stop offset="68%" stopColor="#d6249f"/>
                          <stop offset="100%" stopColor="#285AEB"/>
                        </radialGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                      <XAxis type="number" dataKey="x" name="Fecha" domain={[-1, releaseDay + 5]} stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: '← campaña →', position: 'insideBottom', offset: -15, fill: '#475569', fontSize: 10 }}
                        tickFormatter={v => { const d = new Date(origin + v * msPerDay); return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }); }}
                        ticks={[0, 10, 20, 31, 41, releaseDay]} />
                      <YAxis type="number" dataKey="y" name="Views" stroke="#64748b" tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                      <Tooltip content={<ScatterTip />} cursor={{ stroke: 'rgba(167,139,250,0.3)', strokeWidth: 1 }} />
                      <ReferenceLine x={releaseDay} stroke="#f97316" strokeDasharray="5 3"
                        label={{ value: '🚀 Álbum', fill: '#f97316', fontSize: 11, position: 'insideTopRight', offset: 8 }} />
                      <Legend formatter={name => <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{name}</span>} />
                      <Scatter name="Instagram" data={igDots} shape={<IGShape />} legendType="square" fill="#e879f9" />
                      <Scatter name="TikTok"    data={tkDots} shape={<TKShape />} legendType="square" fill="#22d3ee" />
                    </ScatterChart>
                  </ResponsiveContainer>
                );
              })()}

              {/* === VISTA LISTA === */}
              {socialView === 'list' && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {correlation.map((p, i) => {
                  const engRate = ((p.likes / p.views) * 100).toFixed(1);
                  const platIcon = p.platform === 'instagram' ? '📸' : '🎵';
                  const platColor = platColors[p.platform];
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '90px 1fr 190px', gap: '0.75rem', alignItems: 'center',
                      background: 'rgba(15,23,42,0.5)', borderRadius: '10px', padding: '0.85rem',
                      borderLeft: `3px solid ${platColor}`,
                    }}>
                      <div>
                        <p style={{ color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>
                          {new Date(p.date + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </p>
                        <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{ padding: '0.1rem 0.4rem', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 600, background: `${platColor}22`, color: platColor, border: `1px solid ${platColor}44` }}>
                            {p.platform === 'instagram' ? 'IG' : 'TK'}
                          </span>
                          <span style={{ padding: '0.1rem 0.4rem', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 600, background: `${typeColors[p.type]}22`, color: typeColors[p.type], border: `1px solid ${typeColors[p.type]}44` }}>
                            {typeLabels[p.type]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p style={{ color: '#e2e8f0', fontSize: '0.8rem', margin: '0 0 0.2rem 0', fontWeight: 500 }}>{p.caption}</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.7rem', margin: 0 }}>
                          Track: <span style={{ color: '#fbbf24' }}>{p.track}</span>
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: platColor, fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{formatNumber(p.views)} views</p>
                        <p style={{ fontSize: '0.75rem', margin: '0.1rem 0' }}>
                          <span style={{ color: '#e879f9' }}>{formatNumber(p.likes)} likes</span>
                          <span style={{ color: '#64748b' }}> ({engRate}%)</span>
                          {p.saves > 0 && <span style={{ color: '#a78bfa' }}> · {formatNumber(p.saves)} saves</span>}
                        </p>
                        {p.dayStreams > 0 && p.streamDelta !== null && (
                          <p style={{ color: p.streamDelta > 0 ? '#4ade80' : '#f87171', fontSize: '0.7rem', margin: 0 }}>
                            Streams D+1: {p.streamDelta > 0 ? '+' : ''}{formatNumber(p.streamDelta)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>}

            </div>

            {/* Social Insights */}
            <div style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(30,41,59,0.6))', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(167,139,250,0.2)', marginBottom: '2.5rem' }}>
              <h2 style={{ color: '#a78bfa', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Insights de Social</h2>
              {(() => {
                // Best format by average views per type+platform
                const byTypePlat = {};
                socialPosts.forEach(p => {
                  const k = `${p.platform}:${p.type}`;
                  if (!byTypePlat[k]) byTypePlat[k] = { views: 0, posts: 0, likes: 0, platform: p.platform, type: p.type };
                  byTypePlat[k].views += p.views; byTypePlat[k].posts++; byTypePlat[k].likes += p.likes;
                });
                const typeArr = Object.values(byTypePlat).map(v => ({ ...v, avgViews: Math.round(v.views / v.posts), engRate: (v.likes / v.views * 100).toFixed(1) })).sort((a, b) => b.avgViews - a.avgViews);
                const bestFormat = typeArr[0];
                const typeLabelsLocal = { teaser: 'Teaser', release: 'Lanzamiento', promo: 'Promo', launch: 'Álbum launch' };
                const platLabel = { instagram: 'Instagram', tiktok: 'TikTok' };
                // Platform averages
                const igAvgViews = Math.round(igViews / igPosts.length);
                const tkAvgViews = Math.round(tkViews / tkPosts.length);
                const igEngRate = (igLikes / igViews * 100).toFixed(1);
                const tkEngRate = (tkLikes / tkViews * 100).toFixed(1);
                const engMultiplier = (parseFloat(tkEngRate) / parseFloat(igEngRate)).toFixed(1);
                // TikTok best save rate
                const tkWithSaves = socialPosts.filter(p => p.platform === 'tiktok' && p.saves > 0).sort((a, b) => (b.saves / b.views) - (a.saves / a.views));
                const bestSave = tkWithSaves[0];
                // Best stream delta post
                const posDeltas = correlation.filter(p => p.streamDelta !== null && p.streamDelta > 0).sort((a, b) => b.streamDelta - a.streamDelta);
                const bestDelta = posDeltas[0];
                // Teasers vs launches comparison
                const teaserAvg = Math.round(socialPosts.filter(p => p.type === 'teaser').reduce((s, p) => s + p.views, 0) / Math.max(socialPosts.filter(p => p.type === 'teaser').length, 1));
                const launchAvg = Math.round(socialPosts.filter(p => p.type === 'launch' || p.type === 'release').reduce((s, p) => s + p.views, 0) / Math.max(socialPosts.filter(p => p.type === 'launch' || p.type === 'release').length, 1));
                // TikTok pre vs post album
                const tkPreAlbum = socialPosts.filter(p => p.platform === 'tiktok' && p.date < '2026-03-19');
                const tkPostAlbum = socialPosts.filter(p => p.platform === 'tiktok' && p.date >= '2026-03-19');
                const tkPreAvg = tkPreAlbum.length ? Math.round(tkPreAlbum.reduce((s, p) => s + p.views, 0) / tkPreAlbum.length) : 0;
                const tkPostAvg = tkPostAlbum.length ? Math.round(tkPostAlbum.reduce((s, p) => s + p.views, 0) / tkPostAlbum.length) : 0;
                const tkDropPct = tkPreAvg > 0 ? Math.round((1 - tkPostAvg / tkPreAvg) * 100) : null;
                // Silence gaps (days between consecutive posts)
                const allDatesSorted = [...socialPosts].sort((a, b) => a.date.localeCompare(b.date));
                let maxGap = 0, maxGapStart = '', maxGapEnd = '';
                for (let i = 1; i < allDatesSorted.length; i++) {
                  const gap = Math.round((new Date(allDatesSorted[i].date) - new Date(allDatesSorted[i-1].date)) / 86400000);
                  if (gap > maxGap) { maxGap = gap; maxGapStart = allDatesSorted[i-1].date; maxGapEnd = allDatesSorted[i].date; }
                }
                // Best TK snippet (teaser) views
                const tkTeasers = socialPosts.filter(p => p.platform === 'tiktok' && p.type === 'teaser').sort((a, b) => b.views - a.views);
                const topTkTeaser = tkTeasers[0];
                // Post-album TK silence
                const lastTkDate = tkPostAlbum.length ? tkPostAlbum.sort((a, b) => b.date.localeCompare(a.date))[0].date : null;
                const daysSinceLastTk = lastTkDate ? Math.round((new Date('2026-03-22') - new Date(lastTkDate)) / 86400000) : null;
                // Neg deltas (posts that hurt streams next day)
                const negDeltas = correlation.filter(p => p.streamDelta !== null && p.streamDelta < 0).sort((a, b) => a.streamDelta - b.streamDelta);
                const insights = [
                  tkDropPct !== null && tkDropPct > 0 ? {
                    color: '#f87171', badge: 'URGENTE', category: 'TikTok',
                    title: 'TK colapsó post-lanzamiento',
                    metric: `−${tkDropPct}%`, metricSub: 'alcance promedio',
                    body: `De ${formatNumber(tkPreAvg)} → ${formatNumber(tkPostAvg)} views/video. El canal que impulsó todo el pre-release está prácticamente apagado.`,
                    action: 'Retomar cadencia de snippets en TK esta semana.',
                  } : null,
                  topTkTeaser ? {
                    color: '#fbbf24', badge: 'ATENCIÓN', category: 'Formato',
                    title: 'Snippets/teasers = el formato ganador',
                    metric: formatNumber(topTkTeaser.views), metricSub: 'views · mejor teaser TK',
                    body: `Ningún track nuevo del álbum recibió un snippet viral equivalente post-lanzamiento. Hay tracks sin presencia en TK todavía.`,
                    action: 'Producir snippets nuevos para los tracks sin TK.',
                  } : null,
                  teaserAvg > launchAvg ? {
                    color: '#fb923c', badge: 'ALERTA', category: 'Lanzamiento',
                    title: 'Posts de estreno: el peor formato de la campaña',
                    metric: `${Math.round(teaserAvg / launchAvg * 10) / 10}×`, metricSub: 'más alcance teasers vs lanzamiento',
                    body: `Teasers promediaron ${formatNumber(teaserAvg)} views vs ${formatNumber(launchAvg)} los posts de estreno. El día del álbum fue el de menor engagement relativo.`,
                    action: 'Revisar el formato/hook de posts de release para la próxima campaña.',
                  } : {
                    color: '#4ade80', badge: 'POSITIVO', category: 'Lanzamiento',
                    title: 'Posts de estreno superaron los teasers',
                    metric: formatNumber(launchAvg), metricSub: 'views prom · posts lanzamiento',
                    body: `El momentum del día del álbum fue mayor que el promedio de la campaña de expectativa (${formatNumber(teaserAvg)} views/teaser).`,
                    action: null,
                  },
                  maxGap > 5 ? {
                    color: '#fb923c', badge: 'ALERTA', category: 'Timing',
                    title: `${maxGap} días de silencio en la campaña`,
                    metric: `${maxGap}d`, metricSub: 'gap sin posts',
                    body: `${new Date(maxGapStart + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} → ${new Date(maxGapEnd + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}. El algoritmo enfría el perfil y el alcance orgánico cae con gaps largos.`,
                    action: 'Mantener frecuencia mínima de 1 post cada 3 días.',
                  } : null,
                  bestSave ? {
                    color: '#a78bfa', badge: 'INFO', category: 'Saves · Playlists',
                    title: 'ATBLM lidera intención de playlist en TK',
                    metric: `${(bestSave.saves / bestSave.views * 100).toFixed(2)}%`, metricSub: 'save rate · mejor video',
                    body: `${formatNumber(bestSave.saves)} saves. Ese nivel no se replicó en ningún track nuevo. Los saves son el indicador más directo de distribución algorítmica.`,
                    action: 'Replicar el formato del snippet de ATBLM para los tracks nuevos.',
                  } : null,
                  negDeltas.length > 0 ? {
                    color: '#64748b', badge: 'INFO', category: 'D+1 Correlación',
                    title: `${negDeltas.length} post${negDeltas.length > 1 ? 's' : ''} correlacionan con caída de streams`,
                    metric: String(negDeltas.length), metricSub: `post${negDeltas.length > 1 ? 's' : ''} con delta negativo`,
                    body: `${negDeltas.slice(0, 2).map(p => `${p.platform === 'instagram' ? 'IG' : 'TK'} ${new Date(p.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} (${formatNumber(p.streamDelta)})`).join(' · ')}. No implica causalidad directa.`,
                    action: 'Monitorear en próximas semanas para confirmar patrón.',
                  } : null,
                ].filter(Boolean);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                    {insights.map((ins, i) => (
                      <div key={i} style={{
                        background: 'rgba(15,23,42,0.6)',
                        border: `1px solid ${ins.color}33`,
                        borderLeft: `3px solid ${ins.color}`,
                        borderRadius: '10px',
                        padding: '1rem 1.1rem',
                        display: 'flex', flexDirection: 'column', gap: '0.45rem',
                      }}>
                        {/* Badge + Category */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', color: ins.color, background: `${ins.color}18`, border: `1px solid ${ins.color}44`, borderRadius: '4px', padding: '0.15rem 0.45rem' }}>{ins.badge}</span>
                          <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 500 }}>{ins.category}</span>
                        </div>
                        {/* Title */}
                        <p style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{ins.title}</p>
                        {/* Key metric */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                          <span style={{ color: ins.color, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{ins.metric}</span>
                          <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{ins.metricSub}</span>
                        </div>
                        {/* Body */}
                        <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: 0, lineHeight: 1.5 }}>{ins.body}</p>
                        {/* Action */}
                        {ins.action && (
                          <p style={{ color: ins.color, fontSize: '0.75rem', margin: 0, fontWeight: 600, borderTop: `1px solid ${ins.color}22`, paddingTop: '0.4rem', marginTop: '0.1rem' }}>
                            → {ins.action}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Methodology — colapsada */}
            <div style={{ borderRadius: '8px', border: '1px solid rgba(51,65,85,0.35)', overflow: 'hidden' }}>
              <button onClick={() => setSocialMethodOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', background: 'rgba(15,23,42,0.3)', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.75rem', fontWeight: 500 }}>
                <span>Metodología Social Impact</span>
                <span style={{ fontSize: '0.65rem', transition: 'transform 0.2s', display: 'inline-block', transform: socialMethodOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
              </button>
              {socialMethodOpen && (
                <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem', color: '#64748b', background: 'rgba(15,23,42,0.2)', borderTop: '1px solid rgba(51,65,85,0.25)' }}>
                  <p style={{ margin: 0 }}><strong style={{ color: '#94a3b8' }}>Instagram:</strong> @zeballos17 — 8 reels (Feb 2 – Mar 21). Views y likes desde perfil público.</p>
                  <p style={{ margin: 0 }}><strong style={{ color: '#94a3b8' }}>TikTok:</strong> @zeballos1717 — 15 videos (Ene 28 – Mar 22). Eng. rate ~12% vs ~5% en IG.</p>
                  <p style={{ margin: 0 }}><strong style={{ color: '#94a3b8' }}>Engagement Rate:</strong> Likes / Views × 100.</p>
                  <p style={{ margin: 0 }}><strong style={{ color: '#94a3b8' }}>Stream Delta D+1:</strong> Diferencia en streams entre el día del post y el siguiente (correlación, no causalidad).</p>
                  <p style={{ margin: 0 }}><strong style={{ color: '#94a3b8' }}>Atribución:</strong> Por track mencionado, audio usado o taggeado (#amorfiado).</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(51,65,85,0.5)', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '0.75rem', margin: 0 }}>
          AMOR FIADO — ZEBALLOS &nbsp;·&nbsp; Spotify: <span style={{ color: '#f97316' }}>{formatLastUpdated(lastUpdated.spotify)}</span> &nbsp;·&nbsp; Social: <span style={{ color: '#a78bfa' }}>{formatLastUpdated(lastUpdated.social)}</span>
        </p>
      </div>
    </div>
  );
};

export default AmorFiadoDashboard;
