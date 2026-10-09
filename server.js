// src/server.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// GET /api/products
app.get('/api/products', async (req, res) => {
    try {
        const { search, category, subcategory, city, page = 1, limit = 24 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (category) where.category = category;
        if (subcategory) where.subcategory = subcategory;
        if (city) where.city = { contains: city, mode: 'insensitive' };

        const [products, totalCount] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    vendor: {
                        select: { name: true, baseUrl: true },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take,
            }),
            prisma.product.count({ where }),
        ]);

        // Format BigInt price fields to string for standard JSON output
        const formattedProducts = products.map((item) => ({
            ...item,
            price: item.price.toString(),
        }));

        res.json({
            success: true,
            meta: {
                total: totalCount,
                page: parseInt(page),
                totalPages: Math.ceil(totalCount / take),
            },
            data: formattedProducts,
        });
    } catch (error) {
        console.error('❌ API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Aggregator Express API running on http://localhost:${PORT}`);
});