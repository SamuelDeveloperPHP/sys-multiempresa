import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { IMaskInput } from 'react-imask';
import { useState } from 'react';

export default function Edit({ company }) {
    const { data, setData, put, processing, errors } = useForm({
        name: company.name || '',
        nome_fantasia: company.nome_fantasia || '',
        razao_social: company.razao_social || '',
        cnpj: company.cnpj || '',
        cep: company.cep || '',
        endereco: company.endereco || '',
        numero: company.numero || '',
        complemento: company.complemento || '',
        bairro: company.bairro || '',
        cidade: company.cidade || '',
        estado: company.estado || '',
        email: company.email || '',
        celular: company.celular || '',
        is_active: company.is_active ?? true,
    });

    const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
    const [cnpjError, setCnpjError] = useState('');

    const submit = (e) => {
        e.preventDefault();
        put(route('companies.update', company.id));
    };

    const fetchCnpj = async () => {
        const cleanCnpj = data.cnpj.replace(/\D/g, '');
        if (cleanCnpj.length !== 14) {
            setCnpjError('O CNPJ deve ter 14 dígitos.');
            return;
        }

        setIsSearchingCnpj(true);
        setCnpjError('');

        try {
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
            if (!response.ok) {
                throw new Error('CNPJ inválido ou não encontrado na Receita.');
            }
            const apiData = await response.json();

            const fetchedNomeFantasia = apiData.nome_fantasia || apiData.razao_social || currentData.nome_fantasia;

            setData(currentData => ({
                ...currentData,
                razao_social: apiData.razao_social || currentData.razao_social,
                nome_fantasia: fetchedNomeFantasia,
                name: currentData.name || fetchedNomeFantasia, 
                cep: apiData.cep ? apiData.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2") : currentData.cep,
                endereco: (apiData.tipo_logradouro && apiData.logradouro) ? `${apiData.tipo_logradouro} ${apiData.logradouro}` : currentData.endereco,
                numero: apiData.numero || currentData.numero,
                complemento: apiData.complemento || currentData.complemento,
                bairro: apiData.bairro || currentData.bairro,
                cidade: apiData.municipio || currentData.cidade,
                estado: apiData.uf || currentData.estado,
                celular: apiData.ddd_telefone_1 ? apiData.ddd_telefone_1.replace(/\s+/g, '') : currentData.celular,
            }));
            
        } catch (err) {
            setCnpjError(err.message);
        } finally {
            setIsSearchingCnpj(false);
        }
    };

    const inputClasses = "mt-2 block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] px-3 py-2 text-sm";
    
    return (
        <AuthenticatedLayout header={`Editar Empresa - ${company.name}`}>
            <Head title={`Editar Empresa - ${company.name}`} />

            <div className="max-w-4xl bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                <form onSubmit={submit} className="space-y-8">
                    
                    {/* Seção 1: Dados Principais */}
                    <div>
                        <h4 className="flex justify-between items-center text-base font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">
                            <span>Dados Principais da Empresa</span>
                            <div className="flex items-center">
                                <input 
                                    type="checkbox" 
                                    id="is_active"
                                    checked={data.is_active}
                                    onChange={e => setData('is_active', e.target.checked)}
                                    className="w-4 h-4 text-[#557bbb] bg-gray-100 border-gray-300 rounded focus:ring-[#557bbb] cursor-pointer"
                                />
                                <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                                    Empresa Ativa
                                </label>
                            </div>
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 flex justify-between">
                                    <span>CNPJ</span>
                                    {isSearchingCnpj && <span className="text-blue-500 font-medium animate-pulse text-xs">Consultando...</span>}
                                </label>
                                <div className="flex mt-2 shadow-sm rounded-lg relative max-w-sm">
                                    <IMaskInput
                                        mask="00.000.000/0000-00"
                                        value={data.cnpj}
                                        unmask={false}
                                        onAccept={(value) => setData('cnpj', value)}
                                        className="flex-1 block w-full border border-gray-300 rounded-l-lg focus:ring-[#557bbb] focus:border-[#557bbb] px-3 py-2 text-sm"
                                        placeholder="00.000.000/0000-00"
                                    />
                                    <button 
                                        type="button"
                                        onClick={fetchCnpj}
                                        disabled={isSearchingCnpj}
                                        className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
                                    >
                                        Consultar
                                    </button>
                                </div>
                                {cnpjError && <div className="mt-1 text-xs text-red-600 font-medium">{cnpjError}</div>}
                                {errors.cnpj && <div className="mt-1 text-xs text-red-600 font-medium">{errors.cnpj}</div>}
                            </div>
                            
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Nome Principal do Sistema *</label>
                                <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className={inputClasses} required />
                                {errors.name && <div className="mt-1 text-xs text-red-600 font-medium">{errors.name}</div>}
                            </div>
                            
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Nome Fantasia Real</label>
                                <input type="text" value={data.nome_fantasia} onChange={e => setData('nome_fantasia', e.target.value)} className={inputClasses} />
                                {errors.nome_fantasia && <div className="mt-1 text-xs text-red-600 font-medium">{errors.nome_fantasia}</div>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Razão Social</label>
                                <input type="text" value={data.razao_social} onChange={e => setData('razao_social', e.target.value)} className={inputClasses} />
                                {errors.razao_social && <div className="mt-1 text-xs text-red-600 font-medium">{errors.razao_social}</div>}
                            </div>
                        </div>
                    </div>

                    {/* Seção 2: Endereço */}
                    <div>
                        <h4 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">Localização</h4>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">CEP</label>
                                <IMaskInput
                                    mask="00000-000"
                                    value={data.cep}
                                    unmask={false}
                                    onAccept={(value) => setData('cep', value)}
                                    className={inputClasses}
                                    placeholder="00000-000"
                                />
                                {errors.cep && <div className="mt-1 text-xs text-red-600 font-medium">{errors.cep}</div>}
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-sm font-medium text-gray-700">Endereço (Rua, Av)</label>
                                <input type="text" value={data.endereco} onChange={e => setData('endereco', e.target.value)} className={inputClasses} />
                                {errors.endereco && <div className="mt-1 text-xs text-red-600 font-medium">{errors.endereco}</div>}
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Número</label>
                                <input type="text" value={data.numero} onChange={e => setData('numero', e.target.value)} className={inputClasses} />
                                {errors.numero && <div className="mt-1 text-xs text-red-600 font-medium">{errors.numero}</div>}
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-sm font-medium text-gray-700">Complemento</label>
                                <input type="text" value={data.complemento} onChange={e => setData('complemento', e.target.value)} className={inputClasses} />
                                {errors.complemento && <div className="mt-1 text-xs text-red-600 font-medium">{errors.complemento}</div>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Bairro</label>
                                <input type="text" value={data.bairro} onChange={e => setData('bairro', e.target.value)} className={inputClasses} />
                                {errors.bairro && <div className="mt-1 text-xs text-red-600 font-medium">{errors.bairro}</div>}
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700">Cidade</label>
                                <input type="text" value={data.cidade} onChange={e => setData('cidade', e.target.value)} className={inputClasses} />
                                {errors.cidade && <div className="mt-1 text-xs text-red-600 font-medium">{errors.cidade}</div>}
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">UF</label>
                                <input type="text" maxLength="2" value={data.estado} onChange={e => setData('estado', e.target.value.toUpperCase())} className={`${inputClasses} uppercase`} placeholder="UF" />
                                {errors.estado && <div className="mt-1 text-xs text-red-600 font-medium">{errors.estado}</div>}
                            </div>
                        </div>
                    </div>

                    {/* Seção 3: Contato */}
                    <div>
                        <h4 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">Contato Institucional</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">E-mail</label>
                                <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className={inputClasses} />
                                {errors.email && <div className="mt-1 text-xs text-red-600 font-medium">{errors.email}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Celular / Telefone</label>
                                <IMaskInput
                                    mask={[{ mask: '(00) 0000-0000' }, { mask: '(00) 00000-0000' }]}
                                    value={data.celular}
                                    unmask={false}
                                    onAccept={(value) => setData('celular', value)}
                                    className={inputClasses}
                                    placeholder="(11) 99999-9999"
                                />
                                {errors.celular && <div className="mt-1 text-xs text-red-600 font-medium">{errors.celular}</div>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
                        <Link href={route('companies.index')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 shadow-sm transition-colors disabled:opacity-50"
                        >
                            {processing ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
