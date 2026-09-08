import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

type Mission = { id: string; name: string; target: number };

const DAILY: Mission[] = [
  { id: 'd1', name: 'Quitando polvo', target: 1 },
  { id: 'd2', name: 'Término Medio', target: 2 },
  { id: 'd3', name: 'El Terror de Vinted', target: 3 },
  { id: 'd4', name: 'Lobo de Wall Street', target: 5 },
  { id: 'd5', name: 'Rompe-Stock Absoluto', target: 10 },
];

const WEEKLY: Mission[] = [
  { id: 'w1', name: 'Poniendo Motores a Punto', target: 2 },
  { id: 'w2', name: 'Surtidor del Barrio', target: 5 },
  { id: 'w3', name: 'Fábrica de Sneakers', target: 10 },
  { id: 'w4', name: 'Aduanas No Me Para', target: 15 },
  { id: 'w5', name: 'Monopolio Urbano', target: 25 },
];

const MONTHLY: Mission[] = [
  { id: 'm1', name: 'Mano de Santo', target: 10 },
  { id: 'm2', name: 'El Plug de Confianza', target: 20 },
  { id: 'm3', name: 'El Rey del Resell', target: 35 },
  { id: 'm4', name: 'Titanium Plug', target: 50 },
  { id: 'm5', name: 'Cerrando la Fábrica', target: 100 },
];

function getBoundaries() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
  const weekStart = monday.toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return { todayStart, weekStart, monthStart };
}

export function useAchievementCheck(saleKey: number, onUnlock: (name: string) => void) {
  const prevRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const { todayStart, weekStart, monthStart } = getBoundaries();
      const [dRes, wRes, mRes] = await Promise.all([
        supabase.from('sales').select('id', { count: 'exact', head: true }).gte('sold_at', todayStart),
        supabase.from('sales').select('id', { count: 'exact', head: true }).gte('sold_at', weekStart),
        supabase.from('sales').select('id', { count: 'exact', head: true }).gte('sold_at', monthStart),
      ]);
      if (!mounted) return;

      const dc = dRes.count ?? 0;
      const wc = wRes.count ?? 0;
      const mc = mRes.count ?? 0;

      const nowUnlocked = new Set<string>();
      const counts: Record<string, number> = {};
      DAILY.forEach((m) => { counts[m.id] = dc; if (dc >= m.target) nowUnlocked.add(m.id); });
      WEEKLY.forEach((m) => { counts[m.id] = wc; if (wc >= m.target) nowUnlocked.add(m.id); });
      MONTHLY.forEach((m) => { counts[m.id] = mc; if (mc >= m.target) nowUnlocked.add(m.id); });

      const prev = prevRef.current;
      if (prev !== null) {
        const allMissions = [...DAILY, ...WEEKLY, ...MONTHLY];
        for (const m of allMissions) {
          if (nowUnlocked.has(m.id) && !prev.has(m.id)) {
            onUnlock(m.name);
            break;
          }
        }
      }
      prevRef.current = nowUnlocked;
    };
    void check();
    return () => { mounted = false; };
  }, [saleKey, onUnlock]);
}
