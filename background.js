chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "searchOnTrakt",
    title: "Search on Trakt",
    contexts: ["selection"]
  });
  chrome.storage.local.get(['tmdbKey', 'omdbKey'], result => {
    if (!result.tmdbKey || !result.omdbKey) {
      chrome.tabs.create({url: "res/options.html"});
    } else {
      console.log('Keys are stored in local storage.');
      chrome.tabs.query({url: "*://*.trakt.tv/*"}, tabs => {
        tabs.forEach(tab => {
          console.log("Reloading content page at " + tab.url);
          chrome.tabs.reload(tab.id);
        });
      });
    }
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "searchOnTrakt") {
    chrome.tabs.create({url: createTraktSearchUrl(info.selectionText)});
  }
});

function createTraktSearchUrl(query) {
  return "https://trakt.tv/search?query=" + encodeURIComponent(query);
};