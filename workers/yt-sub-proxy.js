const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=3600'
};
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';
const FALLBACK_INVIDIOUS = ['https://invidious.f5.si', 'https://inv.nadeko.net', 'https://yewtu.be'];
const EMBED_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const EMBED_CLIENT_VERSION = '2.20260922.01.00';

const json = (value, status = 200, extra = {}) => new Response(JSON.stringify(value), {
  status, headers: { ...CORS, ...extra }
});
const round = n => Math.round(n * 100) / 100;

function splitCue(cue) {
  const text = String(cue.text || '').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  if (text.length <= 180) return [{ ...cue, text }];
  const parts = text.match(/.{1,150}(?:[.!?。！？；;，,]|$)/g)?.map(x => x.trim()).filter(Boolean) || [text];
  const total = Math.max(0.5, cue.end - cue.start);
  const weight = parts.reduce((n, x) => n + x.length, 0) || 1;
  let cursor = cue.start;
  return parts.map((part, i) => {
    const duration = i === parts.length - 1 ? cue.end - cursor : total * part.length / weight;
    const item = { start: cursor, end: Math.max(cursor + 0.05, cursor + duration), text: part };
    cursor = item.end;
    return item;
  });
}

function eventsToCues(events) {
  return (events || []).flatMap(event => {
    const text = (event.segs || []).map(seg => seg.utf8 || '').join('').replace(/\n/g, ' ').trim();
    if (!text) return [];
    const start = Number(event.tStartMs || 0) / 1000;
    const end = start + Math.max(0.5, Number(event.dDurationMs || 0) / 1000);
    return splitCue({ start, end, text });
  });
}

function decodeXml(value) {
  return String(value || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
}
function parseVtt(text) {
  const rows = String(text || '').replace(/^\uFEFF/, '').replace(/\r/g, '').split(/\n\s*\n/);
  return rows.flatMap(block => {
    const lines = block.split('\n').map(x => x.trim()).filter(Boolean);
    const at = lines.findIndex(x => x.includes('-->'));
    if (at < 0) return [];
    const [a, b] = lines[at].split(/\s+-->\s+/);
    const time = x => { const p = x.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
    const text = lines.slice(at + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    return text ? splitCue({ start: time(a), end: Math.max(time(b.split(/\s+/)[0]), time(a) + 0.5), text }) : [];
  });
}
async function parseCaptionResponse(response) {
  const text = await response.text();
  if (!text.trim()) return [];
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data.events)) return eventsToCues(data.events);
    if (Array.isArray(data.captions)) return data.captions.flatMap(x => splitCue({ start: Number(x.start), end: Number(x.end), text: x.text || x.label || '' }));
  } catch (_) {}
  return parseVtt(text);
}
async function getInnerTubeTracks(videoId) {
  let html = '';
  try {
    const embed = await fetch(`https://www.youtube.com/embed/${videoId}?hl=en`, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' } });
    html = await embed.text();
  } catch (_) {}
  const get = key => html.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)`))?.[1];
  const key = get('INNERTUBE_API_KEY') || EMBED_API_KEY;
  const clientName = get('INNERTUBE_CLIENT_NAME') || 'WEB_EMBEDDED_PLAYER';
  const clientVersion = get('INNERTUBE_CLIENT_VERSION') || EMBED_CLIENT_VERSION;
  const payload = {
    context: { client: { clientName, clientVersion, hl: 'en', gl: 'US' } },
    videoId,
    contentCheckOk: true,
    racyCheckOk: true
  };
  const response = await fetch(`https://youtubei.googleapis.com/youtubei/v1/player?key=${encodeURIComponent(key)}&prettyPrint=false`, {
    method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/json', 'Origin': 'https://www.youtube.com', 'Referer': `https://www.youtube.com/embed/${videoId}` }, body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`InnerTube HTTP ${response.status}`);
  const data = await response.json();
  const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  if (!tracks.length) throw new Error(data.playabilityStatus?.reason || 'InnerTube returned no caption tracks');
  return tracks.map(track => ({ languageCode: track.languageCode, name: track.name?.simpleText || '', baseUrl: track.baseUrl }));
}
async function getInvidiousTrack(videoId, lang, tlang) {
  for (const base of FALLBACK_INVIDIOUS) {
    try {
      const response = await fetch(`${base}/api/v1/captions/${videoId}?lang=${encodeURIComponent(lang)}${tlang ? `&tlang=${encodeURIComponent(tlang)}` : ''}`, { headers: { 'User-Agent': UA } });
      if (!response.ok) continue;
      const data = await response.json();
      const item = data.captions?.find(x => x.languageCode === lang) || data.captions?.[0];
      if (item?.url) return { baseUrl: item.url, translatedUrl: item.url };
    } catch (_) {}
  }
  throw new Error('Caption providers unavailable');
}
async function translateBatch(lines, target) {
  const output = [];
  for (let i = 0; i < lines.length; i += 30) {
    const batch = lines.slice(i, i + 30);
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(batch.join('\n'))}`;
      const response = await fetch(url, { headers: { 'User-Agent': UA } });
      const data = await response.json();
      const translated = (data[0] || []).map(x => x[0] || '').join('');
      const parts = translated.split(/\n/);
      output.push(...batch.map((_, j) => parts[j] || ''));
    } catch (_) { output.push(...batch.map(() => '')); }
  }
  return output;
}

addEventListener('fetch', event => event.respondWith(handle(event.request)));

async function handle(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const videoId = url.searchParams.get('v') || '';
    const lang = url.searchParams.get('lang') || 'en';
    const tlang = url.searchParams.get('tlang') || 'zh-Hant';
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return json({ error: 'Invalid or missing video id (v)' }, 400);
    try {
      let tracks;
      try {
        tracks = await getInnerTubeTracks(videoId);
      } catch (error) {
        try {
          tracks = [await getInvidiousTrack(videoId, lang, tlang)];
        } catch (fallbackError) {
          throw new Error('Caption providers unavailable');
        }
      }
      const track = tracks.find(x => x.languageCode === lang) || tracks.find(x => x.languageCode?.startsWith(lang.split('-')[0])) || tracks[0];
      if (!track?.baseUrl) throw new Error('No captions found for this video');
      const originalResponse = await fetch(`${track.baseUrl}${track.baseUrl.includes('?') ? '&' : '?'}fmt=json3`, { headers: { 'User-Agent': UA } });
      let original = await parseCaptionResponse(originalResponse);
      if (!original.length) {
        const fallback = await fetch(track.baseUrl, { headers: { 'User-Agent': UA } });
        original = await parseCaptionResponse(fallback);
      }
      if (!original.length) throw new Error('Caption track returned no cues');
      let secondary = [];
      if (tlang && tlang !== 'none' && tlang !== lang) {
        try {
          const translatedResponse = await fetch(`${track.baseUrl}${track.baseUrl.includes('?') ? '&' : '?'}fmt=json3&tlang=${encodeURIComponent(tlang)}`, { headers: { 'User-Agent': UA } });
          secondary = await parseCaptionResponse(translatedResponse);
        } catch (_) {}
        if (!secondary.length) secondary = (await translateBatch(original.map(x => x.text), tlang)).map((text, i) => ({ ...original[i], text }));
      }
      const captions = original.map((cue, i) => ({ start: round(cue.start), end: round(cue.end), primary: cue.text, secondary: secondary[i]?.text || '' })).filter(x => x.primary || x.secondary);
      return json({ captions }, 200, { 'Cache-Control': 'public, max-age=86400' });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Caption lookup failed' }, 404);
    }
}
