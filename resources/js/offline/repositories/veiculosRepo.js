// resources/js/offline/repositories/veiculosRepo.js
// -----------------------------------------------------------------------------
// Repositório de Veículos. Veículos são read-only no mobile (o cadastro fica
// no admin web). Aqui implementamos apenas:
//   - syncFromServer()   : busca lista do servidor e popula cache local
//   - syncOne(id)        : busca detalhe + preventivas e atualiza cache
//   - list(query, page)  : lê do cache local (sempre)
//   - find(id)           : lê do cache local (sempre)
// -----------------------------------------------------------------------------

import db, { setLastSync } from '../db';
import apiClient from '../api/client';
import ENDPOINTS from '../api/endpoints';

const PAGE_SIZE = 20;

// -----------------------------------------------------------------------------
// SYNC: baixa a lista completa do servidor para o cache local
// -----------------------------------------------------------------------------
export async function syncFromServer() {
    const { data } = await apiClient.get(ENDPOINTS.veiculos.list);
    const veiculos = data?.veiculos || data?.data || [];

    await db.transaction('rw', db.veiculos, async () => {
        await db.veiculos.clear();
        if (veiculos.length) {
            await db.veiculos.bulkPut(veiculos);
        }
    });
    await setLastSync('veiculos');
    return veiculos.length;
}

// -----------------------------------------------------------------------------
// SYNC ONE: detalhe + preventivas
// -----------------------------------------------------------------------------
export async function syncOne(id) {
    const { data } = await apiClient.get(ENDPOINTS.veiculos.show(id));
    const veiculo = data?.veiculo || data?.data || data;
    const preventivasItens = data?.preventivas_itens || [];
    const servicosPreventiva = data?.servicos_preventiva || [];

    await db.transaction('rw',
        [db.veiculos, db.preventivas_itens, db.servicos_preventiva],
        async () => {
            if (veiculo?.id) {
                await db.veiculos.put(veiculo);
            }
            // Limpa preventivas antigas desse veículo e re-insere
            await db.preventivas_itens.where('veiculo_id').equals(Number(id)).delete();
            await db.servicos_preventiva.where('veiculo_id').equals(Number(id)).delete();
            if (preventivasItens.length) {
                await db.preventivas_itens.bulkPut(
                    preventivasItens.map(p => ({ ...p, veiculo_id: Number(id) }))
                );
            }
            if (servicosPreventiva.length) {
                await db.servicos_preventiva.bulkPut(
                    servicosPreventiva.map(s => ({ ...s, veiculo_id: Number(id) }))
                );
            }
        }
    );
    await setLastSync(`veiculo:${id}`);

    return {
        veiculo,
        preventivas_itens: preventivasItens,
        servicos_preventiva: servicosPreventiva,
        medicaoAtual: data?.medicaoAtual ?? null,
    };
}

// -----------------------------------------------------------------------------
// LIST: lê do cache local com busca por prefixo
// -----------------------------------------------------------------------------
export async function list({ query = '', page = 0 } = {}) {
    const q = String(query || '').trim().toUpperCase();
    let coll = db.veiculos.orderBy('prefixo');

    if (q) {
        coll = db.veiculos.filter(v => {
            const prefixo = String(v.prefixo || '').toUpperCase();
            const placa = String(v.placa || '').toUpperCase();
            const marca = String(v.marca || '').toUpperCase();
            const modelo = String(v.modelo || '').toUpperCase();
            return prefixo.includes(q) || placa.includes(q) || marca.includes(q) || modelo.includes(q);
        });
    }

    const total = await coll.count();
    const offset = page * PAGE_SIZE;
    const items = await coll.offset(offset).limit(PAGE_SIZE).toArray();

    return {
        items,
        total,
        page,
        hasMore: offset + items.length < total,
    };
}

// -----------------------------------------------------------------------------
// FIND: lê detalhe do cache local
// -----------------------------------------------------------------------------
export async function find(id) {
    const veiculo = await db.veiculos.get(Number(id));
    if (!veiculo) return null;
    const preventivasItens = await db.preventivas_itens.where('veiculo_id').equals(Number(id)).toArray();
    const servicosPreventiva = await db.servicos_preventiva.where('veiculo_id').equals(Number(id)).toArray();
    return {
        veiculo,
        preventivas_itens: preventivasItens,
        servicos_preventiva: servicosPreventiva,
    };
}

