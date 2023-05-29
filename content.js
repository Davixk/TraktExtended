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
    getTMDBData(content.title, content.year)
    .then((data) => {
      console.log("data: " + JSON.stringify(data));
      if (data.budget) appendAdditionalStatsElement("Budget", data.budget);
      if (data.revenue) appendAdditionalStatsElement("Revenue", data.revenue);
    })
    .catch(error => { console.error(error); });

    const url = `https://www.google.com/search?q=${encodeURIComponent(`${content.title} ${content.year}`)}`;
    fetchData(url).then((data) => {
      console.log("data: " + JSON.stringify(data));
      if (data.budget) appendAdditionalStatsElement("Budget", data.budget);
      if (data.revenue) appendAdditionalStatsElement("Revenue", data.revenue);
      insertRottenTomatoesLink(data.link);
      insertRottenTomatoesScore(data.link, data.score);
    }).catch(error => { console.error(error); });
  }
});

async function getTMDbData(movieName, releaseYear) {
  const searchResponse = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(movieName)}&year=${releaseYear}`);
  const searchData = await searchResponse.json();
  if (searchData.results && searchData.results.length > 0) {
    const movieId = searchData.results[0].id;
    const movieResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${tmdbApiKey}`);
    const movieData = await movieResponse.json();
    const budget = movieData.budget;
    const boxOffice = movieData.revenue;
    return {
      budget: budget,
      boxOffice: boxOffice
    };
  }
  throw new Error('Movie not found');
}

async function getOMDbData(movieName, releaseYear) {
  const response = await fetch(`http://www.omdbapi.com/?t=${encodeURIComponent(movieName)}&y=${releaseYear}&apikey=${omdbApiKey}`);
  const data = await response.json();
  if (data.Response === "True") {
    // Extract the desired fields
    const boxOffice = data.BoxOffice;
    const budget = data.Budget; // OMDb does not always provide this field
    const rottenTomatoesRating = data.Ratings.find(rating => rating.Source === 'Rotten Tomatoes');
    return {
      boxOffice: boxOffice,
      budget: budget,
      rottenTomatoesScore: rottenTomatoesRating ? rottenTomatoesRating.Value : null
    };
  } else {
    throw new Error('Movie not found');
  }
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
          //let budgetDivSpans = findDivSpans(doc, 'budget');
          const budget = extractMoneyInfo(findDivSpans(doc, 'budget'));
          info.budget = budget;
        } catch (error) {
          console.log("No budget data found");
        }
        
        try {
          //let revenueDivSpans = findDivSpans(doc, 'box_offic');
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
  let RatingElement = document.createElement("li");

  RatingElement.setAttribute("class", "rottentomatoes-rating");
  let aElement=document.createElement("a");
  aElement.setAttribute("href", link);
  RatingElement.appendChild(aElement);

  let IconDivElement=document.createElement("div");
  IconDivElement.setAttribute("class", "icon fa fa-tomato");
  aElement.appendChild(IconDivElement);

  let NumberDivElement=document.createElement("div");
  NumberDivElement.setAttribute("class", "number");
  aElement.appendChild(NumberDivElement);

  let RatingDivElement=document.createElement("div");
  RatingDivElement.setAttribute("class", "rating");
  RatingDivElement.textContent = score;
  NumberDivElement.appendChild(RatingDivElement);

  let VotesDivElement=document.createElement("div");
  VotesDivElement.setAttribute("class", "votes");
  VotesDivElement.textContent = "Critics' Score";
  NumberDivElement.appendChild(VotesDivElement);

  document.querySelector("ul.ratings").insertBefore(RatingElement, document.querySelector("ul.ratings").firstChild);
};