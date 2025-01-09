import { t } from './translations.js';

// Speichere die aktuelle URL für den manuellen Modus
let currentUrl = null;

chrome.webNavigation.onCompleted.addListener(async (details) => {
  const { serverUrl, mode, includeContent, enableUrlTracker } = await new Promise((resolve) =>
    chrome.storage.sync.get(['serverUrl', 'mode', 'includeContent', 'enableUrlTracker'], resolve)
  );

  // Nur fortfahren, wenn URL-Tracking aktiviert ist
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

// Funktion zum Abrufen des Webseiteninhalts
async function getPageContent(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.body.innerText.trim()
  }).then(([result]) => result.result).catch((err) => {
    console.error(t('errors.server_error'), err);
    return null;
  });
}

// Funktion zum Senden der Daten an den Server
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
    console.error(t('errors.server_error'), error);
  }
}