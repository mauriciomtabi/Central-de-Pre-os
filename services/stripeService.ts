import { supabase } from "../lib/supabase";

export const StripeService = {
  /**
   * Cria uma sessão de checkout no Stripe.
   * No ambiente real, isso chama uma Supabase Edge Function.
   */
  createCheckoutSession: async (priceId: string, isAnnual: boolean): Promise<{ url: string } | null> => {
    try {
      // --- CÓDIGO REAL (Para quando configurar a Edge Function) ---
      /*
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, isAnnual }
      });

      if (error) throw error;
      return data; 
      */

      // --- SIMULAÇÃO (Para demonstração de UI) ---
      console.log(`Iniciando checkout para plano: ${isAnnual ? 'Anual' : 'Mensal'} (${priceId})`);
      
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simula sucesso retornando uma URL fictícia ou null para tratar no frontend
      // Retornaremos null aqui para que o Frontend mostre apenas o Toast de sucesso/simulação
      return { url: 'https://checkout.stripe.com/mock-demo-url' };

    } catch (error) {
      console.error("Erro ao criar checkout:", error);
      throw error;
    }
  },

  /**
   * Abre o portal do cliente para gerenciar assinatura.
   */
  openCustomerPortal: async () => {
    // Similar ao checkout, chama uma Edge Function
    console.log("Abrindo portal do cliente...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { url: 'https://billing.stripe.com/p/login/mock' };
  }
};
