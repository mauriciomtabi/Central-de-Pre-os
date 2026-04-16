import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Quote, Material, Supplier } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Filter, Percent, Search, ChevronDown, Check, X, Users, Trophy } from 'lucide-react';

interface MarketAnalysisProps {
  quotes: Quote[];
  materials: Material[];
  suppliers: Supplier[];
  isTutorialMode?: boolean;
}

type TimeFilter = 'ALL' | 'YEAR' | 'SEMESTER' | 'QUARTER' | 'MONTH';
type PriceType = 'GROSS' | 'NET';

// Componente Tooltip Personalizado para destacar o melhor preço
const CustomHistoryTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Filtrar apenas valores numéricos válidos
    const values = payload
        .map((p: any) => p.value)
        .filter((v: any) => typeof v === 'number');
    
    // Encontrar o menor preço do dia
    const minPrice = values.length > 0 ? Math.min(...values) : null;

    // Ordenar payload do menor para o maior preço para facilitar leitura
    const sortedPayload = [...payload].sort((a: any, b: any) => a.value - b.value);

    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 p-3 rounded-xl shadow-2xl z-50 min-w-[220px]">
        <p className="text-slate-400 text-xs font-bold mb-3 border-b border-slate-700 pb-2 flex items-center gap-2">
            <Calendar size={12} /> {label}
        </p>
        <div className="space-y-2">
          {sortedPayload.map((entry: any, index: number) => {
            // Verifica se é o melhor preço (com tolerância para float)
            const isBest = minPrice !== null && Math.abs(entry.value - minPrice) < 0.001;
            
            return (
              <div key={index} className={`flex items-center justify-between gap-3 text-xs ${isBest ? 'bg-emerald-900/20 -mx-2 px-2 py-1 rounded' : ''}`}>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></div>
                   <span className={`truncate max-w-[120px] ${isBest ? 'text-white font-medium' : 'text-slate-300'}`}>
                     {entry.name}
                   </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`font-mono ${isBest ? 'text-emerald-400 font-bold text-sm' : 'text-slate-300'}`}>
                        R$ {Number(entry.value).toFixed(2)}
                    </span>
                    {isBest && (
                        <div className="bg-emerald-500 text-white text-[9px] font-bold p-1 rounded-full shadow-lg shadow-emerald-900/50" title="Melhor Preço">
                            <Trophy size={10} />
                        </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

// Componente para renderizar o label de preço e variação no gráfico (Pontos)
const CustomizedLabel = (props: any) => {
  const { x, y, value, index, data, dataKey } = props;

  // Proteção contra valores undefined/null que podem causar erro no toFixed
  if (value === undefined || value === null || typeof value !== 'number') {
      return null;
  }

  // Calcular Porcentagem em relação ao ponto anterior DO MESMO FORNECEDOR
  let percentChange = null;
  
  if (index > 0 && data && Array.isArray(data)) {
    // Procura para trás o primeiro valor válido para este fornecedor específico
    for (let i = index - 1; i >= 0; i--) {
        // Proteção: verifica se a linha de dados existe antes de acessar
        if (!data[i]) continue;

        const val = data[i][dataKey];
        if (val !== undefined && val !== null && typeof val === 'number') {
            const diff = value - val;
            if (val !== 0) {
                percentChange = ((diff / val) * 100);
            }
            break;
        }
    }
  }

  return (
    <g>
      {/* Preço em cor clara (Slate 300) para harmonizar */}
      <text x={x} y={y} dy={-22} fill="#cbd5e1" fontSize={11} textAnchor="middle" fontWeight="bold">
        R$ {value.toFixed(2)}
      </text>
      
      {/* Variação Percentual */}
      {percentChange !== null && Math.abs(percentChange) > 0.01 && (
        <text 
            x={x} 
            y={y} 
            dy={-10} 
            fill={percentChange > 0 ? "#ef4444" : "#22c55e"} // Vermelho se subiu, Verde se caiu
            fontSize={9} 
            textAnchor="middle" 
            fontWeight="bold"
        >
            {percentChange > 0 ? '▲' : '▼'} {Math.abs(percentChange).toFixed(1)}%
        </text>
      )}
    </g>
  );
};

export const MarketAnalysis: React.FC<MarketAnalysisProps> = ({ quotes, materials, suppliers, isTutorialMode }) => {
  // Lógica para determinar o material padrão (último cotado)
  const defaultMaterialId = useMemo(() => {
      if (quotes && quotes.length > 0) {
          const sorted = [...quotes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return sorted[0].materialId;
      }
      return materials[0]?.id || '';
  }, [quotes, materials]);

  // Inicializa vazio para deixar o useEffect controlar a carga inicial, mas permite limpeza
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('YEAR');
  const [priceType, setPriceType] = useState<PriceType>('GROSS');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');

  // Searchable Select State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Auto-select filter in tutorial mode
  useEffect(() => {
    if (isTutorialMode) {
      setTimeFilter('SEMESTER');
    }
  }, [isTutorialMode]);

  // CORREÇÃO: Removemos selectedMaterialId das dependências.
  // Isso garante que o produto padrão só seja setado quando a lista de materiais/cotações carrega (defaultMaterialId muda),
  // e não quando o usuário limpa o campo (o que antes causava o "reset" indesejado).
  useEffect(() => {
      if (!selectedMaterialId && defaultMaterialId) {
          setSelectedMaterialId(defaultMaterialId);
      }
  }, [defaultMaterialId]);

  // Sync searchTerm with selectedMaterialId initially or when changed externally
  useEffect(() => {
    const mat = materials.find(m => m.id === selectedMaterialId);
    if (mat) {
        setSearchTerm(mat.name);
    } else if (selectedMaterialId === '') {
        setSearchTerm('');
    }
  }, [selectedMaterialId, materials]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
            setIsSearchOpen(false);
            // Revert term if nothing valid selected
            const mat = materials.find(m => m.id === selectedMaterialId);
            if (mat) {
                setSearchTerm(mat.name);
            } else {
                setSearchTerm(''); 
            }
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedMaterialId, materials]);

  const filteredMaterials = useMemo(() => {
      return materials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [materials, searchTerm]);


  // Paleta de cores para os fornecedores
  const colors = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#9333ea', '#0891b2', '#db2777', '#4f46e5'];

  // Dados para o Gráfico
  const { chartData, suppliersInChart } = useMemo(() => {
    if (!selectedMaterialId) return { chartData: [], suppliersInChart: [] };
    
    // 1. Filtrar pelo Material
    let filteredQuotes = quotes.filter(q => q.materialId === selectedMaterialId);

    // 2. Filtrar pelo Fornecedor (Novo Filtro)
    if (selectedSupplierId !== 'ALL') {
        filteredQuotes = filteredQuotes.filter(q => q.supplierId === selectedSupplierId);
    }

    // 3. Filtrar pelo Período
    const now = new Date();
    filteredQuotes = filteredQuotes.filter(q => {
        // Append T12:00:00 to prevent timezone shift issues when comparing dates
        const d = new Date(q.date + 'T12:00:00');
        if (timeFilter === 'ALL') return true;
        if (timeFilter === 'YEAR') return d.getFullYear() === now.getFullYear();
        if (timeFilter === 'SEMESTER') {
            const currentSemester = Math.floor(now.getMonth() / 6); // 0 (Jan-Jun) or 1 (Jul-Dec)
            const quoteSemester = Math.floor(d.getMonth() / 6);
            return d.getFullYear() === now.getFullYear() && quoteSemester === currentSemester;
        }
        if (timeFilter === 'QUARTER') {
            const currentQuarter = Math.floor((now.getMonth() + 3) / 3);
            const quoteQuarter = Math.floor((d.getMonth() + 3) / 3);
            return d.getFullYear() === now.getFullYear() && quoteQuarter === currentQuarter;
        }
        if (timeFilter === 'MONTH') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
    });

    // 4. Obter datas únicas para o eixo X e fornecedores únicos para as linhas
    const sortedQuotes = filteredQuotes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const uniqueDates: string[] = Array.from(new Set(sortedQuotes.map(q => q.date)));
    const uniqueSupplierIds = Array.from(new Set(sortedQuotes.map(q => q.supplierId)));

    // 5. Construir estrutura de dados para o Recharts
    const data = uniqueDates.map(date => {
        const entry: any = { 
            // Fix display date directly from string YYYY-MM-DD
            date: date.split('-').reverse().join('/'),
            fullDate: date
        };
        
        uniqueSupplierIds.forEach(supId => {
            // Encontrar cotação para este fornecedor nesta data
            const quote = sortedQuotes.find(q => q.date === date && q.supplierId === supId);
            if (quote) {
                const supName = suppliers.find(s => s.id === supId)?.name || 'Desc.';
                
                // Calcular Preço com base na seleção (Bruto ou Líquido)
                let finalPrice = quote.normalizedPricePerBaseUnit;
                if (priceType === 'NET') {
                    const icms = quote.icms || 0;
                    finalPrice = finalPrice * (1 - (icms / 100));
                }

                entry[supName] = Number(finalPrice.toFixed(2));
            }
        });
        return entry;
    });

    const activeSuppliers = uniqueSupplierIds.map(id => suppliers.find(s => s.id === id)?.name || 'Desconhecido');

    return { chartData: data, suppliersInChart: activeSuppliers };
  }, [quotes, selectedMaterialId, timeFilter, suppliers, priceType, selectedSupplierId]);

  const cardClass = "bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors";
  // Standard header class matching other pages (p-4 instead of p-6, flex-col md:flex-row)
  const headerClass = "bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors";

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className={headerClass}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Análise de Preços</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Compare a evolução de preços entre fornecedores.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-wrap items-center">
            {/* Seletor de Tipo de Preço */}
            <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-lg flex order-2 sm:order-1">
                <button 
                    onClick={() => setPriceType('GROSS')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${priceType === 'GROSS' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    Preço Bruto
                </button>
                <button 
                    onClick={() => setPriceType('NET')}
                    className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${priceType === 'NET' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <Percent size={14} /> Líquido (s/ ICMS)
                </button>
            </div>

            {/* Seletor de Material Pesquisável */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none w-full sm:w-auto order-1 sm:order-2" ref={searchWrapperRef}>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap hidden md:block">Produto:</span>
                <div className="relative w-full sm:w-72">
                    <input 
                        type="text"
                        placeholder="Buscar produto..."
                        className="w-full pl-9 pr-8 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsSearchOpen(true);
                            if (e.target.value === '') setSelectedMaterialId('');
                        }}
                        onFocus={() => setIsSearchOpen(true)}
                    />
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    {searchTerm ? (
                         <button 
                            onClick={() => { setSearchTerm(''); setSelectedMaterialId(''); setIsSearchOpen(true); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                         >
                            <X size={14} />
                         </button>
                    ) : (
                         <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    )}

                    {isSearchOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                            {filteredMaterials.length > 0 ? (
                                filteredMaterials.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => {
                                            setSelectedMaterialId(m.id);
                                            setSearchTerm(m.name);
                                            setIsSearchOpen(false);
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
                                    Nenhum produto encontrado.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Filtro de Tempo */}
            <div className="flex items-center gap-2 order-3">
                <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <select 
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                        className="pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    >
                        <option value="ALL">Todo Período</option>
                        <option value="YEAR">Este Ano</option>
                        <option value="SEMESTER">Este Semestre</option>
                        <option value="QUARTER">Este Trimestre</option>
                        <option value="MONTH">Este Mês</option>
                    </select>
                </div>
            </div>
            
            {/* Filtro de Fornecedor */}
            <div className="flex items-center gap-2 order-4">
                <div className="relative">
                    <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <select 
                        value={selectedSupplierId}
                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                        className="pl-9 pr-8 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none max-w-[200px]"
                    >
                        <option value="ALL">Todos Fornecedores</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className={`${cardClass} min-h-[500px]`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Histórico de Variação ({priceType === 'GROSS' ? 'Bruto' : 'Líquido'})
            </h3>
            <div className="text-xs text-slate-400 flex items-center gap-1">
                <Filter size={12} />
                Filtro: {timeFilter === 'ALL' ? 'Tudo' : timeFilter === 'YEAR' ? 'Ano Atual' : timeFilter === 'SEMESTER' ? 'Semestre Atual' : timeFilter === 'QUARTER' ? 'Trimestre Atual' : 'Mês Atual'}
            </div>
          </div>
          
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 40, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#94a3b8'}} stroke="#64748b" dy={10} />
                <YAxis 
                    domain={['dataMin', 'dataMax']} 
                    tick={{fontSize: 12, fill: '#94a3b8'}} 
                    stroke="#64748b" 
                    tickFormatter={(v) => `R$${v}`} 
                    padding={{ top: 20, bottom: 20 }}
                />
                <Tooltip 
                   content={<CustomHistoryTooltip />}
                />
                <Legend wrapperStyle={{paddingTop: '20px'}} />
                
                {suppliersInChart.map((supplierName, index) => (
                    <Line 
                        key={supplierName}
                        type="monotone" 
                        dataKey={supplierName} 
                        stroke={colors[index % colors.length]} 
                        strokeWidth={2} 
                        dot={{ r: 4 }} 
                        activeDot={{ r: 6 }} 
                        connectNulls
                        name={supplierName}
                        label={<CustomizedLabel data={chartData} dataKey={supplierName} />} 
                    />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
              <Calendar size={48} className="mb-4 opacity-20" />
              <p>Nenhum dado encontrado para o período e material selecionados.</p>
              <button onClick={() => setTimeFilter('ALL')} className="mt-2 text-blue-500 hover:underline text-sm">Ver todo o histórico</button>
            </div>
          )}
      </div>
      
      {/* Comparator Table */}
      <div className={cardClass}>
         <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Comparativo de Últimas Cotações</h3>
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">Spot</span>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th className="px-4 py-3">Fornecedor</th>
                        <th className="px-4 py-3">Data Cotação</th>
                        <th className="px-4 py-3">Preço Base ({priceType === 'GROSS' ? 'Bruto' : 'Liq. ICMS'})</th>
                        <th className="px-4 py-3">Preço Unit. Orig.</th>
                        <th className="px-4 py-3">ICMS</th>
                        <th className="px-4 py-3">Frete</th>
                        <th className="px-4 py-3">Prazo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {suppliers
                        // Apply same supplier filter to table
                        .filter(s => selectedSupplierId === 'ALL' || s.id === selectedSupplierId)
                        .map(supplier => {
                            const supplierQuotes = quotes
                                .filter(q => q.supplierId === supplier.id && q.materialId === selectedMaterialId)
                                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                            
                            if(supplierQuotes.length === 0) return null;
                            const last = supplierQuotes[0];

                            // Calcular valores para exibição
                            let displayPrice = last.normalizedPricePerBaseUnit;
                            if (priceType === 'NET') {
                                displayPrice = displayPrice * (1 - ((last.icms || 0) / 100));
                            }

                            // Encontrar o menor preço GLOBALMENTE (considerando o tipo de preço selecionado)
                            const allPrices = quotes
                                .filter(q => q.materialId === selectedMaterialId)
                                .map(q => {
                                    let p = q.normalizedPricePerBaseUnit;
                                    if (priceType === 'NET') p = p * (1 - ((q.icms || 0) / 100));
                                    return p;
                                });
                            
                            const minPrice = Math.min(...allPrices);
                            const isBestPrice = Math.abs(displayPrice - minPrice) < 0.001; // Tolerância para float

                            return (
                                <tr key={supplier.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isBestPrice ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                        {supplier.name}
                                        {isBestPrice && <span className="ml-2 text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800">Melhor Preço</span>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{last.date.split('-').reverse().join('/')}</td>
                                    <td className={`px-4 py-3 font-bold ${isBestPrice ? 'text-green-700 dark:text-green-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                        R$ {displayPrice.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                        R$ {last.priceUnit.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                        {last.icms ? `${last.icms}%` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                                        {last.freight}
                                    </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{last.deliveryDays} dias</td>
                                </tr>
                            )
                    })}
                </tbody>
            </table>
            {suppliers.filter(s => selectedSupplierId === 'ALL' || s.id === selectedSupplierId).every(s => !quotes.some(q => q.supplierId === s.id && q.materialId === selectedMaterialId)) && (
               <div className="p-8 text-center text-slate-400 dark:text-slate-500">Nenhum fornecedor cotou este item ainda.</div>
            )}
         </div>
      </div>
    </div>
  );
};