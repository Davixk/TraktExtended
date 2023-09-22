# Trakt Extended

Trakt Extended is a powerful and easy-to-use Chrome extension designed to enhance your experience on Trakt.tv. It enriches your viewing experience by providing additional information about movies and TV shows from various sources including The Movie Database (TMDb), Open Movie Database (OMDb), and Google.

## Features

* Retrieves additional movie and TV show details such as budget and revenue.
* Fetches and displays Rotten Tomatoes ratings, and Metacritic scores.
* Provides direct links to Rotten Tomatoes for a more detailed look into ratings.
* All the data fetched is presented on the movie/show's page on Trakt.tv in an intuitive and user-friendly format.

<image src="./res/screenshot1.jpg">

## Installation

1. [Download the latest release](https://github.com/Davixk/TraktExtended/releases/latest)
2. Install the extension
3. Profit :)

Upon successful installation, Chrome will open the `res/options.html` page where you can input your API keys for TMDb and OMDb.

## Permissions Required

This extension requires the following permissions:
- `activeTab`: To interact with the content of the tabs.
- `tabs`: To communicate with tab contents.
- `storage`: To store and retrieve API keys.

## Usage

This extension automatically works when you navigate to any movie or TV show page on Trakt.tv. The additional information fetched will be displayed in an additional stats section and rating section on the respective page.

## Code Overview

This extension is built on the Chrome Extension Manifest V3.

**Content Scripts:** Content scripts are files that run in the context of web pages. The content script in this extension (`content.js`) runs when you visit any movie or TV show page on Trakt.tv and retrieves additional details about the media.

**Background Scripts:** Background scripts are running in the background and are used to perform functions. In this extension, `background.js` is responsible for fetching data from Google.

**Manifest:** The manifest file (`manifest.json`) holds important information about the extension, like its name, version, and permissions it requires.

## Contributing

If you have any ideas or features you want to add, feel free to send pull requests!

## Credits

**Davixk** - Creator and Developer  

**Yours Truly, ChatGPT (OpenAI)** - Readme Contributor

## License

Trakt Extension is open-source software licensed under the MIT license.
