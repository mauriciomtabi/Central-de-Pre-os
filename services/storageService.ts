import { Quote, Supplier, Material, Unit, QuoteStatus, SimulationScenario } from "../types";
import { supabase } from "../lib/supabase";

const ERROR_NO_COMPANY = "Usuário não possui empresa vinculada. Acesse 'Minha Equipe' para configurar.";

// --- Local Storage Helpers (READ-ONLY CACHE for performance) ---
const LOCAL_KEYS = {
    QUOTES: 'global_aco_demo_quotes',
    SUPPLIERS: 'global_aco_demo_suppliers',
    MATERIALS: 'global_aco_demo_materials',
    UNITS: 'global_aco_demo_units',
    SIMULATIONS: 'global_aco_demo_simulations',
    TEAM: 'global_aco_demo_team'
};

const getLocal = <T>(key: string): T[] => {
    try {
        const data = localStorage.getItem(key);
        if (!data) return [];
        // Handle potentially truncated JSON strings
        try {
            return JSON.parse(data);
        } catch (parseError) {
            console.warn(`Corrupted cache for key "${key}", clearing...`);
            localStorage.removeItem(key);
            return [];
        }
    } catch {
        return [];
    }
};

const setLocal = <T>(key: string, data: T[]) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn(`Storage Quota Exceeded or Error for key "${key}". Caching skipped.`);
    }
};

// --- Mappers ---
const mapSupplier = (s: any): Supplier => ({
  id: s.id,
  name: s.name || 'Desconhecido',
  rating: Number(s.rating) || 0,
  contactEmail: s.contact_email || '',
  salesperson: s.salesperson || '',
  salespersonPhone: s.salesperson_phone || '', 
  notes: s.notes || '',
  companyId: s.company_id
});

const mapMaterial = (m: any): Material => ({
  id: m.id,
  name: m.name || 'Sem Nome',
  category: m.category || 'Geral',
  baseUnitId: m.base_unit_id,
  ipi: Number(m.ipi) || 0,
  companyId: m.company_id
});

const mapUnit = (u: any): Unit => ({
  id: u.id,
  name: u.name,
  symbol: u.symbol,
  conversionFactor: Number(u.conversion_factor) || 1,
  companyId: u.company_id
});

const mapQuote = (q: any): Quote => ({
  id: q.id,
  supplierId: q.supplier_id,
  materialId: q.material_id,
  date: q.date,
  quantity: Number(q.quantity) || 0,
  unitId: q.unit_id,
  priceUnit: Number(q.price_unit) || 0,
  priceTotal: Number(q.price_total) || 0,
  normalizedPricePerBaseUnit: Number(q.normalized_price_per_base_unit) || 0,
  freight: q.freight,
  deliveryDays: Number(q.delivery_days) || 0,
  icms: Number(q.icms) || 0,
  ipi: Number(q.ipi) || 0,
  status: q.status,
  paymentTerms: q.payment_terms || '',
  attachments: q.attachments || [],
  notes: q.notes || '',
  companyId: q.company_id
});

const mapSimulation = (s: any): SimulationScenario => ({
  id: s.id,
  materialId: s.material_id,
  targetMargin: Number(s.target_margin) || 0,
  rows: Array.isArray(s.rows) ? s.rows.map((r: any) => ({
      id: r.id,
      supplierName: r.supplierName,
      price: Number(r.price) || 0,
      purchaseIcms: Number(r.purchaseIcms) || 0,
      freight: r.freight || 'CIF',
      weight: Number(r.weight) || 0,
      quoteDate: r.quoteDate
  })) : [], 
  createdAt: s.created_at,
  companyId: s.company_id
});

// --- Timeout Helper ---
const withTimeout = async <T>(promise: PromiseLike<T>, ms = 10000, errorMsg = 'Tempo limite de conexão excedido'): Promise<any> => {
    let timer: any;
    const timeout = new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    });
    return Promise.race([
        Promise.resolve(promise).then(res => { clearTimeout(timer); return res; }),
        timeout
    ]);
};

