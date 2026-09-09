const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const [row] = await prisma.$queryRaw`SHOW CREATE TABLE performance_reviews`;
  console.log(row['Create Table']);
}
main().catch(console.error).finally(() => prisma.$disconnect());
