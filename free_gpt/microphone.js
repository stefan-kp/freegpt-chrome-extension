import { t, getUserLanguage } from './translations.js';

let recognition = null;

function initSpeechRecognition() {
  if (!recognition) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = getUserLanguage() === 'de' ? 'de-DE' : 'en-US';

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      // Send message and wait for it to complete before closing
      chrome.runtime.sendMessage({ type: 'speechResult', text: text })
        .then(() => {
          console.debug('Speech result sent successfully');
          setTimeout(() => window.close(), 500); // Give time for the message to be processed
        })
        .catch((error) => {
          console.error('Failed to send speech result:', error);
          window.close();
        });
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = t('errors.speech_error');
      
      if (event.error === 'not-allowed') {
        errorMessage = t('errors.mic_permission_denied');
      } else if (event.error === 'no-speech') {
        errorMessage = t('errors.no_speech_detected');
      }
      
      chrome.runtime.sendMessage({ type: 'speechError', error: errorMessage })
        .then(() => {
          console.debug('Error message sent successfully');
          setTimeout(() => window.close(), 2000); // Keep window open longer for error visibility
        })
        .catch(() => {
          console.debug('Failed to send error message');
          window.close();
        });
    };

    recognition.onend = () => {
      // Don't close immediately, let the result/error handlers handle it
      console.debug('Speech recognition ended');
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const micButton = document.getElementById('micButton');
  const status = document.getElementById('status');

  // Start speech recognition automatically
  try {
    initSpeechRecognition();
    recognition.start();
    status.textContent = t('placeholders.speech_input');
    micButton.classList.add('recording');
  } catch (error) {
    console.error('Failed to start speech recognition:', error);
    status.textContent = t('errors.speech_error');
    chrome.runtime.sendMessage({ 
      type: 'speechError', 
      error: t('errors.speech_error') 
    }).finally(() => {
      setTimeout(() => window.close(), 2000);
    });
  }

  // Button for manual stop
  micButton.addEventListener('click', () => {
    if (recognition) {
      status.textContent = t('messages.stopping');
      recognition.stop();
    }
  });
}); 