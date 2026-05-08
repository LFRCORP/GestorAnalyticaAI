
export interface Document {
  id: string;
  name: string;
  textContent: string;
  pages: {
    inlineData: {
      data: string;
      mimeType: string;
    };
    storageUrl?: string;
  }[];
  storageUrl?: string;
  fileSize?: number;
}

export interface DatoClave {
  valor: string;
  archivo: string;
  pagina: number;
}

export interface DatosClavePorDocumento {
  id?: string;
  nombreDocumento: string;
  datos: {
    nombreProyecto?: string;
    direccion?: string;
    representantes?: string;
    superficies?: string;
    firmantes?: string;
  };
}

export interface AnalysisResult {
  resumenGeneral: string;
  datosClave: {
    nombreProyecto: DatoClave[];
    direccion: DatoClave[];
    representantes: DatoClave[];
    superficies: DatoClave[];
    firmantes: DatoClave[];
  };
  inconsistencias: string[];
  comparacionNormativa: string;
  referencias: {
    archivo: string;
    pagina: number;
    texto: string;
  }[];
  documentosFaltantes: {
    pilar: string;
    documento: string;
    estado: 'faltante' | 'presente' | 'parcial';
    observacion?: string;
  }[];
  auditoriaCumplimiento: {
    categoria: string;
    subcategoria: string;
    estado: 'cumple' | 'no_cumple' | 'no_aplica';
    detalle: string;
  }[];
  conclusionesViabilidad: string;
  guiaAccion: string[];
  verificacionCalculos: {
    descripcion: string;
    estado: 'correcto' | 'error' | 'advertencia';
    detalles: string;
  }[];
  cuadroAreas?: {
    superficieTotalPredio: string;
    superficieArrendada: string;
    desgloseConstruccionNivel: string;
    cos: string;
    cus: string;
    superficieDesplante: string;
    areaLibre: string;
    areaVerde: string;
    estacionamientoCajonesNorma: string;
    areaCargaDescarga: string;
    alturaTienda: string;
    alturaAnuncio: string;
    datosDRO: string;
    requierePiePlanoEspecial: string;
    requiereConsultorEspecial: string;
  };
  checklistPlanosBasicos?: {
    categoria?: string;
    codigo: string;
    nombre: string;
    estado: 'presente' | 'faltante' | 'parcial';
    tieneFirmas: boolean;
    comentarioTecnico: string;
  }[];
  auditoriaTecnicaProfunda?: {
    disciplina: 'Geotecnia' | 'Estructural' | 'Hidrosanitaria' | 'Pluvial' | 'Contra Incendio' | 'Eléctrica' | 'Gas' | 'Otra';
    elementoRevisado: string;
    estado: 'correcto' | 'error_critico' | 'observacion_menor' | 'no_evaluable';
    hallazgo: string;
    riesgoOperativo: string;
    recomendacion: string;
  }[];
  datosClavePorDocumento: DatosClavePorDocumento[];
  fichaMaestra: {
    categoria: string;
    puntos: {
      nombre: string;
      estado: 'cumple' | 'no_cumple' | 'parcial' | 'no_aplica';
      hallazgo: string;
      normaReferencia: string;
      recomendacionArea: string;
    }[];
  }[];
}

export interface AnalysisRecord extends AnalysisResult {
    id: string;
    date: string;
    normativaReport?: string;
    normativaSources?: { web?: { uri: string; title?: string } }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export type UserRole = 'admin' | 'user' | 'hacedor';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  approved: boolean;
  createdAt: string;
}

export type ProjectVisibility = 'private' | 'public' | 'shared';

export interface Project {
  id: string;
  name: string;
  location: { city: string; state: string; };
  documents: Document[];
  analysisHistory: AnalysisRecord[];
  chatHistory: ChatMessage[];
  userId: string;
  visibility: ProjectVisibility;
  allowedUsers?: string[];
  createdAt: string;
  updatedAt: string;
}