// src/scrapers/engochaScraper.js
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes product listings from Engocha.com
 * @param {string} categoryUrl - Target category URL on Engocha
 * @param {string} category - Primary category identifier
 * @param {string} subcategory - Subcategory identifier
 */
async function scrapeEngochaCategory(categoryUrl, category, subcategory) {
    const scrapedProducts = [];

    try {
        const { data } = await axios.get(categoryUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            },
            timeout: 15000,
        });

        const $ = cheerio.load(data);

        $('.listing-item, .item-card, article, tr.item').each((_, el) => {
            const $el = $(el);

            const title = $el.find('.title, .item-title, h4, h3').text().trim();
            const rawPrice = $el.find('.price, .item-price').text().trim();
            const relativeUrl = $el.find('a').attr('href');
            const imageUrl = $el.find('img').attr('src') || $el.find('img').attr('data-src');
            const location = $el.find('.location, .item-location').text().trim();

            if (title && relativeUrl) {
                const productUrl = relativeUrl.startsWith('http')
                    ? relativeUrl
                    : `https://www.engocha.com${relativeUrl}`;

                const cleanId = relativeUrl.replace(/^\//, '').replace(/\//g, '_');

                scrapedProducts.push({
                    externalId: `engocha_${cleanId}`,
                    title,
                    description: null,
                    price: rawPrice,
                    category,
                    subcategory,
                    productUrl,
                    imageUrl: imageUrl || null,
                    location: location || 'Addis Ababa',
                    phoneNumber: null,
                    attributes: {
                        sourceSite: 'Engocha',
                        rawPrice,
                        rawRegion: location,
                    },
                });
            }
        });

        return scrapedProducts;
    } catch (error) {
        console.error(`❌ Error scraping Engocha (${categoryUrl}):`, error.message);
        return [];
    }
}

module.exports = { scrapeEngochaCategory };