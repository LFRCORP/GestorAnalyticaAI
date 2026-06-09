import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    FileText, 
    Upload, 
    Zap, 
    History, 
    Download, 
    ArrowLeft, 
    Trash2, 
    MapPin, 
    CheckCircle2,
    X,
    ShieldCheck,
    AlertTriangle,
    FileSearch,
    Lightbulb,
    ClipboardList,
    Calculator,
    HardHat,
    Droplets,
    Flame,
    Building2,
    ArrowLeftRight,
    CloudRain,
    Lock,
    Globe,
    Users,
    ChevronDown,
    RefreshCw,
    Plus,
    Clock,
    ChevronUp,
    Share2
} from 'lucide-react';
import { mexicoData } from '../data/mexicoData';
import { Project, Document, DatosClavePorDocumento, AnalysisRecord, DatoClave, ProjectVisibility } from '../types';
import { parsePdfToImageParts, extractTextFromPdf } from '../services/pdfParser';
import { analyzeDocuments, getAddressInfo } from '../services/geminiService';
import { generateDocxReport } from '../services/reportGenerator';
import ChatView from './ChatView';
import ReportComparisonView from './ReportComparisonView';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, uploadBase64Image } from '../services/storageService';
import AccessManagementModal from './AccessManagementModal';
import Spinner from './Spinner';
import ConfirmModal from './ConfirmModal';

const saveAs = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

