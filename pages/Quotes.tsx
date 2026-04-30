import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Quote, Supplier, Material, Unit, QuoteStatus, FreightType } from '../types';
import { StorageService } from '../services/storageService';
import { extractQuoteData } from '../services/geminiService';
import { Plus, Filter, Search, X, Calendar, Trash2, Pencil, Loader2, Upload, Paperclip, Check, FileText, ChevronDown, Tags, ChevronLeft, ChevronRight, HelpCircle, Eye, ZoomIn, ZoomOut, RotateCcw, Download, Sparkles, AlertTriangle, ScanLine, BrainCircuit, Share2 } from 'lucide-react';
import { Toast, ToastMessage } from '../components/Toast';
import { ConfirmationModal } from '../components/ConfirmationModal';
import html2canvas from 'html2canvas';

// --- Interfaces & Types ---
interface QuoteItemRow {
  tempId: string;
  materialId: string;
  quantity: string;
  unitId: string;
  priceUnit: string;
  ipi: string;
  descriptionFallback?: string;
  isUnmatched?: boolean;
}

// --- Internal Components ---

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

const AttachmentModal = ({ fileName, onClose, isTutorialMode }: { fileName: string, onClose: () => void, isTutorialMode?: boolean }) => {
    // Handle "Name|Base64" format or just Name
    let displayUrl = '';
    let displayName = fileName;

    if (fileName.includes('|')) {
        const parts = fileName.split('|');
        displayName = parts[0];
        displayUrl = parts[1];
    }

    const isImage = displayName.match(/\.(jpeg|jpg|gif|png)$/i) != null || displayUrl.startsWith('data:image');
    
    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Paperclip size={18} /> {displayName}
                    </h3>
                    <div className="flex gap-2">
                        {displayUrl && (
                             <a href={displayUrl} download={displayName} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors" title="Baixar">
                                 <Download size={20} />
                             </a>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 p-4 flex items-center justify-center">
                    {displayUrl ? (
                         isImage ? (
                             <img src={displayUrl} alt="Anexo" className="max-w-full max-h-full object-contain shadow-lg" />
                         ) : (
                             <iframe src={displayUrl} className="w-full h-full min-h-[500px] border-none shadow-lg bg-white" title="Documento"></iframe>
                         )
                    ) : (
                        <div className="text-center text-slate-500 dark:text-slate-400">
                            <FileText size={48} className="mx-auto mb-2 opacity-50" />
                            <p>Visualização não disponível para este arquivo simulado.</p>
                            <p className="text-xs mt-1">(Apenas arquivos reais carregados agora são exibidos)</p>
                        </div>
                    )}
                </div>
             </div>
        </div>
    );
};

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  options: { id: string, name: string }[];
  value: string;
  onChange: (value: string) => void;
  onAddNew?: () => void;
  required?: boolean;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ label, placeholder, options, value, onChange, onAddNew, required, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(search.toLowerCase()));
  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className={className} ref={wrapperRef}>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <div 
          className={`w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm cursor-pointer flex justify-between items-center ${required && !value ? 'border-red-300' : ''}`}
          onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        >
           <span className={`truncate ${selectedOption ? '' : 'text-slate-400 dark:text-slate-500'}`}>
              {selectedOption ? selectedOption.name : placeholder}
           </span>
           <ChevronDown size={16} className="text-slate-400 shrink-0" />
        </div>

        {isOpen && (
           <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
               <div className="p-2 border-b border-slate-100 dark:border-slate-600 sticky top-0 bg-white dark:bg-slate-700">
                  <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Buscar..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                  </div>
               </div>
               <div className="overflow-y-auto flex-1">
                   {filteredOptions.map(opt => (
                       <div 
                          key={opt.id}
                          className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-600 ${value === opt.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-200'}`}
                          onClick={() => { onChange(opt.id); setIsOpen(false); }}
                       >
                           {opt.name}
                       </div>
                   ))}
                   {filteredOptions.length === 0 && (
                       <div className="px-4 py-3 text-xs text-slate-400 text-center">Nenhum resultado.</div>
                   )}
               </div>
               {onAddNew && (
                   <button 
                      type="button"
                      onClick={() => { onAddNew(); setIsOpen(false); }}
                      className="p-2 border-t border-slate-100 dark:border-slate-600 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1"
                   >
                       <Plus size={14} /> Cadastrar Novo
                   </button>
               )}
           </div>
        )}
      </div>
    </div>
  );
};

// --- Main Component ---

