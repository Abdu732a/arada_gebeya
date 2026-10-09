// src/scrapers/qefiraScraper.js
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes product listings from Qefira.com
 * @param {string} categoryUrl - Target category URL on Qefira
 * @param {string} category - Primary category identifier
 * @param {string} subcategory - Subcategory identifier
 */
async function scrapeQefiraCategory(categoryUrl, category, subcategory) {
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

        $('.directorypress-listing, .post-card, .listing-card, .item, article').each((_, el) => {
            const $el = $(el);

            const title = $el.find('.directorypress-listing-title, .post-title, .title, h2, h3, h4').first().text().trim().replace(/\s+/g, ' ');
            const rawPriceText = $el.find('.directorypress-field-type-price, .listing-bottom-metas, .post-price, .price').first().text().trim();
            const relativeUrl = $el.find('.directorypress-listing-title a, a[href*="/listing/"], a').first().attr('href');
            const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
            const location = $el.find('.listing-location, .post-location, .location').first().text().trim();

            if (title && relativeUrl) {
                const productUrl = relativeUrl.startsWith('http')
                    ? relativeUrl
                    : `https://qefiira.com${relativeUrl}`;

                const cleanId = relativeUrl.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '').replace(/\//g, '_');

                scrapedProducts.push({
                    externalId: `qefira_${cleanId}`,
                    title,
                    description: null,
                    price: rawPriceText,
                    category,
                    subcategory,
                    productUrl,
                    imageUrl: imageUrl || null,
                    location: location || 'Addis Ababa',
                    phoneNumber: null,
                    attributes: {
                        sourceSite: 'Qefira',
                        rawPrice: rawPriceText,
                        rawRegion: location,
                    },
                });
            }
        });

        return scrapedProducts;
    } catch (error) {
        console.error(`❌ Error scraping Qefira (${categoryUrl}):`, error.message);
        return [];
    }
}

module.exports = { scrapeQefiraCategory };