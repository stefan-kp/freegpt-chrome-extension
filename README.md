# FreeGPT Chrome Extension

A Chrome extension that allows you to chat with various LLM providers (OpenAI, Anthropic, Ollama) about web page content. It supports multiple languages and can optionally track URLs.

## Features

- 🤖 Support for multiple LLM providers:
  - OpenAI (GPT-4, etc.)
  - Anthropic (Claude)
  - Ollama (local models)
- 🌐 Multilingual support (English, German)
- 📝 Markdown rendering for responses
- 🔊 Speech-to-text input
- 📋 Copy conversation to clipboard
- 🔗 Optional URL tracking
- 🎨 Clean, modern UI

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/freegpt-chrome-extension.git
   ```

2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the extension folder

## Configuration

### Ollama Setup

Ollama must be started with CORS support for the extension to access it:

```bash
OLLAMA_ORIGINS=* ollama serve
```

For the Desktop App: Stop Ollama and restart it with:

```bash
export OLLAMA_ORIGINS=*
/Applications/Ollama.app/Contents/Resources/ollama serve
```

### Extension Settings

1. Click the extension icon and select "Options"
2. Configure:
   - LLM Server (Ollama, OpenAI, or Anthropic)
   - API Key (required for OpenAI and Anthropic)
   - Model selection
   - Optional URL tracking settings

## Usage

- Click the extension icon on any webpage
- Type your question or leave empty for a page summary
- Use the microphone button for voice input
- Copy conversations to clipboard
- Optionally save URLs and conversations to your tracking server

## Development

The extension is built with vanilla JavaScript and uses:
- Chrome Extension APIs
- Web Speech API for voice input
- Marked.js for Markdown rendering

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 