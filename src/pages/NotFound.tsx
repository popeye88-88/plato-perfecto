import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="h-16 w-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
          <h2 className="text-xl font-semibold text-foreground mb-4">Página no encontrada</h2>
          <p className="text-muted-foreground mb-6">
            La página que buscas no existe o ha sido movida.
          </p>
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
