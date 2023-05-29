console.log("contentscript loaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded");
  const pageType = document.querySelector('meta[property="og:type"]').content;
  console.log("pageType: " + pageType);
  if (pageType === "video.movie" || pageType === "video.tv_show") {
    let content = {};
    content.title= document.querySelector("h1").childNodes[0].textContent;
    const yearElement = document.querySelector("h1 .year");
    if (yearElement) {
        content.year = yearElement.textContent;
    } else {console.log("no year found");}
    getTMDbData(content.title, content.year).then(data => {
      console.log("TMDb data: " + JSON.stringify(data));
      if (data.budget) appendAdditionalStatsElement("Budget (TMDb)", data.budget);
      if (data.revenue) appendAdditionalStatsElement("Box Office (TMDb)", data.revenue);
    })
    .catch(error => { console.error(error); });

    getOMDbData(content.title, content.year).then(data => {
      console.log("OMDb data: " + JSON.stringify(data));
      if (data.budget) appendAdditionalStatsElement("Budget (OMDb)", data.budget);
      //if (data.revenue) appendAdditionalStatsElement("Box Office (OMDb)", data.revenue);
      if (data.rottenTomatoesRating) insertRottenTomatoesScore("rottentomatoes.com/", data.rottenTomatoesScore);
      if (data.metascore && data.metascore.trim()!="N/A") insertScore("metacritic.com/", data.metascore, "metacritic", "Metascore", "star");
    })
    .catch(error => { console.error(error); });

    const url = `https://www.google.com/search?q=${encodeURIComponent(`${content.title} ${content.year}`)}`;
    fetchData(url).then((data) => {
      console.log("data: " + JSON.stringify(data));
      if (data.budget) appendAdditionalStatsElement("Budget (Google)", data.budget);
      if (data.revenue) appendAdditionalStatsElement("Box Office (Google)", data.revenue);
      if (data.link && data.score) {
        insertRottenTomatoesLink(data.link);
        if (data.score) insertRottenTomatoesScore(data.link, data.score);
      }
    }).catch(error => { console.error(error); });
  }
});

async function getTMDbData(movieName, releaseYear) {
  try {var tmdbApiKey = await getStoredKeys(['tmdbKey']);}
  catch (error) {console.error("Couldn't retrieve TMDb API Key" + error);}
  const searchResponse = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(movieName)}&year=${releaseYear}`);
  const searchData = await searchResponse.json();
  if (searchData.results && searchData.results.length > 0) {
    const movieId = searchData.results[0].id;
    const movieResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${tmdbApiKey}`);
    const movieData = await movieResponse.json();
    console.log(movieData);
    const budget = formatNumberToCurrency(movieData.budget);
    const revenue = formatNumberToCurrency(movieData.revenue);
    return {
      budget,
      revenue
    };
  }
  throw new Error('Movie not found');
}

