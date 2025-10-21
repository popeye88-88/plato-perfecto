import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Menu, Settings, ClipboardList, BarChart3, ChefHat } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'menu', label: 'Menú', icon: ChefHat },
  { id: 'orders', label: 'Comandas', icon: ClipboardList },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export default function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start closed on mobile

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border h-16 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-foreground">RestauranteOS</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300",
        // Mobile: slide in/out
        "md:relative md:inset-auto",
        // Desktop: always visible
        "md:w-64",
        // Mobile: slide behavior
        isSidebarOpen ? "w-64" : "-translate-x-full md:translate-x-0 md:w-16"
      )}>
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground md:block hidden">RestauranteOS</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:block hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="mt-8 px-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-left",
                  "md:justify-start"
                )}
                onClick={() => {
                  onPageChange(item.id);
                  // Close sidebar on mobile after selection
                  if (window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
              >
                <Icon className="h-5 w-5 mr-3" />
                <span className="md:block">{item.label}</span>
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300",
        // Mobile: full width with top padding for header
        "pt-16 md:pt-0",
        // Desktop: margin for sidebar
        "md:ml-64"
      )}>
        <main className="p-4 md:p-6 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}