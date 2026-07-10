<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Depreciacao automatica da Frota:
 *  - `veiculos`: parametros por ativo (metodo, vida util, residual, data aquisicao)
 *  - `veiculo_depreciacoes`: auditoria do snapshot (origem manual x calculado,
 *    metodo usado, base, acumulada e memoria de calculo).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('veiculos', function (Blueprint $t) {
            if (!Schema::hasColumn('veiculos', 'metodo_depreciacao')) {
                $t->string('metodo_depreciacao', 20)->nullable()->after('valor_mercado');
            }
            if (!Schema::hasColumn('veiculos', 'valor_residual')) {
                $t->decimal('valor_residual', 12, 2)->nullable()->after('metodo_depreciacao');
            }
            if (!Schema::hasColumn('veiculos', 'vida_util_anos')) {
                $t->integer('vida_util_anos')->nullable()->after('valor_residual');
            }
            if (!Schema::hasColumn('veiculos', 'vida_util_horas')) {
                $t->integer('vida_util_horas')->nullable()->after('vida_util_anos');
            }
            if (!Schema::hasColumn('veiculos', 'data_aquisicao')) {
                $t->date('data_aquisicao')->nullable()->after('mes_aquisicao');
            }
        });

        Schema::table('veiculo_depreciacoes', function (Blueprint $t) {
            if (!Schema::hasColumn('veiculo_depreciacoes', 'origem')) {
                $t->string('origem', 12)->default('manual')->after('referencia_ano'); // manual | calculado
            }
            if (!Schema::hasColumn('veiculo_depreciacoes', 'metodo')) {
                $t->string('metodo', 20)->nullable()->after('origem');
            }
            if (!Schema::hasColumn('veiculo_depreciacoes', 'valor_base')) {
                $t->decimal('valor_base', 14, 2)->nullable()->after('metodo'); // valor de aquisicao usado
            }
            if (!Schema::hasColumn('veiculo_depreciacoes', 'depreciacao_acumulada')) {
                $t->decimal('depreciacao_acumulada', 14, 2)->nullable()->after('valor_base');
            }
            if (!Schema::hasColumn('veiculo_depreciacoes', 'memoria_calculo')) {
                $t->json('memoria_calculo')->nullable()->after('depreciacao_acumulada');
            }
        });
    }

    public function down(): void
    {
        Schema::table('veiculos', function (Blueprint $t) {
            $t->dropColumn(['metodo_depreciacao', 'valor_residual', 'vida_util_anos', 'vida_util_horas', 'data_aquisicao']);
        });
        Schema::table('veiculo_depreciacoes', function (Blueprint $t) {
            $t->dropColumn(['origem', 'metodo', 'valor_base', 'depreciacao_acumulada', 'memoria_calculo']);
        });
    }
};
