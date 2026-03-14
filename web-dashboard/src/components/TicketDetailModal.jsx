import React from 'react';

const TicketDetailModal = ({ ticket, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div 
        className="glass-panel" 
        style={{ 
          width: '800px', 
          height: '600px', 
          display: 'flex', 
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          animation: 'slideUp 0.3s ease'
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        
        {/* Header */}
        <header style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', gap: '12px', alignItems: 'center' }}>
              Ticket {ticket.id} Details
              <span className={`status-badge ${ticket.status}`}>{ticket.status}</span>
            </h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              From: {ticket.customer} via WhatsApp ({ticket.source})
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
        </header>

        {/* Content Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Left: Chat history simulation */}
          <div style={{ flex: 2, borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
              <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Conversation History</h4>
            </div>
            
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Customer Chat Bubble */}
              <div style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                <div style={{ background: 'rgba(255,255,255,0.08)', padding: '16px', borderRadius: '16px', borderBottomLeftRadius: '4px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--accent-teal)', fontWeight: 600 }}>{ticket.customer} (WhatsApp)</p>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>{ticket.subject}</p>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '4px' }}>10:53 AM</div>
              </div>

              {/* Bot/Admin Chat Bubble */}
              <div style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
                <div style={{ background: 'rgba(45, 212, 191, 0.15)', border: '1px solid rgba(45, 212, 191, 0.3)', padding: '16px', borderRadius: '16px', borderBottomRightRadius: '4px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>Helpdesk Bot / Admin</p>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>We have received your request and synced it internally. Our technicians are reviewing it.</p>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right', paddingRight: '4px' }}>10:58 AM</div>
              </div>
            </div>

            {/* Read-Only Mode / Email Link */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center' }}>
              <a 
                href={`mailto:?subject=RE: Ticket ${ticket.id}`} 
                target="_blank" 
                rel="noreferrer"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} 
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <span>📧</span> Abrir Notificación en Correo
              </a>
            </div>
          </div>

          {/* Right: Attachments and Metadata */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: '24px', background: 'rgba(0,0,0,0.1)' }}>
            <div>
              <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Attachments</h4>
              <div style={{ border: '1px dashed var(--glass-border)', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                <span style={{ fontSize: '1.5rem' }}>📄</span>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>error_log.txt</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>12 KB • Uploaded via Bot</div>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Ticket Properties</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                <PropertyRow label="Priority" value={ticket.priority} />
                <PropertyRow label="Linked Phone" value="+52 811 123 4567" />
                <PropertyRow label="Database ID" value={ticket.id} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const PropertyRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ color: 'var(--text-primary)' }}>{value}</span>
  </div>
);

export default TicketDetailModal;
