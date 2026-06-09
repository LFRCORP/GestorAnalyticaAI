import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  MessageSquare, 
  Trash2, 
  Pin, 
  Edit2, 
  PlusSquare,
  Clock
} from 'lucide-react';
import { Project, ChatMessage, AnalysisRecord, ChatThread } from '../types';
import { getChatResponseStream } from '../services/geminiService';
import Spinner from './Spinner';
import ConfirmModal from './ConfirmModal';

interface ChatViewProps {
    project: Project;
    onUpdateProject: (updatedProjectData: Partial<Project>) => void;
    activeAnalysis: AnalysisRecord | null;
}

const ChatView: React.FC<ChatViewProps> = ({ project, onUpdateProject, activeAnalysis }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Sidebar states
    const [activeChatThreadId, setActiveChatThreadId] = useState<string>('');
    const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

    const threads: ChatThread[] = project.chatThreads || [];

    // Auto-migration & Initialization
    useEffect(() => {
        if (threads.length === 0) {
            if (project.chatHistory && project.chatHistory.length > 0) {
                // Migrate legacy chatHistory
                const initialThread: ChatThread = {
                    id: `thread_${Date.now()}`,
                    title: 'Conversación Inicial',
                    messages: project.chatHistory,
                    isPinned: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                onUpdateProject({
                    chatThreads: [initialThread],
                    activeChatThreadId: initialThread.id
                });
                setActiveChatThreadId(initialThread.id);
            } else {
                // Initialize first thread
                const newThread: ChatThread = {
                    id: `thread_${Date.now()}`,
                    title: 'Conversación 1',
                    messages: [],
                    isPinned: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                onUpdateProject({
                    chatThreads: [newThread],
                    activeChatThreadId: newThread.id
                });
                setActiveChatThreadId(newThread.id);
            }
        } else if (!activeChatThreadId) {
            // Set first thread or active thread from db
            setActiveChatThreadId(project.activeChatThreadId || threads[0].id);
        }
    }, [project.chatThreads, project.chatHistory, activeChatThreadId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const activeThread = threads.find(t => t.id === activeChatThreadId) || null;

    useEffect(scrollToBottom, [activeThread?.messages, streamingContent]);

    // Send Message Handler
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !activeThread) return;

        const userContent = input.trim();
        const newUserMessage: ChatMessage = { id: `msg_${Date.now()}`, role: 'user', content: userContent };
        const updatedMessages = [...(activeThread.messages || []), newUserMessage];
        
        const updatedThreads = threads.map(t => 
          t.id === activeChatThreadId
            ? { ...t, messages: updatedMessages, updatedAt: new Date().toISOString() }
            : t
        );

        onUpdateProject({ 
            chatThreads: updatedThreads,
            activeChatThreadId: activeChatThreadId
        });
        setInput('');
        setIsLoading(true);

        try {
            let context = '';
            
            // 1. Intelligent Knowledge Base Context
            context = "--- BASE DE CONOCIMIENTO: DOCUMENTOS DEL PROYECTO ---\n";
            if (Array.isArray(project.documents)) {
                project.documents.forEach(doc => {
                    const docQuota = project.documents.length > 5 ? 8000 : 25000;
                    const truncatedText = doc.textContent?.substring(0, docQuota) || 'Sin texto extraído';
                    context += `\nDOCUMENTO: ${doc.name}\nCONTENIDO: ${truncatedText}\n---\n`;
                });
            }

            if (activeAnalysis) {
                context += `\n--- LEGISLACIÓN LOCAL (${project.location.city}, ${project.location.state}) ---\n${activeAnalysis.normativaReport?.substring(0, 10000) || 'No disponible'}\n\n`;
                context += "--- RESULTADOS DE AUDITORÍA Y ANÁLISIS TÉCNICO ---\n";
                context += `Resumen Ejecutivo: ${activeAnalysis.resumenGeneral}\n`;
                
                if (activeAnalysis.inconsistencias?.length) {
                  context += `Inconsistencias Críticas: ${activeAnalysis.inconsistencias.slice(0, 20).join('; ')}\n`;
                }

                if (activeAnalysis.auditoriaTecnicaProfunda?.length) {
                    context += "\nHallazgos Técnicos de Ingeniería:\n";
                    activeAnalysis.auditoriaTecnicaProfunda.slice(0, 30).forEach(item => {
                        context += `- ${item.disciplina}: ${item.hallazgo} (Riesgo: ${item.riesgoOperativo})\n`;
                    });
                }
                
                context += "\nPuntos Fuera de Norma:\n";
                activeAnalysis.fichaMaestra.forEach(cat => {
                    cat.puntos.filter(p => p.estado !== 'cumple').slice(0, 10).forEach(p => {
                        context += `- ${p.nombre}: ${p.hallazgo}\n`;
                    });
                });
            }

            const stream = await getChatResponseStream(activeThread.messages, userContent, context);
            
            let modelResponse = '';
            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setStreamingContent(modelResponse);
            }
            
            const finalMessages = [...updatedMessages, { id: `msg_${Date.now() + 1}`, role: 'model', content: modelResponse }];
            const finalThreads = threads.map(t => 
              t.id === activeChatThreadId
                ? { ...t, messages: finalMessages, updatedAt: new Date().toISOString() }
                : t
            );

            onUpdateProject({ 
                chatThreads: finalThreads,
                activeChatThreadId: activeChatThreadId
            });
            setStreamingContent('');

        } catch (error) {
            console.error("Error en el chat:", error);
            const errorMessage: ChatMessage = { id: `msg_${Date.now() + 1}`, role: 'model', content: "Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo." };
            
            onUpdateProject({ 
                chatThreads: threads.map(t => 
                  t.id === activeChatThreadId ? { ...t, messages: [...updatedMessages, errorMessage], updatedAt: new Date().toISOString() } : t
                )
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Thread Operations
    const handleCreateThread = () => {
        const newThread: ChatThread = {
            id: `thread_${Date.now()}`,
            title: `Conversación ${threads.length + 1}`,
            messages: [],
            isPinned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        onUpdateProject({
            chatThreads: [...threads, newThread],
            activeChatThreadId: newThread.id
        });
        setActiveChatThreadId(newThread.id);
    };

    const handleTogglePin = (threadId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedThreads = threads.map(t => 
          t.id === threadId ? { ...t, isPinned: !t.isPinned } : t
        );
        onUpdateProject({ chatThreads: updatedThreads });
    };

    const handleRenameThread = (threadId: string, title: string) => {
        const updatedThreads = threads.map(t => 
          t.id === threadId ? { ...t, title: title.trim() || t.title, updatedAt: new Date().toISOString() } : t
        );
        onUpdateProject({ chatThreads: updatedThreads });
        setEditingThreadId(null);
    };

    const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setThreadToDelete(threadId);
    };

    // Delete Single Message
    const handleDeleteMessage = (messageId: string) => {
        setMessageToDelete(messageId);
    };

    const pinnedThreads = threads.filter(t => t.isPinned);
    const recentThreads = threads.filter(t => !t.isPinned);

    const renderThreadItem = (t: ChatThread) => {
        const isActive = t.id === activeChatThreadId;
        const isEditing = t.id === editingThreadId;
        
        return (
            <div
                key={t.id}
                onClick={() => {
                    setActiveChatThreadId(t.id);
                    onUpdateProject({ activeChatThreadId: t.id });
                }}
                className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                    isActive 
                        ? 'bg-cyan-500/10 border-cyan-500/20 text-white font-semibold shadow-lg shadow-cyan-950/20' 
                        : 'bg-slate-900/30 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 hover:border-slate-800/60'
                }`}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    {isEditing ? (
                        <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => handleRenameThread(t.id, editingTitle)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameThread(t.id, editingTitle);
                                if (e.key === 'Escape') setEditingThreadId(null);
                            }}
                            autoFocus
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-cyan-500 w-full"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="text-xs truncate">{t.title || 'Conversación sin título'}</span>
                    )}
                </div>
                
                {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                        <button
                            onClick={(e) => handleTogglePin(t.id, e)}
                            className={`p-1 rounded-lg transition-colors hover:bg-slate-800 ${t.isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                            title={t.isPinned ? 'Desanclar' : 'Anclar'}
                        >
                            <Pin className={`h-3 w-3 ${t.isPinned ? '' : 'rotate-45'}`} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingThreadId(t.id);
                                setEditingTitle(t.title);
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                            title="Renombrar"
                        >
                            <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                            onClick={(e) => handleDeleteThread(t.id, e)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-450 hover:bg-slate-800 transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-[75vh] bg-slate-900/20 rounded-3xl border border-slate-800/80 overflow-hidden backdrop-blur-md">
            {/* Sidebar (List of threads) */}
            <div className="w-72 bg-slate-950/40 border-r border-slate-800/80 flex flex-col h-full shrink-0">
                <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/10">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conversaciones</span>
                    <button 
                        onClick={handleCreateThread}
                        className="p-1.5 bg-cyan-600/10 text-cyan-400 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/25 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
                        title="Nueva Conversación"
                    >
                        <PlusSquare className="h-4 w-4" />
                        <span>NUEVA</span>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                    {pinnedThreads.length > 0 && (
                        <div className="space-y-1">
                            <p className="px-2 pb-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                <Pin className="h-3 w-3 rotate-45 text-amber-500" /> Fijadas
                            </p>
                            {pinnedThreads.map(renderThreadItem)}
                        </div>
                    )}
                    
                    <div className="space-y-1">
                        <p className="px-2 pb-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Recientes</p>
                        {recentThreads.length === 0 && pinnedThreads.length === 0 ? (
                            <p className="text-center py-8 text-xs text-slate-600 italic">No hay conversaciones</p>
                        ) : (
                            recentThreads.map(renderThreadItem)
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Pane */}
            <div className="flex-grow flex flex-col h-full bg-slate-950/10 min-w-0">
                <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {!activeThread ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                            <div className="bg-slate-850 p-6 rounded-full mb-4 border border-slate-800">
                                <MessageSquare className="h-12 w-12 text-cyan-400" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Asistente de Conocimiento</h3>
                            <p className="text-slate-400 max-w-xs text-sm">Crea o selecciona una conversación del historial para comenzar a hacer preguntas técnicas.</p>
                        </div>
                    ) : activeThread.messages.length === 0 && !streamingContent ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                            <div className="bg-slate-850 p-6 rounded-full mb-4 border border-slate-800">
                                <MessageSquare className="h-12 w-12 text-cyan-400" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{activeThread.title}</h3>
                            <p className="text-slate-400 max-w-xs text-sm">Haz preguntas técnicas a los documentos de tu proyecto y la legislación local.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {activeThread?.messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group/msg`}>
                                    <div className="relative flex items-center max-w-[85%]">
                                        {/* Delete button for user (placed to the left of the bubble) */}
                                        {msg.role === 'user' && (
                                            <button
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="mr-2.5 p-1.5 bg-slate-950/80 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-xl border border-slate-800 shadow-lg opacity-0 group-hover/msg:opacity-100 transition-all z-10 shrink-0"
                                                title="Eliminar mensaje"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}

                                        <div className={`px-4 py-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-cyan-600/90 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'}`}>
                                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-50">
                                                {msg.role === 'user' ? 'Tú' : 'Analytica AI'}
                                            </div>
                                            <div className="prose prose-invert prose-sm max-w-none">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                            </div>
                                        </div>

                                        {/* Delete button for AI (placed to the right of the bubble) */}
                                        {msg.role === 'model' && (
                                            <button
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="ml-2.5 p-1.5 bg-slate-950/80 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-xl border border-slate-800 shadow-lg opacity-0 group-hover/msg:opacity-100 transition-all z-10 shrink-0"
                                                title="Eliminar mensaje"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {streamingContent && (
                                <div className="flex justify-start">
                                    <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none shadow-sm animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-50">
                                            Analytica AI (Escribiendo...)
                                        </div>
                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {isLoading && !streamingContent && (
                                <div className="flex justify-start">
                                    <div className="p-3 bg-slate-800 rounded-full border border-slate-700 animate-pulse">
                                        <Spinner size="4" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Message input form */}
                {activeThread && (
                    <form onSubmit={handleSend} className="p-4 border-t border-slate-800/80 flex items-center gap-3 bg-slate-900/10">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Escribe tu pregunta aquí..."
                            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !input.trim()} 
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold p-3 rounded-2xl disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-900/25 active:scale-95"
                        >
                            {isLoading ? <Spinner size="5" /> : <Send className="h-5 w-5" />}
                        </button>
                    </form>
                )}
            </div>
            <div ref={messagesEndRef} />
            
            <ConfirmModal 
                isOpen={threadToDelete !== null}
                title="Eliminar Conversación"
                message="¿Estás seguro de que deseas eliminar esta conversación y todo su historial de mensajes? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => {
                  if (threadToDelete) {
                    const updatedThreads = threads.filter(t => t.id !== threadToDelete);
                    const nextActiveId = activeChatThreadId === threadToDelete 
                      ? (updatedThreads.length > 0 ? updatedThreads[0].id : '')
                      : activeChatThreadId;
                    onUpdateProject({ 
                      chatThreads: updatedThreads,
                      activeChatThreadId: nextActiveId
                    });
                    if (activeChatThreadId === threadToDelete) {
                        setActiveChatThreadId(nextActiveId);
                    }
                    setThreadToDelete(null);
                  }
                }}
                onCancel={() => setThreadToDelete(null)}
            />

            <ConfirmModal 
                isOpen={messageToDelete !== null}
                title="Eliminar Mensaje"
                message="¿Estás seguro de que deseas eliminar este mensaje? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => {
                  if (messageToDelete && activeThread) {
                    const updatedMessages = activeThread.messages.filter(m => m.id !== messageToDelete);
                    const updatedThreads = threads.map(t => 
                      t.id === activeChatThreadId
                        ? { ...t, messages: updatedMessages, updatedAt: new Date().toISOString() }
                        : t
                    );
                    onUpdateProject({ chatThreads: updatedThreads });
                    setMessageToDelete(null);
                  }
                }}
                onCancel={() => setMessageToDelete(null)}
            />
        </div>
    );
};

export default ChatView;