import React, { useState, useEffect } from 'react';
import { X, FolderPlus, ShieldCheck, MapPin, ChevronDown, Lock, Globe, Users, Search, Check } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { mexicoData } from '../data/mexicoData';
import { AppUser } from '../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    name: string, 
    city: string, 
    state: string, 
    visibility: 'private' | 'public' | 'shared',
    allowedUsers: string[]
  ) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public' | 'shared'>('private');

  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<AppUser[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const q = query(collection(db, 'users'), where('approved', '==', true));
          const querySnapshot = await getDocs(q);
          const users = querySnapshot.docs.map(doc => doc.data() as AppUser);
          setApprovedUsers(users);
        } catch (error) {
          console.error("Error fetching approved users for modal:", error);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !state || !city) return;
    onCreate(name, city, state, visibility, visibility === 'shared' ? allowedEmails : []);
    setName('');
    setCity('');
    setState('');
    setVisibility('private');
    setAllowedEmails([]);
    setUsersSearch('');
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setState(newState);
    setCity(''); // Reset city when state changes
  };

  const municipalities = state ? mexicoData[state] || [] : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>
      
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
        
        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20">
                <FolderPlus className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Nuevo Proyecto</h3>
                <p className="text-slate-400 text-sm">Configura los detalles de tu auditoría</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre del Proyecto</label>
              <div className="relative group">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <input
                  autoFocus
                  required
                  type="text"
                  placeholder="Ej: Auditoría Planta Industrial Norte"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-6 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 pointer-events-none">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <select
                    required
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
                    value={state}
                    onChange={handleStateChange}
                  >
                    <option value="" disabled>Selecciona Estado</option>
                    {Object.keys(mexicoData).sort().map((stateName) => (
                      <option key={stateName} value={stateName}>{stateName}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Municipio / Ciudad</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 pointer-events-none">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <select
                    required
                    disabled={!state}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  >
                    <option value="" disabled>{!state ? 'Primero elige un estado' : 'Selecciona Municipio'}</option>
                    {municipalities.map((m, idx) => (
                      <option key={idx} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Visibilidad del Proyecto</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center ${
                    visibility === 'private' 
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' 
                    : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  <Lock className="h-5 w-5" />
                  <span className="text-[10px] font-bold uppercase">Privado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center ${
                    visibility === 'public' 
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                    : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  <Globe className="h-5 w-5" />
                  <span className="text-[10px] font-bold uppercase">Público</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('shared')}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center ${
                    visibility === 'shared' 
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
                    : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span className="text-[10px] font-bold uppercase">Compartido</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center px-4 leading-relaxed">
                {visibility === 'private' && "Solo tú y los administradores podrán ver este proyecto."}
                {visibility === 'public' && "Cualquier usuario con el link podrá ver este proyecto."}
                {visibility === 'shared' && "Selecciona los usuarios aprobados que tendrán acceso a este proyecto."}
              </p>
            </div>

            {visibility === 'shared' && (
              <div className="space-y-3 p-4 bg-slate-900/40 rounded-3xl border border-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Seleccionar Usuarios con Acceso</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={usersSearch}
                      onChange={(e) => setUsersSearch(e.target.value)}
                      className="bg-slate-950/50 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 w-44 transition-all"
                    />
                  </div>
                </div>

                <div className="border border-slate-800/60 rounded-2xl overflow-hidden max-h-[160px] overflow-y-auto custom-scrollbar bg-slate-950/20">
                  {loadingUsers ? (
                    <div className="py-6 flex justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-500"></div>
                    </div>
                  ) : approvedUsers.length === 0 ? (
                    <p className="text-center py-6 text-xs text-slate-500 italic">No hay usuarios aprobados disponibles.</p>
                  ) : (
                    <div className="p-1.5 space-y-1">
                      {approvedUsers
                        .filter(u => 
                          u.displayName.toLowerCase().includes(usersSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(usersSearch.toLowerCase())
                        )
                        .map((u) => {
                          const isSelected = allowedEmails.includes(u.email);
                          return (
                            <div
                              key={u.uid}
                              onClick={() => {
                                if (isSelected) {
                                  setAllowedEmails(allowedEmails.filter(email => email !== u.email));
                                } else {
                                  setAllowedEmails([...allowedEmails, u.email]);
                                }
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-cyan-500/10 border border-cyan-500/25'
                                  : 'hover:bg-slate-900 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {u.displayName?.charAt(0) || u.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-bold text-white leading-none">{u.displayName}</p>
                                  <p className="text-[9px] text-slate-500 mt-0.5">{u.email}</p>
                                </div>
                              </div>
                              <div className={`h-5 w-5 rounded-md flex items-center justify-center transition-all ${
                                isSelected ? 'bg-cyan-500 text-white' : 'border border-slate-700 text-transparent'
                              }`}>
                                <Check className="h-3 w-3" />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
                {allowedEmails.length > 0 && (
                  <p className="text-[10px] text-cyan-400 font-medium ml-1">
                    ✓ {allowedEmails.length} {allowedEmails.length === 1 ? 'usuario seleccionado' : 'usuarios seleccionados'} para compartir
                  </p>
                )}
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 px-6 rounded-2xl transition-all"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-cyan-900/20"
              >
                CREAR PROYECTO
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
