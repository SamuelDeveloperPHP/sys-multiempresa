<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('google2fa_secret')->nullable()->change();
            $table->text('two_factor_recovery_codes')->nullable()->after('google2fa_enabled');
            $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
        });

        foreach (['users', 'clients'] as $table) {
            DB::table($table)->whereNotNull('google2fa_secret')->orderBy('id')->each(function ($row) use ($table) {
                try {
                    Crypt::decryptString($row->google2fa_secret);
                } catch (\Throwable) {
                    DB::table($table)->where('id', $row->id)->update([
                        'google2fa_secret' => Crypt::encryptString($row->google2fa_secret),
                    ]);
                }
            });
        }

        DB::table('clients')->whereNotNull('two_factor_recovery_codes')->orderBy('id')->each(function ($row) {
            try {
                Crypt::decryptString($row->two_factor_recovery_codes);
            } catch (\Throwable) {
                DB::table('clients')->where('id', $row->id)->update([
                    'two_factor_recovery_codes' => Crypt::encryptString($row->two_factor_recovery_codes),
                ]);
            }
        });
    }

    public function down(): void
    {
        foreach (['users', 'clients'] as $table) {
            DB::table($table)->whereNotNull('google2fa_secret')->orderBy('id')->each(function ($row) use ($table) {
                try {
                    $plain = Crypt::decryptString($row->google2fa_secret);
                    DB::table($table)->where('id', $row->id)->update(['google2fa_secret' => $plain]);
                } catch (\Throwable) {
                    // Já está em formato legado.
                }
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['two_factor_recovery_codes', 'two_factor_confirmed_at']);
            $table->string('google2fa_secret')->nullable()->change();
        });
    }
};
