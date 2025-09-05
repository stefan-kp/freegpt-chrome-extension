import { t, getUserLanguage } from './translations.js';

const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000; // 14 days to test

function fmtDate(iso) {
  const d = new Date(iso);
  const lang = getUserLanguage();
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function youTubeThumbUrl(videoId) {
  // default hqdefault.jpg preview
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function effectiveDateIso(v) {
  // Prefer publishedAt when valid, else fall back to lastSeenAt/addedAt
  if (v && v.publishedAt && !isNaN(Date.parse(v.publishedAt))) return v.publishedAt;
  if (v && v.lastSeenAt && !isNaN(Date.parse(v.lastSeenAt))) return v.lastSeenAt;
  if (v && v.addedAt && !isNaN(Date.parse(v.addedAt))) return v.addedAt;
  return new Date().toISOString();
}


function iconCopyButton(onClick) {
  const btn = document.createElement('button');
  btn.className = 'icon-button';
  btn.title = t('tooltips.copy');
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>`;
  btn.addEventListener('click', onClick);
  return btn;
}

function sanitizeHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  const disallowed = new Set(['SCRIPT','IFRAME','OBJECT','EMBED','LINK','STYLE']);
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT, null);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const el of nodes) {
    if (disallowed.has(el.tagName)) { el.remove(); continue; }
    // strip event handlers and javascript: URLs
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      if (name === 'href' || name === 'src') {
        const val = attr.value.trim();
        if (val && !/^https?:\/\//i.test(val)) el.removeAttribute(attr.name);
      }
    }
    if (el.tagName === 'A') {
      el.setAttribute('target','_blank');
      el.setAttribute('rel','noopener noreferrer');
    }
  }
  return template.innerHTML;
}

function row(video) {
  const tr = document.createElement('tr');

  const tdThumb = document.createElement('td');
  tdThumb.className = 'thumb-cell';
  const img = document.createElement('img');
  img.className = 'thumb-img';
  img.loading = 'lazy';
  img.src = youTubeThumbUrl(video.videoId);
  img.alt = video.title || '';
  tdThumb.appendChild(img);

  const tdCh = document.createElement('td');
  const aCh = document.createElement('a');
// Handle close tab requests from YouTube banner
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === 'FGPT_CLOSE_TAB' && sender?.tab?.id) {
    chrome.tabs.remove(sender.tab.id).catch(()=>{});
  }
});

  aCh.href = `https://www.youtube.com/channel/${video.channelId}`;
  aCh.textContent = video.channelTitle || video.channelId;
  aCh.target = '_blank';
  tdCh.appendChild(aCh);

  const tdTitle = document.createElement('td');
  tdTitle.className = 'title-cell';
  const a = document.createElement('a');
  a.href = video.url;
  a.textContent = video.title;
  a.target = '_blank';
  tdTitle.appendChild(a);

  // Hover card with larger preview, description and published info
  const hc = document.createElement('div');
  hc.className = 'hover-card';
  const hImg = document.createElement('img');
  hImg.className = 'hc-thumb';
  hImg.loading = 'lazy';
  hImg.src = youTubeThumbUrl(video.videoId);
  hImg.alt = '';
  const hDesc = document.createElement('div');
  hDesc.className = 'hc-desc';
  hDesc.textContent = video.description || '';
  const hMeta = document.createElement('div');
  hMeta.className = 'hc-meta';
  // Show published date if valid, else watched text if present, else omit
  let metaText = '';
  if (video.publishedAt) {
    const ts = Date.parse(video.publishedAt);
    if (!isNaN(ts)) metaText = fmtDate(video.publishedAt);
  }
  if (!metaText && video.watchedAtText) metaText = video.watchedAtText;
  hc.appendChild(hImg);
  if (hDesc.textContent) hc.appendChild(hDesc);
  if (metaText) { hMeta.textContent = metaText; hc.appendChild(hMeta); }
  tdTitle.appendChild(hc);

  const tdActions = document.createElement('td');
  tdActions.className = 'actions-cell';
  const copy = iconCopyButton(async () => {
    try {
      await navigator.clipboard.writeText(video.url);
    } catch (e) {
      console.warn('Clipboard failed, falling back', e);
      const ta = document.createElement('textarea');
      ta.value = video.url; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
  });
  tdActions.appendChild(copy);

  tr.appendChild(tdThumb);
// Determine summarization capabilities and preference
async function getSummarizeCapabilities() {
  const { summarizeEngine, selectedServer, llmServerUrl } = await chrome.storage.sync.get([
    'summarizeEngine', 'selectedServer', 'llmServerUrl'
  ]);
  let availability = 'unavailable';
  try {
    if (typeof Summarizer !== 'undefined') availability = await Summarizer.availability();
  } catch (_) { availability = 'unavailable'; }
  const hasIntegrated = availability && availability !== 'unavailable';
  const llmConfigured = !!llmServerUrl;
  return { preferred: summarizeEngine || 'auto', hasIntegrated, availability, llmConfigured, selectedServer, llmServerUrl };
}

  tr.appendChild(tdCh);
  tr.appendChild(tdTitle);
  tr.appendChild(tdActions);
  return tr;
}

function renderTable(videos) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  ['','Channel', 'Title', ''].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h; trh.appendChild(th);
  });
  thead.appendChild(trh);
  const tbody = document.createElement('tbody');
  videos.forEach(v => tbody.appendChild(row(v)));
  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}

