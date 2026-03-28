# Spotify for Artists (S4A) API Guide — Amor Fiado Tracker
## Last updated: 2026-03-28 (D+9)

## Artist Info
- Artist: Zeballos
- Artist ID: `5ayyPSqoObeTOj1UGtM79C`
- Album: Amor Fiado (12 tracks, released 2026-02-19)

## Track ID Map
```
CUANDO ESCRIBÍA ASIMETRÍA → 3LodenBjwz6GZbD8ZQVLRC
MAN OF WORD                → 5nfkcy3ZVaDo3VInn1OBCu
ATBLM                      → 4dUDowRcJAjsZw9xV9esjh
CALL ME                    → 1PazN55q85De58h0NXP8ZO
ALQUILER                   → 3sKcIP464G9eNWC6BLQbJn
HIELO                      → 2CuCRfK2mLPFZXDalEZtmw
UN GUSTO                   → 74XvuYXS9VjhlnEn9Ctf7y
CHANGES                    → 5nZTTvDpDsF5TqdqSlHq6m
OJOS TRISTES               → 2dO9tmd62ILh8uwew2IgXF
HAZLO CALLAO               → 1gchScLxTPJQ6LSmmJsKVP
YA NO                      → 6j8Srcc8XwIQyRbHabWqDM
TOP TIER                   → 7JThT6NTMxA8gB2ZBYjEDu
```

---

## Authentication
S4A uses a Bearer token stored in memory, injected via `Headers.set()`.

### Token Capture Method (JavaScript injection in S4A page)
```javascript
window._capturedToken = null;
const OrigHeaders = window.Headers;
window.Headers = class extends OrigHeaders {
  set(name, value) {
    if (name.toLowerCase() === 'authorization' && value?.startsWith('Bearer '))
      window._capturedToken = value;
    return super.set(name, value);
  }
  append(name, value) {
    if (name.toLowerCase() === 'authorization' && value?.startsWith('Bearer '))
      window._capturedToken = value;
    return super.append(name, value);
  }
};
```

### Token Trigger
After injection, navigate or click any time-period button (7 days / 28 days) to trigger a fetch that fires the Headers interceptor.

---

## Working Endpoints ✅

### 1. Live Total (All-time streams)
```
GET https://generic.wg.spotify.com/song-stats-view/v2/artist/{artistId}/recording/{songId}/info
Headers: Authorization: Bearer {token}
```
Response: `{ "total_stream_count": "306959", ... }`

### 2. Daily Streams Timeseries
```
GET https://generic.wg.spotify.com/song-stats-view/v1/artist/{artistId}/recording/{songId}/stats
  ?country=&fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
Headers: Authorization: Bearer {token}
```
Response:
```json
{
  "streams": {
    "current_period_timeseries": [{"x": "2026-03-25", "y": "7040"}, ...],
    "current_period_agg": "63162",
    "previous_period_agg": "56408",
    "period_change_pct": 11.97
  },
  "listeners": { ... },
  "streams_per_listener": { ... },
  "playlist_adds": { ... },
  "saves": { ... }
}
```

### 3. Algorithmic/Programmed Source Aggregates (28d or 7d)
```
GET https://generic.wg.spotify.com/song-stats-view/v1/artist/{artistId}/recording/{songId}/sos-aggregates
  ?stream_sources=ALL_PROGRAMMED_SOURCES&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&stat=STREAMS
Headers: Authorization: Bearer {token}
```
Response:
```json
{
  "segmentsAggregatesMap": {
    "ALL_PROGRAMMED_SOURCES": {
      "currentPeriodAgg": "64178",
      "previousPeriodAgg": "5688"
    }
  }
}
```

### 4. Algorithmic/Programmed Source Daily Timelines
```
GET https://generic.wg.spotify.com/song-stats-view/v1/artist/{artistId}/recording/{songId}/sos-timelines
  ?stream_sources=ALL_PROGRAMMED_SOURCES&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&stat=STREAMS
Headers: Authorization: Bearer {token}
```
Response:
```json
{
  "segmentsTimelines": {
    "ALL_PROGRAMMED_SOURCES": {
      "currentPeriodTimeseries": [{"x": "2026-03-21", "y": "2399"}, ...]
    }
  }
}
```

