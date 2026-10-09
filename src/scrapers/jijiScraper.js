// src/scrapers/jijiScraper.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');

puppeteer.use(StealthPlugin());

/**
 * Scrapes product listings from a specified Jiji Ethiopia URL.
 */
async function scrapeJijiCategory(url, categoryKey, parsePrice, extractPhoneNumber) {
    let browser = null;
    const scrapedProducts = [];

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1440,900',
            ],
        });

        const page = await browser.newPage();

        await page.setViewport({ width: 1440, height: 900 });
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        );

        // Bypass WebDriver detection flag
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for listing container or item link to render on DOM
        await page.waitForSelector('a[href*="/"]', { timeout: 15000 }).catch(() => {});

        // Scroll to load dynamic content
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 400;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= 3200) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 200);
            });
        });

        // Give dynamic JS time to render elements after scroll
        await new Promise((res) => setTimeout(res, 2500));

        const html = await page.content();
        const $ = cheerio.load(html);

        // Primary strategy: Select links pointing to item detail pages
        const seenUrls = new Set();

        $('a[href]').each((_, el) => {
            const $a = $(el);
            const href = $a.attr('href');

            // Jiji item URLs typically end with a hash identifier or `.html`
            if (!href || seenUrls.has(href)) return;
            const isItemLink = href.match(/\/[a-zA-Z0-9-]+-[a-zA-Z0-9]{8,}\.html/) || 
                   (href.includes('/') && href.split('-').length > 2 && !href.includes('/category') && !href.includes('?page='));

            if (!isItemLink) return;

            // Scope context to the closest wrapper/card
            const $card = $a.closest('div[class*="item"], div[class*="advert"], article, li') || $a.parent();

            const title = $card.find('div[class*="title"], text[class*="title"], h3, h2, .b-list-advert__item-title')
                .first().text().trim() || $a.text().trim();

            const rawPrice = $card.find('div[class*="price"], span[class*="price"], .qa-advert-price')
                .first().text().trim();

            const $img = $card.find('img');
            const imageUrl = $img.attr('src') || $img.attr('data-src') || null;

            const location = $card.find('div[class*="region"], span[class*="region"], div[class*="location"]')
                .first().text().trim();

            if (title && title.length > 3 && rawPrice) {
                seenUrls.add(href);
                const productUrl = href.startsWith('http') ? href : `https://jiji.com.et${href}`;

                scrapedProducts.push({
                    externalId: `jiji_${href.split('?')[0].replace(/^\//, '')}`,
                    title,
                    description: null,
                    price: parsePrice ? parsePrice(rawPrice) : rawPrice,
                    category: categoryKey,
                    productUrl,
                    imageUrl: imageUrl && !imageUrl.startsWith('data:') ? imageUrl : null,
                    location: location || 'Addis Ababa',
                    phoneNumber: null,
                    attributes: {
                        sourceSite: 'Jiji Ethiopia',
                        rawRegion: location,
                        rawPrice,
                    },
                });
            }
        });

        return scrapedProducts;
    } catch (error) {
        console.error(`❌ Error scraping ${url}:`, error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    scrapeJijiCategory,
};