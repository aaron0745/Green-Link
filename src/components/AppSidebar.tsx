import {
  LayoutDashboard,
  Truck,
  Home,
  BarChart3,
  Leaf,
  Menu,
  LogOut,
  User,
  Settings,
  X
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppSidebar() {
  const { role, logout, user } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border/50 bg-card">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-border/50 shrink-0 overflow-hidden">
        <div className="flex items-center gap-3 w-full">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <Leaf className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden transition-opacity duration-200">
            <span className="font-bold text-lg tracking-tight text-foreground">
              <span className="text-primary">Green</span>-link
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Panchayat Portal</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 gap-4 flex-1 overflow-y-auto scrollbar-hide">
        {role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground/70 text-[10px] uppercase tracking-wider font-semibold px-2 mb-2 group-data-[collapsible=icon]:hidden">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Dashboard" className="h-10 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
                    <NavLink to="/dashboard" end activeClassName="bg-primary/10 text-primary font-medium" onClick={handleLinkClick}>
                      <LayoutDashboard className="h-5 w-5 shrink-0" />
                      <span className="text-sm group-data-[collapsible=icon]:hidden">Overview</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Route Management" className="h-10 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
                    <NavLink to="/collector" end activeClassName="bg-primary/10 text-primary font-medium" onClick={handleLinkClick}>
                      <Truck className="h-5 w-5 shrink-0" />
                      <span className="text-sm group-data-[collapsible=icon]:hidden">Active Routes</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Reports & Analytics" className="h-10 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
                    <NavLink to="/reports" end activeClassName="bg-primary/10 text-primary font-medium" onClick={handleLinkClick}>
                      <BarChart3 className="h-5 w-5 shrink-0" />
                      <span className="text-sm group-data-[collapsible=icon]:hidden">Reports</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {role === 'collector' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground/70 text-[10px] uppercase tracking-wider font-semibold px-2 mb-2 group-data-[collapsible=icon]:hidden">
              Field Operations
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="My Route" className="h-10 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
                    <NavLink to="/collector" end activeClassName="bg-primary/10 text-primary font-medium" onClick={handleLinkClick}>
                      <Truck className="h-5 w-5 shrink-0" />
                      <span className="text-sm group-data-[collapsible=icon]:hidden">Today's Route</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {role === 'household' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground/70 text-[10px] uppercase tracking-wider font-semibold px-2 mb-2 group-data-[collapsible=icon]:hidden">
              Resident Services
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Dashboard" className="h-10 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
                    <NavLink to="/dashboard" end activeClassName="bg-primary/10 text-primary font-medium" onClick={handleLinkClick}>
                      <LayoutDashboard className="h-5 w-5 shrink-0" />
                      <span className="text-sm group-data-[collapsible=icon]:hidden">Status Overview</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="History" className="h-10 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
                    <NavLink to={`/household/${user?.$id}`} end activeClassName="bg-primary/10 text-primary font-medium" onClick={handleLinkClick}>
                      <Home className="h-5 w-5 shrink-0" />
                      <span className="text-sm group-data-[collapsible=icon]:hidden">My History</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50 bg-muted/20 shrink-0 overflow-hidden">
        <div className="flex items-center gap-3 mb-4 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-9 w-9 border-2 border-background shadow-sm shrink-0">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {(user?.name || 'U').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden transition-opacity duration-200">
            <p className="text-sm font-semibold text-foreground truncate">{user?.name || user?.residentName || 'User'}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">{role}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden transition-opacity duration-200">Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
