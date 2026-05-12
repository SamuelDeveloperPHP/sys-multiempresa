<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabelas de infraestrutura de sincronizacao:
 *  - sincronizacaos: registro de cada operacao download/upload feita por usuario
 *  - sync_logs: erros tecnicos enviados pelo mobile
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('sincronizacaos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('user_create', 191)->nullable();
            $t->string('tabela', 100);
            $t->string('tipo', 20); // 'upload' | 'download'
            $t->dateTime('ultima_sincronizacao')->nullable();
            $t->dateTime('data_sincronizacao');
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'user_id', 'tabela', 'tipo']);
        });

        Schema::create('sync_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('uuid', 64)->nullable()->index();
            $t->string('tabela', 100)->nullable();
            $t->string('etapa', 100)->nullable();
            $t->string('id_local', 64)->nullable();
            $t->unsignedBigInteger('server_id')->nullable();
            $t->text('mensagem')->nullable();
            $t->longText('payload_resumido')->nullable();
            $t->longText('stack_trace')->nullable();
            $t->string('status_envio_log', 30)->default('Recebido');
            $t->timestamps();
            $t->index(['company_id', 'tabela', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_logs');
        Schema::dropIfExists('sincronizacaos');
    }
};
