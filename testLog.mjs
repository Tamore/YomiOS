import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function logActivity(title, description, category, icon, colorClass) {
  try {
    await prisma.activityLog.create({
      data: { title, description, category, icon, colorClass }
    });
    console.log("SUCCESS");
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}
logActivity("Test", "Test desc", "SYS", "add", "primary");
