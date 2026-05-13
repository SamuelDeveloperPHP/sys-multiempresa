import React, { useRef } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import html2canvas from 'html2canvas';

export default function CrachaModal({ isOpen, onClose, funcionario }) {
    const crachaRef = useRef(null);

    if (!isOpen || !funcionario) return null;

    const handleDownload = async () => {
        if (!crachaRef.current) return;
        try {
            const canvas = await html2canvas(crachaRef.current, { scale: 2 });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `cracha_${funcionario.nome.replace(/\s+/g, '_')}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Erro ao gerar imagem:', error);
            alert('Falha ao gerar o crachá.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                        Gerador de Crachá
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 flex justify-center bg-gray-50">
                    {/* Crachá Preview */}
                    <div 
                        ref={crachaRef}
                        className="relative bg-white shadow-sm border border-gray-200 overflow-hidden"
                        style={{ width: '320px', height: '503px' }} // Scale down by half from 640x1006 for preview, but html2canvas will render it based on scale: 2
                    >
                        {/* Fake Background since we don't have the image */}
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-600 to-blue-800"></div>
                        <div className="absolute inset-x-0 top-0 h-1/3 bg-white/10"></div>
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-white"></div>
                        
                        <div className="absolute inset-0 flex flex-col items-center pt-8 px-4">
                            {/* Logo ou Nome da Empresa */}
                            <h2 className="text-white font-bold text-xl tracking-wider mb-6">ENGETÉCNICA</h2>

                            {/* Foto */}
                            <div className="w-32 h-32 bg-gray-200 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-4xl font-bold text-gray-400 mb-6 z-10">
                                {funcionario.nome.charAt(0)}
                            </div>

                            {/* Nome */}
                            <h3 className="text-white font-bold text-2xl text-center uppercase tracking-wide px-2 drop-shadow-md" style={{ lineHeight: '1.2' }}>
                                {funcionario.nome}
                            </h3>
                            
                            {/* Função */}
                            <p className="text-blue-100 font-medium text-lg text-center mt-2 px-4 drop-shadow-md">
                                {funcionario.funcao?.funcao || 'N/A'}
                            </p>
                            
                            {/* Setor */}
                            <p className="text-white/80 font-semibold text-sm text-center mt-1">
                                {funcionario.setor?.nome_setor || 'N/A'}
                            </p>
                        </div>

                        {/* Footer Branco com QR Code e detalhes menores */}
                        <div className="absolute bottom-0 inset-x-0 bg-white h-24 flex items-center justify-between px-6 border-t border-gray-200">
                            <div className="flex flex-col text-xs text-gray-600 font-medium">
                                <span className="mb-1 text-gray-400">Matrícula</span>
                                <span className="font-bold text-gray-800 text-sm">{funcionario.matricula || '---'}</span>
                            </div>
                            <div className="p-1 bg-white border border-gray-200 shadow-sm rounded">
                                <QRCode 
                                    value={`https://sga-engeativos.com.br/detalhes/funcionario/${funcionario.id}`} 
                                    size={60} 
                                    level={"H"} 
                                    includeMargin={false} 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                        Fechar
                    </button>
                    <button onClick={handleDownload} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Baixar Crachá
                    </button>
                </div>
            </div>
        </div>
    );
}
