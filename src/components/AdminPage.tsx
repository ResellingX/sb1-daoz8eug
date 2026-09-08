import { useState, useEffect } from 'react';
import { Menu, Shield, Save, Clock, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'resellingx-admin-config';

type AdminConfig = {
  vintedCookie: string;
  refreshMin: number;
  refreshMax: number;
  lastSync: string;
};

const defaultConfig: AdminConfig = { vintedCookie: '', refreshMin: 45, refreshMax: 75, lastSync: '' };

function readConfig(): AdminConfig {
  try { return { ...defaultConfig, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }; } catch { return defaultConfig; }
}

export function AdminPage({ openMenu }: { openMenu: () => void }) {
  const [config, setConfig] = useState<AdminConfig>(readConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (saved) { const t = setTimeout(() => setSaved(false), 2000); return () => clearTimeout(t); }
  }, [saved]);

  const handleSave = () => {
    const clean: AdminConfig = {
      ...config,
      refreshMin: Math.max(1, Math.min(config.refreshMin, config.refreshMax - 1)),
      refreshMax: Math.max(config.refreshMin + 1, config.refreshMax),
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch { /* noop */ }
    setConfig(clean);
    setSaved(true);
  };

  const nextSync = config.lastSync
    ? (() => {
        const last = new Date(config.lastSync);
        const avg = (config.refreshMin + config.refreshMax) / 2;
        const next = new Date(last.getTime() + avg * 60000);
        return next > new Date() ? next.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Pendiente';
      })()
    : 'Sin datos';

  return (
    <main className="page-shell admin-page">
      <header className="sales-header">
        <button className="icon-button" onClick={openMenu} aria-label="Abrir menú"><Menu size={26} /></button>
        <h1>Administrador</h1>
        <div className="header-spacer" />
      </header>

      <section className="admin-section">
        <div className="admin-section-head">
          <Shield size={20} />
          <h2>Credenciales de sesión Vinted</h2>
        </div>
        <p className="admin-hint">Cookie o token necesario para la sincronización automática de datos de tendencias y artículos ganadores.</p>
        <label className="admin-field">
          <span>Cookie de sesión</span>
          <textarea
            value={config.vintedCookie}
            onChange={(e) => setConfig((c) => ({ ...c, vintedCookie: e.target.value }))}
            placeholder="Pega aquí tu cookie _vinted_fr_session o el token de autenticación..."
            rows={4}
          />
        </label>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <Clock size={20} />
          <h2>Intervalo de actualización</h2>
        </div>
        <p className="admin-hint">Los datos se refrescan a intervalos aleatorios dentro de este rango para simular comportamiento humano.</p>
        <div className="admin-range-row">
          <label className="admin-field">
            <span>Mínimo (min)</span>
            <input
              type="number"
              min={1}
              value={config.refreshMin}
              onChange={(e) => setConfig((c) => ({ ...c, refreshMin: Number(e.target.value) || 1 }))}
            />
          </label>
          <label className="admin-field">
            <span>Máximo (min)</span>
            <input
              type="number"
              min={2}
              value={config.refreshMax}
              onChange={(e) => setConfig((c) => ({ ...c, refreshMax: Number(e.target.value) || 75 }))}
            />
          </label>
        </div>
        <div className="admin-sync-info">
          <RefreshCw size={14} />
          <span>Próxima sincronización estimada: <strong>{nextSync}</strong></span>
        </div>
      </section>

      <button className="admin-save" onClick={handleSave}>
        <Save size={18} /> {saved ? 'Guardado' : 'Guardar configuración'}
      </button>

      {saved && <div className="admin-toast">Configuración guardada correctamente</div>}
    </main>
  );
}
