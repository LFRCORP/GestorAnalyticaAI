import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft,
  FileText, 
  Image as ImageIcon,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: any) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isCollapsed, setIsCollapsed }) => {
  const { user, userData } = useAuth();
  const [isAdminOpen, setIsAdminOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isAdmin = userData?.role === 'admin' || userData?.role === 'hacedor' || user?.uid === 'jhJUq4sUNDfFl78GNJRYn5CIFv02';

  const NavItem = ({ id, icon: Icon, label, submenu = false }: any) => (
    <button
      onClick={() => {
        onViewChange(id);
        setIsMobileOpen(false);
      }}
      title={isCollapsed ? label : ''}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group
        ${currentView === id 
          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 translate-x-1' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}
        ${submenu && !isCollapsed ? 'pl-11' : ''}
        ${isCollapsed ? 'justify-center px-2' : ''}`}
    >
      <Icon className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${currentView === id ? 'text-white' : 'text-slate-500 group-hover:text-cyan-400'}`} />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  );

  const content = (
    <div className={`flex flex-col h-full bg-[#0f172a] border-r border-slate-800/60 p-4 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}>
      {/* Brand */}
      <div className={`flex items-center gap-3 mb-10 mt-4 ${isCollapsed ? 'justify-center' : 'px-4'}`}>
        <div className="bg-cyan-500/10 p-2 rounded-xl border border-cyan-500/20 shrink-0">
          <ShieldCheck className="h-6 w-6 text-cyan-400" />
        </div>
        {!isCollapsed && <h1 className="text-xl font-black text-white tracking-tight whitespace-nowrap">Analytica <span className="text-cyan-400 font-medium text-xs">AI</span></h1>}
      </div>

      {/* Collapse Toggle (Desktop) */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute -right-3 top-20 bg-slate-800 border border-slate-700 rounded-full p-1 text-slate-400 hover:text-white hover:bg-slate-700 transition-all z-50 shadow-xl"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
        {!isCollapsed && <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Principal</p>}
        
        <NavItem id="projects" icon={LayoutDashboard} label="Mis Proyectos" />
        <NavItem id="image_analyzer" icon={ImageIcon} label="Analizador" />

        {isAdmin && (
          <div className="pt-6">
            {!isCollapsed && <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Configuración</p>}
            
            <button
              onClick={() => !isCollapsed && setIsAdminOpen(!isAdminOpen)}
              className={`w-full flex items-center justify-between py-3 text-slate-400 hover:text-white transition-colors ${isCollapsed ? 'justify-center' : 'px-4'}`}
              title={isCollapsed ? "Administración" : ""}
            >
              <div className="flex items-center gap-3">
                <Settings className={`h-5 w-5 text-slate-500 shrink-0 ${isCollapsed ? 'group-hover:text-cyan-400' : ''}`} />
                {!isCollapsed && <span className="text-sm font-semibold">Administración</span>}
              </div>
              {!isCollapsed && (isAdminOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
            </button>

            {(isAdminOpen || isCollapsed) && (
              <div className={`mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                <NavItem id="users_management" icon={Users} label="Usuarios" submenu />
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`mt-auto p-3 bg-slate-900/50 rounded-2xl border border-slate-800/50 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 shrink-0 flex items-center justify-center text-cyan-400 font-bold text-xs border border-cyan-500/20">
                {userData?.displayName?.charAt(0) || 'U'}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{userData?.displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate uppercase tracking-tighter">{userData?.role}</p>
              </div>
            )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block h-screen fixed left-0 top-0 z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}>
        {content}
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0f172a] border-b border-slate-800 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
            <h1 className="text-lg font-black text-white">Analytica AI</h1>
        </div>
        <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-slate-400 hover:text-white"
        >
            <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)}></div>
          <div className="relative w-72 h-full bg-[#0f172a] animate-in slide-in-from-left duration-300">
            <button 
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white z-10"
            >
                <X className="h-6 w-6" />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
