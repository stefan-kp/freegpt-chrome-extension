// Save current URL for manual mode
// YouTube RSS polling and badge updates
importScripts('youtube_rss_parser.js');
importScripts('youtube_video_merge.js');

const YT_RSS_BASE = 'https://www.youtube.com/feeds/videos.xml?channel_id=';
const TWO_HOURS_MINUTES = 120;
const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000; // 14 days for testing
const MAX_VIDEOS = 50;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('yt-rss-scan', { delayInMinutes: 1, periodInMinutes: TWO_HOURS_MINUTES });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('yt-rss-scan', { delayInMinutes: 1, periodInMinutes: TWO_HOURS_MINUTES });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'yt-rss-scan') {
    scanYouTubeFeeds().catch(err => console.error('YT scan error', err));
  }
});

async function scanYouTubeFeeds() {
  const { youtubeSubscriptions, youtubeVideos, lastVideosViewedAt } = await chrome.storage.local.get([
    'youtubeSubscriptions', 'youtubeVideos', 'lastVideosViewedAt'
  ]);
  const channels = youtubeSubscriptions?.channels || [];
  const summary = { scanned: channels.length, okFeeds: 0, recentVideos: 0, errors: [] };
  if (!channels.length) {
    await chrome.storage.local.set({ youtubeScanSummary: { ...summary, note: 'no-channels' } });
    return summary;
  }

  const now = Date.now();
  const since = now - LOOKBACK_MS;
  summary.sinceIso = new Date(since).toISOString();
  summary.nowIso = new Date(now).toISOString();

  const itemsById = { ...(youtubeVideos?.itemsById || {}) };
  // Migration: for pre-source entries, assume they came from RSS channels
  try {
    const nowIso = new Date().toISOString();
    for (const v of Object.values(itemsById)) {
      if (!Array.isArray(v.sources)) v.sources = ['channel'];
      if (!v.addedAt) v.addedAt = v.publishedAt || nowIso;
      if (!v.lastSeenAt) v.lastSeenAt = nowIso;
    }
  } catch (_) { /* no-op */ }
  const updatedChannels = [];

  summary.perChannel = [];
  for (const ch of channels) {
    try {
      const url = YT_RSS_BASE + encodeURIComponent(ch.channelId);
      const resp = await fetch(url);
      if (!resp.ok) {
        if (summary.errors.length < 5) summary.errors.push({ channelId: ch.channelId, status: resp.status });
        summary.perChannel.push({ channelId: ch.channelId, ok: false, status: resp.status });
        continue;
      }
      const xml = await resp.text();
      const all = parseYouTubeRss(xml);
      // compute date range in feed
      let minTs = Number.POSITIVE_INFINITY, maxTs = 0;
      for (const a of all) {
        const ts = new Date(a.publishedAt).getTime();
        if (isFinite(ts)) {
          if (ts < minTs) minTs = ts;
          if (ts > maxTs) maxTs = ts;
        }
      }
      const items = all.filter(v => new Date(v.publishedAt).getTime() >= since).slice(0, MAX_VIDEOS);
      summary.okFeeds += 1;
      summary.recentVideos += items.length;
      let newest = null;
      if (typeof mergeVideos === 'function') {
        const res = mergeVideos(itemsById, items, 'channel');
        for (const v of items) {
          if (!newest || new Date(v.publishedAt) > new Date(newest.publishedAt)) newest = v;
        }
      } else {
        for (const v of items) {
          itemsById[v.videoId] = { ...v, sources: ['channel'], addedAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() };
          if (!newest || new Date(v.publishedAt) > new Date(newest.publishedAt)) newest = v;
        }
      }
      updatedChannels.push({ ...ch,
        lastRssCheckedAt: new Date().toISOString(),
        lastVideoId: newest?.videoId || ch.lastVideoId,
        lastVideoTitle: newest?.title || ch.lastVideoTitle
      });
      summary.perChannel.push({
        ok: true,
        channelId: ch.channelId,
        channelTitle: all[0]?.channelTitle || ch.title || '',
        totalEntries: all.length,
        recentCount: items.length,
        skippedOld: Math.max(0, all.length - items.length),
        earliestPublished: isFinite(minTs) ? new Date(minTs).toISOString() : null,
        latestPublished: isFinite(maxTs) ? new Date(maxTs).toISOString() : null,
        sampleAllFirst: all.slice(0, 3).map(v => ({ id: v.videoId, publishedAt: v.publishedAt, title: v.title })),
        sampleAllLast: all.slice(-3).map(v => ({ id: v.videoId, publishedAt: v.publishedAt, title: v.title })),
        sampleRecent: items.slice(0, 3).map(v => ({ id: v.videoId, publishedAt: v.publishedAt, title: v.title }))
      });
    } catch (e) {
      if (summary.errors.length < 5) summary.errors.push({ channelId: ch.channelId, error: String(e) });
      summary.perChannel.push({ channelId: ch.channelId, ok: false, error: String(e) });
      console.warn('RSS fetch failed for', ch.channelId, e);
    }
  }

  // Persist videos and channels
  const videosPayload = {
    itemsById,
    lastScanAt: new Date().toISOString()
  };
  const subsPayload = {
    ...(youtubeSubscriptions || {}),
    channels: updatedChannels.length ? updatedChannels : channels
  };
  await chrome.storage.local.set({ youtubeVideos: videosPayload, youtubeSubscriptions: subsPayload, youtubeScanSummary: summary });

  // Update action badge with count of new since last view
  await updateBadgeCount(itemsById, lastVideosViewedAt);
  return summary;
}

