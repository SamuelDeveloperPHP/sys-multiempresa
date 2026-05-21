# Templates de Crachá

Coloque aqui o arquivo `cracha_v00.png` (640×1006 px) que será aplicado
como fundo do crachá quando o usuário clicar em "Aplicar template oficial"
no editor.

## Especificações do template

- **Dimensões**: 640 × 1006 pixels
- **Formato**: PNG (preferencialmente com áreas transparentes onde a foto
  e textos serão sobrepostos)

## Posições onde o editor sobrepõe conteúdo (calculadas em % do template)

| Elemento  | Top     | Left    | Tamanho                                        |
|-----------|---------|---------|------------------------------------------------|
| Foto      | 22.8%   | 23.72%  | width 67.9% (~434 px)                          |
| QR Code   | 71.5%   | 2.5%    | 170×170 px                                     |
| Nome      | 70.7%   | 31.5%   | Barlow Condensed bold 57px, color #000         |
| Função    | abaixo  | 31.5%   | Barlow Condensed italic 50px, color #ff5205   |
| Setor     | abaixo  | 31.5%   | Barlow Condensed italic 50px, color #000       |

## QR Code

O QR aponta sempre para a página pública do funcionário:
`https://{dominio}/detalhes/funcionario/{id}`
