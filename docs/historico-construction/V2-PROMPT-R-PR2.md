# Prompt R · PR R-2 — "Vencida": selo, contador, hoje do servidor, parcialmente paga

Seção 4 do Prompt R. **Somente leitura; "Vencida" continua derivada, nada é
gravado; sem migração.** A função única de status (4.1/4.2) já existia
(`statusExibido`, Prompt I §16); o que entra:

| | Entrega |
|---|---|
| **4.3** | selo vermelho com ícone ⚠ e evidência na linha (borda à esquerda e fundo leve) |
| **4.4** | contador "Vencidas N · R$ X" ao lado de Pendente, pelo mesmo status da lista e respeitando o filtro ativo (o filtro "Vencida" devolve exatamente N) |
| **4.5** | a data de hoje vem do **servidor** (`hojeISO()` na página, prop `hoje` da tabela); o relógio do navegador não decide o que está vencido |
| **4.6** | **parcialmente paga com vencimento passado é "Vencida"** (recomendação do prompt, adotada): está devendo o saldo. `statusExibido` é compartilhada com a tela de Despesas, então vale nas duas — o teste do Prompt I foi atualizado para a regra nova |

## Testes
`despesa-status.test.ts` (+1, e o caso do §16 ajustado). Suíte (1249),
`tsc`, `eslint`, `next build` verdes. Navegador: contador "Vencidas 39 ·
R$ 20.720" igual ao filtro "Vencida" (39 linhas); selo "⚠ Vencida"; linha
destacada. Hash de `despesa` antes = depois.
