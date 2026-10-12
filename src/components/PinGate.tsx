import { useState } from 'react';
import { ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

function onlyDigits(v: string) {
  return v.replace(/\D/g, '').slice(0, 6);
}

export default function PinGate() {
  const { pinMode, markPinReady, signOut } = useAuth();
  const creating = pinMode !== 'enter';
  if (!pinMode) {
    return <div className="auth-page"><div className="auth-container"><p className="auth-description">Loading security check...</p></div></div>;
  }
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pin.length !== 6) {
      setError('The code must be 6 digits.');
      return;
    }
    if (creating && pin !== confirm) {
      setError('The codes do not match.');
      return;
    }
    setBusy(true);
    try {
      if (creating) await api.setupLoginPin(pin, confirm);
      else await api.verifyLoginPin(pin);
      markPinReady();
    } catch (err: any) {
      setError(err?.message || 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page auth-verification-page">
      <div className="auth-container">
        <div className="auth-topline">
          <span>COMBAT ARMS <span className="auth-topline-slash">/</span> SECURITY CODE</span>
        </div>
        <div className="auth-shell verification-shell">
          <section className="auth-panel verification-panel">
            <div className="auth-panel-inner">
              <div className="verification-emblem"><Shield size={28} /></div>
              <p className="auth-kicker"><span /> WEBSITE PROTECTION</p>
              <h1>{creating ? 'CREATE YOUR CODE.' : 'ENTER YOUR CODE.'}</h1>
              <p className="auth-description">
                {creating
                  ? 'You do not have a 6-digit sign-in code yet. Create one now. You will need it every time you log in.'
                  : 'Enter the 6-digit code for this account to finish signing in.'}
              </p>
              <form className="auth-form verification-form" onSubmit={submit}>
                <div className="auth-field">
                  <label htmlFor="two-factor-code">{creating ? 'New 6-digit code' : '6-digit code'}</label>
                  <input
                    id="two-factor-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(onlyDigits(e.target.value))}
                    placeholder="000000"
                  />
                </div>
                {creating && (
                  <div className="auth-field">
                    <label htmlFor="two-factor-confirm">Confirm code</label>
                    <input
                      id="two-factor-confirm"
                      inputMode="numeric"
                      maxLength={6}
                      value={confirm}
                      onChange={(e) => setConfirm(onlyDigits(e.target.value))}
                      placeholder="000000"
                    />
                  </div>
                )}
                {error && <p className="auth-field-error">{error}</p>}
                <button className="auth-submit" type="submit" disabled={busy || pin.length !== 6}>
                  {busy ? 'CHECKING...' : creating ? 'SAVE CODE' : 'CONTINUE'}
                  <ArrowRight size={18} />
                </button>
              </form>
              <button className="verification-text-button" type="button" onClick={() => signOut()}>
                Use another account
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