// --- History Modal Component ---
interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (recordId: string) => void;
    analysisHistory: AnalysisRecord[];
    activeAnalysisId: string | null;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onSelect, analysisHistory, activeAnalysisId }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Historial de Análisis</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <ul className="space-y-2">
                        {[...analysisHistory].reverse().map(record => (
                            <li key={record.id}
                                onClick={() => onSelect(record.id)}
                                className={`p-3 rounded-md cursor-pointer transition-colors ${activeAnalysisId === record.id ? 'bg-cyan-800' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                <p className="font-semibold text-white">Análisis del {new Date(record.date).toLocaleString()}</p>
                                <p className="text-xs text-slate-400 truncate">{record.resumenGeneral}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const playSuccessSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        // Sound 1: Short low-mid tone
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(349.23, ctx.currentTime); // F4 note
        gain1.gain.setValueAtTime(0.08, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.12);
        
        // Sound 2: Short high tone starting slightly later
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(523.25, ctx.currentTime + 0.06); // C5 note
        gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.06);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        
        osc2.start(ctx.currentTime + 0.06);
        osc2.stop(ctx.currentTime + 0.25);
    } catch (e) {
        console.warn("Audio Context failed to play:", e);
    }
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr || '';
    }
};

const getFileTypeBadge = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') {
        return (
            <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
                PDF
            </span>
        );
    } else if (['doc', 'docx'].includes(ext)) {
        return (
            <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
                WORD
            </span>
        );
    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
        return (
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
                EXCEL
            </span>
        );
    } else if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) {
        return (
            <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
                IMG
            </span>
        );
    } else {
        return (
            <span className="text-[9px] bg-slate-500/10 text-slate-400 border border-slate-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
                {ext.toUpperCase() || 'FILE'}
            </span>
        );
    }
};

// --- Version History Modal ---
interface VersionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: Document | null;
}

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ isOpen, onClose, document }) => {
    if (!isOpen || !document) return null;

    const versions = [...(document.versions || [])].sort((a, b) => b.versionNumber - a.versionNumber);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Clock className="h-5 w-5 text-cyan-400" />
                            Historial de Versiones
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">{document.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {versions.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4 opacity-20" />
                            <p className="text-slate-400">Solo existe la versión actual de este documento.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Current Version */}
                            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest bg-cyan-500 text-white px-2 py-0.5 rounded-full shadow-lg">Actual</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-cyan-500/20 rounded-lg">
                                        <FileText className="h-6 w-6 text-cyan-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Versión {(document.versions?.length || 0) + 1}</p>
                                        <p className="text-xs text-slate-300 mt-1">
                                            Subido por: <span className="font-semibold text-cyan-400">{document.uploadedBy || 'Usuario'}</span>
                                        </p>
                                        {(document.uploadedAt || document.editedAt) && (
                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                Fecha: {formatDate(document.uploadedAt || document.editedAt)}
                                            </p>
                                        )}
                                        {document.editedBy && (
                                            <p className="text-[10px] text-slate-400 mt-1 bg-slate-900/40 px-2 py-1 rounded border border-slate-700/50 inline-block">
                                                Última edición por: <span className="font-semibold text-cyan-400">{document.editedBy}</span>
                                                {document.editedAt && ` el ${formatDate(document.editedAt)}`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Past Versions */}
                            {versions.map((v) => (
                                <div key={v.id} className="p-4 bg-slate-900/50 border border-slate-700 rounded-xl hover:border-slate-600 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-slate-800 rounded-lg">
                                                <History className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-200">Versión {v.versionNumber}</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Subido por: <span className="font-semibold text-slate-300">{v.uploadedBy || 'Usuario'}</span>
                                                </p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                    Fecha: {formatDate(v.uploadDate)}
                                                </p>
                                            </div>
                                        </div>
                                        {v.storageUrl && (
                                            <a 
                                                href={v.storageUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-all"
                                                title="Descargar esta versión"
                                            >
                                                <Download className="h-5 w-5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 bg-slate-900/30 border-t border-slate-700 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-all"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ExtendedDocument extends Document {}

interface ProjectViewProps {
    project: Project;
    onUpdateProject: (updatedProjectData: Partial<Project>) => void;
    onBack: () => void;
}

const ProjectView: React.FC<ProjectViewProps> = ({ project, onUpdateProject, onBack }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [analysisStage, setAnalysisStage] = useState<{ stage: string; progress: number; estimatedSeconds?: number } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [city, setCity] = useState(project.location.city);
    const [state, setState] = useState(project.location.state);
    const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [highlightedRefId, setHighlightedRefId] = useState<string | null>(null);
    const highlightedRef = useRef<HTMLDivElement>(null);
    const [isVerifyingAddress, setIsVerifyingAddress] = useState(false);
    const [addressInfo, setAddressInfo] = useState<{ text: string; sources: { web?: { uri: string; title?: string } }[] } | null>(null);
    const [activeTab, setActiveTab] = useState<'analysis' | 'chat' | 'comparison'>('analysis');
    const [selectedDocForHistory, setSelectedDocForHistory] = useState<Document | null>(null);
    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const replaceInputRef = useRef<HTMLInputElement>(null);
    const [docToReplace, setDocToReplace] = useState<string | null>(null);
    const [docToDelete, setDocToDelete] = useState<string | null>(null);

    // States and handlers for grid folder container, multi-select, and bulk delete
    const [isDocsCollapsed, setIsDocsCollapsed] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState('');

    // Refs and states for cancelling upload/analysis with confirmation
    const cancelUploadRef = useRef(false);
    const cancelAnalysisRef = useRef(false);
    const [isConfirmCancelUploadOpen, setIsConfirmCancelUploadOpen] = useState(false);
    const [isConfirmCancelAnalysisOpen, setIsConfirmCancelAnalysisOpen] = useState(false);

    const toggleDocSelection = useCallback((docId: string) => {
        if (isUploading) return;
        setSelectedDocIds(prev => {
            const next = new Set(prev);
            if (next.has(docId)) {
                next.delete(docId);
            } else {
                next.add(docId);
            }
            return next;
        });
    }, [isUploading]);

    const handleSelectAllDocs = useCallback(() => {
        const allDocs = Array.isArray(project.documents) ? project.documents : [];
        setSelectedDocIds(prev => {
            if (prev.size === allDocs.length) {
                return new Set();
            } else {
                return new Set(allDocs.map(d => d.id));
            }
        });
    }, [project.documents]);

    const handleBulkDeleteConfirm = useCallback(async () => {
        const count = selectedDocIds.size;
        setIsBulkDeleteConfirmOpen(false);
        setIsDeleting(true);
        setDeleteMessage(`Eliminando ${count} documento${count > 1 ? 's' : ''}...`);
        try {
            const remainingDocs = (Array.isArray(project.documents) ? project.documents : []).filter(
                doc => !selectedDocIds.has(doc.id)
            );
            await onUpdateProject({ documents: remainingDocs });
            setSelectedDocIds(new Set());
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(`Error al eliminar documentos: ${message}`);
        } finally {
            setIsDeleting(false);
        }
    }, [project.documents, selectedDocIds, onUpdateProject]);

    const handleAddUser = (email: string) => {
        const currentAllowed = project.allowedUsers || [];
        if (currentAllowed.includes(email)) return;
        onUpdateProject({ 
            allowedUsers: [...currentAllowed, email],
            visibility: 'shared' 
        });
    };

    const handleRemoveUser = (email: string) => {
        const currentAllowed = project.allowedUsers || [];
        onUpdateProject({ 
            allowedUsers: currentAllowed.filter(e => e !== email) 
        });
    };

    useEffect(() => {
        if (project.analysisHistory.length > 0 && !activeAnalysisId) {
            setActiveAnalysisId(project.analysisHistory[project.analysisHistory.length - 1].id);
        }
    }, [project.analysisHistory, activeAnalysisId]);
    
    useEffect(() => {
        if (highlightedRef.current) {
            highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightedRefId]);

    const activeAnalysis = project.analysisHistory.find(a => a.id === activeAnalysisId) || null;

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setIsUploading(true);
        setError(null);
        const fileList = Array.from(files);
        setUploadProgress({ current: 0, total: fileList.length, fileName: '' });
        cancelUploadRef.current = false;
        try {
            const newDocuments: Document[] = Array.isArray(project.documents) ? [...project.documents] : [];
            const failedFiles: string[] = [];
            for (let i = 0; i < fileList.length; i++) {
                if (cancelUploadRef.current) break;
                const file = fileList[i];
                setUploadProgress({ current: i + 1, total: fileList.length, fileName: file.name });
                
                const processedDoc = await processFile(file, user?.uid || '', project.id, fileList.length);
                if (cancelUploadRef.current) {
                    if (processedDoc) {
                        newDocuments.push(processedDoc);
                        playSuccessSound();
                        await onUpdateProject({ documents: [...newDocuments] });
                    }
                    break;
                }
                if (processedDoc) {
                    newDocuments.push(processedDoc);
                    playSuccessSound();
                    await onUpdateProject({ documents: [...newDocuments] });
                } else {
                    failedFiles.push(`${file.name} (Error de lectura o subida)`);
                }
            }
            if (failedFiles.length > 0 && !cancelUploadRef.current) {
                setError(`Se subieron algunos archivos, pero los siguientes tuvieron errores y fueron omitidos: ${failedFiles.join(', ')}`);
            }
        } catch (err: unknown) {
            if (!cancelUploadRef.current) {
                const message = err instanceof Error ? err.message : String(err);
                setError(`Error procesando archivos: ${message}`);
            }
        } finally {
            setIsUploading(false);
            setUploadProgress(null);
            event.target.value = ''; // Reset input so the same file can be selected again
        }
    }, [project.documents, onUpdateProject, user, project.id]);

    const processFile = useCallback(async (file: File, userId: string, projectId: string, totalFilesCount: number): Promise<Document | null> => {
        if (!(file instanceof File)) return null;
        if (file.type !== 'application/pdf') {
            console.warn(`Skipping non-PDF file: ${file.name}`);
            return null;
        }

        try {
            const textContent = await extractTextFromPdf(file);
            
            let storageUrl = '';
            if (userId) {
                storageUrl = await uploadFile(userId, projectId, file);
            }

            const isTechnical = file.name.toUpperCase().includes('MEMORIA') || file.name.toUpperCase().includes('CALCULO');
            let docQuota = Math.max(20, Math.floor(400 / totalFilesCount));
            if (isTechnical) docQuota = Math.floor(docQuota * 1.5);
            docQuota = Math.min(docQuota, 100); 

            const imageParts = await parsePdfToImageParts(file, docQuota); 
            
            const processedPages = [];
            if (userId) {
                for (let i = 0; i < imageParts.length; i++) {
                    const part = imageParts[i];
                    const pageUrl = await uploadBase64Image(
                         userId, 
                         projectId, 
                         `${Date.now()}_${file.name}_page_${i}.jpg`, 
                         part.inlineData.data, 
                         part.inlineData.mimeType
                    );
                    processedPages.push({
                        ...part,
                        storageUrl: pageUrl,
                    });
                }
            } else {
                processedPages.push(...imageParts);
            }

            return {
                id: `doc_${Date.now()}_${file.name}`,
                name: file.name,
                textContent: textContent, 
                pages: processedPages,
                storageUrl: storageUrl,
                fileSize: file.size,
                uploadedBy: user?.email || user?.displayName || 'Usuario',
                uploadedAt: new Date().toISOString(),
            } as ExtendedDocument;
        } catch (fileErr: unknown) {
            console.error(`Error processing file ${file.name}:`, fileErr);
            return null;
        }
    }, [user]);

    const handleReplaceDocument = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !docToReplace) return;

        setIsUploading(true);
        setError(null);
        setUploadProgress({ current: 1, total: 1, fileName: file.name });

        try {
            const processedDoc = await processFile(file, user?.uid || '', project.id, 1);
            if (!processedDoc) throw new Error("Error al procesar el archivo.");

            const updatedDocuments = (Array.isArray(project.documents) ? project.documents : []).map(doc => {
                if (doc.id === docToReplace) {
                    const extDoc = doc as ExtendedDocument;
                    // Create version from current state
                    const oldVersion = {
                        id: `v_${Date.now()}_${doc.name}`,
                        versionNumber: (doc.versions?.length || 0) + 1,
                        uploadDate: extDoc.uploadedAt || new Date().toISOString(),
                        textContent: doc.textContent,
                        pages: doc.pages,
                        storageUrl: doc.storageUrl,
                        fileSize: doc.fileSize,
                        uploadedBy: extDoc.uploadedBy || 'Usuario',
                    };

                    return {
                        ...processedDoc,
                        id: doc.id, // Keep the same document ID
                        name: doc.name, // Keep the original document logical name
                        uploadedBy: extDoc.uploadedBy || 'Usuario', // Original uploader
                        uploadedAt: extDoc.uploadedAt || new Date().toISOString(), // Original upload date
                        editedBy: user?.email || user?.displayName || 'Usuario',
                        editedAt: new Date().toISOString(),
                        versions: [oldVersion, ...(doc.versions || [])]
                    } as ExtendedDocument;
                }
                return doc;
            });

            onUpdateProject({ documents: updatedDocuments });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(`Error al reemplazar documento: ${message}`);
        } finally {
            setIsUploading(false);
            setUploadProgress(null);
            setDocToReplace(null);
            if (replaceInputRef.current) replaceInputRef.current.value = '';
        }
    }, [project.documents, project.id, user, docToReplace, onUpdateProject, processFile]);

    const handleRemoveDocument = (docId: string) => {
        setDocToDelete(docId);
    };

    const handleAnalyze = async () => {
        if (!Array.isArray(project.documents) || project.documents.length === 0) {
            setError('Por favor, carga al menos un documento para analizar.');
            return;
        }
        if (!city || !state) {
            setError('Por favor, especifica la ciudad y el estado del proyecto.');
            return;
        }
        setIsLoading(true);
        setError(null);
        cancelAnalysisRef.current = false;
        
        const estSeconds = Math.max(60, project.documents.length * 25); // Estimate 25s per doc, min 60s
        setAnalysisStage({ stage: 'Iniciando auditoría y preparando documentos...', progress: 0, estimatedSeconds: estSeconds });
        
        let progressInterval: NodeJS.Timeout | null = null;
        
        try {
            let secondsElapsed = 0;
            
            progressInterval = setInterval(() => {
                secondsElapsed += 1;
                const remaining = Math.max(0, estSeconds - secondsElapsed);
                
                let currentProgress = 0;
                let currentStage = '';

                const ratio = secondsElapsed / estSeconds;

                if (ratio < 0.15) {
                    currentStage = 'Consultando normativa local en tiempo real...';
                    currentProgress = (ratio / 0.15) * 15;
                } else if (ratio < 0.35) {
                    currentStage = 'Extrayendo datos clave de planos y memorias...';
                    currentProgress = 15 + ((ratio - 0.15) / 0.20) * 20;
                } else if (ratio < 0.60) {
                    currentStage = 'Realizando auditoría técnica y cruzando información...';
                    currentProgress = 35 + ((ratio - 0.35) / 0.25) * 25;
                } else if (ratio < 0.85) {
                    currentStage = 'Verificando cálculos y detectando riesgos...';
                    currentProgress = 60 + ((ratio - 0.60) / 0.25) * 25;
                } else if (ratio <= 1.0) {
                    currentStage = 'Generando reporte final de viabilidad...';
                    currentProgress = 85 + ((ratio - 0.85) / 0.15) * 10;
                } else {
                    currentStage = 'Finalizando detalles, por favor espera...';
                    // Slowly creep from 95 to 99
                    const overTime = secondsElapsed - estSeconds;
                    currentProgress = 95 + (4 * (1 - Math.exp(-overTime / 30)));
                }
                
                setAnalysisStage({
                    stage: currentStage,
                    progress: Math.min(99, Math.round(currentProgress)),
                    estimatedSeconds: remaining
                });
            }, 1000);
            
            // Generate a summary of previous analyses to provide context for the new cumulative analysis
            const historyContext = project.analysisHistory.length > 0 
                ? project.analysisHistory.map(h => `- [${new Date(h.date).toLocaleDateString()}] Resumen: ${h.resumenGeneral}. Inconsistencias previas: ${h.inconsistencias.join('; ')}`).join('\n')
                : '';

            const { analysis, sources, normativaReport } = await analyzeDocuments(Array.isArray(project.documents) ? project.documents : [], { city, state }, historyContext);
            
            if (cancelAnalysisRef.current) {
                if (progressInterval) clearInterval(progressInterval);
                return;
            }

            if (progressInterval) clearInterval(progressInterval);
            
            const newRecord: AnalysisRecord = {
                ...analysis,
                id: `analysis_${Date.now()}`,
                date: new Date().toISOString(),
                normativaSources: sources,
                normativaReport: normativaReport,
            };
            
            setAnalysisStage({ stage: 'Finalizando reporte de viabilidad...', progress: 98, estimatedSeconds: 0 });
            const updatedHistory = [...project.analysisHistory, newRecord];
            onUpdateProject({ analysisHistory: updatedHistory });
            setActiveAnalysisId(newRecord.id);
        } catch (err: unknown) {
            if (cancelAnalysisRef.current) return;
            const message = err instanceof Error ? err.message : String(err);
            setError(`Error en el análisis: ${message}`);
        } finally {
            if (progressInterval) clearInterval(progressInterval);
            setIsLoading(false);
            setAnalysisStage(null);
        }
    };
    
    const handleLocationChange = () => {
        onUpdateProject({ location: { city, state } });
    };

    const handleVerifyAddress = async () => {
        if (!activeAnalysis?.datosClave.direccion[0]?.valor) {
            setError("No se ha encontrado una dirección en el análisis para verificar.");
            return;
        }
        setIsVerifyingAddress(true);
        setAddressInfo(null);
        setError(null);
        try {
            const result = await getAddressInfo(activeAnalysis.datosClave.direccion[0].valor);
            setAddressInfo(result);
        } catch (err: unknown) {
             const message = err instanceof Error ? err.message : String(err);
             setError(`Error al verificar la dirección: ${message}`);
        } finally {
            setIsVerifyingAddress(false);
        }
    };

    const downloadAnalysis = () => {
        if (!activeAnalysis) return;
        let content = `Análisis del Proyecto: ${project.name}\n`;
        content += `Fecha de Análisis: ${new Date(activeAnalysis.date).toLocaleString()}\n\n`;
        content += `--- RESUMEN GENERAL ---\n${activeAnalysis.resumenGeneral}\n\n`;
        content += `--- INCONSISTENCIAS ---\n${activeAnalysis.inconsistencias.join('\n- ')}\n\n`;
        content += `--- COMPARACIÓN NORMATIVA ---\n${activeAnalysis.comparacionNormativa}\n\n`;
        
        if (activeAnalysis.normativaSources && activeAnalysis.normativaSources.length > 0) {
            content += `--- FUENTES DE NORMATIVA ---\n`;
            activeAnalysis.normativaSources.forEach(source => {
                if (source.web) {
                     content += `- ${source.web.title}: ${source.web.uri}\n`;
                }
            });
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `Analisis_${project.name.replace(/ /g, '_')}.txt`);
    };

    const renderFileUpload = () => {
        const documents = Array.isArray(project.documents) ? project.documents : [];
        const isAllSelected = documents.length > 0 && selectedDocIds.size === documents.length;
        const isSomeSelected = selectedDocIds.size > 0 && selectedDocIds.size < documents.length;
        const headerTitle = documents.length > 0 ? 'Documentos del Proyecto' : 'Carga de Documentos';

        return (
            <div className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden transition-all duration-300">
                {/* Header */}
                <div 
                    onClick={() => setIsDocsCollapsed(!isDocsCollapsed)}
                    className="p-4 bg-slate-800/80 border-b border-slate-700/50 flex justify-between items-center cursor-pointer select-none hover:bg-slate-700/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                            <span>{headerTitle}</span>
                            <span className="bg-slate-900 text-cyan-400 text-xs px-2 py-0.5 rounded-full border border-slate-700 font-mono">
                                {documents.length}
                            </span>
                        </h3>
                    </div>
                    <button className="text-slate-400 hover:text-slate-100 transition-colors">
                        {isDocsCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </button>
                </div>

                {/* Collapsible Content */}
                <div className={`transition-all duration-300 overflow-hidden ${isDocsCollapsed ? 'max-h-0' : 'max-h-[1000px] p-4 space-y-4'}`}>
                    {/* Upload Action */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-3 border-b border-slate-700/40">
                        <div className="flex items-center gap-3">
                            <label 
                                htmlFor="file-upload" 
                                className={`inline-flex justify-center items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl transition-all select-none shadow-md shadow-cyan-900/20 active:scale-95 ${
                                    isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                                }`}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                <span>{isUploading ? 'Procesando...' : 'Subir PDFs'}</span>
                            </label>
                            <input id="file-upload" type="file" multiple accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                        </div>

                        {/* Bulk Actions Toolbar */}
                        {documents.length > 0 && (
                            <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                                <label className={`flex items-center gap-2 text-slate-400 select-none transition-colors ${
                                    isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:text-slate-200'
                                }`}>
                                    <input 
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={el => {
                                            if (el) el.indeterminate = isSomeSelected;
                                        }}
                                        onChange={handleSelectAllDocs}
                                        disabled={isUploading}
                                        className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20 focus:ring-offset-slate-950 w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <span>Seleccionar todos</span>
                                </label>

                                {selectedDocIds.size > 0 && (
                                    <button
                                        onClick={() => !isUploading && setIsBulkDeleteConfirmOpen(true)}
                                        disabled={isUploading}
                                        className={`flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-bold transition-colors border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 active:scale-95 ${
                                            isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                                        }`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Eliminar ({selectedDocIds.size})</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Upload Progress */}
                    {uploadProgress && (
                        <div className="p-3 bg-slate-900/50 rounded-xl border border-cyan-500/30 space-y-2">
                            <div className="flex justify-between text-xs text-cyan-400 font-semibold">
                                <span>Procesando {uploadProgress.current} de {uploadProgress.total}</span>
                                <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="bg-cyan-500 h-full transition-all duration-300" 
                                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                ></div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] text-slate-500 truncate italic max-w-[70%]">Actual: {uploadProgress.fileName}</p>
                                <button 
                                    type="button"
                                    onClick={() => setIsConfirmCancelUploadOpen(true)}
                                    className="text-[9px] bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-md font-bold transition-all border border-slate-700"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Grid of Files */}
                    <div className="relative">
                        {isDeleting && (
                            <div className="absolute inset-0 bg-slate-900/80 rounded-xl flex flex-col items-center justify-center gap-3 z-30 backdrop-blur-[2px] min-h-[160px]">
                                <Spinner size="8" />
                                <p className="text-sm font-bold text-rose-400 animate-pulse">{deleteMessage}</p>
                            </div>
                        )}
                        {documents.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm italic">
                                No hay documentos cargados. Sube archivos PDF para comenzar.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 max-h-[450px] overflow-y-auto custom-scrollbar p-0.5">
                                {documents.map(d => {
                                    const doc = d as ExtendedDocument;
                                    const isSelected = selectedDocIds.has(doc.id);
                                    const docSizeStr = doc.fileSize ? (doc.fileSize / 1024 / 1024).toFixed(2) + ' MB' : '0 MB';
                                    const hasVersions = doc.versions && doc.versions.length > 0;
                                    return (
                                        <div 
                                            key={doc.id}
                                            onClick={() => !isUploading && toggleDocSelection(doc.id)}
                                            className={`group bg-slate-900/40 border rounded-xl p-3 flex flex-col items-center justify-between relative transition-all select-none min-h-[140px] h-auto py-3 animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-500 ease-out ${
                                                isUploading 
                                                    ? 'opacity-60 cursor-not-allowed border-slate-800' 
                                                    : isSelected 
                                                        ? 'border-cyan-500 ring-1 ring-cyan-500/30 shadow-lg shadow-cyan-900/10 cursor-pointer' 
                                                        : 'border-slate-700/50 hover:border-slate-600 hover:bg-slate-900/60 cursor-pointer'
                                            }`}
                                        >
                                            {/* Selection Checkbox */}
                                            <div 
                                                className={`absolute top-2 left-2 z-10 transition-opacity duration-150 ${
                                                    isSelected || selectedDocIds.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                }`}
                                            >
                                                <input 
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => !isUploading && toggleDocSelection(doc.id)}
                                                    disabled={isUploading}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20 focus:ring-offset-slate-950 w-3.5 h-3.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                            </div>

                                            {/* Version Badge */}
                                            {hasVersions && (
                                                <div className="absolute top-2 right-2 z-10">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedDocForHistory(doc);
                                                            setIsVersionModalOpen(true);
                                                        }}
                                                        className="text-[9px] font-extrabold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded-md transition-all flex items-center gap-0.5"
                                                        title="Historial de versiones"
                                                    >
                                                        v{doc.versions!.length + 1}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Central Icon */}
                                            <div className="flex-grow flex items-center justify-center pt-2">
                                                <FileText className={`h-8 w-8 transition-all duration-200 ${
                                                    isSelected ? 'text-cyan-400 scale-105' : 'text-slate-400 group-hover:text-cyan-400 group-hover:scale-105'
                                                }`} />
                                            </div>

                                            {/* Metadata */}
                                            <div className="w-full text-center mt-1.5 flex flex-col items-center">
                                                <p className="text-[10px] font-semibold text-slate-300 group-hover:text-white break-all break-words w-full px-1 leading-normal" title={doc.name}>
                                                    {doc.name}
                                                </p>
                                                
                                                <div className="flex items-center justify-center gap-1.5 mt-1">
                                                    {/* File Type Badge */}
                                                    {getFileTypeBadge(doc.name)}
                                                    {/* File Size */}
                                                    <span className="text-[8px] text-slate-500 font-mono">
                                                        {docSizeStr}
                                                    </span>
                                                </div>

                                                {/* User Metadata */}
                                                {doc.uploadedBy && (
                                                    <p className="text-[8px] text-slate-500 mt-1.5 select-none leading-none truncate w-full" title={`Subido por: ${doc.uploadedBy}${doc.uploadedAt ? ` el ${formatDate(doc.uploadedAt)}` : ''}`}>
                                                        Subido por: <span className="font-semibold text-slate-400">{doc.uploadedBy.split('@')[0]}</span>
                                                    </p>
                                                )}
                                                {doc.editedBy && (
                                                    <p className="text-[8px] text-slate-500 mt-1 select-none leading-none truncate w-full" title={`Editado por: ${doc.editedBy}${doc.editedAt ? ` el ${formatDate(doc.editedAt)}` : ''}`}>
                                                        Editado por: <span className="font-semibold text-slate-400">{doc.editedBy.split('@')[0]}</span>
                                                    </p>
                                                )}
                                            </div>

                                            {/* Hover Actions Menu */}
                                            {!isUploading && (
                                                <div className="absolute inset-0 bg-slate-950/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2.5 z-20">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDocToReplace(doc.id);
                                                            replaceInputRef.current?.click();
                                                        }}
                                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-cyan-400 text-slate-300 rounded-lg transition-all"
                                                        title="Subir nueva versión"
                                                    >
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedDocForHistory(doc);
                                                            setIsVersionModalOpen(true);
                                                        }}
                                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-cyan-400 text-slate-300 rounded-lg transition-all"
                                                        title="Ver historial de versiones"
                                                    >
                                                        <Clock className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveDocument(doc.id);
                                                        }}
                                                        className="p-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-500 text-slate-300 rounded-lg transition-all"
                                                        title="Eliminar documento"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {/* Hidden input for replacement */}
                        <input 
                            type="file" 
                            ref={replaceInputRef} 
                            className="hidden" 
                            accept=".pdf" 
                            onChange={handleReplaceDocument} 
                            disabled={isUploading}
                        />
                    </div>
                </div>
                {isUploading && !uploadProgress && (
                    <div className="flex justify-center p-4 border-t border-slate-700/30 bg-slate-900/10">
                        <Spinner />
                    </div>
                )}
            </div>
        );
    };

    const renderLocation = () => {
        const municipalities = state ? mexicoData[state] || [] : [];

        return (
            <div className="bg-slate-800/80 border border-slate-700/50 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                <div>
                    <h3 className="font-bold text-base text-slate-100">Ubicación del Proyecto</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Define el estado y municipio para cruzar con la normativa local.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0 w-full md:w-auto md:min-w-[400px]">
                    <div className="relative group">
                        <select 
                            value={state} 
                            disabled={isLoading || isUploading}
                            onChange={e => {
                                const newState = e.target.value;
                                setState(newState);
                                setCity('');
                                onUpdateProject({ location: { city: '', state: newState } });
                            }} 
                            className="w-full bg-slate-700 text-white rounded-xl pl-3 pr-10 py-2 text-xs focus:ring-2 focus:ring-cyan-500 appearance-none cursor-pointer disabled:opacity-50"
                        >
                            <option value="" disabled>Selecciona Estado</option>
                            {Object.keys(mexicoData).sort().map(stateName => (
                                <option key={stateName} value={stateName}>{stateName}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative group">
                        <select 
                            value={city} 
                            disabled={!state || isLoading || isUploading}
                            onChange={e => {
                                const newCity = e.target.value;
                                setCity(newCity);
                                onUpdateProject({ location: { city: newCity, state } });
                            }} 
                            className="w-full bg-slate-700 text-white rounded-xl pl-3 pr-10 py-2 text-xs focus:ring-2 focus:ring-cyan-500 appearance-none cursor-pointer disabled:opacity-50"
                        >
                            <option value="" disabled>{!state ? 'Elige un estado' : 'Selecciona Municipio'}</option>
                            {municipalities.map((m, idx) => (
                                <option key={idx} value={m}>{m}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>
        );
    };
    
    const renderAnalysisControls = () => (
        <div className="bg-slate-800 p-4 rounded-lg flex flex-col sm:flex-row gap-4 justify-between items-center z-10">
             <button onClick={handleAnalyze} disabled={isLoading || isUploading || !Array.isArray(project.documents) || project.documents.length === 0} className="w-full sm:w-auto flex justify-center items-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-slate-500 transition-colors">
                {isLoading ? <><Spinner size="5" /><span className="ml-2">Analizando...</span></> : <><Zap className="h-5 w-5 mr-2" /><span>Analizar Documentos</span></>}
            </button>
            {activeAnalysis && (
                <div className="flex gap-2">
                    <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center text-sm bg-slate-700 hover:bg-slate-600 py-2 px-3 rounded-md transition-colors">
                        <History className="h-4 w-4 mr-2" /> Historial ({project.analysisHistory.length})
                    </button>
                    <button onClick={downloadAnalysis} className="flex items-center text-sm bg-slate-700 hover:bg-slate-600 py-2 px-3 rounded-md transition-colors">
                        <Download className="h-4 w-4 mr-2" /> Descargar
                    </button>
                </div>
            )}
        </div>
    );

    const renderDatosClave = (datos: AnalysisRecord['datosClave']) => {
        const keyMap: { [key: string]: string } = {
            nombreProyecto: "Nombres de Proyecto",
            direccion: "Direcciones",
            representantes: "Representantes",
            superficies: "Superficies",
            firmantes: "Firmantes"
        };

        return (
            <div className="bg-slate-800 p-4 rounded-lg overflow-hidden">
                <h3 className="font-semibold text-lg mb-3">Datos Clave Extraídos (Referencias)</h3>
                <div className="overflow-auto max-h-[500px] border border-slate-700 rounded-md p-4 custom-scrollbar bg-slate-900/20">
                    <div className="space-y-6">
                        {Object.entries(datos).map(([key, values]) => (
                            values.length > 0 && (
                                <div key={key}>
                                    <h4 className="font-semibold text-cyan-400 mb-2 uppercase text-xs tracking-wider">{keyMap[key]}</h4>
                                    <ul className="space-y-2 list-none text-sm">
                                        {values.map((dato: DatoClave, index: number) => {
                                            const refId = `${key}-${dato.archivo}-${dato.pagina}`;
                                            const isHighlighted = refId === highlightedRefId;
                                            return (
                                                <li
                                                    key={index}
                                                    id={refId}
                                                    ref={isHighlighted ? highlightedRef : null}
                                                    className={`p-3 rounded-md transition-all border border-slate-700/50 hover:border-cyan-500/30 bg-slate-800/50 ${isHighlighted ? 'bg-cyan-900 border-cyan-500 ring-2 ring-cyan-500/20' : ''}`}
                                                >
                                                    <div className="flex justify-between items-start gap-4">
                                                        <span className="font-medium text-slate-200">{dato.valor}</span>
                                                        <span className="text-[10px] text-slate-500 shrink-0 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-700">
                                                            {dato.archivo}, pág. {dato.pagina}
                                                        </span>
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </div>
        );
    };
    
    const ComparativeTable = ({ data }: { data: DatosClavePorDocumento[] }) => {
        if (!data || data.length === 0) return null;
        const headers: { key: keyof DatosClavePorDocumento['datos'], label: string }[] = [
            { key: "nombreProyecto", label: "Nombre Proyecto" },
            { key: "direccion", label: "Dirección" },
            { key: "representantes", label: "Representantes" },
            { key: "superficies", label: "Superficies" },
            { key: "firmantes", label: "Firmantes" }
        ];

        // Calculate majority value for each column
        const majorityValues = headers.reduce((acc, h) => {
            const values = data.map(d => d.datos[h.key]).filter(d => d !== undefined && d !== null && d !== '');
            if (values.length === 0) {
                acc[h.key] = null; // No data for this key
                return acc;
            }

            const counts = values.reduce((valCounts, val) => {
                valCounts[val!] = (valCounts[val!] || 0) + 1;
                return valCounts;
            }, {} as Record<string, number>);

            const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);

            // Check for a clear majority (no tie for first place) or if all values are the same
            if (sortedCounts.length > 1 && sortedCounts[0][1] === sortedCounts[1][1]) {
                acc[h.key] = undefined; // Represents a tie / no clear majority
            } else {
                acc[h.key] = sortedCounts[0][0]; // The most frequent value is the majority
            }
            return acc;
        }, {} as Record<string, string | null | undefined>);


        const handleCellClick = (key: keyof DatosClavePorDocumento['datos'], doc: DatosClavePorDocumento) => {
            if (!activeAnalysis) return;
            
            const mainDato = (activeAnalysis.datosClave[key] as DatoClave[]).find(d => 
                d.archivo === doc.nombreDocumento && d.valor === doc.datos[key]
            );

            if (mainDato) {
                const refId = `${key}-${mainDato.archivo}-${mainDato.pagina}`;
                setHighlightedRefId(current => current === refId ? null : refId);
            }
        };

        return (
            <div className="bg-slate-800 p-4 rounded-lg overflow-hidden">
                <h3 className="font-semibold text-lg mb-3">Tabla Comparativa</h3>
                <div className="overflow-auto max-h-[600px] border border-slate-700 rounded-md custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-700 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 bg-slate-700 border-b border-slate-600">Documento</th>
                                {headers.map(h => <th key={h.key} className="px-4 py-3 bg-slate-700 border-b border-slate-600 min-w-[200px]">{h.label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((doc, index) => (
                                <tr key={doc.id || `${doc.nombreDocumento}-${index}`} className="border-b border-slate-700">
                                    <td className="px-4 py-2 font-medium truncate max-w-xs">{doc.nombreDocumento}</td>
                                    {headers.map(h => {
                                        const value = doc.datos[h.key];
                                        const majorityValue = majorityValues[h.key];
                                        let cellClassName = 'px-4 py-2';
                                        let isMismatch = false;

                                        if (value) {
                                            if (majorityValue === undefined) { // Tie or no clear majority
                                                cellClassName += ' bg-red-900/50';
                                                isMismatch = true;
                                            } else if (majorityValue !== null) { // A majority value exists
                                                if (value === majorityValue) {
                                                    cellClassName += ' bg-green-900/60';
                                                } else {
                                                    cellClassName += ' bg-red-900/50';
                                                    isMismatch = true;
                                                }
                                            }
                                        }
                                        
                                        if(isMismatch){
                                          cellClassName += ' cursor-pointer hover:bg-red-800/50';
                                        }

                                        const displayValue = value || <span className="text-slate-500 italic">N/A</span>;
                                        return (
                                            <td key={h.key}
                                                className={cellClassName}
                                                onClick={() => isMismatch && handleCellClick(h.key, doc)}>
                                                {displayValue}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-900/60"></span><span>Dato mayoritario</span></div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-900/50"></span><span>Inconsistencia</span></div>
                </div>
            </div>
        );
    };
    
    const renderAuditChecklist = () => {
        if (!activeAnalysis?.documentosFaltantes) return null;

        const pilares = Array.from(new Set(activeAnalysis.documentosFaltantes.map(d => d.pilar)));

        return (
            <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <FileSearch className="h-5 w-5 text-cyan-400" />
                    Checklist de Auditoría (5 Pilares)
                </h3>
                <div className="space-y-6">
                    {pilares.map(pilar => (
                        <div key={pilar} className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{pilar}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {activeAnalysis.documentosFaltantes
                                    ?.filter(d => d.pilar === pilar)
                                    .map((doc, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-md border border-slate-700/50">
                                            <span className="text-sm text-slate-200">{doc.documento}</span>
                                            <div className="flex items-center gap-2">
                                                {doc.estado === 'presente' && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30">Presente</span>}
                                                {doc.estado === 'faltante' && <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30">Faltante</span>}
                                                {doc.estado === 'parcial' && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30">Parcial</span>}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderAuditMatrix = () => {
        if (!activeAnalysis?.auditoriaCumplimiento) return null;

        // Group by category
        const groupedAudit = activeAnalysis.auditoriaCumplimiento.reduce((acc, item) => {
            if (!acc[item.categoria]) {
                acc[item.categoria] = [];
            }
            acc[item.categoria].push(item);
            return acc;
        }, {} as Record<string, typeof activeAnalysis.auditoriaCumplimiento>);

        return (
            <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-cyan-400" />
                    Matriz de Auditoría Detallada
                </h3>
                <div className="space-y-6">
                    {Object.entries(groupedAudit).map(([categoria, items], idx) => (
                        <div key={idx} className="space-y-3">
                            <h4 className="text-md font-bold text-slate-300 border-b border-slate-700 pb-2">{categoria}</h4>
                            <div className="grid grid-cols-1 gap-3">
                                {items.map((item, i) => (
                                    <div key={i} className={`p-4 rounded-xl border ${
                                        item.estado === 'cumple' ? 'bg-green-950/20 border-green-500/30' : 
                                        item.estado === 'no_cumple' ? 'bg-red-950/20 border-red-500/30' : 
                                        'bg-slate-900/60 border-slate-700/60 shadow-inner'
                                    }`}>
                                        <div className="flex items-start justify-between mb-2 gap-4">
                                            <span className="font-semibold text-sm text-slate-200">{item.subcategoria}</span>
                                            <div className="flex-shrink-0">
                                                 {item.estado === 'cumple' && <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full border border-emerald-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30 flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Cumple</span>}
                                                 {item.estado === 'no_cumple' && <span className="text-xs bg-rose-100 text-rose-800 px-2 py-1 rounded-full border border-rose-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30 flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> No Cumple</span>}
                                                 {item.estado === 'no_aplica' && <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full border border-slate-300 dark:bg-slate-600/50 dark:text-slate-300 dark:border-slate-500/50">N/A</span>}
                                             </div>
                                        </div>
                                        <p className="text-xs text-slate-200 leading-relaxed font-medium">{item.detalle}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderCuadroAreas = () => {
        if (!activeAnalysis?.cuadroAreas) return null;

        const fields = [
            { label: "Superficie total del predio", value: activeAnalysis.cuadroAreas.superficieTotalPredio },
            { label: "Superficie Arrendada y/o utilizar", value: activeAnalysis.cuadroAreas.superficieArrendada },
            { label: "Construcción por nivel/uso", value: activeAnalysis.cuadroAreas.desgloseConstruccionNivel },
            { label: "COS", value: activeAnalysis.cuadroAreas.cos },
            { label: "CUS", value: activeAnalysis.cuadroAreas.cus },
            { label: "Superficie de desplante", value: activeAnalysis.cuadroAreas.superficieDesplante },
            { label: "Área libre", value: activeAnalysis.cuadroAreas.areaLibre },
            { label: "Área verde Jardinada", value: activeAnalysis.cuadroAreas.areaVerde },
            { label: "Estacionamiento (Cajones/Norma)", value: activeAnalysis.cuadroAreas.estacionamientoCajonesNorma },
            { label: "Carga y Descarga", value: activeAnalysis.cuadroAreas.areaCargaDescarga },
            { label: "Altura Tienda", value: activeAnalysis.cuadroAreas.alturaTienda },
            { label: "Altura Anuncio", value: activeAnalysis.cuadroAreas.alturaAnuncio },
            { label: "Datos DRO", value: activeAnalysis.cuadroAreas.datosDRO },
            { label: "¿Pie de plano especial?", value: activeAnalysis.cuadroAreas.requierePiePlanoEspecial },
            { label: "¿Consultor especial?", value: activeAnalysis.cuadroAreas.requiereConsultorEspecial },
        ];

        return (
            <div className="bg-slate-800 p-4 rounded-lg border border-cyan-500/20">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-cyan-400">
                    <Building2 className="h-5 w-5" />
                    Cuadro de Áreas e Información del Proyecto
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 font-semibold border-b border-slate-700">Concepto</th>
                                <th className="px-4 py-3 font-semibold border-b border-slate-700">Información Extraída</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {fields.map((f, i) => (
                                <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="px-4 py-3 text-slate-400 font-medium bg-slate-900/20">{f.label}</td>
                                    <td className="px-4 py-3 text-slate-200">{f.value || <span className="text-slate-500 italic">No detectado</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderChecklistPlanosBasicos = () => {
        if (!activeAnalysis?.checklistPlanosBasicos || activeAnalysis.checklistPlanosBasicos.length === 0) return null;

        // Group by category
        const groupedChecklist = activeAnalysis.checklistPlanosBasicos.reduce((acc, item) => {
            const cat = item.categoria || 'General';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {} as Record<string, typeof activeAnalysis.checklistPlanosBasicos>);

        return (
            <div className="bg-slate-800 p-4 rounded-lg border border-cyan-500/20">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-cyan-400">
                    <FileText className="h-5 w-5" />
                    Checklist de Planos Básicos, Especialidades y Firmas
                </h3>
                
                <div className="space-y-6">
                    {Object.entries(groupedChecklist).map(([categoria, items], idx) => (
                        <div key={idx} className="space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-700/50 pb-1">{categoria}</h4>
                            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-900/30 text-slate-500 text-[9px] uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-2 font-semibold border-b border-slate-700">Cód/Plano</th>
                                            <th className="px-4 py-2 font-semibold border-b border-slate-700 w-24">Estado</th>
                                            <th className="px-4 py-2 font-semibold border-b border-slate-700 text-center w-20">Firmas</th>
                                            <th className="px-4 py-2 font-semibold border-b border-slate-700">Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {items.map((p, i) => (
                                            <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                                                <td className="px-4 py-2">
                                                    <div className="font-bold text-slate-400 text-[10px] leading-tight">{p.codigo}</div>
                                                    <div className="text-slate-200 text-[11px] leading-tight">{p.nombre}</div>
                                                </td>
                                                <td className="px-4 py-2">
                                                     {p.estado === 'presente' && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">OK</span>}
                                                     {p.estado === 'faltante' && <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded border border-rose-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">FALTA</span>}
                                                     {p.estado === 'parcial' && <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20">PARCIAL</span>}
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    {p.tieneFirmas ? (
                                                        <span className="text-emerald-700 dark:text-green-500 inline-block"><CheckCircle2 className="h-3 w-3" /></span>
                                                    ) : (
                                                        <span className="text-rose-700 dark:text-red-500 inline-block"><X className="h-3 w-3" /></span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-[10px] text-slate-200 font-medium italic">
                                                    {p.comentarioTecnico}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderVerificacionCalculos = () => {
        if (!activeAnalysis?.verificacionCalculos || activeAnalysis.verificacionCalculos.length === 0) return null;

        return (
            <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-cyan-400" />
                    Verificación de Cálculos y Operaciones
                </h3>
                <div className="space-y-3">
                    {activeAnalysis.verificacionCalculos.map((calc, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${
                            calc.estado === 'correcto' ? 'bg-green-950/20 border-green-500/30' : 
                            calc.estado === 'error' ? 'bg-red-950/20 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : 
                            'bg-amber-950/20 border-amber-500/30'
                        }`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${
                                    calc.estado === 'correcto' ? 'bg-green-500' : 
                                    calc.estado === 'error' ? 'bg-red-500' : 
                                    'bg-amber-500'
                                }`}></span>
                                <span className="text-sm font-semibold text-slate-200">{calc.descripcion}</span>
                            </div>
                            <p className="text-xs text-slate-200 ml-4 font-medium">{calc.detalles}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderAuditoriaTecnicaProfunda = () => {
        if (!activeAnalysis?.auditoriaTecnicaProfunda || activeAnalysis.auditoriaTecnicaProfunda.length === 0) return null;

        const getIcon = (disciplina: string) => {
            switch (disciplina) {
                case 'Geotecnia': return <MapPin className="h-5 w-5 text-amber-500" />;
                case 'Estructural': return <Building2 className="h-5 w-5 text-slate-400" />;
                case 'Hidrosanitaria': return <Droplets className="h-5 w-5 text-blue-400" />;
                case 'Pluvial': return <CloudRain className="h-5 w-5 text-cyan-400" />;
                case 'Contra Incendio': return <Flame className="h-5 w-5 text-red-500" />;
                case 'Eléctrica': return <Zap className="h-5 w-5 text-yellow-400" />;
                case 'Gas': return <Flame className="h-5 w-5 text-orange-400" />;
                default: return <HardHat className="h-5 w-5 text-cyan-400" />;
            }
        };

        return (
            <div className="bg-slate-800 p-4 rounded-lg border-2 border-slate-700">
                <h3 className="font-semibold text-xl mb-2 flex items-center gap-2 text-slate-200">
                    <HardHat className="h-6 w-6 text-cyan-400" />
                    Auditoría Técnica Profunda de Ingenierías
                </h3>
                <p className="text-xs text-slate-400 mb-6">Revisión de cálculos y memorias para prevención de riesgos operativos y de vida (Life-Safety).</p>
                
                <div className="grid grid-cols-1 gap-4">
                    {activeAnalysis.auditoriaTecnicaProfunda.map((item, i) => (
                        <div key={i} className={`p-4 rounded-lg border ${
                            item.estado === 'correcto' ? 'bg-green-900/10 border-green-500/20' : 
                            item.estado === 'error_critico' ? 'bg-red-900/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 
                            item.estado === 'observacion_menor' ? 'bg-yellow-900/10 border-yellow-500/30' :
                            'bg-slate-800 border-slate-700'
                        }`}>
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-900 rounded-md shrink-0">
                                        {getIcon(item.disciplina)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{item.disciplina}</span>
                                            {item.estado === 'error_critico' && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">RIESGO CRÍTICO</span>}
                                        </div>
                                        <h4 className="font-semibold text-slate-200 text-base">{item.elementoRevisado}</h4>
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    {item.estado === 'correcto' && <span className="text-emerald-700 dark:text-green-400 text-sm font-medium flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Correcto</span>}
                                    {item.estado === 'error_critico' && <span className="text-rose-700 dark:text-red-400 text-sm font-bold flex items-center"><AlertTriangle className="w-4 h-4 mr-1"/> Error Crítico</span>}
                                    {item.estado === 'observacion_menor' && <span className="text-amber-700 dark:text-amber-400 text-sm font-medium flex items-center"><AlertTriangle className="w-4 h-4 mr-1"/> Observación</span>}
                                    {item.estado === 'no_evaluable' && <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">No Evaluable</span>}
                                </div>
                            </div>
                            
                            <div className="space-y-3 mt-4 text-sm">
                                <div>
                                    <span className="text-slate-300 text-xs font-bold uppercase block mb-1">Hallazgo Técnico:</span>
                                    <p className="text-slate-100 bg-slate-900 p-3 rounded-md border border-slate-700">{item.hallazgo}</p>
                                </div>
                                
                                {item.riesgoOperativo && item.estado !== 'correcto' && item.estado !== 'no_evaluable' && (
                                    <div>
                                        <span className="text-red-300 text-xs font-bold uppercase block mb-1">Riesgo Operativo / Life-Safety:</span>
                                        <p className="text-rose-50 font-semibold bg-red-950/70 p-3 rounded-md border border-red-500/40">{item.riesgoOperativo}</p>
                                    </div>
                                )}
                                
                                {item.recomendacion && item.estado !== 'correcto' && (
                                    <div>
                                        <span className="text-cyan-300 text-xs font-bold uppercase block mb-1">Recomendación del Perito:</span>
                                        <p className="text-cyan-50 font-semibold bg-cyan-950/70 p-3 rounded-md border border-cyan-500/40">{item.recomendacion}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderFichaMaestra = () => {
        if (!activeAnalysis?.fichaMaestra || activeAnalysis.fichaMaestra.length === 0) return null;

        return (
            <div className="bg-slate-800 p-4 rounded-lg border border-cyan-500/30">
                <h3 className="font-semibold text-xl mb-6 flex items-center gap-2 text-cyan-400">
                    <ClipboardList className="h-6 w-6" />
                    Ficha Maestra de Cumplimiento Normativo
                </h3>
                <div className="space-y-8">
                    {activeAnalysis.fichaMaestra.map((categoria, catIndex) => (
                        <div key={catIndex} className="space-y-4">
                            <h4 className="text-lg font-bold text-slate-200 border-b border-slate-700 pb-2">
                                {categoria.categoria}
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                {categoria.puntos.map((punto, puntoIndex) => (
                                    <div key={puntoIndex} className={`p-4 rounded-lg border ${
                                        punto.estado === 'cumple' ? 'bg-green-500/5 border-green-500/30' :
                                        punto.estado === 'no_cumple' ? 'bg-red-500/5 border-red-500/30' :
                                        punto.estado === 'parcial' ? 'bg-yellow-500/5 border-yellow-500/30' :
                                        'bg-slate-700/50 border-slate-600'
                                    }`}>
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                                            <div className="flex-1">
                                                <h5 className="font-bold text-slate-200 text-base">{punto.nombre}</h5>
                                                <p className="text-xs text-cyan-400 mt-1 font-mono">{punto.normaReferencia}</p>
                                            </div>
                                            <div className="shrink-0">
                                                {punto.estado === 'cumple' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1"/> Cumple</span>}
                                                {punto.estado === 'no_cumple' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30"><AlertTriangle className="w-3 h-3 mr-1"/> No Cumple</span>}
                                                {punto.estado === 'parcial' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1"/> Parcial</span>}
                                                {punto.estado === 'no_aplica' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30">N/A</span>}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 text-sm">
                                            <div className="bg-slate-900 p-3 rounded-md border border-slate-700/30">
                                                <span className="text-slate-300 block text-xs mb-1 uppercase tracking-wider font-bold">Hallazgo en Documentos:</span>
                                                <p className="text-slate-100">{punto.hallazgo}</p>
                                            </div>
                                            
                                            {(punto.estado === 'no_cumple' || punto.estado === 'parcial') && (
                                                <div className="bg-amber-950/70 p-3 rounded-md border border-amber-500/40">
                                                    <span className="text-amber-300 block text-xs mb-1 uppercase tracking-wider font-bold">Acción Requerida:</span>
                                                    <p className="text-amber-50 font-semibold">{punto.recomendacionArea}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderKnowledgeBase = () => {
        if (!activeAnalysis?.normativaReport) return null;

        return (
            <div className="bg-slate-800 p-4 rounded-lg border border-cyan-500/20">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-cyan-400">
                    <ClipboardList className="h-5 w-5" />
                    Base de Datos de Conocimiento Normativo
                </h3>
                <div className="prose prose-invert prose-sm max-w-none bg-slate-900/50 p-4 rounded-md overflow-y-auto max-h-[400px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeAnalysis.normativaReport}</ReactMarkdown>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 italic">
                    Esta información fue indexada específicamente para {city}, {state} y utilizada como base para la auditoría de cumplimiento.
                </p>
            </div>
        );
    };
    
    const renderAnalysis = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-800 rounded-lg border border-slate-700">
                    <Spinner size="12" />
                    <div className="mt-6 w-full max-w-md">
                        <div className="flex justify-between text-sm text-cyan-400 mb-2 font-medium">
                            <span>{analysisStage?.stage || 'Analizando...'}</span>
                            <span>{analysisStage?.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden shadow-inner">
                            <div 
                                className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full transition-all duration-700 ease-out" 
                                style={{ width: `${analysisStage?.progress || 0}%` }}
                            ></div>
                        </div>
                        {analysisStage?.estimatedSeconds !== undefined && analysisStage.estimatedSeconds > 0 && (
                            <p className="text-center text-[10px] text-cyan-500/70 mt-2 animate-pulse">
                                Tiempo estimado restante: ~{Math.ceil(analysisStage.estimatedSeconds / 60)} min {analysisStage.estimatedSeconds % 60} seg
                            </p>
                        )}
                        <p className="mt-4 text-xs text-slate-500 text-center leading-relaxed">
                            Estamos procesando {Array.isArray(project.documents) ? project.documents.length : 0} documentos. <br />
                            Esto incluye OCR de alta resolución, auditoría de pilares y verificación de cálculos.
                        </p>
                        <div className="mt-6 flex justify-center">
                            <button 
                                onClick={() => setIsConfirmCancelAnalysisOpen(true)}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-rose-400 hover:text-rose-300 text-xs font-bold rounded-xl transition-all active:scale-95 border border-slate-700 shadow-md animate-bounce"
                            >
                                Cancelar Análisis
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        if (!activeAnalysis) {
            return <div className="text-center p-8 bg-slate-800 rounded-lg text-slate-400">Completa los pasos 1 y 2, y luego haz clic en "Analizar Documentos" para ver los resultados.</div>;
        }
        
        // Ensure every uploaded document has a row in the comparative table
        const completeComparativeData = (Array.isArray(project.documents) ? project.documents : []).map(doc => {
            const analysisData = activeAnalysis.datosClavePorDocumento.find(
                d => d.nombreDocumento === doc.name
            );
            return {
                id: doc.id,
                nombreDocumento: doc.name,
                datos: analysisData?.datos || {
                    nombreProyecto: undefined,
                    direccion: undefined,
                    representantes: undefined,
                    superficies: undefined,
                    firmantes: undefined,
                }
            };
        });

        return (
            <div className="space-y-6">
                <div className="bg-slate-800 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Resumen General</h3>
                    <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeAnalysis.resumenGeneral}</ReactMarkdown>
                    </div>
                </div>
                {renderKnowledgeBase()}
                {renderCuadroAreas()}
                {renderChecklistPlanosBasicos()}
                {renderAuditoriaTecnicaProfunda()}
                {renderFichaMaestra()}
                {renderAuditChecklist()}
                {renderAuditMatrix()}
                {renderVerificacionCalculos()}
                {activeAnalysis.inconsistencias.length > 0 && (
                    <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-red-500">
                        <h3 className="font-semibold text-lg text-red-400 mb-2">Inconsistencias Detectadas</h3>
                        <ul className="list-disc list-inside space-y-1 prose prose-invert prose-sm max-w-none">
                            {activeAnalysis.inconsistencias.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </div>
                )}
                <ComparativeTable data={completeComparativeData} />
                {renderDatosClave(activeAnalysis.datosClave)}

                <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-cyan-500">
                    <h3 className="font-semibold text-lg mb-2 flex items-center">
                        <MapPin className="h-5 w-5 mr-2" /> Verificación de Dirección
                    </h3>
                    {activeAnalysis.datosClave.direccion.length > 0 ? (
                        <>
                        <p className="text-slate-300 mb-3">Dirección principal encontrada: <strong>{activeAnalysis.datosClave.direccion[0].valor}</strong></p>
                        <button onClick={handleVerifyAddress} disabled={isVerifyingAddress} className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-2 px-3 rounded-md text-sm disabled:bg-slate-500 transition-colors">
                            {isVerifyingAddress ? <Spinner size="4"/> : "Verificar con Google Maps"}
                        </button>
                        {addressInfo && (
                            <div className="mt-3 p-3 bg-slate-700 rounded-lg">
                                <p className="prose prose-invert prose-sm flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-400" /> {addressInfo.text}
                                </p>
                                {addressInfo.sources?.[0]?.maps?.uri && (
                                    <a href={addressInfo.sources[0].maps.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline text-sm mt-1 block">
                                        Abrir en Google Maps
                                    </a>
                                )}
                            </div>
                        )}
                        </>
                    ) : <p className="text-slate-400 italic">No se encontró una dirección en los documentos.</p>}
                </div>

                <div className="bg-slate-800 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Comparación con Normativa Local</h3>
                    <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeAnalysis.comparacionNormativa}</ReactMarkdown>
                    </div>
                    {activeAnalysis.normativaSources && activeAnalysis.normativaSources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-700">
                            <h4 className="font-semibold text-slate-300 mb-2">Fuentes de Normativa:</h4>
                            <ul className="list-disc list-inside text-sm space-y-1">
                                {activeAnalysis.normativaSources.map((source, index) => (
                                    source.web ? (
                                        <li key={index}>
                                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{source.web.title || source.web.uri}</a>
                                        </li>
                                    ) : null
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-emerald-500">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-emerald-400" />
                        Conclusiones de Viabilidad
                    </h3>
                    <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeAnalysis.conclusionesViabilidad}</ReactMarkdown>
                    </div>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-amber-500">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-amber-400" />
                        Guía de Acción y Recomendaciones
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
                        {activeAnalysis.guiaAccion?.map((item, i) => (
                            <li key={i} className="leading-relaxed">{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="flex justify-center mt-8">
                    <button
                        onClick={() => generateDocxReport(project, activeAnalysis)}
                        className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105"
                    >
                        <Download className="w-5 h-5" />
                        Descargar Reporte Ejecutivo (.docx)
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-950">
            {/* Header Section */}
            <div className="p-4 lg:p-6 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2.5 text-slate-400 hover:text-white bg-slate-800/50 rounded-xl transition-all border border-slate-700/50">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl lg:text-2xl font-bold text-white truncate max-w-[200px] lg:max-w-md">{project.name}</h2>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">
                                {project.userId === user?.uid ? 'Propietario: Yo' : `Propietario: ${project.userId?.substring(0,8)}...`}
                            </p>
                        </div>
                        
                        <div className="hidden sm:flex items-center gap-2 ml-4">
                            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-700/50">
                                <button 
                                    onClick={() => !isUploading && onUpdateProject({ visibility: 'private' })}
                                    disabled={isUploading}
                                    className={`p-2 rounded-lg transition-all ${project.visibility === 'private' ? 'bg-slate-700 text-cyan-400' : 'text-slate-500 hover:text-slate-300'} ${isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                    title="Privado"
                                >
                                    <Lock className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => !isUploading && onUpdateProject({ visibility: 'public' })}
                                    disabled={isUploading}
                                    className={`p-2 rounded-lg transition-all ${project.visibility === 'public' ? 'bg-slate-700 text-emerald-400' : 'text-slate-500 hover:text-slate-300'} ${isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                    title="Público"
                                >
                                    <Globe className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => {
                                        if (isUploading) return;
                                        onUpdateProject({ visibility: 'shared' });
                                        setIsAccessModalOpen(true);
                                    }}
                                    disabled={isUploading}
                                    className={`p-2 rounded-lg transition-all ${project.visibility === 'shared' ? 'bg-slate-700 text-amber-400' : 'text-slate-500 hover:text-slate-300'} ${isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                    title="Compartido"
                                >
                                    <Users className="h-4 w-4" />
                                </button>
                            </div>
                            
                            {project.visibility === 'shared' && (
                                <button 
                                    onClick={() => !isUploading && setIsAccessModalOpen(true)}
                                    disabled={isUploading}
                                    className={`flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase px-3 py-2 rounded-xl border border-amber-500/20 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                >
                                    <Share2 className="h-3.5 w-3.5" />
                                    <span>Gestionar Acceso ({project.allowedUsers?.length || 0})</span>
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700/50 shadow-inner">
                        <button 
                            onClick={() => setActiveTab('analysis')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'analysis' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Análisis Técnico
                        </button>
                        <button 
                            onClick={() => setActiveTab('chat')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'chat' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Asistente IA
                        </button>
                        <button 
                            onClick={() => setActiveTab('comparison')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'comparison' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Historial
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
                            <AlertTriangle className="h-6 w-6 shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}
                    
                    {/* Tab Content */}
                    <div className={activeTab === 'analysis' ? '' : 'hidden'}>
                        <div className="space-y-6">
                            {/* Ubicación del Proyecto arriba (ancho completo y sin número de paso) */}
                            {renderLocation()}
                            
                            {/* Carga de Documentos abajo (ancho completo y sin número de paso) */}
                            {renderFileUpload()}
                            
                            {/* Controles y Resultados de Análisis abajo a ancho completo */}
                            <div className="space-y-6">
                                {renderAnalysisControls()}
                                {renderAnalysis()}
                            </div>
                        </div>
                    </div>

                    <div className={activeTab === 'chat' ? '' : 'hidden'}>
                        <div className="bg-slate-800/40 backdrop-blur-sm rounded-3xl border border-slate-700/50 h-[75vh] overflow-hidden shadow-2xl">
                            <ChatView project={project} onUpdateProject={onUpdateProject} activeAnalysis={activeAnalysis} />
                        </div>
                    </div>

                    <div className={activeTab === 'comparison' ? '' : 'hidden'}>
                        <ReportComparisonView analysisHistory={project.analysisHistory} />
                    </div>
                </div>
            </div>

            <HistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                onSelect={(recordId) => {
                    setActiveAnalysisId(recordId);
                    setIsHistoryModalOpen(false);
                }}
                analysisHistory={project.analysisHistory}
                activeAnalysisId={activeAnalysisId}
            />
            <VersionHistoryModal
                isOpen={isVersionModalOpen}
                onClose={() => setIsVersionModalOpen(false)}
                document={selectedDocForHistory}
            />
            <AccessManagementModal 
                isOpen={isAccessModalOpen}
                onClose={() => setIsAccessModalOpen(false)}
                allowedUsers={project.allowedUsers || []}
                onAddUser={handleAddUser}
                onRemoveUser={handleRemoveUser}
            />
            <ConfirmModal 
                isOpen={docToDelete !== null}
                title="Eliminar Documento"
                message="¿Estás seguro de que deseas eliminar este documento y todo su historial de versiones? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={async () => {
                    if (docToDelete) {
                        const targetId = docToDelete;
                        setDocToDelete(null);
                        setIsDeleting(true);
                        setDeleteMessage("Eliminando documento...");
                        try {
                            const updatedDocs = (Array.isArray(project.documents) ? project.documents : []).filter(doc => doc.id !== targetId);
                            await onUpdateProject({ documents: updatedDocs });
                            
                            // Clean up selection if this doc was selected
                            setSelectedDocIds(prev => {
                                if (prev.has(targetId)) {
                                    const next = new Set(prev);
                                    next.delete(targetId);
                                    return next;
                                }
                                return prev;
                            });
                        } catch (err: unknown) {
                            const message = err instanceof Error ? err.message : String(err);
                            setError(`Error al eliminar el documento: ${message}`);
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }}
                onCancel={() => setDocToDelete(null)}
            />
            <ConfirmModal 
                isOpen={isBulkDeleteConfirmOpen}
                title="Eliminar Documentos Seleccionados"
                message={`¿Estás seguro de que deseas eliminar los ${selectedDocIds.size} documentos seleccionados y todo su historial de versiones? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={handleBulkDeleteConfirm}
                onCancel={() => setIsBulkDeleteConfirmOpen(false)}
            />
            <ConfirmModal 
                isOpen={isConfirmCancelUploadOpen}
                title="Cancelar Carga de Documentos"
                message="¿Estás seguro de que deseas cancelar la carga de documentos? Los archivos que ya se hayan subido se conservarán en el proyecto."
                confirmLabel="Cancelar Carga"
                cancelLabel="Continuar Carga"
                onConfirm={() => {
                    cancelUploadRef.current = true;
                    setIsUploading(false);
                    setUploadProgress(null);
                    setIsConfirmCancelUploadOpen(false);
                }}
                onCancel={() => setIsConfirmCancelUploadOpen(false)}
            />
            <ConfirmModal 
                isOpen={isConfirmCancelAnalysisOpen}
                title="Cancelar Análisis"
                message="¿Estás seguro de que deseas cancelar el análisis actual de los documentos?"
                confirmLabel="Cancelar Análisis"
                cancelLabel="Continuar Análisis"
                onConfirm={() => {
                    cancelAnalysisRef.current = true;
                    setIsLoading(false);
                    setAnalysisStage(null);
                    setIsConfirmCancelAnalysisOpen(false);
                }}
                onCancel={() => setIsConfirmCancelAnalysisOpen(false)}
            />
        </div>
    );
};

export default ProjectView;