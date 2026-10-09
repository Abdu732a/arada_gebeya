require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { scrapeJijiCategory } = require('./src/scrapers/jijiScraper');
const { parsePrice, extractPhoneNumber } = require('./src/utils/parser');

const prisma = new PrismaClient();

const TARGETS = [
    { key: 'mobile_phones', subcategory: 'mobile_phones', category: 'electronics', url: 'https://jiji.com.et/mobile-phones-tablets' },
    { key: 'tablets', subcategory: 'tablets', category: 'electronics', url: 'https://jiji.com.et/tablets' },
];

async function getOrCreateVendor(name, baseUrl) {
    let vendor = await prisma.vendor.findUnique({ where: { name } });
    if (!vendor) {
        try { vendor = await prisma.vendor.create({ data: { name, baseUrl } }); }
        catch (e) { vendor = await prisma.vendor.findUnique({ where: { name } }); }
    }
    return vendor;
}

async function run() {
    const vendor = await getOrCreateVendor('Jiji Ethiopia', 'https://jiji.com.et');
    for (const t of TARGETS) {
        console.log(`Scraping ${t.key}...`);
        const items = await scrapeJijiCategory(t.url, t.category, parsePrice, extractPhoneNumber);
        let saved = 0;
        for (const item of items) {
            const price = BigInt(typeof item.price === 'number' ? item.price : parsePrice(item.price) || 0);
            const rawLoc = item.location || 'Addis Ababa';
            const city = rawLoc.split(',')[0].trim();
            const address = rawLoc.includes(',') ? rawLoc.split(',').slice(1).join(',').trim() : rawLoc;
            try {
                await prisma.product.upsert({
                    where: { vendorId_externalId: { vendorId: vendor.id, externalId: item.externalId } },
                    update: { price, title: item.title, imageUrl: item.imageUrl || null, city, address, updatedAt: new Date() },
                    create: { vendorId: vendor.id, externalId: item.externalId, title: item.title, price, category: t.category, subcategory: t.subcategory, productUrl: item.productUrl, imageUrl: item.imageUrl || null, city, address },
                });
                saved++;
            } catch (e) { /* skip */ }
        }
        console.log(`✅ Saved ${saved} items for ${t.key}`);
    }
}
run().finally(() => prisma.$disconnect());
