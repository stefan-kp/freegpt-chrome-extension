// Speech Recognition Handler
let recognition = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startSpeechRecognition') {
    if (!recognition) {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = request.lang;

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        chrome.runtime.sendMessage({
          action: 'speechResult',
          transcript: finalTranscript || interimTranscript,
          isFinal: !!finalTranscript
        });
      };

      recognition.onerror = (event) => {
        chrome.runtime.sendMessage({
          action: 'speechError',
          error: event.error
        });
      };

      recognition.onend = () => {
        chrome.runtime.sendMessage({
          action: 'speechEnd'
        });
      };
    }

    try {
      recognition.start();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'stopSpeechRecognition' && recognition) {
    recognition.stop();
    sendResponse({ success: true });
    return true;
  }
}); 