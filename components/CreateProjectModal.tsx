import React, { useState } from 'react';
import { X, FolderPlus, ShieldCheck, MapPin, ChevronDown } from 'lucide-react';
import { mexicoData } from '../data/mexicoData';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, city: string, state: string) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !state || !city) return;
    onCreate(name, city, state);
    setName('');
    setCity('');
    setState('');
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
      
      <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-700/50 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
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
