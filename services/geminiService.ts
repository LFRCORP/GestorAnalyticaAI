
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Document, AnalysisResult, ChatMessage } from '../types';

const rawApiKey = import.meta.env.VITE_GEMINI_API_KEY
  || (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEY || process.env?.API_KEY))
  || '';
const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : '';
if (!apiKey) {
  throw new Error("Gemini API key not configured. Set VITE_GEMINI_API_KEY in apphosting.yaml secrets.");
}

const ai = new GoogleGenAI({ apiKey });

const datoClaveSchema = {
    type: Type.OBJECT,
    properties: {
        valor: { type: Type.STRING, description: "El valor del dato extraído." },
        archivo: { type: Type.STRING, description: "El nombre del documento de origen." },
        pagina: { type: Type.INTEGER, description: "El número de página donde se encontró el dato." },
    },
    required: ["valor", "archivo", "pagina"]
};

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        resumenGeneral: { type: Type.STRING, description: "Un resumen conciso del propósito y alcance general de los proyectos. Incluir referencias de archivo y página entre paréntesis donde sea relevante, por ejemplo: 'El objetivo es construir un edificio (doc1.pdf, pág. 2)'." },
        datosClave: {
            type: Type.OBJECT,
            properties: {
                nombreProyecto: { type: Type.ARRAY, items: datoClaveSchema, description: "Lista de todos los nombres de proyecto encontrados, cada uno con su fuente." },
                direccion: { type: Type.ARRAY, items: datoClaveSchema, description: "Lista de todas las direcciones de proyecto encontradas, cada una con su fuente." },
                representantes: { type: Type.ARRAY, items: datoClaveSchema, description: "Lista de todos los representantes legales o técnicos, cada uno con su fuente." },
                superficies: { type: Type.ARRAY, items: datoClaveSchema, description: "Lista de todas las superficies (construcción, terreno, etc.), cada una con su fuente." },
                firmantes: { type: Type.ARRAY, items: datoClaveSchema, description: "Lista de los nombres de las personas que firman los documentos, cada uno con su fuente." },
            }
        },
        inconsistencias: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Una lista detallada de discrepancias encontradas entre los documentos, especificando el archivo y la naturaleza del error (ej. 'El nombre del representante difiere entre doc1.pdf y doc2.pdf')." },
        comparacionNormativa: { type: Type.STRING, description: "Un análisis comparativo del proyecto contra la normativa local proporcionada. Indicar posibles desviaciones o puntos a revisar." },
        referencias: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    archivo: { type: Type.STRING },
                    pagina: { type: Type.INTEGER },
                    texto: { type: Type.STRING },
                }
            },
            description: "Referencias específicas en los documentos para los hallazgos clave."
        },
        documentosFaltantes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    pilar: { type: Type.STRING, description: "Uno de los 5 pilares fundamentales." },
                    documento: { type: Type.STRING, description: "Nombre del documento requerido." },
                    estado: { type: Type.STRING, enum: ["faltante", "presente", "parcial"] },
                    observacion: { type: Type.STRING, description: "Nota sobre el estado del documento." }
                },
                required: ["pilar", "documento", "estado"]
            },
            description: "Checklist de los 5 pilares de auditoría industrial."
        },
        auditoriaCumplimiento: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    categoria: { type: Type.STRING, description: "Categoría principal (ej. I. ESPECIALIDAD LEGAL Y ADMINISTRATIVA)" },
                    subcategoria: { type: Type.STRING, description: "Punto específico evaluado (ej. Acreditación de Propiedad)" },
                    estado: { type: Type.STRING, enum: ["cumple", "no_cumple", "no_aplica"] },
                    detalle: { type: Type.STRING, description: "Explicación detallada del cumplimiento, falla, y comparación con la legislación local (incluyendo artículos si aplica)." }
                },
                required: ["categoria", "subcategoria", "estado", "detalle"]
            },
            description: "Matriz de auditoría detallada basada en la guía exhaustiva."
        },
        conclusionesViabilidad: { type: Type.STRING, description: "Un análisis final sobre la viabilidad del proyecto para obtener la licencia basado en los hallazgos." },
        guiaAccion: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "Pasos prioritarios y recomendaciones específicas para solventar las faltas y obtener la licencia." 
        },
        verificacionCalculos: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    descripcion: { type: Type.STRING, description: "Qué se está verificando (ej. Cálculo de COS/CUS, áreas totales)." },
                    estado: { type: Type.STRING, enum: ["correcto", "error", "advertencia"] },
                    detalles: { type: Type.STRING, description: "Explicación de la congruencia o el error encontrado." }
                },
                required: ["descripcion", "estado", "detalles"]
            },
            description: "Verificación de operaciones, factores y cálculos en memorias descriptivas y técnicas."
        },
        cuadroAreas: {
            type: Type.OBJECT,
            properties: {
                superficieTotalPredio: { type: Type.STRING, description: "Superficie total registrada del terreno." },
                superficieArrendada: { type: Type.STRING, description: "Superficie que se va a utilizar o arrendar." },
                desgloseConstruccionNivel: { type: Type.STRING, description: "Desglose de m2 por nivel o áreas." },
                cos: { type: Type.STRING, description: "Coeficiente de Ocupación del Suelo. Indicar porcentaje legal si se encuentra. Ej: '60% (Legal 70%)'" },
                cus: { type: Type.STRING, description: "Coeficiente de Utilización del Suelo. Indicar valor legal si se encuentra." },
                superficieDesplante: { type: Type.STRING, description: "Superficie de desplante ocupada." },
                areaLibre: { type: Type.STRING, description: "Área libre en m2 y porcentaje. Ej: '150m2 (Legal 20%)'" },
                areaVerde: { type: Type.STRING, description: "Área verde o jardinada. Ej: '50m2 (Legal 10%)'" },
                estacionamientoCajonesNorma: { type: Type.STRING, description: "Superficie de estacionamiento, número de cajones y mención a la norma cumplida." },
                areaCargaDescarga: { type: Type.STRING, description: "Espacio e información sobre área de carga y descarga." },
                alturaTienda: { type: Type.STRING, description: "Altura desde nivel de banqueta." },
                alturaAnuncio: { type: Type.STRING, description: "Altura del anuncio espectacular si aplica." },
                datosDRO: { type: Type.STRING, description: "Nombre y cédula del DRO de la localidad." },
                requierePiePlanoEspecial: { type: Type.STRING, description: "Informar si la legislación local pide un pie de plano con datos específicos." },
                requiereConsultorEspecial: { type: Type.STRING, description: "Informar si se requiere un tercer perito o consultor según la ley local." }
            }
        },
        checklistPlanosBasicos: {
            type: Type.ARRAY,
            description: "Auditoría de existencia y firmas de los planos básicos y especializados requeridos.",
            items: {
                type: Type.OBJECT,
                properties: {
                    categoria: { type: Type.STRING, description: "Categoría del plano (ej. Arquitectónicos, Estructurales, Instalaciones)." },
                    codigo: { type: Type.STRING, description: "Código del plano (ej. C0-01, A-100, IS-01)." },
                    nombre: { type: Type.STRING, description: "Nombre del plano." },
                    estado: { type: Type.STRING, enum: ["presente", "faltante", "parcial"] },
                    tieneFirmas: { type: Type.BOOLEAN, description: "¿Tiene firmas de Representante Legal, DRO y Registro?" },
                    comentarioTecnico: { type: Type.STRING, description: "Observaciones específicas del requerimiento." }
                },
                required: ["codigo", "nombre", "estado", "tieneFirmas", "comentarioTecnico"]
            }
        },
        auditoriaTecnicaProfunda: {
            type: Type.ARRAY,
            description: "Auditoría técnica rigurosa de cálculos de ingeniería para prevención de riesgos operativos y de vida.",
            items: {
                type: Type.OBJECT,
                properties: {
                    disciplina: { type: Type.STRING, enum: ["Geotecnia", "Estructural", "Hidrosanitaria", "Pluvial", "Contra Incendio", "Eléctrica", "Gas", "Otra"], description: "Disciplina de ingeniería evaluada." },
                    elementoRevisado: { type: Type.STRING, description: "Ej. Cálculo de capacidad de carga, Diámetros de tubería pluvial, Análisis sísmico." },
                    estado: { type: Type.STRING, enum: ["correcto", "error_critico", "observacion_menor", "no_evaluable"], description: "Estado de la revisión matemática y técnica." },
                    hallazgo: { type: Type.STRING, description: "Descripción técnica del error, discrepancia o confirmación de exactitud matemática." },
                    riesgoOperativo: { type: Type.STRING, description: "Qué pasaría si esto falla (ej. Colapso, Inundación, Cortocircuito, Pérdida de Vidas)." },
                    recomendacion: { type: Type.STRING, description: "Acción correctiva inmediata requerida por el especialista responsable." }
                },
                required: ["disciplina", "elementoRevisado", "estado", "hallazgo", "riesgoOperativo", "recomendacion"]
            }
        },
        fichaMaestra: {
            type: Type.ARRAY,
            description: "Ficha maestra de cumplimiento detallada por áreas.",
            items: {
                type: Type.OBJECT,
                properties: {
                    categoria: { type: Type.STRING, description: "Categoría de cumplimiento (ej. 1. Certeza Jurídica y Administrativa)." },
                    puntos: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                nombre: { type: Type.STRING, description: "Nombre del punto a evaluar (ej. Acreditación de la Propiedad)." },
                                estado: { type: Type.STRING, enum: ["cumple", "no_cumple", "parcial", "no_aplica"], description: "Estado de cumplimiento." },
                                hallazgo: { type: Type.STRING, description: "Descripción detallada del hallazgo en los documentos." },
                                normaReferencia: { type: Type.STRING, description: "Norma, ley o artículo local específico que fundamenta el requisito." },
                                recomendacionArea: { type: Type.STRING, description: "Recomendación específica y área responsable de solucionar el incumplimiento." }
                            },
                            required: ["nombre", "estado", "hallazgo", "normaReferencia", "recomendacionArea"]
                        }
                    }
                },
                required: ["categoria", "puntos"]
            }
        },
         datosClavePorDocumento: {
            type: Type.ARRAY,
            description: "Una lista que desglosa los datos clave para cada documento individualmente para la tabla comparativa.",
            items: {
                type: Type.OBJECT,
                properties: {
                    nombreDocumento: { type: Type.STRING, description: "El nombre del documento." },
                    datos: {
                        type: Type.OBJECT,
                        properties: {
                             nombreProyecto: { type: Type.STRING },
                             direccion: { type: Type.STRING },
                             representantes: { type: Type.STRING },
                             superficies: { type: Type.STRING },
                             firmantes: { type: Type.STRING },
                        }
                    }
                },
                required: ["nombreDocumento", "datos"]
            }
        }
    },
    required: ["resumenGeneral", "datosClave", "inconsistencias", "comparacionNormativa", "referencias", "documentosFaltantes", "auditoriaCumplimiento", "conclusionesViabilidad", "guiaAccion", "verificacionCalculos", "auditoriaTecnicaProfunda", "fichaMaestra", "datosClavePorDocumento"]
};


