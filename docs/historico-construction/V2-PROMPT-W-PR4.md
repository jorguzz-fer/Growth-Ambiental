# Prompt W · PR W-4 — listagem: busca, filtro por papel e sinais discretos

Seção 6 do Prompt W (e 3.6 / 3-A.4). **Nenhum registro alterado; sem migração.**

| | Entrega |
|---|---|
| **6.1** busca e filtro | Busca por nome, nome fantasia e documento (com ou sem máscara; sem diferenciar acento e caixa; cada termo precisa aparecer) e filtro por papel — "quem são os corretores", "quem pode pagar pela empresa". Tudo puro (`filtrarCadastros`), sobre a lista que a página já carrega; contador "N de M" |
| **6.2 / 3.6** documento sinalizado | "fora do padrão" (não passa em CPF/CNPJ) e "duplicado" (mesmo documento em outro cadastro, com os nomes no título), ao lado do documento. Indicador discreto, não erro; nada foi alterado |
| **3.4** tipo × documento | "≠ doc" ao lado do tipo |
| **3-A.4** endereço | "sem endereço" ao lado do nome, em PF com papel de serviço ou mão de obra |
| papel | "sem papel" (não aparece em nenhum seletor filtrado) e papel fora da lista em destaque (BW-2) |
| **6.3** subtítulo | já voltou a aparecer (`PageHeader`, Prompt J); a contagem está lá |
| **6.4** | padrão das telas já entregues (`PADRAO-VISUAL.md` não está no repositório) |

## Testes

`filtrarCadastros` (2 casos puros) e `sinaisDoCadastro` (já na W-1). Suíte
(1209), `tsc`, `eslint`, `next build` verdes. Navegador: busca por "inacio"
e por dígitos do CNPJ, filtro "Construtora", sinal "sem endereço" no PF com
Mão de Obra RPA. Hash de `stakeholder` antes = depois.
