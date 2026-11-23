<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use App\Models\Module;
use App\Models\ModulePermission;
use Carbon\Carbon;
use Laragear\WebAuthn\WebAuthnAuthentication;
use Laragear\WebAuthn\Contracts\WebAuthnAuthenticatable;

class User extends Authenticatable implements WebAuthnAuthenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, WebAuthnAuthentication;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'password_app',       // hash SHA-256 para login offline mobile
        'perfil_offline',     // JSON serializado do perfil para cache mobile
        'biometria',
        'geolocalizacao',
        'type',
        'is_active',
        'profile_photo_path',
        'google2fa_secret',
        'google2fa_enabled',
        'latitude',
        'longitude',
    ];

     
    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'profile_photo_url',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at'     => 'datetime',
            'last_seen_at'      => 'datetime',
            'is_active'         => 'boolean',
            'google2fa_enabled' => 'boolean',
            'biometria'         => 'boolean',
            'geolocalizacao'    => 'boolean',
            'password'          => 'hashed',
            // perfil_offline: armazenado como JSON-string (legivel pelo app),
            // nao usar cast 'json' aqui para manter compatibilidade com SQLite mobile.
        ];
    }

    /** Funcionario vinculado ao usuario (app mobile usa isso) */
    public function funcionario()
    {
        return $this->belongsToMany(\App\Models\Funcionario::class, 'user_funcionario')
                    ->withPivot('company_id');
    }

    public function getProfilePhotoUrlAttribute()
    {
        return $this->profile_photo_path
            ? (filter_var($this->profile_photo_path, FILTER_VALIDATE_URL) ? $this->profile_photo_path : asset('storage/' . $this->profile_photo_path))
            : 'https://ui-avatars.com/api/?name='.urlencode($this->name).'&color=008f75&background=f0f9f8';
    }

    public function companies()
    {
        return $this->belongsToMany(\App\Models\Company::class)->withPivot('role');
    }

    /** Obras às quais este usuário tem acesso */
    public function obras()
    {
        return $this->belongsToMany(\App\Models\Obra::class, 'obra_user')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    /** Obras do usuário filtradas pela empresa atual */
    public function obrasForCompany(int $companyId)
    {
        return $this->obras()->where('company_id', $companyId);
    }

    public function modulePermissions()
    {
        return $this->hasMany(ModulePermission::class);
    }

    public function grantedModules(int $companyId): array
    {
        $cached = $this->modulePermissions()
            ->with('module')
            ->where('company_id', $companyId)
            ->get();

        return $cached
            ->filter(fn ($p) => $p->module?->is_active)
            ->map(fn ($p) => [
                'id'          => $p->module->id,
                'name'        => $p->module->name,
                'slug'        => $p->module->slug,
                'url'         => $p->module->url,
                'icon'        => $p->module->icon ?? null,
                'parent_id'   => $p->module->parent_id ?? null,
                'can_list'    => (bool) $p->can_list,
                'can_view'    => (bool) $p->can_view,
                'can_create'  => (bool) $p->can_create,
                'can_edit'    => (bool) ($p->can_edit ?? false),
                'can_delete'  => (bool) ($p->can_delete ?? false),
            ])
            ->values()
            ->all();
    }

    public function hasModulePermission(int $companyId, string $moduleSlug, string $ability): bool
    {
        return $this->hasExplicitPermission($companyId, 'slug', $moduleSlug, $ability);
    }

    public function hasRoutePermission(int $companyId, string $routeName, string $ability = 'list'): bool
    {
        return $this->hasExplicitPermission($companyId, 'url', $routeName, $ability);
    }

    private function hasExplicitPermission(int $companyId, string $field, string $value, string $ability): bool
    {
        if (!in_array($ability, ['list', 'view', 'create', 'edit', 'delete'], true)) {
            return false;
        }

        return $this->modulePermissions()->where('company_id', $companyId)
            ->where('can_'.$ability, true)
            ->whereHas('module', fn ($query) => $query->where('is_active', true)->where($field, $value))
            ->exists();
    }

    public function getIsOnlineAttribute(): bool
    {
        if (!$this->last_seen_at instanceof Carbon) {
            return false;
        }

        // Ajusta a janela: 15 minutos é bem tranquilo
        return $this->last_seen_at->gte(now()->subMinutes(15));
    }
}
