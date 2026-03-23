import React, { useMemo, useState } from 'react';
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

const AmorFiadoDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [growthZoom, setGrowthZoom] = useState('all'); // 'all' | 'zoom'
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [socialView, setSocialView] = useState('list'); // 'list' | 'chart'
  const [decayView, setDecayView] = useState('chart'); // 'chart' | 'table'
  const [histGrouping, setHistGrouping] = useState('day'); // 'day' | 'month'
  const toggleDay = (date) => setExpandedDays(prev => { const s = new Set(prev); s.has(date) ? s.delete(date) : s.add(date); return s; });

  // Album metadata
  const albumName = 'AMOR FIADO';
  const artist = 'ZEBALLOS';
  const releaseDate = '19 de Marzo, 2026 — 20:00 (UTC-3)';

  // Last data update timestamps — updated automatically by the scrapers each run
  const lastUpdated = {
    spotify: '2026-03-22T15:00:00-03:00',
    social:  '2026-03-22T15:00:00-03:00',
  };
  const formatLastUpdated = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Growth history — each entry is a snapshot captured every 8h by the scheduled task
  // The scheduled task appends new entries here automatically
  const growthHistory = [
    { timestamp: '22/03 15:00', albumTotal: 678677, 'CEA': 273884, 'ATBLM': 200669, 'UN GUSTO': 31749, 'CALL ME': 23750, 'MAN OF WORD': 22919, 'OJOS TRISTES': 21652, 'HIELO': 19885, 'CHANGES': 19758, 'ALQUILER': 18508, 'YA NO': 16522, 'HAZLO CALLAO': 15226, 'TOP TIER': 14298 },
  ];

  // Live totals from Spotify for Artists (scraped per-track Mar 22, 2026)
  const liveTotals = {
    'CUANDO ESCRIBÍA ASIMETRÍA': 273884,
    'ATBLM': 200669,
    'UN GUSTO': 31749,
    'CALL ME': 23750,
    'MAN OF WORD': 22919,
    'OJOS TRISTES': 21652,
    'HIELO': 19885,
    'CHANGES': 19758,
    'ALQUILER': 18508,
    'YA NO': 16522,
    'HAZLO CALLAO': 15226,
    'TOP TIER': 14298,
  };

  // Album-level live total
  const albumLiveTotal = 678677;

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

  // Verified Mar 21 daily streams (calculated from S4A 28-day totals minus CSV sums)
  const mar21Verified = {
    'CUANDO ESCRIBÍA ASIMETRÍA': 7079,
    'ATBLM': 9742,
    'UN GUSTO': 8254,
    'CALL ME': 6294,
    'MAN OF WORD': 5968,
    'OJOS TRISTES': 5708,
    'HIELO': 5334,
    'ALQUILER': 4822,
    'CHANGES': 5213,
    'YA NO': 4388,
    'HAZLO CALLAO': 4084,
    'TOP TIER': 3864,
  };

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
        '2026-03-19': 5814, '2026-03-20': 10875,
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
        '2026-03-18': 7359, '2026-03-19': 8513, '2026-03-20': 14710,
      },
    },
    'UN GUSTO': { type: 'album', streams: { '2026-03-19': 806, '2026-03-20': 16320 } },
    'CALL ME': { type: 'album', streams: { '2026-03-19': 1032, '2026-03-20': 11305 } },
    'MAN OF WORD': { type: 'album', streams: { '2026-03-19': 1293, '2026-03-20': 10998 } },
    'OJOS TRISTES': { type: 'album', streams: { '2026-03-19': 649, '2026-03-20': 10905 } },
    'HIELO': { type: 'album', streams: { '2026-03-19': 753, '2026-03-20': 9626 } },
    'ALQUILER': { type: 'album', streams: { '2026-03-19': 879, '2026-03-20': 9166 } },
    'CHANGES': { type: 'album', streams: { '2026-03-19': 676, '2026-03-20': 9170 } },
    'YA NO': { type: 'album', streams: { '2026-03-19': 472, '2026-03-20': 8069 } },
    'HAZLO CALLAO': { type: 'album', streams: { '2026-03-19': 486, '2026-03-20': 7584 } },
    'TOP TIER': { type: 'album', streams: { '2026-03-19': 383, '2026-03-20': 7061 } },
  };

  // Computed cumulative stream totals per day (closed-day granularity)
  // Built from streamData daily breakdowns + mar21Verified — no scraper needed
  const dailyHistory = useMemo(() => {
    const nameMap = {
      'CUANDO ESCRIBÍA ASIMETRÍA': 'CEA', 'ATBLM': 'ATBLM', 'UN GUSTO': 'UN GUSTO',
      'CALL ME': 'CALL ME', 'MAN OF WORD': 'MAN OF WORD', 'OJOS TRISTES': 'OJOS TRISTES',
      'HIELO': 'HIELO', 'CHANGES': 'CHANGES', 'ALQUILER': 'ALQUILER',
      'YA NO': 'YA NO', 'HAZLO CALLAO': 'HAZLO CALLAO', 'TOP TIER': 'TOP TIER',
    };
    // Build full per-track daily streams including Mar 21 verified
    const fullStreams = {};
    Object.entries(streamData).forEach(([name, data]) => {
      const short = nameMap[name] || name;
      fullStreams[short] = { ...data.streams };
      if (mar21Verified[name]) fullStreams[short]['2026-03-21'] = mar21Verified[name];
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
  }, []);

  const metrics = useMemo(() => {
    // Use verified Mar 21 daily streams
    const mar21Streams = { ...mar21Verified };

    // Add Mar 21 to stream data for calculations
    const fullStreamData = {};
    Object.entries(streamData).forEach(([name, data]) => {
      fullStreamData[name] = {
        ...data,
        streams: { ...data.streams, '2026-03-21': mar21Streams[name] },
      };
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

    // Multi-day comparison chart data (all tracks, days 19-21)
    const multiDayData = Object.entries(fullStreamData).map(([name, data]) => ({
      name: name.length > 18 ? name.substring(0, 16) + '...' : name,
      fullName: name,
      'Día 19 (~1h)': data.streams['2026-03-19'] || 0,
      'Día 20': data.streams['2026-03-20'] || 0,
      'Día 21': data.streams['2026-03-21'] || 0,
      type: data.type,
    })).sort((a, b) => b['Día 20'] - a['Día 20']);

    // Timeline chart data (for pre-release singles)
    const timelineData = [];
    const dateRange = [];
    for (let d = new Date('2026-02-05'); d <= new Date('2026-03-21'); d.setDate(d.getDate() + 1)) {
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
    };
  }, []);

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
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Spotify for Artists — Analytics</p>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, background: 'linear-gradient(135deg, #f97316, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, lineHeight: 1.1 }}>{albumName}</h1>
            <p style={{ fontSize: '1.25rem', color: '#cbd5e1', marginTop: '0.25rem' }}>{artist}</p>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>{releaseDate}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>All-time Streams · LIVE</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f97316', margin: 0 }}>{formatNumber(albumLiveTotal)}</p>
            <p style={{ color: '#64748b', fontSize: '0.75rem' }}>12 tracks · S4A: <span style={{ color: '#f97316' }}>{formatLastUpdated(lastUpdated.spotify)}</span></p>
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
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
            {[
              { label: 'Día 19 (~1h)', value: formatNumber(metrics.day19Streams), sub: 'Lanzamiento 20:00 UTC-3 · ciclo Spotify ~1h' },
              { label: 'Día 20 (completo)', value: formatNumber(metrics.day20Streams), sub: 'Primer día completo', highlight: true },
              { label: 'Día 21 (completo)', value: formatNumber(metrics.day21Streams), sub: 'Día completo' },
              { label: 'Promedio/Track D20', value: formatNumber(metrics.avgDay20Album), sub: 'Solo tracks nuevos' },
              { label: 'Track #1', value: metrics.topTrackDay20.fullName, sub: formatNumber(metrics.topTrackDay20.streams) + ' streams D20', highlight: true },
            ].map((card, i) => (
              <div key={i} style={{
                background: card.highlight ? 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(30,41,59,0.8))' : 'rgba(30, 41, 59, 0.5)',
                borderRadius: '12px', padding: '1.25rem',
                border: card.highlight ? '1px solid rgba(251,146,60,0.3)' : '1px solid rgba(51,65,85,0.5)',
              }}>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.5rem 0' }}>{card.label}</p>
                <p style={{ fontSize: card.value.length > 12 ? '1.1rem' : '1.75rem', fontWeight: 700, color: card.highlight ? '#f97316' : '#f1f5f9', margin: 0 }}>{card.value}</p>
                <p style={{ color: '#64748b', fontSize: '0.7rem', margin: '0.25rem 0 0 0' }}>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Multi-day grouped bar chart */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Comparativa Diaria por Track</h2>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={metrics.multiDayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={80} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '8px' }} formatter={(v) => formatNumber(v)} />
                <Legend />
                <Bar dataKey="Día 19 (3h)" fill="#475569" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Día 20" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Día 21" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Insights */}
          <div style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.08), rgba(30,41,59,0.6))', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(251,146,60,0.2)' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Insights Clave</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                `UN GUSTO lidera el álbum con ${formatNumber(16320)} streams en su primer día completo, superando al segundo (CALL ME) por ~${formatNumber(16320 - 11305)}.`,
                `El álbum acumuló ${formatNumber(metrics.totalLiveStreams)} streams totales (live) en ~50 horas desde el lanzamiento.`,
                `El "efecto álbum" multiplicó ATBLM por ${metrics.singlesAnalysis['ATBLM'].multiplier}x y CUANDO ESCRIBÍA ASIMETRÍA por ${metrics.singlesAnalysis['CUANDO ESCRIBÍA ASIMETRÍA'].multiplier}x vs. sus promedios pre-álbum.`,
                `Día 20 generó ${formatNumber(metrics.day20Streams)} streams totales — el primer día completo (ciclo Spotify 00:00–23:59 UTC).`,
                `Día 21 cerró con ${formatNumber(metrics.day21Streams)} streams — un decay de ${((1 - metrics.day21Streams / metrics.day20Streams) * 100).toFixed(0)}% vs D20, típico de la caída post-lanzamiento.`,
                `Los 10 tracks nuevos promediaron ${formatNumber(metrics.avgDay20Album)} streams el día 20, con UN GUSTO como claro outlier positivo.`,
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#f97316', fontWeight: 700, marginTop: '2px' }}>▸</span>
                  <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === TRACKS TAB === */}
      {activeTab === 'tracks' && (
        <div>
          {/* Horizontal bar ranking */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Ranking — Día 20 (Primer Día Completo)</h2>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart layout="vertical" data={metrics.day20ByTrack} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis type="number" stroke="#64748b" tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={190} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '8px' }} formatter={(v) => formatNumber(v)} />
                <Bar dataKey="streams" radius={[0, 6, 6, 0]}>
                  {metrics.day20ByTrack.map((entry, idx) => (
                    <Cell key={idx} fill={entry.type === 'single' ? '#fbbf24' : '#f97316'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '14px', height: '14px', background: '#fbbf24', borderRadius: '3px' }}></div>
                <span style={{ color: '#94a3b8' }}>Singles Pre-lanzamiento</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '14px', height: '14px', background: '#f97316', borderRadius: '3px' }}></div>
                <span style={{ color: '#94a3b8' }}>Tracks Nuevos del Álbum</span>
              </div>
            </div>
          </div>

          {/* Live totals table */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Streams Acumulados (Live)</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(51,65,85,0.8)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Track</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', color: '#94a3b8' }}>Live Total</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', color: '#94a3b8' }}>Día 20</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', color: '#94a3b8' }}>Día 21</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem', color: '#94a3b8' }}>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.trackAnalysis.map((t, i) => (
                    <tr key={t.name} style={{ borderBottom: '1px solid rgba(51,65,85,0.3)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '0.75rem', color: '#64748b', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: '0.75rem', color: '#f1f5f9', fontWeight: 500 }}>{t.name}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem', color: '#f97316', fontWeight: 700 }}>{formatNumber(t.liveTotal)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem', color: '#cbd5e1' }}>{formatNumber(t.day20)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem', color: '#fbbf24' }}>{formatNumber(t.day21)}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
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
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 1.5rem 0' }}>Streams acumulados a día cerrado — desde lanzamiento de CEA (05/02) hasta 21/03</p>
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
                const sorted = Object.entries(trackMetrics).sort((a, b) => b[1].saves - a[1].saves);
                const topSaves = sorted[0];
                const topSPL = Object.entries(trackMetrics).sort((a, b) => b[1].streamsPerListener - a[1].streamsPerListener)[0];
                const topPL = Object.entries(trackMetrics).sort((a, b) => b[1].playlistAdds - a[1].playlistAdds)[0];
                const totalSaves = Object.values(trackMetrics).reduce((s, t) => s + t.saves, 0);
                const totalListeners = Object.values(trackMetrics).reduce((s, t) => s + t.listeners, 0);
                return [
                  `${topSaves[0]} lidera en saves con ${formatNumber(topSaves[1].saves)}, indicando alta retención.`,
                  `${topSPL[0]} tiene el mayor ratio de streams/listener (${topSPL[1].streamsPerListener.toFixed(2)}), lo que sugiere alto replay value.`,
                  `${topPL[0]} acumula la mayor cantidad de playlist adds (${formatNumber(topPL[1].playlistAdds)}), clave para el crecimiento orgánico.`,
                  `En total, el álbum generó ${formatNumber(totalSaves)} saves en 28 días — un promedio de ${(totalSaves / 12).toFixed(0)} saves por track.`,
                  `CUANDO ESCRIBÍA ASIMETRÍA es el único track con datos de período anterior: creció 13.4% vs. los 28 días previos.`,
                ].map((text, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ color: '#f97316', fontWeight: 700, marginTop: '2px' }}>▸</span>
                    <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{text}</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
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
        </div>
      )}

      {/* === DECAY INTEL TAB === */}
      {activeTab === 'decay' && (
        <div>

          {/* Gráfico de velocidad de decay D20→D21 */}
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Velocidad de Decay — D20 → D21</h2>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0 0 1.25rem' }}>% de variación de streams entre el primer día completo (D20) y el segundo (D21). Verde = creciendo · Rojo = cayendo.</p>
            {(() => {
              const sorted = [...metrics.trackAnalysis]
                .filter(t => t.decayD20toD21 !== 'N/A')
                .sort((a, b) => parseFloat(b.decayD20toD21) - parseFloat(a.decayD20toD21));
              const max = Math.max(...sorted.map(t => Math.abs(parseFloat(t.decayD20toD21))));
              const [hoveredTrack, setHoveredTrack] = React.useState(null);
              const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', position: 'relative' }}>
                  {sorted.map(t => {
                    const val = parseFloat(t.decayD20toD21);
                    const isPos = val >= 0;
                    const pct = Math.abs(val) / max * 100;
                    const color = isPos ? '#4ade80' : val < -40 ? '#f87171' : val < -20 ? '#fb923c' : '#fbbf24';
                    return (
                      <div key={t.name}
                        style={{ display: 'grid', gridTemplateColumns: '140px 1fr 60px', gap: '0.75rem', alignItems: 'center', cursor: 'default' }}
                        onMouseEnter={e => { setHoveredTrack(t); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                        onMouseMove={e => setTooltipPos({ x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHoveredTrack(null)}
                      >
                        <span style={{ color: '#e2e8f0', fontSize: '0.78rem', fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                        <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '4px', height: '20px', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', left: isPos ? '50%' : `calc(50% - ${pct / 2}%)`, width: `${pct / 2}%`, height: '100%', background: color, opacity: hoveredTrack?.name === t.name ? 1 : 0.85, borderRadius: isPos ? '0 3px 3px 0' : '3px 0 0 3px', transition: 'opacity 0.15s' }} />
                          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(148,163,184,0.25)' }} />
                        </div>
                        <span style={{ color, fontWeight: 700, fontSize: '0.8rem', textAlign: 'right' }}>{isPos ? '+' : ''}{val.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                  {/* Tooltip flotante */}
                  {hoveredTrack && (() => {
                    const val = parseFloat(hoveredTrack.decayD20toD21);
                    const color = val >= 0 ? '#4ade80' : val < -40 ? '#f87171' : val < -20 ? '#fb923c' : '#fbbf24';
                    const rank = sorted.findIndex(t => t.name === hoveredTrack.name) + 1;
                    return (
                      <div style={{ position: 'fixed', left: tooltipPos.x + 14, top: tooltipPos.y - 10, zIndex: 9999, background: '#0f172a', border: `1px solid ${color}44`, borderRadius: '10px', padding: '0.65rem 0.9rem', fontSize: '0.75rem', pointerEvents: 'none', minWidth: '200px', boxShadow: `0 4px 20px ${color}22` }}>
                        <p style={{ color: '#f1f5f9', fontWeight: 700, margin: '0 0 0.4rem' }}>{hoveredTrack.name}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem 0.75rem' }}>
                          <span style={{ color: '#64748b' }}>D20 (Día 1)</span>
                          <span style={{ color: '#f97316', fontWeight: 600 }}>{formatNumber(hoveredTrack.day20)}</span>
                          <span style={{ color: '#64748b' }}>D21 (Día 2)</span>
                          <span style={{ color: '#fbbf24', fontWeight: 600 }}>{formatNumber(hoveredTrack.day21)}</span>
                          <span style={{ color: '#64748b' }}>Δ streams</span>
                          <span style={{ color, fontWeight: 600 }}>{hoveredTrack.day21 - hoveredTrack.day20 > 0 ? '+' : ''}{formatNumber(hoveredTrack.day21 - hoveredTrack.day20)}</span>
                          <span style={{ color: '#64748b' }}>Decay</span>
                          <span style={{ color, fontWeight: 700 }}>{val >= 0 ? '+' : ''}{val.toFixed(2)}%</span>
                          <span style={{ color: '#64748b' }}>Ranking</span>
                          <span style={{ color: '#94a3b8' }}>{rank}° de {sorted.length}</span>
                          {hoveredTrack.anomaly && <><span style={{ color: '#64748b' }}>Estado</span><span style={{ color: hoveredTrack.anomalyColor === 'green' ? '#4ade80' : hoveredTrack.anomalyColor === 'red' ? '#f87171' : '#fbbf24', fontWeight: 600 }}>{hoveredTrack.anomaly}</span></>}
                        </div>
                      </div>
                    );
                  })()}
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
                  {[['chart', '▲ Gráfico'], ['table', '≡ Tabla']].map(([val, label]) => (
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

              // Días reales disponibles: Día 1 y Día 2 (D20/D21)
              // Días proyectados: 3 a 28
              const REAL_DAYS = 2; // actualizar cuando el scraper traiga D22+

              const trackData = tracks.map((t, idx) => {
                const factor = t.day21 / (t.day20 * refCurve[1]);
                // Para cada día 3-28 (índice 2-27 en refCurve)
                const projected = Array.from({ length: TOTAL_DAYS - REAL_DAYS }, (_, i) => {
                  return Math.max(Math.round(t.day20 * refCurve[i + REAL_DAYS] * factor), 0);
                });
                return { ...t, factor, projected, color: trackColors[idx % trackColors.length] };
              });

              // Datos del gráfico: días 1 a 28, etiquetados como "Día N"
              const chartData = Array.from({ length: TOTAL_DAYS }, (_, i) => {
                const albumDay = i + 1;
                const row = { day: `Día ${albumDay}`, isReal: albumDay <= REAL_DAYS };
                trackData.forEach(t => {
                  if (albumDay === 1) row[t.name] = t.day20;
                  else if (albumDay === 2) row[t.name] = t.day21;
                  else row[t.name] = t.projected[albumDay - 1 - REAL_DAYS];
                });
                return row;
              });

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

                  {/* === VISTA GRÁFICO === */}
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
                          <ReferenceLine x="Día 3" stroke="rgba(148,163,184,0.35)" strokeDasharray="6 3"
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
                                if (index <= 1) return <circle key={`dot-${t.name}-${index}`} cx={cx} cy={cy} r={3} fill={t.color} stroke="#0f172a" strokeWidth={1} />;
                                return <circle key={`dot-${t.name}-${index}`} cx={cx} cy={cy} r={2} fill="none" stroke={t.color} strokeWidth={1} />;
                              }}
                              strokeDasharray={undefined}
                              isAnimationActive={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                      <p style={{ color: '#475569', fontSize: '0.7rem', textAlign: 'center', margin: '0.5rem 0 0' }}>
                        Puntos rellenos = datos reales (D20–D21) · Puntos vacíos = proyección (D22+)
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

          {/* Metodología */}
          <div style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.08), rgba(30,41,59,0.6))', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(251,146,60,0.2)' }}>
            <h2 style={{ color: '#f97316', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Metodología</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
              <p style={{ margin: 0 }}><strong style={{ color: '#cbd5e1' }}>Decay D20→D21:</strong> Variación porcentual entre el día 20 (completo) y el día 21 (completo). Calculado a partir de los totales de 28 días de Spotify for Artists.</p>
              <p style={{ margin: 0 }}><strong style={{ color: '#4ade80' }}>Outperformer:</strong> Track con Z-score {'>'} 1.5 vs. el promedio de tracks nuevos del álbum en D20.</p>
              <p style={{ margin: 0 }}><strong style={{ color: '#f87171' }}>Underperformer:</strong> Track con Z-score {'<'} -1.5 vs. el promedio.</p>
              <p style={{ margin: 0 }}><strong style={{ color: '#fbbf24' }}>Album Bump:</strong> Single pre-lanzamiento que recibió un spike significativo por efecto del álbum.</p>
            </div>
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

            {/* Track-level social attribution */}
            <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(51,65,85,0.5)', marginBottom: '2.5rem' }}>
              <h2 style={{ color: '#a78bfa', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Atribución Social por Track (Ambas Plataformas)</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(51,65,85,0.8)' }}>
                      {['Track', 'Posts', 'IG Views', 'TK Views', 'Total Views', 'Likes', 'TK Saves', 'Eng.', 'Streams'].map(h => (
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

            {/* Methodology */}
            <div style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(30,41,59,0.6))', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(167,139,250,0.2)' }}>
              <h2 style={{ color: '#a78bfa', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Metodología Social Impact</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                <p style={{ margin: 0 }}><strong style={{ color: '#e879f9' }}>Instagram:</strong> @zeballos17 — 8 reels de la campaña (Feb 2 – Mar 21). Views, likes scrapeados desde perfil público.</p>
                <p style={{ margin: 0 }}><strong style={{ color: '#22d3ee' }}>TikTok:</strong> @zeballos1717 — 15 videos (Ene 28 – Mar 22). Views, likes, saves y comments scrapeados. TikTok muestra engagement significativamente mayor (eng. rate ~12% vs ~5% en IG).</p>
                <p style={{ margin: 0 }}><strong style={{ color: '#cbd5e1' }}>Engagement Rate:</strong> Likes / Views × 100.</p>
                <p style={{ margin: 0 }}><strong style={{ color: '#cbd5e1' }}>Stream Delta D+1:</strong> Diferencia en streams totales entre el día del post y el día siguiente (correlación, no causalidad).</p>
                <p style={{ margin: 0 }}><strong style={{ color: '#cbd5e1' }}>Atribución por Track:</strong> Basada en el track mencionado, usado como audio, o taggeado (#amorfiado). Posts genéricos del álbum se atribuyen a "AMOR FIADO".</p>
              </div>
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
