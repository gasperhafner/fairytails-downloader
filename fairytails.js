const puppeteer = require('puppeteer');
const request = require('request');
const fs = require('fs');

const MEDIA_URL = 'https://api.rtvslo.si/ava/getMedia';
const FAIRY_TAIL_URL = 'https://ziv-zav.rtvslo.si/predvajaj/lahko-noc-otroci';

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

async function downloadMp3(id) {
  const url = `${FAIRY_TAIL_URL}/${id}`;

  try {
    const mp3Url = await getMp3Url(url);
    const title = await getTitle(url);
    console.log(mp3Url);
    console.log(title);

    request.get(mp3Url).pipe(fs.createWriteStream(`downloads/${title}.mp3`));

    console.log('Downloaded: ' + id);
  } catch (err) {
    console.log(err);
  }
}

//downloadMp3("https://ziv-zav.rtvslo.si/predvajaj/lahko-noc-otroci/174867111");

async function getFairyTaleIds(url) {
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

async function downloadAll() {
  //let ids = await getFairyTaleIds("https://ziv-zav.rtvslo.si/oddaja/lahko-noc-otroci/54/oddaje");
  let ids = [
    174868311, 174867111, 174867110, 174867109, 174866804, 174866798,
    174866238, 174865964, 174865958, 174864848, 174864844, 174864842,
    174864841, 174863203, 174863195, 174863080, 174863075, 174863071,
    174862801, 174862796, 174862794, 174862531, 174862523, 174861967,
    174861957, 174861252, 174861247, 174860936, 174860682, 174860380,
    174860376, 174860090, 174859263, 174859262, 174858804, 174858802,
    174858463, 174858462, 174858045, 174857025, 174857021, 174856962,
    174856955, 174856735, 174856448, 174856082, 174854164, 174854154,
    174854153, 174854145, 174854114, 174854112, 174854106, 174852721,
    174852719, 174852714, 174852376, 174852363, 174852125, 174850719,
    174850717, 174850713, 174850708, 174850706, 174850250, 174850233,
    174849357, 174849354, 174849352, 174848811, 174848805, 174846609,
    174846606, 174846607, 174846604, 174846601, 174846600, 174846599,
    174845698, 174844786, 174844781, 174844775, 174844754, 174844753,
    174844390, 174844385, 174839804, 174839802, 174839800, 174839773,
    174839772, 174839725, 174839724, 174839718, 174839794, 174839790,
    174839788, 174839785, 174839783, 174839781, 174839777, 174838799,
    174838798, 174838797, 174838796, 174838779, 174838486, 174838205,
    174837289, 174837280, 174837278, 174836956, 174836647, 174836646,
    174835524, 174835523, 174835517, 174835515, 174835285, 174835269,
    174834944
  ]

  ids = [174835524, 174835523, 174835517, 174835515, 174835285, 174835269, 174834944]

  // For is waiting for promise to resolve
  for (const id of ids) {
    // Start and wait for file to be downloaded
    await downloadMp3(id);
    // Wait for 10 seconds after file is downloaded before it starts downloading the new one
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

downloadAll();