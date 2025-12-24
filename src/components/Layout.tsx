import { ReactNode } from "react";
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
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      navigate("/");
      toast.success("Logged out successfully");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
          <img 
            src={idealLogo} 
            alt="IE Logo" 
            className="w-10 h-10 rounded-md"
          />
          <div>
            <h2 className="text-lg font-bold text-sidebar-foreground">IDEAL ELECTRICALS</h2>
            <p className="text-xs text-sidebar-foreground/70">Inventory Management</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
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
            <img 
              src={idealLogo} 
              alt="IE Logo" 
              className="w-8 h-8 rounded"
            />
            <div className="text-xs text-sidebar-foreground/60">
              <p className="font-semibold">IDEAL ELECTRICALS</p>
              <p>Govt. Regd. Contractor</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
};
