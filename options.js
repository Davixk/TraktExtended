chrome.storage.local.get(['tmdbKey', 'omdbKey'], result => {
    if (result.tmdbKey) {
        document.getElementById('tmdbKey').value = result.tmdbKey;
    }
    if (result.omdbKey) {
        document.getElementById('omdbKey').value = result.omdbKey;
    }
});

document.getElementById('keysForm').addEventListener('submit', function(event) {
    event.preventDefault();
    let tmdbKey = document.getElementById('tmdbKey').value;
    let omdbKey = document.getElementById('omdbKey').value;
    chrome.storage.local.set({tmdbKey, omdbKey}, () => {
        let error = chrome.runtime.lastError;
        if (error) {
            console.error(error);
        } else {
            console.log('Keys are stored in local storage.');
            chrome.tabs.query({url: "*://*.trakt.tv/*"}, tabs => {
                tabs.forEach(tab => {
                    console.log("Reloading content page at " + tab.url);
                    chrome.tabs.reload(tab.id);
                });
                window.close();
            });
        }
    });    
});