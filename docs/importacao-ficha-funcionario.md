# Importação do cadastro de funcionário por documento (Ficha de Registro)

Permite, nas telas **Cadastrar** (`create`) e **Editar** (`edit`) de funcionário, carregar
um **PDF** ou uma **imagem** da *Ficha de Registro de Empregado* e **pré-preencher** o
formulário. **Sem IA** — usa extração de texto + OCR. Nada é gravado automaticamente: o
usuário confere os campos (com indicador de confiança) e salva manualmente.

## Como funciona

1. O usuário envia o arquivo no card **"Preencher a partir de um documento"** (topo do form).
2. O backend (`POST admin.funcionarios.extrair-documento`) decide a fonte:
   - **PDF com camada de texto** → `smalot/pdfparser` (PHP puro, sem binário).
   - **PDF escaneado/imagem** (sem texto) → **rasteriza** as 1ªs páginas (Ghostscript/Poppler)
     e lê por **OCR (Tesseract)**, parando ao reconhecer a Ficha.
   - **Imagem** (JPG/PNG/WEBP) → **OCR (Tesseract)** direto.
3. Recorta o bloco *Dados do Empregado* / *Contrato de Trabalho* e mapeia, por rótulos,
   os campos: nome, CPF, RG, PIS, código/matrícula, nome da mãe, sexo, estado civil,
   endereço/número, bairro, CEP, cidade, UF, admissão e cargo→função / organograma→setor.
4. **Valida a qualidade**: se o documento não for reconhecido como Ficha, se faltarem
   campos críticos (nome, CPF) ou se o OCR tiver confiança baixa, a leitura é **rejeitada**
   com a lista de problemas e o usuário é orientado a reenviar um arquivo melhor.

> A *Ficha de Registro* gerada pelo sistema de DP, em **PDF digital (com texto)**, é a
> fonte mais confiável (leitura ~100%, sem OCR). Fotos/scans funcionam, mas a precisão
> depende da qualidade da imagem.

## Dependências

| Recurso | Para quê | Obrigatório? |
|---|---|---|
| `smalot/pdfparser` (Composer) | Ler PDF **com texto** | Sim (`composer install`) |
| **Tesseract OCR** + idioma `por` | Ler **imagens/scans** | Só para o caminho de imagem |
| **Ghostscript** *ou* **Poppler (pdftoppm)** | Rasterizar **PDF-imagem** antes do OCR | Só para PDF escaneado |
| extensão PHP `gd` | Pré-tratar a imagem (cinza/contraste) | Recomendado (já presente) |

Sem Tesseract/rasterizador o recurso **continua funcionando para PDF com texto** e
exibe uma mensagem clara para os demais casos.

## Instalação no Windows / WAMP

1. **Composer** (no repositório principal):
   ```bash
   composer install     # ou: composer require smalot/pdfparser:^2.0
   ```
2. **Tesseract OCR** (UB-Mannheim): instale e marque o idioma **Português**.
   Padrão: `C:\Program Files\Tesseract-OCR\tesseract.exe`.
3. **Rasterizador** (um dos dois):
   - **Ghostscript** (`gswin64c.exe`), ou
   - **Poppler** para Windows (`pdftoppm.exe`).
4. Reinicie o Apache do WAMP para o PHP enxergar o PATH atualizado (ou informe os
   caminhos absolutos no `.env`, abaixo).

## Configuração (`config/funcionario_import.php` + `.env`)

```dotenv
# Tamanho máx. do arquivo (MB) e confiança mínima do OCR (0..1)
FUNC_IMPORT_MAX_MB=20
FUNC_IMPORT_MIN_CONF=0.55
FUNC_IMPORT_OCR_PAGS=3

# Tesseract (deixe em branco para autodetectar no PATH)
TESSERACT_BIN="C:\Program Files\Tesseract-OCR\tesseract.exe"
TESSERACT_LANG=por
TESSERACT_PSM=4

# Rasterizador de PDF-imagem (vazio = autodetecta pdftoppm -> gswin64c -> gs)
PDF_RASTER_BIN=
PDF_RASTER_DPI=300
```

## Arquivos

- `app/Services/Funcionario/FichaRegistroExtractor.php` — leitura (pdfparser/OCR), rasterização, parsing e validação de qualidade.
- `app/Http/Controllers/Admin/FuncionarioController.php` → `extrairDocumento()` — endpoint JSON.
- `routes/web.php` → `admin.funcionarios.extrair-documento`.
- `resources/js/Pages/Admin/Funcionarios/Partials/ImportadorDocumento.jsx` — UI de upload/conferência.
- `resources/js/Pages/Admin/Funcionarios/FuncionarioForm.jsx` — integra o importador e aplica os campos.
- `config/funcionario_import.php` — parâmetros.

## Segurança / permissões

O endpoint exige sessão autenticada (grupo `auth`/`company`/`module.access`) e, no
controller, que o usuário tenha permissão de **criar OU editar** funcionário. O arquivo
é processado em memória/temp e **não é persistido** por esta rota (anexos continuam pelo
fluxo de anexos existente).