// --- Auth Helper ---
const getContext = async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
        throw new Error("Sessão inválida. Tente fazer login novamente.");
    }

    // PERFORMANCE FIX: Cache-First Strategy
    // Tenta recuperar o company_id do cache local primeiro para evitar latência de rede.
    // O AuthContext já garante que este valor é atualizado no login.
    const cachedCompanyId = localStorage.getItem('cached_company_id');
    if (cachedCompanyId) {
        return { user: session.user, companyId: cachedCompanyId };
    }

    // Fallback: Se não estiver em cache, consulta o banco (mais lento)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', session.user.id)
        .single();

    if (profileError || !profile?.company_id) {
        throw new Error(ERROR_NO_COMPANY);
    }

    // Atualiza o cache para próximas chamadas
    localStorage.setItem('cached_company_id', profile.company_id);

    return { user: session.user, companyId: profile.company_id };
};

let memoryCache = {
    quotes: null as Quote[] | null,
    suppliers: null as Supplier[] | null,
    materials: null as Material[] | null,
    units: null as Unit[] | null,
    simulations: null as SimulationScenario[] | null,
    team: null as any[] | null,
    categories: null as string[] | null,
};

export const clearStorageCache = () => {
    memoryCache = {
        quotes: null,
        suppliers: null,
        materials: null,
        units: null,
        simulations: null,
        team: null,
        categories: null,
    };
};