export const analyzeDocuments = async (docs: Document[], location: { city: string; state: string; }, historySummary?: string): Promise<{ analysis: AnalysisResult, sources: { web?: { uri: string; title?: string } }[], normativaReport: string }> => {
    const searchModel = ai.models.generateContent;
    
    /**
     * Strips characters with code points > U+00FF (outside ISO-8859-1).
     * The @google/genai SDK encodes certain request metadata in HTTP headers.
     * The browser's Headers API rejects any value containing non-Latin-1
     * characters (code points > 255), throwing "non ISO-8859-1 code point".
     * Characters like ™ (U+2122), — (U+2014), • (U+2022), € (U+20AC) can
     * appear in Google Search results or PDF-extracted text.
     */
    const sanitizeText = (text: string): string => {
        if (!text) return '';
        return text
            // Replace common Unicode punctuation with ASCII equivalents
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/[\u2026]/g, '...')
            .replace(/[\u2022\u2023\u25AA\u25BA]/g, '*')
            .replace(/\u00A0/g, ' ')
            // Remove any remaining characters outside Latin-1 range (> U+00FF)
            .replace(/[^\u0000-\u00FF]/g, ' ');
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const executeWithRetry = async (apiCall: () => Promise<unknown>, maxRetries = 3, baseDelay = 15000) => {
        let retries = maxRetries;
        while (retries > 0) {
            try {
                return await apiCall();
            } catch (error: unknown) {
                const err = error as { message?: string, status?: number };
                const isRateLimit = err.message?.toLowerCase().includes('rate') || err.status === 429;
                if (isRateLimit && retries > 1) {
                    retries--;
                    console.warn(`Rate limit exceeded. Retrying in ${baseDelay / 1000} seconds... (${retries} retries left)`);
                    await delay(baseDelay);
                    baseDelay *= 2; // Exponential backoff
                } else {
                    throw error;
                }
            }
        }
    };

    // 1. Get local regulations using Google Search grounding
    const regulationsPrompt = `Realiza una búsqueda exhaustiva, profunda y detallada en internet para indexar el marco normativo completo aplicable a un proyecto de construcción en ${location.city}, ${location.state}. Debes obtener detalles técnicos específicos de la siguiente jerarquía normativa para crear una "Base de Datos de Conocimiento" para este proyecto:

### A. NIVEL FEDERAL (Marco General)
1.  **Constitución Política de los Estados Unidos Mexicanos**: Particularmente el Artículo 115 (facultades municipales en materia de desarrollo urbano).
2.  **Leyes Generales**: Ley General de Asentamientos Humanos, Ordenamiento Territorial y Desarrollo Urbano; y la LGEEPA (Ley General del Equilibrio Ecológico y la Protección al Ambiente).
3.  **Normas Oficiales Mexicanas (NOM)**: Enfoque en accesibilidad (NOM-030-SSA3), seguridad contra incendios (NOM-002-STPS) y eficiencia energética.

### B. NIVEL ESTATAL (Marco Operativo)
1.  **Ley de Desarrollo Urbano del Estado de ${location.state}**: Define los procedimientos para licencias y dictámenes.
2.  **Ley de Obra Pública del Estado de ${location.state}**: Crucial para integraciones con infraestructura pública.
3.  **Código Urbano / Código Territorial de ${location.state}**: Documento que unifica los criterios de construcción en el estado.

### C. NIVEL MUNICIPAL (Marco Específico - PRIORIDAD)
1.  **Plan Municipal de Desarrollo Urbano (PMDU) de ${location.city}**: Es el documento más importante; define el uso de suelo, densidades (COS, CUS) y restricciones por zona.
2.  **Reglamento de Construcción Municipal de ${location.city}**: Establece las dimensiones técnicas (sanitarios: **cantidad de WC por m² o por aforo**), requisitos de **materiales de construcción y cubiertas**, requisitos de pavimentación en vía pública para obras de infraestructura y normas para el **manejo de aguas pluviales**.
3.  **Reglamento de Ecología / Medio Ambiente de ${location.city}**: Dicta las normas de **compensación forestal/arbórea** (especies recomendadas, densidad de arbolado y % de áreas verdes exigido) e impacto ambiental local.
4.  **Normatividad de Impacto Hidrológico Cero**: Realiza una búsqueda exhaustiva para determinar si el municipio o el estado exigen que el proyecto demuestre un **Impacto Hidrológico Cero** (caudal de salida post-desarrollo ≤ pre-desarrollo). Aunque es una tendencia fuerte en Jalisco, debe verificarse rigurosamente en la legislación local de cualquier entidad para asegurar la viabilidad técnica. Identifica periodos de retorno (TR) y requisitos de Tanque de Tormentas.
5.  **Bando de Policía y Gobierno de ${location.city}**: Regula horarios de obra, ruidos y convivencia urbana.
6.  **Ley de Ingresos Municipal de ${location.city} (Vigente)**: Para calcular el costo de los derechos y fianzas de garantía.

Sintetiza los hallazgos en un informe técnico estructurado y detallado. Pon especial énfasis en encontrar los parámetros exactos para la **compensación arbórea**, las **especificaciones de pavimentos** y los criterios técnicos de **Impacto Hidrológico Cero**. Si no encuentras una norma municipal específica, identifica la norma estatal o federal que la sustituye por supletoriedad. Este informe será la base para auditar el cumplimiento del proyecto.`;
    const regulationsResponse = await executeWithRetry(() => searchModel({
        model: 'gemini-3-flash-preview',
        contents: regulationsPrompt,
        config: { tools: [{ googleSearch: {} }] }
    })) as { text: string, candidates?: { groundingMetadata?: { groundingChunks?: { web?: { uri: string; title?: string } }[] } }[] };
    const localRegulations = sanitizeText(regulationsResponse.text);
    const regulationSources = regulationsResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // 2. Analyze documents against regulations using multimodal capabilities (OCR)
    const analysisModel = ai.models.generateContent;
    
    const analysisPrompt = `Eres un AUDITOR TÉCNICO SENIOR y Consultor Experto en Ingeniería y Normatividad Urbana en México. Tu misión es realizar una AUDITORÍA TÉCNICA PROFUNDA y legal del expediente para garantizar la seguridad estructural, operativa y el cumplimiento total para la obtención de licencias.
    
    ### CONTEXTO DE AUDITORÍA EXISTENTE (HISTORIAL):
    ${historySummary || 'No hay auditoría previa para este proyecto.'}
    
    ### INSTRUCCIÓN DE CUMULATIVIDAD Y EXHAUSTIVIDAD (CRÍTICO):
    - Tu misión es realizar un análisis CUMULATIVO. No sustituyas los hallazgos anteriores si siguen siendo válidos; compleméntalos con la información de los nuevos documentos.
    - El reporte final debe ser un RECORRIDO EXHAUSTIVO por todo el proyecto. NO OMITAS nada que se haya detectado previamente.
    - Si encuentras contradicciones entre un documento nuevo y uno viejo (ej. una superficie que cambió), notifícalo explícitamente en la sección de 'inconsistencias'.
    - El objetivo es que este análisis sea la VERSIÓN MAESTRA y FINAL de la auditoría hasta el momento.

    ### PERSONA Y ESTILO:
    - Actúa con el rigor de un perito revisor.
    - No aceptes datos sin verificar; si una memoria dice que un cálculo es correcto, RE-VERIFÍCALO mentalmente con los datos proporcionados.
    - Tu lenguaje debe ser técnico, preciso y crítico.
    - Tu prioridad es detectar RIESGOS CRÍTICOS (Life-Safety) y errores de ingeniería que puedan causar el rechazo de la licencia o fallas en la obra.

    ### ATENCIÓN OBLIGATORIA A TODAS LAS MEMORIAS TÉCNICAS:
    Se han cargado múltiples "Memorias de Cálculo" y "Memorias Descriptivas". Estos son los documentos más importantes. DEBES auditar CADA UNA de las siguientes disciplinas si están presentes:
    1. **MEMORIA ESTRUCTURAL**: Revisa códigos de diseño (NTC-2023, CFE), combinaciones de carga, relación demanda/capacidad, y flechas permisibles.
    2. **MEMORIA HIDRÁULICA/SANITARIA**: Verifica gastos, presiones, diámetros de tubería y cumplimiento de NOM-001-CONAGUA.
    3. **MEMORIA PLUVIAL (E IMPACTO HIDROLÓGICO)**: Audita periodos de retorno (TR), coeficientes de escurrimiento y capacidad de regulación/tanques de tormentas. Verifica explícitamente si el proyecto cumple con el **Impacto Hidrológico Cero** si la normativa local lo exige, comparando caudales pre y post desarrollo.
    4. **MEMORIA ELÉCTRICA**: Revisa cuadros de cargas, caída de tensión y cumplimiento de NOM-001-SEDE.
    5. **OTRAS (Gas, Contra Incendio, Geotecnia)**: Audita que cumplan con sus respectivas normas oficiales.

    ### INSTRUCCIONES PARA 'auditoriaTecnicaProfunda':
    Para cada disciplina encontrada, DEBES generar un hallazgo detallado en esta sección del JSON. No omitas ninguna memoria. Si una memoria está incompleta o carece de rigor, márcala como 'error_critico' u 'observacion_menor'.
    IMPORTANTE: Separa la disciplina "Pluvial" de la "Hidrosanitaria". No las agrupes; cada una debe tener su propia revisión técnica exhaustiva. Genera tantas entradas como disciplinas existan en el proyecto; no hay un número máximo de elementos en esta lista.

    ### ANÁLISIS DETALLADO DE PLANOS (VECTORIZADOS, A100 Y OTROS):
    Busca específicamente en los planos (especialmente Planta de Conjunto A100) los bloques de texto y capas que definan:
    - **Metrajes**: Área total de construcción vs Área total de terreno.
    - **Núcleo de Servicios**: Realiza un conteo EXACTO de piezas sanitarias (WC) visibles en los planos.
    - **Techumbres**: Identifica la especificación del material de la cubierta/techumbre en notas o leyendas.

    ### SECCIÓN: CUADRO DE ÁREAS E INFORMACIÓN DEL PROYECTO (CRÍTICO):
    Debes completar con la mayor precisión posible la propiedad 'cuadroAreas'. Si la información no se encuentra en los documentos, indica "No especificado en documentos". 
    Para los campos que incluyan "(Legal ____%)", busca en la normativa local que encontraste previamente el porcentaje o valor exigido por la ley y colócalo entre paréntesis.
    Campos a identificar:
    - Superficie total del predio.
    - Superficie Arrendada y/o a utilizar.
    - Desglose de m2 de construcción por nivel, uso o área.
    - COS: (Ej. "65% (Legal 75%)").
    - CUS: (Ej. "1.5 (Legal 2.0)").
    - Superficie de desplante.
    - Área libre: (Ej. "200m2 (Legal 20%)").
    - Área verde: Especificar m2 y si cumple con el % legal de área jardinada.
    - Estacionamiento: Superficie total dedicada, número de cajones y si cumple con la norma local.
    - Área de Carga y Descarga: Ubicación y dimensiones si existen.
    - Altura de la tienda: Desde banqueta o desplante.
    - Altura de anuncio: Altura permitida vs propuesta.
    - Datos del DRO: Nombre y registro.
    - Pie de plano: ¿La ley local exige un formato o datos específicos en el pie de plano?
    - Consultores especiales: ¿La ley local exige peritos ambientales, viales o de protección civil adicionales?

    ### AUDITORÍA DE PLANOS BÁSICOS Y ESPECIALIZADOS (CHECKLIST OBLIGATORIO):
    Debes verificar la presencia y correcta firma de los siguientes planos, agrupándolos por categoría.
    Para cada uno, revisa si tiene las firmas de: Rep Legal, DRO y su Registro.

    LISTA POR AUDITAR:

    **1. Planos de Sitio y Generales:**
    - C0-01: Plano de condiciones Actuales
    - C0-02L: Plano de Demoliciones
    - C0-02aL: Plano de Ruptura de pavimentos y banquetas
    - C0-02bL: Plano de Tratamiento de Arboles
    - C0-03L: Plano de Conjunto
    - C0-06: Plano de Servicios Generales
    - C0-09L: Plano de Terracerías (Debe incluir cuadro de m3 de movimiento de tierras)
    - C0-11: Plano de Áreas Verdes
    - C0-12: Plano de riego de áreas verdes
    - C0-15: Plano de anuncio espectacular
    - C0-15ª: Plano de estructura de anuncio rotulado
    - Anuncio tipo monumento: (Mencionar cimentación en plano de conjunto)

    **2. Arquitectónicos:**
    - A-100: Planta Arquitectónica interior
    - A-101b: Plano de Rutas de Evacuación y Seguridad PC (Debe incluir señalización en planta de conjunto)
    - A-200: Fachadas
    - A-300: Cortes Generales

    **3. Instalación Hidráulica:**
    - IH-01: Instalación Hidráulica Red General
    - IH-02: Instalación Hidráulica Núcleos Sanitarios
    - IH-03: Instalación Hidráulica Isométricos Red General
    - HCM-01-02: Instalación Hidráulica Cuadro de Maquinas

    **4. Instalación Sanitaria y Pluvial:**
    - IS-01: Instalación sanitaria Red General
    - IS-02: Instalación sanitaria Núcleos sanitarios
    - IS-03: Planta de azoteas Bajada de aguas pluviales (BAP)
    - IS-04: Instalación hidrosanitaria Detalles
    - C0-06ª: Plano de agua potable
    - C0-07: Plano de drenaje sanitario
    - CO-08: Plano de drenaje pluvial
    - C0-08ª: Plano de cárcamo pluvial

    **5. Instalación Eléctrica:**
    - DU-01: Diagrama Unifilar
    - IE-01: Alumbrado de piso de ventas
    - IE-04/06/08: Contactos normales y de fuerza
    - IE-09ª: Diseño de cuartos eléctricos
    - C0-10b: Plano de Acometida Eléctrica
    - IE-26: Sistema de pararrayos
    - IE-28: Sistema de tierra

    **6. Instalaciones Especiales:**
    - IG: Instalación de Gas (Completo)
    - SCI: Sistema contra incendio (Completo)
    - PTAR: Proyecto de Planta de Tratamiento (Completo)

    **7. Estructurales:**
    - ES-ALL: Todos los planos estructurales
    - ES-101: Planta de cimentación
    - ES-201: Planta de Pisos
    - ES-301: Planta de Muros
    - ES-402: Planta de Cubierta
    - ES-403: Marcos principales
    - ES-404: Marcos Secundarios
    - ES-501: Cisterna (plantas, cortes y detalles)

    ### CRUCE Y VALIDACIÓN RIGUROSA (LEY vs PROYECTO):
    Para cada hallazgo, ejecuta la siguiente lógica comparativa: "Si la Ley Local/Norma pide [X] y el Plano/Memoria tiene [Y], ¿hay cumplimiento o desviación?". Notifica las diferencias de manera ordenada en las secciones correspondientes del JSON.

    ### GUÍA DE AUDITORÍA EXHAUSTIVA (TROPICALIZADA A LEGISLACIÓN LOCAL):
    Debes evaluar estrictamente cada uno de los siguientes puntos. Para cada punto, determina si CUMPLE, NO CUMPLE o NO APLICA, compáralo con la legislación local, e inclúyelo en la sección 'auditoriaCumplimiento' del JSON. Usa los números romanos (I, II, III...) como 'categoria' y los puntos clave como 'subcategoria'.

    **I. ESPECIALIDAD LEGAL Y ADMINISTRATIVA**
    *   **Acreditación de Propiedad y Personalidad Legal:**
        *   ¿Se cuenta con la Escritura Pública (o título de propiedad equivalente) debidamente inscrita en el Registro Público de la Propiedad que acredite al solicitante como el propietario legítimo del predio?
        *   ¿Las medidas y superficies de la escritura coinciden de manera exacta con el levantamiento topográfico y el proyecto arquitectónico? (Nota: Las divergencias mayores al 0.01% entre superficie escriturada, levantamiento y proyecto suelen ser causa de rechazo o requieren un proceso de rectificación de medidas y deslinde).
        *   ¿Todos los planos arquitectónicos, estructurales e hidrosanitarios cuentan con el **Pie de Plano Oficial** y los datos (nombre del proyecto, ubicación, propietario) coinciden estrictamente con las autorizaciones previas del predio?
        *   ¿Se declara el uso de la superficie excedente (ej. "Área no arrendada" o "Sin uso") en la Planta de Conjunto para que no interfiera con el polígono de impacto?
        *   ¿Se utiliza el término "Propietario" en lugar de nombres comerciales o "Arrendatario" en los planos para evitar confusiones legales en esta fase?
        *   ¿Se integra el recibo de pago del Impuesto Predial vigente (del año en curso)?
        *   En caso de personas morales o gestores, ¿el Acta Constitutiva y el Poder Notarial otorgan facultades suficientes al representante legal para actos de administración y coinciden con el objeto y giro del proyecto?
        *   Si el predio es rentado, ¿existe un Contrato de Arrendamiento vigente que coincida con la superficie solicitada para la licencia?
    *   **Alineamiento, Uso de Suelo y Número Oficial:**
        *   ¿Se cuenta con la Constancia de Alineamiento y Número Oficial vigente? (Generalmente tiene vigencia de 1 año y define las restricciones frontales del predio con la vía pública).
        *   ¿El proyecto cuenta con la Licencia o Constancia de Zonificación de Uso de Suelo favorable que acredite que el giro comercial, habitacional o industrial propuesto es compatible con el Programa de Desarrollo Urbano municipal?
        *   ¿El predio presenta alguna afectación por servidumbres de paso o derechos de vía federales, estatales o municipales (ej. ductos de PEMEX, líneas de CFE, cuerpos de agua de CONAGUA, vestigios del INAH) y cuenta con la constancia de no afectación respectiva?
    *   **Responsabilidad Pericial (Firmas Autorizadas):**
        *   ¿Toda la documentación técnica está firmada autógrafa y digitalmente por un Director Responsable de Obra (DRO) y por los Peritos Corresponsables (Estructural, Instalaciones, Diseño Urbano)?
        *   ¿Se comprueba que los registros de los peritos (DRO y Corresponsables) se encuentran vigentes ante la base de datos del municipio o del estado?
        *   ¿Los nombres de los directores gubernamentales y DRO en los pies de plano están actualizados a la fecha de ingreso del trámite?

    **II. ESPECIALIDAD ARQUITECTÓNICA Y URBANÍSTICA**
    *   **Cuadro de Áreas y Parámetros Urbanísticos:**
        *   ¿El Cuadro de Áreas está presente en algún plano proyecto? (Debe estar en la TOTALIDAD de las láminas arquitectónicas).
        *   ¿El proyecto respeta el Coeficiente de Ocupación del Suelo (COS)? ¿Se demuestra matemáticamente que la Superficie de Desplante dividida entre la Superficie Total del predio es menor o igual al COS legal permitido?
        *   ¿El proyecto respeta el Coeficiente de Utilización del Suelo (CUS)? ¿Se demuestra que la suma de todos los metros cuadrados de construcción dividida entre la superficie total no rebasa el CUS legal permitido?
        *   ¿Se cumple estrictamente con el porcentaje mínimo de Área Libre y Área Verde? ¿Se garantiza y evidencia en planos que el área verde es "jardinada" (con cobertura vegetal y especificación de tratamiento arbóreo) y no únicamente una superficie permeable?
        *   ¿Se cumple con la proporción de arbolado (ej. 1 árbol por cada 2 cajones) utilizando especies locales/nativas y respetando la **densidad de arbolado y especies permitidas** según la norma de ecología local?
        *   ¿La altura máxima de la edificación (desde el nivel medio de banqueta, incluyendo pretiles y anuncios adosados) es menor o igual a la permitida en el Certificado de Uso de Suelo?
    *   **Diseño de Estacionamientos e Imagen Urbana:**
        *   ¿El número total de cajones de estacionamiento cumple con el cálculo indicado en la Norma de Estacionamientos local (basado en los metros cuadrados de piso de ventas, aulas, habitaciones, etc.)?
        *   ¿Los cajones de estacionamiento están **correctamente acotados** en los planos (dimensiones de ancho y largo según reglamento)?
        *   ¿Se integran cajones para personas con discapacidad con sus dimensiones reglamentarias (ej. 1.60 x 2.00 m), señalización adecuada y ubicados lo más cerca posible del acceso principal?
        *   ¿Se cumple con la proporción de módulos de baños según los m2 de construcción o aforo proyectado (ej. 1 WC por cada X m²), verificando que el **conteo físico en planos** coincida con el requerimiento legal?
        *   ¿Las áreas de maniobras, carga y descarga están 100% contenidas dentro de la poligonal del predio para evitar conflictos en vía pública?
        *   ¿Se eliminaron del dibujo arquitectónico todos los elementos que estén fuera del límite de propiedad (simplificación administrativa)?
        *   ¿Las fachadas y cortes están libres de anuncios y publicidad comercial (para no confundir volumetría con licencias de anuncios)?
        *   ¿Se incluyen estudios de Imagen Urbana detallando restricciones de contexto (fachadas, anuncios espectaculares, toldos, mallasombras)?
        *   **Seguridad de Vida (Life-Safety):** Detecta en el plano arquitectónico que la puerta de salida de emergencia NO podrá estar junto a la entrada principal.
        *   **Elementos en Planos y Memorias (Datos Especiales):** Verifica la presencia explícita de los siguientes elementos e indica si el proyecto los contempla (para analizar si requieren permisos especiales locales): MALLASOMBRA, CONSULTORIO (con nota de cumplimiento de normas de salud), TOLDO AREA DE ASOCIADOS, SEÑALIZACIÓN INDUCTIVA, PANELES FOTOVOLTAICOS, RIEGO CON AGUA TRATADA, FARMACIA.

    **III. ESPECIALIDAD DE INGENIERÍAS (MEMORIAS Y CÁLCULOS)**
    *   **Mecánica de Suelos, Terracerías y Cálculo Estructural:**
        *   ¿Existe físicamente el Estudio de Mecánica de Suelos y está firmado por un especialista o laboratorio acreditado, definiendo claramente la capacidad de carga y las recomendaciones del nivel de desplante de la cimentación?
        *   ¿El **Plano de Terracerías** incluye una tabla detallada con los **volúmenes aproximados de corte, terraplén y movimiento de tierras**?
        *   ¿Se especifica el protocolo de suspensión temporal de excavaciones en caso de encontrar presencia de agua (nivel freático o escurrimientos)?
        *   ¿La Memoria de Cálculo Estructural define los códigos de diseño aplicables (Normas Técnicas Complementarias, CFE para sismo/viento, AISC, etc.)?
        *   ¿El modelo matemático de la estructura incluye todas las combinaciones de carga pertinentes: carga muerta, viva máxima e instantánea, sismo y viento?
        *   ¿Se justifica en la memoria que el índice de relación demanda/capacidad de las columnas, trabes, armaduras y contravientos es menor a 1.00?
        *   ¿Se verifican las distorsiones permisibles de entrepiso y deflexiones (Estados Límite de Servicio y de Falla), asegurando que cumplan normativas (ej. distorsión por sismo menor a 0.015)?
    *   **Factibilidad y Diseño Hidrosanitario y Pluvial:**
        *   ¿Se cuenta con el Dictamen u Oficio de Factibilidad de Agua Potable y Drenaje Sanitario emitido por el organismo operador municipal o estatal?
        *   ¿La Memoria de Cálculo Hidrosanitaria incluye explícitamente la frase "Cálculos basados en Normas de CONAGUA" o hace referencia a las NOM aplicables?
        *   ¿El proyecto y cálculo del Drenaje Pluvial justifican matemáticamente los caudales de diseño considerando los periodos de retorno pluvial correctos para la región, los coeficientes de escurrimiento y el área tributaria?
        *   ¿El tanque de tormentas o retención está ubicado fuera de las áreas de cesión o restricciones físicas (ej. derechos de vía de ductos de gas)?
        *   Si la zona carece de red de drenaje, ¿se incluye la memoria de diseño y autorización de una planta de tratamiento de aguas residuales o fosa séptica normada?
        *   ¿Se realizaron los cálculos hidráulicos y pluviales con el periodo de retorno TR correcto?
        *   ¿El proyecto cumple con el **Impacto Hidrológico Cero** (estabilidad del caudal de salida) requerido por el municipio o estado para evitar inundaciones aguas abajo? Si la normativa no es clara, emite una **Recomendación Preventiva** basada en las mejores prácticas de ingeniería pluvial.
    *   **Sistemas Eléctricos, Gas y Especiales:**
        *   ¿Se anexa el oficio de Factibilidad o Viabilidad emitido por la Comisión Federal de Electricidad (CFE) y/o el plano eléctrico autorizado en su punto de conexión?
        *   ¿Se evalúa la interferencia de postes de CFE/Telefonía con infraestructura existente (ej. ductos de gas) o se considera canalización subterránea para evitar invasión de derecho de vía?
        *   ¿La Memoria de Cálculo Eléctrico presenta los diagramas unifilares, el cálculo de caída de tensión y el reporte del estudio de resistividad del suelo?
        *   ¿La Memoria de Gas LP o natural incluye el trazado de líneas, caídas de presión (ej. mediante fórmula de Dr. Pole) y el cumplimiento de las normas energéticas vigentes?
        *   ¿Se anexan las memorias de ingeniería para Sistemas Especiales (Protección Contra Incendio, CCTV, Detección de Humos, Alarmas, Voz y Datos) requeridos por la magnitud del establecimiento comercial o industrial?
    *   **Estudios Complementarios:**
        *   ¿Existe Memoria Descriptiva de Demoliciones?
        *   ¿Existe Memoria Descriptiva de Ruptura de banquetas?
        *   ¿Existe Estudio de Permeabilidad?
        *   ¿Se especifica el tipo de impermeabilización y **material de cubierta** (ej. lámina Galvatec, concreto, etc.) y este cumple con los requisitos de materiales de la normativa local?

    **IV. DICTÁMENES ESPECIALES, IMPACTO Y VÍA PÚBLICA**
    *   **Compensación Arbórea y Medio Ambiente:**
        *   ¿El proyecto cumple con la **Compensación Arbórea** exigida por el Reglamento de Ecología de ${location.city}? (Ej. reposición de 3 a 10 árboles por cada uno removido).
        *   ¿Se especifica la paleta vegetal (especies nativas) y el plan de mantenimiento?
    *   **Impacto Ambiental y Protección Civil:**
        *   ¿Se integra el Resolutivo en Materia de Impacto Ambiental (Municipal o Estatal, según la magnitud o catalogación de riesgo del proyecto) aprobado por la autoridad competente?
        *   ¿Se incluye un Plan Integral de Manejo de Residuos (cartas para donar tierra de excavación, manifiestos de disposición final de escombro)?
        *   ¿Se contemplan permisos específicos para poda de raíz o tala si hay modificaciones geométricas en accesos que impacten individuos arbóreos?
        *   ¿El proyecto cuenta con la Anuencia, Estudio de Riesgo o Visto Bueno de Protección Civil estatal o municipal vigente?
    *   **Impacto Vial y Urbano:**
        *   ¿Se presentó y aprobó el Dictamen de Impacto Urbano y Vial detallando el aforo de vehículos, accesos, rampas, radios de giro, señalización (inductiva, horizontal y vertical) y las acciones de mitigación requeridas?
        *   ¿Los **puntos de aforo** del estudio vial cuentan con la **autorización explícita de la autoridad** correspondiente?
        *   ¿Los aforos viales y peatonales incluyen medición de ciclistas, cubren horarios extendidos (ej. 6:00 a 22:00) y se ubican en los puntos geográficos correctos?
        *   ¿Se requiere y existe Estudio de Impacto Urbano Estatal?
        *   ¿El proyecto contempla absorber modificaciones de urbanización en calles laterales o bahías de acceso exigidas por la autoridad de movilidad?
    *   **Vía Pública y Ruptura de Pavimentos:**
        *   ¿El proyecto cumple con la **Estructura de Pavimentos especial o mínima** (espesores de carpeta, base y sub-base) exigida por el municipio para trabajos sobre calles o avenidas impactadas?
        *   ¿Se tramitó el **Permiso de Ruptura de Pavimentos y Banquetas** para la totalidad de las acometidas (eléctrica, sanitaria, hidráulica, pluvial y telefonía)?
        *   ¿Existe un plano específico con los **volúmenes aproximados de producto de demolición** derivado de las rupturas en vía pública?
        *   ¿Los planos de rupturas viales están a escala detallada (ej. 1:100) e incluyen el diseño de "protección de obra y protección al peatón en banquetas"?
        *   ¿Se cubrió el pago de derechos y la Fianza de Vicios Ocultos requerida para garantizar que el Municipio reciba las banquetas y calles en óptimas condiciones y bajo la especificación del Ayuntamiento?
        *   ¿El diseño de banquetas considera la accesibilidad universal, rampas, anchos correctos y no presenta obstáculos (como escalones de acceso o registros fuera de norma)?

    **V. GESTIÓN Y FORMATOS DE ENTREGA**
    *   **Formatos Físicos:** ¿Los planos están impresos en el formato estándar normativo (ej. 90x60 cm), acotados, orientados y con el cuadro de firmas (pie de plano) completo? ¿Se cuenta con el **Reporte Fotográfico del estado actual** del predio?
    *   **Programa de Obra:** ¿Se está incluyendo el **calendario o programa de obra** detallado por etapas?
    *   **Identificación:** ¿Se presenta la carpeta ejecutiva en formato físico con separadores para cada dependencia (Desarrollo Urbano, Obra, COEPRIS, Medio Ambiente, etc.)?
    *   **Expediente Digital:** ¿El expediente está cargado en plataforma digital (como SharePoint) y contiene archivos en formato PDF, DWG, y especialmente archivos KMZ/KML con georreferenciación de coordenadas UTM para las bases catastrales? ¿Se menciona la entrega de localización en Maps y KMZ en memoria USB?
    *   **Consultores:** ¿Se requiere algún consultor especial según la normativa local o el tipo de proyecto?

    ### INSTRUCCIONES CRÍTICAS DE EXTRACCIÓN:
    1. **PROCESAMIENTO TOTAL OBLIGATORIO**: He proporcionado un "INVENTARIO DE DOCUMENTOS CARGADOS" al inicio de este prompt. Es OBLIGATORIO que analices CADA UNO de esos documentos. No puedes omitir ninguno. Si un documento del inventario no aparece en tus hallazgos, la auditoría se considerará fallida.
    2. **Análisis Multimodal Profundo (Planos y Cuadros de Datos)**: No te limites al texto corrido. Es OBLIGATORIO que leas y analices minuciosamente TODOS los cuadros de texto, solapas, pie de plano, tablas de especificaciones y notas en letra pequeña dentro de los PLANOS ARQUITECTÓNICOS Y ESTRUCTURALES. Muchos datos clave (superficies, nombres de propietarios, DRO, vigencias, uso de suelo) están ocultos dentro de estos bloques de datos en los márgenes de los planos.
    2. **Búsqueda Exhaustiva**: Si un documento parece no tener información a primera vista (como una memoria técnica o un plano), busca en los encabezados, pies de página y cuadros de resumen. Pon especial atención a las **Memorias Descriptivas**, ya que suelen contener las superficies, especificaciones técnicas y descripciones detalladas que otros documentos omiten.
    3. **Identificación de Cédulas Profesionales**: Busca imágenes o menciones de cédulas profesionales. Verifica que el número de cédula coincida con el nombre del firmante (DRO o Corresponsable).
    4. **Verificación de Cálculos**: Revisa las operaciones matemáticas en las memorias (ej. suma de áreas, cálculo de COS/CUS, factores de carga). Reporta si son correctos o si hay errores aritméticos o de criterio.
    5. **Precisión en Datos Clave**: Extrae CUALQUIER mención de nombres de proyecto, direcciones, representantes, superficies y firmantes de TODOS los documentos. Si hay discrepancias, regístralas en 'inconsistencias'.
    6. **Integridad del Reporte**: Debes incluir una entrada en 'datosClavePorDocumento' para CADA UNO de los documentos que te he proporcionado, sin omitir ninguno, incluso si no encuentras datos específicos (en ese caso deja el campo vacío pero incluye el nombre del documento).
    
    **MANDATO DE IDIOMA Y ORTOGRAFÍA (CRÍTICO):**
    - Todo el contenido generado DEBE estar en ESPAÑOL (MÉXICO).
    - Usa terminología técnica mexicana (ej. "banqueta" en lugar de "acera", "limpieza y despalme", "DRO", "pie de plano", "alcantarillado", "alumbrado público").
    - Revisa rigurosamente la ortografía y el uso de acentos. El reporte debe ser profesional y libre de errores gramaticales.

    Realiza un OCR y analiza el contenido junto con la normativa local. Extrae la información en el formato JSON especificado, estructurando tus hallazgos en las secciones correspondientes del JSON (inconsistencias, auditoriaCumplimiento, fichaMaestra, etc.) basándote en las reglas de negocio anteriores.`;

    const contents: { text?: string; inlineData?: { data: string; mimeType: string } }[] = [
        { text: analysisPrompt },
        { text: `CONTEXTO DE NORMATIVA LOCAL PARA ${location.city}, ${location.state}:\n${localRegulations}\n\n---CONTENIDO DE DOCUMENTOS (IMÁGENES POR PÁGINA)---` }
    ];

    let totalTextLength = 0;
    const MAX_TOTAL_TEXT_LENGTH = 2000000; // ~500k tokens

    const MAX_TOTAL_IMAGES = 400;

    const fetchImageAsBase64 = async (url: string): Promise<string> => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                resolve(base64.split(',')[1]); // Return only the base64 data
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    let totalImagesUsed = 0;

    // 1. Create a Document Inventory for the IA
    const docInventory = docs.map(d => `- ${d.name} (${d.pages.length} imágenes analizadas, texto completo incluido)`).join('\n');

    for (const doc of docs) {
        // 1. Add Text Content (with truncation if necessary)
        if (doc.textContent) {
            let textToAdd = sanitizeText(doc.textContent);
            if (totalTextLength + textToAdd.length > MAX_TOTAL_TEXT_LENGTH) {
                const allowedLength = Math.max(0, MAX_TOTAL_TEXT_LENGTH - totalTextLength);
                textToAdd = textToAdd.substring(0, allowedLength) + "\n[TEXTO TRUNCADO POR LÍMITE DE TAMAÑO]";
            }
            if (textToAdd.length > 0) {
                contents.push({ text: `--- TEXTO COMPLETO EXTRAÍDO DEL DOCUMENTO: ${doc.name} ---\n${textToAdd}\n--- FIN DEL TEXTO ---` });
                totalTextLength += textToAdd.length;
            }
        }

        // 2. Add Images (using all available pages as they are already quota-limited)
        if (doc.pages && doc.pages.length > 0) {
            for (let index = 0; index < doc.pages.length; index++) {
                const page = doc.pages[index];
                if (totalImagesUsed < MAX_TOTAL_IMAGES) {
                    contents.push({ text: `--- IMAGEN DE PÁGINA ${index + 1} DEL DOCUMENTO: ${doc.name} ---` });
                    
                    let imagePart = page;
                    if (!page.inlineData.data && page.storageUrl) {
                        try {
                            const base64Data = await fetchImageAsBase64(page.storageUrl);
                            imagePart = {
                                inlineData: {
                                    data: base64Data,
                                    mimeType: page.inlineData.mimeType
                                }
                            };
                        } catch (err) {
                            console.error(`Error fetching page ${index} from storage:`, err);
                            continue;
                        }
                    }
                    
                    contents.push(imagePart);
                    totalImagesUsed++;
                }
            }
        }
    }

    // Add inventory to prompt
    contents[0].text = `INVENTARIO DE DOCUMENTOS CARGADOS:\n${docInventory}\n\n${analysisPrompt}`;

    const response = await executeWithRetry(() => analysisModel({
        model: 'gemini-3.1-pro-preview',
        contents: { parts: contents },
        config: {
            responseMimeType: 'application/json',
            responseSchema: analysisSchema,
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        },
    }), 3, 20000) as { text: string };

    const analysisResult = JSON.parse(response.text) as AnalysisResult;
    return { analysis: analysisResult, sources: regulationSources, normativaReport: localRegulations };
};

