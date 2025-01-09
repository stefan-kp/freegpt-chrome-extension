const translations = {
  de: {
    errors: {
      server_url_not_configured: 'Track-Server URL ist nicht konfiguriert',
      llm_url_not_configured: 'LLM-Server URL ist nicht konfiguriert',
      server_error: 'Server antwortet mit Status',
      llm_server_error: 'LLM-Server antwortet mit Status',
      invalid_track_url: 'Fehler: Ungültige Track-Server URL',
      invalid_llm_url: 'Fehler: Ungültige LLM-Server URL',
      api_key_required: 'Fehler: API Key wird für {provider} benötigt',
      mic_permission_denied: 'Bitte erlauben Sie den Zugriff auf das Mikrofon',
      no_speech_detected: 'Keine Sprache erkannt',
      speech_error: 'Fehler bei der Spracherkennung'
    },
    success: {
      url_saved: 'URL erfolgreich gespeichert!',
      settings_saved: 'Einstellungen gespeichert!'
    },
    buttons: {
      save: 'Speichern',
      chat: 'Chat',
      processing: 'Wird verarbeitet...'
    },
    tooltips: {
      save_url: 'URL speichern',
      copy: 'In Zwischenablage kopieren',
      settings: 'Einstellungen öffnen'
    },
    placeholders: {
      chat_input: 'Nachricht eingeben... (oder leer lassen für Zusammenfassung)',
      speech_input: 'Sprechen Sie jetzt...',
      llm_url: 'http://localhost:11434/api/generate',
      track_url: 'http://localhost:3000/api/track-url',
      api_key: 'API Key für externe Dienste'
    },
    settings: {
      title: 'FreeGPT Settings',
      llm_section: 'LLM Server',
      track_section: 'Track Server',
      url_tracking: 'URL Tracking aktivieren',
      llm_url_label: 'LLM-Server URL:',
      llm_url_help: 'Die URL des LLM-Servers. Wird automatisch basierend auf der Server-Auswahl gesetzt.',
      llm_model_label: 'LLM Modell:',
      llm_model_help: 'Beispiele:',
      llm_model_ollama: 'Ollama: llama3, codellama, mistral',
      llm_model_openai: 'OpenAI: gpt-4o, gpt-4o-mini, o1-mini, o1',
      llm_model_anthropic: 'Anthropic: claude-3-5-sonnet-20241022, claude-3-5-haiku',
      api_key_label: 'API Key (optional):',
      api_key_help: 'Wird für OpenAI und Anthropic benötigt, nicht für lokales Ollama.',
      track_url_label: 'Track-Server URL:',
      mode_label: 'Übertragungsmodus:',
      mode_manual: 'Manuell',
      mode_automatic: 'Automatisch',
      content_label: 'Was soll übertragen werden?',
      content_url_only: 'Nur URL',
      content_with_page: 'URL und Seiteninhalt'
    },
    system_messages: {
      assistant_role: 'Du bist ein hilfreicher Assistent, der Webseiten analysiert und Fragen dazu beantwortet.',
      context_prefix: 'Kontext - Aktuelle Webseite:',
      page_content: 'Seiteninhalt:',
      page_title: 'Titel',
      page_headings: 'Überschriften',
      page_structure: 'Seitenstruktur',
      page_styles: 'Styling-Informationen',
      page_text: 'Hauptinhalt'
    },
    messages: {
      llm_not_configured: 'LLM nicht konfiguriert',
      summarize_page: 'Bitte fasse diese Seite zusammen. Fokussiere auf den Hauptinhalt und die wichtigsten Informationen.'
    }
  },
  en: {
    errors: {
      server_url_not_configured: 'Track server URL is not configured',
      llm_url_not_configured: 'LLM server URL is not configured',
      server_error: 'Server responded with status',
      llm_server_error: 'LLM server responded with status',
      invalid_track_url: 'Error: Invalid track server URL',
      invalid_llm_url: 'Error: Invalid LLM server URL',
      api_key_required: 'Error: API key required for {provider}',
      mic_permission_denied: 'Please allow microphone access',
      no_speech_detected: 'No speech detected',
      speech_error: 'Speech recognition error'
    },
    success: {
      url_saved: 'URL successfully saved!',
      settings_saved: 'Settings saved!'
    },
    buttons: {
      save: 'Save',
      chat: 'Chat',
      processing: 'Processing...'
    },
    tooltips: {
      save_url: 'Save URL',
      copy: 'Copy to clipboard',
      settings: 'Open settings'
    },
    placeholders: {
      chat_input: 'Enter message... (or leave empty for summary)',
      speech_input: 'Speak now...',
      llm_url: 'http://localhost:11434/api/generate',
      track_url: 'http://localhost:3000/api/track-url',
      api_key: 'API key for external services'
    },
    settings: {
      title: 'URL Tracker Settings',
      llm_section: 'LLM Server',
      track_section: 'Track Server',
      url_tracking: 'Enable URL tracking',
      llm_url_label: 'LLM server URL:',
      llm_url_help: 'The URL of the LLM server. Will be set automatically based on server selection.',
      llm_model_label: 'LLM model:',
      llm_model_help: 'Examples:',
      llm_model_ollama: 'Ollama: llama3, codellama, mistral',
      llm_model_openai: 'OpenAI: gpt-4o, gpt-4o-mini, o1-mini, o1',
      llm_model_anthropic: 'Anthropic: claude-3-5-sonnet-20241022, claude-3-5-haiku',
      api_key_label: 'API key (optional):',
      api_key_help: 'Required for OpenAI and Anthropic, not for local Ollama.',
      track_url_label: 'Track server URL:',
      mode_label: 'Transfer mode:',
      mode_manual: 'Manual',
      mode_automatic: 'Automatic',
      content_label: 'What should be transferred?',
      content_url_only: 'URL only',
      content_with_page: 'URL and page content'
    },
    system_messages: {
      assistant_role: 'You are a helpful assistant that analyzes websites and answers questions about them.',
      context_prefix: 'Context - Current website:',
      page_content: 'Page content:',
      page_title: 'Title',
      page_headings: 'Headings',
      page_structure: 'Page Structure',
      page_styles: 'Styling Information',
      page_text: 'Main Content'
    },
    messages: {
      llm_not_configured: 'LLM not configured',
      summarize_page: 'Please summarize this page. Focus on the main content and the most important information.'
    }
  }
};

// Get user's language, fallback to English if not supported
const getUserLanguage = () => {
  const lang = navigator.language.split('-')[0];
  return translations[lang] ? lang : 'en';
};

// Get translation helper
const t = (key, params = {}) => {
  const lang = getUserLanguage();
  const keys = key.split('.');
  let value = translations[lang];
  
  for (const k of keys) {
    value = value[k];
    if (!value) return key;
  }
  
  // Replace parameters if any
  if (typeof value === 'string') {
    return value.replace(/\{(\w+)\}/g, (_, k) => params[k] || `{${k}}`);
  }
  
  return value;
};

export { t, getUserLanguage }; 