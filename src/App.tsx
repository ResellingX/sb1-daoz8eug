import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeEuro,
  BarChart3,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Gift,
  Home,
  ImagePlus,
  Lightbulb,
  LoaderCircle,
  LogOut,
  Menu,
  Mic,
  Minus,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  Trophy,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { isPrivacyHidden, setPrivacyHidden, verifyPin } from '@/lib/pin';
import { PinPadModal } from '@/components/PinPadModal';
import { LoginPage } from '@/components/LoginPage';
import { ProfilePage } from '@/components/ProfilePage';
import { InvoicesPage } from '@/components/InvoicesPage';
import { AchievementsPage } from '@/components/AchievementsPage';
import { CelebrationModal } from '@/components/CelebrationModal';
import { useAchievementCheck } from '@/lib/useAchievementCheck';
import { AntiBanGuidePage } from '@/components/AntiBanGuidePage';
import { WinningArticlesPage } from '@/components/WinningArticlesPage';
import { AdminPage } from '@/components/AdminPage';

type Page = 'home' | 'sales' | 'inventory' | 'profile' | 'invoices' | 'achievements' | 'antiban' | 'winners' | 'admin';
type MenuItem = { label: string; icon: typeof Home; page?: Page };

type InventoryItem = {
  id: string;
  name: string;
  size: string;
  cost_price: number;
  sale_price: number;
  quantity: number;
  qty_available: number;
  qty_published: number;
  qty_reserved: number;
  batch_number: string | null;
  image_path: string | null;
  image_data: string | null;
  created_at: string;
};

type Sale = {
  id: string;
  inventory_item_id: string | null;
  item_name: string;
  item_size: string;
  cost_price: number;
  sale_price: number;
  batch_number: string | null;
  sold_at: string;
};

type ProductForm = {
  name: string;
  size: string;
  costPrice: string;
  salePrice: string;
  quantity: string;
  batchNumber: string;
  photo: File | null;
  photoData: string;
};

const menuItems: MenuItem[] = [
  { label: 'Inicio', icon: Home, page: 'home' },
  { label: 'Inventario Inteligente', icon: Package, page: 'inventory' },
  { label: 'Ventas', icon: WalletCards, page: 'sales' },
  { label: 'Artículos Ganadores', icon: Trophy, page: 'winners' },
  { label: 'Etiquetas', icon: Tag },
  { label: 'Logros', icon: Gift, page: 'achievements' },
  { label: 'Perfil', icon: UserRound, page: 'profile' },
  { label: 'Guía Anti-Baneo', icon: Lightbulb, page: 'antiban' },
  { label: 'Facturas y Declaración', icon: FileText, page: 'invoices' },
  { label: 'Administrador', icon: Settings, page: 'admin' },
];

const INVENTORY_STORAGE_KEY = 'resellingx-inventory';
const RECENT_SEARCHES_KEY = 'resellingx-recent-searches';
const emptyForm: ProductForm = { name: '', size: '', costPrice: '', salePrice: '', quantity: '1', batchNumber: '', photo: null, photoData: '' };
const INV_SELECT = 'id, name, size, cost_price, sale_price, quantity, qty_available, qty_published, qty_reserved, batch_number, image_path, image_data, created_at';
const SALE_SELECT = 'id, inventory_item_id, item_name, item_size, cost_price, sale_price, batch_number, sold_at';

function readLocalInventory(): InventoryItem[] {
  try { return JSON.parse(localStorage.getItem(INVENTORY_STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveLocalInventory(items: InventoryItem[]) {
  try { localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items)); } catch { /* noop */ }
}
function readRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]'); } catch { return []; }
}
function saveRecentSearch(term: string) {
  if (term.length < 3) return;
  const list = readRecentSearches().filter((s) => s !== term);
  list.unshift(term);
  try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list.slice(0, 5))); } catch { /* noop */ }
}

function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('bad'));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getWeekDays(): { label: string; dateStr: string; iso: string }[] {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: DAY_NAMES_SHORT[i],
      dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
      iso: d.toISOString().slice(0, 10),
    };
  });
}

function Brand() {
  return <img className="brand-image" src="/Screenshot_20260907_081650_ResellingX.jpg" alt="ResellingX" decoding="async" />;
}

function StatCard({ value, label, icon: Icon, tone, hidden }: { value: string; label: string; icon: typeof CircleDollarSign; tone: 'green' | 'yellow'; hidden: boolean }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <div className={`stat-value ${tone}`}>{hidden ? '****' : value}</div>
        <div className="stat-icon-wrap"><Icon size={18} strokeWidth={1.5} /></div>
      </div>
      <div className="stat-label">{label}</div>
    </article>
  );
}

