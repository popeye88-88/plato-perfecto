import { useBusinessContext } from '@/contexts/BusinessContext';

export default function SimpleSettingsManager() {
  const { 
    currentBusiness, 
    businesses, 
    userRole, 
    loading 
  } = useBusinessContext();

  console.log('SimpleSettingsManager render:', {
    currentBusiness,
    businesses,
    userRole,
    loading
  });

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Ajustes</h1>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Ajustes</h1>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Estado del Usuario:</h2>
          <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
          <p><strong>Current Business:</strong> {currentBusiness?.name || 'null'}</p>
          <p><strong>Businesses Count:</strong> {businesses.length}</p>
          <p><strong>User Role:</strong> {userRole || 'null'}</p>
        </div>

        {currentBusiness && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="font-semibold mb-2">Negocio Actual:</h2>
            <p><strong>Nombre:</strong> {currentBusiness.name}</p>
            <p><strong>ID:</strong> {currentBusiness.id}</p>
            <p><strong>Rol:</strong> {userRole}</p>
          </div>
        )}

        {businesses.length > 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h2 className="font-semibold mb-2">Todos los Negocios:</h2>
            {businesses.map((business, index) => (
              <div key={business.id} className="mb-2">
                <p><strong>Negocio {index + 1}:</strong> {business.name} (ID: {business.id})</p>
              </div>
            ))}
          </div>
        )}

        {!currentBusiness && businesses.length === 0 && (
          <div className="bg-red-50 p-4 rounded-lg">
            <h2 className="font-semibold mb-2 text-red-600">Error:</h2>
            <p>No se encontraron negocios para este usuario.</p>
          </div>
        )}
      </div>
    </div>
  );
}
