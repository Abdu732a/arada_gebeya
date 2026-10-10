// src/scrapers/runScrapers.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { scrapeJijiCategory } = require('./jijiScraper');
const { scrapeMekinaCars } = require('./mekinaScraper');
const { scrapeEngochaCategory } = require('./engochaScraper');
const { scrapeQefiraCategory } = require('./qefiraScraper');
const { parsePrice, extractPhoneNumber } = require('../utils/parser');
const { cleanStaleData } = require('../jobs/cleanStaleData');

const prisma = new PrismaClient();

const JIJI_CATEGORIES = [
    { key: 'mobile_phones', subcategory: 'mobile_phones', category: 'electronics', url: 'https://jiji.com.et/mobile-phones-tablets' },
    { key: 'tablets', subcategory: 'tablets', category: 'electronics', url: 'https://jiji.com.et/tablets' },
    { key: 'laptops', subcategory: 'laptops', category: 'electronics', url: 'https://jiji.com.et/computers-and-laptops' },
    { key: 'tv', subcategory: 'tv', category: 'electronics', url: 'https://jiji.com.et/tv-dvd-equipment' },
    { key: 'cars', subcategory: 'cars', category: 'vehicles', url: 'https://jiji.com.et/cars' },
    { key: 'apartments_rent', subcategory: 'apartments_rent', category: 'real_estate', url: 'https://jiji.com.et/houses-apartments-for-rent' },
    { key: 'apartments_buy', subcategory: 'apartments_buy', category: 'real_estate', url: 'https://jiji.com.et/houses-apartments-for-sale' },
];

const QEFIRA_CATEGORIES = [
    { key: 'phones', category: 'electronics', subcategory: 'mobile_phones', url: 'https://qefiira.com/listings/business-category/mobile-phones/' },
    { key: 'electronics', category: 'electronics', subcategory: 'tv', url: 'https://qefiira.com/listings/business-category/electronics/' },
    { key: 'real_estate_rent', category: 'real_estate', subcategory: 'apartments_rent', url: 'https://qefiira.com/listings/business-category/real-estate/' },
    { key: 'real_estate_buy', category: 'real_estate', subcategory: 'apartments_buy', url: 'https://qefiira.com/listings/business-category/real-estate/' },
];

const ENGOCHA_CATEGORIES = [
    { key: 'electronics', category: 'electronics', subcategory: 'mobile_phones', url: 'https://engocha.com/mobile-phones' },
    { key: 'real_estate_rent', category: 'real_estate', subcategory: 'apartments_rent', url: 'https://engocha.com/apartments-houses-for-rent' },
    { key: 'real_estate_buy', category: 'real_estate', subcategory: 'apartments_buy', url: 'https://engocha.com/apartments-houses-for-sale' },
];

// Memory cache to solve Prisma concurrent unique constraint bugs
const vendorCache = {};

async function getOrCreateVendor(name, baseUrl) {
    if (vendorCache[name]) return vendorCache[name];

    let vendor = await prisma.vendor.findUnique({ where: { name } });
    if (!vendor) {
        try {
            vendor = await prisma.vendor.create({
                data: { name, baseUrl },
            });
        } catch (e) {
            vendor = await prisma.vendor.findUnique({ where: { name } });
        }
    }

    vendorCache[name] = vendor;
    return vendor;
}

