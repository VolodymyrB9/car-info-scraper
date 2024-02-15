
const puppeteer = require('puppeteer-core');
const {AUTH} = require("./auth");
const baseURL ='https://www.icarros.com.br/comprar/volkswagen/gol?reg=city';


async function run (pagesToScrape) {
    const browser = await puppeteer.connect({
        browserWSEndpoint: `wss://${AUTH}@brd.superproxy.io:9222`,
    });
    const page = await browser.newPage();

    try {
        if (!pagesToScrape) {
            pagesToScrape = 1;
        }

        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.resourceType() === 'document') {
                request.continue();
            } else {
                request.abort();
            }
        });

        await page.goto(`${baseURL}`, {waitUntil: "domcontentloaded"});

        let currentPage = 1;
        let offerUrls = [];

        while (currentPage <= pagesToScrape) {
            await page.waitForSelector('.pagination');

            let newUrls = await page.evaluate(() => {
                let urls = [];
                let items = document.querySelectorAll('.card-offer__main-content');
                items.forEach((item) => {
                    let offer_url = item.querySelector('a.offer-card__title-container').href;
                    urls.push(offer_url);
                });
                return urls;
            });

            offerUrls = offerUrls.concat(newUrls);

            if (currentPage < pagesToScrape) {
                await Promise.all([
                    await page.waitForSelector('.pagination'),
                    await page.click('.pagination >.ids-icon-button > .itaufonts_seta_right '),
                    await page.waitForSelector('.pagination')
                ])
            }

            currentPage++;
        }

        let carsData = [];

        for (let url of offerUrls) {
            await page.goto(url, { waitUntil: 'domcontentloaded' });

            let carData = await page.evaluate(() => {
                 return {
                    offer_url: window.location.href,
                    title: document.querySelector('.titulo-sm').innerText,
                    price: document.querySelector('.card-conteudo > h2').innerText,
                    car_year: document.querySelector('.listahorizontal .primeiro > span').innerText,
                    car_millage: document.querySelector('.listahorizontal > li:nth-child(2) > span').innerText,
                    color: document.querySelector('.listahorizontal > li:nth-child(3) > span').innerText // Example selector, adjust as needed
                };
            });

            carsData.push(carData);
        }

        return carsData;
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
}

run(10).then(console.log).catch(console.error);
