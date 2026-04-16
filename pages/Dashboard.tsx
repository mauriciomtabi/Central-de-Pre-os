import React, { useMemo, useState } from 'react';
import { Material, Quote, QuoteStatus, Supplier, Unit } from '../types';
import { DollarSign, Package, TrendingDown, Clock, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Activity, Filter, Calendar, Users, Minus, LayoutDashboard, X, FileText, Truck, CreditCard, PieChart as PieChartIcon, BarChart3, Wallet, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LabelList, AreaChart, Area } from 'recharts';

interface DashboardProps {
  quotes: Quote[];
  suppliers: Supplier[];
  materials: Material[];
  units: Unit[];
  onNavigate: (tab: string) => void;
}

type PeriodFilter = 'ALL' | 'MONTH' | 'QUARTER' | 'YEAR';

// Cores Modernas e Vibrantes para os Gráficos
const CHART_COLORS = {
    blue: '#3b82f6',
    indigo: '#6366f1',
    emerald: '#10b981',
    violet: '#8b5cf6',
    amber: '#f59e0b',
    rose: '#f43f5e',
    cyan: '#06b6d4',
    slate: '#64748b'
};

const PALETTE = [CHART_COLORS.blue, CHART_COLORS.emerald, CHART_COLORS.amber, CHART_COLORS.rose, CHART_COLORS.violet, CHART_COLORS.cyan, CHART_COLORS.indigo];

const STATUS_COLORS = {
  [QuoteStatus.APPROVED]: CHART_COLORS.emerald, 
  [QuoteStatus.REJECTED]: CHART_COLORS.rose, 
  [QuoteStatus.OPEN]: CHART_COLORS.blue,     
  [QuoteStatus.ANALYZING]: CHART_COLORS.amber 
};

const statusLabelsMap: Record<string, string> = {
  [QuoteStatus.APPROVED]: 'Aprovada',
  [QuoteStatus.REJECTED]: 'Rejeitada',
  [QuoteStatus.OPEN]: 'Aberta',
  [QuoteStatus.ANALYZING]: 'Em Análise'
};

// Formatter para valores compactos nos labels (ex: 15k, 1M)
const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) return `R$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
    return `R$${value.toFixed(0)}`;
};

// Componente StatCard Estilizado (Visual Moderno/Widget)
const StatCard = ({ 
  title, 
  value, 
  subValue, 
  icon: Icon, 
  trend, 
  trendValue,
  colorClass, 
  bgClass 
}: { 
  title: string; 
  value: string | number; 
  subValue?: string;
  icon: React.ElementType; 
  trend?: 'up' | 'down' | 'neutral' | null;
  trendValue?: string;
  colorClass: string; 
  bgClass: string;
}) => (
  <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300 group">
    
    {/* Watermark Icon (Fundo Decorativo Gigante) */}
    <div className={`absolute -right-6 -bottom-6 opacity-[0.05] pointer-events-none group-hover:opacity-[0.1] transition-opacity group-hover:scale-110 duration-500 ${colorClass.replace('text-', 'text-')}`}>
        <Icon size={120} />
    </div>

    <div className="flex justify-between items-start mb-6 relative z-10">
      {/* Icon Box */}
      <div className={`p-3 rounded-xl ${bgClass} ${colorClass} bg-opacity-10 dark:bg-opacity-20 shadow-sm border border-transparent dark:border-white/5`}>
        <Icon size={24} strokeWidth={2.5} />
      </div>

      {/* Trend Badge (Pill Shape no Topo Direito) */}
      {trend && trendValue ? (
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
          trend === 'up' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 
          trend === 'down' ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : 
          'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
        }`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : trend === 'down' ? <ArrowDownRight size={14} /> : <Minus size={12} />}
          {trendValue}
          <span className="text-[9px] font-normal opacity-70 ml-1">vs. anterior</span>
        </div>
      ) : (
          <div className="h-6"></div>
      )}
    </div>

    {/* Conteúdo Principal (Bottom) */}
    <div className="relative z-10">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{value}</h3>
      {subValue && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{subValue}</p>
      )}
    </div>
  </div>
);

