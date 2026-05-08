import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { Project, AnalysisRecord } from "../types";

export const generateDocxReport = async (project: Project, analysis: AnalysisRecord) => {
    const doc = new Document({
        creator: "Analytica AI",
        title: `Reporte de Auditoría Técnica y Normativa - ${project.name}`,
        description: "Informe detallado de cumplimiento normativo y auditoría técnica de ingenierías.",
        styles: {
            default: {
                document: {
                    run: {
                        font: "Tahoma",
                        size: 22, // 11pt
                    },
                    paragraph: {
                        alignment: AlignmentType.JUSTIFIED,
                    }
                },
                heading1: {
                    run: {
                        font: "Tahoma",
                        size: 28,
                        bold: true,
                        color: "2E74B5",
                    },
                    paragraph: {
                        spacing: { before: 240, after: 120 },
                    }
                },
                heading2: {
                    run: {
                        font: "Tahoma",
                        size: 24,
                        bold: true,
                        color: "2E74B5",
                    },
                    paragraph: {
                        spacing: { before: 200, after: 100 },
                    }
                },
                title: {
                    run: {
                        font: "Tahoma",
                        size: 36,
                        bold: true,
                    },
                    paragraph: {
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    }
                }
            }
        },
        sections: [
            {
                properties: {},
                children: [
                    new Paragraph({
                        text: "INFORME EJECUTIVO DE AUDITORÍA TÉCNICA Y NORMATIVA",
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Proyecto: ", bold: true }),
                            new TextRun(project.name),
                        ],
                        spacing: { after: 200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Ubicación: ", bold: true }),
                            new TextRun(`${project.location.city}, ${project.location.state}`),
                        ],
                        spacing: { after: 400 },
                    }),
                    
                    // Resumen General
                    new Paragraph({
                        text: "1. Resumen General del Proyecto",
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),
                    new Paragraph({
                        text: analysis.resumenGeneral || 'No disponible',
                        spacing: { after: 400 },
                        alignment: AlignmentType.JUSTIFIED,
                    }),

                    // Conclusiones de Viabilidad
                    new Paragraph({
                        text: "2. Conclusiones de Viabilidad",
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),
                    new Paragraph({
                        text: analysis.conclusionesViabilidad || 'No disponible',
                        spacing: { after: 400 },
                        alignment: AlignmentType.JUSTIFIED,
                    }),

                    // Cuadro de Áreas e Información del Proyecto
                    new Paragraph({
                        text: "3. Cuadro de Áreas, uso de suelo e información a indicar en proyecto",
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),
                    ...generateCuadroAreasSection(analysis.cuadroAreas),

                    // Ficha Maestra de Cumplimiento
                    new Paragraph({
                        text: "4. Checklist de Planos Básicos y Firmas de Responsabilidad",
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),
                    ...generateChecklistPlanosTables(analysis.checklistPlanosBasicos),

                    // Ficha Maestra de Cumplimiento
                    new Paragraph({
                        text: "5. Ficha Maestra de Cumplimiento Normativo",
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),
                    ...generateFichaMaestraTables(analysis.fichaMaestra),

                    // Auditoría de Cumplimiento Detallada
                    new Paragraph({
                        text: "6. Auditoría de Cumplimiento Detallada",
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),
                    ...generateAuditoriaCumplimientoTables(analysis.auditoriaCumplimiento),

                    // Auditoría Técnica Profunda
                    new Paragraph({
                        text: "7. Auditoría Técnica Profunda de Ingenierías (Life-Safety)",
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),
                    ...generateAuditoriaTecnicaTables(analysis.auditoriaTecnicaProfunda),

                    // Inconsistencias
                    new Paragraph({
                        text: "8. Inconsistencias y Riesgos Detectados",
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),
                    ...(analysis.inconsistencias || []).map(inc => new Paragraph({
                        children: [
                            new TextRun({ text: `• `, bold: true }),
                            new TextRun({ text: typeof inc === 'string' ? inc : (inc as Record<string, unknown>).descripcion as string || JSON.stringify(inc) }),
                        ],
                        spacing: { after: 100 }
                    })),

                    // Guía de Acción
                    new Paragraph({
                        text: "9. Guía de Acción Recomendada",
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }),
                    ...(analysis.guiaAccion || []).map((paso, index) => new Paragraph({
                        children: [
                            new TextRun({ text: `${index + 1}. `, bold: true }),
                            new TextRun({ text: typeof paso === 'string' ? paso : (paso as Record<string, unknown>).descripcion as string || JSON.stringify(paso) }),
                        ],
                        spacing: { after: 100 }
                    })),
                ],
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Reporte_Auditoria_${project.name.replace(/\s+/g, '_')}.docx`);
};

const generateAuditoriaCumplimientoTables = (auditoria: AnalysisRecord['auditoriaCumplimiento']) => {
    if (!auditoria || auditoria.length === 0) return [new Paragraph("No hay datos de auditoría de cumplimiento.")];

    const elements: (Paragraph | Table)[] = [];

    // Group by category
    const groupedAudit = auditoria.reduce((acc, item) => {
        if (!acc[item.categoria]) {
            acc[item.categoria] = [];
        }
        acc[item.categoria].push(item);
        return acc;
    }, {} as Record<string, typeof auditoria>);

    Object.entries(groupedAudit).forEach(([categoria, items]) => {
        elements.push(new Paragraph({
            text: categoria,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
        }));

        const table = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "eeeeee" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "eeeeee" },
            },
            rows: [
                new TableRow({
                    tableHeader: true,
                    children: [
                        new TableCell({
                            shading: { fill: "f3f4f6" },
                            children: [new Paragraph({ children: [new TextRun({ text: "Punto Evaluado", bold: true })] })],
                            width: { size: 30, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            shading: { fill: "f3f4f6" },
                            children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })],
                            width: { size: 15, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            shading: { fill: "f3f4f6" },
                            children: [new Paragraph({ children: [new TextRun({ text: "Detalle / Legislación", bold: true })] })],
                            width: { size: 55, type: WidthType.PERCENTAGE }
                        }),
                    ],
                }),
                ...items.map(item => {
                    let estadoColor = "000000";
                    let estadoText = (item.estado ? String(item.estado) : 'desconocido').toUpperCase().replace('_', ' ');
                    if (item.estado === 'cumple') estadoColor = "10B981";
                    if (item.estado === 'no_cumple') estadoColor = "EF4444";
                    if (item.estado === 'no_aplica') estadoText = "N/A";

                    return new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: item.subcategoria || '' })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: estadoText, bold: true, color: estadoColor })] })] }),
                            new TableCell({ children: [new Paragraph({ text: item.detalle || '' })] }),
                        ],
                    });
                })
            ],
        });

        elements.push(table);
        elements.push(new Paragraph({ spacing: { after: 200 } }));
    });

    return elements;
};

const generateFichaMaestraTables = (fichaMaestra: AnalysisRecord['fichaMaestra']) => {
    if (!fichaMaestra || fichaMaestra.length === 0) return [new Paragraph("No hay datos de ficha maestra.")];

    const elements: (Paragraph | Table)[] = [];

    fichaMaestra.forEach((categoria) => {
        elements.push(new Paragraph({
            text: categoria.categoria,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
        }));

        const table = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "eeeeee" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "eeeeee" },
            },
            rows: [
                new TableRow({
                    tableHeader: true,
                    children: [
                        new TableCell({
                            shading: { fill: "f3f4f6" },
                            children: [new Paragraph({ children: [new TextRun({ text: "Punto de Revisión", bold: true })] })],
                            width: { size: 20, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            shading: { fill: "f3f4f6" },
                            children: [new Paragraph({ children: [new TextRun({ text: "Norma de Referencia", bold: true })] })],
                            width: { size: 25, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            shading: { fill: "f3f4f6" },
                            children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })],
                            width: { size: 15, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            shading: { fill: "f3f4f6" },
                            children: [new Paragraph({ children: [new TextRun({ text: "Hallazgo / Recomendación", bold: true })] })],
                            width: { size: 40, type: WidthType.PERCENTAGE }
                        }),
                    ],
                }),
                ...categoria.puntos.map(punto => {
                    let estadoColor = "000000";
                    let estadoText = (punto.estado ? String(punto.estado) : 'desconocido').toUpperCase();
                    if (punto.estado === 'cumple') estadoColor = "10B981"; // Green
                    if (punto.estado === 'no_cumple') estadoColor = "EF4444"; // Red
                    if (punto.estado === 'parcial') estadoColor = "F59E0B"; // Yellow
                    if (punto.estado === 'no_aplica') estadoText = "N/A";

                    return new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: punto.nombre || '' })] }),
                            new TableCell({ children: [new Paragraph({ text: punto.normaReferencia || '', style: "Intense Quote" })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: estadoText, bold: true, color: estadoColor })] })] }),
                            new TableCell({ children: [
                                new Paragraph({ text: punto.hallazgo || '' }),
                                ...(punto.estado === 'no_cumple' || punto.estado === 'parcial' ? [
                                    new Paragraph({ children: [new TextRun({ text: `Acción Requerida: ${punto.recomendacionArea || ''}`, italics: true, color: "D97706" })], spacing: { before: 100 } })
                                ] : [])
                            ] }),
                        ],
                    });
                })
            ],
        });

        elements.push(table);
        elements.push(new Paragraph({ spacing: { after: 200 } }));
    });

    return elements;
};

const generateAuditoriaTecnicaTables = (auditoria: AnalysisRecord['auditoriaTecnicaProfunda']) => {
    if (!auditoria || auditoria.length === 0) return [new Paragraph("No hay datos de auditoría técnica.")];

    const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "eeeeee" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "eeeeee" },
        },
        rows: [
            new TableRow({
                tableHeader: true,
                children: [
                    new TableCell({
                        shading: { fill: "f3f4f6" },
                        children: [new Paragraph({ children: [new TextRun({ text: "Disciplina / Elemento", bold: true })] })],
                        width: { size: 25, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        shading: { fill: "f3f4f6" },
                        children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })],
                        width: { size: 15, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        shading: { fill: "f3f4f6" },
                        children: [new Paragraph({ children: [new TextRun({ text: "Hallazgo Técnico", bold: true })] })],
                        width: { size: 30, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        shading: { fill: "f3f4f6" },
                        children: [new Paragraph({ children: [new TextRun({ text: "Riesgo / Recomendación", bold: true })] })],
                        width: { size: 30, type: WidthType.PERCENTAGE }
                    }),
                ],
            }),
            ...auditoria.map(item => {
                let estadoColor = "000000";
                const estadoText = (item.estado ? String(item.estado) : 'desconocido').toUpperCase().replace('_', ' ');
                if (item.estado === 'correcto') estadoColor = "10B981";
                if (item.estado === 'error_critico') estadoColor = "EF4444";
                if (item.estado === 'observacion_menor') estadoColor = "F59E0B";

                return new TableRow({
                    children: [
                        new TableCell({ children: [
                            new Paragraph({ children: [new TextRun({ text: item.disciplina || '', bold: true })] }),
                            new Paragraph({ text: item.elementoRevisado || '' })
                        ] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: estadoText, bold: true, color: estadoColor })] })] }),
                        new TableCell({ children: [new Paragraph({ text: item.hallazgo || '' })] }),
                        new TableCell({ children: [
                            ...(item.riesgoOperativo ? [new Paragraph({ children: [new TextRun({ text: `Riesgo: ${item.riesgoOperativo}`, bold: true, color: "EF4444" })] })] : []),
                            ...(item.recomendacion ? [new Paragraph({ children: [new TextRun({ text: `Rec: ${item.recomendacion}`, italics: true })], spacing: { before: 100 } })] : [])
                        ] }),
                    ],
                });
            })
        ],
    });

    return [table];
};

const generateChecklistPlanosTables = (checklist?: AnalysisRecord['checklistPlanosBasicos']) => {
    if (!checklist || checklist.length === 0) return [new Paragraph("No hay datos de checklist de planos básicos.")];

    const elements: (Paragraph | Table)[] = [];

    // Group by category
    const groupedChecklist = checklist.reduce((acc, item) => {
        const cat = item.categoria || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, typeof checklist>);

    Object.entries(groupedChecklist).forEach(([categoria, items]) => {
        elements.push(new Paragraph({
            text: categoria,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
        }));

        const table = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "eeeeee" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "eeeeee" },
            },
            rows: [
                new TableRow({
                    tableHeader: true,
                    children: [
                        new TableCell({
                            shading: { fill: "f3f4f6" },
                            children: [new Paragraph({ children: [new TextRun({ text: "Cód / Nombre del Plano", bold: true })] })],
                            width: { size: 30, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            shading: { fill: "f3f4f6" },
                            children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })],
                            width: { size: 15, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            shading: { fill: "f3f4f6" },
                            children: [new Paragraph({ children: [new TextRun({ text: "Firmas (RL/DRO)", bold: true })] })],
                            width: { size: 15, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            shading: { fill: "f3f4f6" },
                            children: [new Paragraph({ children: [new TextRun({ text: "Observaciones / Requisito", bold: true })] })],
                            width: { size: 40, type: WidthType.PERCENTAGE }
                        }),
                    ],
                }),
                ...items.map(p => new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ text: `${p.codigo} - ${p.nombre}` })] }),
                        new TableCell({ children: [new Paragraph({ text: p.estado.toUpperCase() })] }),
                        new TableCell({ children: [new Paragraph({ text: p.tieneFirmas ? "SI" : "NO" })] }),
                        new TableCell({ children: [new Paragraph({ text: p.comentarioTecnico || '' })] }),
                    ],
                }))
            ]
        });
        elements.push(table);
        elements.push(new Paragraph({ spacing: { after: 200 } }));
    });

    return elements;
};

const generateCuadroAreasSection = (cuadro?: AnalysisRecord['cuadroAreas']): (Paragraph | Table)[] => {
    if (!cuadro) return [new Paragraph("Información de cuadro de áreas no disponible.")];

    const fields = [
        { label: "Superficie total del predio", value: cuadro.superficieTotalPredio },
        { label: "Superficie Arrendada y/o a utilizar", value: cuadro.superficieArrendada },
        { label: "Desglose de m2 de construcción por nivel, uso o área", value: cuadro.desgloseConstruccionNivel },
        { label: "COS", value: cuadro.cos },
        { label: "CUS", value: cuadro.cus },
        { label: "Superficie de desplante", value: cuadro.superficieDesplante },
        { label: "Área libre", value: cuadro.areaLibre },
        { label: "Área verde Jardinada", value: cuadro.areaVerde },
        { label: "Superficie de estacionamiento, número de cajones y norma", value: cuadro.estacionamientoCajonesNorma },
        { label: "Área de Carga y Descarga", value: cuadro.areaCargaDescarga },
        { label: "Altura de la tienda desde nivel de banqueta", value: cuadro.alturaTienda },
        { label: "Altura de anuncio espectacular", value: cuadro.alturaAnuncio },
        { label: "Datos del DRO de la localidad", value: cuadro.datosDRO },
        { label: "¿Se requiere pie de plano especial local?", value: cuadro.requierePiePlanoEspecial },
        { label: "¿Se requiere algún consultor especial local?", value: cuadro.requiereConsultorEspecial },
    ];

    const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "eeeeee" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "eeeeee" },
        },
        rows: fields.map(field => new TableRow({
            children: [
                new TableCell({
                    shading: { fill: "f3f4f6" },
                    children: [new Paragraph({ children: [new TextRun({ text: field.label, bold: true })] })],
                    width: { size: 40, type: WidthType.PERCENTAGE }
                }),
                new TableCell({
                    children: [new Paragraph({ text: field.value || "No especificado" })],
                    width: { size: 60, type: WidthType.PERCENTAGE }
                })
            ]
        }))
    });

    return [table];
};
