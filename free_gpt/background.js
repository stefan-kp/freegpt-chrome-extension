// Save current URL for manual mode
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