import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch('http://127.0.0.1:8083/api/settings/maintenance')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setIsMaintenance(data.isMaintenanceMode);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching maintenance status:', err);
        setLoading(false);
      });
  }, []);

  const handleToggle = async () => {
    setUpdating(true);
    try {
      const res = await fetch('http://127.0.0.1:8083/api/settings/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !isMaintenance })
      });
      const data = await res.json();
      if (data.ok) {
        setIsMaintenance(data.isMaintenanceMode);
      }
    } catch (err) {
      console.error('Error updating maintenance mode:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-primary)', padding: '20px' }}>Cargando configuración...</div>;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Configuración del Sistema</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>Control Maestro y Mantenimiento</p>
      </header>

      <div className="glass-panel" style={{ padding: '32px', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderRadius: '16px', background: isMaintenance ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.03)', border: `1px solid ${isMaintenance ? 'rgba(239, 68, 68, 0.2)' : 'var(--glass-border)'}`, transition: 'all 0.3s ease' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, color: isMaintenance ? '#ef4444' : 'var(--text-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛠️</span> Modo Mantenimiento
            </h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {isMaintenance 
                ? 'El bot está bloqueado. Los usuarios de WhatsApp recibirán un aviso de mantenimiento automático.' 
                : 'El bot está operando normalmente. Los usuarios pueden crear tickets.'}
            </p>
          </div>
          
          <button 
            onClick={handleToggle}
            disabled={updating}
            style={{
              width: '60px',
              height: '32px',
              borderRadius: '20px',
              background: isMaintenance ? '#ef4444' : 'rgba(255,255,255,0.1)',
              border: 'none',
              position: 'relative',
              cursor: updating ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '4px',
              left: isMaintenance ? '32px' : '4px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--text-primary)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}></div>
          </button>
        </div>

        <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resumen de Impacto</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Bloqueo inmediato de nuevas solicitudes en WhatsApp.</li>
            <li>Respuesta automática personalizada activada.</li>
            <li>Banner de alerta visible en este Dashboard.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Settings;
