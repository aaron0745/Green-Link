import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { open, openMobile, isMobile } = useSidebar();
  const isOpen = isMobile ? openMobile : open;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background relative overflow-x-hidden w-full">
      <header className="h-16 border-b border-border/40 flex items-center justify-between px-4 lg:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-50 print:hidden">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="h-4 w-[1px] bg-border mx-1" />
          <h1 className="text-sm font-semibold text-foreground tracking-tight hidden sm:block">Smart Waste Management</h1>
          <h1 className="text-sm font-semibold text-foreground tracking-tight sm:hidden">Green-link</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>
      
      <main className="flex-1 p-4 lg:p-6 transition-all duration-500 ease-in-out">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
