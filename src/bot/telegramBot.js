// src/bot/telegramBot.js
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

function formatPrice(price) {
    const num = Number(price);
    return num > 0 ? `${num.toLocaleString()} ETB` : 'Contact for Price';
}

// Helper function to dynamically get the 1st day of the current month
function getStartOfCurrentMonth() {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
}

// Category Price Range Definitions
const PRICE_RANGES = {
    phone: [
        { label: 'Under 3.6 K ETB', min: 0, max: 3600 },
        { label: '3.6 - 25 K ETB', min: 3600, max: 25000 },
        { label: '25 - 79 K ETB', min: 25000, max: 79000 },
        { label: '79 - 180 K ETB', min: 79000, max: 180000 },
        { label: 'More than 180 K ETB', min: 180000, max: 100000000 },
    ],
    tablet: [
        { label: 'Under 20 K ETB', min: 0, max: 20000 },
        { label: '20 - 50 K ETB', min: 20000, max: 50000 },
        { label: '50 - 100 K ETB', min: 50000, max: 100000 },
        { label: '100 - 200 K ETB', min: 100000, max: 200000 },
        { label: 'More than 200 K ETB', min: 200000, max: 100000000 },
    ],
    laptop: [
        { label: 'Under 37 K ETB', min: 0, max: 37000 },
        { label: '37 - 75 K ETB', min: 37000, max: 75000 },
        { label: '75 - 150 K ETB', min: 75000, max: 150000 },
        { label: '150 - 280 K ETB', min: 150000, max: 280000 },
        { label: 'More than 280 K ETB', min: 280000, max: 100000000 },
    ],
    tv: [
        { label: 'Under 15 K ETB', min: 0, max: 15000 },
        { label: '15 - 35 K ETB', min: 15000, max: 35000 },
        { label: '35 - 70 K ETB', min: 35000, max: 70000 },
        { label: '70 - 150 K ETB', min: 70000, max: 150000 },
        { label: 'More than 150 K ETB', min: 150000, max: 100000000 },
    ],
    car: [
        { label: 'Under 2.1 M ETB', min: 0, max: 2100000 },
        { label: '2.1 - 3.9 M ETB', min: 2100000, max: 3900000 },
        { label: '3.9 - 7.2 M ETB', min: 3900000, max: 7200000 },
        { label: '7.2 - 20 M ETB', min: 7200000, max: 20000000 },
        { label: 'More than 20 M ETB', min: 20000000, max: 1000000000 },
    ],
    apartment_rent: [
        { label: 'Under 37 K ETB', min: 0, max: 37000 },
        { label: '37 - 80 K ETB', min: 37000, max: 80000 },
        { label: '80 - 180 K ETB', min: 80000, max: 180000 },
        { label: '180 - 490 K ETB', min: 180000, max: 490000 },
        { label: 'More than 490 K ETB', min: 490000, max: 100000000 },
    ],
    apartment_buy: [
        { label: 'Under 5 M ETB', min: 0, max: 5000000 },
        { label: '5 - 15 M ETB', min: 5000000, max: 15000000 },
        { label: '15 - 35 M ETB', min: 15000000, max: 35000000 },
        { label: '35 - 70 M ETB', min: 35000000, max: 70000000 },
        { label: 'More than 70 M ETB', min: 70000000, max: 10000000000 },
    ],
};

/**
 * Multi-Vendor Balanced Aggregator Function
 * Interleaves search results from Jiji, Qefira, Engocha, Mekina, etc.
 */
async function getAggregatedProducts(whereClause, totalLimit = 8) {
    const vendors = await prisma.vendor.findMany();
    if (vendors.length === 0) return [];

    const vendorResults = await Promise.all(
        vendors.map((vendor) =>
            prisma.product.findMany({
                where: {
                    ...whereClause,
                    vendorId: vendor.id,
                },
                include: { vendor: true },
                take: totalLimit,
                orderBy: { updatedAt: 'desc' },
            })
        )
    );

    const aggregated = [];
    let addedInStep = true;
    let stepIndex = 0;

    while (aggregated.length < totalLimit && addedInStep) {
        addedInStep = false;
        for (const items of vendorResults) {
            if (stepIndex < items.length && aggregated.length < totalLimit) {
                aggregated.push(items[stepIndex]);
                addedInStep = true;
            }
        }
        stepIndex++;
    }

    return aggregated;
}

