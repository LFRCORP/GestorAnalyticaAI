import React, { useState, useRef, useEffect } from 'react';
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
  X,
  Sun,
  Moon,
  LogOut,
  User,
  Camera
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: any) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isCollapsed, setIsCollapsed }) => {
  const { user, userData, logout, updateProfileInfo } = useAuth();
  const [isAdminOpen, setIsAdminOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);

  // Profile Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | undefined>(undefined);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize edit states when modal opens or userData changes
  useEffect(() => {
    if (isProfileOpen) {
      setEditName(userData?.displayName || '');
      setEditPhoto(userData?.photoURL);
      setIsEditingProfile(false);
    }
  }, [isProfileOpen, userData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Str = reader.result as string;
      const compressed = await compressImage(base64Str);
      setEditPhoto(compressed);
    };
    reader.readAsDataURL(file);
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
    });
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setIsSavingProfile(true);
    try {
      await updateProfileInfo(editName, editPhoto);
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error al actualizar el perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (document.body.classList.contains('dark') ? 'dark' : 'light');
  });

  const toggleTheme = () => {
    if (document.body.classList.contains('dark')) {
      document.body.classList.remove('dark');
      document.body.classList.add('theme-light');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    } else {
      document.body.classList.add('dark');
      document.body.classList.remove('theme-light');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    }
  };

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
          ? 'bg-[#0071ce] text-white shadow-lg shadow-blue-900/40 translate-x-1' 
          : 'text-white/60 hover:text-white hover:bg-white/10'}
        ${submenu && !isCollapsed ? 'pl-11' : ''}
        ${isCollapsed ? 'justify-center px-2' : ''}`}
    >
      <Icon className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${currentView === id ? 'text-white' : 'text-white/40 group-hover:text-cyan-400'}`} />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  );

  const content = (
    <div className={`flex flex-col h-full bg-[#001e60] border-r border-slate-800/60 p-4 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}>
      {/* Brand */}
      <div className={`flex items-center gap-3 mb-10 mt-4 ${isCollapsed ? 'justify-center' : 'px-4'}`}>
        <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 shrink-0">
          <img src="https://i5.walmartimages.com/dfw/63fd9f59-14e2/9d304ce6-96de-4331-b8ec-c5191226d378/v1/spark-icon.svg" alt="Walmart Logo" className="h-6 w-6" />
        </div>
        {!isCollapsed && <h1 className="text-xl font-black text-white tracking-tight whitespace-nowrap">Analytica <span className="text-amber-400 font-medium text-xs">AI</span></h1>}
      </div>

      {/* Collapse Toggle (Desktop) */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute -right-3 top-20 bg-slate-800 border border-slate-700 rounded-full p-1 text-slate-400 hover:text-white hover:bg-slate-700 transition-all z-50 shadow-xl"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
        {!isCollapsed && <p className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-4">Principal</p>}
        
        <NavItem id="projects" icon={LayoutDashboard} label="Mis Proyectos" />
        <NavItem id="image_analyzer" icon={ImageIcon} label="Analizador" />

        {isAdmin && (
          <div className="pt-6">
            {!isCollapsed && <p className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-4">Configuración</p>}
            
            <button
              onClick={() => !isCollapsed && setIsAdminOpen(!isAdminOpen)}
              className={`w-full flex items-center justify-between py-3 text-white/60 hover:text-white transition-colors ${isCollapsed ? 'justify-center' : 'px-4'}`}
              title={isCollapsed ? "Administración" : ""}
            >
              <div className="flex items-center gap-3">
                <Settings className={`h-5 w-5 text-white/40 shrink-0 ${isCollapsed ? 'group-hover:text-cyan-400' : ''}`} />
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

      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className={`mb-4 flex items-center gap-3 p-3 text-white/70 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 ${isCollapsed ? 'justify-center w-12 mx-auto' : 'w-full px-4'}`}
        title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5 text-amber-400 shrink-0 animate-pulse" />
        ) : (
          <Moon className="h-5 w-5 text-white/75 shrink-0" />
        )}
        {!isCollapsed && <span className="text-xs font-bold uppercase tracking-wider">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>}
      </button>

      <div className={`mt-auto p-3 bg-white/5 rounded-2xl border border-white/10 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className="flex items-center justify-between w-full">
          <div 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
            title="Ver Perfil"
          >
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt={userData.displayName} className="w-8 h-8 rounded-full object-cover shrink-0 border border-cyan-500/20" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 shrink-0 flex items-center justify-center text-cyan-400 font-bold text-xs border border-cyan-500/20">
                  {userData?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            {!isCollapsed && (
              <div className="overflow-hidden text-left">
                  <p className="text-xs font-bold text-white truncate">{userData?.displayName}</p>
                  <p className="text-[10px] text-white/50 truncate uppercase tracking-tighter">{userData?.role}</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button 
              onClick={() => setIsConfirmLogoutOpen(true)}
              className="p-1.5 text-white/60 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all ml-2 shrink-0"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`sidebar-container hidden lg:block h-screen fixed left-0 top-0 z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}>
        {content}
      </aside>

      {/* Mobile Header */}
      <div className="sidebar-container lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#001e60] border-b border-slate-800 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
            <img src="https://i5.walmartimages.com/dfw/63fd9f59-14e2/9d304ce6-96de-4331-b8ec-c5191226d378/v1/spark-icon.svg" alt="Walmart Logo" className="h-6 w-6" />
            <h1 className="text-lg font-black text-white">Analytica AI</h1>
        </div>
        <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-white/60 hover:text-white"
        >
            <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)}></div>
          <div className="sidebar-container relative w-72 h-full bg-[#001e60] animate-in slide-in-from-left duration-300">
            <button 
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/60 hover:text-white z-10"
            >
                <X className="h-6 w-6" />
            </button>
            {content}
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsProfileOpen(false)}></div>
          
          <div className="relative bg-slate-900 border border-slate-700/60 rounded-3xl p-6 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Background design accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <User className="h-5 w-5 text-[#0071ce]" />
                Mi Perfil
              </h3>
              {!isEditingProfile ? (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="text-xs font-bold text-[#0071ce] hover:text-blue-400 transition-colors"
                >
                  Editar
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="flex flex-col items-center mb-6 text-center relative z-10">
              <div 
                className={`relative group/avatar rounded-full overflow-hidden ${isEditingProfile ? 'cursor-pointer' : ''}`}
                onClick={() => isEditingProfile && fileInputRef.current?.click()}
              >
                {editPhoto ? (
                  <img src={editPhoto} alt="Perfil" className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-white/20" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#0071ce] to-cyan-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-500/20 border-2 border-white/10">
                    {editName?.charAt(0) || 'U'}
                  </div>
                )}
                {isEditingProfile && (
                  <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              
              {isEditingProfile && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#0071ce] hover:underline"
                >
                  Subir Foto
                </button>
              )}

              {!isEditingProfile ? (
                <h2 className="text-xl font-bold text-slate-100 mt-3">{userData?.displayName}</h2>
              ) : (
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-100 text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#0071ce]/50 focus:border-[#0071ce]"
                  placeholder="Tu Nombre"
                  required
                />
              )}
              
              <span className="mt-2 px-3 py-1 bg-blue-500/10 text-[#0071ce] dark:text-cyan-400 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-500/20 dark:border-cyan-500/20">
                {userData?.role || 'usuario'}
              </span>
            </div>

            <div className="space-y-4 bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 mb-6 relative z-10">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Correo Electrónico</span>
                <span className="text-sm font-medium text-slate-200">{userData?.email || user?.email || 'N/A'}</span>
              </div>
              {userData?.createdAt && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Miembro Desde</span>
                  <span className="text-sm font-medium text-slate-200">{new Date(userData.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 relative z-10">
              {isEditingProfile ? (
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="w-full flex items-center justify-center gap-2 bg-[#0071ce] hover:bg-blue-500 disabled:bg-blue-500/50 text-white font-bold py-3.5 px-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95"
                >
                  {isSavingProfile ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setIsProfileOpen(false);
                    setIsConfirmLogoutOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-rose-600/15 hover:bg-rose-600 text-rose-500 hover:text-white font-bold py-3.5 px-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-rose-600/20 active:scale-95 border border-rose-500/20 hover:border-transparent"
                >
                  <LogOut className="h-5 w-5" />
                  Cerrar sesión
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <ConfirmModal 
        isOpen={isConfirmLogoutOpen}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas cerrar sesión en Analytica AI?"
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        onConfirm={logout}
        onCancel={() => setIsConfirmLogoutOpen(false)}
      />
    </>
  );
};

export default Sidebar;
