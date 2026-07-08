<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Responsável do diário de bordo (snapshot do nome).
 *
 * Regra de negócio: o responsável é o usuário autenticado que ABRIU o diário
 * — definido pelo SERVIDOR no create do mobile (não confiamos no cliente) e
 * imutável pelo app; somente o administrador pode ajustá-lo (painel web).
 * Snapshot em coluna própria: preserva o nome da época do registro mesmo se
 * o usuário for renomeado/removido depois (auditoria).
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('veiculos_diario_bordo')
            || Schema::hasColumn('veiculos_diario_bordo', 'responsavel')) {
            return;
        }
        Schema::table('veiculos_diario_bordo', function (Blueprint $table) {
            $table->string('responsavel')->nullable();
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('veiculos_diario_bordo')
            && Schema::hasColumn('veiculos_diario_bordo', 'responsavel')) {
            Schema::table('veiculos_diario_bordo', function (Blueprint $table) {
                $table->dropColumn('responsavel');
            });
        }
    }
};
