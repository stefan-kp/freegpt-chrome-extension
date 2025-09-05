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
  const saveButton = document.getElementById('save');
  const youtubeScanButton = document.getElementById('youtubeScanButton');
  const youtubeStatus = document.getElementById('youtubeStatus');
  const youtubeChannelsCount = document.getElementById('youtubeChannelsCount');
  const youtubeLastScan = document.getElementById('youtubeLastScan');
  const youtubeTableBody = document.getElementById('youtubeChannelsTableBody');
  const youtubeHint = document.getElementById('youtubeHint');

  // Availability chips for Summarizer and Prompt APIs
  const summAvailabilityChip = document.getElementById('summAvailabilityChip');
  const summDownloadBtn = document.getElementById('summDownload');
  const summRefreshBtn = document.getElementById('summRefresh');
  const promptAvailabilityChip = document.getElementById('promptAvailabilityChip');
  const promptDownloadBtn = document.getElementById('promptDownload');
  const promptRefreshBtn = document.getElementById('promptRefresh');

  function setChip(el, state, text) {
    if (!el) return;
    el.className = 'chip ' + (state ? `chip--${state}` : '');
    el.textContent = text;
  }

  async function updateSummAvailability() {
    let state = 'unavailable';
    try {
      if (typeof Summarizer !== 'undefined') {
        state = await Summarizer.availability();
      }
    } catch (_) { state = 'unavailable'; }

    if (state === 'available') {
      setChip(summAvailabilityChip, 'available', 'Available');
      if (summDownloadBtn) summDownloadBtn.style.display = 'none';
    } else if (state === 'downloadable') {
      setChip(summAvailabilityChip, 'downloadable', 'Downloadable');
      if (summDownloadBtn) summDownloadBtn.style.display = '';
    } else if (state === 'downloading') {
      setChip(summAvailabilityChip, 'downloading', 'Downloading…');
      if (summDownloadBtn) summDownloadBtn.style.display = 'none';
    } else {
      setChip(summAvailabilityChip, 'unavailable', 'Unavailable');
      if (summDownloadBtn) summDownloadBtn.style.display = 'none';
    }
  }

  async function updatePromptAvailability() {
    let state = 'unavailable';
    try {
      if (typeof self.LanguageModel !== 'undefined') {
        state = await self.LanguageModel.availability();
      }
    } catch (_) { state = 'unavailable'; }

    if (state === 'available') {
      setChip(promptAvailabilityChip, 'available', 'Available');
      if (promptDownloadBtn) promptDownloadBtn.style.display = 'none';
    } else if (state === 'downloadable') {
      setChip(promptAvailabilityChip, 'downloadable', 'Downloadable');
      if (promptDownloadBtn) promptDownloadBtn.style.display = '';
    } else if (state === 'downloading') {
      setChip(promptAvailabilityChip, 'downloading', 'Downloading…');
      if (promptDownloadBtn) promptDownloadBtn.style.display = 'none';
    } else {
      setChip(promptAvailabilityChip, 'unavailable', 'Unavailable');
      if (promptDownloadBtn) promptDownloadBtn.style.display = 'none';
    }
  }

  if (summRefreshBtn) summRefreshBtn.addEventListener('click', updateSummAvailability);
  if (promptRefreshBtn) promptRefreshBtn.addEventListener('click', updatePromptAvailability);

  if (summDownloadBtn) summDownloadBtn.addEventListener('click', async () => {
    if (typeof Summarizer === 'undefined') return;
    try {
      setChip(summAvailabilityChip, 'downloading', 'Downloading… 0%');
      await Summarizer.create({
        monitor(m){ m.addEventListener('downloadprogress', e => setChip(summAvailabilityChip, 'downloading', `Downloading… ${Math.round((e.loaded||0)*100)}%`)); }
      });
      setChip(summAvailabilityChip, 'available', 'Available');
    } catch (_) {
      setChip(summAvailabilityChip, 'unavailable', 'Download failed — Retry');
    }
  });

  if (promptDownloadBtn) promptDownloadBtn.addEventListener('click', async () => {
    if (typeof self.LanguageModel === 'undefined') return;
    try {
      setChip(promptAvailabilityChip, 'downloading', 'Downloading… 0%');
      await self.LanguageModel.create({
        monitor(m){ m.addEventListener('downloadprogress', e => setChip(promptAvailabilityChip, 'downloading', `Downloading… ${Math.round((e.loaded||0)*100)}%`)); }
      });
      setChip(promptAvailabilityChip, 'available', 'Available');
    } catch (_) {
      setChip(promptAvailabilityChip, 'unavailable', 'Download failed — Retry');
    }
  });

  updateSummAvailability();
  updatePromptAvailability();

  // Render table rows for YouTube channels
  function renderChannelsTable(channels) {
    if (!youtubeTableBody) return;
    youtubeTableBody.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const ch of channels || []) {
      const tr = document.createElement('tr');
      const tdChannel = document.createElement('td');
      tdChannel.style.padding = '8px';
      tdChannel.style.borderBottom = '1px solid #eee';
      const a = document.createElement('a');
      a.href = ch.url || `https://www.youtube.com/channel/${ch.channelId}`;
      a.target = '_blank';
      a.textContent = ch.title || ch.channelId;
      tdChannel.appendChild(a);

      const tdHandle = document.createElement('td');
      tdHandle.style.padding = '8px';
      tdHandle.style.borderBottom = '1px solid #eee';
      tdHandle.textContent = ch.handle || '';

      const tdLastChecked = document.createElement('td');
      tdLastChecked.style.padding = '8px';
      tdLastChecked.style.borderBottom = '1px solid #eee';
      tdLastChecked.textContent = ch.lastRssCheckedAt || '';

      const tdLastVideo = document.createElement('td');
      tdLastVideo.style.padding = '8px';
      tdLastVideo.style.borderBottom = '1px solid #eee';
      if (ch.lastVideoId && ch.lastVideoTitle) {
        const va = document.createElement('a');
        va.href = `https://www.youtube.com/watch?v=${ch.lastVideoId}`;
        va.target = '_blank';
        va.textContent = ch.lastVideoTitle;
        tdLastVideo.appendChild(va);
      } else {
        tdLastVideo.textContent = '';
      }

      tr.appendChild(tdChannel);
      tr.appendChild(tdHandle);
      tr.appendChild(tdLastChecked);
      tr.appendChild(tdLastVideo);
      frag.appendChild(tr);
    }
    youtubeTableBody.appendChild(frag);
  }

  // Set all text content
  document.getElementById('settingsTitle').textContent = t('settings.title');
  document.getElementById('llmSectionTitle').textContent = t('settings.llm_section');
  document.getElementById('trackSectionTitle').textContent = t('settings.track_section');
  document.getElementById('urlTrackingLabel').textContent = t('settings.url_tracking');
  document.getElementById('llmUrlLabel').textContent = t('settings.llm_url_label');
  document.getElementById('llmUrlHelp').textContent = t('settings.llm_url_help');
  document.getElementById('llmModelLabel').textContent = t('settings.llm_model_label');
  document.getElementById('llmModelHelp').textContent = t('settings.llm_model_help');
  document.getElementById('llmModelOllama').textContent = t('settings.llm_model_ollama');
  document.getElementById('save').textContent = t('buttons.save');
  document.getElementById('llmModelOpenai').textContent = t('settings.llm_model_openai');
  document.getElementById('llmModelAnthropic').textContent = t('settings.llm_model_anthropic');
  document.getElementById('apiKeyLabel').textContent = t('settings.api_key_label');
  document.getElementById('apiKeyHelp').textContent = t('settings.api_key_help');
  document.getElementById('trackUrlLabel').textContent = t('settings.track_url_label');
  document.getElementById('modeLabel').textContent = t('settings.mode_label');
  document.getElementById('modeManual').textContent = t('settings.mode_manual');

	  // YouTube section labels
	  const ytTitle = document.getElementById('youtubeSectionTitle');
	  if (ytTitle) ytTitle.textContent = t('youtube.section_title');
  document.getElementById('ytColChannel').textContent = t('youtube.col_channel');
  document.getElementById('ytColHandle').textContent = t('youtube.col_handle');
  document.getElementById('ytColLastChecked').textContent = t('youtube.col_last_checked');
  document.getElementById('ytColLastVideo').textContent = t('youtube.col_last_video');
  if (youtubeHint) youtubeHint.textContent = t('youtube.hint_scan_then_poll');

	  if (youtubeScanButton) youtubeScanButton.textContent = t('youtube.scan_button');

  document.getElementById('modeAutomatic').textContent = t('settings.mode_automatic');
  document.getElementById('contentLabel').textContent = t('settings.content_label');
  document.getElementById('contentUrlOnly').textContent = t('settings.content_url_only');
  document.getElementById('contentWithPage').textContent = t('settings.content_with_page');
  saveButton.textContent = t('buttons.save');

  // Set placeholders
  llmServerUrl.placeholder = t('placeholders.llm_url');
  serverUrl.placeholder = t('placeholders.track_url');
  llmApiKey.placeholder = t('placeholders.api_key');

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
      'enableUrlTracker',
      'summarizeEngine'
    ],
    (data) => {
      if (data.serverUrl) serverUrl.value = data.serverUrl;
      if (data.mode) mode.value = data.mode;
      if (data.includeContent) includeContent.value = data.includeContent;
      if (data.llmServerUrl) llmServerUrl.value = data.llmServerUrl;
      if (data.llmApiKey) llmApiKey.value = data.llmApiKey;
      if (data.llmModel) llmModel.value = data.llmModel;


	  function renderChannelsTable(channels) {
	    if (!youtubeTableBody) return;
	    youtubeTableBody.innerHTML = '';
	    const frag = document.createDocumentFragment();
	    for (const ch of channels) {
	      const tr = document.createElement('tr');
	      const tdChannel = document.createElement('td');
	      tdChannel.style.padding = '8px';
	      tdChannel.style.borderBottom = '1px solid #eee';
	      const a = document.createElement('a');
	      a.href = ch.url || `https://www.youtube.com/channel/${ch.channelId}`;
	      a.target = '_blank';
	      a.textContent = ch.title || ch.channelId;
	      tdChannel.appendChild(a);

	      const tdHandle = document.createElement('td');
	      tdHandle.style.padding = '8px';
	      tdHandle.style.borderBottom = '1px solid #eee';
	      tdHandle.textContent = ch.handle || '';

	      const tdLastChecked = document.createElement('td');
	      tdLastChecked.style.padding = '8px';
	      tdLastChecked.style.borderBottom = '1px solid #eee';
	      tdLastChecked.textContent = ch.lastRssCheckedAt || '';

	      const tdLastVideo = document.createElement('td');
	      tdLastVideo.style.padding = '8px';
	      tdLastVideo.style.borderBottom = '1px solid ' + '#eee';
	      if (ch.lastVideoId && ch.lastVideoTitle) {
	        const va = document.createElement('a');
	        va.href = `https://www.youtube.com/watch?v=${ch.lastVideoId}`;
	        va.target = '_blank';
	        va.textContent = ch.lastVideoTitle;
	        tdLastVideo.appendChild(va);
	      } else {
	        tdLastVideo.textContent = '';
	      }

	      tr.appendChild(tdChannel);
	      tr.appendChild(tdHandle);
	      tr.appendChild(tdLastChecked);
	      tr.appendChild(tdLastVideo);
	      frag.appendChild(tr);
	    }
	    youtubeTableBody.appendChild(frag);

	  }


	  // YouTube scan handler (outside of Save button logic)
	  if (youtubeScanButton) {
	    youtubeScanButton.addEventListener('click', async () => {
	      try {

	        if (youtubeStatus) {
	          youtubeStatus.textContent = t('youtube.scanning');
	        }
	        const ytUrl = 'https://www.youtube.com/feed/channels';
	        const tab = await chrome.tabs.create({ url: ytUrl, active: true });
	        const tabId = tab.id;
	        if (!tabId) throw new Error('Tab not created');

	        const onUpdated = (updatedTabId, info) => {
	          if (updatedTabId === tabId && info.status === 'complete') {
	            chrome.scripting.executeScript({
	              target: { tabId },
	              files: ['youtube_scan_content.js']
	            });
	            chrome.tabs.onUpdated.removeListener(onUpdated);
	          }
	        };
	        chrome.tabs.onUpdated.addListener(onUpdated);

	        const onMessage = async (msg, sender) => {
	          if (sender?.tab?.id !== tabId) return;
	          if (msg.type === 'YOUTUBE_CHANNELS_FOUND') {
	            chrome.runtime.onMessage.removeListener(onMessage);
	            const newChannels = Array.isArray(msg.channels) ? msg.channels : [];
	            const { youtubeSubscriptions } = await chrome.storage.local.get(['youtubeSubscriptions']);
	            const existing = youtubeSubscriptions?.channels || [];
	            const merged = (window.mergeYouTubeChannels ? window.mergeYouTubeChannels(existing, newChannels) : newChannels);
	            const payload = {
	              channels: merged,
	              lastScanAt: new Date().toISOString(),
	              totalCount: merged.length,
	              version: 1
	            };
	            await chrome.storage.local.set({ youtubeSubscriptions: payload });
	            // Update UI immediately without requiring page reload
	            if (youtubeChannelsCount) youtubeChannelsCount.textContent = `${t('youtube.channels_count_label')}: ${payload.totalCount}`;
	            if (youtubeLastScan) youtubeLastScan.textContent = `${t('youtube.last_scan_label')}: ${payload.lastScanAt}`;
	            renderChannelsTable(payload.channels || []);
	            if (youtubeStatus) youtubeStatus.textContent = t('youtube.scan_complete');
	            chrome.tabs.remove(tabId);
	          } else if (msg.type === 'YOUTUBE_SCAN_ERROR') {
	            chrome.runtime.onMessage.removeListener(onMessage);
	            if (youtubeStatus) youtubeStatus.textContent = t('youtube.no_channels_found');
	          }
	        };
	        chrome.runtime.onMessage.addListener(onMessage);
	      } catch (e) {
	        if (youtubeStatus) youtubeStatus.textContent = t('youtube.no_channels_found');
	      }
	    });
	  }

	  // Load YouTube subscriptions stats
	  chrome.storage.local.get(['youtubeSubscriptions'], (data) => {
	    const subs = data.youtubeSubscriptions;
	    if (!subs) return;
	    if (youtubeChannelsCount) youtubeChannelsCount.textContent = `${t('youtube.channels_count_label')}: ${subs.totalCount || (subs.channels ? subs.channels.length : 0)}`;
	    if (youtubeLastScan) youtubeLastScan.textContent = `${t('youtube.last_scan_label')}: ${subs.lastScanAt || '-'}`;
	  });

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

	  // Load YouTube subscriptions stats and table at page load (outside handlers)
	  chrome.storage.local.get(['youtubeSubscriptions'], (data) => {
	    const subs = data.youtubeSubscriptions;
	    if (!subs) return;
	    if (youtubeChannelsCount) youtubeChannelsCount.textContent = `${t('youtube.channels_count_label')}: ${subs.totalCount || (subs.channels ? subs.channels.length : 0)}`;
	    if (youtubeLastScan) youtubeLastScan.textContent = `${t('youtube.last_scan_label')}: ${subs.lastScanAt || '-'}`;
	    if (Array.isArray(subs.channels)) renderChannelsTable(subs.channels);
	  });

  });

  // URL Tracker toggle handler
  enableUrlTracker.addEventListener('change', () => {
    urlTrackerSettings.style.display = enableUrlTracker.checked ? 'block' : 'none';
  });

  // Save button handler
  saveButton.addEventListener('click', () => {
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

    // Validate model selection only when LLM is selected
    const engineSelected = summEngineIntegrated?.classList.contains('selected') ? 'integrated' : 'llm';
    if (engineSelected === 'llm' && !llmModelValue) {
      statusDiv.textContent = t('errors.model_required');
      statusDiv.className = 'error';
      return;
    }

    // Validate API Key for external services only when LLM engine is selected
    if (engineSelected === 'llm' && selectedServer && (selectedServer === 'openai' || selectedServer === 'anthropic') && !llmApiKeyValue) {
      statusDiv.textContent = t('errors.api_key_required', { provider: selectedServer.toUpperCase() });
      statusDiv.className = 'error';
      return;

    }

    // Save settings
    chrome.storage.sync.set({
      serverUrl: serverUrlValue,
      mode: modeValue,
      includeContent: includeContentValue,
      llmServerUrl: llmServerUrlValue,
      llmApiKey: llmApiKeyValue,
      llmModel: llmModelValue,
      selectedServer,
      enableUrlTracker: enableUrlTrackerValue,
      summarizeEngine: engineSelected
    }, () => {
      statusDiv.textContent = t('success.settings_saved');
      statusDiv.className = 'success';
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 2000);
    });
  });
});