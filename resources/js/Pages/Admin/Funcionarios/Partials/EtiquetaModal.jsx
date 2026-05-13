import React, { useRef } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import html2canvas from 'html2canvas';

export default function EtiquetaModal({ isOpen, onClose, funcionario }) {
    const etiquetaRef = useRef(null);

    if (!isOpen || !funcionario) return null;

    const handlePrint = async () => {
        if (!etiquetaRef.current) return;
        try {
            const canvas = await html2canvas(etiquetaRef.current, { scale: 2 });
            const dataUrl = canvas.toDataURL('image/png');
            
            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Imprimir Etiqueta - ${funcionario.nome}</title>
                        <style>
                            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: white; }
                            @media print {
                                @page { size: auto; margin: 0mm; }
                                body { background-color: white; }
                            }
                        </style>
                    </head>
                    <body>
                        <img src="${dataUrl}" style="width: 120mm; height: 45mm;" />
                        <script>
                            window.onload = function() {
                                setTimeout(function() {
                                    window.print();
                                    window.close();
                                }, 500);
                            };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            console.error('Erro ao gerar imagem:', error);
            alert('Falha ao gerar a etiqueta para impressão.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Etiqueta do Funcionário
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 flex justify-center bg-gray-50 overflow-x-auto">
                    {/* Etiqueta Preview (120mm x 45mm ~ 453px x 170px) */}
                    <div 
                        ref={etiquetaRef}
                        className="bg-white border border-gray-300 shadow-sm flex"
                        style={{ width: '453px', height: '170px', boxSizing: 'border-box' }}
                    >
                        {/* QRCode Column */}
                        <div className="w-1/3 flex items-center justify-center border-r border-gray-100 p-2">
                            <QRCode 
                                value={`https://sga-engeativos.com.br/detalhes/funcionario/${funcionario.id}`} 
                                size={120} 
                                level={"H"} 
                                includeMargin={false} 
                            />
                        </div>
                        {/* Information Column */}
                        <div className="w-2/3 flex flex-col justify-center p-4">
                            <h5 className="mb-2 font-bold text-gray-900 text-lg leading-tight truncate">
                                {funcionario.nome}
                            </h5>
                            <p className="mb-3 text-gray-600 font-medium text-sm truncate">
                                Função: <span className="text-gray-800">{funcionario.funcao?.funcao || 'N/A'}</span>
                            </p>
                            <div className="mt-auto flex items-end justify-between">
                                <p className="text-blue-600 font-bold text-xs tracking-wide">
                                    www.engetecnica.com.br
                                </p>
                                <span className="text-xs text-gray-400 font-medium">Mat: {funcionario.matricula || '---'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                        Cancelar
                    </button>
                    <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Imprimir Etiqueta
                    </button>
                </div>
            </div>
        </div>
    );
}
