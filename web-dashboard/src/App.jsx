import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import TicketTable from './components/TicketTable'
import TicketDetailModal from './components/TicketDetailModal'
import CustomerProfiles from './components/CustomerProfiles'
import Settings from './components/Settings'

function App() {
  const [activeTab, setActiveTab] = useState('tickets');
  const [activeTicket, setActiveTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const previousTicketsRef = useRef([]);

  // Solicitar permisos para Notificaciones Nativas del Navegador
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  // Pool maintenance status and tickets
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Tickets
        if (activeTab === 'tickets') {
          setLoading(true);
          const resT = await fetch('http://127.0.0.1:8083/api/tickets');
          const dataT = await resT.json();
          if (dataT.ok) {
            const parsedTickets = dataT.tickets.map(t => ({
              ...t,
              id: `#${t.externalId || t.id}`,
              status: t.externalId ? 'open' : 'pending', // Logic assumption
              priority: 'Medium'
            }));

            // Comparar tickets anteriores vs nuevos para lanzar notificación nativa Desktop
            if (previousTicketsRef.current.length > 0 && parsedTickets.length > 0) {
              const prevIds = new Set(previousTicketsRef.current.map(t => t.id));
              const newArrivals = parsedTickets.filter(t => !prevIds.has(t.id));

              if (newArrivals.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
                newArrivals.forEach(t => {
                  new Notification(`🔔 Nuevo Ticket: ${t.id}`, {
                    body: `Cliente: ${t.customer}\nAsunto: ${t.subject}`,
                    icon: '/vite.svg'
                  });
                });
              }
            }

            previousTicketsRef.current = parsedTickets;
            setTickets(parsedTickets);
          }
          setLoading(false);
        }

        // Fetch Maintenance Status
        const resM = await fetch('http://127.0.0.1:8083/api/settings/maintenance');
        const dataM = await resM.json();
        if (dataM.ok) setIsMaintenance(dataM.isMaintenanceMode);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleViewTicket = (ticket) => {
    setActiveTicket(ticket);
  };

  const handleCloseModal = () => {
    setActiveTicket(null);
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} onNavigate={setActiveTab} />
      
      <main className="main-content glass-panel" style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Persistent Maintenance Banner */}
        {isMaintenance && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.9)', 
            color: 'var(--text-primary)', 
            padding: '10px 24px', 
            borderRadius: '8px', 
            marginBottom: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            fontSize: '0.9rem',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            animation: 'pulse 2s infinite'
          }}>
            <style>{`
              @keyframes pulse {
                0% { opacity: 0.9; }
                50% { opacity: 1; transform: scale(1.005); }
                100% { opacity: 0.9; }
              }
            `}</style>
            <span>🛠️</span> EL SISTEMA SE ENCUENTRA EN MANTENIMIENTO. EL BOT ESTÁ PAUSADO.
          </div>
        )}

        {activeTab === 'tickets' && (
          <>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Monitor de Tickets</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>Visualización real de tickets sincronizados por el Bot</p>
              </div>
              {loading && <div style={{ fontSize: '0.8rem', color: 'var(--accent-teal)' }}>Actualizando...</div>}
            </header>

            <section style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
              <TicketTable tickets={tickets} onViewTicket={handleViewTicket} />
            </section>
          </>
        )}

        {activeTab === 'crm' && (
          <CustomerProfiles />
        )}

        {activeTab === 'settings' && (
          <Settings />
        )}

      </main>

      {activeTicket && (
        <TicketDetailModal ticket={activeTicket} onClose={handleCloseModal} />
      )}
    </div>
  )
}

export default App;
