(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.parseYouTubeRss = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Parse a YouTube channel RSS XML string and return an array of video objects
  // Each video: { videoId, title, url, publishedAt, description, channelId, channelTitle }
  function parseTag(block, tag) {
    // Important: double-escape backslashes inside template strings so [\\s\\S] survives
    const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return m ? decode(m[1]) : '';
  }

  function parseAttr(block, tag, attr) {
    const m = block.match(new RegExp(`<${tag}[^>]*?${attr}="([^"]+)"[^>]*?>`, 'i'));
    return m ? decode(m[1]) : '';
  }

  function decode(s) {
    return (s || '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  function parseYouTubeRss(xml) {
    if (!xml || typeof xml !== 'string') return [];
    // split by <entry> blocks
    const entries = xml.split(/<entry[\s>]/i).slice(1).map(e => '<entry ' + e);
    const headerEnd = xml.indexOf('<entry');
    const header = headerEnd > -1 ? xml.substring(0, headerEnd) : xml;
    const channelTitle = parseTag(header, 'title');
    const headerChannelId = (header.match(/<yt:channelId>([^<]+)<\/yt:channelId>/i) || [,''])[1];

    const items = [];
    for (const entry of entries) {
      const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i) || [,''])[1];
      const title = parseTag(entry, 'title');
      const link = parseAttr(entry, 'link', 'href');
      let publishedAt = parseTag(entry, 'published');
      if (!publishedAt) publishedAt = parseTag(entry, 'updated');
      const description = (entry.match(/<media:description>([\s\S]*?)<\/media:description>/i) || [,''])[1] || '';
      const entryChannelId = (entry.match(/<yt:channelId>([^<]+)<\/yt:channelId>/i) || [,''])[1] || headerChannelId;
      if (!videoId) continue;
      items.push({
        videoId,
        title,
        url: link || `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt,
        description: decode(description.trim()),
        channelId: entryChannelId,
        channelTitle
      });
    }
    return items;
  }

  return parseYouTubeRss;
});