// -----------------------------------------------------------------------------
// Processamento de Preventivas (mesma lógica do app legado React Native)
// -----------------------------------------------------------------------------
export function processarPreventivas(veiculo, preventivasItens = [], servicosPreventiva = [], medicaoAtual = 0) {
    if (!preventivasItens || preventivasItens.length === 0) return [];

    const formatarData = (isoDate) => {
        if (!isoDate || isoDate === '0000-00-00' || isoDate === '0000-00-00 00:00:00') return '--';
        const [y, m, d] = isoDate.split(' ')[0].split('-');
        if (!y || !m || !d) return '--';
        return `${d}/${m}/${y}`;
    };

    const grouped = preventivasItens.reduce((acc, item) => {
        const p = Number(item.periodo_maq_vei) || 0;
        if (!acc[p]) acc[p] = [];
        acc[p].push(item);
        return acc;
    }, {});

    const periodos = Object.keys(grouped).map(Number).sort((a, b) => a - b);
    const statusDosCiclos = {};
    const ciclosLiberados = [];

    periodos.forEach((periodo) => {
        let alvoDesseCiclo = periodo;
        const ultimaExec = servicosPreventiva.find((manut) => {
            const perDb = veiculo.tipo_hr == 1 ? manut.campo_cal_hr : manut.campo_calc_km;
            return Number(perDb) === periodo;
        });

        let dataUltima = '--';
        let dataVencimento = '--';

        if (ultimaExec) {
            alvoDesseCiclo = veiculo.tipo_hr == 1
                ? ultimaExec.horimetro_proximo
                : ultimaExec.quilometragem_nova;
            if (ultimaExec.data_conclusao) dataUltima = formatarData(ultimaExec.data_conclusao);
            if (ultimaExec.data_de_vencimento) dataVencimento = formatarData(ultimaExec.data_de_vencimento);
        }

        const margem = veiculo.tipo_hr == 1 ? 100 : 1500;
        const distanciaAteAlvo = alvoDesseCiclo - medicaoAtual;
        let liberado = false;
        if (distanciaAteAlvo <= margem) {
            liberado = true;
            ciclosLiberados.push(periodo);
        }
        statusDosCiclos[periodo] = {
            distancia: distanciaAteAlvo,
            liberado,
            ultima: ultimaExec,
            alvo: alvoDesseCiclo,
            dataVencimento,
            dataUltima,
        };
    });

    const cicloMestre = ciclosLiberados.length ? Math.max(...ciclosLiberados) : null;

    return periodos.map((periodo) => {
        const st = statusDosCiclos[periodo];
        let liberado = st.liberado;
        let textoBloqueio = '';

        if (liberado) {
            if (periodo === cicloMestre) {
                textoBloqueio = null;
            } else {
                liberado = false;
                textoBloqueio = `Realize a OS de ${cicloMestre.toLocaleString('pt-BR')}`;
            }
        } else {
            const statusExcedido = st.distancia < 0
                ? `Excedido em ${Math.abs(st.distancia).toLocaleString('pt-BR')}`
                : `Faltam ${st.distancia.toLocaleString('pt-BR')}`;
            textoBloqueio = `${statusExcedido} ${veiculo.tipo_hr == 1 ? 'hr' : 'km'}`;
        }

        let progresso = 0;
        if (st.ultima) {
            const baseKm = veiculo.tipo_hr == 1
                ? Number(st.ultima.horimetro_atual || 0)
                : Number(st.ultima.quilometragem_atual || 0);
            const totalPercorrer = st.alvo - baseKm;
            const jaPercorrido = medicaoAtual - baseKm;
            if (totalPercorrer > 0) progresso = (jaPercorrido / totalPercorrer) * 100;
        } else if (periodo > 0) {
            progresso = (medicaoAtual / periodo) * 100;
        }
        progresso = Math.min(100, Math.max(0, progresso));

        let cor = '#22c55e';
        if (progresso >= 90) cor = '#eab308';
        if (progresso >= 100 || st.distancia <= 0) cor = '#ef4444';
        if (liberado) cor = '#22c55e';

        return {
            periodo,
            distancia: st.distancia,
            liberado,
            alvo: st.alvo,
            dataUltima: st.dataUltima,
            dataVencimento: st.dataVencimento,
            progresso,
            textoBloqueio,
            cor,
        };
    });
}

export default { syncFromServer, syncOne, list, find, processarPreventivas };
