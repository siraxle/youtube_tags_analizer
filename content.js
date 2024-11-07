// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractTags') {
    const keywords = document.querySelector('meta[name="keywords"]')?.content || '';
    sendResponse({ tags: keywords.split(',').map(tag => tag.trim()) });
  }
}); 