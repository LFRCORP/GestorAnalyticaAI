import React, { useState, useMemo } from 'react';
import { 
    ArrowRight, 
    TrendingUp, 
    PlusCircle, 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    FileText,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { AnalysisRecord } from '../types';

interface ReportComparisonViewProps {
    analysisHistory: AnalysisRecord[];
}

const ReportComparisonView: React.FC<ReportComparisonViewProps> = ({ analysisHistory }) => {
    const [report1Id, setReport1Id] = useState<string>(analysisHistory.length > 1 ? analysisHistory[analysisHistory.length - 2].id : '');
    const [report2Id, setReport2Id] = useState<string>(analysisHistory.length > 0 ? analysisHistory[analysisHistory.length - 1].id : '');

    const report1 = useMemo(() => analysisHistory.find(r => r.id === report1Id), [analysisHistory, report1Id]);
    const report2 = useMemo(() => analysisHistory.find(r => r.id === report2Id), [analysisHistory, report2Id]);

    const comparison = useMemo(() => {
        if (!report1 || !report2) return null;

        // 1. Calculate Improvement Percentage based on Documentos Faltantes
        const getPresentCount = (report: AnalysisRecord) => 
            report.documentosFaltantes.filter(d => d.estado === 'presente').length;
        
        const r1Present = getPresentCount(report1);
        const r2Present = getPresentCount(report2);
        const totalDocs = report1.documentosFaltantes.length || 1;
        
        const improvementPercent = ((r2Present - r1Present) / totalDocs) * 100;

        // 2. Calculate Compliance Improvement
        const getCumpleCount = (report: AnalysisRecord) => 
            report.auditoriaCumplimiento.filter(a => a.estado === 'cumple').length;
        
        const r1Cumple = getCumpleCount(report1);
        const r2Cumple = getCumpleCount(report2);
        const totalAudit = report1.auditoriaCumplimiento.length || 1;
        const complianceImprovement = ((r2Cumple - r1Cumple) / totalAudit) * 100;

        // 3. Identify Added Information (New documents that are now 'presente')
        const r1PresentDocs = new Set(report1.documentosFaltantes.filter(d => d.estado === 'presente').map(d => d.documento));
        const addedDocs = report2.documentosFaltantes
            .filter(d => d.estado === 'presente' && !r1PresentDocs.has(d.documento))
            .map(d => d.documento);

        // 4. Identify Resolved Inconsistencies
        const r1Inconsistencies = new Set(report1.inconsistencias);
        const resolvedInconsistencies = report1.inconsistencias.filter(inc => !report2.inconsistencias.includes(inc));
        const newInconsistencies = report2.inconsistencias.filter(inc => !r1Inconsistencies.has(inc));

        // 5. Still Missing
        const stillMissing = report2.documentosFaltantes.filter(d => d.estado === 'faltante');

        return {
            improvementPercent,
            complianceImprovement,
            addedDocs,
            resolvedInconsistencies,
            newInconsistencies,
            stillMissing,
            r1Present,
            r2Present,
            r1Cumple,
            r2Cumple,
            totalDocs,
            totalAudit
        };
    }, [report1, report2]);

    if (analysisHistory.length < 2) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-800 rounded-xl border border-slate-700 text-center">
                <Clock className="h-12 w-12 text-slate-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-200">Historial Insuficiente</h3>
                <p className="text-slate-400 mt-2 max-w-md">
                    Necesitas al menos dos análisis realizados para poder compararlos y ver la evolución del proyecto.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Selection Header */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
                    <div className="w-full md:w-auto flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Versión Anterior</label>
                        <select 
                            value={report1Id} 
                            onChange={(e) => setReport1Id(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none w-full"
                        >
                            {analysisHistory.map(r => (
                                <option key={r.id} value={r.id}>
                                    {new Date(r.date).toLocaleString()} - {r.resumenGeneral.substring(0, 30)}...
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="hidden md:block">
                        <ArrowRight className="h-6 w-6 text-cyan-500" />
                    </div>

                    <div className="w-full md:w-auto flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Versión Actual</label>
                        <select 
                            value={report2Id} 
                            onChange={(e) => setReport2Id(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none w-full"
                        >
                            {analysisHistory.map(r => (
                                <option key={r.id} value={r.id}>
                                    {new Date(r.date).toLocaleString()} - {r.resumenGeneral.substring(0, 30)}...
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {comparison && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUp className="h-16 w-16 text-cyan-400" />
                            </div>
                            <h4 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Mejora en Documentación</h4>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-4xl font-black ${comparison.improvementPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {comparison.improvementPercent > 0 ? '+' : ''}{comparison.improvementPercent.toFixed(1)}%
                                </span>
                                {comparison.improvementPercent !== 0 && (
                                    comparison.improvementPercent > 0 ? <ArrowUpRight className="h-6 w-6 text-green-400" /> : <ArrowDownRight className="h-6 w-6 text-red-400" />
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                {comparison.r2Present} de {comparison.totalDocs} documentos presentes ahora vs {comparison.r1Present} anteriormente.
                            </p>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                            </div>
                            <h4 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Mejora en Cumplimiento</h4>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-4xl font-black ${comparison.complianceImprovement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {comparison.complianceImprovement > 0 ? '+' : ''}{comparison.complianceImprovement.toFixed(1)}%
                                </span>
                                {comparison.complianceImprovement !== 0 && (
                                    comparison.complianceImprovement > 0 ? <ArrowUpRight className="h-6 w-6 text-emerald-400" /> : <ArrowDownRight className="h-6 w-6 text-red-400" />
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                {comparison.r2Cumple} puntos de control cumplidos vs {comparison.r1Cumple} anteriormente.
                            </p>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <AlertCircle className="h-16 w-16 text-amber-400" />
                            </div>
                            <h4 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Inconsistencias Resueltas</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-amber-400">
                                    {comparison.resolvedInconsistencies.length}
                                </span>
                                <span className="text-slate-500 text-sm font-medium">de {report1.inconsistencias.length}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Se han corregido {comparison.resolvedInconsistencies.length} discrepancias detectadas previamente.
                            </p>
                        </div>
                    </div>

                    {/* Detailed Comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Information Added */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <PlusCircle className="h-5 w-5 text-cyan-400" />
                                Información Añadida
                            </h3>
                            {comparison.addedDocs.length > 0 ? (
                                <ul className="space-y-3">
                                    {comparison.addedDocs.map((doc, i) => (
                                        <li key={i} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700 group hover:border-cyan-500/30 transition-colors">
                                            <div className="bg-cyan-500/10 p-2 rounded-md">
                                                <FileText className="h-4 w-4 text-cyan-400" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-200">{doc}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No se detectaron nuevos documentos presentes en esta versión.</p>
                            )}

                            {comparison.newInconsistencies.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Nuevas Alertas Detectadas</h4>
                                    <ul className="space-y-2">
                                        {comparison.newInconsistencies.map((inc, i) => (
                                            <li key={i} className="text-xs text-red-300 bg-red-900/10 p-2 rounded border border-red-500/20 flex gap-2">
                                                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                                {inc}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Still Missing & Conclusion */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-amber-400" />
                                Faltantes y Conclusión
                            </h3>
                            
                            <div className="flex-grow">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pendientes Críticos</h4>
                                {comparison.stillMissing.length > 0 ? (
                                    <div className="space-y-2 mb-6">
                                        {comparison.stillMissing.map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-slate-900/30 rounded border border-slate-700/50">
                                                <span className="text-xs text-slate-300">{doc.documento}</span>
                                                <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">Faltante</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-green-400 font-medium mb-6 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        ¡Toda la documentación requerida está presente!
                                    </p>
                                )}

                                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
                                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Conclusión de Evolución</h4>
                                    <p className="text-sm text-slate-300 leading-relaxed italic">
                                        {comparison.improvementPercent > 0 
                                            ? `El proyecto ha mostrado un avance significativo del ${comparison.improvementPercent.toFixed(1)}% en la integración documental. La incorporación de ${comparison.addedDocs.length} documentos clave ha permitido resolver ${comparison.resolvedInconsistencies.length} inconsistencias previas.`
                                            : comparison.improvementPercent < 0 
                                                ? `Se ha detectado una regresión en la disponibilidad de documentos. Es imperativo revisar por qué ciertos archivos ya no están siendo considerados en el análisis actual.`
                                                : `No se observan cambios cuantitativos en la documentación entre estas dos versiones. El proyecto se mantiene estable pero sin avances en los pendientes detectados.`
                                        }
                                        {comparison.stillMissing.length > 0 && ` Aún restan ${comparison.stillMissing.length} elementos por integrar para alcanzar la viabilidad técnica total.`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Historical Trend Visualization (Simple CSS Bars) */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-cyan-400" />
                            Tendencia Histórica de Cumplimiento
                        </h3>
                        <div className="flex items-end gap-3 h-64 pt-10 pb-12 overflow-x-auto custom-scrollbar">
                            {analysisHistory.map((record) => {
                                const auditoria = record.auditoriaCumplimiento || [];
                                const cumpleCount = auditoria.filter(a => a.estado === 'cumple').length;
                                const total = auditoria.length || 1;
                                const percent = (cumpleCount / total) * 100;
                                const isActive = record.id === report2Id;
                                const isOld = record.id === report1Id;

                                return (
                                    <div key={record.id} className="flex-1 min-w-[60px] flex flex-col items-center gap-3 group h-full">
                                        <div className="w-full relative flex flex-col justify-end h-full bg-slate-900/50 rounded-t-md border border-slate-700/30">
                                            <div 
                                                className={`w-full rounded-t-sm transition-all duration-700 relative ${
                                                    isActive ? 'bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 
                                                    isOld ? 'bg-slate-400' : 'bg-slate-600 hover:bg-slate-500'
                                                }`}
                                                style={{ height: `${Math.max(percent, 2)}%` }}
                                            >
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[11px] font-black text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-950 px-2 py-1 rounded border border-slate-700 z-10">
                                                    {percent.toFixed(0)}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-medium text-slate-500 rotate-45 origin-left mt-4 whitespace-nowrap">
                                            {new Date(record.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-8 flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-cyan-500 rounded-sm"></div>
                                <span>Versión Actual</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-slate-400 rounded-sm"></div>
                                <span>Versión Anterior</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-slate-600 rounded-sm"></div>
                                <span>Otros Históricos</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ReportComparisonView;
