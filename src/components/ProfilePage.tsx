import { useState } from 'react';
import { ChevronRight, Lock, Menu, Shield, UserRound } from 'lucide-react';
import { getPin, setPin, verifyPin } from '@/lib/pin';
import { PinPadModal } from '@/components/PinPadModal';

type PinStep = 'idle' | 'verify-current' | 'enter-new' | 'confirm-new';

export function ProfilePage({ openMenu }: { openMenu: () => void }) {
  const [pinStep, setPinStep] = useState<PinStep>('idle');
  const [newPinCandidate, setNewPinCandidate] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const currentPin = getPin();
  const maskedPin = currentPin.replace(/./g, '*');

  const startChangePin = () => setPinStep('verify-current');

  const handlePinStep = (pin: string): boolean | void => {
    if (pinStep === 'verify-current') {
      if (!verifyPin(pin)) return false;
      setPinStep('enter-new');
      return;
    }
    if (pinStep === 'enter-new') {
      setNewPinCandidate(pin);
      setPinStep('confirm-new');
      return;
    }
    if (pinStep === 'confirm-new') {
      if (pin !== newPinCandidate) return false;
      setPin(pin);
      setPinStep('idle');
      setNewPinCandidate('');
      showToast('PIN actualizado correctamente');
      return;
    }
  };

  const pinStepTitle: Record<PinStep, string> = {
    idle: '',
    'verify-current': 'Introduce tu PIN actual',
    'enter-new': 'Introduce el nuevo PIN',
    'confirm-new': 'Confirma el nuevo PIN',
  };

  return (
    <main className="page-shell profile-page">
      <header className="inventory-header">
        <button className="icon-button" onClick={openMenu} aria-label="Abrir menu">
          <Menu size={29} />
        </button>
        <div>
          <span className="eyebrow">CUENTA</span>
          <h1>Perfil y Ajustes</h1>
        </div>
        <div className="header-spacer" />
      </header>

      <section className="profile-section">
        <div className="profile-avatar">
          <UserRound size={42} />
        </div>
        <h2>Reseller</h2>
        <p className="profile-subtitle">Gestiona tu cuenta y preferencias</p>
      </section>

      <section className="settings-group">
        <h3><Shield size={18} /> Seguridad y Privacidad</h3>
        <div className="settings-card">
          <button className="settings-row" onClick={startChangePin}>
            <Lock size={20} />
            <div className="settings-row-content">
              <span className="settings-row-label">PIN de privacidad</span>
              <span className="settings-row-value">{maskedPin}</span>
            </div>
            <ChevronRight size={18} className="settings-row-arrow" />
          </button>
          <div className="settings-hint">
            Protege tus cifras del Dashboard. Pulsa para cambiar el PIN.
          </div>
        </div>
      </section>

      {toast && <div className="profile-toast">{toast}</div>}

      {pinStep !== 'idle' && (
        <PinPadModal
          title={pinStepTitle[pinStep]}
          close={() => {
            setPinStep('idle');
            setNewPinCandidate('');
          }}
          onSubmit={handlePinStep}
        />
      )}
    </main>
  );
}
