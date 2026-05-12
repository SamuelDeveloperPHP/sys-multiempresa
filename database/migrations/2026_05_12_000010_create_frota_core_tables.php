<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Frota — nucleo:
 *   - tipos_veiculos (catalogo)
 *   - veiculos
 *   - veiculos_locacaos (vinculo veiculo<->funcionario por obra)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('tipos_veiculos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->string('nome', 80);
            $t->string('codigo', 30)->nullable();
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('veiculos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('obra_id')->nullable()->constrained('obras')->nullOnDelete();
            $t->string('prefixo', 60);
            $t->string('tipo', 30)->nullable(); // string p/ compat com app (1..n)
            $t->string('placa', 12)->nullable();
            $t->string('modelo', 120)->nullable();
            $t->string('marca', 120)->nullable();
            $t->integer('ano')->nullable();
            $t->string('imagem')->nullable();
            // flags exigidas pelo app mobile
            $t->boolean('tipo_km')->default(false);
            $t->boolean('tipo_hr')->default(false);
            $t->dateTime('data_sincronizacao')->nullable();
            $t->tinyInteger('sync_status')->default(0);
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'prefixo']);
            $t->index('placa');
        });

        Schema::create('veiculos_locacaos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('id_obra')->nullable()->constrained('obras')->nullOnDelete();
            $t->foreignId('veiculo_id')->constrained('veiculos')->cascadeOnDelete();
            $t->foreignId('id_obraDestino')->nullable()->constrained('obras')->nullOnDelete();
            $t->foreignId('id_funcionario')->nullable()->constrained('funcionarios')->nullOnDelete();
            $t->foreignId('id_funcionario_destino')->nullable()->constrained('funcionarios')->nullOnDelete();
            $t->string('tipo_veiculo', 30)->nullable();
            $t->date('data_inicio')->nullable();
            $t->date('data_prevista')->nullable();
            $t->date('data_fim')->nullable();
            $t->dateTime('data_sincronizacao')->nullable();
            $t->tinyInteger('sync_status')->default(0);
            $t->timestamps();
            $t->softDeletes();
            $t->index('veiculo_id');
            $t->index('id_funcionario_destino');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculos_locacaos');
        Schema::dropIfExists('veiculos');
        Schema::dropIfExists('tipos_veiculos');
    }
};
