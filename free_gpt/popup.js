import { t, getUserLanguage } from './translations.js';

document.addEventListener('DOMContentLoaded', async () => {
  const chatContainer = document.getElementById('chatContainer');
  const inputTextarea = document.getElementById('input');
  const chatButton = document.getElementById('chat');
  const saveButton = document.getElementById('save');
  const copyButton = document.getElementById('copyButton');
  const optionsLink = document.getElementById('optionsLink');
  const llmDetails = document.getElementById('llmDetails');
  const micButton = document.getElementById('micButton');

  let conversationHistory = [];
  const userLang = getUserLanguage();

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

  // Chat Button Handler
  chatButton.addEventListener('click', async () => {
    const message = inputTextarea.value.trim();
    if (chatButton.disabled) return;

    chatButton.textContent = t('buttons.processing');
    chatButton.disabled = true;

    try {
      const { selectedServer, llmServerUrl, llmApiKey, llmModel } = await new Promise((resolve) =>
        chrome.storage.sync.get(['selectedServer', 'llmServerUrl', 'llmApiKey', 'llmModel'], resolve)
      );

      if (!llmServerUrl) {
        throw new Error(t('errors.llm_url_not_configured'));
      }

      // Get current tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab.url;

      // Add user message to chat or request summary
      const userMessage = message || t('messages.summarize_page');
      if (userMessage) {
        addMessage(userMessage, true);
      }

      // Prepare system message with language context
      const systemMessage = t('system_messages.assistant_role') + 
        ` Please respond in the user's language (${userLang}) unless he poses his question in different language. Use a natural, conversational tone.`;

      // Prepare context message
      let contextMessage = `${t('system_messages.context_prefix')} ${url}\n`;
      if (tab.title) {
        contextMessage += `Title: ${tab.title}\n\n`;
      }

      // Get page content
      let pageContent = '';
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.body.innerText
        });
        pageContent = result;
      } catch (error) {
        console.log('Could not get page content:', error);
      }

      if (pageContent) {
        contextMessage += `${t('system_messages.page_content')}:\n${pageContent}\n\n`;
      }

      // Add user's question
      if (userMessage) {
        contextMessage += userMessage;
      }

      // Prepare the messages array
      const messages = [
        { role: "system", content: systemMessage },
        { role: "user", content: contextMessage }
      ];

      // Remove duplicate user message since it's already in the context
      if (!message) {
        messages.pop();
        messages.push({ role: "user", content: contextMessage });
      }
      // Prepare headers based on the selected server
      const headers = {
        'Content-Type': 'application/json'
      };

      if (selectedServer === 'openai' && llmApiKey) {
        headers['Authorization'] = `Bearer ${llmApiKey}`;
      } else if (selectedServer === 'anthropic' && llmApiKey) {
        headers['x-api-key'] = llmApiKey;
        headers['anthropic-version'] = '2023-06-01';
      }

      // Prepare the payload based on the server type
      let payload;
      switch (selectedServer) {
        case 'openai':
          payload = {
            model: llmModel,
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            temperature: 0.7,
            max_tokens: 2000,
            stream: true
          };
          break;

        case 'anthropic':
          payload = {
            model: llmModel,
            messages: messages.map(msg => ({
              role: msg.role === 'system' ? 'assistant' : msg.role,
              content: msg.content
            })),
            stream: true,
            max_tokens: 2000
          };
          break;

        default: // ollama
          payload = {
            model: llmModel,
            messages: messages,
            stream: true,
            options: {
              temperature: 0.7
            }
          };
      }

      // Send request to LLM
      const response = await fetch(llmServerUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LLM Error Response:', {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText,
          sentPayload: payload
        });
        
        let errorMessage = `${t('errors.llm_server_error')} ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) {
            errorMessage += `: ${errorJson.error.message}`;
          }
        } catch (e) {
          errorMessage += errorText ? `: ${errorText}` : '';
        }
        throw new Error(errorMessage);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentMessage = '';
      let messageDiv = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        
        // Handle different streaming formats
        if (selectedServer === 'openai') {
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') continue;
              try {
                const json = JSON.parse(jsonStr);
                if (json.choices?.[0]?.delta?.content) {
                  currentMessage += json.choices[0].delta.content;
                }
              } catch (e) {
                console.warn('Failed to parse OpenAI response chunk:', e);
              }
            }
          }
        } else if (selectedServer === 'anthropic') {
          try {
            const json = JSON.parse(chunk);
            if (json.content?.[0]?.text) {
              currentMessage += json.content[0].text;
            }
          } catch (e) {
            console.warn('Failed to parse Anthropic response chunk:', e);
          }
        } else {
          try {
            const json = JSON.parse(chunk);
            if (json.message?.content) {
              currentMessage += json.message.content;
            }
          } catch (e) {
            console.warn('Failed to parse Ollama response chunk:', e);
          }
        }
        
        // Update the UI with the current message
        if (!messageDiv) {
          messageDiv = document.createElement('div');
          messageDiv.className = 'message assistant-message';
          if (containsMarkdown(currentMessage)) {
            messageDiv.classList.add('markdown-content');
          }
          chatContainer.appendChild(messageDiv);
        }

        if (containsMarkdown(currentMessage)) {
          messageDiv.innerHTML = marked.parse(currentMessage);
          messageDiv.querySelectorAll('a').forEach(link => {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          });
        } else {
          messageDiv.textContent = currentMessage;
        }
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      // Add the complete message to conversation history and store it
      if (currentMessage) {
        conversationHistory.push({
          role: "assistant",
          content: currentMessage
        });
        
        // Store updated conversation history
        await chrome.storage.local.set({
          [`chat_${currentTabId}`]: {
            url: currentUrl,
            history: conversationHistory
          }
        });
      }

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

  // Update LLM Info
  async function updateLlmInfo() {
    const { selectedServer, llmModel } = await new Promise((resolve) =>
      chrome.storage.sync.get(['selectedServer', 'llmModel'], resolve)
    );
    
    if (selectedServer && llmModel) {
      const serverName = selectedServer.charAt(0).toUpperCase() + selectedServer.slice(1);
      llmDetails.textContent = `${serverName} (${llmModel})`;
    } else {
      llmDetails.textContent = t('messages.llm_not_configured');
    }
  }

  // Initial LLM Info load
  updateLlmInfo();

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