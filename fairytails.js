const puppeteer = require('puppeteer');
const request = require('request');
const fs = require('fs');
const axios = require('axios')

const MEDIA_URL = 'https://api.rtvslo.si/ava/getMedia';
const FAIRY_TAIL_URL = 'https://ziv-zav.rtvslo.si/predvajaj/lahko-noc-otroci';
const FAIRY_TAIL_API_ENDPOINT = 'https://api.rtvslo.si/ava/getSearch2?client_id=82013fb3a531d5414f478747c1aca622&showId=54&clip=show&sort=date&order=desc'

async function getMediaUrl(url) {
  let mp3Url = null;
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setRequestInterception(true);

  page.on('request', (interceptedRequest) => {
    if (interceptedRequest.isInterceptResolutionHandled()) {
      return;
    }

    if (interceptedRequest.url().includes(MEDIA_URL)) {
      mp3Url = interceptedRequest.url();
      interceptedRequest.abort();
    } else {
      interceptedRequest.continue();
    }
  });

  await page.goto(url);
  await browser.close();
  return mp3Url;
}

async function getTitle(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const websiteContent = await page.content();
  const regex = /<h1 class=\"funky-font h3\">(.*?)<\/h1>/;
  const match = websiteContent.match(regex);
  await browser.close();
  return match[1];
}

async function getMp3Url(url) {
  try {
    url = await getMediaUrl(url);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const websiteContent = await page.content();
    await browser.close();
    const regex = /\"https"\:\"(.*?)\?/;
    const match = websiteContent.match(regex);
    return match[1];
  } catch (err) {
    console.log("Could not resolve the browser instance => ", err);
  }
}

async function downloadMp3(id, title) {
  const url = `${FAIRY_TAIL_URL}/${id}`;

  try {
    const mp3Url = await getMp3Url(url);
    request.get(mp3Url).pipe(fs.createWriteStream(`downloads/${title}.mp3`));
    console.log('Downloaded: ' + title);
  } catch (err) {
    console.log(err);
  }
}

//downloadMp3("https://ziv-zav.rtvslo.si/predvajaj/lahko-noc-otroci/174867111");
async function scrapeFairyTaleIds(url) {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const websiteContent = await page.content();
    await browser.close();
    const regex = /\d{9}/g;
    const match = websiteContent.match(regex);
    return [...new Set(match)];
  } catch (err) {
    console.log('Could not resolve the browser instance => ', err);
  }
}

async function getFairyTales(fairy_no = 1) {
  return axios
    .get(FAIRY_TAIL_API_ENDPOINT, {
      params: {
        pageSize: fairy_no
      }
    })
    .then(res => {
      return res.data.response.recordings
    })
    .catch(error => {
      console.error(error);
    });
}

async function downloadLastFairyTale() {
  const fairytales = await getFairyTales();
  await downloadMp3(fairytales[0].id, fairytales[0].title);
}

// dowload last 10 fairytales 
async function downloadLatest() {
  const fairytales = await getFairyTales(10);
  // For is waiting for promise to resolve
  for (const fairy_tale of fairytales) {
    // Start and wait for file to be downloaded
    await downloadMp3(fairy_tale.id, fairy_tale.title);
    // Wait for 10 seconds after file is downloaded before it starts downloading the new one
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

//downloadLastFairyTale();
downloadLatest();