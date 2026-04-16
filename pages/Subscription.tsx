import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { StripeService } from '../services/stripeService';
import { Check, Shield, Zap, TrendingUp, Users, Crown, Loader2, ArrowRight } from 'lucide-react';
import { Toast, ToastMessage } from '../components/Toast';

export const SubscriptionPage = () => {
  const { profile } = useAuth();
  const [isAnnual, setIsAnnual] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Preços
  const PRICING = {
    monthly: 129,
    annualMonthly: 99, // Preço equivalente mensal no anual
    annualTotal: 1188 // 12 * 99
  };

  const handleSubscribe = async (type: 'monthly' | 'annual') => {
    setLoading(true);
    try {
      // IDs de preço do Stripe (Substituir pelos reais no futuro)
      const priceId = type === 'monthly' ? 'price_monthly_id' : 'price_annual_id';
      
      const session = await StripeService.createCheckoutSession(priceId, type === 'annual');
      
      if (session) {
          // Em produção: window.location.href = session.url;
          setToast({ message: "Redirecionando para Stripe (Checkout Simulado)...", type: 'success' });
          setTimeout(() => {
              setToast({ message: "Assinatura realizada com sucesso! (Demo)", type: 'success' });
          }, 2000);
      }
    } catch (error) {
      setToast({ message: "Erro ao iniciar pagamento. Tente novamente.", type: 'error' });
    } finally {
      setTimeout(() => setLoading(false), 2000); // Delay artificial para UX
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto pt-4">
        <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-4">
          Invista na Inteligência do seu Negócio
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Desbloqueie todo o poder da Central de Preços. Cotações ilimitadas, análise preditiva com IA e gestão completa de equipe.
        </p>
      </div>

      {/* Toggle Mensal/Anual */}
      <div className="flex justify-center mt-8">
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center relative">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 z-10 ${!isAnnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 z-10 flex items-center gap-2 ${isAnnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            Anual
            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full border border-green-200 uppercase tracking-wide">
              -23% OFF
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-8">
        
        {/* Card Mensal */}
        <div className={`bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 transition-all ${!isAnnual ? 'border-slate-300 dark:border-slate-600 shadow-xl scale-[1.02]' : 'border-slate-100 dark:border-slate-700 shadow-sm opacity-80 hover:opacity-100'}`}>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Plano Mensal</h3>
          <p className="text-slate-500 text-sm mb-6">Flexibilidade total. Cancele quando quiser.</p>
          
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-black text-slate-800 dark:text-white">R$ {PRICING.monthly}</span>
            <span className="text-slate-500">/mês</span>
          </div>

          <button 
            onClick={() => handleSubscribe('monthly')}
            disabled={loading}
            className="w-full py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-8 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Escolher Mensal'}
          </button>

          <ul className="space-y-4">
            <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Check className="text-blue-500" size={18} /> Cotações Ilimitadas
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Check className="text-blue-500" size={18} /> Acesso para 3 usuários
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Check className="text-blue-500" size={18} /> Histórico de 30 dias
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-500 line-through">
              <Zap size={18} /> IA de Análise de Mercado
            </li>
          </ul>
        </div>

        {/* Card Anual (Destaque) */}
        <div className={`bg-slate-900 dark:bg-slate-950 rounded-2xl p-8 border-2 transition-all relative overflow-hidden ${isAnnual ? 'border-blue-500 shadow-2xl shadow-blue-500/20 scale-[1.03]' : 'border-slate-800 shadow-lg'}`}>
          {isAnnual && (
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
              MAIS POPULAR
            </div>
          )}
          
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            Plano Pro <Crown size={18} className="text-yellow-400" />
          </h3>
          <p className="text-slate-400 text-sm mb-6">Máxima potência e economia para sua empresa.</p>
          
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-black text-white">R$ {PRICING.annualMonthly}</span>
            <span className="text-slate-400">/mês</span>
          </div>
          <p className="text-xs text-blue-400 font-bold mb-6">
            Faturado R$ {PRICING.annualTotal} anualmente (Economize R$ 360)
          </p>

          <button 
            onClick={() => handleSubscribe('annual')}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg hover:shadow-blue-600/30 mb-8 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Assinar Agora <ArrowRight size={18} /></>}
          </button>

          <ul className="space-y-4">
            <li className="flex items-center gap-3 text-sm text-white">
              <div className="bg-blue-500/20 p-1 rounded-full"><Check className="text-blue-400" size={14} /></div>
              Tudo do plano mensal
            </li>
            <li className="flex items-center gap-3 text-sm text-white">
              <div className="bg-blue-500/20 p-1 rounded-full"><Users className="text-blue-400" size={14} /></div>
              Usuários Ilimitados
            </li>
            <li className="flex items-center gap-3 text-sm text-white">
              <div className="bg-blue-500/20 p-1 rounded-full"><TrendingUp className="text-blue-400" size={14} /></div>
              Histórico Ilimitado
            </li>
            <li className="flex items-center gap-3 text-sm text-white font-bold">
              <div className="bg-amber-500/20 p-1 rounded-full"><Zap className="text-amber-400" size={14} /></div>
              <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
                IA de Análise & Previsão
              </span>
            </li>
            <li className="flex items-center gap-3 text-sm text-white">
              <div className="bg-blue-500/20 p-1 rounded-full"><Shield className="text-blue-400" size={14} /></div>
              Suporte Prioritário VIP
            </li>
          </ul>
        </div>

      </div>

      {/* FAQ / Trust */}
      <div className="max-w-4xl mx-auto mt-16 border-t border-slate-200 dark:border-slate-700 pt-12 pb-8">
        <h3 className="text-center font-bold text-slate-800 dark:text-white mb-8">Perguntas Frequentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2 text-sm">Posso cancelar a qualquer momento?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sim. Se cancelar, você mantém o acesso até o fim do período já pago (seja mensal ou o restante do ano).</p>
           </div>
           <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2 text-sm">Como funciona o pagamento anual?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">O valor total de R$ 1.188,00 é cobrado uma única vez no cartão, garantindo o desconto equivalente a R$ 99/mês.</p>
           </div>
           <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2 text-sm">É seguro usar cartão de crédito?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Totalmente. Usamos a Stripe, líder mundial em pagamentos. Seus dados nunca tocam nossos servidores.</p>
           </div>
           <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2 text-sm">Preciso de Nota Fiscal.</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">A Nota Fiscal é emitida automaticamente e enviada para o e-mail cadastrado após a confirmação do pagamento.</p>
           </div>
        </div>
      </div>
    </div>
  );
};
