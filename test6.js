const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    // Delete the false items from Qefira (less than 1500 ETB)
    const res = await prisma.product.deleteMany({
        where: {
            vendor: { name: 'Qefira' },
            price: { lt: 2000 }
        }
    });
    console.log(res);
}
run().finally(() => prisma.$disconnect());
