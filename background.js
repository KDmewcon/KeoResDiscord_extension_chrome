// Background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOKEN_FOUND') {
    // Store token
    chrome.storage.local.set({ discordToken: message.token });
  }

  if (message.type === 'DOWNLOAD_FILE') {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true;
  }

  if (message.type === 'DOWNLOAD_ALL') {
    const items = message.items;
    let completed = 0;
    let failed = 0;

    items.forEach((item, index) => {
      setTimeout(() => {
        chrome.downloads.download({
          url: item.url,
          filename: item.filename,
          saveAs: false
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            failed++;
          } else {
            completed++;
          }
          if (completed + failed === items.length) {
            sendResponse({ success: true, completed, failed });
          }
        });
      }, index * 200); // Stagger downloads
    });
    return true;
  }
});
