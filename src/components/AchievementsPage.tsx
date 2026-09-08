import { useEffect, useMemo, useState } from 'react';
import { Menu, Trophy, Flame, Star, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type AchTab = 'Diario' | 'Semanal' | 'Mensual';

type Mission = {
  id: string;
  name: string;
  target: number;
  icon: typeof Trophy;
};

const DAILY: Mission[] = [
  { id: 'd1', name: 'Quitando polvo', target: 1, icon: Flame },
  { id: 'd2', name: 'Término Medio', target: 2, icon: Flame },
  { id: 'd3', name: 'El Terror de Vinted', target: 3, icon: Star },
  { id: 'd4', name: 'Lobo de Wall Street', target: 5, icon: Crown },
  { id: 'd5', name: 'Rompe-Stock Absoluto', target: 10, icon: Trophy },
];

const WEEKLY: Mission[] = [
  { id: 'w1', name: 'Poniendo Motores a Punto', target: 2, icon: Flame },
  { id: 'w2', name: 'Surtidor del Barrio', target: 5, icon: Flame },
  { id: 'w3', name: 'Fábrica de Sneakers', target: 10, icon: Star },
  { id: 'w4', name: 'Aduanas No Me Para', target: 15, icon: Crown },
  { id: 'w5', name: 'Monopolio Urbano', target: 25, icon: Trophy },
];

const MONTHLY: Mission[] = [
  { id: 'm1', name: 'Mano de Santo', target: 10, icon: Flame },
  { id: 'm2', name: 'El Plug de Confianza', target: 20, icon: Flame },
  { id: 'm3', name: 'El Rey del Resell', target: 35, icon: Star },
  { id: 'm4', name: 'Titanium Plug', target: 50, icon: Crown },
  { id: 'm5', name: 'Cerrando la Fábrica', target: 100, icon: Trophy },
];

function getTimeBoundaries() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
  const weekStart = monday.toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return { todayStart, weekStart, monthStart };
}

function getNextReset(tab: AchTab): string {
  const now = new Date();
  if (tab === 'Diario') {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const diff = tomorrow.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }
  if (tab === 'Semanal') {
    const dayOfWeek = (now.getDay() + 6) % 7;
    const daysToMon = 7 - dayOfWeek;
    const nextMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMon);
    const diff = nextMon.getTime() - now.getTime();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return `${d}d ${h}h`;
  }
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diff = nextMonth.getTime() - now.getTime();
  const d = Math.floor(diff / 86400000);
  return `${d} días`;
}

export function AchievementsPage({ openMenu, onUnlock }: { openMenu: () => void; onUnlock?: (name: string) => void }) {
  const [tab, setTab] = useState<AchTab>('Diario');
  const [dailyCount, setDailyCount] = useState(0);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [previouslyUnlocked, setPreviouslyUnlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { todayStart, weekStart, monthStart } = getTimeBoundaries();
      const [dRes, wRes, mRes] = await Promise.all([
        supabase.from('sales').select('id', { count: 'exact', head: true }).gte('sold_at', todayStart),
        supabase.from('sales').select('id', { count: 'exact', head: true }).gte('sold_at', weekStart),
        supabase.from('sales').select('id', { count: 'exact', head: true }).gte('sold_at', monthStart),
      ]);
      if (!mounted) return;
      const dc = dRes.count ?? 0;
      const wc = wRes.count ?? 0;
      const mc = mRes.count ?? 0;

      const prevUnlocked = new Set<string>();
      DAILY.forEach((m) => { if (dc >= m.target) prevUnlocked.add(m.id); });
      WEEKLY.forEach((m) => { if (wc >= m.target) prevUnlocked.add(m.id); });
      MONTHLY.forEach((m) => { if (mc >= m.target) prevUnlocked.add(m.id); });
      setPreviouslyUnlocked(prevUnlocked);

      setDailyCount(dc);
      setWeeklyCount(wc);
      setMonthlyCount(mc);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (previouslyUnlocked.size === 0) return;
    const allMissions = [...DAILY, ...WEEKLY, ...MONTHLY];
    const counts: Record<string, number> = {};
    DAILY.forEach((m) => { counts[m.id] = dailyCount; });
    WEEKLY.forEach((m) => { counts[m.id] = weeklyCount; });
    MONTHLY.forEach((m) => { counts[m.id] = monthlyCount; });

    for (const m of allMissions) {
      if (counts[m.id] >= m.target && !previouslyUnlocked.has(m.id)) {
        onUnlock?.(m.name);
        setPreviouslyUnlocked((prev) => new Set([...prev, m.id]));
        break;
      }
    }
  }, [dailyCount, weeklyCount, monthlyCount, previouslyUnlocked, onUnlock]);

  const missions = tab === 'Diario' ? DAILY : tab === 'Semanal' ? WEEKLY : MONTHLY;
  const count = tab === 'Diario' ? dailyCount : tab === 'Semanal' ? weeklyCount : monthlyCount;
  const resetLabel = useMemo(() => getNextReset(tab), [tab]);
  const completedCount = missions.filter((m) => count >= m.target).length;

  return (
    <main className="page-shell achievements-page">
      <header className="sales-header">
        <button className="icon-button" onClick={openMenu} aria-label="Abrir menú"><Menu size={26} /></button>
        <h1>Logros</h1>
        <div className="header-spacer" />
      </header>

      <div className="ach-summary">
        <div className="ach-summary-icon"><Trophy size={28} /></div>
        <div>
          <strong>{completedCount}/{missions.length}</strong>
          <span>completados</span>
        </div>
        <div className="ach-reset">
          Reinicio en <strong>{resetLabel}</strong>
        </div>
      </div>

      <div className="range-tabs" role="tablist">
        {(['Diario', 'Semanal', 'Mensual'] as AchTab[]).map((t) => (
          <button key={t} className={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <section className="ach-list">
        {missions.map((m) => {
          const Icon = m.icon;
          const progress = Math.min(count, m.target);
          const pct = Math.min(100, Math.round((progress / m.target) * 100));
          const done = count >= m.target;
          return (
            <article className={`ach-card${done ? ' ach-done' : ''}`} key={m.id}>
              <div className="ach-card-icon"><Icon size={22} /></div>
              <div className="ach-card-body">
                <div className="ach-card-top">
                  <strong>{m.name}</strong>
                  <span className="ach-card-count">{progress}/{m.target}</span>
                </div>
                <div className="ach-bar-track">
                  <div className="ach-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="ach-card-desc">
                  {done ? 'Completado' : `${m.target} venta${m.target > 1 ? 's' : ''} ${tab === 'Diario' ? 'hoy' : tab === 'Semanal' ? 'esta semana' : 'este mes'}`}
                </span>
              </div>
              {done && <div className="ach-check">&#10003;</div>}
            </article>
          );
        })}
      </section>
    </main>
  );
}
