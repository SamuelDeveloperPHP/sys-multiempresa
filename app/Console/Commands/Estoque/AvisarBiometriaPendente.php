<?php

namespace App\Console\Commands\Estoque;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Laragear\WebAuthn\Models\WebAuthnCredential;

/**
 * Envia e-mail aos usuários com menos de 2 biometrias cadastradas,
 * pedindo que cadastrem no painel.
 *
 * Uso:
 *   php artisan estoque:avisar-biometria-pendente
 *   php artisan estoque:avisar-biometria-pendente --dry-run
 *   php artisan estoque:avisar-biometria-pendente --tipos=admin,manager
 *
 * Pode ser agendado em routes/console.php para rodar semanalmente.
 */
class AvisarBiometriaPendente extends Command
{
    protected $signature = 'estoque:avisar-biometria-pendente
                            {--dry-run        : Apenas lista, não envia e-mail}
                            {--tipos=         : CSV de tipos (admin,manager,user)}
                            {--exclude-zero   : Pula quem tem 0 biometrias (avisa só os com 1)}';

    protected $description = 'Envia e-mail aos usuários com menos de 2 biometrias cadastradas (política da empresa).';

    public function handle(): int
    {
        $dryRun     = (bool) $this->option('dry-run');
        $tipos      = $this->option('tipos');
        $excludeZero = (bool) $this->option('exclude-zero');

        $userQuery = User::query()->whereNull('deleted_at')->where('type', '!=', 'motorista');
        if ($tipos) {
            $userQuery->whereIn('type', array_map('trim', explode(',', $tipos)));
        }
        $users = $userQuery->get(['id', 'name', 'email', 'type']);

        $this->info("Analisando {$users->count()} usuário(s)…");

        $afetados = collect();
        foreach ($users as $u) {
            $count = WebAuthnCredential::where('authenticatable_type', User::class)
                ->where('authenticatable_id', $u->id)
                ->whereNull('disabled_at')
                ->count();
            if ($count >= 2) continue;
            if ($excludeZero && $count === 0) continue;
            $afetados->push(['user' => $u, 'count' => $count]);
        }

        $this->info("Usuários abaixo da política (< 2 biometrias): {$afetados->count()}");
        $this->table(
            ['Nome', 'E-mail', 'Tipo', 'Biometrias'],
            $afetados->map(fn ($a) => [
                $a['user']->name, $a['user']->email, $a['user']->type, $a['count'],
            ])->all()
        );

        if ($dryRun) {
            $this->warn('DRY-RUN — nenhum e-mail enviado.');
            return self::SUCCESS;
        }

        if ($afetados->isEmpty()) {
            $this->info('Todos os usuários atendem a política. Nada a enviar.');
            return self::SUCCESS;
        }

        if (!$this->confirm("Enviar {$afetados->count()} e-mails agora?", false)) {
            $this->warn('Cancelado.');
            return self::FAILURE;
        }

        $enviados = 0; $falhas = 0;
        foreach ($afetados as $item) {
            try {
                $this->enviarEmail($item['user'], $item['count']);
                $enviados++;
            } catch (\Throwable $e) {
                Log::error('[avisar-biometria-pendente] falha', [
                    'user_id' => $item['user']->id, 'msg' => $e->getMessage(),
                ]);
                $falhas++;
            }
        }

        $this->info("Enviados: {$enviados} · Falhas: {$falhas}");
        return self::SUCCESS;
    }

    protected function enviarEmail(User $user, int $count): void
    {
        $url = config('app.url') . '/admin/perfil/biometria';
        $assunto = 'Ação necessária: cadastre suas biometrias';
        $msg = $count === 0
            ? "Olá {$user->name},\n\nNotamos que você ainda não cadastrou nenhuma biometria no SGA Engeativos. Por política da empresa, é necessário cadastrar pelo menos 2 digitais para autenticar retiradas de estoque.\n\nAcesse: {$url}\n\nObrigado!"
            : "Olá {$user->name},\n\nVocê tem apenas {$count} biometria cadastrada no SGA. Por política da empresa, é necessário ter ao menos 2 (redundância — se um dedo machucar, outro funciona).\n\nCadastre o segundo dedo em: {$url}\n\nObrigado!";

        Mail::raw($msg, function ($m) use ($user, $assunto) {
            $m->to($user->email, $user->name)->subject($assunto);
        });
    }
}