function renderByChannel(videos) {
  const container = document.createElement('div');
  const groups = new Map();
  for (const v of videos) {
    const key = v.channelTitle || v.channelId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }
  for (const [channel, items] of [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0]))) {
    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = channel;
    container.appendChild(title);
    container.appendChild(renderTable(items.sort((a,b)=> new Date(effectiveDateIso(b)) - new Date(effectiveDateIso(a)))));
  }
  return container;
}

function renderByDate(videos) {
  // Group by local day label: Today, Yesterday, or localized date
  const lang = getUserLanguage();
  const container = document.createElement('div');
  const groups = new Map();
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today.getTime() - 24*60*60*1000);

  function dayKey(d) {
    const ds = new Date(d); ds.setHours(0,0,0,0);
    if (ds.getTime() === today.getTime()) return 'TODAY';
    if (ds.getTime() === yesterday.getTime()) return 'YESTERDAY';
    try {
      return new Intl.DateTimeFormat(lang, { dateStyle: 'full' }).format(ds);
    } catch {
      return ds.toDateString();
    }
  }

  for (const v of videos) {
    const key = dayKey(effectiveDateIso(v));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }
  for (const [label, items] of groups) {
    const title = document.createElement('div');
    title.className = 'group-title';
    const human = label === 'TODAY' ? t('dates.today') : label === 'YESTERDAY' ? t('dates.yesterday') : label;
    title.textContent = human;

    // actions on the right of the title
    const actions = document.createElement('span');
    actions.className = 'group-actions';
    const sumBtn = document.createElement('button');
    sumBtn.className = 'icon-button';
    sumBtn.title = t('buttons.summarize');
    // document-text icon
    sumBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-7.5A2.25 2.25 0 0017.25 4.5h-7.5A2.25 2.25 0 007.5 6.75v10.5A2.25 2.25 0 009.75 19.5h7.5A2.25 2.25 0 0019.5 17.25z"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8.25h4.5M12 11.25h4.5M12 14.25h3"/>
      </svg>`;
    sumBtn.addEventListener('click', async () => {
      sumBtn.disabled = true;
      sumBtn.style.opacity = '0.6';
      const mount = document.createElement('div');
      mount.className = 'summary';
      mount.textContent = '… ' + t('buttons.summarize') + ' …';
      title.after(mount);
      try {
        const html = await summarizeDay(human, items, true);
        // If the result looks like markdown (starts with #, -, *, etc.), render via marked
        const looksMd = /^\s*(?:[#>*\-]|\d+\.)/.test(html || '');
        if (looksMd) {
          mount.classList.add('markdown-content');
          mount.innerHTML = sanitizeHtml(marked.parse(html));
        } else {
          mount.innerHTML = sanitizeHtml(html);
        }
      } catch (e) {
        mount.textContent = 'Summary failed.';
      } finally {
        sumBtn.disabled = false;
        sumBtn.style.opacity = '';
      }
    });
    actions.appendChild(sumBtn);
    title.appendChild(actions);

    container.appendChild(title);
    container.appendChild(renderTable(items));
  }
  return container;
}

async function summarizeDay(dayLabel, items) {
  // Prefer integrated Summarizer when available, else LLM server
  const { preferred, hasIntegrated, llmConfigured, selectedServer, llmServerUrl, llmApiKey, llmModel } = Object.assign(
    { preferred: 'auto', hasIntegrated: false, llmConfigured: false },
    await (async () => {
      const caps = await getSummarizeCapabilities();
      const more = await chrome.storage.sync.get(['llmApiKey', 'llmModel']);
      return { ...caps, ...more };
    })()
  );

  const list = items.map(v => `- Title: ${v.title}\n  URL: ${v.url}\n  Channel: ${v.channelTitle || v.channelId}\n  Description: ${v.description || ''}`).join('\n\n');

  // 1) Integrated
  if ((preferred === 'integrated' || preferred === 'auto') && hasIntegrated && typeof Summarizer !== 'undefined') {
    try {
      const availability = await Summarizer.availability();
      if (availability === 'unavailable') throw new Error('Summarizer unavailable');
      const summarizer = await Summarizer.create({ type: 'key-points', format: 'markdown', length: 'medium' });
      const text = await summarizer.summarize(
        `Videos for ${dayLabel}.\n\n${list}`,
        { context: 'Return a concise markdown summary with bullet points and short highlights.' }
      );
      return text;
    } catch (e) {
      console.warn('Integrated summarizer failed, falling back to LLM:', e);
      // fall through
    }
  }

  // 2) LLM server (fallback)
  if (!llmConfigured || !llmServerUrl) {
    alert('No summarizer available: please enable the Local Summarizer or configure an LLM server in Options.');
    return '';
  }
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (selectedServer === 'openai' && llmApiKey) headers['Authorization'] = `Bearer ${llmApiKey}`;
    else if (selectedServer === 'anthropic' && llmApiKey) { headers['x-api-key'] = llmApiKey; headers['anthropic-version'] = '2023-06-01'; }

    const sys = 'You are a helpful assistant that writes concise daily digests.';
    const user = `You are given a list of YouTube videos for ${dayLabel}. Return clean, minimal HTML only (no scripts/styles).
- Start with a short paragraph titled "Overview of Common Themes or Topics".
- Then a "Highlights" list as <ul><li>; each bullet contains an <a href> to the video URL, the title in <strong>, and a one‑line reason.
- Include channel names when helpful. Keep it concise.
Items:\n${list}`;

    let payload;
    switch (selectedServer) {
      case 'openai':
        payload = { model: llmModel, messages: [{ role:'system', content: sys }, { role:'user', content: user }], temperature: 0.5 }; break;
      case 'anthropic':
        payload = { model: llmModel, messages: [{ role:'assistant', content: sys }, { role:'user', content: user }], max_tokens: 1500 }; break;
      default: // ollama
        payload = { model: llmModel, messages: [{ role:'system', content: sys }, { role:'user', content: user }], options: { temperature: 0.5 } };
    }

    const resp = await fetch(llmServerUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
    const raw = await resp.text();
    if (!resp.ok) throw new Error(`${resp.status} ${raw}`);

    let text = raw;
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j.choices) && j.choices[0]?.message?.content) text = j.choices[0].message.content;
      else if (j.content) text = j.content;
    } catch {}

    return sanitizeHtml(text);
  } catch (e) {
    console.error('Summarize failed', e);
    throw e;
  }
}


async function loadAndRender(mode='date', sourceFilter='all') {
  const now = Date.now();
  const since = now - LOOKBACK_MS;
  const { youtubeVideos } = await chrome.storage.local.get(['youtubeVideos']);

  let allItems = Object.values(youtubeVideos?.itemsById || {});
  // source filter
  if (sourceFilter !== 'all') {
    allItems = allItems.filter(v => Array.isArray(v.sources) && v.sources.includes(sourceFilter));
  }
  const filtered = allItems.filter(v => new Date(effectiveDateIso(v)).getTime() >= since || sourceFilter !== 'channel');
  const items = filtered.sort((a,b)=> new Date(b.publishedAt)-new Date(a.publishedAt));

  const content = document.getElementById('content');
  content.innerHTML = '';

  if (!items.length) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'No videos found in the last 14 days for your channels.';
    content.appendChild(hint);
    return;
  }

  if (mode === 'date') content.appendChild(renderByDate(items));
  else content.appendChild(renderByChannel(items));
}

async function init() {
  const statusEl = document.getElementById('refreshStatus');
  document.getElementById('pageTitle').textContent = 'New Videos';
  document.getElementById('pageHint').textContent = 'Only videos from the last 7 days are shown.';

  let mode = 'date';
  const { ytSourceFilter } = await chrome.storage.sync.get(['ytSourceFilter']);
  let sourceFilter = ytSourceFilter || 'all';
  await loadAndRender(mode, sourceFilter);

  const filterEl = document.getElementById('sourceFilter');
  if (filterEl) {
    filterEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-src]');
      if (!btn) return;
      sourceFilter = btn.dataset.src;
      for (const b of filterEl.querySelectorAll('button')) b.classList.toggle('active', b===btn);
      await chrome.storage.sync.set({ ytSourceFilter: sourceFilter });
      await loadAndRender(mode, sourceFilter);
    });
  }

  function renderDebug(payload) {
    let debugEl = document.getElementById('refreshDebug');
    if (!debugEl) {
      debugEl = document.createElement('details');
      debugEl.id = 'refreshDebug';
      debugEl.className = 'hint';
      const sum = document.createElement('summary');
      sum.textContent = 'Scan results';
      debugEl.appendChild(sum);
      statusEl.after(debugEl);
    }
    if (!payload) { debugEl.style.display = 'none'; return; }
    debugEl.style.display = 'block';
    const pre = document.createElement('pre');

    // Accept either a direct RSS summary or a wrapped/channel/scrape payload
    const isRssSummary = payload && (payload.sinceIso || payload.perChannel);
    const isWrapped = payload && payload.action && payload.summary;
    const isScrape = payload && payload.action === 'scrape';

    const lines = [];
    // If a compact summary is provided, show it first
    if (payload && typeof payload.found === 'number') {
      lines.push(`Found: ${payload.found} items`);
      if (typeof payload.added === 'number' || typeof payload.updated === 'number') {
        lines.push(`Saved: +${payload.added || 0} new, ${payload.updated || 0} updated`);
      }
      if (payload.source) lines.unshift(`Source: ${payload.source}`);
      // Separator before technical details
      lines.push('');
      lines.push('Technical details:');
    }


    if (isRssSummary || isWrapped) {
      const s = isWrapped ? payload.summary : payload;
      lines.push(`Window: since ${s?.sinceIso || 'n/a'} to ${s?.nowIso || 'n/a'}`);
      (s?.perChannel || []).forEach(pc => {
        if (!pc) return;
        if (!pc.ok) {
          lines.push(`CID ${pc.channelId}: ERROR ${pc.status || pc.error}`);
        } else {
          const sampleRecent = (pc.sampleRecent || []).map(x=>`${x.id}@${x.publishedAt}`).join(', ');
          const sampleFirst = (pc.sampleAllFirst || []).map(x=>`${x.id}@${x.publishedAt}`).join(', ');
          const sampleLast = (pc.sampleAllLast || []).map(x=>`${x.id}@${x.publishedAt}`).join(', ');
          lines.push(`CID ${pc.channelId}: total ${pc.totalEntries}, recent ${pc.recentCount}, skipped ${pc.skippedOld}, earliest ${pc.earliestPublished}, latest ${pc.latestPublished}`);
          if (sampleRecent) lines.push(`  recent sample: ${sampleRecent}`);
          if (sampleFirst) lines.push(`  first sample: ${sampleFirst}`);
          if (sampleLast) lines.push(`  last sample: ${sampleLast}`);
        }
      });
    }

    if (isScrape) {
      lines.push(`Scrape: ${payload.source}`);
      (payload.steps || []).forEach((st, i) => {
        const line = `${i+1}. ${st.step || st.s} ${st.file ? '('+st.file+')' : ''}`;
        lines.push(st.meta ? `${line} ${JSON.stringify(st.meta)}` : line);
        // Expand nested content-script debug from message-received
        if ((st.step === 'message-received' || st.s === 'extracted') && st.meta && st.meta.debug) {
          const cs = st.meta.debug || {};
          lines.push(`   CS page: ${cs.page || ''}`);
          lines.push(`   CS title: ${cs.title || ''}`);
          (cs.steps || []).forEach((csSt, j) => {
            if (csSt.s === 'initial') {
              lines.push(`    - initial counts: ${JSON.stringify(csSt.counts || csSt.count || {})}`);
            } else if (csSt.s === 'waited') {
              const fields = { count: csSt.count, finalScrollY: csSt.finalScrollY, scrollH: csSt.scrollH };
              lines.push(`    - waited: ${JSON.stringify(fields)}`);
            } else if (csSt.s === 'extracted') {
              lines.push(`    - extracted: anchors=${csSt.anchorsCount}, sample=${JSON.stringify(csSt.items || [])}`);
            } else {
              lines.push(`    - ${csSt.s}`);
            }
          });
        }
      });
      if (payload.error) lines.push(`Error: ${payload.error}`);
    }

    if (!lines.length) lines.push('No details');
    pre.textContent = lines.join('\n');

    // Replace previous content after the <summary>
    debugEl.querySelectorAll('pre').forEach(n=>n.remove());
    debugEl.appendChild(pre);
  }

  document.getElementById('refreshNow').addEventListener('click', async () => {
    statusEl.textContent = 'Refreshing channels...';
    try {
      const summary = await new Promise((resolve) => chrome.runtime.sendMessage({ type: 'REQUEST_YT_SCAN' }, resolve));
      await loadAndRender(mode, sourceFilter);
      statusEl.textContent = summary && typeof summary.scanned !== 'undefined'
        ? `Channels refreshed: scanned ${summary.scanned}, ok ${summary.okFeeds}, new last 14d ${summary.recentVideos}.`
        : 'Channels refreshed.';
      renderDebug({ action: 'channels-scan', summary });
      setTimeout(()=> statusEl.textContent = '', 2500);
    } catch (e) {
      statusEl.textContent = 'Channels refresh failed.';
      renderDebug({ action: 'channels-scan', error: String(e) });
      setTimeout(()=> statusEl.textContent = '', 2000);
    }
  });

  // Ensure merge helper is available in page (via global script include as fallback)
  async function ensureMergeHelper() {
    if (typeof mergeVideos === 'function') return;
    // videos.html includes youtube_video_merge.js, but if not yet executed, load dynamically
    try {
      await import(chrome.runtime.getURL('free_gpt/youtube_video_merge.js'));
    } catch (_) {
      // ignore; global include should provide mergeVideos
    }
    if (typeof mergeVideos !== 'function') throw new Error('Failed to load merge helper');
  }

  async function waitForTabComplete(tabId, timeoutMs = 15000) {
    const start = Date.now();
    const already = await chrome.tabs.get(tabId).catch(()=>null);
    if (already && already.status === 'complete') return;
    await new Promise((resolve) => {
      function listener(id, info) {
        if (id === tabId && info.status === 'complete') {

          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
      setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); resolve(); }, timeoutMs);
    });
  }

  async function runScrape(source) {
    const debug = { action: 'scrape', source, steps: [] };
    const targetUrl = source === 'suggested' ? 'https://www.youtube.com/' : 'https://www.youtube.com/feed/history';
    statusEl.textContent = source === 'suggested' ? 'Refreshing suggested...' : 'Refreshing history...';
    try {
      const tab = await chrome.tabs.create({ url: targetUrl, active: true });
      const tabId = tab.id;
      debug.steps.push({ step: 'tab-created', tabId, active: true });

      await waitForTabComplete(tabId);
      debug.steps.push({ step: 'tab-complete' });

      // Attach a MAIN-world listener for console logs (development-only gate removed to avoid await inside non-async)
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: () => {
            try {
              if (!window.__FGPT_LISTENER__) {
                window.__FGPT_LISTENER__ = true;
                window.addEventListener('message', (e) => {
                  try { const m = e && e.data; if (m && m.__FGPT_LOG__) console.log('[FGPT][msg]', m.tag, m.data); } catch {}
                }, { passive: true });
                console.log('[FGPT] listener attached');
              }
            } catch (err) { console.warn('[FGPT] listener attach failed', err); }
          }
        });
        debug.steps.push({ step: 'listener-injected' });
      } catch (err) {
        debug.steps.push({ step: 'listener-inject-failed', error: String(err) });
      }

      const file = source === 'suggested' ? 'free_gpt/youtube_parse_start.js' : 'free_gpt/youtube_parse_history.js';
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: [file] });
        debug.steps.push({ step: 'script-injected', file, mode: 'files' });
      } catch (e) {
        // Fallback: inline scraper function injection (isolated world), with broader selectors and wait
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (src) => {
            const sleep = (ms) => new Promise(r=>setTimeout(r, ms));
            const absUrl = (href) => { try { return new URL(href, location.origin).toString(); } catch { return href; } };
            const getVid = (href) => { try { const u = new URL(absUrl(href)); const v = u.searchParams.get('v'); if (v) return v; } catch{} const m=(href||'').match(/[?&]v=([^&]+)/); return m?decodeURIComponent(m[1]):''; };
            const collectAnchors = () => {
              const groups = {
                watchHref: Array.from(document.querySelectorAll('a[href*="/watch?v="]')),
                videoTitle: Array.from(document.querySelectorAll('ytd-video-renderer a#video-title, ytd-compact-video-renderer a#video-title, ytd-rich-item-renderer a#video-title, a#video-title-link, a.yt-lockup-metadata-view-model__title')),
                thumbnail: Array.from(document.querySelectorAll('a#thumbnail[href*="/watch"]')),
                lockup: Array.from(document.querySelectorAll('yt-lockup-view-model a[href^="/watch"]'))
              };
              return [...new Set([].concat(...Object.values(groups)))];
            };
            const waitForAnchors = async (min=30, untilMs=12000) => {
              const start = Date.now();
              while (Date.now()-start < untilMs){
                const a = collectAnchors();
                if (a.length >= min) return a;
                window.scrollTo(0, document.body.scrollHeight);
                await sleep(500);
              }
              return collectAnchors();
            };
            const getTitle = (root, a) => {
              let t='';
              const h3 = root?.querySelector('h3.yt-lockup-metadata-view-model__heading-reset[title]');
              if (h3 && (t=h3.getAttribute('title')?.trim())) return t;
              const span = root?.querySelector('a.yt-lockup-metadata-view-model__title .yt-core-attributed-string');
              if (span && (t=span.textContent?.trim())) return t;
              const vt = root?.querySelector('a#video-title, yt-formatted-string#video-title');
              if (vt && (t=vt.textContent?.trim())) return t;
              if (a && a.matches?.('a#video-title, a#video-title-link, a.yt-lockup-metadata-view-model__title') && (t=a.textContent?.trim())) return t;
              const at = a?.getAttribute?.('title'); if (at && (t=at.trim())) return t;
              return (a?.textContent||'').trim();
            };
            const scrape = (anchors, max) => {
              const seen=new Set(); const items=[];
              for (const a of anchors){
                const href=a.getAttribute('href')||a.href||''; const id=getVid(href); if(!id||seen.has(id)) continue; seen.add(id);
                const root=a.closest('ytd-video-renderer, ytd-rich-item-renderer, ytd-grid-video-renderer, yt-lockup-view-model, #content, ytd-compact-video-renderer')||a.parentElement;
                const title=getTitle(root, a);
                let channelTitle='', channelId='';
                if(root){ const chA=root.querySelector('a[href^="/channel/"]')||root.querySelector('a[href^="/@"]'); if(chA){ channelTitle=(chA.textContent||'').trim(); const chHref=chA.getAttribute('href')||''; const m=chHref.match(/\/channel\/([^/?#]+)/); if(m) channelId=m[1]; } }
                items.push({ videoId:id, title, url: absUrl(href), channelId, channelTitle, publishedAt:'', description:'' });
                if(items.length>=max) break;
              }
              return items;
            };
            (async () => {
              const debug = { page: location.href, title: document.title, steps: [] };
              try {
                let anchors = collectAnchors();
                debug.steps.push({ s:'initial', count: anchors.length });
                if (anchors.length < 30) { anchors = await waitForAnchors(30, 12000); debug.steps.push({ s:'waited', count: anchors.length }); }
                const items = scrape(anchors, src==='suggested'?120:200);
                debug.steps.push({ s:'extracted', anchorsCount: anchors.length, items: items.slice(0,3).map(x=>x.videoId) });
                chrome.runtime.sendMessage({ type:'YOUTUBE_SCRAPE_RESULT', source: src, items, debug });
              } catch (err) {
                debug.error = String(err);
                chrome.runtime.sendMessage({ type:'YOUTUBE_SCRAPE_RESULT', source: src, items: [], debug });
              }
            })();
          },
          args: [source]
        });
        debug.steps.push({ step: 'script-injected', file, mode: 'inline-fallback', error: String(e) });
      }

      const result = await new Promise((resolve) => {
        const t = setTimeout(()=> resolve({ items: [], timeout: true }), 15000);
        function onMsg(msg, sender){
          if (sender.tab && sender.tab.id===tabId && msg && msg.type==='YOUTUBE_SCRAPE_RESULT'){
            chrome.runtime.onMessage.removeListener(onMsg);
            clearTimeout(t);
            resolve(msg);
          }
        }
        // Also listen from pages that post via window to service worker relay (future-proof)
        chrome.runtime.onMessage.addListener(onMsg);
      });
      debug.steps.push({ step: 'message-received', meta: { timeout: !!result.timeout, items: (result.items||[]).length, debug: result.debug || null } });

      // Always keep open; store last scan tab id for banner close
      window.__FGPT_LAST_SCAN_TAB_ID__ = tabId;
      debug.steps.push({ step: 'tab-kept-open', tabId });

      const items = result.items || [];
      if (items.length) {
        await ensureMergeHelper();
        const { youtubeVideos } = await chrome.storage.local.get(['youtubeVideos']);
        const res = mergeVideos(youtubeVideos?.itemsById || {}, items, source);
        const payload = { youtubeVideos: { itemsById: res.itemsById, lastScanAt: new Date().toISOString() } };
        await chrome.storage.local.set(payload);
        await loadAndRender(mode, sourceFilter);
        statusEl.textContent = source === 'suggested'
          ? `Suggested: found ${items.length}, saved +${res.added} new, ${res.updated} updated.`
          : `History: found ${items.length}, saved +${res.added} new, ${res.updated} updated.`;
        // Always inject a completion banner into the YouTube tab (MAIN world)
        try {
          await chrome.scripting.executeScript({
            target: { tabId }, world: 'MAIN',
            args: [source, items.length],
            func: (src, count) => {
              try {
                // Create or update banner
                const id = '__fgpt_scan_banner__';
                let el = document.getElementById(id);
                if (!el) {
                  el = document.createElement('div');
                  el.id = id;
                  el.style.cssText = [
                    'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483647',
                    'background:rgba(20,23,26,.96)', 'color:#e6ffe6', 'box-shadow:0 4px 14px rgba(0,0,0,.3)',
                    'border-radius:10px', 'padding:12px 14px', 'max-width:340px', 'font:13px/1.45 system-ui,Segoe UI,Roboto,Helvetica,Arial',
                    'border:1px solid rgba(90,180,90,.5)'
                  ].join(';');
                  const btn = document.createElement('button');
                  btn.textContent = 'Close Tab';
                  btn.style.cssText = [
                    'margin-left:10px', 'padding:6px 10px', 'border-radius:6px', 'border:1px solid #2a7', 'background:#2a7', 'color:white', 'cursor:pointer'
                  ].join(';');
                  btn.addEventListener('click', () => { try { window.postMessage({ __FGPT_REQUEST_CLOSE__: true }, '*'); } catch {} });
                  const msg = document.createElement('span');
                  msg.className = 'msg';
                  el.appendChild(msg);
                  el.appendChild(btn);
                  document.documentElement.appendChild(el);
                }
                const msg = el.querySelector('.msg');
                if (msg) msg.textContent = `Scan complete (${src}): found ${count} items.`;
              } catch (e) {
                // ignore
              }
            }
          });
          // Relay for close message (isolated world)
          await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              try {
                if (!window.__FGPT_CLOSE_RELAY__) {
                  window.__FGPT_CLOSE_RELAY__ = true;
                  window.addEventListener('message', (e) => {
                    const m = e && e.data; if (m && m.__FGPT_REQUEST_CLOSE__) {
                      chrome.runtime.sendMessage({ type: 'FGPT_CLOSE_TAB' }).catch(()=>{});
                    }
                  });
                }
              } catch {}
            }
          });
        } catch {}
      } else {
        statusEl.textContent = 'Nothing found.';
        // Also show completion banner with 0 items to meet UX expectation
        try {
          await chrome.scripting.executeScript({
            target: { tabId }, world: 'MAIN',
            args: [source, 0],
            func: (src, count) => {
              try {
                const id = '__fgpt_scan_banner__';
                let el = document.getElementById(id);
                if (!el) {
                  el = document.createElement('div');
                  el.id = id;
                  el.style.cssText = [
                    'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483647',
                    'background:rgba(20,23,26,.96)', 'color:#e6ffe6', 'box-shadow:0 4px 14px rgba(0,0,0,.3)',
                    'border-radius:10px', 'padding:12px 14px', 'max-width:340px', 'font:13px/1.45 system-ui,Segoe UI,Roboto,Helvetica,Arial',
                    'border:1px solid rgba(90,180,90,.5)'
                  ].join(';');
                  const btn = document.createElement('button');
                  btn.textContent = 'Close Tab';
                  btn.style.cssText = [
                    'margin-left:10px', 'padding:6px 10px', 'border-radius:6px', 'border:1px solid #2a7', 'background:#2a7', 'color:white', 'cursor:pointer', 'display:inline-block'
                  ].join(';');
                  btn.addEventListener('click', () => { try { window.postMessage({ __FGPT_REQUEST_CLOSE__: true }, '*'); } catch {} });
      // Provide compact scan results summary to the panel
      renderDebug({ action: 'scrape', source, found: items.length, added: res.added, updated: res.updated, steps: debug.steps, meta: debug });

                  const msg = document.createElement('span');
                  msg.className = 'msg';
                  el.appendChild(msg);
                  el.appendChild(btn);
                  document.documentElement.appendChild(el);
                }
                const msg = el.querySelector('.msg');
                if (msg) msg.textContent = `Scan complete (${src}): found ${count} items.`;
              } catch (e) {}
          // Provide compact scan results summary to the panel (ensure once)
          try { renderDebug({ action: 'scrape', source, found: items.length, added: res.added, updated: res.updated, steps: debug.steps, meta: debug }); } catch {}

            }
          });
          await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              try {
                if (!window.__FGPT_CLOSE_RELAY__) {
                  window.__FGPT_CLOSE_RELAY__ = true;
                  window.addEventListener('message', (e) => {
                    const m = e && e.data; if (m && m.__FGPT_REQUEST_CLOSE__) {
                      chrome.runtime.sendMessage({ type: 'FGPT_CLOSE_TAB' }).catch(()=>{});
                    }
                  });
                }
              } catch {}
            }
          });
        } catch {}
      }
      renderDebug(debug);
      setTimeout(()=> statusEl.textContent = '', 2500);
    } catch (e) {
      statusEl.textContent = 'Refresh failed.';
      renderDebug({ action: 'scrape', source, error: String(e) });
      setTimeout(()=> statusEl.textContent = '', 2000);
    }
  }

  document.getElementById('refreshSuggested').addEventListener('click', ()=> runScrape('suggested'));
  document.getElementById('refreshHistory').addEventListener('click', ()=> runScrape('history'));

  // Mark as viewed so the badge can clear
  await chrome.storage.local.set({ lastVideosViewedAt: new Date().toISOString() });
  // Ask background to recompute badge now
  chrome.runtime.sendMessage({ type: 'REQUEST_BADGE_REFRESH' });
}

init();

