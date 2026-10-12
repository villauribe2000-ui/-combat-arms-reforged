import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

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

type AuthContextType = {
  profile: Profile | null;
  loading: boolean;
  token: string | null;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (username: string, password: string, confirmPassword: string, email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = 'https://web-production-86a0.up.railway.app';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const fetchProfile = async (authToken?: string) => {
    try {
      const tkn = authToken || localStorage.getItem('token');
      if (!tkn) {
        setProfile(null);
        setToken(null);
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
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setProfile(null);
      setToken(null);
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
      await fetchProfile(data.token);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
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
      await fetchProfile(data.token);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    setProfile(null);
    setToken(null);
  };

  const refreshProfile = async () => {
    const tkn = localStorage.getItem('token');
    if (tkn) {
      await fetchProfile(tkn);
    }
  };

  return (
    <AuthContext.Provider value={{ profile, loading, token, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
