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
  hMeta.textContent = fmtDate(video.publishedAt);
  hc.appendChild(hImg);
  if (hDesc.textContent) hc.appendChild(hDesc);
  hc.appendChild(hMeta);
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
    container.appendChild(renderTable(items.sort((a,b)=> new Date(b.publishedAt)-new Date(a.publishedAt))));
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
    const key = dayKey(v.publishedAt);
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
        mount.innerHTML = sanitizeHtml(html);
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
  try {
    const { selectedServer, llmServerUrl, llmApiKey, llmModel } = await new Promise((resolve) =>
      chrome.storage.sync.get(['selectedServer', 'llmServerUrl', 'llmApiKey', 'llmModel'], resolve)
    );
    if (!llmServerUrl) {
      alert('LLM not configured');
      return;
    }
    const headers = { 'Content-Type': 'application/json' };
    if (selectedServer === 'openai' && llmApiKey) headers['Authorization'] = `Bearer ${llmApiKey}`;
    else if (selectedServer === 'anthropic' && llmApiKey) { headers['x-api-key'] = llmApiKey; headers['anthropic-version'] = '2023-06-01'; }

    const list = items.map(v => `- Title: ${v.title}\n  URL: ${v.url}\n  Channel: ${v.channelTitle || v.channelId}\n  Description: ${v.description || ''}`).join('\n\n');
    const sys = 'You are a helpful assistant that writes concise daily digests.';
    const user = `You are given a list of YouTube videos for ${dayLabel}. Return clean, minimal HTML only (no scripts/styles).
- Start with a short paragraph titled "Overview of Common Themes or Topics".
- Then a "Highlights" list as <ul><li>; each bullet contains an <a href> to the video URL, the title in <strong>, and a one‑line reason.
- Include channel names when helpful. Keep it concise.
Items:
${list}`;

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


async function loadAndRender(mode='date') {
  const now = Date.now();
  const since = now - LOOKBACK_MS;
  const { youtubeVideos } = await chrome.storage.local.get(['youtubeVideos']);

  const allItems = Object.values(youtubeVideos?.itemsById || {});
  const filtered = allItems.filter(v => new Date(v.publishedAt).getTime() >= since);
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
  await loadAndRender(mode);

  document.getElementById('sortByDate').addEventListener('click', async ()=>{ mode='date'; await loadAndRender(mode); });
  document.getElementById('sortByChannel').addEventListener('click', async ()=>{ mode='channel'; await loadAndRender(mode); });

  function renderDebug(summary) {
    let debugEl = document.getElementById('refreshDebug');
    if (!debugEl) {
      debugEl = document.createElement('details');
      debugEl.id = 'refreshDebug';
      debugEl.className = 'hint';
      const sum = document.createElement('summary');
      sum.textContent = 'Scan debug';
      debugEl.appendChild(sum);
      statusEl.after(debugEl);
    }
    if (!summary) { debugEl.style.display = 'none'; return; }
    debugEl.style.display = 'block';
    const pre = document.createElement('pre');
    const lines = [];
    lines.push(`Window: since ${summary.sinceIso} to ${summary.nowIso}`);
    (summary.perChannel || []).forEach(pc => {
      if (!pc) return;
      if (!pc.ok) {
        lines.push(`CID ${pc.channelId}: ERROR ${pc.status || pc.error}`);
      } else {
        const sampleRecent = (pc.sampleRecent || []).map(s=>`${s.id}@${s.publishedAt}`).join(', ');
        const sampleFirst = (pc.sampleAllFirst || []).map(s=>`${s.id}@${s.publishedAt}`).join(', ');
        const sampleLast = (pc.sampleAllLast || []).map(s=>`${s.id}@${s.publishedAt}`).join(', ');
        lines.push(`CID ${pc.channelId}: total ${pc.totalEntries}, recent ${pc.recentCount}, skipped ${pc.skippedOld}, earliest ${pc.earliestPublished}, latest ${pc.latestPublished}`);
        if (sampleRecent) lines.push(`  recent sample: ${sampleRecent}`);
        if (sampleFirst) lines.push(`  first sample: ${sampleFirst}`);
        if (sampleLast) lines.push(`  last sample: ${sampleLast}`);
      }
    });
    pre.textContent = lines.join('\n') || 'No per-channel details';
    // Replace previous content after the <summary>
    debugEl.querySelectorAll('pre').forEach(n=>n.remove());
    debugEl.appendChild(pre);
  }

  document.getElementById('refreshNow').addEventListener('click', async () => {
    statusEl.textContent = 'Refreshing...';
    try {
      const summary = await new Promise((resolve) => chrome.runtime.sendMessage({ type: 'REQUEST_YT_SCAN' }, resolve));
      await loadAndRender(mode);
      if (summary && typeof summary.scanned !== 'undefined') {
        statusEl.textContent = `Refreshed: scanned ${summary.scanned}, feeds ok ${summary.okFeeds}, new last 14d ${summary.recentVideos}.`;
      } else {
        statusEl.textContent = 'Refreshed.';
      }
      renderDebug(summary);
      setTimeout(()=> statusEl.textContent = '', 2500);
    } catch (e) {
      statusEl.textContent = 'Refresh failed.';
      setTimeout(()=> statusEl.textContent = '', 2000);
    }
  });

  // Mark as viewed so the badge can clear
  await chrome.storage.local.set({ lastVideosViewedAt: new Date().toISOString() });
  // Ask background to recompute badge now
  chrome.runtime.sendMessage({ type: 'REQUEST_BADGE_REFRESH' });
}

init();

