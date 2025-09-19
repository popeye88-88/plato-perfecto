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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300",
        isSidebarOpen ? "w-64" : "w-16",
        "md:relative md:inset-auto" // Make sidebar responsive
      )}>
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            {isSidebarOpen && (
              <h1 className="text-xl font-bold text-foreground">RestauranteOS</h1>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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
                  "w-full justify-start",
                  !isSidebarOpen && "justify-center px-2"
                )}
                onClick={() => onPageChange(item.id)}
              >
                <Icon className={cn("h-5 w-5", isSidebarOpen && "mr-3")} />
                {isSidebarOpen && item.label}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300",
        isSidebarOpen ? "md:ml-64" : "md:ml-16",
        "ml-0" // Remove margin on mobile
      )}>
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}