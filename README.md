# FreeGPT Chrome Extension

A Chrome extension that allows you to analyze web pages using various LLM services (Ollama, OpenAI, Anthropic).

## Coming Soon to Chrome Web Store!
We're excited to announce that an official version of this extension will be available on the Chrome Web Store soon. The submission is in preparation and will be published in the near future.

Until then, you can use the extension in developer mode by following the installation instructions below.

## Features
- YouTube “New Videos” page:
  - Scans Suggested and History in an active tab for best coverage
  - Completion banner with one‑click “Close Tab”
  - Robust title extraction and local merge (dedupe by videoId)
  - Per‑day Summarize using either Chrome’s on‑device Summarizer or your configured LLM
  - Quick copy buttons for URLs/titles (great for NotebookLM workflows)
- Support for multiple LLM providers:
  - Local Ollama server
  - OpenAI (with API key)
  - Anthropic (with API key)
- Voice input support
- Markdown rendering
- Optional URL tracking
- Temporary conversation storage
- Multi-language support

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Configuration

1. Click the extension icon and select "Options"
2. Configure:
   - LLM Server (Ollama recommended for free usage)
   - API Key (only if using OpenAI or Anthropic)
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