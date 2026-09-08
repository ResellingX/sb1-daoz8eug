import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

export function CelebrationModal({ title, subtitle, onDone }: { title: string; subtitle: string; onDone: () => void }) {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 1.2 + Math.random() * 1,
      size: 4 + Math.random() * 6,
      color: ['#00FF66', '#00cc52', '#FAFAFA', '#EAB308', '#00FF66'][Math.floor(Math.random() * 5)],
    }))
  );

  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="celeb-layer" onClick={onDone}>
      <div className="celeb-confetti">
        {particles.map((p) => (
          <span
            key={p.id}
            className="celeb-particle"
            style={{
              left: `${p.x}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>
      <div className="celeb-card" onClick={(e) => e.stopPropagation()}>
        <div className="celeb-icon"><Trophy size={36} /></div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <button className="celeb-dismiss" onClick={onDone}>Continuar</button>
      </div>
    </div>
  );
}