export const StorageService = {
  // --- READS ---
  
  getQuotes: async (forceRefresh = false): Promise<Quote[]> => {
    if (!forceRefresh && memoryCache.quotes) return memoryCache.quotes;
    try {
      const { companyId } = await getContext();
      
      const { data, error } = await supabase
            .from('quotes')
            .select('*')
            .eq('company_id', companyId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

      if (error) throw error;
        
      const dbQuotes = (data || []).map(mapQuote);
      setLocal(LOCAL_KEYS.QUOTES, dbQuotes);
      memoryCache.quotes = dbQuotes;
      return dbQuotes;
    } catch (e: any) {
      if (e.message === ERROR_NO_COMPANY) return [];
      console.error("Read Quotes Error:", e);
      return getLocal<Quote>(LOCAL_KEYS.QUOTES);
    }
  },
  
  getSuppliers: async (forceRefresh = false): Promise<Supplier[]> => {
    if (!forceRefresh && memoryCache.suppliers) return memoryCache.suppliers;
    try {
      const { companyId } = await getContext();
      const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('company_id', companyId)
            .order('name', { ascending: true });

      if (error) throw error;
        
      const dbSuppliers = (data || []).map(mapSupplier);
      setLocal(LOCAL_KEYS.SUPPLIERS, dbSuppliers);
      memoryCache.suppliers = dbSuppliers;
      return dbSuppliers;
    } catch (e: any) {
      if (e.message === ERROR_NO_COMPANY) return [];
      return getLocal<Supplier>(LOCAL_KEYS.SUPPLIERS);
    }
  },
  
  getMaterials: async (forceRefresh = false): Promise<Material[]> => {
    if (!forceRefresh && memoryCache.materials) return memoryCache.materials;
    try {
      const { companyId } = await getContext();
      const { data, error } = await supabase
            .from('materials')
            .select('*')
            .eq('company_id', companyId)
            .order('name', { ascending: true });

      if (error) throw error;

      const dbMaterials = (data || []).map(mapMaterial);
      setLocal(LOCAL_KEYS.MATERIALS, dbMaterials);
      memoryCache.materials = dbMaterials;
      return dbMaterials;
    } catch (e: any) {
      if (e.message === ERROR_NO_COMPANY) return [];
      return getLocal<Material>(LOCAL_KEYS.MATERIALS);
    }
  },
  
  getUnits: async (forceRefresh = false): Promise<Unit[]> => {
    if (!forceRefresh && memoryCache.units) return memoryCache.units;
    try {
      const { companyId } = await getContext();
      const { data, error } = await supabase.from('units').select('*').eq('company_id', companyId);

      if (error) throw error;
      
      const dbUnits = (data || []).map(mapUnit);
      setLocal(LOCAL_KEYS.UNITS, dbUnits);
      memoryCache.units = dbUnits;
      return dbUnits;
    } catch (e: any) {
      if (e.message === ERROR_NO_COMPANY) return [];
      return getLocal<Unit>(LOCAL_KEYS.UNITS);
    }
  },

  getSimulations: async (forceRefresh = false): Promise<SimulationScenario[]> => {
    if (!forceRefresh && memoryCache.simulations) return memoryCache.simulations;
    try {
      const { companyId } = await getContext();
      const { data, error } = await supabase
            .from('simulations')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

      if (error) throw error;
        
      const dbSims = (data || []).map(mapSimulation);
      setLocal(LOCAL_KEYS.SIMULATIONS, dbSims);
      memoryCache.simulations = dbSims;
      return dbSims;
    } catch (e: any) {
      if (e.message === ERROR_NO_COMPANY) return [];
      return getLocal<SimulationScenario>(LOCAL_KEYS.SIMULATIONS);
    }
  },

  // --- WRITES (Strict DB Only - Protected by Timeout) ---

  addQuote: async (quote: Quote) => {
    const { companyId } = await getContext();

    const { error } = await withTimeout(
        supabase.from('quotes').insert({
          id: quote.id,
          supplier_id: quote.supplierId,
          material_id: quote.materialId,
          date: quote.date,
          quantity: quote.quantity,
          unit_id: quote.unitId,
          price_unit: quote.priceUnit,
          price_total: quote.priceTotal,
          normalized_price_per_base_unit: quote.normalizedPricePerBaseUnit,
          freight: quote.freight,
          delivery_days: quote.deliveryDays,
          icms: quote.icms,
          ipi: quote.ipi,
          status: quote.status,
          payment_terms: quote.paymentTerms,
          attachments: quote.attachments,
          notes: quote.notes,
          company_id: companyId 
        })
    );

    if (error) throw new Error(error.message);
    memoryCache.quotes = null;
  },

  updateQuote: async (quote: Quote) => {
    const { companyId } = await getContext();

    const { error } = await withTimeout(
        supabase.from('quotes').update({
          supplier_id: quote.supplierId,
          material_id: quote.materialId,
          date: quote.date,
          quantity: quote.quantity,
          unit_id: quote.unitId,
          price_unit: quote.priceUnit,
          price_total: quote.priceTotal,
          normalized_price_per_base_unit: quote.normalizedPricePerBaseUnit,
          freight: quote.freight,
          delivery_days: quote.deliveryDays,
          icms: quote.icms,
          ipi: quote.ipi,
          status: quote.status,
          payment_terms: quote.paymentTerms,
          attachments: quote.attachments,
          notes: quote.notes
        }).eq('id', quote.id).eq('company_id', companyId)
    );

    if (error) throw new Error(error.message);
    memoryCache.quotes = null;
  },

  updateQuoteStatus: async (id: string, status: QuoteStatus) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('quotes').update({ status }).eq('id', id).eq('company_id', companyId)
    );
    if (error) throw new Error(error.message);
    memoryCache.quotes = null;
  },

  deleteQuote: async (id: string) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('quotes').delete().eq('id', id).eq('company_id', companyId)
    );
    if (error) throw new Error(error.message);
    memoryCache.quotes = null;
  },

  addSupplier: async (supplier: Supplier) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('suppliers').upsert({
          id: supplier.id,
          name: supplier.name,
          rating: supplier.rating,
          contact_email: supplier.contactEmail,
          salesperson: supplier.salesperson,
          salesperson_phone: supplier.salespersonPhone,
          notes: supplier.notes,
          company_id: companyId
        }, { onConflict: 'id' })
    );
    
    if (error) throw new Error(error.message);
    memoryCache.suppliers = null;
  },

  updateSupplier: async (supplier: Supplier) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('suppliers').update({
          name: supplier.name,
          rating: supplier.rating,
          contact_email: supplier.contactEmail,
          salesperson: supplier.salesperson,
          salesperson_phone: supplier.salespersonPhone,
          notes: supplier.notes
        }).eq('id', supplier.id).eq('company_id', companyId)
    );

    if (error) throw new Error(error.message);
    memoryCache.suppliers = null;
  },

  deleteSupplier: async (id: string) => {
    const { companyId } = await getContext();
    
    // Deletar dependências primeiro (opcional, se FK não for Cascade)
    await withTimeout(supabase.from('quotes').delete().eq('supplier_id', id).eq('company_id', companyId));
    
    const { error } = await withTimeout(
        supabase.from('suppliers').delete().eq('id', id).eq('company_id', companyId)
    );
    if (error) throw new Error(error.message);
    memoryCache.suppliers = null;
    memoryCache.quotes = null;
  },

  addMaterial: async (material: Material) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('materials').upsert({
          id: material.id,
          name: material.name,
          category: material.category,
          base_unit_id: material.baseUnitId || null,
          ipi: material.ipi,
          company_id: companyId
        }, { onConflict: 'id' })
    );

    if (error) throw new Error(error.message);
    memoryCache.materials = null;
  },

  updateMaterial: async (material: Material) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('materials').update({
          name: material.name,
          category: material.category,
          base_unit_id: material.baseUnitId || null,
          ipi: material.ipi
        }).eq('id', material.id).eq('company_id', companyId)
    );

    if (error) throw new Error(error.message);
    memoryCache.materials = null;
  },

  updateCategory: async (oldCategory: string, newCategory: string) => {
    const { companyId } = await getContext();
    const { error: matError } = await withTimeout(
        supabase.from('materials').update({
          category: newCategory
        }).eq('category', oldCategory).eq('company_id', companyId)
    );
    if (matError) throw new Error(matError.message);

    await withTimeout(
        supabase.from('categories').update({ name: newCategory })
            .eq('name', oldCategory).eq('company_id', companyId)
    );

    memoryCache.materials = null;
    memoryCache.categories = null;
  },

  deleteCategory: async (category: string) => {
    const { companyId } = await getContext();
    const { error: matError } = await withTimeout(
        supabase.from('materials').update({
          category: 'Geral'
        }).eq('category', category).eq('company_id', companyId)
    );
    if (matError) throw new Error(matError.message);

    await withTimeout(
        supabase.from('categories').delete()
            .eq('name', category).eq('company_id', companyId)
    );

    memoryCache.materials = null;
    memoryCache.categories = null;
  },

  getCategories: async (forceRefresh = false): Promise<string[]> => {
    if (!forceRefresh && memoryCache.categories) return memoryCache.categories;
    try {
      const { companyId } = await getContext();
      const { data, error } = await supabase
          .from('categories')
          .select('name')
          .eq('company_id', companyId)
          .order('name', { ascending: true });
      if (error) throw error;
      const cats = (data || []).map((r: any) => r.name as string);
      memoryCache.categories = cats;
      return cats;
    } catch (e: any) {
      if (e.message === ERROR_NO_COMPANY) return [];
      return memoryCache.categories || [];
    }
  },

  addCategory: async (categoryName: string) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('categories').upsert({
          name: categoryName,
          company_id: companyId
        }, { onConflict: 'name,company_id' })
    );
    if (error) throw new Error(error.message);
    memoryCache.categories = null;
  },

  deleteMaterial: async (id: string) => {
    const { companyId } = await getContext();
    await withTimeout(supabase.from('quotes').delete().eq('material_id', id).eq('company_id', companyId));
    const { error } = await withTimeout(
        supabase.from('materials').delete().eq('id', id).eq('company_id', companyId)
    );
    if (error) throw new Error(error.message);
    memoryCache.materials = null;
    memoryCache.quotes = null;
  },

  addUnit: async (unit: Unit) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('units').insert({
          id: unit.id,
          name: unit.name,
          symbol: unit.symbol,
          conversion_factor: unit.conversionFactor,
          company_id: companyId
        })
    );

    if (error) throw new Error(error.message);
    memoryCache.units = null;
  },

  updateUnit: async (unit: Unit) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('units').update({
          name: unit.name,
          symbol: unit.symbol,
          conversion_factor: unit.conversionFactor
        }).eq('id', unit.id).eq('company_id', companyId)
    );

    if (error) throw new Error(error.message);
    memoryCache.units = null;
  },

  removeUnit: async (id: string) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('units').delete().eq('id', id).eq('company_id', companyId)
    );
    if (error) throw new Error(error.message);
    memoryCache.units = null;
  },

  saveSimulation: async (simulation: SimulationScenario) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('simulations').upsert({
            id: simulation.id,
            material_id: simulation.materialId,
            target_margin: simulation.targetMargin,
            rows: simulation.rows,
            created_at: simulation.createdAt,
            company_id: companyId
        })
    );

    if (error) throw new Error(error.message);
    memoryCache.simulations = null;
  },

  deleteSimulation: async (id: string) => {
      const { companyId } = await getContext();
      const { error } = await withTimeout(
          supabase.from('simulations').delete().eq('id', id).eq('company_id', companyId)
      );
      if (error) throw new Error(error.message);
      memoryCache.simulations = null;
  },
  
  getTeamMembers: async (forceRefresh = false) => {
      if (!forceRefresh && memoryCache.team) return memoryCache.team;
      try {
          const { companyId } = await getContext();
          const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('company_id', companyId);
          
          if (error) throw error;
          
          memoryCache.team = data || [];
          return data || [];
      } catch (e: any) {
          if (e.message === ERROR_NO_COMPANY) return [];
          console.error("Erro ao buscar equipe no banco:", e);
          throw e; // Propagar erro para a UI
      }
  },

  updateCompanyLogo: async (logoUrl: string) => {
      const { companyId } = await getContext();
      
      // 1. Tentar atualizar diretamente no banco. 
      // O uso de .select() é crucial para confirmar que a linha foi afetada.
      // Se RLS bloquear, 'data' virá vazio, mesmo sem erro SQL explícito.
      const { data, error } = await supabase
          .from('companies')
          .update({ logo_url: logoUrl })
          .eq('id', companyId)
          .select();
      
      if (error) {
          throw new Error(`Erro SQL ao salvar logo: ${error.message}`);
      }

      // 2. Se não houve erro SQL, mas nenhum dado retornou, significa que o RLS bloqueou a escrita.
      if (!data || data.length === 0) {
          throw new Error("Permissão negada pelo banco de dados. Verifique se você é Administrador e se as políticas RLS estão configuradas corretamente.");
      }
      
      // Sucesso real no banco!
  },

  // --- ADMIN FUNCTIONS ---
  updateMemberRole: async (memberId: string, newRole: 'admin' | 'member') => {
      const { companyId } = await getContext();
      // Ensure we are targeting a member of the same company
      const { error } = await withTimeout(
          supabase
              .from('profiles')
              .update({ role: newRole })
              .eq('id', memberId)
              .eq('company_id', companyId)
      );

      if (error) throw new Error(`Erro ao atualizar função: ${error.message}`);
      memoryCache.team = null;
  },

  removeMemberFromCompany: async (memberId: string) => {
      // Use RPC call instead of direct update to avoid RLS violation when setting company_id to null
      const { error } = await supabase.rpc('remove_team_member', {
          target_user_id: memberId
      });

      if (error) {
          console.error("Erro RPC ao remover membro:", error);
          throw new Error(error.message || "Erro ao remover membro da equipe.");
      }
      memoryCache.team = null;
  }
};