// Speichere die aktuelle URL für den manuellen Modus
let currentUrl = null;

chrome.webNavigation.onCompleted.addListener(async (details) => {
  const { serverUrl, mode, includeContent, enableUrlTracker } = await new Promise((resolve) =>
    chrome.storage.sync.get(['serverUrl', 'mode', 'includeContent', 'enableUrlTracker'], resolve)
  );

  // Nur fortfahren, wenn URL-Tracking aktiviert ist
  if (!enableUrlTracker) return;

  if (!serverUrl) {
    console.debug('Track-Server URL ist nicht konfiguriert.');
    return;
  }

  const url = details.url;
  console.log(`Übertragung aktiviert. Modus: ${mode}, URL: ${details.url}`);

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
    console.error('Fehler beim Abrufen des Seiteninhalts:', err);
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
    console.log('Daten erfolgreich gesendet:', payload);
  } catch (error) {
    console.error('Fehler beim Senden der Daten:', error);
  }
}