export const getChatResponseStream = async (chatHistory: ChatMessage[], newQuery: string, context: string) => {
  const history = chatHistory.map(msg => ({
    role: msg.role,
    parts: [{text: msg.content}]
  }));

  const chat = ai.chats.create({
    model: 'gemini-3.1-pro-preview',
    history: history,
    config: {
        systemInstruction: `Eres 'Analytica AI Knowledge Assistant', un auditor experto de élite especializado en normatividad de construcción e ingenierías en México. 
        
Tu comportamiento debe ser similar a NotebookLM:
1. SÍNTESIS BASADA EN EVIDENCIA: Responde únicamente con la información proporcionada en el contexto de documentos y la base normativa. Si no hay información suficiente, admítelo.
2. CITACIÓN DE FUENTES: Siempre que menciones un dato, especifica de qué documento proviene (ej. "Según la Memoria Estructural..." o "En el plano C0-03...").
3. RIGOR TÉCNICO: Evalúa críticamente las discrepancias entre memorias de cálculo y planos.
4. TONO: Profesional, analítico y ejecutivo. 
5. IDIOMA: Español (México) técnico.

Si el usuario pregunta sobre algo no relacionado con el proyecto o la normatividad, redirígelo amablemente al análisis del proyecto.`
    }
  });
  
  const prompt = `--- CONTEXTO DE CONOCIMIENTO (DOCUMENTOS Y LEYES) ---\n${context}\n\n--- CONSULTA DEL USUARIO ---\n${newQuery}\n\nResponde basándote en el contexto anterior.`;

  return chat.sendMessageStream({ message: prompt });
};

// FIX: Add analyzeImage function to handle image analysis requests.
// Helper to convert File to Gemini Part
const fileToGenerativePart = (file: File): Promise<{inlineData: {data: string, mimeType: string}}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error("Could not read file as data URL."));
      }
      // The result includes the data URL prefix (e.g., "data:image/jpeg;base64,"), which needs to be removed.
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
    };
    reader.onerror = error => reject(error);
  });
}

export const analyzeImage = async (prompt: string, imageFile: File): Promise<string> => {
    const imagePart = await fileToGenerativePart(imageFile);
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [imagePart, textPart] },
    });

    return response.text;
};

export const getAddressInfo = async(address: string) => {
    const model = ai.models.generateContent;
    const response = await model({
        model: 'gemini-2.5-flash',
        contents: `Verifica esta dirección y dame un enlace de Google Maps: ${address}`,
        config: { tools: [{ googleMaps: {} }] },
    });
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
        text: response.text,
        sources: sources
    };
};