async function getOMDbData(movieName, releaseYear) {
  try {var omdbApiKey = await getStoredKeys(['omdbKey']);}
  catch (error) {console.error("Couldn't retrieve OMDb API Key" + error);}
  const response = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(movieName)}&y=${releaseYear}&apikey=${omdbApiKey}`);
  const data = await response.json();
  console.log(data);
  if (data.Response === "True") {
    const revenue = formatNumberToCurrency(data.BoxOffice);
    const budget = formatNumberToCurrency(data.Budget); // OMDb does not always provide this field
    const rottenTomatoesRating = data.Ratings.find(rating => rating.Source === 'Rotten Tomatoes');
    const metascore = data.Metascore;
    return {
      revenue,
      budget,
      rottenTomatoesScore: rottenTomatoesRating ? rottenTomatoesRating.Value : null,
      metascore
    };
  } else {
    throw new Error('Movie not found');
  }
}

function getStoredKeys(keys) {
  return new Promise((resolve, reject) => {
    if (Array.isArray(keys) && keys.length === 1) {
      chrome.storage.local.get(keys[0], result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[keys[0]]);
        }
      });
    } else {
      chrome.storage.local.get(keys, result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    }
  });
}

async function fetchData(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "fetch", url }, function (response) {
      if (response.success) {
        console.log("response success");
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.data, "text/html");
        let info = {};

        const links = Array.from(doc.querySelectorAll('a[href*="rottentomatoes.com"]'));
        const desiredLink = links.find(link => {
          const span = link.querySelector('span');
          if (span) {
            const text = span.textContent.trim();
            if (/^\d{1,3}%$/.test(text) && parseInt(text, 10) >= 0 && parseInt(text, 10) <= 100) {
              return true;
            }
          }
          return false;
        });
        if (desiredLink) {
          info.score = desiredLink.firstChild.textContent;
          info.link = desiredLink.href;
        } else {
          console.log("No Rotten Tomatoes data found");
        }

        try {
          const budget = extractMoneyInfo(findDivSpans(doc, 'budget'));
          info.budget = budget;
        } catch (error) {
          console.log("No budget data found");
        }
        
        try {
          const revenue = extractMoneyInfo(findDivSpans(doc, 'box_offic'));
          info.revenue = revenue;
        } catch (error) {
          console.log("No revenue data found");
        }
        
        resolve(info);
      } else {
        console.error(response.data);
        reject(response.data);
      }
    });
  });
};

function findDivSpans(page, dataAttrId) {
  return Array.from(page.querySelectorAll('div[data-attrid]'))
    .find(div => div.getAttribute('data-attrid').includes(dataAttrId)).querySelectorAll('span');
}

function extractMoneyInfo(divSpans) {
  let moneyInfo = "";
  if (divSpans.length > 0) {
    divSpans.forEach(span => {
      let text = span.textContent.replace(/[:"]/g, '').trim();
      if (text !== '' && text !== moneyInfo && text !== 'Budget' && text !== 'Box office') {
        moneyInfo += text;
      }
    });
  }
  return moneyInfo;
};

function insertMoneyInfo(budget,revenue) {
  if (budget) appendAdditionalStatsElement("Budget", budget);
  if (revenue) appendAdditionalStatsElement("Revenue", revenue);
};

function appendAdditionalStatsElement(labelText, text){
  let stat = document.createElement("li");

  let statLabel = document.createElement("label");
  statLabel.textContent = labelText;
  stat.appendChild(statLabel);

  stat.appendChild(document.createTextNode(text));

  let AdditionalStatsContainer = document.querySelector("ul.additional-stats");
  AdditionalStatsContainer.insertBefore(stat, AdditionalStatsContainer.lastChild);
};

function insertRottenTomatoesLink(link){
  let LinkButtonElement = document.createElement("a");
  LinkButtonElement.setAttribute("href", link);
  LinkButtonElement.setAttribute("target", "_blank");
  LinkButtonElement.setAttribute("id", "btn external-link-rottentomatoes");
  LinkButtonElement.setAttribute("data-original-title", "");
  LinkButtonElement.textContent = "Rotten Tomatoes";

  document.querySelector("ul.external>li").insertBefore(LinkButtonElement, document.querySelector("ul.external>li").firstChild);
};

function insertRottenTomatoesScore(link, score){
  insertScore(link, score, "rottentomatoes", "Critics' Score", "tomato");
};

function insertScore(link, score, className, labelText, iconClass) {
  let RatingElement = document.createElement("li");
  RatingElement.setAttribute("class", className+"-rating");

  let aElement = document.createElement("a");
  aElement.setAttribute("href", link);
  RatingElement.appendChild(aElement);

  let IconDivElement = document.createElement("div");
  IconDivElement.setAttribute("class", "icon fa fa-"+ iconClass);
  aElement.appendChild(IconDivElement);

  let NumberDivElement = document.createElement("div");
  NumberDivElement.setAttribute("class", "number");
  aElement.appendChild(NumberDivElement);

  let RatingDivElement = document.createElement("div");
  RatingDivElement.setAttribute("class", "rating");
  RatingDivElement.textContent = score;
  NumberDivElement.appendChild(RatingDivElement);

  let VotesDivElement = document.createElement("div");
  VotesDivElement.setAttribute("class", "votes");
  VotesDivElement.textContent = labelText;
  NumberDivElement.appendChild(VotesDivElement);

  document.querySelector("ul.ratings").insertBefore(
    RatingElement,
    document.querySelector("ul.ratings").firstChild
  );
}

function formatNumberToCurrency(number) {
  if (!number) return null;
  let num = number;
  if (typeof number === 'string') {
    if (number.includes('B')) {
      num = parseFloat(number.replace('B', '')) * 1e9;
    } else if (number.includes('M')) {
      num = parseFloat(number.replace('M', '')) * 1e6;
    } else if (number.includes('K')) {
      num = parseFloat(number.replace('K', '')) * 1e3;
    } else if (number.includes(',')) {
      num = parseFloat(number.replace(/[\$,]/g, ''));
    } else {
      num = parseFloat(number.replace('$', ''));
    }
  }
  let format = '';
  if (num >= 1e9) {
    let val = (num / 1e9).toFixed(1);
    format = '$' + (val.endsWith('.0') ? val.slice(0, -2) : val) + ' billion';
  } else if (num >= 1e6) {
    let val = (num / 1e6).toFixed(1);
    format = '$' + (val.endsWith('.0') ? val.slice(0, -2) : val) + ' million';
  } else if (num >= 1e3) {
    let val = (num / 1e3).toFixed(1);
    format = '$' + (val.endsWith('.0') ? val.slice(0, -2) : val) + ' thousand';
  } else {
    format = '$' + num;
  }
  return format;
};