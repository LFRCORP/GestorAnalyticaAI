import React, { useState } from 'react';
import { 
    Plus, 
    Trash2, 
    LayoutDashboard, 
    ShieldAlert,
    Lock,
    Share2
} from 'lucide-react';
import ProjectView from './components/ProjectView';
import ImageAnalyzerView from './components/ImageAnalyzerView';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import UsersManagement from './components/UsersManagement';
import Spinner from './components/Spinner';
import { useAuth } from './contexts/AuthContext';
import { useFirestoreProjects } from './hooks/useFirestoreProjects';

import CreateProjectModal from './components/CreateProjectModal';

type View = 'projects' | 'project_detail' | 'image_analyzer' | 'users_management';

const App: React.FC = () => {
  const { user, userData, loading: authLoading, logout } = useAuth();
  const { projects, loading: projectsLoading, addProject, updateProject, deleteProject } = useFirestoreProjects();
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [view, setView] = useState<View>('projects');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (authLoading) return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="12" />
        <p className="text-cyan-500 font-bold animate-pulse tracking-widest text-xs">INICIANDO ANALYTICA AI</p>
      </div>
    </div>
  );
  if (!user) return <Login />;

  // Approval Check - Hacedor bypasses all authorization blocks
  const isHacedor = user?.uid === 'jhJUq4sUNDfFl78GNJRYn5CIFv02' || userData?.role === 'hacedor';
  
  if (!isHacedor && userData && !userData.approved) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-800/50 backdrop-blur-xl p-10 rounded-3xl border border-slate-700 shadow-2xl">
          <div className="bg-amber-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
            <ShieldAlert className="h-10 w-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Acceso Pendiente</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Tu cuenta ha sido creada exitosamente, pero aún requiere la aprobación de un administrador para acceder a las herramientas de análisis técnico.
          </p>
          <button 
            onClick={() => logout()}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  const activeProject = projects.find(p => p.id === activeProjectId);
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProject = async (name: string, city: string, state: string) => {
    const projectId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newProject = {
      id: projectId,
      name,
      location: { city, state },
      documents: [],
      analysisHistory: [],
      chatHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      visibility: 'private' as const,
      userId: user.uid
    };

    try {
        await addProject(newProject);
        setActiveProjectId(projectId);
        setView('project_detail');
        setIsCreateModalOpen(false);
    } catch (error) {
        console.error("Error creating project:", error);
        alert("Error al crear el proyecto. Intenta de nuevo.");
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'users_management':
        return <UsersManagement />;
      case 'image_analyzer':
        return <ImageAnalyzerView />;
      case 'project_detail':
        return activeProject ? (
          <ProjectView 
            project={activeProject} 
            onUpdateProject={(data) => updateProject(activeProject.id, data)}
            onBack={() => {
                setView('projects');
                setActiveProjectId(null);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-20">
            <ShieldAlert className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-xl font-bold">Proyecto no encontrado</p>
            <button onClick={() => setView('projects')} className="mt-4 text-cyan-400 hover:underline">Volver a Proyectos</button>
          </div>
        );
      default:
        return (
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Mis <span className="text-cyan-400">Proyectos</span></h1>
                <p className="text-slate-400 font-medium">Gestiona y analiza tus documentos técnicos</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg shadow-cyan-900/20 hover:scale-[1.02] active:scale-95"
              >
                <Plus className="h-5 w-5" />
                <span>NUEVO PROYECTO</span>
              </button>
            </div>

            <div className="mb-8 relative group max-w-md">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LayoutDashboard className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Buscar proyectos por nombre..."
                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-2xl py-4 pl-12 pr-6 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {projectsLoading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-24 bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-700/50">
                <div className="bg-slate-800 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <LayoutDashboard className="h-10 w-10 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">No hay proyectos</h3>
                <p className="text-slate-500 mb-8 max-w-xs mx-auto">Comienza creando tu primer proyecto para analizar documentos técnicos.</p>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="text-cyan-400 font-bold uppercase tracking-widest text-xs hover:text-cyan-300 transition-colors"
                >
                    + Crear Ahora
                </button>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-3xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-900/10 cursor-pointer flex flex-col h-full relative overflow-hidden"
                    onClick={() => {
                      setActiveProjectId(project.id);
                      setView('project_detail');
                    }}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-cyan-500/10 transition-all"></div>
                    
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700 group-hover:border-cyan-500/30 transition-colors">
                            <LayoutDashboard className="h-6 w-6 text-cyan-400" />
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            project.visibility === 'public' ? 'bg-emerald-500/10 text-emerald-400' :
                            project.visibility === 'shared' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-slate-700/50 text-slate-500'
                        }`}>
                            {project.visibility === 'private' ? <Lock className="h-3 w-3 inline mr-1" /> : <Share2 className="h-3 w-3 inline mr-1" />}
                            {project.visibility || 'Privado'}
                        </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors line-clamp-1">{project.name}</h3>
                    <p className="text-slate-500 text-sm mb-6 flex-grow">{project.documents.length} documentos cargados</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Actualizado: {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'N/A'}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('¿Eliminar proyecto?')) deleteProject(project.id);
                            }}
                            className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 selection:bg-cyan-500/30 overflow-x-hidden">
      <Sidebar 
        currentView={view} 
        onViewChange={(newView) => {
            setView(newView);
            if (newView !== 'project_detail') setActiveProjectId(null);
        }} 
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      
      <main className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'} min-h-screen pt-16 lg:pt-0`}>
        <div className="h-full relative z-10">
          {renderContent()}
        </div>
      </main>

      <CreateProjectModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
};

export default App;
