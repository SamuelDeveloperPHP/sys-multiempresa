<?php

namespace App\Services\Frota;

/**
 * Sugere um layout de pneus (slug de config/frota_pneus.php) a partir do texto
 * livre de veiculos.veiculo + veiculos.modelo. Heuristica por palavra-chave —
 * é apenas SUGESTAO (o gerente confirma). Retorna null quando ambiguo ou quando
 * o ativo nao tem pneu rodoviario (esteira/estacionario/implemento).
 *
 * Ordem importa: "retro" antes de "escavadeira" (retroescavadeira usa 4 pneus,
 * escavadeira/mini-escavadeira sao de esteira).
 */
class SugeridorLayoutPneu
{
    public function sugerir(?string $veiculo, ?string $modelo): ?string
    {
        $h = mb_strtolower(trim(($veiculo ?? '') . ' ' . ($modelo ?? '')));
        if ($h === '') {
            return null;
        }
        $tem = fn (string ...$ks) => array_reduce($ks, fn ($c, $k) => $c || str_contains($h, $k), false);

        // Maquinas de 4 pneus (antes de "escavadeira")
        if ($tem('retro')) return 'maquina_4_pneus';
        if ($tem('mini carreg', 'carregadeira', 'skid', 's510', 's570', 'bobcat s')) return 'maquina_4_pneus';
        if ($tem('trator de pneu', 'mf-4305', 'mf4305')) return 'maquina_4_pneus';

        // Sem pneu rodoviario -> sem sugestao (fica em branco)
        if ($tem('escavadeira', 'esteira', 'lagarta')) return null;
        if ($tem('gerador', 'grade de disco', 'perfuratriz', 'valetadeira', 'rompedor', 'cesto', 'dbx', 'guindaste')) return null;

        // Especiais
        if ($tem('motoniveladora', 'patrol')) return 'motoniveladora';
        // "pnem" cobre a grafia errada frequente na base ("Rolo Pnemático").
        if (str_contains($h, 'rolo') && (str_contains($h, 'pneum') || str_contains($h, 'pnem'))) return 'rolo_pneumatico';
        if (str_contains($h, 'rolo')) return null; // rolo liso/pe de carneiro: sem pneu

        // Rodoviarios por configuracao de eixo
        if ($tem('6x4')) return 'caminhao_truck';
        if ($tem('6x2')) return 'caminhao_6x2';
        if ($tem('sprinter')) return 'caminhao_toco';
        if ($tem('volare', 'ônibus', 'onibus', 'micro-ônibus', 'micro-onibus')) return 'onibus';
        if ($tem('constellation', 'atego', 'accelo', '13-190', '17-210')) return 'caminhao_toco';
        if ($tem('4x2') && $tem('caminh', 'vm ', 'cargo', 'truck')) return 'caminhao_toco';
        if ($tem('master', 'ducato', 'polo', 'fiorino', 'saveiro', 'strada', 'kombi')) return 'passeio_4x2';

        // Munck e demais ambiguos: sem sugestao (o gerente escolhe o caminhao base)
        return null;
    }
}
