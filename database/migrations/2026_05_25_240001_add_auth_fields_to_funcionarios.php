<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Funcionário da obra passa a ter campos de autenticação para retirada
 * de estoque, sem precisar de login no sistema:
 *
 *   senha_retirada       : hash de senha simples (geralmente 4-6 dígitos,
 *                          definida pelo almoxarife no cadastro). Usada para
 *                          autenticar SAÍDA quando o funcionário não tem
 *                          biometria. Opcional.
 *   remember_token       : exigido pelo Authenticatable (mesmo que não usemos
 *                          login real, o WebAuthn precisa).
 *   data_ultima_retirada : auditoria — última vez que o funcionário fez
 *                          retirada (opcional, ajuda a detectar dormência).
 *
 * O Funcionario também ganha o trait WebAuthnAuthentication no Model
 * (alteração separada no PHP), permitindo cadastrar biometrias.
 * Credenciais WebAuthn ficam vinculadas via authenticatable_type =
 * App\Models\Funcionario, separadas dos Users do sistema.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('funcionarios', function (Blueprint $t) {
            $t->string('senha_retirada')->nullable()->after('email');
            $t->rememberToken()->after('senha_retirada');
            $t->timestamp('data_ultima_retirada')->nullable()->after('remember_token');
        });
    }

    public function down(): void
    {
        Schema::table('funcionarios', function (Blueprint $t) {
            $t->dropColumn(['senha_retirada', 'remember_token', 'data_ultima_retirada']);
        });
    }
};
