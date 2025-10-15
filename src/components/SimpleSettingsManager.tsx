export default function SimpleSettingsManager() {
  console.log('SimpleSettingsManager render: START');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🔍 Debug Ajustes</h1>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Estado del BusinessContext:</h2>
          <p><strong>Loading:</strong> No disponible (contexto removido)</p>
          <p><strong>Current Business:</strong> No disponible (contexto removido)</p>
          <p><strong>Businesses Count:</strong> No disponible (contexto removido)</p>
          <p><strong>User Role:</strong> No disponible (contexto removido)</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Datos Raw:</h2>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto">
            {JSON.stringify({
              message: "Contexto removido para debug",
              timestamp: new Date().toISOString(),
              status: "Componente funcionando correctamente"
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Acciones:</h2>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Recargar Página
          </button>
        </div>
      </div>
    </div>
  );
}
