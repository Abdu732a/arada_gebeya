require('dotenv').config();
const { scrapeJijiCategory } = require('./src/scrapers/jijiScraper');
const { parsePrice, extractPhoneNumber } = require('./src/utils/parser');

async function run() {
    console.log('Scraping Jiji TV...');
    const items = await scrapeJijiCategory('https://jiji.com.et/tv-dvd-equipment', 'electronics', parsePrice, extractPhoneNumber);
    console.log(`Got ${items.length} items`);
    if (items.length > 0) {
        console.log('Sample:', JSON.stringify(items[0], null, 2));
    }
}
run().catch(console.error);
