<?php

namespace App\Services\Frota;

use App\Models\Frota\Pneu;
use App\Models\Frota\PneuInspecao;
use App\Models\Frota\PneuMontagemAtiva;
use App\Models\Frota\PneuMovimentacao;
use App\Models\Frota\Veiculo;
use DomainException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class PneuOperationService
{
    public function montar(
        Veiculo $veiculo,
        int $pneuId,
        string $posicao,
        string $data,
        ?int $medicao,
        ?string $email,
    ): void {
        $this->executarComConflito(function () use ($veiculo, $pneuId, $posicao, $data, $medicao, $email) {
            DB::transaction(function () use ($veiculo, $pneuId, $posicao, $data, $medicao, $email) {
                $veiculo = $this->bloquearVeiculo($veiculo->id);
                $pneu = $this->bloquearPneu($pneuId);
                $this->mesmaEmpresa($pneu, $veiculo);
                $this->validarPosicao($veiculo, $posicao);

                if ($pneu->situacao !== 'estoque') {
                    throw new DomainException('Só é possível montar um pneu que está em estoque.');
                }

                if (PneuMontagemAtiva::query()->where('pneu_id', $pneu->id)->lockForUpdate()->exists()) {
                    throw new DomainException('Este pneu já possui uma montagem ativa. Atualize a tela.');
                }

                if ($this->posicaoAtiva($veiculo->id, $posicao, true)) {
                    throw new DomainException('A posição já está ocupada. Atualize a tela.');
                }

                [$medicaoAutomatica, $tipo] = $this->medicaoAtual($veiculo);
                $movimento = $this->movimentar($pneu, [
                    'tipo' => 'montagem',
                    'veiculo_id' => $veiculo->id,
                    'posicao' => $posicao,
                    'medicao' => $medicao ?? $medicaoAutomatica,
                    'medicao_tipo' => $tipo,
                    'data' => $data,
                    'user_create' => $email,
                ]);

                PneuMontagemAtiva::create([
                    'company_id' => $pneu->company_id,
                    'pneu_id' => $pneu->id,
                    'veiculo_id' => $veiculo->id,
                    'posicao' => $posicao,
                    'movimentacao_id' => $movimento->id,
                    'montado_em' => $data,
                ]);

                $pneu->update(['situacao' => 'montado', 'user_edit' => $email]);
            }, 3);
        });
    }

    public function desmontar(
        Veiculo $veiculo,
        int $pneuId,
        string $data,
        ?int $medicao,
        string $destino,
        ?string $observacao,
        ?string $email,
    ): void {
        DB::transaction(function () use ($veiculo, $pneuId, $data, $medicao, $destino, $observacao, $email) {
            $veiculo = $this->bloquearVeiculo($veiculo->id);
            $pneu = $this->bloquearPneu($pneuId);
            $this->mesmaEmpresa($pneu, $veiculo);

            $ativa = PneuMontagemAtiva::query()
                ->where('pneu_id', $pneu->id)
                ->where('veiculo_id', $veiculo->id)
                ->lockForUpdate()
                ->first();

            if ($pneu->situacao !== 'montado' || ! $ativa) {
                throw new DomainException('Este pneu não está montado neste veículo. Atualize a tela.');
            }

            [$medicaoAutomatica, $tipo] = $this->medicaoAtual($veiculo);
            $this->movimentar($pneu, [
                'tipo' => 'desmontagem',
                'veiculo_id' => $veiculo->id,
                'posicao' => $ativa->posicao,
                'medicao' => $medicao ?? $medicaoAutomatica,
                'medicao_tipo' => $tipo,
                'data' => $data,
                'observacao' => $observacao,
                'user_create' => $email,
            ]);

            $ativa->delete();
            $pneu->update(['situacao' => $destino, 'user_edit' => $email]);
        }, 3);
    }

    public function rodiziar(
        Veiculo $veiculo,
        int $pneuId,
        string $novaPosicao,
        string $data,
        ?int $medicao,
        ?string $email,
    ): string {
        return $this->executarComConflito(function () use ($veiculo, $pneuId, $novaPosicao, $data, $medicao, $email) {
            return DB::transaction(function () use ($veiculo, $pneuId, $novaPosicao, $data, $medicao, $email) {
                $veiculo = $this->bloquearVeiculo($veiculo->id);
                $pneu = $this->bloquearPneu($pneuId);
                $this->mesmaEmpresa($pneu, $veiculo);
                $this->validarPosicao($veiculo, $novaPosicao);

                $ativa = PneuMontagemAtiva::query()
                    ->where('pneu_id', $pneu->id)
                    ->where('veiculo_id', $veiculo->id)
                    ->lockForUpdate()
                    ->first();

                if ($pneu->situacao !== 'montado' || ! $ativa) {
                    throw new DomainException('Este pneu não está montado neste veículo. Atualize a tela.');
                }

                if ($ativa->posicao === $novaPosicao) {
                    throw new DomainException('O pneu já está nessa posição.');
                }

                if ($this->posicaoAtiva($veiculo->id, $novaPosicao, true)) {
                    throw new DomainException('A posição de destino já está ocupada. Atualize a tela.');
                }

                [$medicaoAutomatica, $tipo] = $this->medicaoAtual($veiculo);
                $posicaoAnterior = $ativa->posicao;
                $movimento = $this->movimentar($pneu, [
                    'tipo' => 'rodizio',
                    'veiculo_id' => $veiculo->id,
                    'posicao' => $novaPosicao,
                    'posicao_anterior' => $posicaoAnterior,
                    'medicao' => $medicao ?? $medicaoAutomatica,
                    'medicao_tipo' => $tipo,
                    'data' => $data,
                    'user_create' => $email,
                ]);

                $ativa->update([
                    'posicao' => $novaPosicao,
                    'movimentacao_id' => $movimento->id,
                ]);

                return $posicaoAnterior;
            }, 3);
        });
    }

    public function trocar(
        Veiculo $veiculo,
        int $novoPneuId,
        string $posicao,
        string $data,
        ?int $medicao,
        string $destino,
        ?string $observacao,
        ?string $email,
    ): array {
        return $this->executarComConflito(function () use ($veiculo, $novoPneuId, $posicao, $data, $medicao, $destino, $observacao, $email) {
            return DB::transaction(function () use ($veiculo, $novoPneuId, $posicao, $data, $medicao, $destino, $observacao, $email) {
                $veiculo = $this->bloquearVeiculo($veiculo->id);
                $this->validarPosicao($veiculo, $posicao);

                $ativa = $this->posicaoAtiva($veiculo->id, $posicao, true);
                if (! $ativa) {
                    throw new DomainException('Não há pneu montado nessa posição. Atualize a tela.');
                }

                $ids = collect([$ativa->pneu_id, $novoPneuId])->unique()->sort()->values();
                $pneus = Pneu::query()->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $saindo = $pneus->get($ativa->pneu_id);
                $novo = $pneus->get($novoPneuId);

                if (! $saindo || ! $novo) {
                    throw new DomainException('Um dos pneus não está disponível nesta empresa.');
                }
                $this->mesmaEmpresa($saindo, $veiculo);
                $this->mesmaEmpresa($novo, $veiculo);

                if ($saindo->id === $novo->id) {
                    throw new DomainException('Selecione um pneu diferente do que está montado.');
                }
                if ($novo->situacao !== 'estoque' || PneuMontagemAtiva::query()->where('pneu_id', $novo->id)->exists()) {
                    throw new DomainException('O pneu que entra não está mais disponível no estoque. Atualize a tela.');
                }

                [$medicaoAutomatica, $tipo] = $this->medicaoAtual($veiculo);
                $medicaoFinal = $medicao ?? $medicaoAutomatica;

                $this->movimentar($saindo, [
                    'tipo' => 'desmontagem',
                    'veiculo_id' => $veiculo->id,
                    'posicao' => $posicao,
                    'medicao' => $medicaoFinal,
                    'medicao_tipo' => $tipo,
                    'data' => $data,
                    'observacao' => $observacao ?: 'Troca (saída)',
                    'user_create' => $email,
                ]);
                $ativa->delete();
                $saindo->update(['situacao' => $destino, 'user_edit' => $email]);

                $entrada = $this->movimentar($novo, [
                    'tipo' => 'montagem',
                    'veiculo_id' => $veiculo->id,
                    'posicao' => $posicao,
                    'medicao' => $medicaoFinal,
                    'medicao_tipo' => $tipo,
                    'data' => $data,
                    'observacao' => 'Troca (entrada)',
                    'user_create' => $email,
                ]);
                PneuMontagemAtiva::create([
                    'company_id' => $novo->company_id,
                    'pneu_id' => $novo->id,
                    'veiculo_id' => $veiculo->id,
                    'posicao' => $posicao,
                    'movimentacao_id' => $entrada->id,
                    'montado_em' => $data,
                ]);
                $novo->update(['situacao' => 'montado', 'user_edit' => $email]);

                return [$saindo->numero_fogo, $novo->numero_fogo];
            }, 3);
        });
    }

    public function recapar(Pneu $pneu, array $data, ?string $email): int
    {
        return DB::transaction(function () use ($pneu, $data, $email) {
            $pneu = $this->bloquearPneu($pneu->id);
            $this->garantirDesmontado($pneu, 'recapar');
            if ($pneu->situacao !== 'recapadora') {
                throw new DomainException('Envie o pneu para a recapadora antes de registrar a recapagem.');
            }
            $novaVida = $pneu->vida_atual + 1;
            $this->movimentar($pneu, [
                'tipo' => 'recapagem',
                'data' => $data['data'],
                'valor' => $data['valor'] ?? null,
                'fornecedor_id' => $data['fornecedor_id'] ?? null,
                'vida_resultante' => $novaVida,
                'observacao' => $data['observacao'] ?? null,
                'user_create' => $email,
            ]);
            $pneu->update(['vida_atual' => $novaVida, 'situacao' => 'estoque', 'user_edit' => $email]);
            return $novaVida;
        }, 3);
    }

    public function consertar(Pneu $pneu, array $data, ?string $email): void
    {
        DB::transaction(function () use ($pneu, $data, $email) {
            $pneu = $this->bloquearPneu($pneu->id);
            $this->garantirDesmontado($pneu, 'consertar');
            if ($pneu->situacao !== 'conserto') {
                throw new DomainException('Envie o pneu para conserto antes de registrar o serviço.');
            }
            $this->movimentar($pneu, [
                'tipo' => 'conserto',
                'data' => $data['data'],
                'valor' => $data['valor'] ?? null,
                'fornecedor_id' => $data['fornecedor_id'] ?? null,
                'observacao' => $data['observacao'] ?? null,
                'user_create' => $email,
            ]);
            $pneu->update(['situacao' => 'estoque', 'user_edit' => $email]);
        }, 3);
    }

    public function sucatear(Pneu $pneu, array $data, ?string $email): void
    {
        DB::transaction(function () use ($pneu, $data, $email) {
            $pneu = $this->bloquearPneu($pneu->id);
            $this->garantirDesmontado($pneu, 'sucatear');
            $this->movimentar($pneu, [
                'tipo' => 'sucateamento',
                'data' => $data['data'],
                'observacao' => $data['observacao'] ?? null,
                'user_create' => $email,
            ]);
            $pneu->update(['situacao' => 'sucata', 'user_edit' => $email]);
        }, 3);
    }

    public function inspecionar(Pneu $pneu, array $data, ?string $email): void
    {
        DB::transaction(function () use ($pneu, $data, $email) {
            $pneu = $this->bloquearPneu($pneu->id);
            if ($pneu->situacao === 'sucata') {
                throw new DomainException('Pneu sucateado não pode receber nova inspeção.');
            }
            $ativa = PneuMontagemAtiva::query()->where('pneu_id', $pneu->id)->lockForUpdate()->first();
            $veiculo = $ativa ? $this->bloquearVeiculo($ativa->veiculo_id) : null;
            [$medicaoAutomatica] = $veiculo ? $this->medicaoAtual($veiculo) : [null, null];

            PneuInspecao::create(array_merge($data, [
                'company_id' => $pneu->company_id,
                'pneu_id' => $pneu->id,
                'veiculo_id' => $ativa?->veiculo_id,
                'posicao' => $ativa?->posicao,
                'medicao' => $data['medicao'] ?? $medicaoAutomatica,
                'user_create' => $email,
            ]));
        }, 3);
    }

    private function bloquearPneu(int $id): Pneu
    {
        $pneu = Pneu::query()->whereKey($id)->lockForUpdate()->first();
        if (! $pneu) {
            throw new DomainException('Pneu não encontrado nesta empresa.');
        }
        return $pneu;
    }

    private function bloquearVeiculo(int $id): Veiculo
    {
        $veiculo = Veiculo::query()->whereKey($id)->lockForUpdate()->first();
        if (! $veiculo) {
            throw new DomainException('Veículo não encontrado nesta empresa.');
        }
        return $veiculo;
    }

    private function mesmaEmpresa(Pneu $pneu, Veiculo $veiculo): void
    {
        if (! $pneu->company_id || (int) $pneu->company_id !== (int) $veiculo->company_id) {
            throw new DomainException('Pneu e veículo precisam pertencer à mesma empresa.');
        }
    }

    private function validarPosicao(Veiculo $veiculo, string $posicao): void
    {
        $layout = $veiculo->config_pneus ? config("frota_pneus.layouts.{$veiculo->config_pneus}") : null;
        if (! $layout) {
            throw new DomainException('Configure o layout de pneus do veículo antes da operação.');
        }
        $validas = collect($layout['posicoes'] ?? [])->pluck('codigo');
        if (! $validas->containsStrict($posicao)) {
            throw new DomainException('A posição informada não existe no layout deste veículo.');
        }
    }

    private function posicaoAtiva(int $veiculoId, string $posicao, bool $lock): ?PneuMontagemAtiva
    {
        $query = PneuMontagemAtiva::query()
            ->where('veiculo_id', $veiculoId)
            ->where('posicao', $posicao);
        if ($lock) {
            $query->lockForUpdate();
        }
        return $query->first();
    }

    private function medicaoAtual(Veiculo $veiculo): array
    {
        $usaHoras = (bool) $veiculo->tipo_hr;
        $valor = $usaHoras
            ? $veiculo->horimetros()->max('horimetro_novo')
            : $veiculo->quilometragens()->max('quilometragem_nova');
        return [$valor === null ? null : (int) $valor, $usaHoras ? 'hr' : 'km'];
    }

    private function movimentar(Pneu $pneu, array $dados): PneuMovimentacao
    {
        return PneuMovimentacao::create($dados + [
            'company_id' => $pneu->company_id,
            'pneu_id' => $pneu->id,
        ]);
    }

    private function garantirDesmontado(Pneu $pneu, string $acao): void
    {
        if ($pneu->situacao === 'sucata') {
            throw new DomainException('Pneu sucateado não pode ser alterado.');
        }
        if ($pneu->situacao === 'montado' || PneuMontagemAtiva::query()->where('pneu_id', $pneu->id)->exists()) {
            throw new DomainException("Desmonte o pneu do veículo antes de {$acao}.");
        }
    }

    private function executarComConflito(callable $callback): mixed
    {
        try {
            return $callback();
        } catch (QueryException $exception) {
            if (in_array((string) $exception->getCode(), ['23000', '23505'], true)) {
                throw new DomainException('Outro usuário alterou este pneu ou posição. Atualize a tela e tente novamente.');
            }
            throw $exception;
        }
    }
}
