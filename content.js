// Content script - Intercept Discord's token and API calls
(function () {
  'use strict';

  // Intercept XMLHttpRequest to capture the authorization token
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  let capturedToken = null;

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (name.toLowerCase() === 'authorization' && value && !value.startsWith('Bot ')) {
      if (capturedToken !== value) {
        capturedToken = value;
        window.postMessage({ type: 'DISCORD_TOKEN_CAPTURED', token: value }, '*');
      }
    }
    return originalSetRequestHeader.apply(this, arguments);
  };

  // Also intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const [resource, config] = args;
    if (config && config.headers) {
      let headers = config.headers;
      if (headers instanceof Headers) {
        const auth = headers.get('authorization');
        if (auth && !auth.startsWith('Bot ')) {
          if (capturedToken !== auth) {
            capturedToken = auth;
            window.postMessage({ type: 'DISCORD_TOKEN_CAPTURED', token: auth }, '*');
          }
        }
      } else if (typeof headers === 'object') {
        const auth = headers['Authorization'] || headers['authorization'];
        if (auth && !auth.startsWith('Bot ')) {
          if (capturedToken !== auth) {
            capturedToken = auth;
            window.postMessage({ type: 'DISCORD_TOKEN_CAPTURED', token: auth }, '*');
          }
        }
      }
    }
    return originalFetch.apply(this, args);
  };

  // Listen for messages from popup via background
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DISCORD_TOKEN_CAPTURED') {
      chrome.runtime.sendMessage({
        type: 'TOKEN_FOUND',
        token: event.data.token
      });
    }
  });

  // Listen for requests from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_TOKEN') {
      if (capturedToken) {
        sendResponse({ token: capturedToken });
      } else {
        // Try to get token from webpack modules (Discord stores it internally)
        try {
          const token = getTokenFromDiscord();
          if (token) {
            capturedToken = token;
            sendResponse({ token: token });
          } else {
            sendResponse({ token: null });
          }
        } catch (e) {
          sendResponse({ token: null });
        }
      }
      return true;
    }

    if (message.type === 'FETCH_API') {
      fetchDiscordAPI(message.url, capturedToken)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }
  });

  function getTokenFromDiscord() {
    // Method 1: From localStorage (sometimes works)
    const localToken = localStorage.getItem('token');
    if (localToken) {
      return JSON.parse(localToken);
    }

    // Method 2: From webpackChunk
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const token = iframe.contentWindow.localStorage.getItem('token');
      iframe.remove();
      if (token) return JSON.parse(token);
    } catch (e) { }

    return null;
  }

  async function fetchDiscordAPI(url, token) {
    const response = await fetch(url, {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'X-Discord-Locale': 'en-US',
        'X-Discord-Timezone': 'Asia/Ho_Chi_Minh'
      }
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  }

  console.log('[Discord Decoration Grabber] Content script loaded');
})();
