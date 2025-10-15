import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useBusinessContext } from '@/contexts/BusinessContext';

interface AccessDeniedProps {
  children: React.ReactNode;
}

export default function AccessDenied({ children }: AccessDeniedProps) {
  const { currentBusiness, businesses, loading, refreshBusinesses } = useBusinessContext();

  console.log('AccessDenied render:', {
    currentBusiness,
    businesses,
    loading,
    businessesLength: businesses.length
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando información del negocio...</p>
        </div>
      </div>
    );
  }

  if (!currentBusiness && businesses.length === 0 && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
            <CardTitle className="text-xl">Acceso Restringido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No tienes acceso a ningún negocio. Esto puede suceder si:
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li>Tu cuenta fue creada antes de la implementación del sistema de negocios</li>
                  <li>Hubo un error durante el registro</li>
                  <li>Tu negocio fue eliminado</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Button 
                onClick={refreshBusinesses}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recargar Información
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Si el problema persiste, contacta al administrador del sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
