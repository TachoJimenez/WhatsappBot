import React from 'react';

const Sidebar = ({ activeTab, onNavigate }) => {
  return (
    <aside className="glass-panel" style={{ width: '280px', display: 'flex', flexDirection: 'column', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 'bold' }}>W</span>
        </div>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>Helpdesk Bot</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Welcome, Admin</p>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <NavItem 
          active={activeTab === 'tickets'} 
          label="Tickets Monitor" 
          icon="📊" 
          onClick={() => onNavigate('tickets')} 
        />
        <NavItem 
          active={activeTab === 'crm'} 
          label="Perfiles CRM" 
          icon="👥" 
          onClick={() => onNavigate('crm')} 
        />
        <div style={{ margin: '16px 0', height: '1px', background: 'var(--glass-border)' }}></div>
        <NavItem 
          active={activeTab === 'settings'} 
          label="Mantenimiento" 
          icon="🛠️" 
          onClick={() => onNavigate('settings')} 
        />
      </nav>
      
      <div style={{ marginTop: 'auto', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Bot Status</h4>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--status-resolved)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-resolved)', display: 'inline-block' }}></span>
          Online & Listening
        </div>
      </div>
    </aside>
  );
};

const NavItem = ({ active, label, icon, onClick }) => {
  return (
    <a 
      href="#" 
      onClick={(e) => { e.preventDefault(); onClick(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        textDecoration: 'none',
        color: active ? '#fff' : 'var(--text-secondary)',
        background: active ? 'linear-gradient(90deg, rgba(45, 212, 191, 0.15), transparent)' : 'transparent',
        borderLeft: active ? '3px solid var(--accent-teal)' : '3px solid transparent',
        transition: 'all 0.2s',
        fontWeight: active ? 500 : 400,
      }}
    >
      <span style={{ fontSize: '1.2rem', filter: active ? 'drop-shadow(0 0 8px rgba(45,212,191,0.5))' : 'none' }}>{icon}</span>
      {label}
    </a>
  );
};

export default Sidebar;
