import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Quotes } from './pages/Quotes';
import { MarketAnalysis } from './pages/MarketAnalysis';
import { Registries } from './pages/Registries';
import { PriceSimulator } from './pages/PriceSimulator';
import { Dashboard } from './pages/Dashboard';
import { Team } from './pages/Team';
import { AuthPage } from './pages/Auth';
import { StorageService } from './services/storageService';
import { Quote, Supplier, Material, Unit, QuoteStatus } from './types';
import { ArrowRight, ArrowLeft, CheckCircle2, X, Loader2, Minus, Maximize2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';

// --- Mock Data Generator for Tutorial ---
const generateMockData = () => {
  const companyId = 'global_aco';

  const units: Unit[] = [
    { id: 'u1', name: 'Quilograma', symbol: 'kg', conversionFactor: 1, companyId },
    { id: 'u2', name: 'Tonelada', symbol: 'ton', conversionFactor: 1000, companyId },
    { id: 'u3', name: 'Barra 12m', symbol: 'br12', conversionFactor: 12, companyId },
    { id: 'u4', name: 'Peça', symbol: 'pç', conversionFactor: 1, companyId },
  ];

  const materials: Material[] = [
    { id: 'm1', name: 'Vergalhão CA-50 10.0mm', category: 'Aço Longo', baseUnitId: 'u1', ipi: 5, companyId },
    { id: 'm2', name: 'Viga I W200x22.5', category: 'Estrutural', baseUnitId: 'u1', ipi: 5, companyId },
    { id: 'm3', name: 'Chapa Xadrez 1/4"', category: 'Planos', baseUnitId: 'u1', ipi: 5, companyId },
    { id: 'm4', name: 'Tubo Industrial Quadrado 50x50', category: 'Tubos', baseUnitId: 'u1', ipi: 5, companyId },
    { id: 'm5', name: 'Cantoneira 1.1/4" x 1/8"', category: 'Estrutural', baseUnitId: 'u3', ipi: 5, companyId },
    { id: 'm6', name: 'Tela Soldada Q138', category: 'Telas', baseUnitId: 'u4', ipi: 10, companyId },
  ];

  const suppliers: Supplier[] = [
    { id: 's1', name: 'Aço Forte S.A.', rating: 5, contactEmail: 'vendas@acoforte.com.br', salesperson: 'Carlos Silva', salespersonPhone: '11999999999', companyId },
    { id: 's2', name: 'Metalúrgica Global', rating: 4, contactEmail: 'comercial@global.com', salesperson: 'Ana Souza', salespersonPhone: '11988888888', companyId },
    { id: 's3', name: 'Distribuidora Norte', rating: 3, contactEmail: 'vendas@norte.com', salesperson: 'Roberto', salespersonPhone: '11977777777', companyId },
    { id: 's4', name: 'Siderúrgica Nacional', rating: 5, contactEmail: 'sn@siderurgica.com', salesperson: 'Fernanda', salespersonPhone: '11966666666', companyId },
    { id: 's5', name: 'Importadora do Vale', rating: 4, contactEmail: 'contato@impvale.com.br', salesperson: 'Ricardo', salespersonPhone: '11955555555', companyId },
    { id: 's6', name: 'Comercial Metálica', rating: 2, contactEmail: 'vendas@cmetalica.com', salesperson: 'Juliana', salespersonPhone: '11944444444', companyId },
  ];

  const teamMembers = [
      { id: 't1', name: 'Você (Demo Admin)', email: 'admin@demo.com', role: 'admin', company_id: companyId },
      { id: 't2', name: 'Roberto Compras', email: 'roberto@demo.com', role: 'member', company_id: companyId },
      { id: 't3', name: 'Julia Financeiro', email: 'julia@demo.com', role: 'member', company_id: companyId },
  ];

  const quotes: Quote[] = [];
  const today = new Date();
  
  // Generate robust history for "Vergalhão" to show trends in Analysis
  // INCREASED TO 730 DAYS (2 Years) to ensure "Previous Year" comparisons have data
  const basePrice = 4.80; // Price per KG
  
  for (let i = 0; i < 730; i += 7) { // Weekly quotes over 2 years
    const date = new Date(today);
    date.setDate(date.getDate() - i); // Go backwards i days
    const dateStr = date.toISOString().split('T')[0];

    // Simulate inflation/price variance over 2 years (sine wave like)
    const timeFactor = Math.sin(i / 180) * 0.5; 

    // Supplier 1: Trending Down (Winner) for Material 1
    quotes.push({
      id: `q_s1_${i}`, supplierId: 's1', materialId: 'm1', date: dateStr, quantity: 5000, unitId: 'u1',
      priceUnit: basePrice + 0.5 + timeFactor + (Math.random() * 0.1),
      priceTotal: 0, normalizedPricePerBaseUnit: 0, freight: 'CIF', deliveryDays: 5, icms: 18, ipi: 5, status: QuoteStatus.APPROVED, paymentTerms: '30dd',
      attachments: i % 2 === 0 ? [`Proposta_AcoForte_${dateStr}.pdf`, 'Certificado_Qualidade_ISO.pdf'] : [`Orcamento_${dateStr}.pdf`],
      notes: "Material de primeira linha. Entrega garantida.",
      companyId
    });

    // Supplier 2: Stable for Material 1
    quotes.push({
      id: `q_s2_${i}`, supplierId: 's2', materialId: 'm1', date: dateStr, quantity: 5000, unitId: 'u1',
      priceUnit: basePrice + 0.2 + timeFactor + (Math.random() * 0.05),
      priceTotal: 0, normalizedPricePerBaseUnit: 0, freight: 'CIF', deliveryDays: 7, icms: 18, ipi: 5, status: QuoteStatus.REJECTED, paymentTerms: '30dd',
      attachments: i % 3 === 0 ? [`Cotacao_Global_${dateStr}.pdf`] : [],
      notes: "Preço acima da média de mercado.",
      companyId
    });

    // Supplier 3: Volatile for Material 1
    if (i % 14 === 0) {
        quotes.push({
        id: `q_s3_${i}`, supplierId: 's3', materialId: 'm1', date: dateStr, quantity: 2000, unitId: 'u1',
        priceUnit: basePrice + timeFactor + (Math.random() * 0.8) - 0.2,
        priceTotal: 0, normalizedPricePerBaseUnit: 0, freight: 'FOB', deliveryDays: 2, icms: 12, ipi: 5, status: QuoteStatus.OPEN, paymentTerms: 'Avista',
        attachments: [`Print_Email_${dateStr}.jpg`],
        notes: "Oferta relâmpago via email.",
        companyId
        });
    }

    // --- Ensure enough data for Top 5 Materials Chart ---
    
    // Material 2 (High Volume) - Supplier 4
    if (i % 10 === 0) {
       quotes.push({
        id: `q_s4_m2_${i}`, supplierId: 's4', materialId: 'm2', date: dateStr, quantity: 15000, unitId: 'u1',
        priceUnit: 6.50 + timeFactor + (Math.random() * 0.2),
        priceTotal: 0, normalizedPricePerBaseUnit: 0, freight: 'CIF', deliveryDays: 10, icms: 18, ipi: 5, status: QuoteStatus.APPROVED, paymentTerms: '45dd',
        attachments: ['Contrato_Fornecimento.pdf'],
        companyId
       });
    }

    // Material 3 (Medium Volume) - Supplier 5 - FIXED: STATUS OPEN
    if (i % 14 === 0) {
       quotes.push({
        id: `q_s5_m3_${i}`, supplierId: 's5', materialId: 'm3', date: dateStr, quantity: 500, unitId: 'u1',
        priceUnit: 5.20 + timeFactor,
        priceTotal: 0, normalizedPricePerBaseUnit: 0, freight: 'FOB', deliveryDays: 3, icms: 18, ipi: 5, status: QuoteStatus.OPEN,
        paymentTerms: '28dd',
        companyId
       });
    }

    // Material 4 (Tubo) - Supplier 1 & 6
    if (i % 20 === 0) {
      quotes.push({
        id: `q_s1_m4_${i}`, supplierId: 's1', materialId: 'm4', date: dateStr, quantity: 200, unitId: 'u1',
        priceUnit: 12.50 + timeFactor, priceTotal: 0, normalizedPricePerBaseUnit: 0, freight: 'CIF', deliveryDays: 5, icms: 18, ipi: 10, status: QuoteStatus.APPROVED, paymentTerms: '30dd',
        companyId
      });
    }

    // Material 5 (Cantoneira) - Supplier 2 & 3
    if (i % 25 === 0) {
      quotes.push({
        id: `q_s2_m5_${i}`, supplierId: 's2', materialId: 'm5', date: dateStr, quantity: 50, unitId: 'u3', // Barras
        priceUnit: 85.00 + (timeFactor * 10), priceTotal: 0, normalizedPricePerBaseUnit: 0, freight: 'FOB', deliveryDays: 2, icms: 12, ipi: 5, status: QuoteStatus.APPROVED, paymentTerms: '15dd',
        companyId
      });
    }
  }

  // Calculate derived fields (Totals)
  quotes.forEach(q => {
    q.normalizedPricePerBaseUnit = q.priceUnit; // Simplified for mock
    q.priceTotal = q.quantity * q.priceUnit;
  });

  return { quotes, suppliers, materials, units, teamMembers };
};

// --- Updated Tutorial Overlay Component (Non-Obstructive) ---
const TutorialOverlay = ({ step, onNext, onPrev, onExit }: { step: number, onNext: () => void, onPrev: () => void, onExit: () => void }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const steps = [
    {
      title: "Bem-vindo à Central de Preços",
      content: "O Dashboard foi redesenhado para dar clareza imediata. Os novos gráficos de evolução com gradiente e ranking mostram onde seu dinheiro está indo e quais fornecedores dominam suas compras.",
      position: "center", // Center modal for intro
      highlight: "none"
    },
    {
      title: "Gestão de Cotações",
      content: "Centralize todas as ofertas. Use os filtros avançados no topo para encontrar exatamente o que precisa.",
      position: "top-right", // Move to top right to avoid covering the table/list
      highlight: "quotes-nav"
    },
    {
      title: "Cadastros & Contatos",
      content: "Gerencie fornecedores e materiais. A grande novidade: integração direta com WhatsApp dos vendedores.",
      position: "top-right",
      highlight: "registries-nav"
    },
    {
      title: "Inteligência de Mercado",
      content: "Visualize a tendência de preços ao longo do tempo. Identifique o momento exato em que um fornecedor se torna mais competitivo.",
      position: "bottom-right", // Chart is usually in the middle/top
      highlight: "analysis-nav"
    },
    {
      title: "Simulador de Preços",
      content: "Calcule sua margem de revenda com precisão. O sistema sugere o preço de compra baseado no histórico.",
      position: "top-right",
      highlight: "simulator-nav"
    },
    {
      title: "Sua Equipe (B2B)",
      content: "Crie sua organização, faça upload do logo da empresa e convide membros. Todos os dados são sincronizados em tempo real.",
      position: "center",
      highlight: "team-nav"
    }
  ];

  const current = steps[step];

  // Helper for dynamic positioning classes
  const getPositionClasses = (pos: string) => {
    switch (pos) {
      case 'center':
        // REMOVED 'bg-black/60 backdrop-blur-sm' to allow seeing the dashboard
        return "fixed inset-0 z-50 flex items-center justify-center p-4";
      case 'top-right':
        return "fixed top-20 right-4 md:right-8 z-50 w-[90%] md:w-[400px]";
      case 'bottom-right':
        return "fixed bottom-20 right-4 md:right-8 z-50 w-[90%] md:w-[400px]";
      case 'bottom-center':
        return "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] md:w-[500px]";
      default:
        return "fixed bottom-10 right-10 z-50 w-[90%] md:w-[400px]";
    }
  };

  const containerClass = isMinimized 
    ? "fixed bottom-6 right-6 z-50 w-auto" // Minimized state always bottom-right
    : getPositionClasses(current.position);

  if (isMinimized) {
    return (
      <div className={containerClass}>
        <button 
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 border-2 border-white animate-in slide-in-from-bottom-5"
          title="Continuar Tutorial"
        >
          <Maximize2 size={24} />
          <span className="sr-only">Expandir Tutorial</span>
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
            {step + 1}
          </span>
        </button>
      </div>
    );
  }

  // Inner Card Content
  // Added extra shadow and border for center position to pop without backdrop
  const cardStyleClass = current.position === 'center' 
      ? 'max-w-md w-full border-blue-500/30 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] dark:shadow-[0_0_40px_-10px_rgba(0,0,0,0.8)]' 
      : 'w-full';

  const CardContent = () => (
    <div className={`bg-slate-900/95 text-white p-6 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300 relative ${cardStyleClass}`}>
      
      {/* Header Actions */}
      <div className="flex justify-between items-start mb-3">
        <span className="bg-blue-600/90 text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wider shadow-sm">
          Passo {step + 1} de {steps.length}
        </span>
        <div className="flex gap-2">
           <button onClick={() => setIsMinimized(true)} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded">
              <Minus size={18} />
           </button>
          <button onClick={onExit} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded">
             <X size={18} />
          </button>
        </div>
      </div>
      
      <h3 className="text-lg font-bold mb-2 text-blue-300">{current.title}</h3>
      <p className="text-slate-300 text-sm leading-relaxed mb-6">
        {current.content}
      </p>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center gap-3">
         <button 
             onClick={onExit}
             className="text-xs text-slate-500 hover:text-slate-300 underline"
           >
             Pular
         </button>
         
         <div className="flex gap-2">
            {step > 0 && (
                <button 
                onClick={onPrev}
                className="flex items-center gap-2 bg-slate-800 text-white px-3 py-2 rounded-lg font-medium hover:bg-slate-700 transition-colors border border-slate-600 text-xs"
              >
                <ArrowLeft size={14} /> Anterior
              </button>
            )}
            
            {step < steps.length - 1 ? (
              <button 
                onClick={onNext}
                className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-lg font-bold hover:bg-slate-200 transition-colors shadow-lg active:scale-95 text-xs"
              >
                Próximo <ArrowRight size={14} />
              </button>
            ) : (
              <button 
                onClick={onExit}
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-600 transition-colors shadow-lg active:scale-95 text-xs"
              >
                <CheckCircle2 size={14} /> Concluir
              </button>
            )}
         </div>
      </div>
    </div>
  );

  return (
    <div className={containerClass}>
       <CardContent />
    </div>
  );
};

// Main App Component with Auth Logic
const MainApp = () => {
  const { session, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (localStorage.getItem('theme') === 'dark') return true;
    if (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
    return false;
  });

  // Tutorial State
  const [isTutorialMode, setIsTutorialMode] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const stepTabs = ['dashboard', 'quotes', 'registries', 'analysis', 'simulator', 'team'];

  // Initialize with Empty Data and Load Real Data
  const [data, setData] = useState<{
    quotes: Quote[];
    suppliers: Supplier[];
    materials: Material[];
    units: Unit[];
    teamMembers: any[];
  }>({
    quotes: [],
    suppliers: [],
    materials: [],
    units: [],
    teamMembers: []
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Load Real Data from Supabase
  const loadData = async () => {
    try {
        const [quotes, suppliers, materials, units] = await Promise.all([
            StorageService.getQuotes(),
            StorageService.getSuppliers(),
            StorageService.getMaterials(),
            StorageService.getUnits()
        ]);

        setData(prev => ({ ...prev, quotes, suppliers, materials, units }));
    } catch (e) {
        console.error("Failed to load real data", e);
    }
  };

  // Load data only when authenticated AND company ID exists
  useEffect(() => {
    if (session && profile?.companyId) {
       loadData();
    }
  }, [session, profile?.companyId]);

  // REDIRECT TO TEAM IF ORPHAN (No Company)
  useEffect(() => {
      if (session && !authLoading && profile && !profile.companyId && activeTab !== 'team') {
          setActiveTab('team');
      }
  }, [session, authLoading, profile, activeTab]);

  // --- Tutorial Handlers ---
  const handleStartTutorial = () => {
    setIsTutorialMode(true);
    setTutorialStep(0);
    setActiveTab('dashboard'); // Start at dashboard
    
    // Swap data with Mock Data
    const mock = generateMockData();
    setData(mock);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddMaterial = (material: Material) => {
    setData(prev => ({
      ...prev,
      materials: [...prev.materials, material].sort((a, b) => a.name.localeCompare(b.name))
    }));
  };

  const handleAddSupplier = (supplier: Supplier) => {
    setData(prev => ({
      ...prev,
      suppliers: [...prev.suppliers, supplier].sort((a, b) => a.name.localeCompare(b.name))
    }));
  };

  const handleAddUnit = (unit: Unit) => {
    setData(prev => ({
      ...prev,
      units: [...prev.units, unit].sort((a, b) => a.name.localeCompare(b.name))
    }));
  };

  const handleAddQuotes = (newQuotes: Quote[]) => {
    setData(prev => ({
      ...prev,
      quotes: [...newQuotes, ...prev.quotes]
    }));
  };

  const handleAddQuote = (quote: Quote) => {
    setData(prev => ({
      ...prev,
      quotes: [quote, ...prev.quotes]
    }));
  };

  const handleNextStep = () => {
    const nextStep = tutorialStep + 1;
    setTutorialStep(nextStep);
    
    // Map steps to tabs
    if (stepTabs[nextStep]) {
      setActiveTab(stepTabs[nextStep]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
      const prevStep = tutorialStep - 1;
      if (prevStep >= 0) {
          setTutorialStep(prevStep);
          // Map steps to tabs
          if (stepTabs[prevStep]) {
            setActiveTab(stepTabs[prevStep]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
      }
  };

  const handleEndTutorial = () => {
    setIsTutorialMode(false);
    setTutorialStep(0);
    setActiveTab('dashboard');
    // Reload real data when tutorial ends (if logged in and has company)
    if (session && profile?.companyId) loadData();
    else if (!session) window.location.reload(); // Reload to clear if guest
  };

  if (authLoading) {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-500 gap-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-sm font-medium animate-pulse">Iniciando sistema...</p>
        </div>
    );
  }

  // AUTH PROTECTION: If not logged in and not in tutorial mode, show auth page
  if (!session && !isTutorialMode) {
      return <AuthPage onDemo={handleStartTutorial} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            quotes={data.quotes} 
            suppliers={data.suppliers} 
            materials={data.materials}
            units={data.units}
            onNavigate={setActiveTab} 
          />
        );
      case 'registries':
        return (
          <Registries 
            suppliers={data.suppliers}
            materials={data.materials}
            units={data.units}
            refreshData={isTutorialMode ? () => {} : loadData}
            onAddMaterial={handleAddMaterial}
            onAddSupplier={handleAddSupplier}
            onAddUnit={handleAddUnit}
          />
        );
      case 'quotes':
        return (
          <Quotes 
            quotes={data.quotes} 
            suppliers={data.suppliers} 
            materials={data.materials} 
            units={data.units}
            refreshData={isTutorialMode ? () => {} : loadData}
            onAddMaterial={handleAddMaterial}
            onAddSupplier={handleAddSupplier}
            onAddUnit={handleAddUnit}
            onAddQuotes={handleAddQuotes}
            isTutorialMode={isTutorialMode}
          />
        );
      case 'analysis':
        return (
          <MarketAnalysis 
            quotes={data.quotes} 
            materials={data.materials} 
            suppliers={data.suppliers}
            isTutorialMode={isTutorialMode}
          />
        );
      case 'simulator':
        return (
          <PriceSimulator 
            materials={data.materials}
            suppliers={data.suppliers}
            quotes={data.quotes}
            isTutorialMode={isTutorialMode}
          />
        );
      case 'team':
        return (
            <Team 
                isTutorialMode={isTutorialMode} 
                mockMembers={data.teamMembers} 
            />
        );
      default:
        return (
          <Dashboard 
            quotes={data.quotes} 
            suppliers={data.suppliers} 
            materials={data.materials}
            units={data.units}
            onNavigate={setActiveTab}
          />
        );
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      isDarkMode={isDarkMode} 
      toggleTheme={toggleTheme}
      onStartTutorial={handleStartTutorial}
      isTutorialMode={isTutorialMode}
    >
      {/* Banner for Tutorial Mode */}
      {isTutorialMode && (
         <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-full text-amber-600 dark:text-amber-200">
                <CheckCircle2 size={24} />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-amber-800 dark:text-amber-100">Modo de Demonstração Ativo</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">Você está visualizando dados fictícios para fins de treinamento. Nenhuma alteração será salva.</p>
            </div>
            <button 
              onClick={handleEndTutorial}
              className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Sair do Tutorial
            </button>
         </div>
      )}
      
      {renderContent()}

      {isTutorialMode && (
        <TutorialOverlay 
           step={tutorialStep} 
           onNext={handleNextStep}
           onPrev={handlePrevStep}
           onExit={handleEndTutorial} 
        />
      )}
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}