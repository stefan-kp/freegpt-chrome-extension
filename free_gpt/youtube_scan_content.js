// Content script injected into YouTube channels/subscriptions page to extract subscribed channels
// Enhanced: parse ytInitialData, DOM, and resolve @handle pages to UC channel IDs

(function () {
  function extractFromYtInitialData() {
    try {
      const data = window.ytInitialData || window.ytInitialDataPolyfill;
      if (!data) return [];

      const results = [];
      function walk(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (obj.channelId && typeof obj.channelId === 'string' && obj.channelId.startsWith('UC')) {
          const title = obj.title?.simpleText || obj.shortBylineText?.runs?.[0]?.text || '';
          const handle = obj.handle || obj.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || '';
          const browseId = obj.channelId;
          const url = `https://www.youtube.com/channel/${browseId}`;
          const thumbnail = obj.thumbnail?.thumbnails?.[0]?.url || '';
          results.push({ channelId: browseId, title, handle, url, thumbnail });
        }
        if (obj.browseEndpoint?.browseId && obj.browseEndpoint.browseId.startsWith('UC')) {
          const browseId = obj.browseEndpoint.browseId;
          const title = obj.title?.simpleText || obj.shortBylineText?.runs?.[0]?.text || '';
          const handle = obj.browseEndpoint?.canonicalBaseUrl || '';
          const url = `https://www.youtube.com/channel/${browseId}`;
          const thumbnail = obj.thumbnail?.thumbnails?.[0]?.url || '';
          results.push({ channelId: browseId, title, handle, url, thumbnail });
        }
        for (const k in obj) walk(obj[k]);
      }
      walk(data);

      const seen = new Set();
      return results.filter((r) => {
        if (seen.has(r.channelId)) return false;
        seen.add(r.channelId);
        return true;
      });
    } catch (e) {
      return [];
    }
  }

  function extractUCFromDOM() {
    const anchors = Array.from(document.querySelectorAll('a[href*="/channel/UC"]'));
    const channels = [];
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      const m = href.match(/\/channel\/(UC[\w-]+)/);
      if (!m) continue;
      const channelId = m[1];
      const title = (a.getAttribute('title') || a.textContent || '').trim();
      const url = new URL(href, 'https://www.youtube.com').toString();
      channels.push({ channelId, title, handle: '', url, thumbnail: '' });
    }
    const byId = new Map();
    for (const ch of channels) if (!byId.has(ch.channelId)) byId.set(ch.channelId, ch);
    return Array.from(byId.values());
  }

  function collectHandlesFromDOM(maxHandles = 300) {
    const anchors = Array.from(document.querySelectorAll('a[href^="/@"]'));
    const set = new Set();
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      if (!/^\/@[A-Za-z0-9._-]+$/.test(href)) continue; // strictish match
      set.add(href);
      if (set.size >= maxHandles) break;
    }
    return Array.from(set);
  }

  async function fetchText(url, timeoutMs = 8000) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally {
      clearTimeout(id);
    }
  }

  function parseChannelFromHtml(html, handlePath) {
    // Try a few patterns to find UC id and title
    const idMatch = html.match(/"browseId":"(UC[\w-]+)"/)
      || html.match(/"channelId":"(UC[\w-]+)"/)
      || html.match(/\/channel\/(UC[\w-]+)/);
    const channelId = idMatch ? idMatch[1] : '';
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
      || html.match(/"title":"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : '';
    const url = new URL(handlePath, 'https://www.youtube.com').toString();
    const handle = handlePath;
    return channelId ? { channelId, title, handle, url, thumbnail: '' } : null;
  }

  async function resolveHandlesToChannels(handles, concurrency = 5) {
    const results = [];
    let index = 0;
    async function worker() {
      while (index < handles.length) {
        const i = index++;
        const handlePath = handles[i];
        try {
          const html = await fetchText(new URL(handlePath, location.origin).toString());
          const ch = parseChannelFromHtml(html, handlePath);
          if (ch) results.push(ch);
        } catch (_) {
          // ignore failures
        }
      }
    }
    const workers = Array.from({ length: Math.min(concurrency, handles.length) }, () => worker());
    await Promise.all(workers);
    // Dedup by channelId
    const byId = new Map();
    for (const ch of results) if (!byId.has(ch.channelId)) byId.set(ch.channelId, ch);
    return Array.from(byId.values());
  }

  async function autoScroll(maxMs = 15000) {
    const start = Date.now();
    let lastHeight = 0;
    while (Date.now() - start < maxMs) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 400));
      const h = document.body.scrollHeight;
      if (h === lastHeight) break;
      lastHeight = h;
    }
  }

  (async function run() {
    try {
      if (!location.hostname.includes('youtube.com')) return;

      await autoScroll(6000);

      const fromInitial = extractFromYtInitialData();
      const fromDomUC = extractUCFromDOM();
      const handles = collectHandlesFromDOM();
      const resolved = await resolveHandlesToChannels(handles, 6);

      // Merge and dedup
      const byId = new Map();
      for (const arr of [fromInitial, fromDomUC, resolved]) {
        for (const ch of arr) {
          if (ch && ch.channelId && !byId.has(ch.channelId)) byId.set(ch.channelId, ch);
        }
      }
      const channels = Array.from(byId.values());

      chrome.runtime.sendMessage({ type: 'YOUTUBE_CHANNELS_FOUND', channels });
    } catch (e) {
      chrome.runtime.sendMessage({ type: 'YOUTUBE_SCAN_ERROR', error: String(e) });
    }
  })();
})();
