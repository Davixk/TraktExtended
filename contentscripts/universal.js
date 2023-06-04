console.log("universal.js loaded");

observeForElementsLoad(".humanized-minutes", addTotalHours);

async function main() {
    await contentLoadedPromise();
    console.log("content loaded");
}

function addTotalHours(element) {
    if (!element.attributes["data-converted"]) {
        const minutes = element.attributes["data-full-minutes"].value;
        element.innerText = convertToHours(minutes);
        element.attributes["data-converted"] = "true";
    }
};

function convertToHours(minutes) {
    minutes = parseInt(minutes.replace(/m|,/g, ""), 10);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours + "h " + remainingMinutes + "m";
};

function contentLoadedPromise() {
    return new Promise((resolve, reject) => {
        if (document.readyState === "complete" || document.readyState === "interactive") {
            resolve();
        } else {
            document.addEventListener("DOMContentLoaded", () => {
                resolve();
            });
        }
    });
};

function observeForElementsLoad(selector, callback) {
    const observer = new MutationObserver((mutationsList, observer) => {
        for(let mutation of mutationsList) {
            if(mutation.type === 'childList') {
                const elements = mutation.target.querySelectorAll(selector);
                elements.forEach(element => {
                    callback(element);
                });
            }
        }
    });

    observer.observe(document, { childList: true, subtree: true });
};

main().catch(error => console.error(error));