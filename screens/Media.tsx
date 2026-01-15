import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { api } from '../services/api';

interface MediaAsset {
    id: string;
    job_id: string;
    type: string;
    url: string;
    remote_url: string;
    theme_pt: string;
    created_at: string;
}

interface MediaProps {
    onNavigate: (screen: Screen) => void;
}

const Media: React.FC<MediaProps> = ({ onNavigate }) => {
    const [media, setMedia] = useState<MediaAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<MediaAsset | null>(null);

    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        setIsLoading(true);
        try {
            const data = await api.getMedia();
            setMedia(data);
        } catch (error) {
            console.error('Failed to fetch media', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getFullUrl = (url: string) => {
        const base = (window as any).API_BASE || 'http://localhost:3000';
        return url.startsWith('http') ? url : `${base.replace('/api', '')}${url}`;
    };

    return (
        <div className="flex flex-col h-screen bg-background-dark text-white">
            <header className="sticky top-0 z-50 flex items-center justify-between bg-background-dark/95 backdrop-blur-md px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate(Screen.DASHBOARD)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined">arrow_back_ios_new</span>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Galeria de Mídia</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Generated Assets</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white/5 px-4 py-2 rounded-full text-[10px] font-bold text-slate-400">
                        {media.length} ITENS
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 no-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {media.length === 0 && (
                            <div className="col-span-full text-center py-20 opacity-30">
                                <span className="material-symbols-outlined text-6xl mb-4">image_not_supported</span>
                                <p>Nenhuma imagem gerada ainda.</p>
                            </div>
                        )}
                        {media.map((item) => (
                            <div
                                key={item.id}
                                className="group relative aspect-square rounded-2xl overflow-hidden bg-surface-dark border border-white/5 cursor-pointer hover:border-primary/50 transition-all"
                                onClick={() => setSelectedImage(item)}
                            >
                                <img
                                    src={getFullUrl(item.url)}
                                    alt={item.theme_pt}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                    <p className="text-[10px] font-bold text-white truncate">{item.theme_pt}</p>
                                    <p className="text-[8px] text-slate-400 uppercase tracking-tighter">{item.type}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Lightbox */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-5xl w-full flex flex-col items-center">
                        <img
                            src={getFullUrl(selectedImage.url)}
                            alt={selectedImage.theme_pt}
                            className="max-h-[80vh] rounded-3xl shadow-2xl border border-white/10"
                        />
                        <div className="mt-8 text-center">
                            <h2 className="text-xl font-bold">{selectedImage.theme_pt}</h2>
                            <div className="flex items-center justify-center gap-4 mt-2">
                                <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full text-slate-300 font-bold uppercase tracking-widest">{selectedImage.type}</span>
                                <span className="text-[10px] text-slate-500">{new Date(selectedImage.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex gap-4 mt-8">
                                <a
                                    href={getFullUrl(selectedImage.url)}
                                    download
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-2xl text-xs font-black flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">download</span>
                                    DOWNLOAD
                                </a>
                                <button
                                    onClick={() => setSelectedImage(null)}
                                    className="bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-2xl text-xs font-black"
                                >
                                    FECHAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Media;
