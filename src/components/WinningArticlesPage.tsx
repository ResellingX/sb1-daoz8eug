import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ArrowDown, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Menu, Plus, RefreshCw, Trash2, Trophy, X, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Article = {
  id: string;
  name: string;
  brand: string;
  avg_sale_price: number;
  estimated_margin: number;
  velocity_score: number;
  trend: string;
  notes: string;
  image_url: string;
  size: string;
  sale_time_minutes: number;
  description: string;
  vinted_url: string;
  created_at: string;
};

const ART_SELECT = 'id, name, brand, avg_sale_price, estimated_margin, velocity_score, trend, notes, image_url, size, sale_time_minutes, description, vinted_url, created_at';
const CACHE_KEY = 'resellingx-winning-articles';
const ADMIN_STORAGE_KEY = 'resellingx-admin-config';

function readCache(): Article[] {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]'); } catch { return []; }
}
function writeCache(articles: Article[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(articles)); } catch { /* noop */ }
}

function getVintedCookie(): string {
  try {
    const cfg = JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY) ?? '{}');
    return cfg.vintedCookie ?? '';
  } catch { return ''; }
}

function formatTime(mins: number): string {
  if (mins <= 0) return '';
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function TrendBadge({ trend }: { trend: string }) {
  const cfg: Record<string, { icon: typeof ArrowUp; label: string; cls: string }> = {
    rising: { icon: ArrowUp, label: 'En alza', cls: 'wa-trend-up' },
    falling: { icon: ArrowDown, label: 'Bajando', cls: 'wa-trend-down' },
    stable: { icon: ArrowRight, label: 'Estable', cls: 'wa-trend-stable' },
  };
  const c = cfg[trend] ?? cfg.stable;
  const Icon = c.icon;
  return <span className={`wa-trend ${c.cls}`}><Icon size={13} /> {c.label}</span>;
}

function DetailModal({ article, close }: { article: Article; close: () => void }) {
  const cookie = getVintedCookie();
  return (
    <div className="modal-layer" onClick={close}>
      <div className="wa-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="wa-detail-close" onClick={close}><X size={22} /></button>
        {article.image_url && <img className="wa-detail-img" src={article.image_url} alt={article.name} />}
        {!article.image_url && <div className="wa-detail-img-placeholder"><Trophy size={40} /></div>}
        <div className="wa-detail-body">
          <h2>{article.name}</h2>
          <div className="wa-detail-meta">
            {article.brand && <span className="wa-brand">{article.brand}</span>}
            {article.size && <span className="wa-brand">T{article.size}</span>}
            <TrendBadge trend={article.trend} />
          </div>
          <div className="wa-detail-stats">
            <div className="wa-detail-stat">
              <span className="wa-detail-stat-val">{article.avg_sale_price}€</span>
              <span className="wa-detail-stat-lbl">Precio venta</span>
            </div>
            <div className="wa-detail-stat">
              <span className="wa-detail-stat-val accent">+{article.estimated_margin}%</span>
              <span className="wa-detail-stat-lbl">Margen</span>
            </div>
            {article.sale_time_minutes > 0 && (
              <div className="wa-detail-stat">
                <span className="wa-detail-stat-val warn"><Zap size={14} /> {formatTime(article.sale_time_minutes)}</span>
                <span className="wa-detail-stat-lbl">Vendido en</span>
              </div>
            )}
          </div>
          {article.description && <p className="wa-detail-desc">{article.description}</p>}
          {article.vinted_url && (
            <a className="wa-detail-link" href={article.vinted_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} /> Ver anuncio en Vinted
            </a>
          )}
          {cookie && article.vinted_url && (
            <span className="wa-cookie-status">Cookie de sesion activa</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function WinningArticlesPage({ openMenu }: { openMenu: () => void }) {
  const cached = readCache();
  const [articles, setArticles] = useState<Article[]>(cached);
  const [loading, setLoading] = useState(cached.length === 0);
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [adminMode, setAdminMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Article | null>(null);
  const [form, setForm] = useState({ name: '', brand: '', avg_sale_price: '', estimated_margin: '', velocity_score: '80', trend: 'rising', notes: '', image_url: '', size: '', sale_time_minutes: '', description: '', vinted_url: '' });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const result = await supabase.from('winning_articles').select(ART_SELECT).order('velocity_score', { ascending: false });
      if (mounted && !result.error) {
        const data = (result.data ?? []) as Article[];
        setArticles(data);
        writeCache(data);
      }
      if (mounted) setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (syncMsg) { const t = setTimeout(() => setSyncMsg(''), 5000); return () => clearTimeout(t); }
  }, [syncMsg]);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  const syncVinted = async () => {
    const cookie = getVintedCookie();
    if (!cookie) {
      setSyncMsg('No hay cookie configurada. Ve a Administrador para pegarla.');
      return;
    }
    setSyncing(true);
    setSyncMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vinted-sync`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cookie }),
      });

      const body = await res.json();

      if (!res.ok) {
        setSyncMsg(body.error ?? `Error ${res.status}: No se pudo sincronizar.`);
        setSyncing(false);
        return;
      }

      if (body.articles && body.articles.length > 0) {
        const merged = [...body.articles as Article[], ...articles];
        const unique = Array.from(new Map(merged.map((a) => [a.id, a])).values())
          .sort((a, b) => b.velocity_score - a.velocity_score);
        setArticles(unique);
        writeCache(unique);
      }
      setSyncMsg(body.message ?? 'Sincronizacion completada.');
    } catch {
      setSyncMsg('Error de red al conectar con Vinted. Intentalo de nuevo.');
    }
    setSyncing(false);
  };

  const addArticle = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const row = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      avg_sale_price: Number(form.avg_sale_price) || 0,
      estimated_margin: Number(form.estimated_margin) || 0,
      velocity_score: Math.min(100, Math.max(0, Number(form.velocity_score) || 80)),
      trend: form.trend,
      notes: form.notes.trim(),
      image_url: form.image_url.trim(),
      size: form.size.trim(),
      sale_time_minutes: Number(form.sale_time_minutes) || 0,
      description: form.description.trim(),
      vinted_url: form.vinted_url.trim(),
    };
    const result = await supabase.from('winning_articles').insert(row).select(ART_SELECT).maybeSingle();
    if (!result.error && result.data) {
      const updated = [result.data as Article, ...articles].sort((a, b) => b.velocity_score - a.velocity_score);
      setArticles(updated);
      writeCache(updated);
      setForm({ name: '', brand: '', avg_sale_price: '', estimated_margin: '', velocity_score: '80', trend: 'rising', notes: '', image_url: '', size: '', sale_time_minutes: '', description: '', vinted_url: '' });
      setAddOpen(false);
    }
    setSaving(false);
  };

  const deleteArticle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este artículo?')) return;
    const result = await supabase.from('winning_articles').delete().eq('id', id);
    if (!result.error) {
      const updated = articles.filter((a) => a.id !== id);
      setArticles(updated);
      writeCache(updated);
    }
  };

  return (
    <main className="page-shell wa-page">
      <header className="sales-header">
        <button className="icon-button" onClick={openMenu} aria-label="Abrir menú"><Menu size={26} /></button>
        <h1>Artículos Ganadores</h1>
        <div className="header-spacer" />
      </header>

      <p className="wa-subtitle">Productos reales importados desde Vinted. Pulsa "Sincronizar" para buscar nuevos artículos.</p>

      {isAdmin && (
        <div className="wa-toolbar">
          <button className={`wa-mode-btn${adminMode ? ' active' : ''}`} onClick={() => setAdminMode(!adminMode)}>
            {adminMode ? 'Vista Pública' : 'Modo Admin'}
          </button>
          <button className="wa-sync-btn" onClick={() => void syncVinted()} disabled={syncing}>
            {syncing ? <LoaderCircle size={16} className="spin" /> : <RefreshCw size={16} />}
            {syncing ? 'Sincronizando...' : 'Sincronizar Vinted'}
          </button>
          {adminMode && <button className="wa-add-btn" onClick={() => setAddOpen(true)}><Plus size={16} /> Añadir</button>}
        </div>
      )}

      {!isAdmin && (
        <div className="wa-toolbar">
          <button className="wa-sync-btn" onClick={() => void syncVinted()} disabled={syncing}>
            {syncing ? <LoaderCircle size={16} className="spin" /> : <RefreshCw size={16} />}
            {syncing ? 'Sincronizando...' : 'Sincronizar Vinted'}
          </button>
        </div>
      )}

      {syncMsg && (
        <div className={`wa-sync-msg${syncMsg.toLowerCase().includes('error') || syncMsg.toLowerCase().includes('no hay cookie') || syncMsg.toLowerCase().includes('caducada') ? ' error' : ''}`}>
          {syncMsg}
        </div>
      )}

      {loading ? (
        <div className="loading-state"><LoaderCircle size={28} className="spin" /><p>Cargando ranking...</p></div>
      ) : articles.length === 0 ? (
        <div className="empty-sales"><Trophy size={36} /><p>No hay artículos ganadores. Pulsa "Sincronizar Vinted" para importar datos reales.</p></div>
      ) : (
        <>
          <div className="wa-carousel-wrap">
            <button className="wa-arrow wa-arrow-l" onClick={() => scroll(-1)}><ChevronLeft size={20} /></button>
            <div className="wa-carousel" ref={scrollRef}>
              {articles.map((a) => (
                <button className="wa-slide" key={a.id} onClick={() => setSelected(a)}>
                  {a.image_url ? (
                    <img className="wa-slide-img" src={a.image_url} alt={a.name} />
                  ) : (
                    <div className="wa-slide-ph"><Trophy size={28} /></div>
                  )}
                  <div className="wa-slide-body">
                    <strong>{a.name}</strong>
                    <span className="wa-slide-price">{a.avg_sale_price}€</span>
                    {a.sale_time_minutes > 0 && (
                      <span className="wa-slide-speed"><Zap size={12} /> Vendido en {formatTime(a.sale_time_minutes)}</span>
                    )}
                  </div>
                  {adminMode && (
                    <button className="wa-slide-del" onClick={(e) => deleteArticle(a.id, e)} title="Eliminar"><Trash2 size={14} /></button>
                  )}
                </button>
              ))}
            </div>
            <button className="wa-arrow wa-arrow-r" onClick={() => scroll(1)}><ChevronRight size={20} /></button>
          </div>

          <section className="wa-ranking">
            <h2>Ranking por velocidad</h2>
            {articles.map((a, idx) => (
              <button className="wa-rank-row" key={a.id} onClick={() => setSelected(a)}>
                <span className="wa-rank-num">#{idx + 1}</span>
                <div className="wa-rank-info">
                  <strong>{a.name}</strong>
                  <span>{a.avg_sale_price}€ {a.sale_time_minutes > 0 && `· ${formatTime(a.sale_time_minutes)}`}</span>
                </div>
                <TrendBadge trend={a.trend} />
              </button>
            ))}
          </section>
        </>
      )}

      {selected && <DetailModal article={selected} close={() => setSelected(null)} />}

      {addOpen && (
        <div className="modal-layer" onClick={() => setAddOpen(false)}>
          <div className="modal-card wa-add-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nuevo Artículo Ganador</h3>
            <div className="product-form wa-add-form">
              <label>Nombre<input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Nike Dunk Low Panda" /></label>
              <div className="form-row">
                <label>Marca<input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Nike" /></label>
                <label>Talla<input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="42" /></label>
              </div>
              <div className="form-row">
                <label>Precio venta (€)<input type="number" value={form.avg_sale_price} onChange={(e) => setForm((f) => ({ ...f, avg_sale_price: e.target.value }))} /></label>
                <label>Margen (%)<input type="number" value={form.estimated_margin} onChange={(e) => setForm((f) => ({ ...f, estimated_margin: e.target.value }))} /></label>
              </div>
              <div className="form-row">
                <label>Vendido en (min)<input type="number" value={form.sale_time_minutes} onChange={(e) => setForm((f) => ({ ...f, sale_time_minutes: e.target.value }))} placeholder="270" /></label>
                <label>Velocidad (0-100)<input type="number" min="0" max="100" value={form.velocity_score} onChange={(e) => setForm((f) => ({ ...f, velocity_score: e.target.value }))} /></label>
              </div>
              <label>URL imagen<input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://..." /></label>
              <label>URL Vinted<input value={form.vinted_url} onChange={(e) => setForm((f) => ({ ...f, vinted_url: e.target.value }))} placeholder="https://www.vinted.es/..." /></label>
              <label>Descripción<textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción del anuncio original" style={{ width: '100%', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px', fontSize: 14, resize: 'vertical' }} /></label>
              <label>Notas internas<input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notas opcionales" /></label>
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setAddOpen(false)}>Cancelar</button>
              <button className="modal-save" onClick={() => void addArticle()} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
