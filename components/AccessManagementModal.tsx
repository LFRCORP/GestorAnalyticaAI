import React, { useState, useEffect } from 'react';
import { X, Users, Check, Search } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { AppUser } from '../types';

interface AccessManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    allowedUsers: string[];
    onAddUser: (email: string) => void;
    onRemoveUser: (email: string) => void;
}

const AccessManagementModal: React.FC<AccessManagementModalProps> = ({ 
    isOpen, 
    onClose, 
    allowedUsers, 
    onAddUser, 
    onRemoveUser 
}) => {
    const [email, setEmail] = useState('');
    const [approvedUsers, setApprovedUsers] = useState<AppUser[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchApprovedUsers();
        }
    }, [isOpen]);

    const fetchApprovedUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), where('approved', '==', true));
            const querySnapshot = await getDocs(q);
            const users = querySnapshot.docs.map(doc => doc.data() as AppUser);
            setApprovedUsers(users);
        } catch (error) {
            console.error("Error fetching approved users:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = approvedUsers.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl border border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Users className="h-5 w-5 text-amber-400" />
                            Gestión de Acceso
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Controla quién puede ver este proyecto</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Add by Email */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Añadir por correo electrónico</label>
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (email.trim()) {
                                    onAddUser(email.trim().toLowerCase());
                                    setEmail('');
                                }
                            }}
                            className="flex gap-2"
                        >
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ejemplo@correo.com"
                                className="flex-grow bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                            />
                            <button 
                                type="submit"
                                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 rounded-xl text-sm transition-all shadow-lg shadow-cyan-900/20"
                            >
                                Añadir
                            </button>
                        </form>
                    </div>

                    {/* Select from Approved Users */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 block">Seleccionar de usuarios aprobados</label>
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1 text-[10px] text-white focus:outline-none focus:border-cyan-500 w-32 md:w-48"
                                />
                            </div>
                        </div>
                        
                        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden">
                            <div className="max-h-[35vh] overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {loading ? (
                                    <div className="py-8 flex justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-500"></div>
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <p className="text-center py-8 text-xs text-slate-500 italic">No se encontraron usuarios aprobados.</p>
                                ) : (
                                    filteredUsers.map((u) => {
                                        const isAllowed = allowedUsers.includes(u.email);
                                        return (
                                            <div 
                                                key={u.uid}
                                                onClick={() => isAllowed ? onRemoveUser(u.email) : onAddUser(u.email)}
                                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                                                    isAllowed 
                                                    ? 'bg-cyan-500/10 border border-cyan-500/20' 
                                                    : 'hover:bg-slate-800 border border-transparent'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        isAllowed ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'
                                                    }`}>
                                                        {u.displayName?.charAt(0) || u.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white leading-none">{u.displayName}</p>
                                                        <p className="text-[10px] text-slate-500 mt-1">{u.email}</p>
                                                    </div>
                                                </div>
                                                <div className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all ${
                                                    isAllowed ? 'bg-cyan-500 text-white' : 'border border-slate-600 text-transparent'
                                                }`}>
                                                    <Check className="h-3.5 w-3.5" />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 bg-slate-900/30 border-t border-slate-700 flex justify-between items-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-2">
                        {allowedUsers.length} {allowedUsers.length === 1 ? 'usuario tiene' : 'usuarios tienen'} acceso
                    </p>
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-all"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccessManagementModal;