function GoalModal({ goal, close, save }: { goal: number; close: () => void; save: (v: number) => void }) {
  const [value, setValue] = useState(String(goal));
  const submit = () => { const p = parseInt(value, 10); if (!Number.isNaN(p) && p > 0) save(p); };
  return (
    <div className="modal-layer" onClick={close}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Editar objetivo del mes</h3>
        <p className="modal-hint">Introduce la nueva cifra objetivo (€)</p>
        <div className="modal-input-wrap">
          <input type="number" className="modal-input" value={value} min={1} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} autoFocus />
          <span className="modal-euro">€</span>
        </div>
        <div className="modal-actions">
          <button className="modal-cancel" onClick={close}>Cancelar</button>
          <button className="modal-save" onClick={submit}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Batch dropdown ─── */

function BatchDropdown({ batches, selected, onChange }: { batches: string[]; selected: string; onChange: (b: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="batch-dropdown-wrap">
      <button className="order-button" onClick={() => setOpen(!open)}>
        <Package size={18} />
        <span>{selected || 'Todos'}</span>
        <ChevronDown size={14} className={open ? 'rotate' : ''} />
      </button>
      {open && (
        <div className="batch-dropdown">
          <button onClick={() => { onChange(''); setOpen(false); }} className={!selected ? 'active' : ''}>Todos los pedidos</button>
          {batches.map((b) => (
            <button key={b} onClick={() => { onChange(b); setOpen(false); }} className={selected === b ? 'active' : ''}>{b}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function UnifiedFilter({ batches, batchFilter, setBatchFilter, timeRange, setTimeRange }: {
  batches: string[]; batchFilter: string; setBatchFilter: (b: string) => void;
  timeRange: DashTimeRange; setTimeRange: (r: DashTimeRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasFilter = batchFilter || timeRange !== 'Este mes';
  return (
    <div className="unified-filter-wrap">
      <button className={`unified-filter-btn${hasFilter ? ' active' : ''}`} onClick={() => setOpen(!open)}>
        <SlidersHorizontal size={16} />
        <span>Filtros</span>
        {hasFilter && <span className="unified-dot" />}
        <ChevronDown size={14} className={open ? 'rotate' : ''} />
      </button>
      {open && (
        <>
          <div className="unified-backdrop" onClick={() => setOpen(false)} />
          <div className="unified-popover">
            <div className="unified-section">
              <span className="unified-label">Periodo</span>
              <div className="unified-options">
                {(['Hoy', 'Esta semana', 'Este mes', 'Histórico'] as DashTimeRange[]).map((r) => (
                  <button key={r} className={timeRange === r ? 'selected' : ''} onClick={() => setTimeRange(r)}>{r}</button>
                ))}
              </div>
            </div>
            <div className="unified-divider" />
            <div className="unified-section">
              <span className="unified-label">Pedido / Lote</span>
              <div className="unified-options">
                <button className={!batchFilter ? 'selected' : ''} onClick={() => setBatchFilter('')}>Todos</button>
                {batches.map((b) => (
                  <button key={b} className={batchFilter === b ? 'selected' : ''} onClick={() => setBatchFilter(b)}>{b}</button>
                ))}
              </div>
            </div>
            {hasFilter && (
              <button className="unified-clear" onClick={() => { setBatchFilter(''); setTimeRange('Este mes'); setOpen(false); }}>
                <X size={14} /> Limpiar filtros
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Dashboard data ─── */

type DashTimeRange = 'Hoy' | 'Esta semana' | 'Este mes' | 'Histórico';

function getTimeRangeStart(r: DashTimeRange): string | null {
  const now = new Date();
  if (r === 'Hoy') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  if (r === 'Esta semana') {
    const dow = (now.getDay() + 6) % 7;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow).toISOString();
  }
  if (r === 'Este mes') return getMonthStart();
  return null;
}

function useDashboardData(batchFilter: string, timeRange: DashTimeRange) {
  const [investment, setInvestment] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [profit, setProfit] = useState(0);
  const [soldCount, setSoldCount] = useState(0);
  const [batches, setBatches] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const rangeStart = getTimeRangeStart(timeRange);
      let salesQuery = supabase.from('sales').select('cost_price, sale_price, batch_number, sold_at');
      if (rangeStart) salesQuery = salesQuery.gte('sold_at', rangeStart);

      const [invResult, salesResult, allSalesResult] = await Promise.all([
        supabase.from('inventory_items').select('cost_price, quantity, batch_number'),
        salesQuery,
        supabase.from('sales').select('cost_price, batch_number'),
      ]);
      if (!mounted) return;

      const invRows = invResult.data ?? [];
      const allSalesRows = allSalesResult.data ?? [];
      const batchSources = [...invRows.map((r) => r.batch_number), ...allSalesRows.map((r) => r.batch_number)];
      setBatches(([...new Set(batchSources.filter(Boolean))] as string[]).sort());

      const filteredInv = batchFilter ? invRows.filter((r) => r.batch_number === batchFilter) : invRows;
      const invCost = filteredInv.reduce((s, r) => s + r.cost_price * r.quantity, 0);
      const filteredAllSales = batchFilter ? allSalesRows.filter((r) => r.batch_number === batchFilter) : allSalesRows;
      const soldCost = filteredAllSales.reduce((s, r) => s + r.cost_price, 0);
      setInvestment(invCost + soldCost);

      const salesRows = salesResult.data ?? [];
      const filteredSales = batchFilter ? salesRows.filter((r) => r.batch_number === batchFilter) : salesRows;
      setRevenue(filteredSales.reduce((s, r) => s + r.sale_price, 0));
      setProfit(filteredSales.reduce((s, r) => s + (r.sale_price - r.cost_price), 0));
      setSoldCount(filteredSales.length);
    };
    void load();
    return () => { mounted = false; };
  }, [batchFilter, timeRange]);

  return { investment, revenue, profit, soldCount, batches };
}

function useHomeInventory(): InventoryItem[] {
  const [items, setItems] = useState<InventoryItem[]>([]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const result = await supabase.from('inventory_items').select(INV_SELECT).order('created_at', { ascending: false }).limit(20);
      if (mounted && !result.error) setItems((result.data ?? []) as InventoryItem[]);
    };
    void load();
    return () => { mounted = false; };
  }, []);
  return items;
}

/* ─── Home Page ─── */

function HomePage({ openMenu, setPage }: { openMenu: () => void; setPage: (p: Page) => void }) {
  const [goal, setGoal] = useState(() => {
    try { return parseInt(localStorage.getItem('resellingx-goal') ?? '500', 10) || 500; } catch { return 500; }
  });
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [hidden, setHidden] = useState(() => isPrivacyHidden());
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [batchFilter, setBatchFilter] = useState('');
  const [timeRange, setTimeRange] = useState<DashTimeRange>('Este mes');
  const { investment, revenue, profit, soldCount, batches } = useDashboardData(batchFilter, timeRange);
  const inventoryItems = useHomeInventory();
  const progress = goal > 0 ? Math.min(100, Math.round((revenue / goal) * 100)) : 0;
  const restante = Math.max(0, goal - revenue);

  const saveGoal = (v: number) => {
    setGoal(v);
    try { localStorage.setItem('resellingx-goal', String(v)); } catch { /* noop */ }
    setGoalModalOpen(false);
  };

  const togglePrivacy = () => {
    if (!hidden) { setHidden(true); setPrivacyHidden(true); }
    else setPinModalOpen(true);
  };

  const handlePinUnlock = (pin: string): boolean | void => {
    if (!verifyPin(pin)) return false;
    setHidden(false); setPrivacyHidden(false); setPinModalOpen(false);
  };

  return (
    <main className="page-shell home-page">
      <header className="home-header">
        <Brand />
        <div className="quick-actions">
          <button className="menu-button" onClick={openMenu}><Menu size={22} /> Menú</button>
          <UnifiedFilter
            batches={batches}
            batchFilter={batchFilter}
            setBatchFilter={setBatchFilter}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
          />
          <button className={`eye-button${hidden ? ' eye-hidden' : ''}`} onClick={togglePrivacy} aria-label="Mostrar u ocultar datos">
            {hidden ? <EyeOff size={24} /> : <Eye size={24} />}
          </button>
        </div>
      </header>

      <section className="stats-grid" aria-label="Resumen financiero">
        <StatCard value={`${Math.round(investment)}€`} label="Inversión" icon={CircleDollarSign} tone="green" hidden={hidden} />
        <StatCard value={`${Math.round(revenue)}€`} label="Facturación" icon={BarChart3} tone="yellow" hidden={hidden} />
        <StatCard value={`${Math.round(profit)}€`} label="Beneficio" icon={BadgeEuro} tone="green" hidden={hidden} />
        <StatCard value={String(soldCount)} label="Zapas vendidas" icon={ShoppingBag} tone="yellow" hidden={hidden} />
      </section>
      <section className="goal-card">
        <div className="goal-heading">
          <span><span className="target-mark">◉</span> Objetivo del mes: {hidden ? '****' : `${goal}€`}</span>
          <button className="gear-button" onClick={() => setGoalModalOpen(true)} aria-label="Editar objetivo"><Settings size={20} /></button>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        <div className="goal-meta">
          <strong>{hidden ? '**' : `${progress}%`}</strong>
          <span>{hidden ? 'Datos ocultos' : `Llevas ${Math.round(revenue)}€ · Te faltan ${Math.round(restante)}€`}</span>
        </div>
      </section>

      <section className="inventory-section">
        <div className="inv-section-header">
          <h2>Mi inventario</h2>
          {inventoryItems.length > 0 && (
            <button className="inv-section-link" onClick={() => setPage('inventory')}>Ver todo <ChevronRight size={14} /></button>
          )}
        </div>
        {inventoryItems.length > 0 ? (
          <div className="carousel-track">
            {inventoryItems.map((item) => (
              <button className="carousel-card" key={item.id} onClick={() => setPage('inventory')}>
                {item.image_data ? (
                  <img className="carousel-thumb" src={item.image_data} alt={item.name} />
                ) : (
                  <div className="carousel-placeholder"><Package size={24} /></div>
                )}
                <span className="carousel-name">{item.name}</span>
                <span className="carousel-meta">T{item.size} · {item.quantity} {item.quantity === 1 ? 'par' : 'pares'}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-inventory"><Package size={32} /><p>Aún no has añadido zapatillas.</p></div>
        )}
      </section>

      <button className="floating-sales" onClick={() => setPage('sales')}><WalletCards size={18} /> Ver ventas</button>
      {goalModalOpen && <GoalModal goal={goal} close={() => setGoalModalOpen(false)} save={saveGoal} />}
      {pinModalOpen && <PinPadModal title="Introduce tu PIN para desbloquear" close={() => setPinModalOpen(false)} onSubmit={handlePinUnlock} />}
    </main>
  );
}

/* ─── Sales Page (chart + history) ─── */

type SalesRange = 'Día' | 'Semana' | 'Mes';

function SalesPage({ openMenu }: { openMenu: () => void }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<SalesRange>('Día');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [batchFilter, setBatchFilter] = useState('');
  const [batchDropOpen, setBatchDropOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const result = await supabase.from('sales').select(SALE_SELECT).order('sold_at', { ascending: false }).limit(200);
      if (mounted && !result.error) setSales((result.data ?? []) as Sale[]);
      if (mounted) setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const weekDays = useMemo(getWeekDays, []);
  const todayIso = new Date().toISOString().slice(0, 10);

  const chartSales = useMemo(() => batchFilter ? sales.filter((s) => s.batch_number === batchFilter) : sales, [sales, batchFilter]);

  const chartData = useMemo(() => {
    if (range === 'Día') {
      return weekDays.map(({ label, dateStr, iso }) => {
        const count = chartSales.filter((s) => s.sold_at.slice(0, 10) === iso).length;
        return { label, sub: dateStr, count, active: iso === todayIso };
      });
    }
    if (range === 'Semana') {
      const weeks: { label: string; sub: string; count: number; active: boolean }[] = [];
      const now = new Date();
      for (let i = 3; i >= 0; i--) {
        const wEnd = new Date(now);
        wEnd.setDate(now.getDate() - i * 7);
        const wStart = new Date(wEnd);
        wStart.setDate(wEnd.getDate() - 6);
        const startIso = wStart.toISOString().slice(0, 10);
        const endIso = wEnd.toISOString().slice(0, 10);
        const count = chartSales.filter((s) => { const d = s.sold_at.slice(0, 10); return d >= startIso && d <= endIso; }).length;
        weeks.push({ label: `S${4 - i}`, sub: `${wStart.getDate()}/${wStart.getMonth() + 1}`, count, active: i === 0 });
      }
      return weeks;
    }
    // Mes
    const months: { label: string; sub: string; count: number; active: boolean }[] = [];
    const now = new Date();
    const mNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = m.getFullYear();
      const mo = m.getMonth();
      const count = chartSales.filter((s) => { const d = new Date(s.sold_at); return d.getFullYear() === yr && d.getMonth() === mo; }).length;
      months.push({ label: mNames[mo], sub: String(yr), count, active: i === 0 });
    }
    return months;
  }, [chartSales, range, weekDays, todayIso]);

  const maxCount = Math.max(1, ...chartData.map((d) => d.count));

  return (
    <main className="page-shell sales-page">
      <header className="sales-header">
        <button className="icon-button" onClick={openMenu} aria-label="Abrir menú"><Menu size={26} /></button>
        <h1>Mis Ventas</h1>
        <div className="header-spacer" />
      </header>

      {/* Batch filter for sales */}
      {!loading && (() => {
        const allBatches = [...new Set(sales.map((s) => s.batch_number).filter(Boolean))] as string[];
        if (allBatches.length === 0) return null;
        return (
          <div className="sales-batch-filter">
            <div className="inv-size-filter-wrap">
              <button className="inv-size-filter-btn" onClick={() => setBatchDropOpen(!batchDropOpen)}>
                <Package size={14} /><span>{batchFilter || 'Todos los pedidos'}</span><ChevronDown size={12} className={batchDropOpen ? 'rotate' : ''} />
              </button>
              {batchDropOpen && (
                <div className="inv-size-dropdown">
                  <button onClick={() => { setBatchFilter(''); setBatchDropOpen(false); }} className={!batchFilter ? 'active' : ''}>Todos</button>
                  {allBatches.map((b) => <button key={b} onClick={() => { setBatchFilter(b); setBatchDropOpen(false); }} className={batchFilter === b ? 'active' : ''}>{b}</button>)}
                </div>
              )}
            </div>
            {batchFilter && <span className="batch-active-tag">Filtrando: <strong>{batchFilter}</strong><button onClick={() => setBatchFilter('')}><X size={12} /></button></span>}
          </div>
        );
      })()}

      {/* Metrics summary */}
      {!loading && sales.length > 0 && (() => {
        const filteredForMetrics = sales.filter((s) => {
          if (batchFilter && s.batch_number !== batchFilter) return false;
          const d = s.sold_at.slice(0, 10);
          if (range === 'Día') return weekDays.some((w) => w.iso === d);
          if (range === 'Semana') { const ms = getMonthStart().slice(0, 10); return d >= ms; }
          return true;
        });
        const totalRev = filteredForMetrics.reduce((acc, s) => acc + s.sale_price, 0);
        const totalProfit = filteredForMetrics.reduce((acc, s) => acc + (s.sale_price - s.cost_price), 0);
        return (
          <div className="sales-metrics">
            <div className="sales-metric-card"><span className="sales-metric-value accent">{Math.round(totalRev)}€</span><span className="sales-metric-label">Facturación</span></div>
            <div className="sales-metric-card"><span className={`sales-metric-value ${totalProfit >= 0 ? 'accent' : 'danger'}`}>{totalProfit >= 0 ? '+' : ''}{Math.round(totalProfit)}€</span><span className="sales-metric-label">Beneficio</span></div>
            <div className="sales-metric-card"><span className="sales-metric-value">{filteredForMetrics.length}</span><span className="sales-metric-label">Unidades</span></div>
          </div>
        );
      })()}

      <div className="range-tabs" role="tablist">
        {(['Día', 'Semana', 'Mes'] as SalesRange[]).map((r) => (
          <button key={r} className={range === r ? 'selected' : ''} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>

      <section className="chart-card">
        <h2>Ventas por {range === 'Día' ? 'día' : range === 'Semana' ? 'semana' : 'mes'}</h2>
        <div className="bar-chart" style={{ gridTemplateColumns: `repeat(${chartData.length}, 1fr)` }}>
          {chartData.map(({ label, sub, count, active }) => (
            <div className="bar-column" key={label + sub}>
              <b className={active ? 'bar-count-active' : ''}>{count}</b>
              <div className="bar-track">
                <div className={`bar-fill ${active ? 'bar-active' : ''}`} style={{ height: `${Math.max(4, (count / maxCount) * 100)}%` }} />
              </div>
              <strong className={active ? 'bar-label-active' : ''}>{label}</strong>
              <small>{sub}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="filter-wrap">
        <button className="filter-button" onClick={() => setFilterOpen(!filterOpen)}>
          <Filter size={18} /><span>{statusFilter}</span><ChevronDown size={16} className={filterOpen ? 'rotate' : ''} />
        </button>
        {filterOpen && (
          <div className="filter-menu">
            {['Todos', 'Hoy', 'Esta semana', 'Este mes'].map((f) => (
              <button key={f} onClick={() => { setStatusFilter(f); setFilterOpen(false); }}>{f}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-state"><LoaderCircle className="spin" size={30} /><p>Cargando ventas...</p></div>
      ) : sales.length === 0 ? (
        <div className="empty-sales"><BarChart3 size={32} /><p>Aún no hay ventas registradas.</p></div>
      ) : (
        <section className="sales-list">
          {sales.filter((s) => {
            if (batchFilter && s.batch_number !== batchFilter) return false;
            if (statusFilter === 'Todos') return true;
            const d = s.sold_at.slice(0, 10);
            if (statusFilter === 'Hoy') return d === todayIso;
            if (statusFilter === 'Esta semana') return weekDays.some((w) => w.iso === d);
            if (statusFilter === 'Este mes') { const ms = getMonthStart().slice(0, 10); return d >= ms; }
            return true;
          }).map((s) => {
            const p = s.sale_price - s.cost_price;
            return (
              <div className="sale-row" key={s.id}>
                <div className="sale-row-info">
                  <span className="sale-row-name">{s.item_name}</span>
                  <span className="sale-row-meta">T{s.item_size} · {new Date(s.sold_at).toLocaleDateString('es-ES')}{s.batch_number ? ` · ${s.batch_number}` : ''}</span>
                </div>
                <div className="sale-row-numbers">
                  <span className="sale-row-price">{s.sale_price}€</span>
                  <span className={`sale-row-profit ${p >= 0 ? 'positive' : 'negative'}`}>{p >= 0 ? '+' : ''}{p}€</span>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}

/* ─── Product Add Modal ─── */

function ProductModal({ close, onCreated }: { close: () => void; onCreated: (item: InventoryItem) => void }) {
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);

  const update = (field: keyof ProductForm, value: string | File | null) => setForm((c) => ({ ...c, [field]: value }));

  const handlePhoto = async (file: File | null) => {
    if (!file) { setForm((c) => ({ ...c, photo: null, photoData: '' })); return; }
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { setForm((c) => ({ ...c, photo: null, photoData: '' })); return; }
    try { const d = await readImageAsDataUrl(file); setForm((c) => ({ ...c, photo: file, photoData: d })); } catch { setForm((c) => ({ ...c, photo: null, photoData: '' })); }
  };

  const parseVoiceInput = (transcript: string) => {
    const text = transcript.trim();
    const wordNums: Record<string, string> = { un: '1', uno: '1', una: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10' };
    const sizeMatch = text.match(/\btalla\s*([0-9]{2}(?:[.,]5)?)\b/i) ?? text.match(/(?<![\d.,])(?:3[5-9]|4[0-9]|50)(?:[.,]5)?(?![\d.,])/);
    const qtyMatch = text.match(/(\d+|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:par(?:es)?|unidad(?:es)?|de\s+stock)/i);
    const batchFull = text.match(/(?:pedido|lote)\s+(?:de\s+)?(?:n[uú]mero\s+|#)?((?:importaci[oó]n|\d+)(?:\s+\w+)*)/i);
    let batch = '';
    if (batchFull) {
      const raw = batchFull[1].replace(/\s+(me\s+cost|coste|costo|compr|vendo|pvp|precio|talla|par(?:es)?|unidad).*/i, '').trim();
      batch = /^\d+$/.test(raw) ? `Pedido #${raw}` : raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    const batchNum = batchFull?.[1].match(/^\d+/)?.[0];
    const usedNums = new Set([sizeMatch?.[1], qtyMatch?.[1], batchNum].filter(Boolean));
    const numbers = Array.from(text.matchAll(/\d+(?:[.,]\d+)?/g)).map((m) => m[0].replace(',', '.')).filter((v) => !usedNums.has(v));
    const costMatch = text.match(/(?:me\s+cost(?:[oó]|aron)|coste|costo|compr[eé]\s+por|precio\s+de\s+compra)\s*:?\s*(\d+(?:[.,]\d+)?)/i);
    const saleMatch = text.match(/(?:las\s+)?vendo\s+(?:a|por)?\s*:?\s*(\d+(?:[.,]\d+)?)|pvp\s*:?\s*(\d+(?:[.,]\d+)?)|precio\s+de\s+venta\s*:?\s*(\d+(?:[.,]\d+)?)/i);
    const nameMatch = text.match(/^(.+?)\s+talla\s+[0-9]{2}/i);
    let cleanedName = (nameMatch?.[1] ?? text);
    cleanedName = cleanedName.replace(/\s+(?:me\s+cost(?:[oó]|aron)|coste|costo|compr[eé]\s+por|las\s+vendo|vendo|pvp|precio\s+de|\d+\s+par|\d+\s+unidad)\b.*$/i, '');
    cleanedName = cleanedName.replace(/\s+(?:pedido|lote)\b.*$/i, '').trim();
    const cost = costMatch?.[1]?.replace(',', '.') ?? numbers[0] ?? '';
    const sale = saleMatch?.[1]?.replace(',', '.') ?? saleMatch?.[2]?.replace(',', '.') ?? saleMatch?.[3]?.replace(',', '.') ?? numbers[1] ?? '';
    let qty = '';
    if (qtyMatch) { const raw = qtyMatch[1].toLowerCase(); qty = wordNums[raw] ?? raw; }
    setForm((c) => ({ ...c, name: cleanedName || c.name, size: sizeMatch?.[1] || c.size, costPrice: cost || c.costPrice, salePrice: sale || c.salePrice, quantity: qty || c.quantity, batchNumber: batch || c.batchNumber }));
  };

  const handleVoice = () => {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) { alert('Reconocimiento de voz no soportado en este navegador.'); return; }
    const recognition = new (SR as { new(): SpeechRecognition })();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => { parseVoiceInput(e.results[0][0].transcript); setListening(false); };
    recognition.onerror = (e: { error: string }) => {
      setListening(false);
      if (e.error === 'not-allowed') alert('Abre la aplicación en una pestaña independiente para activar el micrófono.');
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const save = async () => {
    if (!form.name.trim() || !form.size.trim() || !form.costPrice || !form.salePrice) return;
    const cost = Number(form.costPrice);
    const sale = Number(form.salePrice);
    const qty = Math.max(1, parseInt(form.quantity, 10) || 1);
    if (!Number.isFinite(cost) || !Number.isFinite(sale) || cost < 0 || sale < 0) return;
    setSaving(true);
    const imageData = form.photoData || null;
    const batchNum = form.batchNumber.trim() || null;
    const row = { name: form.name.trim(), size: form.size.trim(), cost_price: cost, sale_price: sale, quantity: qty, qty_available: qty, qty_published: 0, qty_reserved: 0, batch_number: batchNum, image_path: null as string | null, image_data: imageData };
    const localItem: InventoryItem = { id: crypto.randomUUID(), ...row, created_at: new Date().toISOString() };
    try {
      const result = await supabase.from('inventory_items').insert(row).select(INV_SELECT).maybeSingle();
      if (result.error || !result.data) throw result.error ?? new Error('Missing');
      const saved = result.data as InventoryItem;
      const local = readLocalInventory().filter((i) => i.id !== saved.id);
      saveLocalInventory([saved, ...local]);
      onCreated(saved);
    } catch {
      const local = readLocalInventory();
      saveLocalInventory([localItem, ...local]);
      onCreated(localItem);
    }
    setForm(emptyForm);
    setSaving(false);
    close();
  };

  const photoLabel = form.photoData ? (form.photo?.name ?? 'Foto subida') : 'Subir foto';

  return (
    <div className="modal-layer" onClick={close}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        <div className="product-modal-header">
          <div>
            <span className="eyebrow">NUEVO ARTÍCULO</span>
            <h2>Añadir zapatilla</h2>
          </div>
          <button className="close-button" onClick={close} aria-label="Cerrar"><X size={26} /></button>
        </div>
        <div className={`smart-voice${listening ? ' smart-voice-active' : ''}`}>
          <div>
            <Mic size={19} />
            <span>
              <strong>Entrada inteligente</strong>
              <small>{listening ? 'Escuchando... Habla ahora' : 'Di los datos en una frase'}</small>
            </span>
          </div>
          <button className={listening ? 'listening' : ''} onClick={handleVoice} aria-label="Dictar datos"><Mic size={21} /></button>
        </div>
        {listening && <p className="voice-listening-banner">Escuchando... Habla ahora (Nombre, Talla, Coste, PVP)</p>}
        <div className="product-form">
          <label>
            Nombre de la zapatilla
            <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Ej. Jordan 4 Black Cat" />
          </label>
          <div className="form-row">
            <label>Talla<input value={form.size} onChange={(e) => update('size', e.target.value)} placeholder="42" /></label>
            <label>Precio de coste (€)<input type="number" min="0" value={form.costPrice} onChange={(e) => update('costPrice', e.target.value)} placeholder="150" /></label>
          </div>
          <div className="form-row">
            <label>PVP (€)<input type="number" min="0" value={form.salePrice} onChange={(e) => update('salePrice', e.target.value)} placeholder="230" /></label>
            <label>Pares<input type="number" min="1" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} placeholder="1" /></label>
          </div>
          <label>
            Nº Pedido / Lote (opcional)
            <input value={form.batchNumber} onChange={(e) => update('batchNumber', e.target.value)} placeholder="Ej. Pedido #1" />
          </label>
          <label className="photo-upload">
            Foto (opcional)
            <input type="file" accept="image/*" onChange={(e) => { void handlePhoto(e.target.files?.[0] ?? null); }} />
            <span><ImagePlus size={23} />{photoLabel}</span>
          </label>
          {form.photoData && (
            <div className="photo-preview">
              <img src={form.photoData} alt="Vista previa" />
              <span className="photo-preview-tag">Subida</span>
            </div>
          )}
        </div>
        <div className="product-modal-actions">
          <button className="modal-cancel" onClick={close}>Cancelar</button>
          <button className="modal-save" onClick={save} disabled={saving}>
            {saving ? <LoaderCircle className="spin" size={19} /> : <Save size={19} />}
            {saving ? 'Guardando...' : 'Guardar zapatilla'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sell Modal ─── */

function SellModal({ item, close, onSold }: { item: InventoryItem; close: () => void; onSold: (updated: InventoryItem, sale: Sale) => void }) {
  const [price, setPrice] = useState(String(item.sale_price));
  const [saving, setSaving] = useState(false);
  const totalActive = item.qty_available + item.qty_published + item.qty_reserved;

  const sell = async () => {
    const sp = Number(price);
    if (!Number.isFinite(sp) || sp < 0) return;
    setSaving(true);

    const newAvail = Math.max(0, item.qty_available - (item.qty_available > 0 ? 1 : 0));
    const newPub = item.qty_available > 0 ? item.qty_published : Math.max(0, item.qty_published - (item.qty_published > 0 ? 1 : 0));
    const newRes = (item.qty_available > 0 || item.qty_published > 0) ? item.qty_reserved : Math.max(0, item.qty_reserved - 1);
    const newQty = Math.max(0, item.quantity - 1);

    const saleRow = { inventory_item_id: item.id, item_name: item.name, item_size: item.size, cost_price: item.cost_price, sale_price: sp, batch_number: item.batch_number };
    const saleResult = await supabase.from('sales').insert(saleRow).select(SALE_SELECT).maybeSingle();
    if (saleResult.error) { setSaving(false); return; }

    const updResult = await supabase.from('inventory_items').update({ quantity: newQty, qty_available: newAvail, qty_published: newPub, qty_reserved: newRes }).eq('id', item.id).select(INV_SELECT).maybeSingle();

    if (!updResult.error && updResult.data) {
      onSold(updResult.data as InventoryItem, saleResult.data as Sale);
    }
    setSaving(false);
    close();
  };

  return (
    <div className="modal-layer" onClick={close}>
      <div className="modal-card sell-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Vender 1 par</h3>
        <p className="modal-hint">{item.name} · T{item.size}</p>
        {totalActive <= 0 && <p className="form-error">No quedan unidades para vender.</p>}
        <label className="sell-label">
          Precio final de venta (€)
          <div className="modal-input-wrap">
            <input type="number" className="modal-input" value={price} min={0} onChange={(e) => setPrice(e.target.value)} autoFocus />
            <span className="modal-euro">€</span>
          </div>
        </label>
        <div className="modal-actions">
          <button className="modal-cancel" onClick={close}>Cancelar</button>
          <button className="modal-save" onClick={sell} disabled={saving || totalActive <= 0}>
            {saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
            {saving ? 'Vendiendo...' : 'Confirmar venta'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Item Detail Modal ─── */

function ItemDetailModal({ item, close, onUpdate, onDelete, onSaleCompleted }: {
  item: InventoryItem;
  close: () => void;
  onUpdate: (updated: InventoryItem) => void;
  onDelete: (id: string) => void;
  onSaleCompleted?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [size, setSize] = useState(item.size);
  const [costPrice, setCostPrice] = useState(String(item.cost_price));
  const [salePrice, setSalePrice] = useState(String(item.sale_price));
  const [batchNum, setBatchNum] = useState(item.batch_number ?? '');
  const [avail, setAvail] = useState(item.qty_available);
  const [pub, setPub] = useState(item.qty_published);
  const [res, setRes] = useState(item.qty_reserved);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setAvail(item.qty_available);
    setPub(item.qty_published);
    setRes(item.qty_reserved);
  }, [item.qty_available, item.qty_published, item.qty_reserved]);

  const benefit = item.sale_price - item.cost_price;
  const margin = item.cost_price > 0 ? Math.round((benefit / item.cost_price) * 100) : 0;
  const liveTotal = avail + pub + res;
  const totalInvLine = item.cost_price * liveTotal;

  const changeStatus = async (field: 'qty_available' | 'qty_published' | 'qty_reserved', delta: number) => {
    const vals = { qty_available: avail, qty_published: pub, qty_reserved: res };
    const next = Math.max(0, vals[field] + delta);
    if (field === 'qty_available') setAvail(next);
    if (field === 'qty_published') setPub(next);
    if (field === 'qty_reserved') setRes(next);
    const newTotal = (field === 'qty_available' ? next : avail) + (field === 'qty_published' ? next : pub) + (field === 'qty_reserved' ? next : res);
    const upd: Record<string, number> = { [field]: next, quantity: newTotal };
    const result = await supabase.from('inventory_items').update(upd).eq('id', item.id).select(INV_SELECT).maybeSingle();
    if (!result.error && result.data) onUpdate(result.data as InventoryItem);
  };

  const saveEdits = async () => {
    const c = Number(costPrice); const s = Number(salePrice);
    if (!name.trim() || !size.trim() || !Number.isFinite(c) || !Number.isFinite(s)) return;
    setSaving(true);
    const totalStatus = avail + pub + res;
    const qty = Math.max(totalStatus, 1);
    const result = await supabase.from('inventory_items').update({ name: name.trim(), size: size.trim(), cost_price: c, sale_price: s, quantity: qty, qty_available: avail, qty_published: pub, qty_reserved: res, batch_number: batchNum.trim() || null }).eq('id', item.id).select(INV_SELECT).maybeSingle();
    if (!result.error && result.data) { onUpdate(result.data as InventoryItem); setEditing(false); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta zapatilla del inventario?')) return;
    setDeleting(true);
    const result = await supabase.from('inventory_items').delete().eq('id', item.id);
    if (!result.error) { onDelete(item.id); close(); }
    setDeleting(false);
  };

  const handleSold = (updated: InventoryItem) => {
    onUpdate(updated);
    setSellOpen(false);
    onSaleCompleted?.();
  };

  return (
    <>
      <div className="modal-layer" onClick={close}>
        <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
          {item.image_data ? (
            <div className="detail-hero">
              <img src={item.image_data} alt={item.name} />
              <button className="detail-close" onClick={close}><X size={22} /></button>
            </div>
          ) : (
            <div className="detail-header-clean">
              <div>
                <span className="eyebrow">FICHA DEL PRODUCTO</span>
                <h2>{item.name}</h2>
              </div>
              <button className="close-button" onClick={close}><X size={26} /></button>
            </div>
          )}

          <div className="detail-body">
            {item.image_data && <h2 className="detail-title">{item.name}</h2>}
            {item.batch_number && <span className="detail-batch">{item.batch_number}</span>}

            {!editing ? (
              <>
                <div className="detail-stats">
                  <div className="detail-stat">
                    <span className="detail-stat-label">Talla</span>
                    <span className="detail-stat-value">{item.size}</span>
                  </div>
                  <div className="detail-stat">
                    <span className="detail-stat-label">Stock total</span>
                    <span className="detail-stat-value">{liveTotal}</span>
                  </div>
                </div>

                <div className="status-grid">
                  <StatusRow label="Disponibles" value={avail} onMinus={() => changeStatus('qty_available', -1)} onPlus={() => changeStatus('qty_available', 1)} />
                  <StatusRow label="Publicados" value={pub} onMinus={() => changeStatus('qty_published', -1)} onPlus={() => changeStatus('qty_published', 1)} />
                  <StatusRow label="Reservados" value={res} onMinus={() => changeStatus('qty_reserved', -1)} onPlus={() => changeStatus('qty_reserved', 1)} />
                </div>

                <div className="detail-finance">
                  <div className="finance-row"><span>Coste unitario</span><strong>{item.cost_price}€</strong></div>
                  <div className="finance-row"><span>PVP</span><strong>{item.sale_price}€</strong></div>
                  <div className="finance-row"><span>Inversión línea</span><strong>{totalInvLine}€</strong></div>
                  <div className="finance-divider" />
                  <div className="finance-row benefit-row"><span>Beneficio x par</span><strong className={benefit >= 0 ? 'positive' : 'negative'}>{benefit >= 0 ? '+' : ''}{benefit}€</strong></div>
                  <div className="finance-row"><span>Margen</span><strong className="margin-badge">{margin}%</strong></div>
                </div>

                <button className="sell-btn-main" onClick={() => setSellOpen(true)} disabled={item.quantity <= 0}>
                  <ShoppingBag size={18} /> Marcar 1 par como vendido
                </button>

                <div className="detail-actions">
                  <button className="detail-action-btn edit-btn" onClick={() => setEditing(true)}><Pencil size={17} /> Editar</button>
                  <button className="detail-action-btn delete-btn" onClick={handleDelete} disabled={deleting}><Trash2 size={17} /> {deleting ? 'Eliminando...' : 'Eliminar'}</button>
                </div>
              </>
            ) : (
              <div className="detail-edit-form">
                <label>Nombre<input value={name} onChange={(e) => setName(e.target.value)} /></label>
                <div className="form-row">
                  <label>Talla<input value={size} onChange={(e) => setSize(e.target.value)} /></label>
                  <label>Coste (€)<input type="number" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} /></label>
                </div>
                <div className="form-row">
                  <label>PVP (€)<input type="number" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} /></label>
                  <label>Nº Pedido<input value={batchNum} onChange={(e) => setBatchNum(e.target.value)} placeholder="Ej. Pedido #1" /></label>
                </div>
                <div className="detail-edit-actions">
                  <button className="modal-cancel" onClick={() => setEditing(false)}>Cancelar</button>
                  <button className="modal-save" onClick={saveEdits} disabled={saving}>
                    {saving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {sellOpen && <SellModal item={item} close={() => setSellOpen(false)} onSold={handleSold} />}
    </>
  );
}

function StatusRow({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="status-row">
      <span className="status-row-label">{label}</span>
      <div className="qty-control">
        <button onClick={onMinus} disabled={value <= 0}><Minus size={14} /></button>
        <span className="qty-value-sm">{value}</span>
        <button onClick={onPlus}><Plus size={14} /></button>
      </div>
    </div>
  );
}

/* ─── Inventory Page ─── */

function InventoryPage({ openMenu, onSaleCompleted }: { openMenu: () => void; onSaleCompleted?: () => void }) {
  const [items, setItems] = useState<InventoryItem[]>(() => readLocalInventory());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quickSelling, setQuickSelling] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readRecentSearches());
  const [searchFocused, setSearchFocused] = useState(false);
  const [sizeFilter, setSizeFilter] = useState('');
  const [sizeDropOpen, setSizeDropOpen] = useState(false);
  const [batchFilter, setBatchFilter] = useState('');
  const [batchDropOpen, setBatchDropOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const result = await supabase.from('inventory_items').select(INV_SELECT).order('created_at', { ascending: false });
      if (!mounted) return;
      if (result.error) setError('No se ha podido cargar el inventario.');
      else {
        const remote = (result.data ?? []) as InventoryItem[];
        const local = readLocalInventory();
        const merged = [...remote, ...local.filter((l) => !remote.some((r) => r.id === l.id))];
        setItems(merged);
        saveLocalInventory(merged);
      }
      setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const handleItemUpdate = useCallback((updated: InventoryItem) => {
    setItems((cur) => {
      const next = cur.map((i) => i.id === updated.id ? updated : i);
      saveLocalInventory(next);
      return next;
    });
    setSelectedItem(updated);
  }, []);

  const handleItemDelete = useCallback((id: string) => {
    setItems((cur) => {
      const next = cur.filter((i) => i.id !== id);
      saveLocalInventory(next);
      return next;
    });
  }, []);

  const handleSearchInput = (q: string) => {
    setSearchQuery(q);
  };

  const commitSearch = () => {
    if (searchQuery.trim().length >= 3) {
      saveRecentSearch(searchQuery.trim());
      setRecentSearches(readRecentSearches());
    }
  };

  const selectRecentSearch = (term: string) => {
    setSearchQuery(term);
    setSearchFocused(false);
  };

  const allSizes = [...new Set(items.map((i) => i.size))].sort();
  const allBatches = [...new Set(items.map((i) => i.batch_number).filter(Boolean))] as string[];

  const filtered = items.filter((i) => {
    if (i.quantity <= 0) return false;
    const matchSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSize = !sizeFilter || i.size === sizeFilter;
    const matchBatch = !batchFilter || i.batch_number === batchFilter;
    return matchSearch && matchSize && matchBatch;
  });

  const quickSell = async (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    const totalActive = item.qty_available + item.qty_published + item.qty_reserved;
    if (totalActive <= 0) return;
    setQuickSelling(item.id);
    const newAvail = Math.max(0, item.qty_available - (item.qty_available > 0 ? 1 : 0));
    const newPub = item.qty_available > 0 ? item.qty_published : Math.max(0, item.qty_published - (item.qty_published > 0 ? 1 : 0));
    const newRes = (item.qty_available > 0 || item.qty_published > 0) ? item.qty_reserved : Math.max(0, item.qty_reserved - 1);
    const newQty = Math.max(0, item.quantity - 1);
    const saleRow = { inventory_item_id: item.id, item_name: item.name, item_size: item.size, cost_price: item.cost_price, sale_price: item.sale_price, batch_number: item.batch_number };
    const saleResult = await supabase.from('sales').insert(saleRow).select(SALE_SELECT).maybeSingle();
    if (saleResult.error) { setQuickSelling(null); return; }
    const updResult = await supabase.from('inventory_items').update({ quantity: newQty, qty_available: newAvail, qty_published: newPub, qty_reserved: newRes }).eq('id', item.id).select(INV_SELECT).maybeSingle();
    if (!updResult.error && updResult.data) {
      const updated = updResult.data as InventoryItem;
      setItems((cur) => {
        const next = cur.map((i) => i.id === updated.id ? updated : i);
        saveLocalInventory(next);
        return next;
      });
    }
    setQuickSelling(null);
    onSaleCompleted?.();
  };

  return (
    <main className="page-shell inventory-page">
      <header className="inventory-header">
        <button className="icon-button" onClick={openMenu} aria-label="Abrir menú"><Menu size={26} /></button>
        <div><span className="eyebrow">GESTIÓN</span><h1>Inventario Inteligente</h1></div>
        <div className="header-spacer" />
      </header>

      {error && <p className="page-error">{error}</p>}

      {!loading && items.length > 0 && (
        <>
          {/* Row 1: search bar full width */}
          <div className="inv-search-wrap">
            <div className="inv-search-bar">
              <Search size={18} className="inv-search-icon" />
              <input
                type="text"
                placeholder="Buscar zapatilla..."
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => { setTimeout(() => setSearchFocused(false), 150); commitSearch(); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { commitSearch(); setSearchFocused(false); (e.target as HTMLInputElement).blur(); } }}
                className="inv-search-input"
              />
              {searchQuery && <button className="inv-search-clear" onClick={() => { setSearchQuery(''); }}><X size={16} /></button>}
            </div>
            {searchFocused && !searchQuery && recentSearches.length > 0 && (
              <div className="inv-search-dropdown">
                <span className="inv-search-dropdown-title">Búsquedas recientes</span>
                {recentSearches.map((t) => (
                  <button key={t} onMouseDown={() => selectRecentSearch(t)}>
                    <Search size={13} />{t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Row 2: filter buttons */}
          <div className="inv-filters-row">
            <div className="inv-size-filter-wrap">
              <button className="inv-size-filter-btn" onClick={() => { setSizeDropOpen(!sizeDropOpen); setBatchDropOpen(false); }}>
                <Filter size={14} /><span>{sizeFilter ? `T${sizeFilter}` : 'Talla'}</span><ChevronDown size={12} className={sizeDropOpen ? 'rotate' : ''} />
              </button>
              {sizeDropOpen && (
                <div className="inv-size-dropdown">
                  <button onClick={() => { setSizeFilter(''); setSizeDropOpen(false); }} className={!sizeFilter ? 'active' : ''}>Todas</button>
                  {allSizes.map((s) => <button key={s} onClick={() => { setSizeFilter(s); setSizeDropOpen(false); }} className={sizeFilter === s ? 'active' : ''}>T{s}</button>)}
                </div>
              )}
            </div>
            {allBatches.length > 0 && (
              <div className="inv-size-filter-wrap">
                <button className="inv-size-filter-btn" onClick={() => { setBatchDropOpen(!batchDropOpen); setSizeDropOpen(false); }}>
                  <Package size={14} /><span>{batchFilter || 'Pedido'}</span><ChevronDown size={12} className={batchDropOpen ? 'rotate' : ''} />
                </button>
                {batchDropOpen && (
                  <div className="inv-size-dropdown">
                    <button onClick={() => { setBatchFilter(''); setBatchDropOpen(false); }} className={!batchFilter ? 'active' : ''}>Todos</button>
                    {allBatches.map((b) => <button key={b} onClick={() => { setBatchFilter(b); setBatchDropOpen(false); }} className={batchFilter === b ? 'active' : ''}>{b}</button>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {loading ? (
        <div className="loading-state"><LoaderCircle className="spin" size={30} /><p>Cargando inventario...</p></div>
      ) : items.length === 0 ? (
        <div className="inventory-empty">
          <Package size={46} />
          <h2>Tu inventario está vacío</h2>
          <p>Añade tus primeras zapatillas para empezar a controlar tus compras y ventas.</p>
          <button className="empty-add" onClick={() => setAddModalOpen(true)}><Plus size={19} /> Añadir zapatilla</button>
        </div>
      ) : (
        <section className="inv-list">
          {filtered.length === 0 ? (
            <p className="inv-no-results">Sin resultados para esta búsqueda.</p>
          ) : filtered.map((item) => {
            const totalActive = item.qty_available + item.qty_published + item.qty_reserved;
            const isSelling = quickSelling === item.id;
            return (
              <div className="inv-row-v2" key={item.id}>
                <button className="inv-row-v2-main" onClick={() => setSelectedItem(item)}>
                  <div className="inv-row-left">
                    {item.image_data ? <Camera size={13} className="has-photo" /> : <span className="status-dot" />}
                    <div className="inv-row-name">
                      <span className="inv-row-title">{item.name}</span>
                      <span className="inv-row-size">T{item.size} · {item.cost_price}€→{item.sale_price}€{item.batch_number ? ` · ${item.batch_number}` : ''}</span>
                    </div>
                  </div>
                  <div className="inv-row-right">
                    <div className="inv-row-tags">
                      {item.qty_available > 0 && <span className="inv-tag">{item.qty_available} Disponible</span>}
                      {item.qty_published > 0 && <span className="inv-tag">{item.qty_published} Publicado</span>}
                      {item.qty_reserved > 0 && <span className="inv-tag">{item.qty_reserved} Reservado</span>}
                    </div>
                    <span className="inv-row-qty">{item.quantity}</span>
                  </div>
                </button>
                <button
                  className={`inv-quick-sell${totalActive <= 0 ? ' disabled' : ''}`}
                  disabled={totalActive <= 0 || isSelling}
                  onClick={(e) => { void quickSell(e, item); }}
                  title="Venta rápida"
                >
                  {isSelling ? <LoaderCircle className="spin" size={16} /> : <ShoppingBag size={16} />}
                </button>
              </div>
            );
          })}
        </section>
      )}

      {addModalOpen && <ProductModal close={() => setAddModalOpen(false)} onCreated={(item) => setItems((cur) => [item, ...cur])} />}
      {selectedItem && <ItemDetailModal item={selectedItem} close={() => setSelectedItem(null)} onUpdate={handleItemUpdate} onDelete={handleItemDelete} onSaleCompleted={onSaleCompleted} />}
      <button className="inventory-fab" onClick={() => setAddModalOpen(true)} aria-label="Añadir zapatilla"><Plus size={30} /></button>
    </main>
  );
}

/* ─── Drawer + App ─── */

function useVisibleMenuItems() {
  const { role } = useAuth();
  return useMemo(() => menuItems.filter((item) => {
    if (item.page === 'admin' && role !== 'admin') return false;
    return true;
  }), [role]);
}

function Sidebar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const { signOut, user } = useAuth();
  const items = useVisibleMenuItems();
  return (
    <aside className="sidebar">
      <div className="sidebar-top"><Brand /></div>
      <nav>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} className={item.page === page ? 'current' : ''} onClick={() => { if (item.page) setPage(item.page); }}>
              <Icon size={22} /><span>{item.label}</span>{item.page === page && <span className="current-dot" />}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-user">{user?.email}</div>
        <button className="sidebar-logout" onClick={() => void signOut()}><LogOut size={16} /> Cerrar sesión</button>
      </div>
    </aside>
  );
}

function MobileDrawer({ page, closeMenu, setPage }: { page: Page; closeMenu: () => void; setPage: (p: Page) => void }) {
  const { signOut, user } = useAuth();
  const items = useVisibleMenuItems();
  const navigate = (item: MenuItem) => { if (item.page) { setPage(item.page); closeMenu(); } };
  return (
    <div className="drawer-layer" onClick={closeMenu}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-top">
          <Brand />
          <button className="close-button" onClick={closeMenu} aria-label="Cerrar menú"><X size={30} /></button>
        </div>
        <nav>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} className={item.page === page ? 'current' : ''} onClick={() => navigate(item)}>
                <Icon size={25} /><span>{item.label}</span>{item.page === page && <span className="current-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-user">{user?.email}</div>
          <button className="sidebar-logout" onClick={() => { void signOut(); closeMenu(); }}><LogOut size={16} /> Cerrar sesión</button>
        </div>
      </aside>
    </div>
  );
}

const TAB_ITEMS: { label: string; icon: typeof Home; page: Page }[] = [
  { label: 'Inicio', icon: Home, page: 'home' },
  { label: 'Inventario', icon: Package, page: 'inventory' },
  { label: 'Ventas', icon: WalletCards, page: 'sales' },
  { label: 'Logros', icon: Trophy, page: 'achievements' },
  { label: 'Perfil', icon: UserRound, page: 'profile' },
];

function BottomTabBar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  return (
    <nav className="bottom-tabs">
      {TAB_ITEMS.map((tab) => {
        const Icon = tab.icon;
        const active = tab.page === page;
        return (
          <button key={tab.page} className={`bottom-tab${active ? ' active' : ''}`} onClick={() => setPage(tab.page)}>
            <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function App() {
  const { session, loading, role } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [celebrationTitle, setCelebrationTitle] = useState('');
  const [saleKey, setSaleKey] = useState(0);

  const handleSaleCompleted = useCallback(() => setSaleKey((k) => k + 1), []);
  const handleAchievementUnlock = useCallback((name: string) => {
    setCelebrationTitle(name);
  }, []);

  useAchievementCheck(saleKey, handleAchievementUnlock);

  if (loading) return <div className="app-loading"><LoaderCircle className="spin" size={32} /><p>Cargando...</p></div>;
  if (!session) return <LoginPage />;

  const effectivePage = page === 'admin' && role !== 'admin' ? 'home' : page;

  return (
    <div className="app-shell">
      <Sidebar page={effectivePage} setPage={setPage} />
      <div className="app-content">
        {effectivePage === 'home' && <HomePage openMenu={() => setDrawerOpen(true)} setPage={setPage} />}
        {effectivePage === 'sales' && <SalesPage openMenu={() => setDrawerOpen(true)} />}
        {effectivePage === 'inventory' && <InventoryPage openMenu={() => setDrawerOpen(true)} onSaleCompleted={handleSaleCompleted} />}
        {effectivePage === 'profile' && <ProfilePage openMenu={() => setDrawerOpen(true)} />}
        {effectivePage === 'invoices' && <InvoicesPage openMenu={() => setDrawerOpen(true)} />}
        {effectivePage === 'achievements' && <AchievementsPage key={saleKey} openMenu={() => setDrawerOpen(true)} onUnlock={handleAchievementUnlock} />}
        {effectivePage === 'antiban' && <AntiBanGuidePage openMenu={() => setDrawerOpen(true)} />}
        {effectivePage === 'winners' && <WinningArticlesPage openMenu={() => setDrawerOpen(true)} />}
        {effectivePage === 'admin' && role === 'admin' && <AdminPage openMenu={() => setDrawerOpen(true)} />}
      </div>
      <BottomTabBar page={effectivePage} setPage={setPage} />
      {drawerOpen && <MobileDrawer page={effectivePage} closeMenu={() => setDrawerOpen(false)} setPage={setPage} />}
      {celebrationTitle && <CelebrationModal title={celebrationTitle} subtitle="Has desbloqueado un nuevo logro" onDone={() => setCelebrationTitle('')} />}
    </div>
  );
}

export default App;