// Main category selection menu
function sendCategoryMenu(ctx) {
    const welcomeText =
        `👋 *እንኳን ወደ አራዳ ገበያ ቦት በደህና መጡ!*\n\n` +
        `🔍 *ከታች ካሉት ምድቦች አንዱን ይምረጡ፦*`;

    return ctx.replyWithMarkdown(
        welcomeText,
        Markup.inlineKeyboard([
            [
                Markup.button.callback('📱 Phones', 'cat_phone'),
                Markup.button.callback('📱 Tablets', 'cat_tablet'),
            ],
            [
                Markup.button.callback('💻 Laptops & Computers', 'cat_laptop'),
                Markup.button.callback('📺 TV & Video', 'cat_tv'),
            ],
            [
                Markup.button.callback('🚗 Cars & Vehicles', 'cat_car'),
                Markup.button.callback('🏠 Real Estate & Property', 'cat_apartment'),
            ],
        ])
    );
}

bot.start((ctx) => sendCategoryMenu(ctx));

function sendRealEstateTypeMenu(ctx) {
    return ctx.replyWithMarkdown(
        `🏠 *Are you looking to Rent or Buy?*`,
        Markup.inlineKeyboard([
            [
                Markup.button.callback('🔑 Rent', 'cat_apartment_rent'),
                Markup.button.callback('🏡 Buy', 'cat_apartment_buy'),
            ],
        ])
    );
}

function sendPriceRangeMenu(ctx, categoryKey) {
    const ranges = PRICE_RANGES[categoryKey];
    if (!ranges) return;

    const titles = {
        phone: '📱 Mobile Phones',
        tablet: '📱 Tablets',
        laptop: '💻 Laptops & Computers',
        tv: '📺 TV & Video Equipment',
        car: '🚗 Cars & Vehicles',
        apartment_rent: '🔑 Rent Real Estate',
        apartment_buy: '🏡 Buy Real Estate',
    };

    const buttons = ranges.map((r) => [
        Markup.button.callback(`💰 ${r.label}`, `prange_${categoryKey}_${r.min}_${r.max}`),
    ]);
    buttons.push([Markup.button.callback('🔍 View All (No Price Filter)', `prange_${categoryKey}_0_1000000000`)]);

    return ctx.replyWithMarkdown(
        `💵 *Select a Price Range for ${titles[categoryKey] || categoryKey}:*`,
        Markup.inlineKeyboard(buttons)
    );
}

bot.action(/^cat_(phone|tablet|laptop|tv|car|apartment)$/, async (ctx) => {
    const categoryKey = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.deleteMessage().catch(() => { });

    if (categoryKey === 'apartment') {
        return sendRealEstateTypeMenu(ctx);
    }

    return sendPriceRangeMenu(ctx, categoryKey);
});

bot.action(/^cat_apartment_(rent|buy)$/, async (ctx) => {
    const type = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.deleteMessage().catch(() => { });

    return sendPriceRangeMenu(ctx, `apartment_${type}`);
});

bot.action(/^prange_(phone|tablet|laptop|tv|car|apartment_rent|apartment_buy)_(\d+)_(\d+)$/, async (ctx) => {
    const categoryKey = ctx.match[1];
    const minPrice = BigInt(ctx.match[2]);
    const maxPrice = BigInt(ctx.match[3]);

    await ctx.answerCbQuery('Fetching recent listings across all sources...');
    await ctx.deleteMessage().catch(() => { });

    let targetCategory = '';
    if (['phone', 'tablet', 'laptop', 'tv'].includes(categoryKey)) {
        targetCategory = 'electronics';
    } else if (categoryKey === 'car') {
        targetCategory = 'vehicles';
    } else if (categoryKey.startsWith('apartment')) {
        targetCategory = 'real_estate';
    }

    try {
        const whereClause = {
            category: targetCategory,
            price: {
                gte: minPrice,
                lte: maxPrice,
            },
            updatedAt: {
                gte: getStartOfCurrentMonth(), // Ensure results are from this month
            },
        };

        if (categoryKey === 'phone') {
            whereClause.OR = [
                { subcategory: 'mobile_phones' },
                { title: { contains: 'phone', mode: 'insensitive' } },
                { title: { contains: 'mobile', mode: 'insensitive' } },
            ];
        } else if (categoryKey === 'tablet') {
            whereClause.OR = [
                { subcategory: 'tablets' },
                { title: { contains: 'tablet', mode: 'insensitive' } },
                { title: { contains: 'ipad', mode: 'insensitive' } },
                { title: { contains: 'tab', mode: 'insensitive' } },
            ];
        } else if (categoryKey === 'laptop') {
            whereClause.OR = [
                { subcategory: 'laptops' },
                { title: { contains: 'laptop', mode: 'insensitive' } },
                { title: { contains: 'pc', mode: 'insensitive' } },
                { title: { contains: 'computer', mode: 'insensitive' } },
            ];
        } else if (categoryKey === 'tv') {
            whereClause.OR = [
                { subcategory: 'tv' },
                { title: { contains: 'tv', mode: 'insensitive' } },
                { title: { contains: 'television', mode: 'insensitive' } },
                { title: { contains: 'smart tv', mode: 'insensitive' } },
            ];
        } else if (categoryKey === 'car') {
            whereClause.OR = [
                { subcategory: 'cars' },
                { title: { contains: 'car', mode: 'insensitive' } },
                { title: { contains: 'vehicle', mode: 'insensitive' } },
            ];
        } else if (categoryKey === 'apartment_rent') {
            whereClause.OR = [
                { subcategory: 'apartments_rent' },
                { title: { contains: 'rent', mode: 'insensitive' } },
            ];
        } else if (categoryKey === 'apartment_buy') {
            whereClause.OR = [
                { subcategory: 'apartments_buy' },
                { title: { contains: 'sale', mode: 'insensitive' } },
                { title: { contains: 'buy', mode: 'insensitive' } },
            ];
        }

        const products = await getAggregatedProducts(whereClause, 8);

        if (products.length === 0) {
            return ctx.reply(`❌ No products found in this price range for this month. Try selecting another range!`);
        }

        return sendProductsList(ctx, products);
    } catch (err) {
        console.error('Error fetching range products:', err);
        return ctx.reply('❌ Error fetching listings. Please try again.');
    }
});

