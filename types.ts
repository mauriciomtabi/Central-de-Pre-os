
export enum QuoteStatus {
  OPEN = 'OPEN',
  ANALYZING = 'ANALYZING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export type FreightType = 'CIF' | 'FOB';

export interface UserProfile {
  id: string;
  companyId: string;
  role: 'admin' | 'member';
  name: string;
  email: string;
  companyName?: string; 
  companyLogo?: string; // Novo campo para o logo da empresa
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
  planType?: 'monthly' | 'annual' | null;
}

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  conversionFactor: number; // Factor to convert to base unit (e.g., kg). 1 Ton = 1000.
  companyId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  rating: number; // 1-5
  contactEmail: string;
  salesperson: string;
  salespersonPhone: string;
  notes?: string;
  companyId?: string;
}

export interface Material {
  id: string;
  name: string;
  category: string; // e.g., 'Carbon Steel', 'Stainless', 'Aluminum'
  baseUnitId: string;
  ipi: number;
  companyId?: string;
}

export interface Quote {
  id: string;
  supplierId: string;
  materialId: string;
  date: string; // ISO Date
  quantity: number;
  unitId: string;
  priceUnit: number; // Price per unit as entered
  priceTotal: number;
  normalizedPricePerBaseUnit: number; // Calculated for comparison
  freight: FreightType;
  deliveryDays: number;
  icms: number; // New field %
  ipi: number; // New field %
  status: QuoteStatus;
  paymentTerms: string;
  attachments?: string[]; // Dummy file names
  notes?: string;
  companyId?: string;
}

export interface DashboardStats {
  totalSpend: number;
  totalVolumeKg: number;
  avgSavings: number;
  pendingQuotes: number;
}

export interface SimulationScenario {
  id: string;
  materialId: string;
  targetMargin: number;
  rows: {
    id: string;
    supplierName: string;
    price: number;
    purchaseIcms: number;
    freight?: string;
    weight?: number;
    quoteDate?: string;
  }[];
  createdAt: string;
  companyId?: string;
}