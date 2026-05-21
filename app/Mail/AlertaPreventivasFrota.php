<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AlertaPreventivasFrota extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param array $resumo lista de veiculos + ciclos criticos:
     *   [
     *     ['veiculo' => Veiculo, 'ciclos' => [ ['periodo' => ..., 'estado' => ..., 'bloqueio' => ...], ... ]],
     *     ...
     *   ]
     */
    public function __construct(public array $resumo)
    {
    }

    public function envelope(): Envelope
    {
        $qtdVeiculos = count($this->resumo);
        $assunto = "[Frota] {$qtdVeiculos} veículo(s) com preventivas pendentes";

        return new Envelope(subject: $assunto);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.frota.alerta-preventivas',
            with: ['resumo' => $this->resumo],
        );
    }
}
