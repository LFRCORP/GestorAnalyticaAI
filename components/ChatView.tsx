
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, MessageSquare } from 'lucide-react';
import { Project, ChatMessage, AnalysisRecord } from '../types';
import { getChatResponseStream } from '../services/geminiService';
import Spinner from './Spinner';

interface ChatViewProps {
    project: Project;
    onUpdateProject: (updatedProject: Project) => void;
    activeAnalysis: AnalysisRecord | null;
}

const ChatView: React.FC<ChatViewProps> = ({ project, onUpdateProject, activeAnalysis }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [project.chatHistory, streamingContent]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userContent = input.trim();
        const newUserMessage: ChatMessage = { id: `msg_${Date.now()}`, role: 'user', content: userContent };
        const updatedChatHistory = [...project.chatHistory, newUserMessage];
        
        // Initial update only with user message
        onUpdateProject({ chatHistory: updatedChatHistory });
        setInput('');
        setIsLoading(true);

        try {
            let context = '';
            
            // 1. Intelligent Knowledge Base (Prioritizing relevance to avoid overflow)
            context = "--- BASE DE CONOCIMIENTO: DOCUMENTOS DEL PROYECTO ---\n";
            project.documents.forEach(doc => {
                const docQuota = project.documents.length > 5 ? 8000 : 25000;
                const truncatedText = doc.textContent?.substring(0, docQuota) || 'Sin texto extraído';
                context += `\nDOCUMENTO: ${doc.name}\nCONTENIDO: ${truncatedText}\n---\n`;
            });

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

            const stream = await getChatResponseStream(project.chatHistory, userContent, context);
            
            let modelResponse = '';
            
            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setStreamingContent(modelResponse);
            }
            
            // Final update once stream is finished to persist everything
            onUpdateProject({ chatHistory: [...updatedChatHistory, { id: `msg_${Date.now() + 1}`, role: 'model', content: modelResponse }] });
            setStreamingContent('');

        } catch (error) {
            console.error("Error en el chat:", error);
            const errorMessage: ChatMessage = { id: `msg_${Date.now() + 1}`, role: 'model', content: "Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo." };
            onUpdateProject({ chatHistory: [...updatedChatHistory, errorMessage] });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full p-4">
            <div className="flex-grow overflow-y-auto mb-4 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                {project.chatHistory.length === 0 && !streamingContent ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                        <div className="bg-slate-800 p-6 rounded-full mb-4">
                            <MessageSquare className="h-12 w-12 text-cyan-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Asistente de Conocimiento</h3>
                        <p className="text-slate-400 max-w-xs">Haz preguntas técnicas a los documentos de tu proyecto y la legislación local.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {project.chatHistory.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-cyan-600/90 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'}`}>
                                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-50">
                                        {msg.role === 'user' ? 'Tú' : 'Analytica AI'}
                                    </div>
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                    </div>
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
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="flex-shrink-0 flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu pregunta aquí..."
                    className="w-full bg-slate-700 text-white rounded-md px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-50"
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || !input.trim()} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors">
                    {isLoading ? <Spinner size="5" /> : <Send className="h-5 w-5" />}
                </button>
            </form>
        </div>
    );
};

export default ChatView;