---

## Batch Fetch Pattern (All 12 tracks in parallel)
```javascript
(async () => {
  const token = window._capturedToken;
  const artistId = '5ayyPSqoObeTOj1UGtM79C';
  const base = 'https://generic.wg.spotify.com';
  const headers = { 'Authorization': token, 'Accept': 'application/json' };
  const trackMap = { /* name → songId */ };

  const results = {};
  const promises = Object.entries(trackMap).map(async ([name, songId]) => {
    const [infoRes, statsRes, sosAggRes, sosTlRes] = await Promise.all([
      fetch(`${base}/song-stats-view/v2/artist/${artistId}/recording/${songId}/info`, { headers }),
      fetch(`${base}/song-stats-view/v1/artist/${artistId}/recording/${songId}/stats?country=&fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`, { headers }),
      fetch(`${base}/song-stats-view/v1/artist/${artistId}/recording/${songId}/sos-aggregates?stream_sources=ALL_PROGRAMMED_SOURCES&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&stat=STREAMS`, { headers }),
      fetch(`${base}/song-stats-view/v1/artist/${artistId}/recording/${songId}/sos-timelines?stream_sources=ALL_PROGRAMMED_SOURCES&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&stat=STREAMS`, { headers }),
    ]);
    // Process responses...
  });
  await Promise.all(promises);
})()
```

---

## Dead Ends / What Doesn't Work ❌

| Attempt | Result |
|---------|--------|
| `/c/_next/data/.../stats.json` (Next.js data routes) | Returns HTML, not JSON |
| `fetch(generic.wg.spotify.com, {credentials:'include'})` | CORS error |
| `stats?source=ALL_PROGRAMMED_SOURCES` | 404 — wrong param name |
| `stats?sources=...` or `stats?filter=...` | 404 |
| `stats?stat=streams` (lowercase) | Error: "No enum constant" |
| `stats?country=worldwide` | Error — must be empty string |
| `song-stats-view/v2/.../stats` | 404 — v2 has no stats endpoint |
| `s4x-insights-api/.../streams/sources` | 404 |
| Performance API to read query strings | BLOCKED by Chrome MCP security |
| `read_network_requests` for initial page load | Misses calls made before tool init |

---

## Key Learnings

1. **Token capture**: Must inject Headers interceptor BEFORE triggering any API call. Token persists in `window._capturedToken` as long as page context is alive.

2. **SPA navigation preserves interceptors**: Navigate via click (not URL) to keep interceptors alive across pages.

3. **Source of Streams UI flow**: Clicking "Source of streams" → checkbox → Done triggers `sos-aggregates` and `sos-timelines` endpoints. The page URL parameter is `sourceOfStreams=ALL_PROGRAMMED_SOURCES`.

4. **`stat` param is uppercase**: Must use `stat=STREAMS` (uppercase). Lowercase returns enum error.

5. **`country` param must be empty**: `country=` (empty string), not `country=worldwide`.

6. **Algorithmic = ALL_PROGRAMMED_SOURCES**: Includes editorial playlists + personalized playlists + other listeners' playlists. For JUST algorithmic, use individual source keys (not yet tested).

7. **GitHub push**: Use PUT with base64 content + blob SHA. Get SHA first via GET on the file.

---

## GitHub API
```
Repo: bmontado/amorfiadotracker
File: public/data.json
PAT: <see environment variable or session config>

# Get current SHA
GET https://api.github.com/repos/bmontado/amorfiadotracker/contents/public/data.json

# Push update
PUT https://api.github.com/repos/bmontado/amorfiadotracker/contents/public/data.json
Body: { "message": "...", "content": "<base64>", "sha": "<current_sha>" }
```
