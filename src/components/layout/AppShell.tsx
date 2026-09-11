import { CommandProvider } from "@/components/CommandContext";
import Terminal from "@/components/layout/Terminal";
import CoursesWindow from "@/components/ui/CoursesWindow";

export async function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CommandProvider>
      <main className="w-full h-screen relative overflow-hidden">
        {children}
      </main>
      <Terminal />
      <CoursesWindow />
    </CommandProvider>
  );
}
