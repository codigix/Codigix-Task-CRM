require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const employees = await prisma.users.findMany({
      include: {
        performance_reviews_employee: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });
    console.log("Success! Employees count:", employees.length);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
