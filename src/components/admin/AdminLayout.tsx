import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Shield, Users, BarChart3, Settings, Globe, ArrowLeft, LogOut, Database, TrendingUp, Brain, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const ADMIN_NAV = [
  { title: 'Dashboard', path: '/admin', icon: BarChart3 },
  { title: 'Users', path: '/admin/users', icon: Users },
  { title: 'Strategies', path: '/admin/strategies', icon: Globe },
  { title: 'Trades', path: '/admin/trades', icon: TrendingUp },
  { title: 'AI Prompts', path: '/admin/prompts', icon: Brain },
  { title: 'Database', path: '/admin/database', icon: Database },
  { title: 'Settings', path: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const { isAdmin, loading } = useAdmin();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/auth');
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    setIsMobileMenuOpen(false);
    await signOut();
  };

  const renderSidebar = () => (
    <>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Admin Panel</h1>
            <p className="text-[10px] text-muted-foreground">CryptoScanner Pro</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {ADMIN_NAV.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavigate(item.path)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
              location.pathname === item.path
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.title}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => handleNavigate('/')}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to App
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs text-destructive hover:text-destructive" onClick={handleSignOut}>
          <LogOut className="w-3.5 h-3.5" /> Logout
        </Button>
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Shield className="w-6 h-6 animate-pulse text-primary" />
          <span>Verifying admin access...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background flex w-full max-w-full overflow-x-hidden">
      <aside className="hidden lg:flex w-60 border-r border-border bg-card/50 flex-col shrink-0">
        {renderSidebar()}
      </aside>

      <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold truncate">Admin Panel</span>
          </div>
          <div className="h-9 w-9" />
        </header>

        <div className="w-full max-w-full overflow-x-hidden">
          <Outlet />
        </div>
      </main>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0 border-r border-border bg-card/95 backdrop-blur">
          <div className="flex h-full flex-col">{renderSidebar()}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
