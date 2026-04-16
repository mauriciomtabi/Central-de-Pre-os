import React, { useState } from 'react';
import { FileText, TrendingUp, Database, Moon, Sun, PanelLeftClose, PanelLeftOpen, Calculator, GraduationCap, PlayCircle, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onStartTutorial: () => void;
  isTutorialMode: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange, 
  isDarkMode, 
  toggleTheme,
  onStartTutorial,
  isTutorialMode
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { signOut, profile } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'quotes', label: 'Cotações', icon: FileText },
    { id: 'registries', label: 'Cadastros', icon: Database },
    { id: 'analysis', label: 'Análise', icon: TrendingUp },
    { id: 'simulator', label: 'Simulador', icon: Calculator },
    { id: 'team', label: 'Equipe', icon: Users },
  ];

  const handleLogout = () => {
      signOut();
  };

  const DefaultLogo = ({ className }: { className?: string }) => (
      <img 
        src="https://i.postimg.cc/X7z9p7JD/LOGO-CENTRAL-PRECOS.png" 
        alt="Logo" 
        className={className}
      />
  );

  // Componente de Tooltip Reutilizável para Desktop
  const SidebarTooltip = ({ text }: { text: string }) => (
      <span className={`absolute left-full ml-4 px-2 py-1 text-xs font-bold rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'}`}>
        {text}
        {/* Seta do Tooltip */}
        <span className={`absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rotate-45 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-900'}`}></span>
      </span>
  );

  return (
    <div className={`flex h-screen overflow-hidden flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'} print:block print:h-auto print:overflow-visible print:bg-white`}>
      
      {/* Mobile Header */}
      <div className={`md:hidden h-16 border-b flex items-center justify-between shadow-sm z-20 px-4 shrink-0 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} print:hidden`}>
         <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onTabChange('dashboard')}
         >
             {/* Logo Mobile */}
             {profile?.companyLogo ? (
                <img src={profile.companyLogo} alt="Logo Empresa" className="h-8 w-8 object-contain" />
             ) : (
                <DefaultLogo className="h-10 w-auto object-contain" />
             )}
             <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Central de Preços</span>
         </div>

         {/* Right Side: Theme + User Avatar */}
         <div className="flex items-center gap-3">
            <button type="button" onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            {/* User Avatar Mobile */}
            {profile && (
                <button 
                    onClick={() => onTabChange('team')}
                    className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs ring-2 ring-transparent hover:ring-blue-500 transition-all"
                    title={profile.name}
                >
                    {profile.name?.charAt(0).toUpperCase() || 'U'}
                </button>
            )}
         </div>
      </div>

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col shadow-xl z-50 shrink-0 transition-all duration-300 ease-in-out relative border-r print:hidden h-screen ${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        } ${
            isDarkMode 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-white border-slate-200 text-slate-800'
        } ${isTutorialMode ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
      >
        {/* Sidebar Header */}
        <div className={`h-20 flex items-center ${isSidebarCollapsed ? 'justify-center flex-col gap-1' : 'justify-between'} px-4 border-b transition-colors shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div 
             onClick={() => onTabChange('dashboard')}
             className={`flex items-center gap-3 transition-all duration-300 overflow-hidden whitespace-nowrap cursor-pointer ${isSidebarCollapsed ? 'w-0 opacity-0 h-0' : 'w-auto opacity-100'}`}
          >
             {/* Logo Desktop Expanded */}
             {profile?.companyLogo ? (
                 <img src={profile.companyLogo} alt="Logo" className="h-10 w-10 object-contain" />
             ) : (
                 <DefaultLogo className="h-10 w-auto object-contain" />
             )}
             
             {/* System Name */}
             <div className="flex flex-col">
                <span className={`font-bold text-base tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Central de</span>
                <span className="font-bold text-base tracking-tight leading-none text-blue-600 dark:text-blue-400">Preços</span>
             </div>
          </div>
          
          {/* Collapsed Logo Fallback */}
          {isSidebarCollapsed && (
             <div onClick={() => onTabChange('dashboard')} className="cursor-pointer w-9 h-9 flex items-center justify-center">
                 {profile?.companyLogo ? (
                     <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        <img src={profile.companyLogo} alt="L" className="w-full h-full object-contain" />
                     </div>
                 ) : (
                    <DefaultLogo className="h-7 w-auto object-contain" />
                 )}
             </div>
          )}

          {/* Toggle Button */}
           <button 
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`transition-colors p-1.5 rounded-lg ${!isSidebarCollapsed ? 'mr-1' : ''} ${
                isDarkMode 
                ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title={isSidebarCollapsed ? "Expandir" : "Recolher"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        {/* Main Navigation - IMPORTANTE: overflow-visible quando recolhido para permitir tooltips */}
        <nav className={`flex-1 p-3 space-y-1.5 ${isSidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'} [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 dark:shadow-blue-900/40' 
                    : isDarkMode
                        ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-blue-700'
                  }
                  ${isSidebarCollapsed ? 'justify-center' : ''}
                `}
              >
                <Icon size={22} className={`shrink-0 ${!isActive && !isDarkMode ? 'text-slate-400 group-hover:text-blue-600' : ''}`} />
                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                
                {/* Tooltip para Menu Principal */}
                {isSidebarCollapsed && <SidebarTooltip text={item.label} />}
              </button>
            );
          })}

          <div className={`my-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}></div>

           <button
              type="button"
              onClick={onStartTutorial}
              disabled={isTutorialMode}
              className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative
                ${isTutorialMode 
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20 cursor-default' 
                  : isDarkMode
                      ? 'text-amber-500 hover:bg-slate-800 hover:text-amber-400'
                      : 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                }
                ${isSidebarCollapsed ? 'justify-center' : ''}
              `}
            >
              {isTutorialMode ? <PlayCircle size={22} className="shrink-0 animate-pulse" /> : <GraduationCap size={22} className="shrink-0" />}
              {!isSidebarCollapsed && <span className="truncate">{isTutorialMode ? 'Tutorial Ativo' : 'Tutorial / Demo'}</span>}
              
               {/* Tooltip Tutorial */}
               {isSidebarCollapsed && <SidebarTooltip text="Tutorial" />}
            </button>

             <button 
              type="button"
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors group relative ${
                  isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              } ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              {isDarkMode ? <Sun size={22} className="text-yellow-400 shrink-0" /> : <Moon size={22} className="shrink-0 text-slate-400 group-hover:text-indigo-500" />}
              {!isSidebarCollapsed && <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>}
               
               {/* Tooltip Tema */}
               {isSidebarCollapsed && <SidebarTooltip text={isDarkMode ? 'Modo Claro' : 'Modo Escuro'} />}
            </button>
        </nav>

        {/* Footer - Profile & Logout */}
        <div className={`p-3 border-t shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'} flex flex-col gap-3`}>
            {/* User Profile Snippet */}
            {!isSidebarCollapsed && profile && (
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'} border ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                            {profile.name?.charAt(0) || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profile.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{profile.role === 'admin' ? 'Administrador' : 'Membro'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Collapsed Profile Icon */}
            {isSidebarCollapsed && profile && (
                 <div className="flex justify-center mb-1 group relative">
                     <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs cursor-default">
                        {profile.name?.charAt(0)}
                    </div>
                    {/* Tooltip Perfil */}
                    <SidebarTooltip text={profile.name} />
                 </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-all duration-200 group relative text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20
                  ${isSidebarCollapsed ? 'justify-center' : ''}
              `}
            >
              <LogOut size={20} className="shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Sair da Conta</span>}
              
              {/* Tooltip Sair */}
              {isSidebarCollapsed && <SidebarTooltip text="Sair" />}
            </button>
             
             {!isSidebarCollapsed && (
                 <div className="text-[9px] text-center text-slate-400 dark:text-slate-600 leading-tight">
                    © 2025 MTABI Tecnologia
                 </div>
            )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col relative w-full print:overflow-visible print:h-auto print:block print:w-full">
        <div className="p-4 md:p-8 pb-24 md:pb-8 w-full max-w-7xl mx-auto print:p-0 print:max-w-none print:mx-0 print:w-full">
          {children}
        </div>
        
        {/* Mobile Footer Branding */}
        <div className="md:hidden pb-24 text-center">
            <span className="text-[10px] text-slate-400 font-medium">© 2025 MTABI Tecnologia</span>
        </div>
      </main>

      {/* Mobile Bottom Navigation (Icons Only) */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t flex justify-around items-center p-2 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} print:hidden`}>
        {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`group relative flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 scale-110' : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                
                {/* Tooltip on Hover Mobile */}
                <span className={`absolute bottom-full mb-2 px-2 py-1 text-xs font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'}`}>
                    {item.label}
                    {/* Arrow */}
                    <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-900'}`}></span>
                </span>
              </button>
            );
          })}
           
           {/* Mobile Logout Button (Icon Only) */}
           <button
            type="button"
            onClick={handleLogout}
             className={`group relative flex items-center justify-center p-3 rounded-xl transition-all text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10`}
           >
             <LogOut size={24} />
             {/* Tooltip */}
             <span className={`absolute bottom-full mb-2 px-2 py-1 text-xs font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'}`}>
                Sair
                <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-900'}`}></span>
             </span>
           </button>
      </nav>
    </div>
  );
};