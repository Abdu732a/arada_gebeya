const { PrismaClient } = require('@prisma/client');
const { scrapeQefiraCategory } = require('./src/scrapers/qefiraScraper');
const { parsePrice } = require('./src/utils/parser');

const prisma = new PrismaClient();

async function getOrCreateVendor(name, baseUrl) {
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

        try {
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
                    city,
                    address,
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
                },
            });
            savedCount++;
        } catch (err) {
            // ignore
        }
    }
    return savedCount;
}

async function run() {
    console.log('Fetching Qefira phones...');
    const items = await scrapeQefiraCategory('https://qefiira.com/listings/business-category/mobile-phones/', 'electronics', 'mobile_phones');
    console.log(`Fetched ${items.length} items. Saving to DB...`);
    const saved = await saveItemsToDatabase('Qefira', 'https://qefiira.com', items, 'mobile_phones');
    console.log(`Saved ${saved} items to DB.`);
}

run().finally(() => prisma.$disconnect());