async function sendProductsList(ctx, products) {
    await ctx.reply(`✨ *Showing ${products.length} recent listings from multiple sources:*`, { parse_mode: 'Markdown' });

    for (const item of products) {
        const caption =
            `📌 *${item.title}*\n` +
            `💰 *Price:* ${formatPrice(item.price)}\n` +
            `🏬 *Source:* ${item.vendor ? item.vendor.name : 'Marketplace'}\n` +
            `📍 *Location:* ${item.city || 'Addis Ababa'}${item.address ? `, ${item.address}` : ''}`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url(`🔗 View on ${item.vendor ? item.vendor.name : 'Site'}`, item.productUrl)],
        ]);

        if (item.imageUrl) {
            await ctx.replyWithPhoto(item.imageUrl, {
                caption,
                parse_mode: 'Markdown',
                ...keyboard,
            }).catch(() => {
                ctx.reply(caption, { parse_mode: 'Markdown', ...keyboard });
            });
        } else {
            await ctx.reply(caption, { parse_mode: 'Markdown', ...keyboard });
        }
    }
}

bot.command('search', async (ctx) => {
    const query = ctx.message.text.split(' ').slice(1).join(' ').trim();

    if (!query) {
        return sendCategoryMenu(ctx);
    }

    const qLower = query.toLowerCase();

    if (qLower.includes('phone') || qLower.includes('mobile')) return sendPriceRangeMenu(ctx, 'phone');
    if (qLower.includes('tablet') || qLower.includes('ipad')) return sendPriceRangeMenu(ctx, 'tablet');
    if (qLower.includes('laptop') || qLower.includes('computer') || qLower.includes('pc')) return sendPriceRangeMenu(ctx, 'laptop');
    if (qLower.includes('tv') || qLower.includes('television')) return sendPriceRangeMenu(ctx, 'tv');
    if (qLower.includes('car') || qLower.includes('vehicle') || qLower.includes('auto')) return sendPriceRangeMenu(ctx, 'car');
    if (qLower.includes('apartment') || qLower.includes('house') || qLower.includes('real estate')) {
        if (qLower.includes('rent')) return sendPriceRangeMenu(ctx, 'apartment_rent');
        if (qLower.includes('buy') || qLower.includes('sale')) return sendPriceRangeMenu(ctx, 'apartment_buy');
        return sendRealEstateTypeMenu(ctx);
    }

    if (qLower.includes('rent')) return sendRealEstateTypeMenu(ctx);
    if (qLower.includes('buy')) return sendRealEstateTypeMenu(ctx);

    try {
        const whereClause = {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
            ],
            updatedAt: {
                gte: getStartOfCurrentMonth(), // Ensure search results are from this month
            }
        };

        const products = await getAggregatedProducts(whereClause, 8);

        if (products.length === 0) {
            return ctx.reply(`❌ No recent listings found for *"${query}"*. Try searching with another keyword or pick a category with /search.`, { parse_mode: 'Markdown' });
        }

        return sendProductsList(ctx, products);
    } catch (err) {
        console.error('Search error:', err);
        return ctx.reply('❌ An error occurred during search.');
    }
});

async function initBot() {
    try {
        await bot.telegram.setMyCommands([
            { command: 'start', description: '🚀 Start Arada Gebeya Bot & View Categories' },
            { command: 'search', description: '🔍 Search listings across all marketplaces' },
        ]);
        await bot.launch();
        console.log('🤖 Arada Gebeya SearchBot is live with date-filtered aggregation!');
    } catch (err) {
        console.error('Bot launch error:', err);
    }
}

initBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));