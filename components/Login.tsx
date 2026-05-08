import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

const Login: React.FC = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'register') {
        if (!fullName.trim()) throw new Error("Por favor ingresa tu nombre completo.");
        await signUp(email, password, fullName);
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setMessage("Se ha enviado un enlace de recuperación a tu correo.");
        setTimeout(() => setMode('login'), 5000);
      }
    } catch (err: any) {
      let msg = "Ocurrió un error inesperado.";
      if (err.code === 'auth/user-not-found') msg = "Usuario no encontrado.";
      else if (err.code === 'auth/wrong-password') msg = "Contraseña incorrecta.";
      else if (err.code === 'auth/email-already-in-use') msg = "Este correo ya está registrado.";
      else if (err.code === 'auth/invalid-email') msg = "Correo electrónico inválido.";
      else if (err.code === 'auth/weak-password') msg = "La contraseña debe tener al menos 6 caracteres.";
      else msg = err.message || msg;
      
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse delay-700"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-cyan-500/10 rounded-2xl mb-4 border border-cyan-500/20">
                <LogIn className="h-8 w-8 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Analytica <span className="text-cyan-400">AI</span></h1>
            <p className="text-slate-400 font-medium">Gestión Documental & Auditoría Técnica</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700 shadow-2xl overflow-hidden transition-all duration-500">
          {/* Mode Switcher */}
          {mode !== 'forgot' && (
            <div className="flex border-b border-slate-700">
                <button 
                    onClick={() => setMode('login')}
                    className={`flex-1 py-4 text-sm font-bold transition-all ${mode === 'login' ? 'text-white border-b-2 border-cyan-400 bg-cyan-400/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    INICIAR SESIÓN
                </button>
                <button 
                    onClick={() => setMode('register')}
                    className={`flex-1 py-4 text-sm font-bold transition-all ${mode === 'register' ? 'text-white border-b-2 border-cyan-400 bg-cyan-400/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    CREAR CUENTA
                </button>
            </div>
          )}

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nombre Completo</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                      type="text" 
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Correo Electrónico</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
                    {mode === 'login' && (
                      <button 
                        type="button" 
                        onClick={() => setMode('forgot')}
                        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-tighter"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-11 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 border border-rose-400/20 p-3 rounded-xl animate-in fade-in zoom-in duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-xs font-medium">{error}</p>
                </div>
              )}

              {message && (
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 p-3 rounded-xl animate-in fade-in zoom-in duration-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <p className="text-xs font-medium">{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    {mode === 'login' ? <LogIn className="h-5 w-5" /> : mode === 'register' ? <UserPlus className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                    <span className="uppercase tracking-widest text-sm">
                      {mode === 'login' ? 'Ingresar' : mode === 'register' ? 'Crear Mi Cuenta' : 'Enviar Enlace'}
                    </span>
                  </>
                )}
              </button>

              {mode === 'forgot' && (
                <button 
                    type="button"
                    onClick={() => setMode('login')}
                    className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white text-xs font-bold transition-colors pt-2"
                >
                    <ArrowLeft className="h-3 w-3" /> VOLVER AL INICIO DE SESIÓN
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="text-center mt-8 space-y-2">
            <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">Analytica AI Dashboard v1.2</p>
            <p className="text-slate-600 text-[9px] px-8">Al continuar, aceptas nuestros términos de servicio y políticas de privacidad para el manejo de datos técnicos y auditorías.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
