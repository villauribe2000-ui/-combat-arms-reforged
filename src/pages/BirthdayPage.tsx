import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Gift, AlertCircle, CheckCircle } from 'lucide-react';

interface BirthdayInfo {
  registered: boolean;
  oidUser?: number;
  username?: string;
  birthDate?: string;
  birthDateFormatted?: string;
  isBirthdayToday?: boolean;
  alreadyClaimed?: boolean;
  daysUntilBirthday?: number;
  nxReward?: number;
  message?: string;
}

export default function BirthdayPage() {
  const { profile } = useAuth();
  const [birthdayInfo, setBirthdayInfo] = useState<BirthdayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cargar info de cumpleaños
  useEffect(() => {
    if (!profile?.username) return;

    const loadBirthdayInfo = async () => {
      try {
        setLoading(true);
        const info = await api.getBirthdayInfo(profile.username || '');
        setBirthdayInfo(info);
        
        if (!info.registered) {
          setShowRegisterModal(true);
        }
      } catch (error) {
        console.error('Error loading birthday info:', error);
        setNotification({
          type: 'error',
          message: 'Error al cargar información de cumpleaños'
        });
      } finally {
        setLoading(false);
      }
    };

    loadBirthdayInfo();
  }, [profile?.username]);

  const handleRegisterBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !profile?.username) return;

    try {
      const result = await api.registerBirthday(profile.username, selectedDate);
      setNotification({
        type: 'success',
        message: result.message
      });
      setTimeout(() => setNotification(null), 3000);

      // Recargar info
      const info = await api.getBirthdayInfo(profile.username);
      setBirthdayInfo(info);
      setShowRegisterModal(false);
    } catch (error) {
      console.error('Error registering birthday:', error);
      setNotification({
        type: 'error',
        message: 'Error al registrar cumpleaños'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleOpenGift = async () => {
    if (!profile?.username || isOpening) return;

    try {
      setIsOpening(true);
      const result = await api.claimBirthdayReward(profile.username);
      
      setShowCelebration(true);
      setNotification({
        type: 'success',
        message: result.message
      });
      
      // Recargar info
      setTimeout(async () => {
        const info = await api.getBirthdayInfo(profile.username || '');
        setBirthdayInfo(info);
      }, 1500);
      
      setTimeout(() => setNotification(null), 5000);
      setTimeout(() => setShowCelebration(false), 3000);
    } catch (error: any) {
      console.error('Error claiming birthday reward:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.error || 'Error al reclamar regalo'
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsOpening(false);
    }
  };

  if (loading) {
    return (
      <main className="inner-page page-width birthday-page">
        <div className="birthday-register">
          <Gift className="mx-auto h-10 w-10 text-[#df8104]" />
          <h1>LOADING.</h1>
          <p>Cargando información de cumpleaños...</p>
        </div>
      </main>
    );
  }

  if (!birthdayInfo?.registered) {
    return (
      <main className="inner-page page-width birthday-page">
        <header className="page-heading">
          <div>
            <p className="eyebrow"><span className="tiny-square" /> PLAYER EVENTS</p>
            <h1>BIRTHDAY GIFT.</h1>
            <p className="page-heading-description">
              Registra tu fecha de nacimiento para recibir un regalo de NX el día de tu cumpleaños.
            </p>
          </div>
        </header>
        <div className="birthday-register">
          <Gift className="mx-auto h-12 w-12 text-[#df8104]" />
          <h1>REGISTRO.</h1>
          <p>Una vez al año, el día de tu cumpleaños, puedes abrir el cofre y reclamar NX.</p>
          <form onSubmit={handleRegisterBirthday}>
            <label>Fecha de nacimiento</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required />
            <button type="submit" className="birthday-cta" disabled={!selectedDate}>Registrar cumpleaños</button>
          </form>
        </div>
        {notification && (
          <div className={`birthday-toast birthday-toast-${notification.type}`}>
            {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <p>{notification.message}</p>
          </div>
        )}
      </main>
    );
  }

  const isBirthdayToday = birthdayInfo?.isBirthdayToday;
  const alreadyClaimed = birthdayInfo?.alreadyClaimed;
  const daysLeft = birthdayInfo?.daysUntilBirthday || 0;

  const canOpen = Boolean(isBirthdayToday && !alreadyClaimed && !isOpening);
  const nxReward = Number(birthdayInfo?.nxReward || 30000);

  return (
    <main className="inner-page page-width birthday-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span className="tiny-square" /> PLAYER EVENTS</p>
          <h1>BIRTHDAY GIFT.</h1>
          <p className="page-heading-description">
            Un cofre de NX te espera el día de tu cumpleaños. Solo se puede abrir una vez al año.
          </p>
        </div>
        <div className="page-heading-aside">
          <span className="charge-badge">
            <Gift size={14} /> {nxReward.toLocaleString()} NX
          </span>
        </div>
      </header>

      <div className="birthday-metrics">
        <article>
          <p>TU CUMPLEAÑOS</p>
          <strong>{birthdayInfo?.birthDateFormatted || '—'}</strong>
        </article>
        <article>
          <p>{alreadyClaimed ? 'PRÓXIMO EVENTO' : isBirthdayToday ? 'ESTADO' : 'FALTAN'}</p>
          <strong>{alreadyClaimed || !isBirthdayToday ? `${daysLeft} días` : 'HOY'}</strong>
        </article>
      </div>

      <section className="birthday-stage">
        {isBirthdayToday ? (
          <>
            <p className="birthday-kicker">IT'S YOUR BIRTHDAY</p>
            <div className="birthday-days">FELICIDADES<span>El cofre está desbloqueado. Ábrelo para reclamar tu NX.</span></div>
          </>
        ) : (
          <>
            <p className="birthday-kicker">COUNTDOWN</p>
            <div className="birthday-days">{daysLeft}<span>{daysLeft === 1 ? 'día' : 'días'} para tu cumpleaños</span></div>
          </>
        )}

        <div className="birthday-gift-wrap">
          <div className="birthday-glow" />
          <div
            className={`birthday-gift${canOpen ? ' birthday-gift-ready' : ''}`}
            onClick={canOpen ? handleOpenGift : undefined}
            role={canOpen ? 'button' : undefined}
          >
            {!showCelebration && (
              <>
                <div className="birthday-box" />
                <div className="birthday-lid" />
                <div className="birthday-ribbon-v" />
                <div className="birthday-ribbon-h" />
                <div className="birthday-bow"><i /><b /><em /></div>
              </>
            )}
            {showCelebration && (
              <div className="birthday-open">
                <strong>+{nxReward.toLocaleString()} NX</strong>
              </div>
            )}
          </div>
        </div>

        {canOpen ? (
          <button type="button" className="birthday-cta" onClick={handleOpenGift} disabled={isOpening}>
            {isOpening ? 'Abriendo...' : 'Abrir cofre'}
          </button>
        ) : alreadyClaimed ? (
          <p className="birthday-status">Ya reclamaste tu regalo este año. Faltan <b>{daysLeft}</b> días para el próximo.</p>
        ) : (
          <p className="birthday-status">El cofre se abre solo el día de tu cumpleaños.</p>
        )}
      </section>

      <section className="birthday-how">
        <h2><Gift size={18} /> Cómo funciona</h2>
        <ul>
          <li><strong>Registra</strong> tu fecha de nacimiento una sola vez.</li>
          <li><strong>Espera</strong> al día de tu cumpleaños. El cofre se desbloquea solo.</li>
          <li><strong>Abre el cofre</strong> y el NX se suma a tu cuenta.</li>
          <li><strong>Una vez al año.</strong> El siguiente regalo vuelve en tu próximo cumpleaños.</li>
        </ul>
      </section>

      {notification && (
        <div className={`birthday-toast birthday-toast-${notification.type}`}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <p>{notification.message}</p>
        </div>
      )}
    </main>
  );
}
