import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, Loader } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { signIn, signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [usernameSignUp, setUsernameSignUp] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await signIn(username, password);
      } else {
        result = await signUp(usernameSignUp, password, confirmPassword, email);
      }
      
      if (result.error) {
        setError(result.error.message || 'Error al procesar la solicitud');
      } else {
        onSuccess?.();
      }
    } catch {
      setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#111] border border-white/10 rounded-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-2 text-[#f5a000]">
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>
        <p className="text-center text-gray-400 text-sm mb-6">
          {isLogin ? (
            <>
              <div>Bienvenido a Combat Arms</div>
              <div className="text-gray-400 text-sm">Reforged</div>
            </>
          ) : (
            'Únete a la comunidad eSports'
          )}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Usuario
            </label>
            <input
              type="text"
              value={isLogin ? username : usernameSignUp}
              onChange={(e) => isLogin ? setUsername(e.target.value) : setUsernameSignUp(e.target.value)}
              placeholder="tu_usuario"
              className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#f5a000] focus:ring-1 focus:ring-[#f5a000]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#f5a000] focus:ring-1 focus:ring-[#f5a000]"
              required
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#f5a000] focus:ring-1 focus:ring-[#f5a000]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#f5a000] focus:ring-1 focus:ring-[#f5a000]"
                  required
                />
                <p className="text-gray-500 text-xs mt-2">
                  Este correo solo se puede usar en una cuenta. Máximo 2 cuentas por IP.
                </p>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f5a000] hover:bg-[#ffb21a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-2 px-4 rounded-md transition-all duration-300 flex items-center justify-center gap-2"
          >
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          {isLogin ? (
            <p className="text-gray-400 text-sm">
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="text-[#f5a000] hover:text-[#ffb21a] font-medium transition-colors cursor-pointer"
              >
                Crea una aquí
              </button>
            </p>
          ) : (
            <p className="text-gray-400 text-sm">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="text-[#f5a000] hover:text-[#ffb21a] font-medium transition-colors cursor-pointer"
              >
                Inicia sesión
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
