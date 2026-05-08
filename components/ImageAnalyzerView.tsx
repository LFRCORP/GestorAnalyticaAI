
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertCircle, Sparkles, Upload } from 'lucide-react';
import { analyzeImage } from '../services/geminiService';
import Spinner from './Spinner';

const ImageAnalyzerView: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
            setAnalysis('');
            setError(null);
        }
    };

    const handleAnalyze = async () => {
        if (!prompt || !imageFile) {
            setError('Por favor, proporciona una imagen y una pregunta o instrucción.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysis('');
        try {
            const result = await analyzeImage(prompt, imageFile);
            setAnalysis(result);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-slate-200 mb-6">Analizador de Imágenes con Gemini</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Panel */}
                <div className="bg-slate-800 rounded-lg p-6 space-y-4">
                    <div>
                        <label htmlFor="image-upload" className="block text-sm font-medium text-slate-300 mb-2">1. Sube una imagen</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div className="flex text-sm text-slate-500">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-cyan-400 hover:text-cyan-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 focus-within:ring-cyan-500">
                                        <span className="flex items-center gap-2">
                                            <Upload className="h-4 w-4" />
                                            Sube un archivo
                                        </span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                                    </label>
                                    <p className="pl-1">o arrástralo aquí</p>
                                </div>
                                <p className="text-xs text-slate-600">PNG, JPG, GIF hasta 10MB</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-slate-300 mb-2">2. Escribe tu pregunta o instrucción</label>
                        <textarea
                            id="prompt"
                            rows={4}
                            className="w-full bg-slate-700 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ej: ¿Qué elementos ves en esta imagen? Describe la arquitectura del edificio. Crea un título para esta foto."
                        />
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !imageFile || !prompt}
                        className="w-full flex justify-center items-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-slate-700 disabled:text-slate-500 transition-all active:scale-[0.98] shadow-lg shadow-cyan-900/20"
                    >
                        {isLoading ? <><Spinner size="5" /><span className="ml-2">Analizando...</span></> : <><Sparkles className="h-5 w-5 mr-2" /><span>Analizar Imagen</span></>}
                    </button>
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Output Panel */}
                <div className="bg-slate-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-slate-300 mb-4">Resultados</h3>
                    <div className="space-y-4">
                        {imageUrl && (
                            <div>
                                <h4 className="text-sm font-medium text-slate-400 mb-2">Imagen Cargada</h4>
                                <img src={imageUrl} alt="Uploaded preview" className="rounded-lg max-h-64 mx-auto" />
                            </div>
                        )}
                        {isLoading && (
                             <div className="flex flex-col items-center justify-center text-slate-400">
                                <Spinner size="8"/>
                                <p className="mt-2">Gemini está pensando...</p>
                             </div>
                        )}
                        {analysis && (
                            <div>
                                <h4 className="text-sm font-medium text-slate-400 mb-2">Análisis de Gemini</h4>
                                <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{analysis}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                        {!isLoading && !analysis && !imageUrl && (
                            <div className="text-center text-slate-500 py-10">
                                <p>Sube una imagen y haz una pregunta para ver el análisis aquí.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageAnalyzerView;
