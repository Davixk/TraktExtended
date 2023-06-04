console.log("dashboard.js loaded");

async function main() {
    await contentLoadedPromise();
    console.log("content loaded");

    addTotalHours();
}

async function addTotalHours() {
    await waitForElementsLoad(".humanized-minutes");
    document.querySelectorAll(".humanized-minutes").forEach((element) => {
        const minutes = element.attributes["data-full-minutes"].value;
        element.appendChild(document.createTextNode(" or "+convertToHours(minutes)));
    });
}

function convertToHours(minutes) {
    minutes = parseInt(minutes.replace(/m|,/g, ""), 10);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours + "h " + remainingMinutes + "m";
}

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

function waitForElementsLoad(selector) {
    return new Promise(resolve => {
        const observer = new MutationObserver((mutationsList, observer) => {
            if(document.querySelector(selector)){
                console.log(selector+" element loaded");
                console.log(mutationsList);
                resolve();
                observer.disconnect();
            }
        });

        observer.observe(document, { childList: true, subtree: true });
    });
}

main().catch(error => console.error(error));