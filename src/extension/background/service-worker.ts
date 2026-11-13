// Chrome Extension background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('ChatExport extension installed');
});

// Relay extraction request if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_EXPORTER') {
    // Save data to chrome.storage
    chrome.storage.local.set({ chatexport_extracted_data: request.data }, () => {
      // Determine app URL: local web app or hosted
      const appUrl = chrome.runtime.getURL('web/index.html') || 'http://localhost:5173/?source=extension';
      chrome.tabs.create({ url: appUrl });
      sendResponse({ success: true });
    });
    return true;
  }
});
