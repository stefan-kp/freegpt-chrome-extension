// Utility for merging YouTube channel lists
// Keeps changes small and focused; attaches function to window for use in options.js

(function () {
  function mergeYouTubeChannels(existingChannels = [], newChannels = []) {
    const byId = new Map();
    const now = new Date().toISOString();

    // Seed with existing
    for (const ch of existingChannels) {
      if (!ch || !ch.channelId) continue;
      byId.set(ch.channelId, { ...ch });
    }

    // Merge new
    for (const ch of newChannels) {
      if (!ch || !ch.channelId) continue;
      const prev = byId.get(ch.channelId);
      if (prev) {
        byId.set(ch.channelId, {
          ...prev,
          title: ch.title || prev.title,
          handle: ch.handle || prev.handle,
          url: ch.url || prev.url,
          thumbnail: ch.thumbnail || prev.thumbnail,
          updatedAt: now,
        });
      } else {
        byId.set(ch.channelId, {
          channelId: ch.channelId,
          title: ch.title || '',
          handle: ch.handle || '',
          url: ch.url || `https://www.youtube.com/channel/${ch.channelId}`,
          thumbnail: ch.thumbnail || '',
          addedAt: now,
          updatedAt: now,
        });
      }
    }

    // Return array sorted by title for stability
    return Array.from(byId.values()).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  if (typeof window !== 'undefined') {
    window.mergeYouTubeChannels = mergeYouTubeChannels;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mergeYouTubeChannels };
  }
})();

