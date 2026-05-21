import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { IMaskInput } from 'react-imask';
import { useState } from 'react';

export default function Edit({ obra, statuses, companies }) {
    const { data, setData, put, processing, errors } = useForm({
        company_id: obra.company_id || '',
        nome_fantasia: obra.nome_fantasia || '',
        razao_social: obra.razao_social || '',
        cnpj: obra.cnpj || '',
        code: obra.code || '',
        cep: obra.cep || '',
        endereco: obra.endereco || '',
        numero: obra.numero || '',
        complemento: obra.complemento || '',
        bairro: obra.bairro || '',
        cidade: obra.cidade || '',
        estado: obra.estado || '',
        email: obra.email || '',
        celular: obra.celular || '',
        status: obra.status || 'Ativa',
        started_at: obra.started_at ? obra.started_at.split('T')[0] : '',
        ended_at: obra.ended_at ? obra.ended_at.split('T')[0] : '',
    });

    const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
    const [cnpjError, setCnpjError] = useState('');

    const submit = (e) => {
        e.preventDefault();
        put(route('admin.obras.update', obra.id));
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

            setData(currentData => ({
                ...currentData,
                razao_social: apiData.razao_social || currentData.razao_social,
                nome_fantasia: apiData.nome_fantasia || apiData.razao_social || currentData.nome_fantasia,
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
        <AuthenticatedLayout header={`Editar Obra - ${obra.nome_fantasia}`}>
            <Head title={`Editar Obra - ${obra.nome_fantasia}`} />

            <div className="max-w-4xl bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                <form onSubmit={submit} className="space-y-8">
                    
                    {/* Seção 1: Dados Principais */}
                    <div>
                        <h4 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">Dados Principais</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Empresa Responsável</label>
                                <select 
                                    className={`${inputClasses} bg-gray-50`}
                                    value={data.company_id}
                                    onChange={e => setData('company_id', e.target.value)}
                                >
                                    <option value="" disabled>Selecione a Empresa...</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                {errors.company_id && <div className="mt-1 text-xs text-red-600 font-medium">{errors.company_id}</div>}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 flex justify-between">
                                    <span>CNPJ (Opcional)</span>
                                    {isSearchingCnpj && <span className="text-blue-500 font-medium animate-pulse text-xs">Consultando...</span>}
                                </label>
                                <div className="flex mt-2 shadow-sm rounded-lg relative">
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
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Código Interno (CEI / Centro de Custo)</label>
                                <input type="text" value={data.code} onChange={e => setData('code', e.target.value)} className={inputClasses} placeholder="Ex: OB-25" />
                                {errors.code && <div className="mt-1 text-xs text-red-600 font-medium">{errors.code}</div>}
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Nome Fantasia / Apelido da Obra *</label>
                                <input type="text" value={data.nome_fantasia} onChange={e => setData('nome_fantasia', e.target.value)} className={inputClasses} />
                                {errors.nome_fantasia && <div className="mt-1 text-xs text-red-600 font-medium">{errors.nome_fantasia}</div>}
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Razão Social</label>
                                <input type="text" value={data.razao_social} onChange={e => setData('razao_social', e.target.value)} className={inputClasses} />
                                {errors.razao_social && <div className="mt-1 text-xs text-red-600 font-medium">{errors.razao_social}</div>}
                            </div>
                        </div>
                    </div>

                    {/* Seção 2: Contato e Status */}
                    <div>
                        <h4 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">Contato & Status</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status *</label>
                                <select value={data.status} onChange={e => setData('status', e.target.value)} className={inputClasses}>
                                    {Object.entries(statuses).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                                </select>
                                {errors.status && <div className="mt-1 text-xs text-red-600 font-medium">{errors.status}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Data de Início</label>
                                <input type="date" value={data.started_at} onChange={e => setData('started_at', e.target.value)} className={inputClasses} />
                                {errors.started_at && <div className="mt-1 text-xs text-red-600 font-medium">{errors.started_at}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Data de Fim</label>
                                <input type="date" value={data.ended_at} onChange={e => setData('ended_at', e.target.value)} className={inputClasses} />
                                {errors.ended_at && <div className="mt-1 text-xs text-red-600 font-medium">{errors.ended_at}</div>}
                            </div>
                        </div>
                    </div>

                    {/* Seção 3: Endereço */}
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

                    <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
                        <Link href={route('admin.obras.index')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-[#60a5fa] rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors disabled:opacity-50"
                        >
                            {processing ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
