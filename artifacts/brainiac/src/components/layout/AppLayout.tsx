import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Brain, LayoutDashboard, Zap, Wallet, MessageSquare, ChevronRight, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/feed", label: "Feed", icon: Zap },
    { href: "/wallet", label: "Wallets", icon: Wallet },
    { href: "/brain", label: "Brain", icon: MessageSquare },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-56 fixed inset-y-0 left-0 border-r border-border bg-sidebar flex flex-col z-20">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-tight tracking-tight">Brainiac</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Web3 Second Brain</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-border">
          <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors text-left">
            <Avatar className="w-9 h-9 border border-border">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-cyan-400 text-primary-foreground">
                GS
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-foreground">Giwa Sheedah</div>
              <div className="text-xs text-muted-foreground truncate">Free plan</div>
            </div>
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-56">
        {children}
      </main>
    </div>
  );
}
