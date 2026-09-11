"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function logActivity(title: string, description: string, category: string, icon: string, colorClass: string) {
  try {
    await prisma.activityLog.create({
      data: { title, description, category, icon, colorClass }
    });
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}

export async function getDomains() {
  return await prisma.lifeDomain.findMany({
    select: { id: true, name: true, icon: true, colorCode: true }
  });
}

export async function createTask(formData: FormData) {
  console.log("SERVER ACTION: createTask called", Object.fromEntries(formData));
  const title = formData.get("title") as string;
  const domainId = formData.get("domainId") as string;
  const priority = formData.get("priority") as string;

  if (!title || !domainId) {
    console.error("SERVER ACTION: Missing title or domainId", {title, domainId});
    return;
  }

  const domain = await prisma.lifeDomain.findUnique({ where: { id: domainId }});
  console.log("SERVER ACTION: Found domain:", domain?.name);

  await prisma.task.create({
    data: {
      title,
      domainId,
      priority: priority ? `P${priority}` : "P3",
    },
  });

  await logActivity(
    "Task Created", 
    `Initialized new node: "${title}" under Domain: ${domain?.name || 'Unknown'}.`,
    "WORK_SYSTEM", "task_alt", "text-primary border-primary/30"
  );

  revalidatePath("/");
  revalidatePath("/domains/[id]", "page");
  revalidatePath("/activity", "page");
}

export async function createProject(formData: FormData) {
  console.log("SERVER ACTION: createProject called", Object.fromEntries(formData));
  const title = formData.get("title") as string;
  const domainId = formData.get("domainId") as string;

  if (!title || !domainId) {
    console.error("SERVER ACTION: Missing title or domainId", {title, domainId});
    return;
  }

  const domain = await prisma.lifeDomain.findUnique({ where: { id: domainId }});

  await prisma.project.create({
    data: {
      title,
      domainId,
      status: "In Progress",
    },
  });

  await logActivity(
    "Project Initialized", 
    `Bootstrapped new structural project: "${title}" under Domain: ${domain?.name || 'Unknown'}.`,
    "STRATEGIC", "account_tree", "text-tertiary border-tertiary/30"
  );

  revalidatePath("/");
  revalidatePath("/domains/[id]", "page");
  revalidatePath("/activity", "page");
}

export async function createDomain(formData: FormData) {
  console.log("SERVER ACTION: createDomain called", Object.fromEntries(formData));
  const name = formData.get("name") as string;
  const colorCode = formData.get("colorCode") as string;
  const icon = formData.get("icon") as string;

  if (!name) {
    console.error("SERVER ACTION: Missing name", {name});
    return;
  }

  await prisma.lifeDomain.create({
    data: {
      name,
      colorCode: colorCode || "#e040a0",
      icon: icon || "folder",
    },
  });

  await logActivity(
    "Domain Established", 
    `New Life Domain partitioned: "${name}". Core systems ready.`,
    "SYSTEM_INTEGRITY", "folder_special", "text-secondary border-secondary/30"
  );

  revalidatePath("/");
  revalidatePath("/domains/[id]", "page");
  revalidatePath("/activity", "page");
}

export async function updateDomain(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const colorCode = formData.get("colorCode") as string;
  const icon = formData.get("icon") as string;

  if (!name) return;

  await prisma.lifeDomain.update({
    where: { id },
    data: { name, colorCode, icon },
  });

  await logActivity(
    "Domain Reconfigured", 
    `Parameters updated for Domain: "${name}".`,
    "SYSTEM_INTEGRITY", "tune", "text-on-surface-variant border-border-muted"
  );

  revalidatePath("/");
  revalidatePath("/domains/[id]", "page");
  revalidatePath("/activity", "page");
}

export async function deleteDomain(id: string) {
  const domain = await prisma.lifeDomain.findUnique({ where: { id }});
  
  await prisma.lifeDomain.delete({
    where: { id },
  });

  await logActivity(
    "Domain Purged", 
    `Data partition deleted: "${domain?.name || 'Unknown'}". All nested vectors destroyed.`,
    "SYSTEM_INTEGRITY", "delete_forever", "text-error border-error/30"
  );

  revalidatePath("/");
  revalidatePath("/activity", "page");
}

export async function toggleTaskCompletion(taskId: string, isCompleted: boolean) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { isCompleted },
  });

  await logActivity(
    isCompleted ? "Task Completed" : "Task Reopened", 
    `Node execution state changed for: "${task.title}".`,
    "WORK_SYSTEM", isCompleted ? "check_circle" : "radio_button_unchecked", isCompleted ? "text-primary border-primary/30" : "text-on-surface-variant border-border-muted"
  );

  revalidatePath("/");
  revalidatePath("/domains/[id]", "page");
  revalidatePath("/activity", "page");
}
