const puppeteer = require("puppeteer");
const request = require("request");
const fs = require("fs");
const axios = require("axios");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const MEDIA_URL = "https://api.rtvslo.si/ava/getMedia";
const FAIRY_TAIL_URL = "https://ziv-zav.rtvslo.si/predvajaj/lahko-noc-otroci";
const FAIRY_TAIL_API_ENDPOINT =
  "https://api.rtvslo.si/ava/getSearch2?client_id=82013fb3a531d5414f478747c1aca622&showId=54&clip=show&sort=date&order=desc";

async function getMediaUrl(url) {
  let mp3Url = null;
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setRequestInterception(true);

  page.on("request", (interceptedRequest) => {
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

async function downloadMp3(id, title, date) {
  const url = `${FAIRY_TAIL_URL}/${id}`;
  const filePath = `downloads/${title}.mp3`;

  // // Check if file already exists in the downloads directory
  // if (fs.existsSync(filePath)) {
  //   console.log(`File ${filePath} already exists.`);
  //   return true;
  // }

  // Read the downloaded.txt file and check if the title already exists
  let downloadedTitles = [];
  if (fs.existsSync("downloaded.txt")) {
    downloadedTitles = fs.readFileSync("downloaded.txt", "utf8").split("\n");
  }
  if (downloadedTitles.includes(title)) {
    console.log(`Title "${title}" already exists in downloaded.txt.`);

    fs.writeFile("date.txt", date, function (err) {
      if (err) throw err;
    });

    return true;
  }

  try {
    const mp3Url = await getMp3Url(url);
    request.get(mp3Url).pipe(fs.createWriteStream(filePath));

    // After successful try execution, store the title in a downloaded.txt file
    fs.appendFile("downloaded.txt", title + "\n", function (err) {
      if (err) throw err;
    });
  } catch (err) {
    console.log(err);
  }

  fs.writeFile("date.txt", date, function (err) {
    if (err) throw err;
  });

  return false;
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
    console.log("Could not resolve the browser instance => ", err);
  }
}

async function getFairyTales(last = 1) {
  return axios
    .get(FAIRY_TAIL_API_ENDPOINT, {
      params: {
        pageSize: last,
      },
    })
    .then((res) => {
      return res.data.response.recordings;
    })
    .catch((error) => {
      console.error(error);
    });
}

async function downloadLastFairyTale() {
  const fairytales = await getFairyTales();
  await downloadMp3(
    fairytales[0].id,
    fairytales[0].title,
    fairytales[0].prettyDates.iso
  );
}

// dowload last 10 fairytales
async function downloadLatest(last, date) {
  let fairytales = await getFairyTales(last);
  // Revert the array
  fairytales = fairytales.reverse();
  // Remove objects from the array until fairy_tale.prettyDates.iso equals date
  const index = fairytales.findIndex(
    (fairy_tale) => fairy_tale.prettyDates.iso === date
  );
  if (index !== -1) {
    fairytales = fairytales.slice(index + 1);
  }
  // Count how many objects remain in the array and log the number out
  console.log(`Number of fairytales to download: ${fairytales.length}`);
  // Initialize progress counter
  let progressCounter = 0;
  // For is waiting for promise to resolve
  for (const fairy_tale of fairytales) {
    let title = fairy_tale.title;
    // Check if title contains / and replace it with -
    if (title.includes("/")) {
      title = title.replace(/\//g, "-");
    }
    // Start and wait for file to be downloaded
    const fileExists = await downloadMp3(
      fairy_tale.id,
      title,
      fairy_tale.prettyDates.iso
    );

    if (!fileExists) {
      // Wait for 10 seconds after file is downloaded before it starts downloading the new one
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    // Increment progress counter
    progressCounter++;
    // Calculate progress percentage
    const progressPercentage = (progressCounter / fairytales.length) * 100;
    // Log progress bar
    if (!fileExists) {
      console.log(
        `Progress: ${progressPercentage.toFixed(2)}% - ${
          fairy_tale.prettyDates.iso
        }: ${title} -> downloaded.`
      );
    }
  }
}
const argv = yargs(hideBin(process.argv)).argv;

if (typeof argv.latest !== "undefined") {
  downloadLastFairyTale();
} else {
  // Read date from date.txt file if it exists and is not empty
  let date = null;
  if (fs.existsSync("date.txt")) {
    const fileContent = fs.readFileSync("date.txt", "utf8");
    if (fileContent && !isNaN(Date.parse(fileContent))) {
      date = fileContent;
    }
  }

  if (date !== null) {
    // Log the date read from the file
    console.log(`Downloading from ${date} onwards`);
  }

  var last = typeof argv.last !== "undefined" ? argv.last : 1400;
  // var date = typeof argv.date !== "undefined" ? argv.date : null;

  // last = last > 200 ? 200 : last;
  downloadLatest(last, date);
}
