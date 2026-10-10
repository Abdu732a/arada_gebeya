// src/jobs/cleanStaleData.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Deletes all Product records whose updatedAt is older than 30 days.
 */
async function cleanStaleData() {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        console.log(`🧹 [Data Cleanup] Deleting products older than 30 days (before ${thirtyDaysAgo.toISOString()})...`);

        const result = await prisma.product.deleteMany({
            where: {
                updatedAt: {
                    lt: thirtyDaysAgo,
                },
            },
        });

        console.log(`✅ [Data Cleanup] Successfully deleted ${result.count} stale product(s).`);
        return result.count;
    } catch (error) {
        console.error('❌ [Data Cleanup] Error deleting stale products:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

module.exports = {
    cleanStaleData,
};

// Allow standalone execution from CLI: node src/jobs/cleanStaleData.js
if (require.main === module) {
    cleanStaleData()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
