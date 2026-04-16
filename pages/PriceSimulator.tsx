import React, { useState, useEffect, useRef } from 'react';
import { Material, Supplier, Quote, SimulationScenario } from '../types';
import { Calculator, Plus, Trash2, TrendingUp, Info, Save, FolderOpen, Printer, X, ChevronDown, Check } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Toast, ToastMessage } from '../components/Toast';
import { ConfirmationModal } from '../components/ConfirmationModal';

const formatToBRDate = (isoDate: string) => {
    if (!isoDate) return '';
    if (isoDate.includes('/')) return isoDate;
    const [y, m, d] = isoDate.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return isoDate;
};

interface PriceSimulatorProps {
  materials: Material[];
  suppliers: Supplier[];
  quotes: Quote[];
  isTutorialMode?: boolean;
}

interface SimulationRow {
  id: string;
  supplierName: string;
  price: number;
  purchaseIcms: number;
  freight?: string;
  weight?: number;
  quoteDate?: string;
}

export const PriceSimulator: React.FC<PriceSimulatorProps> = ({ materials, suppliers, quotes, isTutorialMode }) => {
  // ... (State same as original)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [targetMargin, setTargetMargin] = useState<number>(25);
  const [salesIcms, setSalesIcms] = useState<number>(17);
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null);
  
  const [savedScenarios, setSavedScenarios] = useState<SimulationScenario[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const [simulations, setSimulations] = useState<SimulationRow[]>([
    { id: '1', supplierName: '', price: 0, purchaseIcms: 0, freight: 'CIF', weight: 0, quoteDate: new Date().toLocaleDateString('pt-BR') }
  ]);

  // Confirmation Modal State
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    id: string | null;
    title: string;
    message: string;
  }>({ isOpen: false, id: null, title: '', message: '' });

  // ... (useEffect Logic same as original)
  useEffect(() => {
      const loadScenarios = async () => {
          const s = await StorageService.getSimulations();
          setSavedScenarios(s);
      };
      loadScenarios();
  }, []);

  useEffect(() => {
      if (isTutorialMode && materials.length > 0) {
          const mockMatId = 'm1'; 
          const mat = materials.find(m => m.id === mockMatId);
          if (mat && selectedMaterialId !== mockMatId) {
             setSelectedMaterialId(mockMatId);
             setTargetMargin(30);
             setSalesIcms(18);
             setSimulations([
                 { id: 'tut_1', supplierName: 'Aço Forte S.A.', price: 4.80, purchaseIcms: 12, freight: 'CIF', weight: 1000, quoteDate: new Date().toLocaleDateString('pt-BR') },
                 { id: 'tut_2', supplierName: 'Siderúrgica Nacional', price: 4.65, purchaseIcms: 12, freight: 'CIF', weight: 1000, quoteDate: new Date().toLocaleDateString('pt-BR') },
                 { id: 'tut_3', supplierName: 'Metalúrgica Global', price: 5.10, purchaseIcms: 18, freight: 'FOB', weight: 1000, quoteDate: new Date().toLocaleDateString('pt-BR') },
             ]);
          }
      }
  }, [isTutorialMode, materials]);

  useEffect(() => {
    const mat = materials.find(m => m.id === selectedMaterialId);
    if (mat) {
        setSearchTerm(mat.name);
    } else if (selectedMaterialId === '') {
        setSearchTerm('');
    }
  }, [selectedMaterialId, materials]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
            setIsSearchOpen(false);
            const mat = materials.find(m => m.id === selectedMaterialId);
            if (mat) {
                setSearchTerm(mat.name);
            } else if (selectedMaterialId === '') {
                setSearchTerm('');
            }
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedMaterialId, materials]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const addRow = () => {
    setSimulations([...simulations, { id: Date.now().toString(), supplierName: '', price: 0, purchaseIcms: 0, freight: 'CIF', weight: 0, quoteDate: new Date().toLocaleDateString('pt-BR') }]);
  };

  const removeRow = (id: string) => {
    if (simulations.length > 1) {
      setSimulations(simulations.filter(s => s.id !== id));
    }
  };

  const populateFromHistory = (matId: string) => {
    const relevantQuotes = quotes.filter(q => q.materialId === matId);
    if (relevantQuotes.length === 0) {
        setSimulations([{ id: Date.now().toString(), supplierName: '', price: 0, purchaseIcms: 0, freight: 'CIF', weight: 0, quoteDate: new Date().toLocaleDateString('pt-BR') }]);
        return;
    }
    const latestQuotesBySupplier = new Map<string, Quote>();
    relevantQuotes.forEach(q => {
        const existing = latestQuotesBySupplier.get(q.supplierId);
        if (!existing || new Date(q.date) > new Date(existing.date)) {
            latestQuotesBySupplier.set(q.supplierId, q);
        }
    });
    const newRows: SimulationRow[] = [];
    latestQuotesBySupplier.forEach((quote) => {
        const supplier = suppliers.find(s => s.id === quote.supplierId);
        const supplierName = supplier ? supplier.name : 'Desconhecido';
        newRows.push({
            id: `auto_${quote.id}_${Date.now()}`,
            supplierName: supplierName,
            price: quote.normalizedPricePerBaseUnit,
            purchaseIcms: quote.icms || 0,
            freight: quote.freight || 'CIF',
            weight: quote.quantity || 0,
            quoteDate: formatToBRDate(quote.date)
        });
    });
    setSimulations(newRows);
    showToast(`${newRows.length} fornecedores carregados do histórico.`, 'success');
  };

  const updateRow = (id: string, field: keyof SimulationRow, value: string | number) => {
    const newSimulations = simulations.map(s => {
        if (s.id === id) {
            const updatedRow = { ...s, [field]: value };
            if (field === 'supplierName' && selectedMaterialId) {
                const supplier = suppliers.find(sup => sup.name === value);
                if (supplier) {
                    const lastQuote = quotes
                        .filter(q => q.supplierId === supplier.id && q.materialId === selectedMaterialId)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    if (lastQuote) {
                        updatedRow.price = lastQuote.normalizedPricePerBaseUnit;
                        updatedRow.purchaseIcms = lastQuote.icms || 0;
                        updatedRow.freight = lastQuote.freight || 'CIF';
                        updatedRow.weight = lastQuote.quantity || 0;
                        updatedRow.quoteDate = formatToBRDate(lastQuote.date);
                    }
                }
            }
            return updatedRow;
        }
        return s;
    });
    setSimulations(newSimulations);
  };

  const calculateValues = (sim: SimulationRow) => {
    const price = sim.price || 0;
    const icms = sim.purchaseIcms || 0;
    const netPrice = price * (1 - (icms / 100));
    const priceWithMargin = netPrice / (1 - (targetMargin / 100));
    const finalSalePrice = priceWithMargin / (1 - (salesIcms / 100));
    return { netPrice, priceWithMargin, finalSalePrice };
  };

  const validSimulations = simulations.filter(s => s.price > 0);
  const minSalePrice = validSimulations.length > 0 
    ? Math.min(...validSimulations.map(s => calculateValues(s).finalSalePrice)) 
    : 0;

  const handleSaveScenario = async () => {
      if (!selectedMaterialId) {
          showToast("Selecione um material primeiro para salvar.", "error");
          return;
      }
      try {
        const newScenario: SimulationScenario = {
            id: currentScenarioId || `sim_${Date.now()}`,
            materialId: selectedMaterialId,
            targetMargin,
            rows: simulations,
            createdAt: new Date().toISOString()
        };
        await StorageService.saveSimulation(newScenario);
        const updatedList = await StorageService.getSimulations();
        setSavedScenarios(updatedList);
        setCurrentScenarioId(newScenario.id);
        showToast("Cenário salvo com sucesso!", "success");
      } catch (error) {
        showToast("Erro ao salvar cenário.", "error");
      }
  };

  const handleLoadScenario = (scenario: SimulationScenario) => {
      if (!scenario) return;
      setSelectedMaterialId(scenario.materialId);
      setTargetMargin(scenario.targetMargin);
      setSimulations(Array.isArray(scenario.rows) ? scenario.rows : []);
      setCurrentScenarioId(scenario.id);
      setShowSavedList(false);
  };

  // --- DELETE HANDLER WITH MODAL ---
  const triggerDeleteScenario = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirmationState({
          isOpen: true,
          id,
          title: 'Excluir Cenário',
          message: 'Deseja realmente excluir este cenário de simulação?'
      });
  };

  const handleConfirmDelete = async () => {
      if (!confirmationState.id) return;
      try {
          await StorageService.deleteSimulation(confirmationState.id);
          const updatedList = await StorageService.getSimulations();
          setSavedScenarios(updatedList);
          if (currentScenarioId === confirmationState.id) setCurrentScenarioId(null);
          showToast("Cenário excluído.", "success");
      } catch (error) {
          showToast("Erro ao excluir cenário.", "error");
      } finally {
          setConfirmationState({ ...confirmationState, isOpen: false });
      }
  };

  // ... (handlePrint, handleNew, styling classes - same as original)
  const handlePrint = () => {
      const element = document.getElementById('printable-dashboard');
      if (!element) return;
      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (!printWindow) { alert('Por favor, permita pop-ups para imprimir.'); return; }
      const clone = element.cloneNode(true) as HTMLElement;
      const originalInputs = element.querySelectorAll('input, select');
      const clonedInputs = clone.querySelectorAll('input, select');
      originalInputs.forEach((input, index) => {
          const clonedInput = clonedInputs[index] as HTMLInputElement | HTMLSelectElement;
          clonedInput.value = (input as HTMLInputElement).value;
          clonedInput.setAttribute('value', (input as HTMLInputElement).value);
          if (input.tagName === 'SELECT') {
               const idx = (input as HTMLSelectElement).selectedIndex;
               const options = clonedInput.querySelectorAll('option');
               if(options[idx]) options[idx].setAttribute('selected', 'selected');
          }
      });
      const materialName = materials.find(m => m.id === selectedMaterialId)?.name || 'Cenario';
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Simulação: ${materialName}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { padding: 20px; background-color: white; font-family: system-ui, -apple-system, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @media print {
                  .print\\:hidden { display: none !important; }
                  .print\\:border-none { border: none !important; }
                  .print\\:bg-transparent { background: transparent !important; }
                  input, select { border: none !important; background: transparent !important; padding: 0 !important; appearance: none; }
              }
              .print-hidden { display: none !important; }
              input, select { background: transparent; }
            </style>
          </head>
          <body>
            ${clone.innerHTML}
            <script>setTimeout(() => { window.print(); }, 800);</script>
          </body>
        </html>
      `);
      printWindow.document.close();
  };

  const handleNew = () => {
      setCurrentScenarioId(null);
      setSelectedMaterialId('');
      setSimulations([{ id: '1', supplierName: '', price: 0, purchaseIcms: 0, freight: 'CIF', weight: 0, quoteDate: new Date().toLocaleDateString('pt-BR') }]);
      setTargetMargin(25);
      setSalesIcms(17);
      setSearchTerm('');
  };

  const cardClass = "bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors print:shadow-none print:border-none print:p-0 print:mb-4";
  const inputClass = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 print:border-none print:bg-transparent print:shadow-none print:p-0 print:text-black print:font-medium";
  const labelClass = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide print:text-black";

  return (
    <div className="space-y-6 print:space-y-4" id="printable-dashboard">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={confirmationState.isOpen}
        onClose={() => setConfirmationState({ ...confirmationState, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title={confirmationState.title}
        message={confirmationState.message}
      />

      {/* ... (Action Bar & Header Inputs & Simulator Grid - same layout as original, just added modal logic) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 print:hidden">
         <div className="flex items-center gap-2">
             <Calculator className="text-blue-600" size={24} />
             <div>
                 <h2 className="text-lg font-bold text-slate-800 dark:text-white">Simulador de Preços</h2>
                 <p className="text-xs text-slate-500">Crie, salve e exporte cenários.</p>
             </div>
         </div>
         <div className="flex flex-wrap gap-2">
             <div className="relative">
                 <button onClick={() => setShowSavedList(!showSavedList)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                     <FolderOpen size={16} /> Meus Cenários
                 </button>
                 
                 {/* Saved List Dropdown - UPDATED DELETE HANDLER */}
                 {showSavedList && (
                     <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                         <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                             <span className="font-bold text-sm text-slate-800 dark:text-white">Cenários Salvos</span>
                             <button onClick={() => setShowSavedList(false)}><X size={16} className="text-slate-400" /></button>
                         </div>
                         <div className="max-h-60 overflow-y-auto">
                             {savedScenarios.length === 0 ? (
                                 <div className="p-4 text-center text-xs text-slate-400">Nenhum cenário salvo.</div>
                             ) : (
                                 savedScenarios.map(s => {
                                     const matName = materials.find(m => m.id === s.materialId)?.name || 'Material Removido';
                                     return (
                                         <div key={s.id} onClick={() => handleLoadScenario(s)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 flex justify-between items-center group">
                                             <div>
                                                 <p className="text-sm font-medium text-slate-800 dark:text-white truncate w-40">{matName}</p>
                                                 <p className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</p>
                                             </div>
                                             <button onClick={(e) => triggerDeleteScenario(s.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100">
                                                 <Trash2 size={14} />
                                             </button>
                                         </div>
                                     );
                                 })
                             )}
                         </div>
                     </div>
                 )}
             </div>

             <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                 <Plus size={16} /> Novo
             </button>
             <button onClick={handleSaveScenario} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                 <Save size={16} /> Salvar
             </button>
             <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:opacity-90 transition-colors shadow-sm">
                 <Printer size={16} /> PDF / Imprimir
             </button>
         </div>
      </div>

      {/* ... (Rest of component renders normally, inputs, grid, etc. - No logic changes required below this point, just included to complete the file) */}
      <div className={`${cardClass} flex flex-col md:flex-row gap-6 items-end`}>
        {/* ... (Same as original) ... */}
        <div className="flex-1 w-full">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1 print:text-black">
                {currentScenarioId ? 'Cenário Salvo: ' : 'Novo Cenário: '}
                {materials.find(m => m.id === selectedMaterialId)?.name || '...'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 print:hidden">Calcule o melhor preço de compra baseado na sua margem de venda.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div ref={searchWrapperRef} className="relative">
                    <label className={labelClass}>Material</label>
                    <div className="relative">
                        <input 
                            type="text"
                            className={`${inputClass} pr-8`}
                            placeholder="Selecione ou busque um material..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsSearchOpen(true);
                                if(e.target.value === '') {
                                    setSelectedMaterialId('');
                                    setSimulations([{ id: '1', supplierName: '', price: 0, purchaseIcms: 0, freight: 'CIF', weight: 0, quoteDate: new Date().toLocaleDateString('pt-BR') }]);
                                }
                            }}
                            onFocus={() => setIsSearchOpen(true)}
                        />
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none print:hidden" />
                        
                        {isSearchOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto print:hidden">
                                {materials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                                    materials
                                        .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => {
                                                    setSelectedMaterialId(m.id);
                                                    setSearchTerm(m.name);
                                                    setIsSearchOpen(false);
                                                    if (!isTutorialMode) populateFromHistory(m.id);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-between
                                                    ${selectedMaterialId === m.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}
                                                `}
                                            >
                                                {m.name}
                                                {selectedMaterialId === m.id && <Check size={14} />}
                                            </button>
                                        ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500 text-center">
                                        Nenhum material encontrado.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Margem Desejada (%)</label>
                    <div className="relative">
                        <TrendingUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 print:hidden" />
                        <input 
                            type="number" 
                            value={targetMargin}
                            onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 0)}
                            className={`${inputClass} pl-9 font-bold text-blue-600 dark:text-blue-400 print:pl-2 print:text-black`}
                        />
                    </div>
                </div>
            </div>
        </div>
        <div className="w-full md:w-auto bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700 print:bg-white print:border-gray-200">
            <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase">Parâmetros de Cálculo</span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <div className="flex justify-between items-center w-full md:w-56 gap-2">
                    <span className="whitespace-nowrap">ICMS Venda:</span>
                    <div className="relative w-20">
                        <input 
                            type="number" 
                            value={salesIcms}
                            onChange={(e) => setSalesIcms(parseFloat(e.target.value) || 0)}
                            className="w-full h-7 text-right pr-6 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none print:bg-transparent print:border-none print:text-black print:text-right print:pr-0"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 print:hidden">%</span>
                        <span className="hidden print:inline-block text-xs">%</span>
                    </div>
                </div>
                <div className="flex justify-between items-center w-full md:w-56">
                    <span>Fórmula:</span>
                    <span className="font-mono text-xs bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 print:bg-transparent print:text-black print:p-0">Inside Tax</span>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 print:grid-cols-1">
        <div className={`${cardClass} xl:col-span-7`}>
             <div className="flex justify-between items-center mb-4 print:hidden">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Calculator size={18} className="text-blue-600" />
                    Cenários de Compra
                </h3>
                <button onClick={addRow} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1">
                    <Plus size={14} /> Adicionar
                </button>
             </div>
             
             <div className="space-y-3">
                {simulations.map((sim, index) => (
                    <div key={sim.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700 relative group print:bg-white print:border-b print:border-gray-200 print:rounded-none">
                        <div className="col-span-4">
                            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block print:text-black">Fornecedor</label>
                            <input 
                                className={`${inputClass} h-9 py-1`} 
                                placeholder="Nome..."
                                value={sim.supplierName}
                                onChange={(e) => updateRow(sim.id, 'supplierName', e.target.value)}
                                list="suppliersList"
                            />
                            <datalist id="suppliersList">
                                {suppliers.map(s => <option key={s.id} value={s.name} />)}
                            </datalist>
                        </div>

                        <div className="col-span-2">
                             <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block print:text-black">Data</label>
                             <input 
                                type="text" 
                                className={`${inputClass.replace('px-3', 'px-2')} h-9 py-1 text-xs text-center`}
                                placeholder="DD/MM/AAAA"
                                value={sim.quoteDate || ''}
                                onChange={(e) => updateRow(sim.id, 'quoteDate', e.target.value)}
                             />
                        </div>

                        <div className="col-span-1">
                             <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block print:text-black">QTDE</label>
                             <input 
                                type="number" 
                                className={`${inputClass.replace('px-3', 'px-1')} h-9 py-1 text-center`}
                                placeholder="Qtd"
                                value={sim.weight || ''}
                                onChange={(e) => updateRow(sim.id, 'weight', parseFloat(e.target.value) || 0)}
                             />
                        </div>

                        <div className="col-span-2">
                             <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block print:text-black">Preço</label>
                             <input 
                                type="number" 
                                className={`${inputClass.replace('px-3', 'px-1')} h-9 py-1`}
                                placeholder="R$"
                                value={sim.price || ''}
                                onChange={(e) => updateRow(sim.id, 'price', parseFloat(e.target.value) || 0)}
                             />
                        </div>

                         <div className="col-span-1">
                             <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block print:text-black">Frete</label>
                             <select 
                                className={`${inputClass} h-9 py-1 px-1 text-center appearance-none`}
                                value={sim.freight}
                                onChange={(e) => updateRow(sim.id, 'freight', e.target.value)}
                             >
                                 <option value="CIF">CIF</option>
                                 <option value="FOB">FOB</option>
                             </select>
                        </div>

                        <div className="col-span-1">
                             <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block print:text-black">ICMS (%)</label>
                             <input 
                                type="number" 
                                className={`${inputClass} h-9 py-1 px-1 text-center`}
                                placeholder="%"
                                value={sim.purchaseIcms || ''}
                                onChange={(e) => updateRow(sim.id, 'purchaseIcms', parseFloat(e.target.value) || 0)}
                             />
                        </div>

                        <div className="col-span-1 flex justify-center pb-2 print:hidden">
                             <button onClick={() => removeRow(sim.id)} className="text-slate-400 hover:text-red-500 transition-colors" disabled={simulations.length === 1}>
                                <Trash2 size={16} />
                             </button>
                        </div>
                        <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-white flex items-center justify-center text-xs font-bold border border-white dark:border-slate-800 shadow-sm print:hidden">
                            {index + 1}
                        </span>
                    </div>
                ))}
             </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4 xl:col-span-5">
             {[...simulations]
                .sort((a, b) => {
                    const valA = calculateValues(a).finalSalePrice;
                    const valB = calculateValues(b).finalSalePrice;
                    if (!valA || valA === 0) return 1;
                    if (!valB || valB === 0) return -1;
                    return valA - valB;
                })
                .map((sim, index) => {
                 const calc = calculateValues(sim);
                 const isBest = sim.price > 0 && calc.finalSalePrice === minSalePrice;
                 
                 return (
                    <div key={sim.id} className={`p-4 pt-6 rounded-xl border transition-all duration-300 relative overflow-hidden print:break-inside-avoid ${isBest ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 shadow-md transform scale-[1.02] print:bg-white print:border-2 print:border-black' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm print:border-gray-200'}`}>
                        {isBest && (
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10 print:bg-black print:text-white">
                                MELHOR OPÇÃO
                            </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-lg print:text-black">
                                    {sim.supplierName || `Fornecedor`}
                                </h4>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-1 print:text-gray-600">
                                    {sim.quoteDate && <span>Data: <b>{sim.quoteDate}</b></span>}
                                    <span>Preço: <b>R$ {(sim.price || 0).toFixed(2)}</b></span>
                                    <span>ICMS: <b>{(sim.purchaseIcms || 0)}%</b></span>
                                    {sim.weight ? <span>Qtde: <b>{sim.weight}</b></span> : null}
                                    <span>Frete: <b>{sim.freight}</b></span>
                                </div>
                            </div>
                            <div className="text-right pt-2">
                                <span className="block text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide print:text-gray-600">Preço Venda Final</span>
                                <span className={`text-2xl font-black ${isBest ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-white'} print:text-black`}>
                                    R$ {calc.finalSalePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Visualization Bar */}
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex mb-4 print:border print:border-gray-300">
                            <div className="h-full bg-slate-400 opacity-30 print:bg-gray-300" style={{ width: '40%' }} title="Custo Líquido" />
                            <div className="h-full bg-blue-500 print:bg-gray-500" style={{ width: '30%' }} title="Margem" />
                            <div className="h-full bg-orange-500 print:bg-black" style={{ width: '30%' }} title="Impostos Saída" />
                        </div>

                        {/* Detail Grid */}
                        <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-100 dark:divide-slate-700 print:divide-gray-300">
                             <div>
                                 <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase print:text-gray-600">Custo Líquido</p>
                                 <p className="font-bold text-slate-700 dark:text-slate-200 text-sm print:text-black">R$ {calc.netPrice.toFixed(2)}</p>
                             </div>
                             <div>
                                 <p className="text-[10px] text-blue-500 uppercase font-bold print:text-black">Base c/ Margem</p>
                                 <p className="font-bold text-blue-600 dark:text-blue-400 text-sm print:text-black">R$ {calc.priceWithMargin.toFixed(2)}</p>
                             </div>
                             <div>
                                 <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase print:text-gray-600">ICMS Saída ({salesIcms}%)</p>
                                 <p className="font-bold text-slate-700 dark:text-slate-200 text-sm print:text-black">R$ {(calc.finalSalePrice - calc.priceWithMargin).toFixed(2)}</p>
                             </div>
                        </div>
                    </div>
                 );
             })}
             
             {simulations.length === 0 && (
                 <div className="text-center p-8 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                     Adicione cenários para começar a simulação.
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};
