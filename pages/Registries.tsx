import React, { useState, useMemo } from 'react';
import { Supplier, Material, Unit } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Building2, Package, Save, CheckCircle2, Pencil, X, Loader2, Trash2, Search, Filter, ChevronDown, List, User, Phone, Share2, FileText } from 'lucide-react';
import { Toast, ToastMessage } from '../components/Toast';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface RegistriesProps {
  suppliers: Supplier[];
  materials: Material[];
  units: Unit[];
  refreshData: () => void;
}

// ... (Helper UUID and Icon components same as original)
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const WhatsAppIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const QuickAddModal = ({ title, onClose, children }: { title: string, onClose: () => void, children?: React.ReactNode }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
        <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">
          <X size={20} />
        </button>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  </div>
);

export const Registries: React.FC<RegistriesProps> = ({ suppliers, materials, units, refreshData }) => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'materials'>('suppliers');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Optimistic UI State for Instant Feedback
  const [optimisticSuppliers, setOptimisticSuppliers] = useState<Supplier[]>(suppliers);
  const [optimisticMaterials, setOptimisticMaterials] = useState<Material[]>(materials);

  React.useEffect(() => { setOptimisticSuppliers(suppliers); }, [suppliers]);
  React.useEffect(() => { setOptimisticMaterials(materials); }, [materials]);
  
  // Confirmation Modal State
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    type: 'DELETE_SUPPLIER' | 'DELETE_MATERIAL' | 'DELETE_CATEGORY' | null;
    id: string | null;
    title: string;
    message: string;
  }>({ isOpen: false, type: null, id: null, title: '', message: '' });

  // New Unit Modal State
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: '', symbol: '', conversionFactor: 1 });

  // Category Management Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Filters State
  const [materialSearch, setMaterialSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Supplier Form
  const [supForm, setSupForm] = useState({ name: '', email: '', rating: 5, salesperson: '', salespersonPhone: '', notes: '' });
  
  // Material Form
  const [matForm, setMatForm] = useState({ name: '', category: '', baseUnitId: 'u1', ipi: 0 });
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // ... (Computed Values: uniqueCategories, filteredMaterials, filteredSuppliers - same as original)
  const uniqueCategories = useMemo(() => {
    const baseCats = optimisticMaterials.map(m => m.category).filter(Boolean);
    const allCategories = [...baseCats, ...customCategories];
    return Array.from(new Set(allCategories)).sort();
  }, [optimisticMaterials, customCategories]);

  const filteredMaterials = useMemo(() => {
    return optimisticMaterials.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(materialSearch.toLowerCase());
        const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
  }, [optimisticMaterials, materialSearch, categoryFilter]);

  const filteredSuppliers = useMemo(() => {
     return optimisticSuppliers.filter(s => s.name.toLowerCase().includes(materialSearch.toLowerCase()));
  }, [optimisticSuppliers, materialSearch]);

  const resetForms = () => {
    setSupForm({ name: '', email: '', rating: 5, salesperson: '', salespersonPhone: '', notes: '' });
    setMatForm({ name: '', category: '', baseUnitId: 'u1', ipi: 0 });
    setEditingId(null);
    setIsCustomCategory(false);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const handleEditSupplier = (s: Supplier) => {
    setSupForm({ 
      name: s.name, 
      email: s.contactEmail, 
      rating: s.rating, 
      salesperson: s.salesperson || '',
      salespersonPhone: s.salespersonPhone || '',
      notes: s.notes || ''
    });
    setEditingId(s.id);
    setActiveTab('suppliers');
  };

  const triggerDeleteSupplier = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmationState({
        isOpen: true,
        type: 'DELETE_SUPPLIER',
        id,
        title: 'Excluir Fornecedor',
        message: 'Tem certeza que deseja excluir este fornecedor? Todas as cotações associadas a ele também serão removidas do sistema.'
    });
  };

  const handleEditMaterial = (m: Material) => {
    setMatForm({ name: m.name, category: m.category, baseUnitId: m.baseUnitId, ipi: m.ipi || 0 });
    setEditingId(m.id);
    setActiveTab('materials');
    setIsCustomCategory(false); 
  };

  const triggerDeleteMaterial = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirmationState({
        isOpen: true,
        type: 'DELETE_MATERIAL',
        id,
        title: 'Excluir Material',
        message: 'Tem certeza que deseja excluir este material? Todas as cotações e simulações associadas serão removidas permanentemente.'
    });
  };

  const handleConfirmAction = async () => {
      if (!confirmationState.id) return;
      
      const targetId = confirmationState.id;
      const type = confirmationState.type;
      
      try {
          if (type === 'DELETE_SUPPLIER') {
              setOptimisticSuppliers(prev => prev.filter(s => s.id !== targetId));
              StorageService.deleteSupplier(targetId)
                  .then(() => refreshData())
                  .catch(() => { showToast('Erro ao excluir fornecedor.', 'error'); refreshData(); });
              resetForms();
              showToast('Fornecedor excluído com sucesso!', 'success');
          } else if (type === 'DELETE_MATERIAL') {
              setOptimisticMaterials(prev => prev.filter(m => m.id !== targetId));
              StorageService.deleteMaterial(targetId)
                  .then(() => refreshData())
                  .catch(() => { showToast('Erro ao excluir material.', 'error'); refreshData(); });
              resetForms();
              showToast('Material excluído com sucesso!', 'success');
          } else if (type === 'DELETE_CATEGORY') {
              setOptimisticMaterials(prev => prev.map(m => m.category === targetId ? { ...m, category: 'Geral' } : m));
              StorageService.deleteCategory(targetId)
                  .then(() => refreshData())
                  .catch(() => { showToast('Erro ao excluir categoria.', 'error'); refreshData(); });
              showToast('Categoria excluída com sucesso!', 'success');
              
              if (matForm.category === targetId) {
                  setMatForm(prev => ({ ...prev, category: '' }));
              }
              if (categoryFilter === targetId) {
                  setCategoryFilter('ALL');
              }
          }
      } catch (error) {
          showToast('Erro ao realizar a ação. Verifique dependências.', 'error');
      } finally {
          setConfirmationState({ ...confirmationState, isOpen: false });
      }
  };

  const handleOpenWhatsApp = (phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${finalPhone}`;
    window.open(url, '_blank');
  };

  const handleSharePhone = async (supplierName: string, phone: string) => {
    if (!phone) return;
    try {
        if (navigator.share) {
            await navigator.share({
                title: `Contato - ${supplierName}`,
                text: `Telefone do vendedor da ${supplierName}: ${phone}`,
            });
        } else {
            await navigator.clipboard.writeText(phone);
            showToast('Telefone copiado para a área de transferência!', 'success');
        }
    } catch (error) {
        console.error('Error sharing:', error);
    }
  };

  // ... (handleSaveSupplier, handleSaveMaterial, handleSaveUnit - same as original)
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
        if (editingId) {
           const updatedSup: Supplier = {
             id: editingId,
             name: supForm.name,
             contactEmail: supForm.email,
             rating: supForm.rating,
             salesperson: supForm.salesperson,
             salespersonPhone: supForm.salespersonPhone,
             notes: supForm.notes
           };
           setOptimisticSuppliers(prev => prev.map(s => s.id === editingId ? updatedSup : s));
           showToast('Fornecedor atualizado com sucesso!', 'success');
           StorageService.updateSupplier(updatedSup)
              .then(() => refreshData())
              .catch(() => { showToast('Erro ao atualizar fornecedor no banco.', 'error'); refreshData(); });
        } else {
           const newSup: Supplier = {
             id: generateUUID(),
             name: supForm.name,
             contactEmail: supForm.email,
             rating: supForm.rating,
             salesperson: supForm.salesperson,
             salespersonPhone: supForm.salespersonPhone,
             notes: supForm.notes
           };
           setOptimisticSuppliers(prev => [...prev, newSup]);
           showToast('Fornecedor cadastrado com sucesso!', 'success');
           StorageService.addSupplier(newSup)
              .then(() => refreshData())
              .catch(() => { showToast('Erro ao cadastrar fornecedor no banco.', 'error'); refreshData(); });
        }
        
        resetForms();
        setMaterialSearch('');
    } catch (error) {
        console.error(error);
        showToast('Erro ao preparar fornecedor.', 'error');
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
        if (editingId) {
            const updatedMat: Material = {
                id: editingId,
                name: matForm.name,
                category: matForm.category,
                baseUnitId: matForm.baseUnitId,
                ipi: matForm.ipi
            };
            setOptimisticMaterials(prev => prev.map(m => m.id === editingId ? updatedMat : m));
            showToast('Material atualizado com sucesso!', 'success');
            StorageService.updateMaterial(updatedMat)
                .then(() => refreshData())
                .catch(() => { showToast('Erro ao atualizar material no banco.', 'error'); refreshData(); });
        } else {
            const newMat: Material = {
                id: generateUUID(),
                name: matForm.name,
                category: matForm.category,
                baseUnitId: matForm.baseUnitId,
                ipi: matForm.ipi
            };
            setOptimisticMaterials(prev => [...prev, newMat]);
            showToast('Material cadastrado com sucesso!', 'success');
            StorageService.addMaterial(newMat)
                .then(() => refreshData())
                .catch(() => { showToast('Erro ao cadastrar material no banco.', 'error'); refreshData(); });
        }

        resetForms();
        setMaterialSearch('');
        setCategoryFilter('ALL');
    } catch (error) {
        console.error(error);
        showToast('Erro ao preparar material.', 'error');
    }
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const u = { 
            id: generateUUID(), 
            name: newUnit.name, 
            symbol: newUnit.symbol, 
            conversionFactor: newUnit.conversionFactor 
        };
        StorageService.addUnit(u)
            .then(() => refreshData())
            .catch(() => { showToast('Erro ao adicionar unidade no banco.', 'error'); refreshData(); });
            
        setNewUnit({ name: '', symbol: '', conversionFactor: 1 });
        setShowUnitModal(false);
        setMatForm(prev => ({ ...prev, baseUnitId: u.id }));
        showToast('Unidade de medida adicionada!', 'success');
    } catch (error) {
        showToast('Erro ao preparar unidade.', 'error');
    }
  };

  const handleAddCustomCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (trimmed && !uniqueCategories.includes(trimmed)) {
        setCustomCategories(prev => [...prev, trimmed]);
        setNewCategoryInput('');
        showToast('Categoria adicionada!', 'success');
    }
  };

  const handleUpdateCategory = async (oldCategory: string) => {
    const trimmedNewCat = editedCategoryName.trim();
    if (!trimmedNewCat || trimmedNewCat === oldCategory) {
        setEditingCategory(null);
        return;
    }
    
    try {
        setOptimisticMaterials(prev => prev.map(m => m.category === oldCategory ? { ...m, category: trimmedNewCat } : m));
        
        StorageService.updateCategory(oldCategory, trimmedNewCat)
            .then(() => refreshData())
            .catch(() => { showToast('Erro ao atualizar categoria no banco.', 'error'); refreshData(); });
            
        setEditingCategory(null);
        showToast('Categoria atualizada com sucesso!', 'success');
        
        // Update form if it was using the old category
        if (matForm.category === oldCategory) {
            setMatForm(prev => ({ ...prev, category: trimmedNewCat }));
        }
        if (categoryFilter === oldCategory) {
            setCategoryFilter(trimmedNewCat);
        }
    } catch (error) {
        showToast('Erro ao preparar atualização de categoria.', 'error');
    }
  };

  const triggerDeleteCategory = (category: string) => {
    setConfirmationState({
        isOpen: true,
        type: 'DELETE_CATEGORY',
        id: category,
        title: 'Excluir Categoria',
        message: `Tem certeza que deseja excluir a categoria "${category}"? Os materiais desta categoria serão movidos para "Geral".`
    });
  };

  // ... (Styles same as original)
  const inputClass = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500";
  const labelClass = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide";
  const cardClass = "bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors";
  const modalInputClass = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-3 placeholder-slate-400 dark:placeholder-slate-500";

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={confirmationState.isOpen}
        onClose={() => setConfirmationState({ ...confirmationState, isOpen: false })}
        onConfirm={handleConfirmAction}
        title={confirmationState.title}
        message={confirmationState.message}
      />

      {/* ... (Action Bar / Tabs - same as original) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
        <div>
           <h2 className="text-lg font-bold text-slate-800 dark:text-white">Gerenciar Cadastros</h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Adicione e edite fornecedores e materiais.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
           <button 
             onClick={() => { setActiveTab('suppliers'); resetForms(); setMaterialSearch(''); }}
             className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
               activeTab === 'suppliers' 
               ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' 
               : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
             }`}
           >
             <Building2 size={16} />
             Fornecedores
           </button>
           <button 
             onClick={() => { setActiveTab('materials'); resetForms(); setMaterialSearch(''); }}
             className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
               activeTab === 'materials' 
               ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' 
               : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
             }`}
           >
             <Package size={16} />
             Materiais
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column (Left - 4 cols) - Identical to original */}
        <div className={`lg:col-span-4 ${cardClass} h-fit`}>
          {/* ... (Form Content) */}
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
             <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${editingId ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                    {editingId ? <Pencil size={20} /> : <Plus size={20} />}
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    {editingId 
                        ? (activeTab === 'suppliers' ? 'Editar Fornecedor' : 'Editar Material') 
                        : (activeTab === 'suppliers' ? 'Novo Fornecedor' : 'Novo Material')
                    }
                </h3>
             </div>
             {editingId && (
                 <button onClick={resetForms} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors">
                     <X size={16} /> Cancelar
                 </button>
             )}
          </div>
          
          {activeTab === 'suppliers' ? (
            <form onSubmit={handleSaveSupplier} className="space-y-5">
              <div>
                <label className={labelClass}>Nome da Empresa</label>
                <input required className={inputClass} placeholder="Ex: Gerdau Aços" value={supForm.name} onChange={e => setSupForm({...supForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass}>Nome do Vendedor</label>
                    <input className={inputClass} placeholder="Ex: João" value={supForm.salesperson} onChange={e => setSupForm({...supForm, salesperson: e.target.value})} />
                </div>
                <div>
                    <label className={labelClass}>Telefone Vendedor</label>
                    <input className={inputClass} placeholder="(xx) 9..." value={supForm.salespersonPhone} onChange={e => setSupForm({...supForm, salespersonPhone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email de Contato</label>
                <input type="email" className={inputClass} placeholder="vendas@empresa.com" value={supForm.email} onChange={e => setSupForm({...supForm, email: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Avaliação Inicial (1-5)</label>
                <input required type="number" min="1" max="5" className={inputClass} value={supForm.rating} onChange={e => setSupForm({...supForm, rating: Number(e.target.value)})} />
              </div>
              <div>
                <label className={labelClass}>Observações</label>
                <textarea 
                    className={inputClass} 
                    placeholder="Informações adicionais, condições especiais..." 
                    rows={3}
                    value={supForm.notes} 
                    onChange={e => setSupForm({...supForm, notes: e.target.value})} 
                />
              </div>
              <button disabled={isLoading} type="submit" className={`w-full py-2.5 rounded-lg text-sm font-medium shadow-md flex justify-center items-center gap-2 transition-all disabled:opacity-50 ${editingId ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}`}>
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
                {editingId ? 'Atualizar Fornecedor' : 'Salvar Fornecedor'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSaveMaterial} className="space-y-5">
              <div>
                <label className={labelClass}>Nome do Material</label>
                <input required className={inputClass} placeholder="Ex: Barra Chata 1/4" value={matForm.name} onChange={e => setMatForm({...matForm, name: e.target.value})} />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                    <label className={labelClass.replace('mb-1.5', '')}>Categoria</label>
                    <div className="flex gap-2">
                        <button 
                            type="button" 
                            onClick={() => setShowCategoryModal(true)} 
                            className="text-[10px] text-slate-600 dark:text-slate-400 hover:underline font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded"
                        >
                            Gerenciar
                        </button>
                        <button 
                            type="button" 
                            onClick={() => {
                                setIsCustomCategory(!isCustomCategory);
                                setMatForm({...matForm, category: ''}); // Clear on toggle
                            }} 
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded"
                        >
                            {isCustomCategory ? 'Selecionar Existente' : '+ Nova Categoria'}
                        </button>
                    </div>
                </div>
                
                {isCustomCategory ? (
                    <div className="relative animate-in fade-in slide-in-from-left-2">
                        <input 
                            required 
                            className={inputClass} 
                            placeholder="Digite a nova categoria..." 
                            value={matForm.category} 
                            onChange={e => setMatForm({...matForm, category: e.target.value})}
                            autoFocus 
                        />
                    </div>
                ) : (
                    <div className="relative">
                         <select 
                            required 
                            className={`${inputClass} appearance-none`} 
                            value={matForm.category} 
                            onChange={e => setMatForm({...matForm, category: e.target.value})}
                        >
                            <option value="">Selecione...</option>
                            {uniqueCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                    <label className={labelClass.replace('mb-1.5', '')}>Unidade Base de Controle</label>
                    <button type="button" onClick={() => setShowUnitModal(true)} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                        + Nova Unidade
                    </button>
                </div>
                <select required className={inputClass} value={matForm.baseUnitId} onChange={e => setMatForm({...matForm, baseUnitId: e.target.value})}>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>IPI Padrão (%)</label>
                <input 
                    type="number" 
                    step="0.1" 
                    className={inputClass} 
                    placeholder="Ex: 5" 
                    value={matForm.ipi} 
                    onChange={e => setMatForm({...matForm, ipi: parseFloat(e.target.value) || 0})} 
                />
              </div>

              <button disabled={isLoading} type="submit" className={`w-full py-2.5 rounded-lg text-sm font-medium shadow-md flex justify-center items-center gap-2 transition-all disabled:opacity-50 ${editingId ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}`}>
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {editingId ? 'Atualizar Material' : 'Salvar Material'}
              </button>
            </form>
          )}
        </div>

        {/* List Column (Right - 8 cols) - REPLACED DELETE BUTTON HANDLER */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full min-h-[500px]">
          {/* ... (List Header & Filters) */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-slate-400 dark:text-slate-500" />
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">
                {activeTab === 'suppliers' ? 'Lista de Fornecedores' : 'Lista de Materiais'}
                </h3>
            </div>

            {/* Filters (Visible Only for Materials) */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={activeTab === 'materials' ? "Buscar material..." : "Buscar fornecedor..."}
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                    />
                </div>
                
                {activeTab === 'materials' && (
                     <div className="relative w-36 sm:w-40">
                        <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                            className="w-full pl-8 pr-6 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none dark:text-white cursor-pointer"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="ALL">Todas Categorias</option>
                            {uniqueCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[600px]">
             <table className="w-full text-sm text-left">
               <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                 {activeTab === 'suppliers' ? (
                   filteredSuppliers.map(s => (
                     <tr key={s.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${editingId === s.id ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                       <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                          {s.name}
                          <div className="flex flex-col gap-0.5 mt-1">
                             <div className="text-xs font-normal text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <User size={10} /> {s.salesperson || 'Vendedor N/I'}
                             </div>
                             {s.salespersonPhone && (
                                 <div className="text-xs font-normal text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <Phone size={10} /> {s.salespersonPhone}
                                    </div>
                                    <button 
                                        onClick={() => handleOpenWhatsApp(s.salespersonPhone)}
                                        className="text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 p-1 rounded transition-colors"
                                        title="Abrir WhatsApp"
                                    >
                                        <WhatsAppIcon size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleSharePhone(s.name, s.salespersonPhone)}
                                        className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded transition-colors"
                                        title="Compartilhar contato"
                                    >
                                        <Share2 size={14} />
                                    </button>
                                 </div>
                             )}
                             {s.notes && (
                                 <div className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-1 flex items-start gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded max-w-xs truncate" title={s.notes}>
                                     <FileText size={10} className="mt-0.5 shrink-0" /> {s.notes}
                                 </div>
                             )}
                          </div>
                       </td>
                       <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{s.contactEmail || '-'}</td>
                       <td className="px-6 py-4 text-yellow-500 tracking-widest text-right">{'★'.repeat(Math.round(s.rating || 0))}</td>
                       <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handleEditSupplier(s)} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-all">
                                <Pencil size={16} />
                            </button>
                            <button onClick={(e) => triggerDeleteSupplier(s.id, e)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all">
                                <Trash2 size={16} />
                            </button>
                          </div>
                       </td>
                     </tr>
                   ))
                 ) : (
                   filteredMaterials.map(m => (
                     <tr key={m.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${editingId === m.id ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                       <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                           {m.name}
                           <div className="text-xs font-normal text-slate-400 mt-1">IPI: {m.ipi || 0}%</div>
                       </td>
                       <td className="px-6 py-4 text-right">
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300">
                               {m.category}
                           </span>
                       </td>
                       <td className="px-4 py-4 text-right">
                           <div className="flex justify-end gap-1">
                              <button onClick={() => handleEditMaterial(m)} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-all">
                                  <Pencil size={16} />
                              </button>
                              <button onClick={(e) => triggerDeleteMaterial(m.id, e)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all">
                                <Trash2 size={16} />
                              </button>
                           </div>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
             
             {/* Empty States */}
             {activeTab === 'materials' && filteredMaterials.length === 0 && (
                 <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                    {materialSearch || categoryFilter !== 'ALL' ? 'Nenhum material encontrado com estes filtros.' : 'Nenhum material cadastrado.'}
                 </div>
             )}
             {activeTab === 'suppliers' && filteredSuppliers.length === 0 && (
                 <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                    {materialSearch ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado.'}
                 </div>
             )}
          </div>
        </div>
      </div>

      {/* New Unit Modal */}
      {showUnitModal && (
        // ... (Unit Modal content same as original)
        <QuickAddModal title="Nova Unidade de Medida" onClose={() => setShowUnitModal(false)}>
          <form onSubmit={handleSaveUnit}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>Nome</label>
                <input required className={modalInputClass} value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} placeholder="Quilograma" />
              </div>
              <div>
                <label className={labelClass}>Símbolo</label>
                <input required className={modalInputClass} value={newUnit.symbol} onChange={e => setNewUnit({...newUnit, symbol: e.target.value})} placeholder="kg" />
              </div>
            </div>
            <div className="mb-4">
               <label className={labelClass}>Fator de Conversão (Padrão 1)</label>
               <input required type="number" step="0.001" className={modalInputClass} value={newUnit.conversionFactor} onChange={e => setNewUnit({...newUnit, conversionFactor: parseFloat(e.target.value) || 0})} placeholder="1" />
               <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Ex: 1 para a unidade base padrão. Se criar 'Tonelada', use 1000.</p>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Salvar Unidade</button>
          </form>
        </QuickAddModal>
      )}
      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white">Gerenciar Categorias</h3>
              <button onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
              }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {uniqueCategories.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Nenhuma categoria cadastrada.</p>
              ) : (
                  <ul className="space-y-2">
                      {uniqueCategories.map(category => (
                          <li key={category} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                              {editingCategory === category ? (
                                  <div className="flex-1 flex items-center gap-2 mr-2">
                                      <input 
                                          type="text" 
                                          value={editedCategoryName}
                                          onChange={(e) => setEditedCategoryName(e.target.value)}
                                          className="flex-1 border border-blue-300 dark:border-blue-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                          autoFocus
                                      />
                                      <button 
                                          onClick={() => handleUpdateCategory(category)}
                                          disabled={isLoading}
                                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                                          title="Salvar"
                                      >
                                          <CheckCircle2 size={16} />
                                      </button>
                                      <button 
                                          onClick={() => setEditingCategory(null)}
                                          disabled={isLoading}
                                          className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                                          title="Cancelar"
                                      >
                                          <X size={16} />
                                      </button>
                                  </div>
                              ) : (
                                  <>
                                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{category}</span>
                                      <div className="flex items-center gap-1">
                                          <button 
                                              onClick={() => {
                                                  setEditingCategory(category);
                                                  setEditedCategoryName(category);
                                              }}
                                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                              title="Editar"
                                          >
                                              <Pencil size={16} />
                                          </button>
                                          <button 
                                              onClick={() => triggerDeleteCategory(category)}
                                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                              title="Excluir"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </>
                              )}
                          </li>
                      ))}
                  </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};