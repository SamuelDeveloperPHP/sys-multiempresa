<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class StrongPassword implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $password = (string) $value;

        // 1) Pelo menos uma maiúscula
        if (!preg_match('/[A-Z]/', $password)) {
            $fail('A :attribute deve conter pelo menos uma letra maiúscula.');
            return;
        }

        // 2) Pelo menos um caractere especial
        if (!preg_match('/[\W_]/', $password)) { // inclui _ como especial
            $fail('A :attribute deve conter pelo menos um caractere especial.');
            return;
        }

        // 3) Não permitir 3+ números repetidos em sequência (111, 2222 etc.)
        $len = strlen($password);
        $repeatCount = 1;
        for ($i = 1; $i < $len; $i++) {
            if (ctype_digit($password[$i]) && $password[$i] === $password[$i - 1]) {
                $repeatCount++;
                if ($repeatCount >= 3) {
                    $fail('A :attribute não pode conter mais de dois números repetidos em sequência.');
                    return;
                }
            } else {
                $repeatCount = 1;
            }
        }

        // 4) Não permitir 3+ números sequenciais (123, 234, 789 etc.)
        for ($i = 0; $i < $len - 2; $i++) {
            if (ctype_digit($password[$i]) && ctype_digit($password[$i + 1]) && ctype_digit($password[$i + 2])) {

                $a = (int) $password[$i];
                $b = (int) $password[$i + 1];
                $c = (int) $password[$i + 2];

                if ($b === $a + 1 && $c === $b + 1) {
                    $fail('A :attribute não pode conter mais de dois números sequenciais (ex.: 123, 456).');
                    return;
                }

                if ($b === $a - 1 && $c === $b - 1) {
                    $fail('A :attribute não pode conter mais de dois números sequenciais decrescentes (ex.: 321).');
                    return;
                }
            }
        }
    }
}
