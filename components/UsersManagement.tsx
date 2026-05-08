import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, query, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { AppUser, UserRole } from '../types';
import { User, Shield, CheckCircle2, XCircle, MoreVertical, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const UsersManagement: React.FC = () => {
  const { user: authUser, userData: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);

  const isHacedor = authUser?.uid === 'jhJUq4sUNDfFl78GNJRYn5CIFv02' || currentUser?.role === 'hacedor';
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(doc => doc.data() as AppUser);
      setUsers(usersList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const handleApprovalToggle = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { approved: !currentStatus });
    } catch (error) {
      console.error("Error updating approval:", error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(search.toLowerCase()) || 
    user.displayName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Gestión de Usuarios</h2>
        <p className="text-slate-400">Administra los roles y niveles de acceso de los miembros de la plataforma.</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800/80 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input 
                    type="text"
                    placeholder="Buscar por nombre o correo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Filter className="h-4 w-4" />
                <span>Total: {users.length} usuarios</span>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-700">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Registro</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-700/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 border border-slate-600 group-hover:border-cyan-500/50 transition-colors">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{user.displayName}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      disabled={!isHacedor || user.uid === authUser?.uid}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 disabled:opacity-50 appearance-none cursor-pointer"
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                      <option value="hacedor">Hacedor</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      disabled={!isHacedor || user.uid === authUser?.uid}
                      onClick={() => handleApprovalToggle(user.uid, user.approved)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors
                        ${user.approved 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'}`}
                    >
                      {user.approved ? (
                        <><CheckCircle2 className="h-3 w-3" /> Aprobado</>
                      ) : (
                        <><XCircle className="h-3 w-3" /> Pendiente</>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-500 hover:text-white transition-colors">
                        <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersManagement;
