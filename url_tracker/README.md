# FreeGPT Chrome Extension

A Chrome extension for chatting with a local LLM and optionally saving URLs.

## Setup

### Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select the extension folder

### Ollama Configuration

Ollama must be started with CORS support for the extension to access it:

```bash
OLLAMA_ORIGINS=* ollama serve
```

Alternative for the Desktop App: Stop Ollama and restart it with:

```bash
export OLLAMA_ORIGINS=*
/Applications/Ollama.app/Contents/Resources/ollama serve
```

### Extension Settings

1. Click the extension icon and select "Options"
2. Configure:
   - Track Server URL (for saving URLs)
   - LLM Server URL (default: http://localhost:11434/api/generate)
   - Optional: API Key (if needed)

## Usage

- **Save URL**: Click "Save" to store the current URL with optional notes
- **Chat**: Enter a question and click "Chat" to interact with the LLM
  - The LLM receives the current page content as context
  - Responses are displayed with live streaming 