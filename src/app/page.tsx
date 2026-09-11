import prisma from "@/lib/prisma";
import { Task, Project } from "@prisma/client";
import RunicMandala from "@/components/ui/RunicMandala";
import DashboardWidgets from "@/components/ui/DashboardWidgets";
import SettingsWindow from "@/components/ui/SettingsWindow";
import ActivityWindow from "@/components/ui/ActivityWindow";
import AgentsWindow from "@/components/ui/AgentsWindow";
import fs from "node:fs";
import path from "node:path";

export default async function Dashboard() {
  const tasks = await prisma.task.findMany({
    where: { isCompleted: false },
    orderBy: { priority: 'asc' },
    include: { project: true, domain: true }
  });

  const projects = await prisma.project.findMany({
    where: { status: 'In Progress' },
    include: { domain: true }
  });

  // Read the exports folder for generated files
  const exportsDir = path.join(process.cwd(), "public", "exports");
  let exportedFiles: string[] = [];
  if (fs.existsSync(exportsDir)) {
    exportedFiles = fs.readdirSync(exportsDir).filter(f => f.endsWith('.pdf'));
  }

  // Fetch recent logs for the Activity Window
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  const hasData = tasks.length > 0 || projects.length > 0 || exportedFiles.length > 0;

  return (
    <div className="w-full h-screen relative overflow-hidden">
      
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-80">
        <RunicMandala />
      </div>

      {/* Conditionally rendered windows */}
      <DashboardWidgets tasks={tasks} projects={projects} exportedFiles={exportedFiles} />
      
      {/* We conditionally mount Holographic Windows inside their own components, or here. 
          Actually, SettingsWindow and ActivityWindow check visibleWidgets inside themselves.
          Let's ensure AgentsWindow does the same, or we check it here. */}
      <SettingsWindow />
      <ActivityWindow logs={logs} />
      <AgentsWindow />
    </div>
  );
}
