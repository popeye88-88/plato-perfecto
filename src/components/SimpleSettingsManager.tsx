export default function SimpleSettingsManager() {
  console.log('SimpleSettingsManager render: START - ULTRA SIMPLE');

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f0f0' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
        🔍 Debug Ajustes - ULTRA SIMPLE
      </h1>
      
      <div style={{ backgroundColor: '#e3f2fd', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <h2 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Estado del BusinessContext:</h2>
        <p><strong>Loading:</strong> No disponible (contexto removido)</p>
        <p><strong>Current Business:</strong> No disponible (contexto removido)</p>
        <p><strong>Businesses Count:</strong> No disponible (contexto removido)</p>
        <p><strong>User Role:</strong> No disponible (contexto removido)</p>
      </div>

      <div style={{ backgroundColor: '#e8f5e8', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <h2 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Datos Raw:</h2>
        <pre style={{ fontSize: '12px', backgroundColor: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', overflow: 'auto' }}>
          {JSON.stringify({
            message: "Contexto removido para debug",
            timestamp: new Date().toISOString(),
            status: "Componente funcionando correctamente",
            version: "ULTRA SIMPLE"
          }, null, 2)}
        </pre>
      </div>

      <div style={{ backgroundColor: '#fff3cd', padding: '16px', borderRadius: '8px' }}>
        <h2 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Acciones:</h2>
        <button 
          onClick={() => window.location.reload()}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Recargar Página
        </button>
      </div>
    </div>
  );
}
