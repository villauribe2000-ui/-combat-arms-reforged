import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Crosshair, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { PageId } from '@/components/Layout';

type Props = {
  mode: 'signin' | 'signup';
  onNavigate: (page: PageId) => void;
};

export default function AuthPage({ mode, onNavigate }: Props) {
  const { signIn, signUp, profile, pinReady } = useAuth();

  useEffect(() => {
    if (profile && pinReady) onNavigate('profile');
  }, [profile, pinReady, onNavigate]);
  const isSignIn = mode === 'signin';
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ready = isSignIn
    ? username.length >= 3 && password.length > 0
    : username.length >= 3 && email.includes('@') && password.length >= 8 && confirm.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = isSignIn
        ? await signIn(username, password)
        : await signUp(username, password, confirm, email);
      if (result.error) {
        setError(result.error.message || 'Could not complete the request.');
      } else {
        onNavigate('profile');
      }
    } catch {
      setError('Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page ${isSignIn ? '' : 'auth-page-sign-up'}`}>
      <div className="auth-container">
        <div className="auth-topline">
          <button type="button" className="auth-back" onClick={() => onNavigate('home')}>
            <ArrowLeft size={15} /> BACK TO HOME
          </button>
          <span>COMBAT ARMS <span className="auth-topline-slash">/</span> PLAYER ACCESS</span>
        </div>

        <div className="auth-shell">
          <aside className="auth-art" aria-label="Combat Arms soldiers">
            <div className="auth-art-top">
              <Crosshair size={19} />
              <span>THE FRONTLINE IS CALLING</span>
            </div>
            <div className="auth-art-content">
              <span className="auth-kicker"><span /> YOUR SQUAD. YOUR STORY.</span>
              {isSignIn ? (
                <>
                  <h2>BACK IN<br />THE <em>FIGHT.</em></h2>
                  <p>The maps you know. The squad you trust. There’s always another reason to get back out there.</p>
                </>
              ) : (
                <>
                  <h2>EVERY LEGEND<br />STARTS <em>HERE.</em></h2>
                  <p>Make your mark. Find your squad. Turn your next match into a story worth telling.</p>
                </>
              )}
              <div className="auth-art-footer">
                <Shield size={16} />
                <span>BUILT FOR THE COMBAT ARMS COMMUNITY</span>
              </div>
            </div>
          </aside>

          <section className="auth-panel" aria-labelledby="auth-title">
            <div className="auth-panel-inner">
              <span className="auth-kicker">{isSignIn ? 'SIGN IN' : 'SIGN UP'}</span>
              <h1 id="auth-title">{isSignIn ? 'WELCOME BACK.' : 'CREATE YOUR ACCOUNT.'}</h1>
              {!isSignIn && (
                <p className="auth-description">
                  Crea tu cuenta y empieza a jugar. Cada IP puede crear solo 2 cuentas, y cada correo solo se puede usar en una.
                </p>
              )}

              {error && (
                <div className="auth-status auth-request-error" role="alert">
                  {error}
                </div>
              )}

              <form className="auth-form" onSubmit={submit} noValidate aria-busy={loading}>
                <div className="auth-field">
                  <label htmlFor="display-name">Display name</label>
                  <input
                    id="display-name"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={isSignIn ? 'Enter your display name' : 'Choose your display name'}
                    minLength={3}
                    maxLength={20}
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                  <p className="auth-field-hint">3–20 letters, numbers, or underscores. No spaces.</p>
                </div>

                {!isSignIn && (
                  <div className="auth-field">
                    <label htmlFor="email">Email address</label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      maxLength={100}
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                )}

                <div className="auth-field">
                  <label htmlFor="password">Password</label>
                  <div className="auth-password-wrap">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isSignIn ? 'current-password' : 'new-password'}
                      placeholder="Enter your password"
                      required
                      maxLength={64}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="auth-visibility"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(v => !v)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {!isSignIn && <p className="auth-field-hint">8+ characters, with a letter and a number.</p>}
                </div>

                {!isSignIn && (
                  <div className="auth-field">
                    <label htmlFor="confirm-password">Confirm password</label>
                    <div className="auth-password-wrap">
                      <input
                        id="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Repeat password"
                        required
                        maxLength={64}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                      />
                      <button
                        type="button"
                        className="auth-visibility"
                        aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                        onClick={() => setShowConfirm(v => !v)}
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                <button className="auth-submit" type="submit" disabled={!ready || loading}>
                  {loading ? (isSignIn ? 'SIGNING IN…' : 'CREATING…') : isSignIn ? 'SIGN IN' : 'CREATE ACCOUNT'}
                  <ArrowRight size={19} />
                </button>
              </form>

              <p className="auth-switch">
                {isSignIn ? (
                  <>
                    New to Combat Arms?{' '}
                    <button type="button" onClick={() => onNavigate('signup')}>
                      Create an account <ArrowRight size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button type="button" onClick={() => onNavigate('signin')}>
                      Sign in <ArrowRight size={13} />
                    </button>
                  </>
                )}
              </p>
            </div>
          </section>
        </div>

        <div className="auth-bottomline">
          <span>COMBAT ARMS / THE CLASSIC</span>
          <button type="button" onClick={() => onNavigate('download')}>
            Need the game? <span>Download the client <ArrowRight size={13} /></span>
          </button>
        </div>
      </div>
    </div>
  );
}
