import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Gift, Calendar, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando información de cumpleaños...</p>
        </div>
      </div>
    );
  }

  if (!birthdayInfo?.registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-purple-900/30 via-[#0d1320] to-purple-900/20 p-8 text-center">
            <Gift className="h-16 w-16 mx-auto text-purple-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Registro de Cumpleaños</h2>
            <p className="text-slate-400 mb-6">
              Registra tu fecha de nacimiento para recibir un regalo especial en tu cumpleaños 🎉
            </p>

            <form onSubmit={handleRegisterBirthday} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!selectedDate}
                className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Registrar Cumpleaños
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isBirthdayToday = birthdayInfo?.isBirthdayToday;
  const alreadyClaimed = birthdayInfo?.alreadyClaimed;
  const daysLeft = birthdayInfo?.daysUntilBirthday || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black">🎂 Regalo de Cumpleaños</h1>
        <p className="mt-1 text-slate-400">
          Recibe {birthdayInfo?.nxReward?.toLocaleString()} NX en tu cumpleaños especial
        </p>
      </div>

      {/* Birthday Info Card */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-900/20 via-[#0d1320] to-emerald-900/10 p-6">
        <div className="flex items-center gap-4">
          <Calendar className="h-8 w-8 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-slate-400">Tu Cumpleaños</p>
            <p className="text-xl font-bold text-emerald-400">{birthdayInfo?.birthDateFormatted}</p>
          </div>
        </div>
      </div>

      {/* Main Gift Section */}
      <div className="flex flex-col items-center justify-center py-12">
        {/* Days Counter or Birthday Message */}
        <div className="mb-8 text-center">
          {isBirthdayToday ? (
            <div className="animate-pulse">
              <p className="text-sm text-yellow-400 font-bold mb-2">🎉 ¡ES TU CUMPLEAÑOS! 🎉</p>
              <p className="text-4xl font-black text-yellow-300">¡FELICIDADES!</p>
            </div>
          ) : (
            <div>
              <p className="text-slate-400 text-sm mb-2">Te faltan:</p>
              <p className="text-6xl font-black text-cyan-400">{daysLeft}</p>
              <p className="text-slate-400 text-sm mt-2">
                {daysLeft === 1 ? 'día' : 'días'} para tu cumpleaños
              </p>
            </div>
          )}
        </div>

        {/* Gift Box */}
        <div className="relative mb-8">
          <div
            className={`relative w-32 h-32 cursor-pointer transition-transform duration-300 ${
              isBirthdayToday && !alreadyClaimed ? 'hover:scale-110' : ''
            }`}
            onClick={isBirthdayToday && !alreadyClaimed && !isOpening ? handleOpenGift : undefined}
          >
            {/* Gift Box */}
            <div
              className={`w-full h-full rounded-xl transition-all duration-500 ${
                isOpening
                  ? 'opacity-0 scale-0 rotate-45'
                  : 'bg-gradient-to-br from-red-500 to-red-700 shadow-lg'
              }`}
            >
              {/* Box shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-xl"></div>

              {/* Ribbon */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-full bg-yellow-300 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-4 bg-yellow-300 rounded-full"></div>

              {/* Bow */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-yellow-300 rounded-full"></div>
            </div>

            {/* Sparkles when opening */}
            {showCelebration && (
              <>
                <Sparkles className="absolute -top-4 -left-4 h-8 w-8 text-yellow-300 animate-bounce" />
                <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-yellow-300 animate-bounce" />
                <Sparkles className="absolute -bottom-4 -left-4 h-8 w-8 text-yellow-300 animate-bounce" />
                <Sparkles className="absolute -bottom-4 -right-4 h-8 w-8 text-yellow-300 animate-bounce" />
              </>
            )}

            {/* NX Burst on open */}
            {showCelebration && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-5xl font-black text-yellow-300 animate-ping">+{birthdayInfo?.nxReward?.toLocaleString()}</div>
              </div>
            )}
          </div>

          {/* Status badge */}
          {isBirthdayToday && !alreadyClaimed && (
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <p className="text-sm text-emerald-400 font-bold animate-bounce">👆 Abre aquí 👆</p>
            </div>
          )}
        </div>

        {/* Button or Status */}
        <div className="mt-16 w-full max-w-xs">
          {isBirthdayToday && !alreadyClaimed ? (
            <button
              onClick={handleOpenGift}
              disabled={isOpening}
              className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105"
            >
              {isOpening ? 'Abriendo...' : '🎁 Abrir Regalo'}
            </button>
          ) : alreadyClaimed ? (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
              <p className="text-emerald-400 font-bold">¡Ya reclamaste tu regalo este año!</p>
              <p className="text-slate-400 text-sm mt-2">Vuelve el próximo año para otro 🎂</p>
            </div>
          ) : (
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-400 font-bold">Tu regalo estará listo el día de tu cumpleaños</p>
              <p className="text-slate-500 text-sm mt-2">Regresa en {daysLeft} {daysLeft === 1 ? 'día' : 'días'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Gift className="h-5 w-5 text-purple-400" />
          ¿Cómo funciona?
        </h3>
        <div className="space-y-3 text-slate-400 text-sm">
          <p>✨ <span className="text-white">Registra tu fecha de nacimiento</span> en esta página</p>
          <p>🎂 <span className="text-white">Cuando llegue tu cumpleaños</span>, el regalo se desbloqueará automáticamente</p>
          <p>🎁 <span className="text-white">Abre el regalo</span> para recibir {birthdayInfo?.nxReward?.toLocaleString()} NX</p>
          <p>📅 <span className="text-white">Una vez al año</span>, solo puedes reclamar tu regalo en tu cumpleaños</p>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            className={`flex items-center gap-3 rounded-lg px-6 py-4 border ${
              notification.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/20 border-red-500/30 text-red-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <p className="font-medium">{notification.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
