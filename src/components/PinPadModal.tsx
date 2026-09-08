import { useState } from 'react';
import { Delete, X } from 'lucide-react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export function PinPadModal({
  title,
  close,
  onSubmit,
}: {
  title: string;
  close: () => void;
  onSubmit: (pin: string) => boolean | void;
}) {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const press = (key: string) => {
    setError('');
    if (key === 'del') {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    const next = digits + key;
    if (next.length > 4) return;
    setDigits(next);
    if (next.length === 4) {
      const result = onSubmit(next);
      if (result === false) {
        setError('PIN incorrecto');
        setShake(true);
        setTimeout(() => {
          setDigits('');
          setShake(false);
        }, 500);
      }
    }
  };

  return (
    <div className="modal-layer" onClick={close}>
      <div
        className={`pin-modal${shake ? ' pin-shake' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pin-modal-header">
          <h3>{title}</h3>
          <button className="close-button" onClick={close} aria-label="Cerrar">
            <X size={24} />
          </button>
        </div>

        <div className="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`pin-dot${i < digits.length ? ' filled' : ''}`}
            />
          ))}
        </div>

        {error && <p className="pin-error">{error}</p>}

        <div className="pin-grid">
          {KEYS.map((key, i) =>
            key === '' ? (
              <div key={i} />
            ) : key === 'del' ? (
              <button
                key={i}
                className="pin-key pin-key-del"
                onClick={() => press('del')}
                aria-label="Borrar"
              >
                <Delete size={22} />
              </button>
            ) : (
              <button
                key={i}
                className="pin-key"
                onClick={() => press(key)}
              >
                {key}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
