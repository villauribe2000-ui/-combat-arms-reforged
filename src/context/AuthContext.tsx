import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

export interface Profile {
  userId: number;
  id?: number; // Alias para userId
  username: string;
  email: string;
  nickname: string | null;
  level?: number;
  experience: number;
  gameCoins: number;
  bonusCoins: number;
  totalBalance: number;
  characterClass?: number;
  gender?: number;
  joinDate?: string;
  is_admin?: boolean;
  webRole?: string | null;
}

type PinMode = 'create' | 'enter' | null;

type AuthContextType = {
  profile: Profile | null;
  loading: boolean;
  token: string | null;
  pinReady: boolean;
  pinMode: PinMode;
  markPinReady: () => void;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (username: string, password: string, confirmPassword: string, email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = typeof window === 'undefined'
  ? ''
  : (import.meta.env.PROD
    ? ''
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : `http://${window.location.hostname}:5000`));

function pinStorageKey(userId: number) {
  return `ca_pin_ok_${userId}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [pinReady, setPinReady] = useState(false);
  const [pinMode, setPinMode] = useState<PinMode>(null);

  const fetchProfile = async (authToken?: string) => {
    try {
      const tkn = authToken || localStorage.getItem('token');
      if (!tkn) {
        setProfile(null);
        setToken(null);
        setPinReady(false);
        setPinMode(null);
        api.clearToken();
        return;
      }

      const response = await fetch(`${API_URL}/api/auth-combatarms/verify`, {
        headers: {
          'Authorization': `Bearer ${tkn}`
        }
      });

      if (!response.ok) {
        throw new Error('Token inválido');
      }

      const data = await response.json();
      if (data.success) {
        setProfile(data.user);
        setToken(tkn);
        api.setToken(tkn);
        const uid = Number(data.user?.userId || data.user?.id || 0);
        if (uid && sessionStorage.getItem(pinStorageKey(uid)) === '1') {
          setPinReady(true);
          setPinMode(null);
        } else {
          setPinReady(false);
          try {
            const status = await api.getLoginPinStatus();
            setPinMode(status.hasPin ? 'enter' : 'create');
          } catch {
            setPinMode('create');
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setProfile(null);
      setToken(null);
      setPinReady(false);
      setPinMode(null);
      api.clearToken();
      localStorage.removeItem('token');
    }
  };

  useEffect(() => {
    // Verificar si hay token guardado
    const tkn = localStorage.getItem('token');
    if (tkn) {
      fetchProfile(tkn);
    }
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth-combatarms/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!data.success) {
        return { error: new Error(data.error) };
      }

      localStorage.setItem('token', data.token);
      api.setToken(data.token);
      const uid = Number(data.user?.userId || data.user?.id || 0);
      if (uid) sessionStorage.removeItem(pinStorageKey(uid));
      setPinReady(false);
      await fetchProfile(data.token);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const markPinReady = () => {
    const uid = Number(profile?.userId || profile?.id || 0);
    if (uid) sessionStorage.setItem(pinStorageKey(uid), '1');
    setPinReady(true);
    setPinMode(null);
  };

  const signUp = async (username: string, password: string, confirmPassword: string, email: string) => {
    try {
      if (password !== confirmPassword) {
        return { error: new Error('Las contraseñas no coinciden') };
      }

      const response = await fetch(`${API_URL}/api/auth-combatarms/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, email })
      });

      const data = await response.json();

      if (!data.success) {
        return { error: new Error(data.error) };
      }

      localStorage.setItem('token', data.token);
      api.setToken(data.token);
      setPinReady(false);
      await fetchProfile(data.token);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    const uid = Number(profile?.userId || profile?.id || 0);
    if (uid) sessionStorage.removeItem(pinStorageKey(uid));
    localStorage.removeItem('token');
    api.clearToken();
    setProfile(null);
    setToken(null);
    setPinReady(false);
    setPinMode(null);
  };

  const refreshProfile = async () => {
    const tkn = localStorage.getItem('token');
    if (tkn) {
      await fetchProfile(tkn);
    }
  };

  return (
    <AuthContext.Provider value={{ profile, loading, token, pinReady, pinMode, markPinReady, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
