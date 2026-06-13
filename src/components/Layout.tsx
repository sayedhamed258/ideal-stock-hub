import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import idealLogo from "@/assets/ideal-logo-new.png";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  Users,
  ArrowUpDown,
  ClipboardList,
  FileText,
  Sparkles,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/products", icon: Package, label: "Products" },
  { href: "/categories", icon: FolderOpen, label: "Categories" },
  { href: "/suppliers", icon: Users, label: "Suppliers" },
  { href: "/stock-movements", icon: ArrowUpDown, label: "Stock Movements" },
  { href: "/requirements", icon: ClipboardList, label: "Requirements" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/auto-import", icon: Sparkles, label: "Smart Import" },
];

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      navigate("/");
      toast.success("Logged out successfully");
    }
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 md:p-6 border-b border-sidebar-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-primary/10 p-1 flex items-center justify-center">
          <img 
            src={idealLogo} 
            alt="Ideal Electricals logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <h2 className="text-base md:text-lg font-bold text-sidebar-foreground">IDEAL ELECTRICALS</h2>
          <p className="text-xs text-sidebar-foreground/70">Inventory Management</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
        
        {/* Footer with logo and full name */}
        <div className="flex items-center gap-2 pt-3 border-t border-sidebar-border/50">
          <div className="w-8 h-8 rounded bg-primary/10 p-0.5 flex items-center justify-center">
            <img 
              src={idealLogo} 
              alt="Ideal Electricals logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-xs text-sidebar-foreground/60">
            <p className="font-semibold">IDEAL ELECTRICALS</p>
            <p>Govt. Regd. Contractor</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border h-14 flex items-center px-4 gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground" aria-label="Open navigation menu">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
              <div className="flex flex-col h-full">
                <SidebarContent />
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/10 p-0.5 flex items-center justify-center">
              <img 
                src={idealLogo} 
                alt="Ideal Electricals logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-sm font-bold text-sidebar-foreground">IDEAL ELECTRICALS</span>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col fixed h-screen">
          <SidebarContent />
        </aside>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-auto",
        isMobile ? "pt-14" : "ml-64"
      )}>
        <div className="container mx-auto p-4 md:p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
};