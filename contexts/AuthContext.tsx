import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

const CACHE_KEY_COMPANY = 'cached_company_id';
const CACHE_KEY_ROLE = 'cached_user_role';

// Helper: Timeout wrapper for promises to prevent hanging
const withTimeout = async <T,>(promise: PromiseLike<T>, ms = 25000): Promise<any> => {
    return Promise.race([
        Promise.resolve(promise),
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), ms))
    ]);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const loadingRef = useRef(true);

  const updateLoading = (state: boolean) => {
      setLoading(state);
      loadingRef.current = state;
  };

  // Helper to construct a basic profile from Session User immediately (Optimistic UI)
  const getOptimisticProfile = (user: User): UserProfile => {
      const cachedCompanyId = localStorage.getItem(CACHE_KEY_COMPANY);
      const cachedRole = localStorage.getItem(CACHE_KEY_ROLE);
      // Tentar recuperar o logo do cache se tivermos o ID
      let cachedLogo = '';
      if (cachedCompanyId) {
          cachedLogo = localStorage.getItem(`cached_logo_${cachedCompanyId}`) || '';
      }

      return {
          id: user.id,
          companyId: cachedCompanyId || '', 
          companyName: '',
          companyLogo: cachedLogo,
          role: (cachedRole as 'admin' | 'member') || 'member',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
          email: user.email || ''
      };
  };

  const fetchProfile = async (userId: string, user?: User) => {
    try {
      // 1. Fetch Profile Base Data
      const { data: profileData, error: profileError } = await withTimeout(
        supabase
        .from('profiles')
        .select('id, company_id, role, name, email') 
        .eq('id', userId)
        .maybeSingle(),
        25000 
      );

      if (profileError) {
          console.warn("AuthContext: Error fetching profile row:", profileData, profileError.message);
      }

      // Helper for Offline/Local Data
      const getOfflineCompany = () => {
         const localData = localStorage.getItem(`offline_company_${userId}`);
         if (localData) {
             try { return JSON.parse(localData); } catch (e) { return null; }
         }
         return null;
      };

      if (profileData) {
        const companyId = profileData.company_id || '';
        let companyName = '';
        let role = profileData.role;

        // Recuperar logo do cache imediatamente para evitar 'flash' ou sumiço
        let companyLogo = localStorage.getItem(`cached_logo_${companyId}`) || '';

        // Cache vital info for next optimistic load
        if (companyId) localStorage.setItem(CACHE_KEY_COMPANY, companyId);
        if (role) localStorage.setItem(CACHE_KEY_ROLE, role);

        // 2. Fetch Company Data (Robustly using RPC first to avoid RLS issues)
        if (companyId) {
            let fetchedCompany: { company_name: string, company_logo: string } | null = null;

            try {
                // Tenta via RPC (Blindado contra RLS)
                const { data, error: rpcError } = await withTimeout(
                    supabase.rpc('get_my_company_details').maybeSingle(),
                    8000
                );
                
                if (data && !rpcError) {
                    fetchedCompany = data;
                } else {
                    // Fallback para select normal (caso RPC nao exista ainda)
                    const { data: directData } = await withTimeout(
                        supabase
                        .from('companies')
                        .select('name, logo_url')
                        .eq('id', companyId)
                        .maybeSingle(),
                        5000
                    );
                    if(directData) {
                        fetchedCompany = { company_name: directData.name, company_logo: directData.logo_url };
                    }
                }
            } catch (err) {
                // Non-critical: just suppresses logo/name fetch
                console.warn("Error fetching company details (non-critical):", err);
            }

            if (fetchedCompany) {
                companyName = fetchedCompany.company_name;
                // Prioritize DB logo if exists, else keep cache
                if (fetchedCompany.company_logo) {
                    companyLogo = fetchedCompany.company_logo;
                    localStorage.setItem(`cached_logo_${companyId}`, companyLogo);
                } 
                // CRITICAL: Don't overwrite with empty if we have cache and DB returned nothing/null (RLS or empty)
            }
        }

        // 3. Fallback to Offline Data if DB returned no company but we have one locally
        if (!companyId) {
             const off = getOfflineCompany();
             if (off) {
                 role = 'admin'; 
                 companyName = off.name;
             }
        }

        setProfile({
          id: profileData.id,
          companyId: companyId || (getOfflineCompany()?.id || ''),
          role: role,
          name: profileData.name || user?.user_metadata?.full_name || 'Usuário',
          email: profileData.email || user?.email || '',
          companyName: companyName || (getOfflineCompany()?.name || ''),
          companyLogo: companyLogo
        });

      } else {
        // PROFILE DATA IS NULL (RLS or New User)
        if (user) {
            const base = getOptimisticProfile(user);
            const off = getOfflineCompany();
            const effectiveCompanyId = base.companyId || off?.id || '';

            setProfile({
                ...base,
                companyId: effectiveCompanyId,
                companyName: off?.name || '',
                role: 'member'
            });
        }
      }
    } catch (error: any) {
      if (error.message === 'Auth Timeout') {
          console.warn('Profile fetch timed out (slow connection), using optimistic data if available.');
      } else {
          console.error('Unexpected error fetching profile:', error);
      }
      if (user) setProfile(getOptimisticProfile(user));
    }
  };

  useEffect(() => {
    let mounted = true;

    // --- SAFETY TIMEOUT ---
    const safetyTimeout = setTimeout(async () => {
        if (mounted && loadingRef.current) {
            console.warn("Auth check global timeout - recovering session...");
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) {
                const optimistic = getOptimisticProfile(data.session.user);
                setProfile(prev => prev || optimistic); 
                setSession(data.session);
            }
            updateLoading(false);
        }
    }, 12000); 

    const initAuth = async () => {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (!mounted) return;

            const currentSession = data.session;
            setSession(currentSession);
            
            if (currentSession?.user) {
                const cachedId = localStorage.getItem(CACHE_KEY_COMPANY);
                
                // Load optimistic first to show UI immediately
                if (cachedId) {
                    setProfile(getOptimisticProfile(currentSession.user));
                }
                
                await fetchProfile(currentSession.user.id, currentSession.user);
                if (mounted) updateLoading(false);
            } else {
                if (mounted) updateLoading(false);
            }
        } catch (e: any) {
            if (e?.name !== 'AuthRetryableFetchError') {
                console.error("Auth init error:", e);
            }
            if (mounted) updateLoading(false);
        }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (event === 'SIGNED_OUT') {
         setProfile(null);
         updateLoading(false);
         localStorage.removeItem('supabase.auth.token');
         localStorage.removeItem(CACHE_KEY_COMPANY);
         localStorage.removeItem(CACHE_KEY_ROLE);
         return;
      }

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          if (newSession?.user) {
             const cachedId = localStorage.getItem(CACHE_KEY_COMPANY);
             if (cachedId) {
                 setProfile(getOptimisticProfile(newSession.user));
             }
             await fetchProfile(newSession.user.id, newSession.user);
          }
      }
      
      if (!newSession) {
          updateLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    updateLoading(false);
    setSession(null);
    setProfile(null);
    localStorage.removeItem(CACHE_KEY_COMPANY);
    localStorage.removeItem(CACHE_KEY_ROLE);

    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error("Error signing out:", error);
        localStorage.removeItem('sb-kdwahznnkwwlrwdvpaus-auth-token');
        window.location.reload(); 
    }
  };

  const refreshProfile = async () => {
    // Clear cache so fetchProfile always reads fresh data from DB
    localStorage.removeItem('cached_company_id');
    const { data } = await supabase.auth.getSession();
    const currentSession = data.session;
    
    if (currentSession?.user) {
      await fetchProfile(currentSession.user.id, currentSession.user);
    }
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);