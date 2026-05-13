import { useForm, Link } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';

export default function ModuleForm({ moduleData, parentModules, isEdit = false }) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: moduleData?.name || '',
        slug: moduleData?.slug || '',
        route_name: moduleData?.route_name || '',
        icon: moduleData?.icon || 'ri-layout-grid-line',
        url: moduleData?.url || '',
        parent_id: moduleData?.parent_id || '',
        id_modulo_relacionamento: moduleData?.id_modulo_relacionamento || '',
        ordem: moduleData?.ordem || '',
        sort_order: moduleData?.sort_order || '',
        is_active: moduleData ? moduleData.is_active : true,
        show_in_menu: moduleData ? moduleData.show_in_menu : true,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.modules.update', moduleData.id));
        } else {
            post(route('admin.modules.store'));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Informações Iniciais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <InputLabel value="Nome do Módulo (Visível)" />
                        <TextInput
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 w-full"
                            required
                        />
                        <InputError message={errors.name} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel value="Chave Única (Slug)" />
                        <TextInput
                            type="text"
                            value={data.slug}
                            onChange={(e) => setData('slug', e.target.value)}
                            className="mt-1 w-full text-gray-500"
                            placeholder="Deixe em branco para auto-gerar"
                        />
                        <InputError message={errors.slug} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel value="Nome da Rota (Laravel)" />
                        <TextInput
                            type="text"
                            value={data.route_name}
                            onChange={(e) => setData('route_name', e.target.value)}
                            className="mt-1 w-full font-mono text-sm"
                            placeholder="ex: admin.users.index"
                        />
                        <InputError message={errors.route_name} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel value="URL Amigável" />
                        <TextInput
                            type="text"
                            value={data.url}
                            onChange={(e) => setData('url', e.target.value)}
                            className="mt-1 w-full font-mono text-sm inline-block"
                            placeholder="ex: /admin/configuracao/users"
                        />
                        <InputError message={errors.url} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel value="Ícone (Remix Icon)" />
                        <div className="flex gap-2 items-center mt-1">
                            <i className={`${data.icon} text-2xl text-gray-400 bg-gray-50 px-3 py-1.5 border rounded-lg`}></i>
                            <TextInput
                                type="text"
                                value={data.icon}
                                onChange={(e) => setData('icon', e.target.value)}
                                className="w-full flex-1"
                                placeholder="ri-icon-name"
                            />
                        </div>
                        <InputError message={errors.icon} className="mt-1" />
                        <p className="text-xs text-gray-400 mt-1">Busque em remixicon.com</p>
                    </div>

                    <div>
                        <InputLabel value="Módulo Pai (agrupador no menu)" />
                        <select
                            value={data.id_modulo_relacionamento || ''}
                            onChange={(e) => setData('id_modulo_relacionamento', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring-[#00b393] sm:text-sm"
                        >
                            <option value="">— Nenhum (módulo raiz) —</option>
                            {parentModules?.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                            Deixe vazio para criar um item raiz no menu. Selecione um pai para criar um sub-item.
                        </p>
                        <InputError message={errors.id_modulo_relacionamento} className="mt-1" />
                    </div>
                </div>

                <div className="mt-6 border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-4">
                        <label className="flex items-center cursor-pointer gap-2 w-fit">
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${data.is_active ? 'bg-[#00b393]' : 'bg-gray-300'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${data.is_active ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">Módulo Ativável no Sistema</span>
                        </label>
                        
                        <label className="flex items-center cursor-pointer gap-2 w-fit">
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={data.show_in_menu} onChange={(e) => setData('show_in_menu', e.target.checked)} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${data.show_in_menu ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${data.show_in_menu ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">Visível na Barra Lateral (Menu)</span>
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4">
                        <Link
                            href={route('admin.modules.index')}
                            className="px-6 py-2.5 rounded-lg font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none transition-colors"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className={`px-8 py-2.5 rounded-lg font-bold text-white shadow-md transition-all ${processing ? 'bg-gray-400 cursor-not-allowed hidden' : 'bg-[#00b393] hover:bg-[#008f75] hover:-translate-y-0.5 hover:shadow-lg'}`}
                        >
                            {isEdit ? 'Salvar Configurações' : 'Criar Módulo API'}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
