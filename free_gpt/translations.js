const translations = {
  de: {
    errors: {
      server_url_not_configured: 'Track-Server URL ist nicht konfiguriert',
      llm_url_not_configured: 'LLM-Server URL ist nicht konfiguriert',
      server_error: 'Server antwortet mit Status',
      llm_server_error: 'LLM-Server antwortet mit Status',
      invalid_track_url: 'Bitte geben Sie eine gültige Track-Server URL ein',
      invalid_llm_url: 'Bitte geben Sie eine gültige LLM-Server URL ein',
      api_key_required: 'Für {provider} wird ein API-Schlüssel benötigt',
      mic_permission_denied: 'Bitte erlauben Sie den Zugriff auf das Mikrofon',
      no_speech_detected: 'Keine Sprache erkannt',
      speech_error: 'Fehler bei der Spracherkennung',
      model_required: 'Bitte wählen Sie ein Modell aus',
      copy_error: 'Fehler beim Kopieren',
      copy_failed: 'Kopieren fehlgeschlagen'
    },
    success: {
      url_saved: 'URL erfolgreich gespeichert!',
      settings_saved: 'Einstellungen gespeichert!',
      copied: 'Kopiert!'
    },
    buttons: {
      save: 'Speichern',
      chat: 'Chat',
      processing: 'Wird verarbeitet...',
      summarize: 'Zusammenfassen'
    },
    tooltips: {
      save_url: 'URL speichern',
      copy: 'In Zwischenablage kopieren',
      settings: 'Einstellungen öffnen',
      microphone: 'Spracheingabe'
    },
    dates: { today: 'Heute', yesterday: 'Gestern' },

    placeholders: {
      chat_input: 'Nachricht eingeben... (oder leer lassen für Zusammenfassung)',
      speech_input: 'Sprechen Sie jetzt...',
      llm_url: 'http://localhost:11434/api/generate',
      track_url: 'http://localhost:3000/api/track-url',
      api_key: 'API Key für externe Dienste'
    },
    messages: {
      summarize_page: 'Bitte fassen Sie diese Seite zusammen.',
      llm_not_configured: 'LLM nicht konfiguriert',
      stopping: 'Beende Aufnahme...'
    },
    roles: {
      user: 'Benutzer',
      assistant: 'Assistent'
    },
    system_messages: {
      assistant_role: 'Sie sind ein hilfreicher Assistent.',
      context_prefix: 'Kontext: Benutzer besucht die URL:',
      page_content: 'Seiteninhalt'
    },
    settings: {
      title: 'FreeGPT Einstellungen',
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
    youtube: {
      section_title: 'YouTube',
      scan_button: 'Abonnements scannen',
      scanning: 'Scanne Abonnements...',
      scan_complete: 'Scan abgeschlossen',
      no_channels_found: 'Keine Kanäle gefunden. Bitte melde dich bei YouTube an und versuche es erneut.',
      channels_count_label: 'Kanäle',
      last_scan_label: 'Letzter Scan',
      col_channel: 'Kanal',
      col_handle: 'Handle',
      col_last_checked: 'Zuletzt geprüft',
      col_last_video: 'Letztes Video',
      hint_scan_then_poll: 'Die Kanäle werden nach dem Scan angezeigt. Details zu Videos erscheinen, sobald die Hintergrundaktualisierung aktiv ist.'
    }
  },

  en: {
    errors: {
      server_url_not_configured: 'Track server URL is not configured',
      llm_url_not_configured: 'LLM server URL is not configured',
      server_error: 'Server responded with status',
      llm_server_error: 'LLM server responded with status',
      invalid_track_url: 'Please enter a valid track server URL',
      invalid_llm_url: 'Please enter a valid LLM server URL',
      api_key_required: '{provider} requires an API key',
      model_required: 'Please select a model',
      mic_permission_denied: 'Please allow microphone access',
      no_speech_detected: 'No speech detected',
      speech_error: 'Speech recognition error',
      copy_error: 'Error copying',
      copy_failed: 'Copy failed'
    },
    success: {
      url_saved: 'URL successfully saved!',
      settings_saved: 'Settings saved!',
      copied: 'Copied!'
    },
    buttons: {
      save: 'Save',
      chat: 'Chat',
      processing: 'Processing...',
      summarize: 'Summarize'
    },
    tooltips: {
      save_url: 'Save URL',
      copy: 'Copy to clipboard',
      settings: 'Open settings',
      microphone: 'Voice input'
    },
    placeholders: {
      chat_input: 'Enter message... (or leave empty for summary)',
      speech_input: 'Speak now...',
      llm_url: 'http://localhost:11434/api/generate',
      track_url: 'http://localhost:3000/api/track-url',
      api_key: 'API key for external services'
    },
    dates: { today: 'Today', yesterday: 'Yesterday' },

    messages: {
      summarize_page: 'Please summarize this page.',
      llm_not_configured: 'LLM not configured',
      stopping: 'Stopping recording...'
    },
    roles: {
      user: 'User',
      assistant: 'Assistant'
    },
    system_messages: {
      assistant_role: 'You are a helpful assistant.',
      context_prefix: 'Context: User is visiting the URL:',
      page_content: 'Page content'
    },
    settings: {
      title: 'FreeGPT Settings',
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
    youtube: {
      section_title: 'YouTube',
      scan_button: 'Scan my subscriptions',
      scanning: 'Scanning subscriptions...',
      scan_complete: 'Scan complete',
      no_channels_found: 'No channels found. Please sign in to YouTube and try again.',
      channels_count_label: 'Channels',
      last_scan_label: 'Last scan',
      col_channel: 'Channel',
      col_handle: 'Handle',
      col_last_checked: 'Last checked',
      col_last_video: 'Last video',
      hint_scan_then_poll: 'Channels are listed after scanning. Video details appear when background refresh is enabled.'
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