// Tooltip Customizado para o Gráfico
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    // Identificadores de Tipo de Gráfico
    const isStackedChart = data.share !== undefined && data.total !== undefined && data.name !== undefined;
    const isMaterialChart = data.totalValue !== undefined && data.count !== undefined;
    const isPieChart = data.total !== undefined && !isStackedChart && !isMaterialChart;
    const isEvolutionChart = data.details !== undefined;

    return (
      <div className="bg-slate-900/95 backdrop-blur-sm text-white p-4 rounded-xl shadow-2xl border border-slate-700 text-sm z-50 min-w-[240px]">
        {/* Label do Item */}
        <p className="font-bold mb-3 text-slate-100 text-base border-b border-slate-700 pb-2 flex justify-between items-center">
            <span>{isPieChart ? data.name : label}</span>
            {isEvolutionChart && (
                <span className="text-xs font-normal text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full">
                    Total: R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
            )}
        </p>
        
        {/* Lógica para Tooltip de Evolução (Fornecedores Detalhados) */}
        {isEvolutionChart && (
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500 uppercase font-semibold mb-1">
                    <span>Fornecedor</span>
                    <span>Qtd / Valor</span>
                </div>
                {data.details.slice(0, 5).map((detail: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-800 last:border-0">
                        <span className="text-slate-300 truncate max-w-[120px]" title={detail.name}>{detail.name}</span>
                        <div className="text-right">
                            <div className="text-emerald-400 font-mono">R$ {detail.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                            <div className="text-[10px] text-slate-500">{detail.count} cotaç{detail.count > 1 ? 'ões' : 'ão'}</div>
                        </div>
                    </div>
                ))}
                {data.details.length > 5 && (
                    <div className="text-center text-[10px] text-slate-500 pt-1">
                        + {data.details.length - 5} outros...
                    </div>
                )}
            </div>
        )}

        {/* Lógica para Tooltip de Barras Empilhadas (Ranking Fornecedores) */}
        {isStackedChart && (
            <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-xs uppercase font-semibold">Participação Global:</span>
                    <span className="text-sm font-bold text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">
                        {data.share.toFixed(1)}%
                    </span>
                </div>
                <div className="border-t border-slate-700 pt-2 space-y-1">
                    <span className="text-slate-500 text-xs uppercase font-semibold block mb-1">Por Categoria:</span>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                <span className="text-slate-300">{entry.name}</span>
                            </div>
                            <span className="font-mono text-white">
                                R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-700 mt-1">
                    <span className="text-slate-400 font-bold">Total Aprovado:</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">
                        R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        )}

        {/* Lógica para Tooltip de Materiais (Top 5 - Simplificado conforme solicitação) */}
        {isMaterialChart && (
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs uppercase font-semibold">Volume de Cotações:</span>
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-base">{data.count}</span>
                        {data.shareOfCount !== undefined && (
                            <span className="text-[10px] text-blue-400 font-bold bg-blue-900/30 px-1.5 py-0.5 rounded">
                                {data.shareOfCount.toFixed(1)}% do total
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                    <span className="text-slate-500 text-xs uppercase font-semibold">Preço Unitário Médio:</span>
                    <span className="font-mono text-slate-300">
                        R$ {data.averageValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        )}

        {/* Lógica para Tooltip de Pizza (Status) */}
        {isPieChart && (
             <div className="space-y-1">
                 <div className="flex justify-between items-center">
                    <span className="text-slate-400">Quantidade:</span>
                    <span className="font-bold">{data.value}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-slate-400">Representatividade:</span>
                    <span className="font-bold text-blue-400">
                        {((data.value / (data.total || 1)) * 100).toFixed(1)}%
                    </span>
                 </div>
            </div>
        )}

        {/* Fallback para gráfico simples sem detalhes */}
        {!isStackedChart && !isPieChart && !isEvolutionChart && !isMaterialChart && (
            <div className="space-y-1">
                 <p className="text-white font-mono text-lg font-bold">
                    R$ {payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </p>
            </div>
        )}
      </div>
    );
  }
  return null;
};

// Modal (Tooltip de Detalhes)
const QuoteDetailModal = ({ 
    quote, 
    onClose, 
    suppliers,
    materials,
    units
}: { 
    quote: Quote, 
    onClose: () => void,
    suppliers: Supplier[],
    materials: Material[],
    units: Unit[]
}) => {
    // ... (Código do Modal permanece idêntico ao original, omitido para brevidade na resposta se não houve mudança)
    const supplier = suppliers.find(s => s.id === quote.supplierId);
    const material = materials.find(m => m.id === quote.materialId);
    const unit = units.find(u => u.id === quote.unitId);

    const baseTotal = quote.priceTotal;
    const ipiValue = baseTotal * ((quote.ipi || 0) / 100);
    const totalWithIpi = baseTotal + ipiValue;

    const statusColors = {
        [QuoteStatus.APPROVED]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        [QuoteStatus.REJECTED]: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
        [QuoteStatus.OPEN]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        [QuoteStatus.ANALYZING]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                         <FileText size={18} className="text-slate-500" />
                         <h3 className="font-bold text-slate-800 dark:text-white">Detalhes da Cotação</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                             <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Fornecedor</p>
                             <h4 className="text-lg font-bold text-slate-800 dark:text-white">{supplier?.name || 'Desconhecido'}</h4>
                             <p className="text-sm text-slate-500">{supplier?.contactEmail}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusColors[quote.status]}`}>
                            {statusLabelsMap[quote.status]}
                        </span>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                         <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-2">Item Cotado</p>
                         <div className="flex justify-between items-center mb-1">
                             <span className="font-medium text-slate-700 dark:text-slate-200">{material?.name}</span>
                             <span className="font-bold text-slate-800 dark:text-white">{quote.quantity} {unit?.symbol}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
                             <span className="text-slate-500 dark:text-slate-400">Preço Unit.</span>
                             <span className="text-slate-700 dark:text-slate-300">R$ {quote.priceUnit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                         </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 col-span-2 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 uppercase font-bold mb-1">
                                <DollarSign size={14} /> Totais
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Total S/ IPI:</span>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">R$ {baseTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between items-baseline mt-1">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Total Final (c/ IPI):</span>
                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">R$ {totalWithIpi.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>
                            {quote.ipi > 0 && <p className="text-[10px] text-right text-slate-400 mt-1">Inclui {quote.ipi}% de IPI</p>}
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">
                                <Calendar size={14} /> Data
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {quote.date.split('-').reverse().join('/')}
                            </p>
                        </div>
                         <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">
                                <Truck size={14} /> Frete / Prazo
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {quote.freight} - {quote.deliveryDays} dias
                            </p>
                        </div>
                         <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">
                                <CreditCard size={14} /> Pagamento
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {quote.paymentTerms || '-'}
                            </p>
                        </div>
                    </div>
                    
                    {quote.notes && (
                        <div className="pt-2">
                             <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Observações</p>
                             <p className="text-sm text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-700/30 p-2 rounded">"{quote.notes}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Custom Tick for Y-Axis to show %
const CustomYAxisTick = ({ x, y, payload, data }: any) => {
    // Find the data entry for this supplier to get the share %
    const entry = data.find((d: any) => d.name === payload.value);
    const share = entry ? entry.share.toFixed(1) : '0';
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={-6} y={0} dy={0} textAnchor="end" fill="#64748b" fontSize={11} fontWeight={500}>
          <tspan x={-6} dy="-0.4em" fontWeight="bold">{payload.value}</tspan>
          <tspan x={-6} dy="1.2em" fontSize={10} fill="#94a3b8">({share}%)</tspan>
        </text>
      </g>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ quotes, suppliers, materials, units, onNavigate }) => {
  // ... (Hooks, calculos de KPI permanecem idênticos, não alteramos a lógica)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('YEAR');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const calculateKPIs = (qs: Quote[]) => {
      const approvedQuotes = qs.filter(q => q.status === QuoteStatus.APPROVED);
      const approvedCount = approvedQuotes.length;
      const totalSpendBase = approvedQuotes.reduce((acc, q) => acc + (q.priceTotal || 0), 0);
      const totalSpendWithIpi = approvedQuotes.reduce((acc, q) => {
          const base = q.priceTotal || 0;
          const ipiVal = base * ((q.ipi || 0) / 100);
          return acc + base + ipiVal;
      }, 0);
      const pendingCount = qs.filter(q => q.status === QuoteStatus.OPEN || q.status === QuoteStatus.ANALYZING).length;
      return { totalSpendBase, totalSpendWithIpi, pendingCount, approvedCount, totalProcessed: qs.length };
  };

  const filteredQuotes = useMemo(() => {
    let result = [...quotes];
    const now = new Date();
    if (supplierFilter !== 'ALL') {
        result = result.filter(q => q.supplierId === supplierFilter);
    }
    if (periodFilter !== 'ALL') {
        result = result.filter(q => {
            const d = new Date(q.date + 'T12:00:00');
            if (periodFilter === 'YEAR') return d.getFullYear() === now.getFullYear();
            if (periodFilter === 'QUARTER') {
                const currentQuarter = Math.floor((now.getMonth() + 3) / 3);
                const quoteQuarter = Math.floor((d.getMonth() + 3) / 3);
                return d.getFullYear() === now.getFullYear() && quoteQuarter === currentQuarter;
            }
            if (periodFilter === 'MONTH') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            return true;
        });
    }
    return result.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [quotes, periodFilter, supplierFilter]);

  const currentStats = useMemo(() => calculateKPIs(filteredQuotes), [filteredQuotes]);

  const trendStats = useMemo(() => {
      if (periodFilter === 'ALL') return null;
      const now = new Date();
      let prevStartDate: Date, prevEndDate: Date;
      if (periodFilter === 'YEAR') {
          prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
          prevEndDate = new Date(now.getFullYear() - 1, 11, 31);
      } else if (periodFilter === 'MONTH') {
          prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
      } else { 
          const currentQuarter = Math.floor((now.getMonth() + 3) / 3);
          const prevQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
          const yearOfPrevQuarter = currentQuarter === 1 ? now.getFullYear() - 1 : now.getFullYear();
          const startMonth = (prevQuarter - 1) * 3;
          prevStartDate = new Date(yearOfPrevQuarter, startMonth, 1);
          prevEndDate = new Date(yearOfPrevQuarter, startMonth + 3, 0);
      }
      let prevQuotes = quotes.filter(q => {
          const d = new Date(q.date + 'T12:00:00');
          return d >= prevStartDate && d <= prevEndDate;
      });
      if (supplierFilter !== 'ALL') prevQuotes = prevQuotes.filter(q => q.supplierId === supplierFilter);
      const prevStats = calculateKPIs(prevQuotes);
      const calcTrend = (curr: number, prev: number) => {
          if (prev === 0) return null;
          const diff = ((curr - prev) / prev) * 100;
          return { value: `${diff > 0 ? '+' : ''}${diff.toFixed(0)}%`, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral' as const };
      };
      return {
          spend: calcTrend(currentStats.totalSpendWithIpi, prevStats.totalSpendWithIpi),
          approved: calcTrend(currentStats.approvedCount, prevStats.approvedCount),
          total: calcTrend(currentStats.totalProcessed, prevStats.totalProcessed)
      };
  }, [quotes, periodFilter, supplierFilter, currentStats]);

  const spendData = useMemo(() => {
    const acc: Record<string, { value: number; suppliers: Record<string, { count: number; total: number }> }> = {};
    const chartQuotes = [...filteredQuotes].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    chartQuotes.filter(q => q.status === QuoteStatus.APPROVED).forEach(q => {
        try {
            const date = new Date(q.date + 'T12:00:00');
            const key = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
            if (!acc[key]) acc[key] = { value: 0, suppliers: {} };
            acc[key].value += q.priceTotal;
            const supId = q.supplierId;
            if (!acc[key].suppliers[supId]) acc[key].suppliers[supId] = { count: 0, total: 0 };
            acc[key].suppliers[supId].count += 1;
            acc[key].suppliers[supId].total += q.priceTotal;
        } catch (e) { }
      });
    return Object.entries(acc).map(([name, data]) => ({ 
        name, value: data.value,
        details: Object.entries(data.suppliers).map(([supId, supData]) => ({
            name: suppliers.find(s => s.id === supId)?.name || 'Fornecedor Desconhecido',
            count: supData.count, value: supData.total
        })).sort((a, b) => b.value - a.value)
    }));
  }, [filteredQuotes, suppliers]);

  // --- NEW STACKED BAR CHART LOGIC (Value & Category Based) ---
  const topSuppliersValueData = useMemo(() => {
      // 1. Filter Approved Only
      const approvedQuotes = filteredQuotes.filter(q => q.status === QuoteStatus.APPROVED);
      // 2. Total Global Spend (Denominator)
      const totalGlobal = approvedQuotes.reduce((acc, q) => acc + (q.priceTotal * (1 + (q.ipi || 0)/100)), 0);

      const supplierStats: Record<string, { total: number, categories: Record<string, number> }> = {};

      approvedQuotes.forEach(q => {
        const val = q.priceTotal * (1 + (q.ipi || 0)/100);
        const mat = materials.find(m => m.id === q.materialId);
        const cat = mat?.category || 'Outros';

        if (!supplierStats[q.supplierId]) {
            supplierStats[q.supplierId] = { total: 0, categories: {} };
        }
        supplierStats[q.supplierId].total += val;
        supplierStats[q.supplierId].categories[cat] = (supplierStats[q.supplierId].categories[cat] || 0) + val;
      });

      const top5 = Object.entries(supplierStats)
        .map(([id, stat]) => ({
            id,
            name: suppliers.find(s => s.id === id)?.name || 'Desconhecido',
            total: stat.total,
            share: totalGlobal > 0 ? (stat.total / totalGlobal) * 100 : 0,
            ...stat.categories // Spread categories for Recharts
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      return top5;
  }, [filteredQuotes, suppliers, materials]);

  // Extract unique categories for the Stacked Bars
  const chartCategories = useMemo(() => {
      const cats = new Set<string>();
      topSuppliersValueData.forEach(row => {
          Object.keys(row).forEach(key => {
              if (key !== 'id' && key !== 'name' && key !== 'total' && key !== 'share') {
                  cats.add(key);
              }
          });
      });
      return Array.from(cats).sort();
  }, [topSuppliersValueData]);

  const topMaterialsData = useMemo(() => {
    const stats: Record<string, { count: number; totalValue: number; sumUnitPrices: number }> = {};
    let globalTotalCount = 0;
    let globalTotalValue = 0;
    filteredQuotes.forEach(q => {
        if (!stats[q.materialId]) stats[q.materialId] = { count: 0, totalValue: 0, sumUnitPrices: 0 };
        const value = q.priceTotal * (1 + (q.ipi || 0)/100);
        stats[q.materialId].count += 1;
        stats[q.materialId].totalValue += value;
        stats[q.materialId].sumUnitPrices += q.priceUnit; // Track unit price sum for average
        globalTotalCount += 1;
        globalTotalValue += value;
    });
    return Object.entries(stats).map(([id, stat]) => ({ 
            name: materials.find(m => m.id === id)?.name || 'Desc.', 
            count: stat.count, 
            totalValue: stat.totalValue, 
            averageValue: stat.sumUnitPrices / stat.count, // Corrected: Average Unit Price
            shareOfCount: globalTotalCount > 0 ? (stat.count / globalTotalCount) * 100 : 0,
            shareOfValue: globalTotalValue > 0 ? (stat.totalValue / globalTotalValue) * 100 : 0
        })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredQuotes, materials]);

  const statusData = useMemo(() => {
      const counts = { [QuoteStatus.APPROVED]: 0, [QuoteStatus.REJECTED]: 0, [QuoteStatus.OPEN]: 0, [QuoteStatus.ANALYZING]: 0 };
      let total = 0;
      filteredQuotes.forEach(q => {
          if (counts[q.status] !== undefined) { counts[q.status]++; total++; }
      });
      return [
          { name: 'Aprovadas', value: counts[QuoteStatus.APPROVED], total, color: STATUS_COLORS[QuoteStatus.APPROVED] },
          { name: 'Rejeitadas', value: counts[QuoteStatus.REJECTED], total, color: STATUS_COLORS[QuoteStatus.REJECTED] },
          { name: 'Abertas', value: counts[QuoteStatus.OPEN], total, color: STATUS_COLORS[QuoteStatus.OPEN] },
          { name: 'Em Análise', value: counts[QuoteStatus.ANALYZING], total, color: STATUS_COLORS[QuoteStatus.ANALYZING] }
      ].filter(d => d.value > 0);
  }, [filteredQuotes]);

  const recentActivity = filteredQuotes.slice(0, 6); 
  const selectClass = "pl-9 pr-8 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer shadow-sm";
  const headerClass = "bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors";
  const chartCardClass = "bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className={headerClass}>
         <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div className="flex items-center gap-2">
                <LayoutDashboard className="text-blue-600" size={24} />
                <div>
                   <h1 className="text-lg font-bold text-slate-800 dark:text-white">Visão Geral</h1>
                   <p className="text-xs text-slate-500 dark:text-slate-400">Indicadores de performance e inteligência de compras.</p>
                </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                <div className="relative">
                    <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <select className={selectClass} value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
                        <option value="ALL">Todos Fornecedores</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <select className={selectClass} value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}>
                        <option value="ALL">Todo Período</option>
                        <option value="YEAR">Este Ano</option>
                        <option value="QUARTER">Este Trimestre</option>
                        <option value="MONTH">Este Mês</option>
                    </select>
                    <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>
         </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Gasto Aprovado" 
            value={`R$ ${currentStats.totalSpendWithIpi.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
            subValue="Volume Financeiro Total" 
            icon={DollarSign} 
            colorClass="text-emerald-400" 
            bgClass="bg-emerald-500" 
            trend={trendStats?.spend?.direction} 
            trendValue={trendStats?.spend?.value} 
        />
        <StatCard 
            title="Cotações Aprovadas" 
            value={currentStats.approvedCount.toLocaleString('pt-BR')} 
            subValue={`Valor: R$ ${currentStats.totalSpendWithIpi.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
            icon={CheckCircle2} 
            colorClass="text-blue-400" 
            bgClass="bg-blue-500" 
            trend={trendStats?.approved?.direction} 
            trendValue={trendStats?.approved?.value} 
        />
        <StatCard 
            title="Total de Cotações" 
            value={currentStats.totalProcessed.toLocaleString('pt-BR')} 
            subValue="Volume Geral" 
            icon={FileText} 
            colorClass="text-indigo-400" 
            bgClass="bg-indigo-500" 
            trend={trendStats?.total?.direction} 
            trendValue={trendStats?.total?.value} 
        />
        <StatCard 
            title="Cotações Pendentes" 
            value={currentStats.pendingCount.toLocaleString('pt-BR')} 
            subValue="Aguardando Ação" 
            icon={Clock} 
            colorClass="text-amber-400" 
            bgClass="bg-amber-500" 
        />
      </div>

      {/* Row 1: Charts (Spend & Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chart - Spend Evolution (AREA CHART) */}
          <div className={`${chartCardClass} lg:col-span-2`}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                   <Activity size={20} className="text-blue-500" />
                   Evolução de Gastos Aprovados
                </h3>
             </div>
             <div className="h-[300px] w-full">
               {spendData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={spendData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                     <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
                     <Tooltip cursor={{ stroke: CHART_COLORS.blue, strokeWidth: 1, strokeDasharray: '4 4' }} content={<CustomTooltip />} />
                     <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={CHART_COLORS.blue} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorSpend)" 
                     />
                   </AreaChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Package size={48} strokeWidth={1} className="mb-2 opacity-20" />
                    <p className="text-sm">Sem dados neste período.</p>
                 </div>
               )}
             </div>
          </div>

          {/* Status Distribution (PIE CHART) */}
          <div className={chartCardClass}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                   <PieChartIcon size={20} className="text-violet-500" />
                   Status das Cotações
                </h3>
             </div>
             <div className="h-[300px] w-full relative">
                {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={100}
                                paddingAngle={4}
                                dataKey="value"
                                cornerRadius={4}
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{fontSize: '12px'}} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <PieChartIcon size={48} strokeWidth={1} className="mb-2 opacity-20" />
                        <p className="text-sm">Sem dados.</p>
                    </div>
                )}
                {statusData.length > 0 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-4 text-center pointer-events-none">
                         <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{filteredQuotes.length}</span>
                         <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Total</span>
                    </div>
                )}
             </div>
          </div>
      </div>

      {/* Row 2: Top Lists (BAR CHARTS - STYLIZED) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Top Suppliers by Value (Share of Wallet) - UPDATED CHART */}
          <div className={chartCardClass}>
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                      <Wallet size={20} className="text-emerald-500" />
                      Ranking: Volume Aprovado
                  </h3>
                  {topSuppliersValueData.length > 0 && (
                      <span className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded font-bold">
                          Top 5
                      </span>
                  )}
              </div>
              <div className="h-[250px]">
                  {topSuppliersValueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={topSuppliersValueData} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={120} 
                                tick={(props) => <CustomYAxisTick {...props} data={topSuppliersValueData} />} 
                                interval={0}
                            />
                            <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize: '10px'}} />
                            
                            {/* Dynamically create bars for each category present in the data */}
                            {chartCategories.map((category, index) => (
                                <Bar 
                                    key={category} 
                                    dataKey={category} 
                                    stackId="a" 
                                    fill={PALETTE[index % PALETTE.length]} 
                                    radius={[0, 4, 4, 0]} // Only round the end if it's the last one, but simpler to just round right on the container if possible. Recharts stack handles inner radius poorly, simple is better.
                                    barSize={20}
                                    name={category}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados aprovados.</div>
                  )}
              </div>
          </div>

          {/* Top Materials (Count Based) - Keeps variety in metrics */}
          <div className={chartCardClass}>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                   <BarChart3 size={20} className="text-amber-500" />
                   Top 5 Materiais Mais Requisitados
              </h3>
              <div className="h-[250px]">
                  {topMaterialsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={topMaterialsData} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={120} 
                                tick={{fontSize: 11, fill: '#64748b', fontWeight: 500}} 
                                interval={0}
                            />
                            <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                                {topMaterialsData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PALETTE[(index + 3) % PALETTE.length]} fillOpacity={0.9} />
                                ))}
                                <LabelList 
                                    dataKey="count" 
                                    position="right" 
                                    style={{ fill: '#64748b', fontSize: '12px', fontWeight: 'bold' }} 
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados.</div>
                  )}
              </div>
          </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
           <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Últimas Atualizações</h3>
                <button 
                    onClick={() => onNavigate('quotes')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold"
                >
                    Ver Tudo
                </button>
           </div>
           
           {recentActivity.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {recentActivity.map((quote) => {
                 const statusColors = {
                    [QuoteStatus.APPROVED]: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
                    [QuoteStatus.REJECTED]: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20',
                    [QuoteStatus.OPEN]: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
                    [QuoteStatus.ANALYZING]: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
                 };

                 const StatusIcon = 
                    quote.status === QuoteStatus.APPROVED ? CheckCircle2 : 
                    quote.status === QuoteStatus.REJECTED ? XCircle : Clock;
                 
                 const supplierName = suppliers.find(s => s.id === quote.supplierId)?.name || 'Fornecedor Desconhecido';
                 const material = materials.find(m => m.id === quote.materialId);
                 const unit = units.find(u => u.id === quote.unitId);
                 const totalWithIpi = quote.priceTotal * (1 + (quote.ipi || 0) / 100);

                 return (
                   <div 
                        key={quote.id} 
                        onClick={() => setSelectedQuote(quote)}
                        className="flex items-start p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer group relative"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${statusColors[quote.status]} mt-1`}>
                         <StatusIcon size={18} />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                         <p className="text-sm font-bold text-slate-800 dark:text-white truncate mb-0.5" title={material?.name}>
                            {material?.name || 'Material Indefinido'}
                         </p>
                         <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-3" title={`${supplierName} - ${quote.quantity} ${unit?.symbol}`}>
                            {supplierName} • <span className="font-medium text-slate-600 dark:text-slate-300">{quote.quantity} {unit?.symbol}</span>
                         </p>
                         <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-700 pt-2">
                             <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${statusColors[quote.status]}`}>
                                    {statusLabelsMap[quote.status]}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {quote.date.split('-').reverse().slice(0, 2).join('/')}
                                </span>
                             </div>
                             <div className="text-right">
                                <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                                    R$ {totalWithIpi.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                   {quote.priceUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{unit?.symbol}
                                </span>
                             </div>
                         </div>
                      </div>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="text-center py-10 text-slate-400 text-sm">Nenhuma atividade encontrada neste período.</div>
           )}
        </div>

      {/* Quote Detail Modal */}
      {selectedQuote && (
          <QuoteDetailModal 
            quote={selectedQuote} 
            onClose={() => setSelectedQuote(null)} 
            suppliers={suppliers}
            materials={materials}
            units={units}
          />
      )}
    </div>
  );
};