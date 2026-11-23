import { getMeta } from './db';

export const permissionKey = 'module_permissions';
const tables = {
    abastecimentos: 'frota.abastecimentos',
    diario_bordo: 'frota.diario',
    checklist_servicos: 'frota.checklist-execucoes',
};

export function allows(grants, slug, ability) {
    return Array.isArray(grants) && grants.some(row => row.slug === slug && row['can_' + ability] === true);
}

export async function requireLocalAction(table, ability) {
    if (!allows(await getMeta(permissionKey), tables[table], ability)) {
        throw new Error('Seu usuário não tem permissão para esta operação na empresa.');
    }
}

export function allowsPage(grants, component) {
    if (!Array.isArray(grants)) return false;
    if (component.startsWith('Mobile/Perfil/')) return true;
    if (component === 'Mobile/Dashboard/Index') {
        return Object.values(tables).every(slug => allows(grants, slug, 'list'));
    }

    const segments = component.split('/');
    const action = { Index: 'list', Show: 'view', Create: 'create', Edit: 'edit', Close: 'edit' }[segments.at(-1)];
    const module = {
        Veiculos: 'veiculos', Abastecimento: 'abastecimentos', Abastecimentos: 'abastecimentos',
        DiarioBordo: 'diario', Checklists: 'checklist-execucoes', ChecklistFrota: 'checklists',
        Servicos: 'checklist-execucoes', Locacoes: 'locacoes',
    }[segments.at(-2)];
    if (!action || !module || !allows(grants, 'frota.' + module, action)) return false;
    if (segments.includes('ChecklistFrota') && action === 'list' && !allows(grants, tables.checklist_servicos, 'list')) return false;
    return true;
}
