import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
  console.log(await prisma.activityLog.findMany());
}
check();
