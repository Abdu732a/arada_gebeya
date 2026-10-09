const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  const vendors = await prisma.vendor.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    }
  });

  console.log('--- Database Vendors & Product Count ---');
  console.table(vendors.map(v => ({ id: v.id, name: v.name, productCount: v._count.products })));

  const totalProducts = await prisma.product.count();
  console.log(`Total Products in DB: ${totalProducts}`);

  const sampleProducts = await prisma.product.findMany({
    take: 10,
    include: { vendor: true },
    orderBy: { updatedAt: 'desc' }
  });

  console.log('\n--- Sample Products in DB ---');
  sampleProducts.forEach(p => {
    console.log(`[${p.vendor.name}] ${p.title} | ${p.price.toString()} ETB | Cat: ${p.category} | City: ${p.city}`);
  });

  await prisma.$disconnect();
}

checkDb();
