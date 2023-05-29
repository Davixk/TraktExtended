chrome.runtime.onInstalled.addListener(() => {
  
  chrome.tabs.create({url: "res/options.html"});
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