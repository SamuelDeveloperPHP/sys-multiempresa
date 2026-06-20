<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ficha de EPI emitida (NR-6) — SNAPSHOT imutável do que o funcionário recebeu
 * no momento da emissão, com hash de integridade, assinatura e código de
 * verificação. Dá valor probatório (autoria + integridade + recebimento).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('estoque_epi_fichas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $t->foreignId('funcionario_id')->constrained('funcionarios')->cascadeOnDelete();
            $t->string('codigo', 40)->unique();          // identificador público da ficha
            $t->string('hash', 64);                       // hmac-sha256 do conteudo
            $t->longText('conteudo');                     // JSON canônico (snapshot)
            $t->longText('assinatura')->nullable();       // data URL (PNG base64) da assinatura
            $t->string('assinatura_tipo', 30)->nullable(); // manuscrita_digital | impressa
            $t->string('emitida_por')->nullable();        // e-mail do operador
            $t->timestamps();

            $t->index('funcionario_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_epi_fichas');
    }
};
