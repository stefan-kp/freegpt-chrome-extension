import { t, getUserLanguage } from './translations.js';

document.addEventListener('DOMContentLoaded', async () => {
  const chatContainer = document.getElementById('chatContainer');
  const inputTextarea = document.getElementById('input');
  const chatButton = document.getElementById('chat');
  const saveButton = document.getElementById('save');
  const copyButton = document.getElementById('copyButton');
  const optionsLink = document.getElementById('optionsLink');
  const llmDetails = document.getElementById('llmDetails');
  const engineSelect = document.getElementById('engineSelect');
  const micButton = document.getElementById('micButton');
  const newVideosBtn = document.getElementById('newVideos');

  let conversationHistory = [];
  const userLang = getUserLanguage();
  const newVideosLink = document.getElementById('newVideosLink');

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTabId = tab.id;
  const currentUrl = tab.url;

  // Try to restore conversation history for current tab
  try {
    const data = await chrome.storage.local.get(`chat_${currentTabId}`);
    const storedChat = data[`chat_${currentTabId}`];
    if (storedChat && storedChat.url === currentUrl) {
      conversationHistory = storedChat.history;
      // Restore chat messages in UI
      conversationHistory.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`;

        if (msg.role === 'assistant' && containsMarkdown(msg.content)) {
          messageDiv.classList.add('markdown-content');
          messageDiv.innerHTML = marked.parse(msg.content);
          messageDiv.querySelectorAll('a').forEach(link => {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          });
        } else {
          messageDiv.textContent = msg.content;
        }

        chatContainer.appendChild(messageDiv);
      });
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  } catch (error) {
    console.error('Failed to restore chat history:', error);
  }

  // Listen for speech recognition results
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'speechResult') {
      inputTextarea.value = message.text;
      // Optional: Automatically trigger chat after speech input
      // chatButton.click();
    } else if (message.type === 'speechError') {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'message error';
      errorDiv.textContent = message.error;
      chatContainer.appendChild(errorDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;

      // Remove error message after 3 seconds
      setTimeout(() => {
        errorDiv.remove();
      }, 3000);
    }
  });

  // Update placeholders and tooltips
  inputTextarea.placeholder = t('placeholders.chat_input');
  saveButton.title = t('tooltips.save_url');
  copyButton.title = t('tooltips.copy');
  optionsLink.title = t('tooltips.settings');
  micButton.title = t('tooltips.microphone');

  // Chat Button Handler (Local Prompt API or LLM based on dropdown)
  let lmSession = null;
  chatButton.addEventListener('click', async () => {
    const message = inputTextarea.value.trim();
    if (chatButton.disabled) return;

    chatButton.textContent = t('buttons.processing');
    chatButton.disabled = true;

    const engine = (engineSelect?.value) || 'local';

    try {
      // Get current tab info + page content (used by both engines)
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab.url;

      const userMessage = message || t('messages.summarize_page');
      if (userMessage) addMessage(userMessage, true);

      let pageContent = '';
      try {
        const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => document.body.innerText });
        pageContent = result || '';
      } catch (_) {}

      // Helper to persist assistant message
      const persistAssistant = async (text) => {
        if (!text) return;
        conversationHistory.push({ role: 'assistant', content: text });
        await chrome.storage.local.set({ [`chat_${currentTabId}`]: { url: currentUrl, history: conversationHistory } });
      };

      // Try Local Prompt API first if selected
      if (engine === 'local') {
        try {
          if (typeof LanguageModel === 'undefined') throw new Error('Prompt API unavailable');

          // Create session once with download progress
          if (!lmSession) {
            lmSession = await LanguageModel.create({
              monitor(m){ m.addEventListener('downloadprogress', e => { chatButton.textContent = `Downloading… ${Math.round((e.loaded||0)*100)}%`; }); }
            });
          }

          // Build query + context
          const query = message || 'Summarize the page concisely with key highlights and bullets.';
          const ctxPieces = [];
          if (tab.title) ctxPieces.push(`Title: ${tab.title}`);
          if (url) ctxPieces.push(url);
          if (pageContent) ctxPieces.push(pageContent.slice(0, 40000));
          const ctx = ctxPieces.join('\n\n');

          // Stream response
          let currentMessage = '';
          let messageDiv = null;
          const controller = new AbortController();
          const stream = lmSession.promptStreaming(`${query}\n\n${ctx}`, { signal: controller.signal });
          for await (const chunk of stream) {
            currentMessage += chunk;
            if (!messageDiv) {
              messageDiv = document.createElement('div');
              messageDiv.className = 'message assistant-message';
              chatContainer.appendChild(messageDiv);
            }
            if (containsMarkdown(currentMessage)) {
              messageDiv.classList.add('markdown-content');
              messageDiv.innerHTML = marked.parse(currentMessage);
              messageDiv.querySelectorAll('a').forEach(link => { link.target = '_blank'; link.rel = 'noopener noreferrer'; });
            } else {
              messageDiv.textContent = currentMessage;
            }
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
          await persistAssistant(currentMessage);
          return; // Success; skip LLM
        } catch (e) {
          // Fall back to LLM
          addMessage('On-device model unavailable — falling back to LLM', false);
        }
      }

      // LLM path (existing behavior)
      const { selectedServer, llmServerUrl, llmApiKey, llmModel } = await new Promise((resolve) =>
        chrome.storage.sync.get(['selectedServer', 'llmServerUrl', 'llmApiKey', 'llmModel'], resolve)
      );
      if (!llmServerUrl) throw new Error(t('errors.llm_url_not_configured'));

      const systemMessage = t('system_messages.assistant_role') + ` Please respond in the user's language (${userLang}) unless he poses his question in different language. Use a natural, conversational tone.`;
      let contextMessage = `${t('system_messages.context_prefix')} ${url}\n`;
      if (tab.title) contextMessage += `Title: ${tab.title}\n\n`;
      if (pageContent) contextMessage += `${t('system_messages.page_content')}:\n${pageContent}\n\n`;
      if (userMessage) contextMessage += userMessage;
      const messages = [ { role: 'system', content: systemMessage }, { role: 'user', content: contextMessage } ];
      if (!message) { messages.pop(); messages.push({ role: 'user', content: contextMessage }); }

      const headers = { 'Content-Type': 'application/json' };
      if (selectedServer === 'openai' && llmApiKey) headers['Authorization'] = `Bearer ${llmApiKey}`;
      else if (selectedServer === 'anthropic' && llmApiKey) { headers['x-api-key'] = llmApiKey; headers['anthropic-version'] = '2023-06-01'; }

      let payload;
      switch (selectedServer) {
        case 'openai':
          payload = { model: llmModel, messages: messages.map(m=>({role:m.role, content:m.content})), temperature: 0.7, max_tokens: 2000, stream: true }; break;
        case 'anthropic':
          payload = { model: llmModel, messages: messages.map(m=>({role: m.role==='system'?'assistant':m.role, content:m.content})), stream: true, max_tokens: 2000 }; break;
        default:
          payload = { model: llmModel, messages, stream: true, options: { temperature: 0.7 } };
      }

      const response = await fetch(llmServerUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('LLM Error Response:', { status: response.status, headers: Object.fromEntries(response.headers.entries()), body: errorText, sentPayload: payload });
        let msg = `${t('errors.llm_server_error')} ${response.status}`; try { const j = JSON.parse(errorText); if (j.error?.message) msg += `: ${j.error.message}`; } catch (_) { msg += errorText ? `: ${errorText}` : ''; }
        throw new Error(msg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentMessage = '';
      let messageDiv = null;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        const chunk = decoder.decode(value);
        if (selectedServer === 'openai') {
          const lines = chunk.split('\n');
          for (const line of lines) { if (line.startsWith('data: ')) { const jsonStr = line.slice(6); if (jsonStr === '[DONE]') continue; try { const json = JSON.parse(jsonStr); if (json.choices?.[0]?.delta?.content) currentMessage += json.choices[0].delta.content; } catch (_) {} } }
        } else if (selectedServer === 'anthropic') {
          try { const json = JSON.parse(chunk); if (json.content?.[0]?.text) currentMessage += json.content[0].text; } catch (_) {}
        } else {
          try { const json = JSON.parse(chunk); if (json.message?.content) currentMessage += json.message.content; } catch (_) {}
        }
        if (!messageDiv) { messageDiv = document.createElement('div'); messageDiv.className = 'message assistant-message'; chatContainer.appendChild(messageDiv); }
        if (containsMarkdown(currentMessage)) { messageDiv.classList.add('markdown-content'); messageDiv.innerHTML = marked.parse(currentMessage); messageDiv.querySelectorAll('a').forEach(link => { link.target = '_blank'; link.rel = 'noopener noreferrer'; }); } else { messageDiv.textContent = currentMessage; }
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
      await persistAssistant(currentMessage);

    } catch (error) {
      addMessage(`Error: ${error.message}`, false);
    } finally {
      chatButton.textContent = t('buttons.chat');
      chatButton.disabled = false;
      inputTextarea.value = '';
    }
  });

  // Save Button Handler
  saveButton.addEventListener('click', async () => {
    try {
      const { serverUrl } = await new Promise((resolve) =>
        chrome.storage.sync.get(['serverUrl'], resolve)
      );

      if (!serverUrl) {
        throw new Error(t('errors.server_url_not_configured'));
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: tab.url,
          title: tab.title,
          chat_history: conversationHistory
        })
      });

      if (!response.ok) {
        throw new Error(`${t('errors.server_error')} ${response.status}`);
      }

      // Show success message
      addMessage(t('success.url_saved'), false);

    } catch (error) {
      addMessage(`Error: ${error.message}`, false);
    }
  });

  // Copy Button Handler
  copyButton.addEventListener('click', async () => {
    try {
      const formattedConversation = conversationHistory
        .map(msg => `${msg.role === 'user' ? t('roles.user') : t('roles.assistant')}: ${msg.content}`)
        .join('\n\n');

      await navigator.clipboard.writeText(formattedConversation);

      const originalTitle = copyButton.title;
      copyButton.title = t('success.copied');
      copyButton.querySelector('svg').style.color = '#4CAF50';

      setTimeout(() => {
        copyButton.title = originalTitle;
        copyButton.querySelector('svg').style.color = '';
      }, 2000);
    } catch (error) {
      console.error(t('errors.copy_error'), error);
      copyButton.title = t('errors.copy_failed');
      copyButton.querySelector('svg').style.color = '#c62828';

      setTimeout(() => {
        copyButton.title = t('tooltips.copy');
        copyButton.querySelector('svg').style.color = '';
      }, 2000);
    }
  });

  // Options Link Handler
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Update engine dropdown contents only (no extra text)
  async function updateEngineInfo() {
    const { selectedServer, llmModel } = await new Promise((resolve) =>
      chrome.storage.sync.get(['selectedServer', 'llmModel'], resolve)
    );

    if (engineSelect) {
      try {
        if (typeof LanguageModel !== 'undefined') {
          const avail = await LanguageModel.availability();
          const label = avail === 'available' ? 'Local (on-device) — available'
            : avail === 'downloadable' ? 'Local (on-device) — downloadable'
            : avail === 'downloading' ? 'Local (on-device) — downloading…'
            : 'Local (on-device) — unavailable';
          engineSelect.options[0].text = label;
          engineSelect.options[0].disabled = (avail === 'unavailable');
        } else {
          engineSelect.options[0].text = 'Local (on-device) — unavailable';
          engineSelect.options[0].disabled = true;
        }
      } catch (_) {
        engineSelect.options[0].text = 'Local (on-device) — unavailable';
        engineSelect.options[0].disabled = true;
      }
      engineSelect.options[1].text = (selectedServer && llmModel) ? `LLM — ${selectedServer}/${llmModel}` : 'LLM';
    }
  }

  // Initial info load
  updateEngineInfo();

  // Check for Markdown formatting
  function containsMarkdown(text) {
    const markdownPatterns = [
      /^#+\s/m,                // Headers
      /\*\*.*\*\*/,           // Bold
      /\*.*\*/,               // Italic
      /`.*`/,                 // Inline code
      /```[\s\S]*?```/,       // Code blocks
      /\[.*\]\(.*\)/,         // Links
      /^\s*[-*+]\s/m,         // Lists
      /^\s*\d+\.\s/m,         // Numbered lists
      /^\s*>\s/m,             // Blockquotes
      /\|.*\|.*\|/,           // Tables
      /^-{3,}/m,              // Horizontal rules
      /^={3,}/m               // Alternative horizontal rules
    ];

    return markdownPatterns.some(pattern => pattern.test(text));
  }

  // Helper function to add message and update storage
  async function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;

    if (!isUser && containsMarkdown(content)) {
      messageDiv.classList.add('markdown-content');
      messageDiv.innerHTML = marked.parse(content);

      messageDiv.querySelectorAll('a').forEach(link => {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      });
    } else {
      messageDiv.textContent = content;
    }

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    conversationHistory.push({
      role: isUser ? "user" : "assistant",
      content: content
    });

    // Store updated conversation history
    await chrome.storage.local.set({
      [`chat_${currentTabId}`]: {
        url: currentUrl,
        history: conversationHistory
      }
    });
  }

  // Check if URL tracking is enabled and show/hide save button
  chrome.storage.sync.get(['enableUrlTracker'], (data) => {
    saveButton.style.display = data.enableUrlTracker ? 'flex' : 'none';
  });

  // New Videos icon: open the videos page
  if (newVideosBtn) {
    newVideosBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('videos.html') });
    });
  }

  // (removed) Summarizer Test quick link for production

  // Badge-like cue on the icon when there are new videos since last view
  try {
    const { youtubeVideos, lastVideosViewedAt } = await chrome.storage.local.get(['youtubeVideos', 'lastVideosViewedAt']);
    const items = Object.values(youtubeVideos?.itemsById || {});
    const lastViewed = lastVideosViewedAt ? new Date(lastVideosViewedAt).getTime() : 0;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const since = Date.now() - SEVEN_DAYS_MS;
    const count = items.filter(v => {
      const ts = new Date(v.publishedAt).getTime();
      return ts >= since && ts > lastViewed;
    }).length;
    if (newVideosBtn) {
      if (count > 0) {
  // Initialize engineSelect default based on Prompt availability
  try {
    if (typeof LanguageModel !== 'undefined') {
      const avail = await LanguageModel.availability();
      if (avail === 'available' || avail === 'downloadable' || avail === 'downloading') {
        if (engineSelect) engineSelect.value = 'local';
      } else {
        if (engineSelect) engineSelect.value = 'llm';
      }
    } else {
      if (engineSelect) engineSelect.value = 'llm';
    }
  } catch (_) {}

        newVideosBtn.classList.add('has-new');
        newVideosBtn.title = `New Videos (${count})`;
      } else {
        newVideosBtn.classList.remove('has-new');
        newVideosBtn.title = 'New Videos';
      }
    }
  } catch (_) {}


  // Microphone button handler
  micButton.addEventListener('click', () => {
    chrome.windows.create({
      url: 'microphone.html',
      type: 'popup',
      width: 300,
      height: 200,
      top: 0,
      left: 0
    });
  });
});