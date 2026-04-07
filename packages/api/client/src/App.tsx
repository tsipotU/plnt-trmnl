import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard.js';
import { AddPlant } from './pages/AddPlant.js';
import { PlantDetail } from './pages/PlantDetail.js';
import { FactManagement } from './pages/FactManagement.js';
import { TrmnlPreview } from './pages/TrmnlPreview.js';
import { TrmnlSetup } from './pages/TrmnlSetup.js';

function Header() {
  const location = useLocation();

  return (
    <header
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Link
        to="/"
        style={{
          color: location.pathname === '/' ? 'var(--accent)' : 'var(--text-primary)',
          fontWeight: 600,
          fontSize: 18,
        }}
      >
        Plant TRMNL
      </Link>
      <nav style={{ display: 'flex', gap: 16 }}>
        <Link
          to="/add"
          style={{
            color: location.pathname === '/add' ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 14,
          }}
        >
          + Add
        </Link>
        <Link
          to="/facts"
          style={{
            color: location.pathname === '/facts' ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 14,
          }}
        >
          Facts
        </Link>
        <Link
          to="/preview"
          style={{
            color: location.pathname === '/preview' ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 14,
          }}
        >
          Preview
        </Link>
        <Link
          to="/setup"
          style={{
            color: location.pathname === '/setup' ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 14,
          }}
        >
          Setup
        </Link>
      </nav>
    </header>
  );
}

export function App() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: 16 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plants/:id" element={<PlantDetail />} />
          <Route path="/add" element={<AddPlant />} />
          <Route path="/facts" element={<FactManagement />} />
          <Route path="/preview" element={<TrmnlPreview />} />
          <Route path="/setup" element={<TrmnlSetup />} />
        </Routes>
      </main>
    </div>
  );
}
