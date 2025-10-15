export default function SimpleSettingsManager() {
  console.log('SimpleSettingsManager render: START - COMPLETELY NEW VERSION');

  return (
    <div style={{ 
      padding: '24px', 
      backgroundColor: '#ff6b6b', 
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1 style={{ 
        fontSize: '32px', 
        fontWeight: 'bold', 
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        🚀 DEBUG COMPLETELY NEW VERSION
      </h1>
      
      <div style={{ 
        backgroundColor: '#4ecdc4', 
        padding: '24px', 
        borderRadius: '12px', 
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <h2 style={{ fontWeight: 'bold', marginBottom: '16px', fontSize: '20px' }}>
          ✅ COMPONENTE FUNCIONANDO CORRECTAMENTE
        </h2>
        <p style={{ fontSize: '18px' }}>
          Si ves esto, el problema NO está en el renderizado
        </p>
        <p style={{ fontSize: '18px' }}>
          El problema está en el BusinessContext
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#45b7d1', 
        padding: '24px', 
        borderRadius: '12px', 
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <h2 style={{ fontWeight: 'bold', marginBottom: '16px', fontSize: '20px' }}>
          📊 DATOS DE DEBUG
        </h2>
        <pre style={{ 
          fontSize: '14px', 
          backgroundColor: 'white', 
          color: 'black',
          padding: '16px', 
          borderRadius: '8px', 
          border: '2px solid #333',
          overflow: 'auto',
          textAlign: 'left'
        }}>
          {JSON.stringify({
            message: "Componente completamente nuevo",
            timestamp: new Date().toISOString(),
            status: "FUNCIONANDO PERFECTAMENTE",
            version: "COMPLETELY NEW VERSION",
            cache_busted: true
          }, null, 2)}
        </pre>
      </div>

      <div style={{ 
        backgroundColor: '#f9ca24', 
        padding: '24px', 
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h2 style={{ fontWeight: 'bold', marginBottom: '16px', fontSize: '20px' }}>
          🔄 ACCIONES
        </h2>
        <button 
          onClick={() => window.location.reload()}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#6c5ce7', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          🔄 RECARGAR PÁGINA
        </button>
      </div>
    </div>
  );
}