async function saveItemsToDatabase(vendorName, baseUrl, items, fallbackSubcategory = 'general') {
    if (!items || items.length === 0) return 0;

    const vendor = await getOrCreateVendor(vendorName, baseUrl);

    let savedCount = 0;
    for (const item of items) {
        const numericPrice = typeof item.price === 'number' ? item.price : parsePrice(item.price);
        const priceBigInt = BigInt(numericPrice || 0);

        const rawLocation = item.location || 'Addis Ababa';
        const city = rawLocation.split(',')[0].trim() || 'Addis Ababa';
        const address = rawLocation.includes(',') ? rawLocation.split(',').slice(1).join(',').trim() : rawLocation;

        const subcategory = item.subcategory || fallbackSubcategory;

        await prisma.product.upsert({
            where: {
                vendorId_externalId: {
                    vendorId: vendor.id,
                    externalId: item.externalId,
                },
            },
            update: {
                price: priceBigInt,
                title: item.title,
                description: item.description || null,
                imageUrl: item.imageUrl || null,
                phoneNumber: item.phoneNumber || null,
                city,
                address,
                attributes: item.attributes || {},
                updatedAt: new Date(),
            },
            create: {
                vendorId: vendor.id,
                externalId: item.externalId,
                title: item.title,
                description: item.description || null,
                price: priceBigInt,
                category: item.category || 'general',
                subcategory,
                productUrl: item.productUrl,
                imageUrl: item.imageUrl || null,
                city,
                address,
                phoneNumber: item.phoneNumber || null,
                attributes: item.attributes || {},
            },
        });
        savedCount++;
    }
    return savedCount;
}

async function main() {
    console.log('🚀 Starting multi-site market scraper pipeline...\n');

    // 0. Clean stale data older than 30 days
    try {
        await cleanStaleData();
    } catch (err) {
        console.error('⚠️ Stale data cleanup warning:', err.message);
    }

    // 1. Jiji Ethiopia
    console.log('--- [1/4] Scraping Jiji Ethiopia ---');
    for (const config of JIJI_CATEGORIES) {
        console.log(`🔎 [Jiji] Scraping ${config.key}...`);
        try {
            const items = await scrapeJijiCategory(config.url, config.category, parsePrice, extractPhoneNumber);
            const saved = await saveItemsToDatabase('Jiji Ethiopia', 'https://jiji.com.et', items, config.subcategory);
            console.log(`✅ Saved ${saved} items for Jiji -> ${config.key}`);
        } catch (err) {
            console.error(`❌ Jiji Error (${config.key}):`, err.message);
        }
    }

    // 2. Qefira
    console.log('\n--- [2/4] Scraping Qefira ---');
    for (const config of QEFIRA_CATEGORIES) {
        console.log(`🔎 [Qefira] Scraping ${config.key}...`);
        try {
            const items = await scrapeQefiraCategory(config.url, config.category, config.subcategory);
            const saved = await saveItemsToDatabase('Qefira', 'https://qefiira.com', items, config.subcategory);
            console.log(`✅ Saved ${saved} items for Qefira -> ${config.key}`);
        } catch (err) {
            console.error(`❌ Qefira Error (${config.key}):`, err.message);
        }
    }

    // 3. Engocha
    console.log('\n--- [3/4] Scraping Engocha ---');
    for (const config of ENGOCHA_CATEGORIES) {
        console.log(`🔎 [Engocha] Scraping ${config.key}...`);
        try {
            const items = await scrapeEngochaCategory(config.url, config.category, config.subcategory);
            const saved = await saveItemsToDatabase('Engocha', 'https://www.engocha.com', items, config.subcategory);
            console.log(`✅ Saved ${saved} items for Engocha -> ${config.key}`);
        } catch (err) {
            console.error(`❌ Engocha Error (${config.key}):`, err.message);
        }
    }

    // 4. Mekina.net
    console.log('\n--- [4/4] Scraping Mekina.net ---');
    console.log(`🔎 [Mekina.net] Scraping cars...`);
    try {
        const mekinaCars = await scrapeMekinaCars();
        const savedMekina = await saveItemsToDatabase('Mekina.net', 'https://www.mekina.net', mekinaCars, 'cars');
        console.log(`✅ Saved ${savedMekina} items for Mekina.net -> cars`);
    } catch (err) {
        console.error(`❌ Mekina Error:`, err.message);
    }

    console.log('\n🎉 Multi-site market scraping pipeline completed successfully!');
}

module.exports = {
    runScraperPipeline: main,
    main,
};

if (require.main === module) {
    main()
        .catch((e) => console.error('❌ Pipeline Error:', e))
        .finally(async () => await prisma.$disconnect());
}