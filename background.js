chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({url: "*://*.trakt.tv/*"}, tabs => {
    tabs.forEach(tab => {
      console.log("Reloading recipe page at " + tab.url);
      chrome.tabs.reload(tab.id);
    });
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetch") {
    console.log("request received: "+ request.url);
    fetch(request.url)
      .then(response => response.text())
      .then(text => sendResponse({data: text, success: true}))
      .catch(error => sendResponse({data: error, success: false}));
    return true;
  }
});