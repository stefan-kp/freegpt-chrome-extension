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
      processing: 'Wird verarbeitet...'
    },
    tooltips: {
      save_url: 'URL speichern',
      copy: 'In Zwischenablage kopieren',
      settings: 'Einstellungen öffnen',
      microphone: 'Spracheingabe'
    },
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
      processing: 'Processing...'
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