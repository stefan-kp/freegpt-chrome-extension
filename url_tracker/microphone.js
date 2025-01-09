import { t, getUserLanguage } from './translations.js';

document.addEventListener('DOMContentLoaded', () => {
  const micButton = document.getElementById('micButton');
  const statusDiv = document.getElementById('status');
  let recognition = null;
  let recognitionTimeout = null;

  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      statusDiv.textContent = t('errors.speech_not_supported');
      micButton.style.display = 'none';
      return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getUserLanguage() === 'de' ? 'de-DE' : 'en-US';

    recognition.onstart = () => {
      micButton.classList.add('recording');
      statusDiv.textContent = t('placeholders.speech_input');
    };

    recognition.onend = () => {
      micButton.classList.remove('recording');
      statusDiv.textContent = t('placeholders.chat_input');
    };

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

      const transcript = finalTranscript || interimTranscript;
      statusDiv.textContent = transcript;

      // Send transcript to popup
      chrome.runtime.sendMessage({
        action: 'transcriptUpdate',
        transcript: transcript
      });

      // Reset timeout for auto-close
      if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
      }

      if (finalTranscript) {
        recognitionTimeout = setTimeout(() => {
          recognition.stop();
          window.close();
        }, 3000);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      micButton.classList.remove('recording');
      
      switch (event.error) {
        case 'not-allowed':
          statusDiv.textContent = t('errors.mic_permission_denied');
          micButton.style.display = 'none';
          break;
        case 'no-speech':
          statusDiv.textContent = t('errors.no_speech_detected');
          break;
        default:
          statusDiv.textContent = t('errors.speech_error');
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Speech recognition start error:', error);
      statusDiv.textContent = t('errors.speech_error');
    }
  };

  // Mic Button Handler
  micButton.addEventListener('click', () => {
    if (!recognition) {
      setupSpeechRecognition();
    } else if (micButton.classList.contains('recording')) {
      recognition.stop();
      window.close();
    } else {
      try {
        recognition.start();
      } catch (error) {
        console.error('Speech recognition start error:', error);
        statusDiv.textContent = t('errors.speech_error');
      }
    }
  });
}); 