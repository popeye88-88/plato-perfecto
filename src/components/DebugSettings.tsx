import { useBusinessContext } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugSettings() {
  const { 
    currentBusiness, 
    businesses, 
    userRole, 
    loading,
    refreshBusinesses 
  } = useBusinessContext();

  console.log('DebugSettings render:', {
    currentBusiness,
    businesses,
    userRole,
    loading
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug Settings Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Estado del BusinessContext:</h3>
            <div className="bg-muted p-4 rounded-lg">
              <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
              <p><strong>Current Business:</strong> {currentBusiness ? JSON.stringify(currentBusiness, null, 2) : 'null'}</p>
              <p><strong>Businesses Count:</strong> {businesses.length}</p>
              <p><strong>Businesses:</strong> {JSON.stringify(businesses, null, 2)}</p>
              <p><strong>User Role:</strong> {userRole || 'null'}</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Acciones:</h3>
            <button 
              onClick={refreshBusinesses}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refrescar Negocios
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