async function updateBadgeCount(itemsById, lastViewedIso) {
  const lastViewed = lastViewedIso ? new Date(lastViewedIso).getTime() : 0;
  const now = Date.now();
  const since = now - LOOKBACK_MS;
  const videos = Object.values(itemsById || {});
  const count = videos.filter(v => {
    const ts = new Date(v.publishedAt).getTime();
    return ts >= since && ts > lastViewed;
  }).length;
  try {
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    chrome.action.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : '' });
  } catch (e) {
    // Some Chromium variants may not support setBadgeBackgroundColor
    chrome.action.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : '' });
  }
}

// Allow UI pages to request actions: badge refresh or immediate scan
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'REQUEST_BADGE_REFRESH') {
    chrome.storage.local.get(['youtubeVideos', 'lastVideosViewedAt']).then(({ youtubeVideos, lastVideosViewedAt }) => {
      updateBadgeCount(youtubeVideos?.itemsById || {}, lastVideosViewedAt);
      sendResponse && sendResponse({ ok: true });
    });
    return true; // keep channel open
  }
  if (msg?.type === 'REQUEST_YT_SCAN') {
    scanYouTubeFeeds()
      .then(async (summary) => {
        const { youtubeVideos, lastVideosViewedAt } = await chrome.storage.local.get(['youtubeVideos', 'lastVideosViewedAt']);
        await updateBadgeCount(youtubeVideos?.itemsById || {}, lastVideosViewedAt);
        sendResponse && sendResponse(summary || { ok: true });
      })
      .catch((e)=>{ sendResponse && sendResponse({ ok:false, error: String(e) }); })
    ;
    return true; // async
  }
});


let currentUrl = null;

// Simplified translation function for background script
const t = (key) => {
  const translations = {
    de: {
      errors: {
        server_url_not_configured: 'Track-Server URL ist nicht konfiguriert'
      },
      settings: {
        url_tracking: 'URL Tracking'
      },
      success: {
        url_saved: 'URL erfolgreich gespeichert'
      }
    },
    en: {
      errors: {
        server_url_not_configured: 'Track server URL is not configured'
      },
      settings: {
        url_tracking: 'URL tracking'
      },
      success: {
        url_saved: 'URL successfully saved'
      }
    }
  };

  const lang = navigator.language?.split('-')[0] || 'en';
  const userLang = translations[lang] ? lang : 'en';

  const keys = key.split('.');
  let value = translations[userLang];

  for (const k of keys) {
    value = value[k];
    if (!value) return key;
  }

  return value;
};

chrome.webNavigation.onCompleted.addListener(async (details) => {
  const { serverUrl, mode, includeContent, enableUrlTracker } = await new Promise((resolve) =>
    chrome.storage.sync.get(['serverUrl', 'mode', 'includeContent', 'enableUrlTracker'], resolve)
  );

  // Only proceed if URL tracking is enabled
  if (!enableUrlTracker) return;

  if (!serverUrl) {
    console.debug(t('errors.server_url_not_configured'));
    return;
  }

  const url = details.url;
  console.log(`${t('settings.url_tracking')}: ${mode}, URL: ${details.url}`);

  if (mode === 'automatic') {
    const content = includeContent === 'url_with_content' ? await getPageContent(details.tabId) : null;
    sendToServer(serverUrl, url, content);
  }
});

// Function to get webpage content
async function getPageContent(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.body.innerText.trim()
  }).then(([result]) => result.result).catch((err) => {
    console.error('Error getting page content:', err);
    return null;
  });
}

// Function to send data to server
async function sendToServer(serverUrl, url, content) {
  const payload = { url };
  if (content) payload.content = content;

  try {
    await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(t('success.url_saved'), payload);
  } catch (error) {
    console.error('Server error:', error);
  }
}