import React, { useState, useEffect } from 'react';

const CustomerProfiles = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetch('http://127.0.0.1:8083/api/customers')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setCustomers(data.customers);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching customers:', err);
        setLoading(false);
      });
  }, []);

  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setLoadingHistory(true);
    setHistory([]);
    try {
      const res = await fetch(`http://127.0.0.1:8083/api/customers/${customer.telefono}`);
      const data = await res.json();
      if (data.ok) setHistory(data.history);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    (c.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono.includes(searchTerm) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.4s ease' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Expedientes CRM</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>Historial y análisis de comportamiento por cliente</p>
      </header>

      <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
        {/* Left: Search and List */}
        <div className="glass-panel" style={{ width: '350px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
            <input 
              type="text" 
              placeholder="Buscar por nombre o número..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--glass-border)',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {loading ? (
              <div style={{ padding: '20px', color: 'var(--text-secondary)', textAlign: 'center' }}>Cargando...</div>
            ) : filteredCustomers.map(customer => (
              <div 
                key={customer.telefono}
                onClick={() => handleSelectCustomer(customer)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: selectedCustomer?.telefono === customer.telefono ? 'rgba(45, 212, 191, 0.1)' : 'transparent',
                  border: `1px solid ${selectedCustomer?.telefono === customer.telefono ? 'rgba(45, 212, 191, 0.2)' : 'transparent'}`,
                  transition: 'all 0.2s',
                  marginBottom: '4px'
                }}
                onMouseEnter={e => { if (selectedCustomer?.telefono !== customer.telefono) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { if (selectedCustomer?.telefono !== customer.telefono) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{customer.nombre || 'Desconocido'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{customer.telefono}</span>
                  <span style={{ color: 'var(--accent-teal)' }}>{customer.total_tickets} tickets</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Detail View */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedCustomer ? (
            <>
              <div style={{ padding: '32px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', color: '#fff' }}>{selectedCustomer.nombre}</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{selectedCustomer.email || 'Sin correo registrado'}</p>
                    <p style={{ color: 'var(--accent-teal)', margin: '8px 0 0 0', fontSize: '0.9rem' }}>📞 {selectedCustomer.telefono}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Tickets</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-teal)' }}>{selectedCustomer.total_tickets}</div>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '24px' }}>Línea de Tiempo del Cliente</h3>
                
                {loadingHistory ? (
                  <div style={{ color: 'var(--text-secondary)' }}>Consultando historial...</div>
                ) : history.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
                    {/* Vertical line */}
                    <div style={{ position: 'absolute', left: '11px', top: '10px', bottom: '10px', width: '2px', background: 'var(--glass-border)' }}></div>
                    
                    {history.map(item => (
                      <div key={item.id} style={{ position: 'relative', paddingLeft: '40px' }}>
                        <div style={{ position: 'absolute', left: '0', top: '6px', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid var(--accent-teal)', zIndex: 1 }}></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          {new Date(item.fecha_reporte).toLocaleString()} — Ticket #{item.ticket_id_osticket || 'Local'}
                        </div>
                        <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)' }}>
                          <p style={{ margin: 0, lineHeight: 1.6, fontSize: '0.95rem' }}>{item.mensaje_original}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)' }}>No hay tickets registrados para este cliente.</div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '4rem', marginBottom: '16px' }}>🔍</span>
              <p>Selecciona un cliente para ver su expediente completo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerProfiles;
