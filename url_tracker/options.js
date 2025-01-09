import { t } from './translations.js';

document.addEventListener('DOMContentLoaded', () => {
  const serverUrl = document.getElementById('serverUrl');
  const mode = document.getElementById('mode');
  const includeContent = document.getElementById('includeContent');
  const llmServerUrl = document.getElementById('llmServerUrl');
  const llmApiKey = document.getElementById('llmApiKey');
  const llmModel = document.getElementById('llmModel');
  const enableUrlTracker = document.getElementById('enableUrlTracker');
  const urlTrackerSettings = document.getElementById('urlTrackerSettings');
  const serverButtons = document.querySelectorAll('.server-button');

  // Load saved settings
  chrome.storage.sync.get(
    [
      'serverUrl',
      'mode',
      'includeContent',
      'llmServerUrl',
      'llmApiKey',
      'llmModel',
      'selectedServer',
      'enableUrlTracker'
    ],
    (data) => {
      if (data.serverUrl) serverUrl.value = data.serverUrl;
      if (data.mode) mode.value = data.mode;
      if (data.includeContent) includeContent.value = data.includeContent;
      if (data.llmServerUrl) llmServerUrl.value = data.llmServerUrl;
      if (data.llmApiKey) llmApiKey.value = data.llmApiKey;
      if (data.llmModel) llmModel.value = data.llmModel;
      if (data.selectedServer) {
        const button = document.querySelector(`[data-server="${data.selectedServer}"]`);
        if (button) {
          button.classList.add('active');
          llmServerUrl.value = button.dataset.url;
        }
      }
      enableUrlTracker.checked = data.enableUrlTracker;
      urlTrackerSettings.style.display = data.enableUrlTracker ? 'block' : 'none';
    }
  );

  // Server button click handler
  serverButtons.forEach(button => {
    button.addEventListener('click', () => {
      serverButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      llmServerUrl.value = button.dataset.url;
    });
  });

  // URL Tracker toggle handler
  enableUrlTracker.addEventListener('change', () => {
    urlTrackerSettings.style.display = enableUrlTracker.checked ? 'block' : 'none';
  });

  // Save button handler
  document.getElementById('save').addEventListener('click', () => {
    const serverUrlValue = serverUrl.value.trim();
    const modeValue = mode.value;
    const includeContentValue = includeContent.value;
    const llmServerUrlValue = llmServerUrl.value.trim();
    const llmApiKeyValue = llmApiKey.value.trim();
    const llmModelValue = llmModel.value.trim();
    const selectedServer = document.querySelector('.server-button.active')?.dataset.server;
    const enableUrlTrackerValue = enableUrlTracker.checked;

    // URL validation
    const urlPattern = /^https?:\/\/.+/;
    const statusDiv = document.getElementById('status');
    statusDiv.style.display = 'block';

    // Validate LLM Server URL
    if (!urlPattern.test(llmServerUrlValue)) {
      statusDiv.textContent = t('errors.invalid_llm_url');
      statusDiv.className = 'error';
      return;
    }

    // Validate Track Server URL only if URL tracking is enabled
    if (enableUrlTrackerValue && !urlPattern.test(serverUrlValue)) {
      statusDiv.textContent = t('errors.invalid_track_url');
      statusDiv.className = 'error';
      return;
    }

    // Validate API Key for external services
    if (selectedServer !== 'ollama' && !llmApiKeyValue) {
      statusDiv.textContent = t('errors.api_key_required', { provider: selectedServer.toUpperCase() });
      statusDiv.className = 'error';
      return;
    }

    // Save settings
    chrome.storage.sync.set(
      {
        serverUrl: serverUrlValue,
        mode: modeValue,
        includeContent: includeContentValue,
        llmServerUrl: llmServerUrlValue,
        llmApiKey: llmApiKeyValue,
        llmModel: llmModelValue,
        selectedServer,
        enableUrlTracker: enableUrlTrackerValue
      },
      () => {
        statusDiv.textContent = t('success.settings_saved');
        statusDiv.className = 'success';
        setTimeout(() => {
          statusDiv.style.display = 'none';
        }, 2000);
      }
    );
  });
});