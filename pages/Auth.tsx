import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Mail, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

const getErrorMessage = (error: any): string => {
  if (!error) return 'Erro desconhecido';
  if (typeof error === 'string') return error;
  
  if (error.error) {
      return getErrorMessage(error.error);
  }
  
  if (error instanceof Error) return error.message;

  const message = error.message || error.error_description || error.msg || error.description;
  
  if (message) {
      if (typeof message === 'string') return message;
      try { return JSON.stringify(message); } catch { return String(message); }
  }
  
  if (error.details && typeof error.details === 'string') {
      return error.details;
  }

  if (error.code) {
      return `Erro código: ${error.code}`;
  }

  try {
      const json = JSON.stringify(error);
      if (json && json !== '{}' && json !== '[]') {
          return json.length > 200 ? json.substring(0, 200) + '...' : json;
      }
  } catch (e) { }
  
  return 'Ocorreu um erro inesperado na solicitação.';
};

const translateAuthError = (rawError: any) => {
  if (rawError?.name === 'AuthRetryableFetchError' || rawError?.message === 'Failed to fetch') {
      return 'Servidor indisponível no momento. Por favor, utilize o Modo Demonstração.';
  }

  if (rawError?.code === 'invalid_credentials') {
      return 'Email ou senha incorretos.';
  }

  const errorMessage = getErrorMessage(rawError);
  const msg = errorMessage.toLowerCase();

  if (msg.includes('invalid_credentials') || msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
    return 'Email ou senha incorretos.';
  }
  if (msg.includes('user already registered')) {
    return 'Este email já está cadastrado. Tente fazer login.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Muitas requisições. Aguarde um momento antes de tentar novamente.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Seu email ainda não foi confirmado. Verifique sua caixa de entrada.';
  }
  if (msg.includes('password should be at least')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  
  return errorMessage || 'Ocorreu um erro na solicitação. Tente novamente.';
};

export const AuthPage = ({ onDemo }: { onDemo?: () => void }) => {
  const { refreshProfile } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
            }
          }
        });
        if (authError) throw authError;

        if (authData.user && !authData.session) {
            setVerificationSent(true);
            setLoading(false);
            return;
        }

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: authData.user.id,
              name: formData.name,
              email: formData.email,
              role: 'member'
            }, { onConflict: 'id' });

          if (profileError) throw profileError;

          await refreshProfile();
        }
      }
    } catch (err: any) {
      // Suppress console error for expected auth failures (incorrect password)
      if (err?.code !== 'invalid_credentials' && !err?.message?.includes('invalid_credentials') && err?.name !== 'AuthRetryableFetchError' && err?.message !== 'Failed to fetch') {
          console.error("Auth Error Object:", JSON.stringify(err, null, 2)); 
      }
      const translatedError = translateAuthError(err);
      setError(translatedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Brand */}
        <div className="md:w-1/2 bg-blue-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
          <div className="relative z-10">
             <div className="flex items-center gap-3 mb-8">
                 <img src="https://i.postimg.cc/X7z9p7JD/LOGO-CENTRAL-PRECOS.png" className="h-12 w-auto bg-white/20 p-1 rounded-lg backdrop-blur-sm" />
                 <h1 className="text-2xl font-bold">Central de Preços</h1>
             </div>
             <h2 className="text-3xl font-bold mb-4">
               {isLogin ? 'Bem-vindo de volta!' : 'Comece a economizar hoje.'}
             </h2>
             <p className="text-blue-100 leading-relaxed">
               Gerencie cotações, analise tendências de mercado e simule preços de venda em uma única plataforma colaborativa.
             </p>
          </div>
          <div className="relative z-10 mt-8 text-sm text-blue-200">
             © 2025 MTABI Tecnologia
          </div>
        </div>

        {/* Right Side - Form or Verification Message */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
           {verificationSent ? (
               <div className="text-center animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Mail size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Verifique seu Email</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                      Enviamos um link de confirmação para<br/>
                      <span className="font-bold text-slate-900 dark:text-white">{formData.email}</span>.
                      <br/><br/>
                      Por favor, clique no link enviado para ativar sua conta e acessar a plataforma.
                  </p>
                  <button 
                      onClick={() => { setVerificationSent(false); setIsLogin(true); setError(''); }}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center justify-center gap-2 mx-auto"
                  >
                      <ArrowRight className="rotate-180" size={16} /> Voltar para o Login
                  </button>
               </div>
           ) : (
             <>
               <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
                 {isLogin ? 'Acessar Conta' : 'Criar Nova Conta'}
               </h3>

               {error && (
                 <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm mb-6 flex items-start gap-2 animate-in slide-in-from-top-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span className="flex-1 break-words">{error}</span>
                 </div>
               )}

               <form onSubmit={handleAuth} className="space-y-4">
                  {!isLogin && (
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seu Nome</label>
                       <div className="relative">
                          <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            required 
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="João Silva"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                          />
                       </div>
                    </div>
                  )}

                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Corporativo</label>
                     <div className="relative">
                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="email" 
                          required 
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="nome@empresa.com"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
                     <div className="relative">
                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type={showPassword ? "text" : "password"}
                          required 
                          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                     </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2 mt-4"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <>{isLogin ? 'Entrar' : 'Cadastrar'} <ArrowRight size={18} /></>}
                  </button>
               </form>

               <div className="mt-6 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isLogin ? 'Ainda não tem conta?' : 'Já possui cadastro?'}
                    <button 
                      type="button"
                      onClick={() => { setIsLogin(!isLogin); setError(''); }}
                      className="text-blue-600 dark:text-blue-400 font-bold ml-1 hover:underline"
                    >
                      {isLogin ? 'Crie agora' : 'Faça login'}
                    </button>
                  </p>
               </div>

               {onDemo && (
                 <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
                   <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                     Quer apenas conhecer a plataforma?
                   </p>
                   <button
                     type="button"
                     onClick={onDemo}
                     className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                   >
                     <Eye size={18} /> Acessar Modo Demonstração
                   </button>
                 </div>
               )}
             </>
           )}
        </div>
      </div>
    </div>
  );
};
