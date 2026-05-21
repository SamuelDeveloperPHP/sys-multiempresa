<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adiciona os campos legados do engeativos2 a tabela veiculos.
 * O schema base (000010) foi pensado mobile-first; esta migration
 * expande para suportar as regras do CRUD admin web.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('veiculos', function (Blueprint $t) {
            // FKs para tabelas de lookup
            $t->foreignId('id_categoria')->nullable()->after('obra_id')
                ->constrained('veiculo_categorias')->nullOnDelete();
            $t->foreignId('id_subcategoria')->nullable()->after('id_categoria')
                ->constrained('veiculo_subcategorias')->nullOnDelete();
            $t->foreignId('id_preventiva')->nullable()->after('id_subcategoria')
                ->constrained('veiculo_preventivas')->nullOnDelete();

            // Flag de medicao por tempo (alem de tipo_km e tipo_hr)
            $t->boolean('tipo_tempo')->default(false)->after('tipo_hr');

            // Descricao livre do veiculo
            $t->string('veiculo', 191)->nullable()->after('ano');

            // FIPE e valores
            $t->decimal('valor_fipe', 12, 2)->nullable()->after('veiculo');
            $t->decimal('valor_aquisicao', 12, 2)->nullable()->after('valor_fipe');
            $t->decimal('valor_mercado', 12, 2)->nullable()->after('valor_aquisicao');
            $t->string('codigo_fipe', 30)->nullable()->after('valor_mercado');
            $t->string('fipe_mes_referencia', 30)->nullable()->after('codigo_fipe');
            $t->string('mes_aquisicao', 30)->nullable()->after('fipe_mes_referencia');

            // Documentacao
            $t->string('nun_serie_chassi', 60)->nullable()->after('mes_aquisicao');
            $t->string('renavam', 30)->nullable()->after('nun_serie_chassi');

            // Marcacoes iniciais (para historico de medicao)
            $t->integer('horimetro_inicial')->nullable()->after('renavam');
            $t->integer('quilometragem_inicial')->nullable()->after('horimetro_inicial');

            // Texto livre e situacao
            $t->text('observacao')->nullable()->after('quilometragem_inicial');
            $t->string('situacao', 30)->default('Ativo')->after('observacao');

            // Auditoria de quem mexeu
            $t->string('user_create', 191)->nullable()->after('situacao');
            $t->string('user_edit', 191)->nullable()->after('user_create');

            $t->index(['company_id', 'situacao']);
        });
    }

    public function down(): void
    {
        Schema::table('veiculos', function (Blueprint $t) {
            $t->dropForeign(['id_categoria']);
            $t->dropForeign(['id_subcategoria']);
            $t->dropForeign(['id_preventiva']);
            $t->dropIndex(['company_id', 'situacao']);
            $t->dropColumn([
                'id_categoria', 'id_subcategoria', 'id_preventiva',
                'tipo_tempo', 'veiculo',
                'valor_fipe', 'valor_aquisicao', 'valor_mercado',
                'codigo_fipe', 'fipe_mes_referencia', 'mes_aquisicao',
                'nun_serie_chassi', 'renavam',
                'horimetro_inicial', 'quilometragem_inicial',
                'observacao', 'situacao',
                'user_create', 'user_edit',
            ]);
        });
    }
};
