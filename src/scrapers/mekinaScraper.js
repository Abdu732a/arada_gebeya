// src/scrapers/mekinaScraper.js
const axios = require('axios');

/**
 * Scrapes car listings directly from Mekina.net API
 */
async function scrapeMekinaCars() {
  const scrapedProducts = [];
  const targetUrl = 'https://www.mekina.net/api/cars/search?meta=1&page=1&pageSize=30&sortBy=default';

  try {
    const { data } = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    const vehicles = data.vehicles || [];

    for (const item of vehicles) {
      if (!item || !item.car || !item.car.attributes) continue;
      const attr = item.car.attributes;

      const title = attr.title || 'Car Listing';
      const numericPrice = attr.price ? attr.price.price : 0;
      const permalink = item.permalink || attr.permalink || `${attr.slug}-${item.car.id}`;
      const productUrl = `https://www.mekina.net/cars/${permalink}`;
      const externalId = `mekina_${permalink}`;

      let imageUrl = null;
      if (attr.images && attr.images.data && attr.images.data.length > 0) {
        const imgObj = attr.images.data[0].attributes;
        imageUrl = imgObj.url || (imgObj.formats && imgObj.formats.thumbnail ? imgObj.formats.thumbnail.url : null);
      }

      const phoneNumber = attr.seller ? attr.seller.phone : null;
      const location = attr.location || 'Addis Ababa';

      scrapedProducts.push({
        externalId,
        title,
        description: null,
        price: numericPrice,
        category: 'vehicles',
        subcategory: 'cars',
        productUrl,
        imageUrl,
        location,
        phoneNumber,
        attributes: {
          sourceSite: 'Mekina.net',
          rawPrice: numericPrice ? `${numericPrice} ETB` : 'Contact for price',
          rawRegion: location,
        },
      });
    }

    return scrapedProducts;
  } catch (error) {
    console.error('❌ Error scraping Mekina.net API:', error.message);
    return [];
  }
}

module.exports = { scrapeMekinaCars };