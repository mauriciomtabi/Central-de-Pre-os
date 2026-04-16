import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { StorageService } from '../services/storageService';
import { supabase } from '../lib/supabase';
import { Copy, Users, UserPlus, UserMinus, Shield, Mail, CheckCircle2, Building2, PlusCircle, LogIn, Loader2, RefreshCw, Upload, Image as ImageIcon, AlertTriangle, ShieldPlus, X } from 'lucide-react';
import { Toast, ToastMessage } from '../components/Toast';

interface TeamProps {
    isTutorialMode?: boolean;
    mockMembers?: any[];
}

export const Team: React.FC<TeamProps> = ({ isTutorialMode = false, mockMembers = [] }) => {
  const { profile, refreshProfile, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // States for Company Onboarding
  const [onboardingMode, setOnboardingMode] = useState<'create' | 'join' | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyIdInput, setCompanyIdInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for Logo Upload
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      type: 'promote' | 'remove' | null;
      member: any | null;
  }>({ isOpen: false, type: null, member: null });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // --- Initial Load ---
  useEffect(() => {
    // If Tutorial Mode, ignore real profile and use mock
    if (isTutorialMode) {
        setMembers(mockMembers);
        setLoading(false);
        return;
    }

    // Only fetch team members if we have a valid company ID
    if (profile?.companyId) {
        loadTeam();
    } else if (profile) {
        // Profile loaded but no company ID -> Stop loading team
        setLoading(false);
    }
  }, [profile?.companyId, isTutorialMode, mockMembers]);

  // --- Realtime Subscriptions (Disable in Tutorial) ---
  useEffect(() => {
    if (!profile?.companyId || isTutorialMode) return;

    // 1. Listen for new Members (Profiles table)
    const membersChannel = supabase
        .channel(`team-updates-${profile.companyId}`)
        .on(
            'postgres_changes',
            {
                event: '*', // Insert, Update, Delete
                schema: 'public',
                table: 'profiles',
                filter: `company_id=eq.${profile.companyId}`
            },
            (payload) => {
                // Refresh list when a change happens
                loadTeam();
            }
        )
        .subscribe();

    // 2. Listen for Company updates (Logo, Name)
    const companyChannel = supabase
        .channel(`company-updates-${profile.companyId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'companies',
                filter: `id=eq.${profile.companyId}`
            },
            async (payload) => {
                // Refresh profile/context to reflect new logo
                await refreshProfile();
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(membersChannel);
        supabase.removeChannel(companyChannel);
    };
  }, [profile?.companyId, isTutorialMode]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      let data = await StorageService.getTeamMembers();
      
      // UX IMPROVEMENT: 
      // If the list is empty but I have a profile, it implies I am the only one 
      // or RLS is hiding others. Show myself at minimum.
      if (profile && (!data || data.length === 0)) {
           data = [{
               id: profile.id,
               name: profile.name,
               email: profile.email,
               role: profile.role,
               company_id: profile.companyId
           }];
      } else if (profile) {
          // If data exists, ensure I am in it (sometimes fetching 'others' excludes 'self')
          const selfExists = data.find((m: any) => m.id === profile.id);
          if (!selfExists) {
              data = [{
                 id: profile.id,
                 name: profile.name,
                 email: profile.email,
                 role: profile.role,
                 company_id: profile.companyId
              }, ...data];
          }
      }

      setMembers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
      setIsRefreshing(true);
      try {
        if (!isTutorialMode) await refreshProfile();
        // Se após refresh tiver companyId, carrega o time
        if (profile?.companyId && !isTutorialMode) {
            await loadTeam();
        }
        setToast({ message: "Dados sincronizados!", type: 'success' });
      } catch(e) {
        setToast({ message: "Falha ao sincronizar.", type: 'error' });
      } finally {
        setTimeout(() => setIsRefreshing(false), 800);
      }
  };

  const copyCompanyId = () => {
    const idToCopy = isTutorialMode ? 'global_aco_demo_123' : profile?.companyId;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setToast({ message: "ID da empresa copiado!", type: 'success' });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        // 500KB limit for base64 storage efficiency
        if (file.size > 500 * 1024) {
             setToast({ message: "A imagem deve ter no máximo 500KB.", type: 'error' });
             e.target.value = '';
             return;
        }

        setIsUploadingLogo(true);
        
        // Simulação Tutorial
        if (isTutorialMode) {
            setTimeout(() => {
                setToast({ message: "Logo atualizado (Simulação)!", type: 'success' });
                setIsUploadingLogo(false);
            }, 1500);
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            if (event.target?.result) {
                const base64Data = event.target.result as string;
                try {
                    await StorageService.updateCompanyLogo(base64Data);
                    await refreshProfile();
                    setToast({ message: "Logo atualizado com sucesso!", type: 'success' });
                } catch (error: any) {
                    console.error("Logo upload failed", error);
                    // Explicit warning about DB schema
                    if (error.message && error.message.includes('logo_url')) {
                        setToast({ message: "Erro: Coluna 'logo_url' não existe no banco de dados.", type: 'error' });
                    } else {
                        setToast({ message: "Erro ao salvar no banco. Logo salvo apenas localmente.", type: 'error' });
                        // Even if it failed on DB, refresh to show the local cache version
                        await refreshProfile(); 
                    }
                } finally {
                    setIsUploadingLogo(false);
                }
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const openConfirmation = (type: 'promote' | 'remove', member: any) => {
      setConfirmModal({ isOpen: true, type, member });
  };

  const closeConfirmation = () => {
      setConfirmModal({ isOpen: false, type: null, member: null });
      setIsActionLoading(false);
  };

  const handleConfirmAction = async () => {
      if (!confirmModal.member || !confirmModal.type) return;
      
      setIsActionLoading(true);
      try {
          if (isTutorialMode) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Fake delay
              if (confirmModal.type === 'promote') {
                  setToast({ message: `${confirmModal.member.name} agora é Admin!`, type: 'success' });
              } else {
                  setMembers(members.filter(m => m.id !== confirmModal.member.id));
                  setToast({ message: `${confirmModal.member.name} foi removido.`, type: 'success' });
              }
              closeConfirmation();
              return;
          }

          if (confirmModal.type === 'promote') {
              await StorageService.updateMemberRole(confirmModal.member.id, 'admin');
              setToast({ message: `${confirmModal.member.name} agora é Admin!`, type: 'success' });
          } else {
              await StorageService.removeMemberFromCompany(confirmModal.member.id);
              setToast({ message: `${confirmModal.member.name} foi removido.`, type: 'success' });
          }
          await loadTeam();
          closeConfirmation();
      } catch (e: any) {
          setToast({ message: e.message || "Erro ao executar ação.", type: 'error' });
          setIsActionLoading(false);
      }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (isTutorialMode) {
        setTimeout(() => {
            setToast({ message: "Empresa criada com sucesso (Simulação)!", type: 'success' });
            setOnboardingMode(null);
            setIsSubmitting(false);
        }, 1500);
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sessão inválida. Por favor, faça login novamente.");

        const { data: existing } = await supabase
            .from('companies')
            .select('id')
            .ilike('name', companyName.trim())
            .limit(1);

        if (existing && existing.length > 0) {
             setToast({ message: "Já existe uma empresa com este nome.", type: 'error' });
             setIsSubmitting(false);
             return;
        }

        const { data: company, error: companyError } = await supabase
            .from('companies')
            .insert({ name: companyName.trim() })
            .select()
            .single();

        if (companyError) throw companyError;

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
                id: user.id,
                company_id: company.id, 
                role: 'admin',
                email: user.email,
                name: profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0]
            }, { onConflict: 'id' });

        if (profileError) throw profileError;

        await refreshProfile();
        setToast({ message: "Empresa criada com sucesso!", type: 'success' });
        setOnboardingMode(null);

    } catch (error: any) {
        console.error("Create company error:", JSON.stringify(error, null, 2));
        
        if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission')) {
             const offlineId = `local_${Date.now()}`;
             const offlineData = { id: offlineId, name: companyName.trim() };
             
             if (profile?.id) {
                 localStorage.setItem(`offline_company_${profile.id}`, JSON.stringify(offlineData));
                 await refreshProfile();
                 setToast({ message: "Empresa criada localmente (Modo Offline)!", type: 'success' });
                 setOnboardingMode(null);
                 setIsSubmitting(false);
                 return;
             }
        }

        setToast({ 
            message: error.message || error.details || "Erro ao criar empresa. Tente novamente.", 
            type: 'error' 
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isTutorialMode) {
        setTimeout(() => {
            setToast({ message: `Você entrou na empresa (Simulação)!`, type: 'success' });
            setOnboardingMode(null);
            setIsSubmitting(false);
        }, 1500);
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sessão inválida.");

        const idToJoin = companyIdInput.trim();
        const { data: company, error: fetchError } = await supabase
            .from('companies')
            .select('id, name')
            .eq('id', idToJoin)
            .single();

        if (fetchError || !company) {
            setToast({ message: "Empresa não encontrada. Verifique o ID.", type: 'error' });
            setIsSubmitting(false);
            return;
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
                id: user.id,
                company_id: company.id, 
                role: 'member',
                email: user.email,
                name: profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0]
            }, { onConflict: 'id' });

        if (profileError) throw profileError;

        await refreshProfile();
        setToast({ message: `Você entrou na empresa ${company.name}!`, type: 'success' });
        setOnboardingMode(null);

    } catch (error: any) {
        console.error("Join company error:", JSON.stringify(error, null, 2));
        setToast({ 
            message: error.message || "Erro ao entrar na empresa.", 
            type: 'error' 
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!profile && !isTutorialMode) {
      if (!authLoading) {
          return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                <p>Ocorreu um erro ao carregar seus dados.</p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw size={16} /> Tentar Novamente
                </button>
            </div>
          );
      }

      return (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <Loader2 className="animate-spin mb-3 text-blue-600" size={32} />
             <p>Carregando perfil...</p>
          </div>
      );
  }

  // --- RENDER: ONBOARDING VIEW (NO COMPANY) ---
  if (!profile?.companyId && !isTutorialMode) {
      return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
             {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
             
             <div className="text-center py-8 relative">
                 <button 
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="absolute right-0 top-0 text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-all group"
                    title="Forçar Sincronização"
                 >
                    <RefreshCw size={20} className={isRefreshing ? "animate-spin text-blue-600" : "group-hover:rotate-180 transition-transform duration-500"} />
                 </button>

                 <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">Bem-vindo, {profile?.name}!</h2>
                 <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                     Você ainda não está vinculado a nenhuma organização no sistema.
                 </p>
                 
                 <div className="mt-4 flex flex-col items-center gap-2">
                     <p className="text-xs text-slate-400">
                        Já possui uma empresa mas está vendo esta tela?
                     </p>
                     <button 
                        onClick={handleManualRefresh} 
                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full transition-colors"
                     >
                        <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} /> Sincronizar Perfil Agora
                     </button>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Create Card */}
                 <div className={`bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border-2 transition-all ${onboardingMode === 'create' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-100 dark:border-slate-700 hover:border-blue-200'}`}>
                     <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                         <PlusCircle size={32} />
                     </div>
                     <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Criar Nova Empresa</h3>
                     <p className="text-slate-500 dark:text-slate-400 mb-6 min-h-[48px]">
                         Seja o administrador e convide sua equipe para colaborar.
                     </p>
                     
                     {onboardingMode === 'create' ? (
                         <form onSubmit={handleCreateCompany} className="space-y-4">
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Empresa</label>
                                 <input 
                                    autoFocus
                                    required
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ex: Global Aços Ltda"
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                 />
                             </div>
                             <div className="flex gap-2">
                                 <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                                 >
                                     {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Criar e Começar'}
                                 </button>
                                 <button 
                                    type="button" 
                                    onClick={() => setOnboardingMode(null)}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                 >
                                     Cancelar
                                 </button>
                             </div>
                         </form>
                     ) : (
                         <button 
                            type="button"
                            onClick={() => { setOnboardingMode('create'); setCompanyName(''); }}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                         >
                             Começar do Zero
                         </button>
                     )}
                 </div>

                 {/* Join Card */}
                 <div className={`bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border-2 transition-all ${onboardingMode === 'join' ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-slate-100 dark:border-slate-700 hover:border-emerald-200'}`}>
                     <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                         <LogIn size={32} />
                     </div>
                     <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Entrar em Empresa</h3>
                     <p className="text-slate-500 dark:text-slate-400 mb-6 min-h-[48px]">
                         Junte-se a uma organização já existente usando um ID de convite.
                     </p>

                     {onboardingMode === 'join' ? (
                         <form onSubmit={handleJoinCompany} className="space-y-4">
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID da Empresa</label>
                                 <input 
                                    autoFocus
                                    required
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                    placeholder="Cole o ID aqui..."
                                    value={companyIdInput}
                                    onChange={e => setCompanyIdInput(e.target.value)}
                                 />
                             </div>
                             <div className="flex gap-2">
                                 <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                                 >
                                     {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Entrar na Equipe'}
                                 </button>
                                 <button 
                                    type="button" 
                                    onClick={() => setOnboardingMode(null)}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                 >
                                     Cancelar
                                 </button>
                             </div>
                         </form>
                     ) : (
                         <button 
                            type="button"
                            onClick={() => { setOnboardingMode('join'); setCompanyIdInput(''); }}
                            className="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-bold py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                         >
                             Tenho um Convite
                         </button>
                     )}
                 </div>
             </div>
        </div>
      );
  }

  // Logic to determine display profile (Mock or Real)
  const displayProfile = isTutorialMode 
    ? { name: 'Você (Demo Admin)', companyName: 'Global Aços Ltda (Demo)', companyId: 'global_aco_demo', companyLogo: '', role: 'admin', id: 't1' }
    : profile;

  const isAdmin = displayProfile?.role === 'admin';

  return (
    <div className="space-y-6 animate-in fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && confirmModal.member && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95">
                  <div className="p-6 text-center">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.type === 'promote' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                          {confirmModal.type === 'promote' ? <ShieldPlus size={28} /> : <UserMinus size={28} />}
                      </div>
                      
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                          {confirmModal.type === 'promote' ? 'Promover a Admin?' : 'Remover Membro?'}
                      </h3>
                      
                      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                          {confirmModal.type === 'promote' 
                              ? `Deseja conceder permissões administrativas para ${confirmModal.member.name}? Ele poderá gerenciar a empresa e remover membros.` 
                              : `Tem certeza que deseja remover ${confirmModal.member.name} da equipe? Esta ação não pode ser desfeita imediatamente.`}
                      </p>

                      <div className="flex gap-3">
                          <button 
                              onClick={closeConfirmation}
                              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={handleConfirmAction}
                              disabled={isActionLoading}
                              className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${
                                  confirmModal.type === 'promote' 
                                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' 
                                  : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                              } shadow-lg`}
                          >
                              {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
               <div className="flex items-center gap-3 mb-1">
                   {displayProfile?.companyLogo ? (
                       <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1">
                           <img src={displayProfile.companyLogo} alt="Logo" className="w-full h-full object-contain rounded" />
                       </div>
                   ) : (
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Building2 size={24} />
                        </div>
                   )}
                   
                   <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            {displayProfile?.companyName || <span className="italic opacity-50">Carregando...</span>}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie sua equipe e identidade.</p>
                   </div>
               </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                 {/* Logo Upload Section */}
                 <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg flex items-center gap-3 border border-slate-100 dark:border-slate-700">
                    <div className="relative group cursor-pointer">
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*"
                            className="hidden" 
                            onChange={handleLogoUpload}
                            disabled={isUploadingLogo || !isAdmin}
                        />
                        <button 
                            onClick={() => isAdmin && fileInputRef.current?.click()}
                            disabled={!isAdmin}
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isAdmin ? 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400' : 'text-slate-400 cursor-not-allowed'}`}
                        >
                            {isUploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                            {displayProfile?.companyLogo ? 'Alterar Logo' : 'Adicionar Logo'}
                        </button>
                    </div>
                 </div>

                 {/* Company ID Section */}
                 <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg flex flex-col items-end min-w-[200px]">
                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">ID da Empresa (Para Convites)</span>
                    <button 
                        onClick={copyCompanyId}
                        className="flex items-center gap-2 text-sm font-mono font-bold text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-slate-600 px-2 py-1 rounded transition-colors w-full justify-end"
                        title="Clique para copiar"
                    >
                        {displayProfile?.companyId ? (
                            <>
                                {displayProfile.companyId} <Copy size={14} />
                            </>
                        ) : (
                            <span className="animate-pulse">Sincronizando...</span>
                        )}
                    </button>
                </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
         <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide px-1">Membros Ativos</h3>
         
         {loading ? (
             <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                 <Loader2 className="animate-spin mb-2" />
                 Carregando equipe...
             </div>
         ) : members.length > 0 ? (
             members.map(member => (
                 <div key={member.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:border-blue-200 dark:hover:border-slate-600 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg shrink-0">
                            {member.name?.charAt(0).toUpperCase() || member.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 truncate">
                                {member.name || 'Sem Nome'}
                                {member.role === 'admin' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full border border-amber-200 uppercase font-bold shrink-0">Admin</span>}
                                {member.id === displayProfile?.id && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full border border-green-200 uppercase font-bold shrink-0">Você</span>}
                            </h4>
                            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 truncate">
                                <Mail size={12} className="shrink-0" /> <span className="truncate">{member.email}</span>
                            </div>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-3">
                         {/* Admin Actions (Promote/Remove) */}
                         {isAdmin && member.id !== displayProfile?.id && (
                             <div className="flex items-center gap-1">
                                {member.role !== 'admin' && (
                                    <button 
                                        onClick={() => openConfirmation('promote', member)}
                                        className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors"
                                        title="Promover a Admin"
                                    >
                                        <ShieldPlus size={18} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => openConfirmation('remove', member)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                    title="Remover da Equipe"
                                >
                                    <UserMinus size={18} />
                                </button>
                             </div>
                         )}
                        <div className="text-sm text-slate-400 pl-2 border-l border-slate-100 dark:border-slate-700">
                            <CheckCircle2 size={20} className="text-emerald-500" />
                        </div>
                     </div>
                 </div>
             ))
         ) : (
             <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                 Nenhum membro encontrado. Convide pessoas compartilhando o ID da empresa.
             </div>
         )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
          <UserPlus className="text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
          <div>
              <h4 className="font-bold text-blue-800 dark:text-blue-200 text-sm">Como adicionar novos membros?</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Para adicionar um novo membro à sua equipe, peça para ele se cadastrar na plataforma. 
                  Durante o cadastro, ele deve escolher a opção <b>"Entrar em Empresa Existente"</b> e colar o ID da empresa exibido acima.
              </p>
          </div>
      </div>
    </div>
  );
};