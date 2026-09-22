import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

export interface Profile {
  id: string;
  username: string;
  NickName?: string;
  email: string;
  avatar_url: string | null;
  bio: string;
  rank: string;
  points: number;
  wins: number;
  losses: number;
  kd_ratio: number;
  cash_balance: number;
  nx: number;
  gp: number;
  is_admin: boolean;
  country: string;
  main_game: string;
  created_at: string;
  updated_at: string;
  level?: number;
  UserType?: number;
}

type AuthContextType = {
  profile: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateWallet: (amount: number) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (!token) {
          setProfile(null);
          return;
        }
      }
      const data = await api.getCurrentUser();
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Verificar si hay token guardado
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        // Obtener perfil inicial
        fetchProfile();
        setLoading(false);
        
        // Actualizar perfil cada 30 segundos para reflejar cambios de nivel, exp, etc.
        const interval = setInterval(() => {
          fetchProfile();
        }, 30000);

        return () => clearInterval(interval);
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const result = await api.login(username, password);
      // Obtener perfil después de login
      setTimeout(() => {
        fetchProfile();
      }, 100);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signUp = async (username: string, password: string, confirmPassword: string, email: string) => {
    try {
      const result = await api.signup(username, password, confirmPassword, email);
      await fetchProfile();
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signOut = async () => {
    api.logout();
    setProfile(null);
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const updateWallet = (amount: number) => {
    if (profile) {
      setProfile({
        ...profile,
        nx: (profile.nx || 0) + amount,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signUp, signOut, refreshProfile, updateWallet }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
