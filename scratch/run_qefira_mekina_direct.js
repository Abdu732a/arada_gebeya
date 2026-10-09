require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { scrapeMekinaCars } = require('../src/scrapers/mekinaScraper');
const { scrapeQefiraCategory } = require('../src/scrapers/qefiraScraper');
const { parsePrice } = require('../src/utils/parser');

const prisma = new PrismaClient();

async function runDirect() {
  console.log('--- Direct Scrape: Mekina.net ---');
  const mekinaItems = await scrapeMekinaCars();
  console.log(`Scraped ${mekinaItems.length} items from Mekina.net`);

  if (mekinaItems.length > 0) {
    let vendor = await prisma.vendor.findUnique({ where: { name: 'Mekina.net' } });
    if (!vendor) vendor = await prisma.vendor.create({ data: { name: 'Mekina.net', baseUrl: 'https://www.mekina.net' } });

    for (const item of mekinaItems) {
      await prisma.product.upsert({
        where: { vendorId_externalId: { vendorId: vendor.id, externalId: item.externalId } },
        update: { price: BigInt(item.price), title: item.title, imageUrl: item.imageUrl, updatedAt: new Date() },
        create: {
          vendorId: vendor.id,
          externalId: item.externalId,
          title: item.title,
          price: BigInt(item.price),
          category: item.category,
          subcategory: item.subcategory,
          productUrl: item.productUrl,
          imageUrl: item.imageUrl,
          city: item.location || 'Addis Ababa',
          phoneNumber: item.phoneNumber,
        }
      });
    }
    console.log(`Saved ${mekinaItems.length} items for Mekina.net`);
  }

  console.log('\n--- Direct Scrape: Qefira ---');
  const qefiraItems = await scrapeQefiraCategory('https://qefiira.com/listings/', 'electronics', 'mobile_phones');
  console.log(`Scraped ${qefiraItems.length} items from Qefira`);

  if (qefiraItems.length > 0) {
    let vendor = await prisma.vendor.findUnique({ where: { name: 'Qefira' } });
    if (!vendor) vendor = await prisma.vendor.create({ data: { name: 'Qefira', baseUrl: 'https://qefiira.com' } });

    for (const item of qefiraItems) {
      const numericPrice = parsePrice(item.price);
      await prisma.product.upsert({
        where: { vendorId_externalId: { vendorId: vendor.id, externalId: item.externalId } },
        update: { price: BigInt(numericPrice || 0), title: item.title, imageUrl: item.imageUrl, updatedAt: new Date() },
        create: {
          vendorId: vendor.id,
          externalId: item.externalId,
          title: item.title,
          price: BigInt(numericPrice || 0),
          category: item.category,
          subcategory: item.subcategory,
          productUrl: item.productUrl,
          imageUrl: item.imageUrl,
          city: 'Addis Ababa',
        }
      });
    }
    console.log(`Saved ${qefiraItems.length} items for Qefira`);
  }

  await prisma.$disconnect();
}

runDirect();