interface QuotesProps {
  quotes: Quote[];
  suppliers: Supplier[];
  materials: Material[];
  units: Unit[];
  refreshData: () => void;
  isTutorialMode?: boolean;
}

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const Quotes: React.FC<QuotesProps> = ({ quotes, suppliers, materials, units, refreshData, isTutorialMode }) => {
    const [activeTab, setActiveTab] = useState<'list' | 'summary'>('list');
    const [showForm, setShowForm] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 100;
    const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [summarySearchTerm, setSummarySearchTerm] = useState('');
    const [summaryStartDate, setSummaryStartDate] = useState('');
    const [summaryEndDate, setSummaryEndDate] = useState('');
    const [summarySortBy, setSummarySortBy] = useState<'price' | 'material'>('price');
    const [summaryViewType, setSummaryViewType] = useState<'gross' | 'net'>('gross');
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>(() => {
        const saved = localStorage.getItem('quotes_summary_materials');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return [];
            }
        }
        return [];
    });
    const [isMaterialFilterOpen, setIsMaterialFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLTableElement>(null);
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const hasInitializedFilter = useRef(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
    const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
    const [activeModal, setActiveModal] = useState<'supplier' | 'material' | 'unit' | null>(null);
    const [pendingMaterialItemTempId, setPendingMaterialItemTempId] = useState<string | null>(null);
    
    // AI Processing State
    const [isProcessingDoc, setIsProcessingDoc] = useState(false);
    const [processingStep, setProcessingStep] = useState(0); 
    
    const [attachmentName, setAttachmentName] = useState<string>('');
    const [attachmentData, setAttachmentData] = useState<string | null>(null); 
    const fileInputRef = useRef<HTMLInputElement>(null);
    const aiFileInputRef = useRef<HTMLInputElement>(null);

    const [newSup, setNewSup] = useState({ name: '', email: '', rating: 5, salesperson: '', salespersonPhone: '' });
    const [newMat, setNewMat] = useState({ name: '', category: '', baseUnitId: '', ipi: 0 });
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [newUnit, setNewUnit] = useState({ name: '', symbol: '', conversionFactor: 1 });
    const [dbCategories, setDbCategories] = useState<string[]>([]);

    useEffect(() => {
        StorageService.getCategories().then(cats => setDbCategories(cats)).catch(() => {});
    }, []);
    const [headerData, setHeaderData] = useState({
        supplierId: '',
        date: new Date().toISOString().split('T')[0],
        deliveryDays: '',
        paymentTerms: '',
        freight: 'CIF' as FreightType,
        icms: '',
        notes: ''
    });
    const [quoteItems, setQuoteItems] = useState<QuoteItemRow[]>([
        { tempId: '1', materialId: '', quantity: '', unitId: '', priceUnit: '', ipi: '' }
    ]);

    const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        type: 'DELETE_QUOTE' | 'DELETE_UNIT' | null;
        id: string | null;
        title: string;
        message: string;
    }>({ isOpen: false, type: null, id: null, title: '', message: '' });

    const uniqueIcms = useMemo(() => {
        const values = new Set<number>();
        quotes.forEach(q => { if (q.icms > 0) values.add(q.icms); });
        return Array.from(values).sort((a, b) => a - b);
    }, [quotes]);

    const uniqueIpi = useMemo(() => {
        const values = new Set<number>();
        quotes.forEach(q => { if (q.ipi > 0) values.add(q.ipi); });
        return Array.from(values).sort((a, b) => a - b);
    }, [quotes]);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus, filterCategory, searchTerm, startDate, endDate]);

    useEffect(() => {
        let interval: any;
        if (isProcessingDoc) {
            setProcessingStep(0);
            interval = setInterval(() => {
                setProcessingStep(prev => (prev + 1) % 4);
            }, 800);
        }
        return () => clearInterval(interval);
    }, [isProcessingDoc]);

    const categories = Array.from(new Set([...materials.map(m => m.category).filter(Boolean), ...dbCategories])).sort();

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (value.length > 0) {
        const lowerValue = value.toLowerCase();
        const matches = [
            ...suppliers.map(s => s.name),
            ...materials.map(m => m.name)
        ].filter(name => name.toLowerCase().includes(lowerValue));
        
        setSuggestions([...new Set(matches)].slice(0, 5));
        setShowSuggestions(true);
        } else {
        setShowSuggestions(false);
        }
    };

    const selectSuggestion = (suggestion: string) => {
        setSearchTerm(suggestion);
        setShowSuggestions(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
        if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
            setShowSuggestions(false);
        }
        if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
            setIsMaterialFilterOpen(false);
        }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (materials.length > 0 && !hasInitializedFilter.current) {
            const saved = localStorage.getItem('quotes_summary_materials');
            if (!saved) {
                const defaults = materials.filter(m => 
                    m.name.toLowerCase().includes('chapa') || 
                    m.name.toLowerCase().includes('bobina') ||
                    m.category.toLowerCase().includes('chapa') ||
                    m.category.toLowerCase().includes('bobina')
                ).map(m => m.id);
                setSelectedMaterialIds(defaults);
            }
            hasInitializedFilter.current = true;
        }
    }, [materials]);

    useEffect(() => {
        if (hasInitializedFilter.current) {
            localStorage.setItem('quotes_summary_materials', JSON.stringify(selectedMaterialIds));
        }
    }, [selectedMaterialIds]);

    const resetMainForm = () => {
        setHeaderData({
        supplierId: '',
        date: new Date().toISOString().split('T')[0],
        deliveryDays: '',
        paymentTerms: '',
        freight: 'CIF',
        icms: '',
        notes: ''
        });
        setQuoteItems([{ tempId: Date.now().toString(), materialId: '', quantity: '', unitId: '', priceUnit: '', ipi: '' }]);
        setAttachmentName('');
        setAttachmentData(null);
        setEditingQuoteId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (aiFileInputRef.current) aiFileInputRef.current.value = '';
    };

    const addQuoteItem = () => {
        setQuoteItems([...quoteItems, { tempId: Date.now().toString(), materialId: '', quantity: '', unitId: '', priceUnit: '', ipi: '' }]);
    };

    const removeQuoteItem = (tempId: string) => {
        if (quoteItems.length > 1) {
            setQuoteItems(quoteItems.filter(i => i.tempId !== tempId));
        }
    };

    const updateQuoteItem = (tempId: string, field: keyof QuoteItemRow, value: string) => {
        setQuoteItems(quoteItems.map(item => {
            if (item.tempId === tempId) {
                const updated = { ...item, [field]: value };
                if (field === 'materialId') {
                    const mat = materials.find(m => m.id === value);
                    if (mat) {
                        updated.unitId = mat.baseUnitId;
                        updated.isUnmatched = false;
                        if (mat.ipi !== undefined) {
                            updated.ipi = mat.ipi.toString();
                        }
                    }
                }
                return updated;
            }
            return item;
        }));
    };

    const openEditQuote = (q: Quote) => {
        setEditingQuoteId(q.id);
        setHeaderData({
        supplierId: q.supplierId || '',
        date: q.date || new Date().toISOString().split('T')[0],
        deliveryDays: (q.deliveryDays || 0).toString(),
        paymentTerms: q.paymentTerms || '',
        freight: q.freight || 'CIF',
        icms: (q.icms !== undefined && q.icms !== null) ? q.icms.toString() : '',
        notes: q.notes || ''
        });
        
        setQuoteItems([{
            tempId: 'edit_1',
            materialId: q.materialId || '',
            quantity: (q.quantity || 0).toString(),
            unitId: q.unitId || '',
            priceUnit: (q.priceUnit || 0).toString(),
            ipi: (q.ipi !== undefined && q.ipi !== null) ? q.ipi.toString() : ''
        }]);

        const fullAttachment = q.attachments?.[0] || '';
        if (fullAttachment.includes('|')) {
            const [name, data] = fullAttachment.split('|');
            setAttachmentName(name);
            setAttachmentData(data);
        } else {
            setAttachmentName(fullAttachment);
            setAttachmentData(null);
        }

        setShowForm(true);

        setTimeout(() => {
            const mainContainer = document.querySelector('main');
            if (mainContainer) {
                mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 100);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        const isDuplicate = quotes.some(q => q.attachments?.some(att => (att.includes('|') ? att.split('|')[0] : att) === file.name));
        if (isDuplicate) {
            showToast('Aviso: Uma cotação com este arquivo já foi anexada.', 'error');
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast('Arquivo muito grande. Limite de 2MB para esta demonstração.', 'error');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setAttachmentName(file.name);
                setAttachmentData(event.target.result as string);
            }
        };
        reader.readAsDataURL(file);
        }
    };

    const handleAiAutoFill = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            const isDuplicate = quotes.some(q => q.attachments?.some(att => (att.includes('|') ? att.split('|')[0] : att) === file.name));
            if (isDuplicate) {
                showToast('Aviso: Uma cotação com este arquivo já foi anexada.', 'error');
            }

            if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
                showToast("Por favor, envie uma imagem ou PDF.", "error");
                return;
            }

            setIsProcessingDoc(true);
            setAttachmentName(file.name); 

            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    const base64Data = event.target.result as string;
                    setAttachmentData(base64Data);

                    try {
                        const extractedData = await extractQuoteData(base64Data, file.type, materials, suppliers);
                        
                        if (extractedData && extractedData.items && extractedData.items.length > 0) {
                            // Update header data
                            if (extractedData.header) {
                                setHeaderData(prev => ({
                                    ...prev,
                                    supplierId: extractedData.header.supplierId || prev.supplierId,
                                    deliveryDays: extractedData.header.deliveryDays || prev.deliveryDays,
                                    paymentTerms: extractedData.header.paymentTerms || prev.paymentTerms,
                                    icms: extractedData.header.icms || prev.icms,
                                    freight: extractedData.header.freight || prev.freight
                                }));
                            }

                            const newItems: QuoteItemRow[] = extractedData.items.map((item: any, idx: number) => {
                                const mat = materials.find(m => m.id === item.materialId);
                                return {
                                    tempId: `auto_${Date.now()}_${idx}`,
                                    materialId: item.materialId || '',
                                    descriptionFallback: item.description,
                                    isUnmatched: !item.materialId, 
                                    quantity: item.quantity?.toString() || '0',
                                    unitId: mat?.baseUnitId || units[0]?.id || '',
                                    priceUnit: item.priceUnit?.toString() || '0',
                                    ipi: item.ipi?.toString() || '0'
                                };
                            });
                            
                            setQuoteItems(newItems);
                            showToast(`${newItems.length} itens extraídos com sucesso! Verifique os dados.`, 'success');
                        } else {
                            showToast("A IA não conseguiu identificar itens claros na cotação.", "error");
                        }

                    } catch (error) {
                        console.error(error);
                        showToast("Erro ao processar documento com IA.", "error");
                    } finally {
                        setIsProcessingDoc(false);
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const clearAttachment = () => {
        setAttachmentName('');
        setAttachmentData(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (aiFileInputRef.current) aiFileInputRef.current.value = '';
    };

    const triggerDeleteQuote = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmationState({
            isOpen: true,
            type: 'DELETE_QUOTE',
            id,
            title: 'Excluir Cotação',
            message: 'Tem certeza que deseja excluir esta cotação permanentemente? Esta ação não pode ser desfeita.'
        });
    };

    const triggerDeleteUnit = (id: string) => {
        setConfirmationState({
            isOpen: true,
            type: 'DELETE_UNIT',
            id,
            title: 'Excluir Unidade',
            message: 'Tem certeza que deseja remover esta unidade? Certifique-se que ela não está sendo usada em cotações ou materiais.'
        });
    };

    const handleConfirmAction = async () => {
        if (!confirmationState.id) return;
        
        try {
            if (confirmationState.type === 'DELETE_QUOTE') {
                await StorageService.deleteQuote(confirmationState.id);
                refreshData();
                showToast('Cotação excluída com sucesso!', 'success');
            } else if (confirmationState.type === 'DELETE_UNIT') {
                await StorageService.removeUnit(confirmationState.id);
                refreshData();
                showToast('Unidade removida!', 'success');
            }
        } catch (error) {
            showToast('Erro ao realizar a ação. Verifique dependências.', 'error');
        } finally {
            setConfirmationState({ ...confirmationState, isOpen: false });
        }
    };

    const handleOpenAttachment = (fileName: string) => {
        setViewingAttachment(fileName);
    };

    const handleOpenCurrentAttachment = () => {
        if (attachmentData) {
            setViewingAttachment(`${attachmentName}|${attachmentData}`);
        } else if (attachmentName) {
            setViewingAttachment(attachmentName);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const hasUnmatched = quoteItems.some(i => i.isUnmatched);
        if (hasUnmatched) {
            showToast('Existem itens não cadastrados (em vermelho). Cadastre-os ou selecione um material existente.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const combinedAttachment = attachmentData ? `${attachmentName}|${attachmentData}` : attachmentName;
            const attachmentsArray: string[] = combinedAttachment ? [combinedAttachment] : [];

            const promises = quoteItems.map(async (item) => {
                const selectedUnit = units.find(u => u.id === item.unitId);
                const unitPrice = parseFloat(item.priceUnit);
                const normalizedPrice = selectedUnit ? unitPrice / selectedUnit.conversionFactor : 0;
                const quantity = parseFloat(item.quantity);

                if (!item.materialId || !item.quantity || !item.priceUnit) return;

                const quoteData: Quote = {
                    id: editingQuoteId ? editingQuoteId : generateUUID(),
                    supplierId: headerData.supplierId,
                    materialId: item.materialId,
                    date: headerData.date,
                    quantity: quantity,
                    unitId: item.unitId,
                    priceUnit: unitPrice,
                    priceTotal: quantity * unitPrice,
                    normalizedPricePerBaseUnit: normalizedPrice,
                    deliveryDays: parseInt(headerData.deliveryDays) || 0,
                    freight: headerData.freight,
                    icms: parseFloat(headerData.icms) || 0,
                    ipi: parseFloat(item.ipi) || 0,
                    status: editingQuoteId ? quotes.find(q=>q.id === editingQuoteId)?.status || QuoteStatus.OPEN : QuoteStatus.OPEN,
                    paymentTerms: headerData.paymentTerms,
                    attachments: attachmentsArray,
                    notes: headerData.notes,
                    companyId: 'global_aco' // Using default or handling via service
                };

                if (editingQuoteId) {
                    await StorageService.updateQuote(quoteData);
                } else {
                    await StorageService.addQuote(quoteData);
                }
            });

            await Promise.all(promises);
            showToast(editingQuoteId ? 'Cotação atualizada!' : `${quoteItems.length} cotação(ões) registrada(s)!`, 'success');
            await refreshData();
            setCurrentPage(1);
            setShowForm(false);
            resetMainForm();
        } catch (error) {
            showToast('Ocorreu um erro ao salvar.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: QuoteStatus) => {
        try {
            await StorageService.updateQuoteStatus(id, newStatus);
            refreshData();
            showToast(`Status atualizado`, 'success');
        } catch (error) {
            showToast('Erro ao atualizar status.', 'error');
        }
    };

    const handleSaveSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
        const s = { 
            id: generateUUID(), 
            name: newSup.name, 
            contactEmail: newSup.email, 
            rating: newSup.rating, 
            salesperson: newSup.salesperson,
            salespersonPhone: newSup.salespersonPhone
        };
        await StorageService.addSupplier(s);
        await refreshData();
        setHeaderData({...headerData, supplierId: s.id});
        setActiveModal(null);
        setNewSup({ name: '', email: '', rating: 5, salesperson: '', salespersonPhone: '' });
        showToast('Fornecedor cadastrado!', 'success');
        } catch (e) {
        showToast('Erro ao cadastrar fornecedor.', 'error');
        }
    };

    const handleSaveMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        const existingMat = materials.find(m => m.name.toLowerCase().trim() === newMat.name.toLowerCase().trim());
        if (existingMat) {
            showToast('Já existe um material com este nome.', 'error');
            return;
        }
        try {
        const m = { 
            id: generateUUID(), 
            name: newMat.name, 
            category: newMat.category, 
            baseUnitId: newMat.baseUnitId || (units.length > 0 ? units[0].id : ''),
            ipi: newMat.ipi
        };
        await StorageService.addMaterial(m);
        await refreshData();
        const itemIndex = pendingMaterialItemTempId 
            ? quoteItems.findIndex(i => i.tempId === pendingMaterialItemTempId)
            : quoteItems.length - 1;
        const indexToUpdate = itemIndex >= 0 ? itemIndex : quoteItems.length - 1;
        const updatedItems = [...quoteItems];
        updatedItems[indexToUpdate] = {
            ...updatedItems[indexToUpdate],
            materialId: m.id,
            unitId: m.baseUnitId,
            ipi: m.ipi?.toString() || updatedItems[indexToUpdate].ipi,
            isUnmatched: false
        };
        setQuoteItems(updatedItems);
        setActiveModal(null);
        setPendingMaterialItemTempId(null);
        setNewMat({ name: '', category: '', baseUnitId: '', ipi: 0 });
        showToast('Material cadastrado!', 'success');
        } catch (e) {
        showToast('Erro ao cadastrar material.', 'error');
        }
    };

    const handleSaveUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
        if (editingUnitId) {
            const updatedUnit: Unit = {
            id: editingUnitId,
            name: newUnit.name,
            symbol: newUnit.symbol,
            conversionFactor: newUnit.conversionFactor
            };
            await StorageService.updateUnit(updatedUnit);
            showToast('Unidade atualizada!', 'success');
        } else {
            const u = { id: generateUUID(), name: newUnit.name, symbol: newUnit.symbol, conversionFactor: newUnit.conversionFactor };
            await StorageService.addUnit(u);
            const lastItem = quoteItems[quoteItems.length - 1];
            if(!lastItem.unitId) updateQuoteItem(lastItem.tempId, 'unitId', u.id);

            showToast('Unidade criada!', 'success');
        }
        await refreshData();
        if (!editingUnitId) setActiveModal(null);
        setNewUnit({ name: '', symbol: '', conversionFactor: 1 });
        setEditingUnitId(null);
        } catch (e) {
        showToast('Erro ao salvar unidade.', 'error');
        }
    };

    const handleEditUnit = (u: Unit) => {
        setNewUnit({
        name: u.name,
        symbol: u.symbol,
        conversionFactor: u.conversionFactor
        });
        setEditingUnitId(u.id);
    };

    const handleShareImage = async () => {
        setIsShareMenuOpen(false);
        if (!tableRef.current) return;
        
        try {
            showToast('Gerando imagem...', 'success');
            const canvas = await html2canvas(tableRef.current, {
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                scale: 2, // Better quality
            });
            
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    showToast('Erro ao gerar imagem.', 'error');
                    return;
                }
                
                const file = new File([blob], 'resumo-cotacoes.jpg', { type: 'image/jpeg' });
                
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: 'Resumo de Cotações',
                            files: [file]
                        });
                        showToast('Resumo compartilhado com sucesso!', 'success');
                    } catch (error: any) {
                        if (error.name !== 'AbortError') {
                            downloadImage(blob);
                        }
                    }
                } else {
                    downloadImage(blob);
                }
            }, 'image/jpeg', 0.9);
        } catch (error) {
            console.error(error);
            showToast('Erro ao gerar imagem.', 'error');
        }
    };

    const downloadImage = (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resumo-cotacoes.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Imagem baixada com sucesso!', 'success');
    };

    const handleShareEmailTest = async () => {
        setIsShareMenuOpen(false);
        if (!tableRef.current) return;

        const targetMaterials = materials.filter(m => selectedMaterialIds.includes(m.id));
        if (targetMaterials.length === 0) {
            showToast('Selecione pelo menos um material para compartilhar.', 'error');
            return;
        }

        const validQuotes = quotes
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .filter(q => {
                if (q.status === QuoteStatus.REJECTED) return false;
                if (!targetMaterials.some(m => m.id === q.materialId)) return false;
                
                const quoteDate = new Date(q.date);
                const startMatch = !summaryStartDate || quoteDate >= new Date(summaryStartDate);
                const endMatch = !summaryEndDate || quoteDate <= new Date(summaryEndDate);
                return startMatch && endMatch;
            });

        if (validQuotes.length === 0) {
            showToast('Nenhuma cotação encontrada para o período/materiais selecionados.', 'error');
            return;
        }

        const supplierIds = Array.from(new Set(validQuotes.map(q => q.supplierId)));
        const activeSuppliers = supplierIds.map(id => suppliers.find(s => s.id === id)).filter(Boolean) as Supplier[];
        const sortedMaterials = [...targetMaterials].sort((a, b) => a.name.localeCompare(b.name));

        const getPrice = (q: Quote) => {
            if (summaryViewType === 'net') {
                return q.normalizedPricePerBaseUnit * (1 - (q.icms || 0) / 100);
            }
            return q.normalizedPricePerBaseUnit;
        };

        const categories = Array.from(new Set(sortedMaterials.map(m => m.category || 'Geral'))).sort();

        let htmlBody = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #1e293b; margin-bottom: 16px;">Resumo de Cotações</h2>
        `;
        
        if (summaryStartDate || summaryEndDate) {
            htmlBody += `<p style="margin-bottom: 16px;"><strong>Período:</strong> ${summaryStartDate ? new Date(summaryStartDate).toLocaleDateString('pt-BR') : 'Início'} até ${summaryEndDate ? new Date(summaryEndDate).toLocaleDateString('pt-BR') : 'Hoje'}</p>`;
        }

        categories.forEach(category => {
            const categoryMaterials = sortedMaterials.filter(m => (m.category || 'Geral') === category);
            if (categoryMaterials.length === 0) return;

            const categorySupplierIds = new Set<string>();
            categoryMaterials.forEach(m => {
                validQuotes.filter(q => q.materialId === m.id).forEach(q => categorySupplierIds.add(q.supplierId));
            });
            const categorySuppliers = activeSuppliers.filter(s => categorySupplierIds.has(s.id));

            if (categorySuppliers.length === 0) return;

            htmlBody += `
                <h3 style="color: #334155; margin-top: 24px; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">${category}</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #cbd5e1; padding: 12px; background-color: #f8fafc; text-align: left; font-weight: bold; color: #475569;">Material</th>
            `;

            categorySuppliers.forEach(supplier => {
                htmlBody += `<th style="border: 1px solid #cbd5e1; padding: 12px; background-color: #f8fafc; text-align: center; font-weight: bold; color: #475569;">${supplier.name}</th>`;
            });

            htmlBody += `
                        </tr>
                    </thead>
                    <tbody>
            `;

            categoryMaterials.forEach(material => {
                const materialQuotes = validQuotes.filter(q => q.materialId === material.id);
                if (materialQuotes.length === 0) return;

                const latestQuotesPerSupplier = new Map<string, Quote>();
                materialQuotes.forEach(q => {
                    if (!latestQuotesPerSupplier.has(q.supplierId)) {
                        latestQuotesPerSupplier.set(q.supplierId, q);
                    }
                });

                let bestPrice = Infinity;
                latestQuotesPerSupplier.forEach(q => {
                    const price = getPrice(q);
                    if (price < bestPrice) bestPrice = price;
                });

                htmlBody += `<tr>`;
                htmlBody += `<td style="border: 1px solid #cbd5e1; padding: 12px; font-weight: 500; color: #1e293b;">${material.name}</td>`;

                categorySuppliers.forEach(supplier => {
                    const quote = latestQuotesPerSupplier.get(supplier.id);
                    if (quote) {
                        const price = getPrice(quote);
                        const isBest = price === bestPrice;
                        const priceStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
                        
                        const cellStyle = isBest 
                            ? 'border: 1px solid #cbd5e1; padding: 12px; text-align: center; background-color: #dcfce7; color: #166534; font-weight: bold;'
                            : 'border: 1px solid #cbd5e1; padding: 12px; text-align: center; color: #475569;';
                            
                        htmlBody += `<td style="${cellStyle}">${priceStr}<br/><span style="font-size: 11px; opacity: 0.7;">ICMS: ${quote.icms || 0}%</span></td>`;
                    } else {
                        htmlBody += `<td style="border: 1px solid #cbd5e1; padding: 12px; text-align: center; color: #94a3b8;">-</td>`;
                    }
                });

                htmlBody += `</tr>`;
            });

            htmlBody += `
                    </tbody>
                </table>
            `;
        });

        htmlBody += `
            <p style="font-size: 12px; color: #64748b;">Gerado via Central de Preços</p>
        </div>
        `;

        try {
            const blobHtml = new Blob([htmlBody], { type: 'text/html' });
            const blobText = new Blob(['Por favor, cole a tabela aqui.'], { type: 'text/plain' });
            const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
            
            await navigator.clipboard.write(data);
            
            const subject = encodeURIComponent('Resumo de Cotações');
            const body = encodeURIComponent('Cole a tabela aqui (Ctrl+V ou botão direito -> Colar):');
            const mailtoLink = `mailto:mauricio.maciel@globalaco.com.br?subject=${subject}&body=${body}`;
            
            window.open(mailtoLink, '_top');
            showToast('Tabela copiada! Cole no corpo do e-mail.', 'success');
        } catch (error) {
            console.error(error);
            showToast('Erro ao copiar tabela. Tente compartilhar como imagem.', 'error');
        }
    };

    const filteredQuotes = quotes.filter(q => {
        const statusMatch = filterStatus === 'ALL' || q.status === filterStatus;
        const material = materials.find(m => m.id === q.materialId);
        const categoryMatch = filterCategory === 'ALL' || material?.category === filterCategory;
        const materialName = material?.name.toLowerCase() || '';
        const supplierName = suppliers.find(s => s.id === q.supplierId)?.name.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        const searchMatch = !term || materialName.includes(term) || supplierName.includes(term) || q.id.toLowerCase().includes(term);
        const quoteDate = new Date(q.date);
        const startMatch = !startDate || quoteDate >= new Date(startDate);
        const endMatch = !endDate || quoteDate <= new Date(endDate);
        return statusMatch && searchMatch && startMatch && endMatch && categoryMatch;
    });

    const statusLabels: Record<string, string> = { [QuoteStatus.OPEN]: 'ABERTA', [QuoteStatus.ANALYZING]: 'EM ANÁLISE', [QuoteStatus.APPROVED]: 'APROVADA', [QuoteStatus.REJECTED]: 'REJEITADA' };
    const totalPages = Math.ceil(filteredQuotes.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedQuotes = filteredQuotes.slice(startIndex, endIndex);

    const inputClass = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500";
    const smallInputClass = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-400";
    const modalInputClass = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-3 placeholder-slate-400 dark:placeholder-slate-500";
    const headerInputClass = "h-10 w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm flex items-center";
    const labelClass = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

    const processingTexts = [
        "Digitalizando documento...",
        "Identificando produtos...",
        "Extraindo valores e unidades...",
        "Cruzando com base de dados..."
    ];

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <ConfirmationModal 
                isOpen={confirmationState.isOpen}
                onClose={() => setConfirmationState({ ...confirmationState, isOpen: false })}
                onConfirm={handleConfirmAction}
                title={confirmationState.title}
                message={confirmationState.message}
            />

            {viewingAttachment && (
                <AttachmentModal 
                    fileName={viewingAttachment} 
                    onClose={() => setViewingAttachment(null)} 
                    isTutorialMode={isTutorialMode}
                />
            )}

            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'list' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                >
                    Todas as Cotações
                </button>
                <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                >
                    Resumo Cotações
                </button>
            </div>
            
            {activeTab === 'list' && (
                <>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                        <div className="flex flex-col xl:flex-row gap-3">
                    <div className="relative flex-1 z-20 min-w-[200px]" ref={searchContainerRef}>
                    <div className={`${headerInputClass} pl-10 pr-8`}>
                        <Search size={18} className="absolute left-3 text-slate-400" />
                        <input 
                        type="text" 
                        placeholder="Buscar material ou fornecedor..." 
                        className="bg-transparent border-none focus:ring-0 text-sm w-full h-full text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none p-0"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onFocus={() => { if(searchTerm) setShowSuggestions(true); }}
                        />
                        {searchTerm && (
                        <button onClick={() => { setSearchTerm(''); setShowSuggestions(false); }} className="absolute right-3 text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                        )}
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                        {suggestions.map((item, index) => (
                            <div 
                                key={index} 
                                onClick={() => selectSuggestion(item)}
                                className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-200 transition-colors"
                            >
                                {item}
                            </div>
                        ))}
                        </div>
                    )}
                    </div>

                    <div className="flex gap-3">
                    <div className="relative w-full sm:w-40">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${headerInputClass} uppercase text-xs`} placeholder="De:" />
                    </div>
                    <div className="relative w-full sm:w-40">
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${headerInputClass} uppercase text-xs`} placeholder="Até:" />
                    </div>
                    {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700">
                                <X size={18} />
                            </button>
                        )}
                    </div>

                <div className="relative w-full sm:w-48">
                    <Tags size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <select 
                    className={`${headerInputClass} pl-9 pr-8 appearance-none`}
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{ backgroundImage: 'none' }}
                    >
                    <option value="ALL">Cat: Todas</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative w-full sm:w-48">
                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <select 
                    className={`${headerInputClass} pl-9 pr-8 appearance-none`}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ backgroundImage: 'none' }}
                    >
                    <option value="ALL">Status: Todos</option>
                    <option value={QuoteStatus.OPEN}>Status: Aberta</option>
                    <option value={QuoteStatus.APPROVED}>Status: Aprovada</option>
                    <option value={QuoteStatus.REJECTED}>Status: Rejeitada</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <button 
                    onClick={() => { resetMainForm(); setShowForm(!showForm); }}
                    className="h-10 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-lg text-sm font-semibold shadow-sm shadow-blue-600/20 transition-all active:scale-95 whitespace-nowrap"
                >
                    <Plus size={18} />
                    Nova Cotação
                </button>
                </div>
            </div>

            {showForm && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200 transition-colors">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{editingQuoteId ? 'Editar Cotação' : 'Registrar Nova Cotação'}</h3>
                    <button onClick={() => { setShowForm(false); resetMainForm(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    {!editingQuoteId && (
                        <div className={`mb-6 relative overflow-hidden rounded-xl transition-all duration-700 ${isProcessingDoc ? 'bg-slate-900 border border-blue-500/50 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] p-8' : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700/50 dark:to-slate-700/30 p-4 border border-blue-100 dark:border-slate-600'}`}>
                            
                            {isProcessingDoc && (
                                <>
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_rgba(59,130,246,1)] animate-[scan_3s_ease-in-out_infinite]"></div>
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-violet-600/20 rounded-xl blur-xl animate-pulse pointer-events-none"></div>
                                </>
                            )}

                            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                                <div className={`relative p-4 rounded-full transition-all duration-500 flex items-center justify-center ${isProcessingDoc ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.6)] scale-110' : 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400'}`}>
                                    {isProcessingDoc ? (
                                        <>
                                            <BrainCircuit className="animate-pulse" size={32} />
                                            <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-[spin_3s_linear_infinite] border-t-transparent border-l-transparent"></span>
                                        </>
                                    ) : (
                                        <Sparkles size={24} />
                                    )}
                                </div>

                                <div className="flex-1 text-center sm:text-left min-h-[60px] flex flex-col justify-center">
                                    {isProcessingDoc ? (
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-white text-xl flex items-center justify-center sm:justify-start gap-3 tracking-tight">
                                                PROCESSAMENTO IA
                                                <span className="flex h-2.5 w-2.5 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></span>
                                                </span>
                                            </h4>
                                            <p className="text-blue-200 text-sm font-mono tracking-wide">
                                                <span className="text-blue-400 mr-2">{'>'}</span>
                                                {processingTexts[processingStep]}
                                                <span className="animate-pulse">_</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center justify-center sm:justify-start gap-2 text-lg">
                                                Preenchimento Inteligente com IA
                                                <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">BETA</span>
                                            </h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
                                                Faça upload da imagem ou PDF da cotação. Nossa IA identificará os itens, preços e quantidades automaticamente.
                                            </p>
                                        </>
                                    )}
                                </div>

                                {!isProcessingDoc && (
                                    <div className="relative group shrink-0">
                                        <input 
                                            ref={aiFileInputRef}
                                            type="file" 
                                            accept=".pdf,image/*"
                                            onChange={handleAiAutoFill}
                                            disabled={isProcessingDoc}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                        />
                                        <button 
                                            type="button" 
                                            className={`px-5 py-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-600 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all hover:scale-[1.02] active:scale-95`}
                                        >
                                            <Upload size={18} /> Carregar Cotação
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <div className="lg:col-span-2">
                            <SearchableSelect 
                            label="Fornecedor"
                            placeholder="Selecione ou digite..."
                            options={suppliers.map(s => ({ id: s.id, name: s.name }))}
                            value={headerData.supplierId}
                            onChange={(val) => setHeaderData({...headerData, supplierId: val})}
                            onAddNew={() => setActiveModal('supplier')}
                            required
                            />
                        </div>
                        
                        <div>
                        <label className={labelClass}>Data Cotação</label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="date" required className={`${inputClass} pl-9`}
                            value={headerData.date} onChange={e => setHeaderData({...headerData, date: e.target.value})} />
                        </div>
                        </div>

                        <div>
                            <label className={labelClass}>Frete</label>
                            <select required className={inputClass}
                                value={headerData.freight} onChange={e => setHeaderData({...headerData, freight: e.target.value as FreightType})}>
                                <option value="CIF">CIF (Pago Fornecedor)</option>
                                <option value="FOB">FOB (Pago Comprador)</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Prazo Entrega (Dias)</label>
                            <input type="number" required className={inputClass} placeholder="Ex: 15"
                            value={headerData.deliveryDays} onChange={e => setHeaderData({...headerData, deliveryDays: e.target.value})} />
                        </div>

                        <div className="lg:col-span-2">
                        <label className={labelClass}>Cond. Pagamento</label>
                        <input type="text" placeholder="ex: 30/60 dias" className={inputClass}
                            value={headerData.paymentTerms} onChange={e => setHeaderData({...headerData, paymentTerms: e.target.value})} />
                        </div>

                        <div>
                            <label className={labelClass}>ICMS (%)</label>
                            <input 
                                type="number" step="0.1" className={`${inputClass}`} placeholder="Ex: 18" 
                                value={headerData.icms} onChange={e => setHeaderData({...headerData, icms: e.target.value})}
                                list="icms-list"
                            />
                        </div>

                        <div className="lg:col-span-2">
                            <label className={labelClass}>Anexo (Documento Original)</label>
                            {!attachmentName ? (
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 pointer-events-none group-hover:bg-slate-100 dark:group-hover:bg-slate-700/50 transition-colors"></div>
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        accept=".pdf,image/*"
                                        onChange={handleFileChange}
                                        className="relative block w-full text-sm text-slate-500 dark:text-slate-400
                                        file:mr-4 file:py-2.5 file:px-4
                                        file:rounded-l-lg file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-transparent file:text-slate-600 dark:file:text-slate-300
                                        hover:file:bg-transparent
                                        cursor-pointer h-[42px] opacity-100 z-10 pl-2"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <Upload size={16} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{attachmentName}</p>
                                        <button 
                                            type="button" 
                                            onClick={handleOpenCurrentAttachment}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                        >
                                            <Eye size={12} /> Ver documento
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearAttachment}
                                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg"
                                        title="Remover anexo"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="lg:col-span-2">
                            <label className={labelClass}>Observações</label>
                            <textarea
                                className={inputClass}
                                rows={1}
                                placeholder="Observações adicionais..."
                                value={headerData.notes}
                                onChange={e => setHeaderData({...headerData, notes: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Itens da Cotação</h4>
                            {!editingQuoteId && (
                                <button type="button" onClick={addQuoteItem} className="text-xs flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                    <Plus size={14} /> Adicionar Item
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {quoteItems.map((item, index) => (
                                <div key={item.tempId} className={`grid grid-cols-12 gap-3 p-4 rounded-xl border items-start relative group ${item.isUnmatched ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-700'}`}>
                                    {item.isUnmatched && (
                                        <div className="col-span-12 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-bold mb-1">
                                            <AlertTriangle size={14} />
                                            Material não identificado: "{item.descriptionFallback}". Por favor, selecione um material ou cadastre um novo.
                                        </div>
                                    )}
                                    
                                    <div className="col-span-12 md:col-span-4">
                                        <SearchableSelect 
                                            label="Material"
                                            placeholder={item.descriptionFallback || "Buscar..."}
                                            options={materials.map(m => ({ id: m.id, name: m.name }))}
                                            value={item.materialId}
                                            onChange={(val) => updateQuoteItem(item.tempId, 'materialId', val)}
                                            onAddNew={() => {
                                                setPendingMaterialItemTempId(item.tempId);
                                                setActiveModal('material');
                                            }}
                                            required
                                            className="w-full"
                                        />
                                    </div>
                                    
                                    <div className="col-span-6 md:col-span-2">
                                        <label className={labelClass}>Qtde</label>
                                        <input 
                                            type="number" 
                                            required 
                                            className={smallInputClass} 
                                            placeholder="0"
                                            value={item.quantity} 
                                            onChange={e => updateQuoteItem(item.tempId, 'quantity', e.target.value)} 
                                        />
                                    </div>

                                    <div className="col-span-6 md:col-span-2">
                                        <div className="flex justify-between">
                                            <label className={labelClass}>Unidade</label>
                                            <button type="button" onClick={() => setActiveModal('unit')} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold">(+)</button>
                                        </div>
                                        <select required className={smallInputClass} value={item.unitId} onChange={e => updateQuoteItem(item.tempId, 'unitId', e.target.value)}>
                                            <option value="">UN...</option>
                                            {units.map(u => <option key={u.id} value={u.id}>{u.symbol}</option>)}
                                        </select>
                                    </div>

                                    <div className="col-span-6 md:col-span-2">
                                        <label className={labelClass}>Preço Unit (R$)</label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            required 
                                            className={smallInputClass} 
                                            placeholder="0.00"
                                            value={item.priceUnit} 
                                            onChange={e => updateQuoteItem(item.tempId, 'priceUnit', e.target.value)} 
                                        />
                                    </div>
                                    
                                    <div className="col-span-6 md:col-span-2">
                                        <label className={labelClass}>IPI%</label>
                                        <input 
                                        type="number" step="0.1" className={`${smallInputClass} px-1 text-center`} placeholder="-" 
                                        value={item.ipi} onChange={e => updateQuoteItem(item.tempId, 'ipi', e.target.value)}
                                        list="ipi-list"
                                        />
                                    </div>

                                    {!editingQuoteId && (
                                        <button 
                                            type="button" 
                                            onClick={() => removeQuoteItem(item.tempId)}
                                            disabled={quoteItems.length === 1}
                                            className="absolute -right-2 -top-2 bg-white dark:bg-slate-700 text-slate-400 hover:text-red-500 border border-slate-200 dark:border-slate-600 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-all disabled:hidden"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            
                            <datalist id="icms-list">{uniqueIcms.map(val => <option key={val} value={val} />)}</datalist>
                            <datalist id="ipi-list">{uniqueIpi.map(val => <option key={val} value={val} />)}</datalist>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button type="button" onClick={() => { setShowForm(false); resetMainForm(); }} className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                        <button disabled={isLoading} type="submit" className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center gap-2 ${editingQuoteId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                        {editingQuoteId ? 'Atualizar Cotação' : 'Salvar Cotações'}
                        </button>
                    </div>
                </form>
                </div>
            )}

            {activeModal === 'supplier' && (
                <QuickAddModal title="Novo Fornecedor" onClose={() => setActiveModal(null)}>
                <form onSubmit={handleSaveSupplier}>
                    <label className={labelClass}>Nome</label>
                    <input required className={modalInputClass} value={newSup.name} onChange={e => setNewSup({...newSup, name: e.target.value})} placeholder="Nome da Empresa" />
                    <label className={labelClass}>Nome do Vendedor</label>
                    <input className={modalInputClass} value={newSup.salesperson} onChange={e => setNewSup({...newSup, salesperson: e.target.value})} placeholder="Nome do Vendedor" />
                    <label className={labelClass}>Telefone Vendedor</label>
                    <input className={modalInputClass} value={newSup.salespersonPhone} onChange={e => setNewSup({...newSup, salespersonPhone: e.target.value})} placeholder="(xx) 9..." />
                    <label className={labelClass}>Email</label>
                    <input type="email" className={modalInputClass} value={newSup.email} onChange={e => setNewSup({...newSup, email: e.target.value})} placeholder="Email" />
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Cadastrar</button>
                </form>
                </QuickAddModal>
            )}

            {activeModal === 'material' && (
                <QuickAddModal title="Novo Material" onClose={() => setActiveModal(null)}>
                <form onSubmit={handleSaveMaterial}>
                    <label className={labelClass}>Nome</label>
                    <input required className={modalInputClass} value={newMat.name} onChange={e => setNewMat({...newMat, name: e.target.value})} placeholder="Nome do Material" />
                    <div className="flex justify-between items-center mb-1.5">
                        <label className={labelClass.replace('mb-1.5', '')}>Categoria</label>
                        <button 
                            type="button" 
                            onClick={() => {
                                setIsCustomCategory(!isCustomCategory);
                                setNewMat({...newMat, category: ''});
                            }} 
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded"
                        >
                            {isCustomCategory ? 'Selecionar Existente' : '+ Nova Categoria'}
                        </button>
                    </div>
                    {isCustomCategory ? (
                        <input required className={modalInputClass} value={newMat.category} onChange={e => setNewMat({...newMat, category: e.target.value})} placeholder="Digite a nova categoria..." autoFocus />
                    ) : (
                        <div className="relative mb-3">
                             <select required className={`${modalInputClass.replace('mb-3', '')} appearance-none`} value={newMat.category} onChange={e => setNewMat({...newMat, category: e.target.value})}>
                                <option value="">Selecione...</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    )}
                    <label className={labelClass}>IPI (%)</label>
                    <input type="number" step="0.1" className={modalInputClass} value={newMat.ipi} onChange={e => setNewMat({...newMat, ipi: parseFloat(e.target.value) || 0})} placeholder="0" />
                    <label className={labelClass}>Unidade Controle (Base)</label>
                    <select required className={modalInputClass} value={newMat.baseUnitId} onChange={e => setNewMat({...newMat, baseUnitId: e.target.value})}>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                    </select>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Cadastrar</button>
                </form>
                </QuickAddModal>
            )}

            {activeModal === 'unit' && (
                <QuickAddModal title="Gerenciar Unidades" onClose={() => { setActiveModal(null); setEditingUnitId(null); setNewUnit({name: '', symbol: '', conversionFactor: 1}); }}>
                <form onSubmit={handleSaveUnit} className="mb-6 border-b border-slate-100 dark:border-slate-700 pb-6">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">{editingUnitId ? 'Editar Unidade' : 'Adicionar Nova'}</h4>
                        {editingUnitId && <button type="button" onClick={() => { setEditingUnitId(null); setNewUnit({name: '', symbol: '', conversionFactor: 1}); }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Cancelar Edição</button>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>Nome</label>
                        <input required className={modalInputClass} value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} placeholder="Pacote" />
                    </div>
                    <div>
                        <label className={labelClass}>Símbolo</label>
                        <input required className={modalInputClass} value={newUnit.symbol} onChange={e => setNewUnit({...newUnit, symbol: e.target.value})} placeholder="pct" />
                    </div>
                    </div>
                    <label className={labelClass}>Fator Conversão (para Base)</label>
                    <input required type="number" step="0.001" className={modalInputClass} value={newUnit.conversionFactor} onChange={e => setNewUnit({...newUnit, conversionFactor: parseFloat(e.target.value)})} placeholder="Ex: 1" />
                    <button type="submit" className={`w-full text-white py-2 rounded-lg text-sm font-medium ${editingUnitId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {editingUnitId ? 'Atualizar Unidade' : 'Adicionar Unidade'}
                    </button>
                </form>

                <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Unidades Existentes</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {units.map(u => (
                        <div key={u.id} className={`flex justify-between items-center p-2 rounded-md border transition-colors ${editingUnitId === u.id ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' : 'bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600'}`}>
                            <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{u.name} ({u.symbol})</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Fator: {u.conversionFactor}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                type="button" 
                                onClick={() => handleEditUnit(u)}
                                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 transition-colors"
                                title="Editar"
                                >
                                <Pencil size={16} />
                                </button>
                                <button 
                                type="button" 
                                onClick={() => triggerDeleteUnit(u.id)}
                                className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                title="Remover"
                                >
                                <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
                </QuickAddModal>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-700">
                        <tr>
                        <th className="px-6 py-4 whitespace-nowrap">Data</th>
                        <th className="px-6 py-4 whitespace-nowrap">Material</th>
                        <th className="px-6 py-4 whitespace-nowrap">Fornecedor</th>
                        <th className="px-6 py-4 whitespace-nowrap">Preço Unit.</th>
                        <th className="px-6 py-4 whitespace-nowrap">Valor Total (IPI)</th>
                        <th className="px-6 py-4 whitespace-nowrap">Frete</th>
                        <th className="px-6 py-4 whitespace-nowrap">Impostos</th>
                        <th className="px-6 py-4 whitespace-nowrap text-center">Anexo</th>
                        <th className="px-6 py-4 whitespace-nowrap text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {paginatedQuotes.map(quote => {
                        const material = materials.find(m => m.id === quote.materialId);
                        const supplier = suppliers.find(s => s.id === quote.supplierId);
                        const unit = units.find(u => u.id === quote.unitId);
                        const hasAttachment = quote.attachments && quote.attachments.length > 0;
                        
                        const baseTotal = quote.priceTotal;
                        const ipiValue = baseTotal * ((quote.ipi || 0) / 100);
                        const totalWithIpi = baseTotal + ipiValue;

                        return (
                            <tr key={quote.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {quote.date.split('-').reverse().join('/')}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{material?.name}</td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{supplier?.name}</td>
                            <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                R$ {quote.priceUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">/ {unit?.symbol}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                                        R$ {totalWithIpi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                        Base: {baseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        {quote.ipi > 0 && (
                                            <span className="text-[9px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 leading-none">
                                                +IPI
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">{quote.freight}</td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">
                                {quote.icms > 0 && <div>ICMS: {quote.icms}%</div>}
                                {quote.ipi > 0 && <div className="font-bold text-slate-700 dark:text-slate-300">IPI: {quote.ipi}%</div>}
                                {!quote.icms && !quote.ipi && '-'}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {hasAttachment ? (
                                    <div className="flex justify-center gap-1">
                                        {quote.attachments?.map((file, idx) => {
                                            const fileNameDisplay = file.split('|')[0];
                                            return (
                                                <button 
                                                key={idx}
                                                onClick={() => handleOpenAttachment(file)} 
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-1"
                                                title={`Abrir anexo: ${fileNameDisplay}`}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <span className="text-slate-300 dark:text-slate-600">-</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {quote.status === QuoteStatus.OPEN ? (
                                    <div className="flex gap-1 justify-end">
                                        <button 
                                        onClick={() => handleStatusChange(quote.id, QuoteStatus.APPROVED)} 
                                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-full transition-colors"
                                        title="Aprovar"
                                        >
                                        <Check size={18} />
                                        </button>
                                        <button 
                                        onClick={() => handleStatusChange(quote.id, QuoteStatus.REJECTED)} 
                                        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-colors"
                                        title="Rejeitar"
                                        >
                                        <X size={18} />
                                        </button>
                                    </div>
                                    ) : (
                                        <span className={`text-xs px-2 py-1 rounded-full border ${quote.status === QuoteStatus.APPROVED ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>{statusLabels[quote.status]}</span>
                                    )}
                                    
                                    <button onClick={() => openEditQuote(quote)} className="ml-2 p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors" title="Editar Cotação">
                                        <Pencil size={16} />
                                    </button>

                                    <button onClick={(e) => triggerDeleteQuote(quote.id, e)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Excluir Cotação">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                            </tr>
                        );
                        })}
                    </tbody>
                    </table>
                    
                    {paginatedQuotes.length === 0 && (
                        <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                            Nenhuma cotação encontrada.
                        </div>
                    )}
                </div>

                {filteredQuotes.length > 0 && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Mostrando <span className="font-medium text-slate-700 dark:text-slate-200">{Math.min(startIndex + 1, filteredQuotes.length)}</span> até <span className="font-medium text-slate-700 dark:text-slate-200">{Math.min(endIndex, filteredQuotes.length)}</span> de <span className="font-medium text-slate-700 dark:text-slate-200">{filteredQuotes.length}</span> resultados
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 px-2">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            </>
            )}

            {activeTab === 'summary' && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">Resumo de Preços</h2>
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:flex-none">
                                    <input 
                                        type="date" 
                                        value={summaryStartDate} 
                                        onChange={(e) => setSummaryStartDate(e.target.value)} 
                                        className="w-full pl-3 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 uppercase" 
                                        title="Data Inicial"
                                    />
                                </div>
                                <span className="text-slate-400">até</span>
                                <div className="relative flex-1 sm:flex-none">
                                    <input 
                                        type="date" 
                                        value={summaryEndDate} 
                                        onChange={(e) => setSummaryEndDate(e.target.value)} 
                                        className="w-full pl-3 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 uppercase" 
                                        title="Data Final"
                                    />
                                </div>
                            </div>
                            <div className="relative w-full sm:w-40 lg:w-48">
                                <select 
                                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                    value={summaryViewType}
                                    onChange={(e) => setSummaryViewType(e.target.value as 'gross' | 'net')}
                                >
                                    <option value="gross">Preço Bruto</option>
                                    <option value="net">Preço Líquido</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                            <div className="relative w-full sm:w-48 lg:w-56">
                                <select 
                                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                    value={summarySortBy}
                                    onChange={(e) => setSummarySortBy(e.target.value as 'price' | 'material')}
                                >
                                    <option value="price">Ordenar: Menor Preço</option>
                                    <option value="material">Ordenar: Material (A-Z)</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                            <div className="relative w-full sm:w-56 lg:w-64" ref={filterRef}>
                                <div 
                                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer flex items-center justify-between"
                                    onClick={() => setIsMaterialFilterOpen(!isMaterialFilterOpen)}
                                >
                                    <span className="truncate">
                                        {selectedMaterialIds.length === 0 ? 'Nenhum material' : `${selectedMaterialIds.length} materiais`}
                                    </span>
                                    <ChevronDown size={16} className="text-slate-400 shrink-0" />
                                </div>
                                {isMaterialFilterOpen && (
                                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto p-2">
                                        {materials.map(m => (
                                            <label key={m.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedMaterialIds.includes(m.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedMaterialIds([...selectedMaterialIds, m.id]);
                                                        } else {
                                                            setSelectedMaterialIds(selectedMaterialIds.filter(id => id !== m.id));
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-200">{m.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-blue-600/20 w-full sm:w-auto shrink-0"
                                    title="Compartilhar"
                                >
                                    <Share2 size={16} />
                                    <span>Enviar</span>
                                </button>
                                {isShareMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                        <button 
                                            onClick={handleShareImage}
                                            className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700"
                                        >
                                            Compartilhar Imagem (JPEG)
                                        </button>
                                        <button 
                                            onClick={handleShareEmailTest}
                                            className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            Enviar E-mail (Tabela HTML)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Comparativo de preços por fornecedor. O melhor preço para cada item está destacado em verde.
                    </p>
                    <div ref={tableRef} className="flex flex-col gap-6">
                        {(() => {
                            // 1. Filter materials
                            const targetMaterials = materials.filter(m => selectedMaterialIds.includes(m.id));

                            if (targetMaterials.length === 0) {
                                return (
                                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                        <table className="w-full text-left border-collapse bg-white dark:bg-slate-800">
                                            <tbody>
                                                <tr>
                                                    <td className="p-8 text-center text-slate-500 dark:text-slate-400">
                                                        Nenhum material selecionado no filtro.
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            }

                            // 2. Get all valid quotes for these materials
                            const validQuotes = quotes
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .filter(q => {
                                    if (q.status === QuoteStatus.REJECTED) return false;
                                    if (!targetMaterials.some(m => m.id === q.materialId)) return false;
                                    
                                    const quoteDate = new Date(q.date);
                                    const startMatch = !summaryStartDate || quoteDate >= new Date(summaryStartDate);
                                    const endMatch = !summaryEndDate || quoteDate <= new Date(summaryEndDate);
                                    return startMatch && endMatch;
                                });

                            // 3. Identify unique suppliers that have quotes for these materials
                            const supplierIds = Array.from(new Set(validQuotes.map(q => q.supplierId)));
                            const activeSuppliers = supplierIds.map(id => suppliers.find(s => s.id === id)).filter(Boolean) as Supplier[];

                            if (activeSuppliers.length === 0) {
                                return (
                                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                        <table className="w-full text-left border-collapse bg-white dark:bg-slate-800">
                                            <tbody>
                                                <tr>
                                                    <td className="p-8 text-center text-slate-500 dark:text-slate-400">
                                                        Nenhuma cotação encontrada para os materiais selecionados.
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            }

                            // 4. Calculate best price per material to sort rows
                            const getPrice = (q: Quote) => {
                                if (summaryViewType === 'net') {
                                    return q.normalizedPricePerBaseUnit * (1 - (q.icms || 0) / 100);
                                }
                                return q.normalizedPricePerBaseUnit;
                            };

                            const materialBestPrice = new Map<string, number>();
                            targetMaterials.forEach(m => {
                                const mQuotes = validQuotes.filter(q => q.materialId === m.id);
                                if (mQuotes.length > 0) {
                                    const best = Math.min(...mQuotes.map(q => getPrice(q)));
                                    materialBestPrice.set(m.id, best);
                                } else {
                                    materialBestPrice.set(m.id, Infinity);
                                }
                            });

                            // Sort materials by best price (lowest first) or alphabetically
                            const sortedMaterials = [...targetMaterials].sort((a, b) => {
                                if (summarySortBy === 'material') {
                                    return a.name.localeCompare(b.name);
                                } else {
                                    const priceA = materialBestPrice.get(a.id) || Infinity;
                                    const priceB = materialBestPrice.get(b.id) || Infinity;
                                    return priceA - priceB;
                                }
                            });

                            // 5. Sort suppliers by average price (lowest first)
                            const supplierAvgPrice = new Map<string, number>();
                            activeSuppliers.forEach(s => {
                                const sQuotes = validQuotes.filter(q => q.supplierId === s.id);
                                const avg = sQuotes.reduce((sum, q) => sum + getPrice(q), 0) / (sQuotes.length || 1);
                                supplierAvgPrice.set(s.id, avg);
                            });
                            const sortedSuppliers = [...activeSuppliers].sort((a, b) => (supplierAvgPrice.get(a.id) || 0) - (supplierAvgPrice.get(b.id) || 0));

                            const categories = Array.from(new Set(sortedMaterials.map(m => m.category || 'Geral'))).sort();

                            return (
                                <>
                                    {categories.map(category => {
                                        const categoryMaterials = sortedMaterials.filter(m => (m.category || 'Geral') === category);
                                        if (categoryMaterials.length === 0) return null;

                                        const categorySupplierIds = new Set<string>();
                                        categoryMaterials.forEach(m => {
                                            validQuotes.filter(q => q.materialId === m.id).forEach(q => categorySupplierIds.add(q.supplierId));
                                        });
                                        const categorySuppliers = sortedSuppliers.filter(s => categorySupplierIds.has(s.id));

                                        if (categorySuppliers.length === 0) return null;

                                        return (
                                            <div key={category} className="flex flex-col gap-2">
                                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                                                    {category}
                                                </h3>
                                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <table className="w-full text-left border-collapse bg-white dark:bg-slate-800">
                                                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Material</th>
                                                                {categorySuppliers.map(supplier => (
                                                                    <th key={supplier.id} className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center border-r border-slate-200 dark:border-slate-700 last:border-0">
                                                                        {supplier.name.split(' ')[0]}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                            {categoryMaterials.map(material => {
                                                                const materialQuotes = validQuotes.filter(q => q.materialId === material.id);
                                                                if (materialQuotes.length === 0) return null; // Skip materials with no quotes

                                                                // Find the best price among the latest quotes per supplier
                                                                const latestQuotesPerSupplier = new Map<string, Quote>();
                                                                materialQuotes.forEach(q => {
                                                                    if (!latestQuotesPerSupplier.has(q.supplierId)) {
                                                                        latestQuotesPerSupplier.set(q.supplierId, q);
                                                                    }
                                                                });

                                                                let bestPrice = Infinity;
                                                                latestQuotesPerSupplier.forEach(q => {
                                                                    const price = getPrice(q);
                                                                    if (price < bestPrice) {
                                                                        bestPrice = price;
                                                                    }
                                                                });

                                                                return (
                                                                    <tr key={material.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                                        <td className="p-4 text-sm font-medium text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                                            {material.name}
                                                                        </td>
                                                                        {categorySuppliers.map(supplier => {
                                                                            const quote = latestQuotesPerSupplier.get(supplier.id);
                                                                            const quotePrice = quote ? getPrice(quote) : Infinity;
                                                                            const isBest = quote && quotePrice === bestPrice;
                                                                            
                                                                            return (
                                                                                <td key={supplier.id} className={`p-4 text-sm text-center border-r border-slate-200 dark:border-slate-700 last:border-0 ${isBest ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' : 'text-slate-600 dark:text-slate-300'}`}>
                                                                                    {quote ? (
                                                                                        <div className="flex flex-col items-center justify-center">
                                                                                            <span>{quotePrice.toFixed(2).replace('.', ',')}</span>
                                                                                            <span className={`text-[10px] mt-0.5 whitespace-nowrap ${isBest ? 'text-emerald-500/80 dark:text-emerald-400/80' : 'text-slate-400 dark:text-slate-500'}`}>
                                                                                                ICMS: {quote.icms}%
                                                                                            </span>
                                                                                        </div>
                                                                                    ) : '-'}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};
