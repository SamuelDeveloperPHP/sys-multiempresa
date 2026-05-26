<?php

namespace App\Services\Frota;

use App\Models\Frota\VeiculoChecklistServico;
use App\Models\Frota\VeiculoDiarioBordo;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Regra de negócio (legado, FASE 4/6): um motorista só pode ter UM ciclo
 * ABERTO por vez — diário de bordo OU checklist. Para abrir em outro veículo,
 * precisa fechar o ciclo anterior.
 *
 * A FASE 6 implementou essa checagem no front (useOpenCycles). Este serviço é o
 * complemento server-side: garante a regra mesmo se o cliente for burlado ou
 * mandar requisição direto na API.
 *
 * Status considerado "aberto": ciclo_status / status_ciclo = 'ABERTO'.
 */
class CicloAbertoService
{
    public const STATUS_ABERTO  = 'ABERTO';
    public const STATUS_FECHADO = 'FECHADO';

    /**
     * Procura um ciclo aberto do usuário em OUTRO veículo (≠ $veiculoId).
     * Retorna ['tipo' => 'diario'|'checklist', 'id' => X, 'id_veiculo' => Y] ou null.
     */
    public function bloqueioEmOutroVeiculo(int $userId, int $veiculoId, ?string $userEmail = null): ?array
    {
        $diario = VeiculoDiarioBordo::query()
            ->where('ciclo_status', self::STATUS_ABERTO)
            ->where('id_user', $userId)
            ->where('id_veiculo', '!=', $veiculoId)
            ->orderByDesc('id')
            ->first(['id', 'id_veiculo']);

        if ($diario) {
            return ['tipo' => 'diario', 'id' => $diario->id, 'id_veiculo' => $diario->id_veiculo];
        }

        $checklist = VeiculoChecklistServico::query()
            ->where('status_ciclo', self::STATUS_ABERTO)
            ->where('id_veiculo', '!=', $veiculoId)
            // id_user (registros novos) OU user_create=email (legados sem id_user)
            ->where(function ($q) use ($userId, $userEmail) {
                $q->where('id_user', $userId);
                if ($userEmail) {
                    $q->orWhere('user_create', $userEmail);
                }
            })
            ->orderByDesc('id')
            ->first(['id', 'id_veiculo']);

        if ($checklist) {
            return ['tipo' => 'checklist', 'id' => $checklist->id, 'id_veiculo' => $checklist->id_veiculo];
        }

        return null;
    }

    /**
     * Versão que lança 422 (HttpResponseException) — ideal pra chamar dentro de
     * controllers de API. Não bloqueia se o ciclo aberto for no MESMO veículo.
     */
    public function assertPodeAbrir(int $userId, int $veiculoId, ?string $userEmail = null): void
    {
        $bloqueio = $this->bloqueioEmOutroVeiculo($userId, $veiculoId, $userEmail);
        if (!$bloqueio) {
            return;
        }

        $tipoLabel = $bloqueio['tipo'] === 'diario' ? 'diário de bordo' : 'checklist';

        throw new HttpResponseException(response()->json([
            'status'  => false,
            'message' => "Você já tem um {$tipoLabel} ABERTO em outro veículo (#{$bloqueio['id_veiculo']}). "
                       . 'Feche o ciclo anterior antes de abrir um novo.',
            'errors'  => [
                'ciclo_aberto' => [
                    'tipo'       => $bloqueio['tipo'],
                    'id'         => $bloqueio['id'],
                    'id_veiculo' => $bloqueio['id_veiculo'],
                ],
            ],
        ], 422));
    }

    /**
     * Heurística de "está abrindo um ciclo?" a partir do payload.
     * Considera ABERTO quando o cliente manda explicitamente, OU quando é uma
     * abertura sem horário/dado de fechamento.
     */
    public function ehAbertura(?string $cicloStatus, ?string $tipo = null): bool
    {
        if ($cicloStatus !== null) {
            return strtoupper($cicloStatus) === self::STATUS_ABERTO;
        }
        if ($tipo !== null) {
            return strtoupper($tipo) === 'ABERTURA';
        }
        // Sem sinal explícito: trata como abertura (comportamento do legado:
        // criar diário = abrir ciclo).
        return true;
    }
}
