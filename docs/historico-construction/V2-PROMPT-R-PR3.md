# Prompt R · PR R-3 — filtros com seleção múltipla, coluna fixa, descrição vazia

Seções 5 e 6 do Prompt R. **Somente leitura; sem migração.**

| | Entrega |
|---|---|
| **5.1–5.3** | fornecedor, cliente, projeto, categoria e status viram `MultiSelect` (`components/ui/multi-select.tsx`): fechado mostra "Todos", o nome quando é um só, ou "N selecionados"; aberto lista caixinhas, busca a partir de 8 itens, "Marcar todos" / "Desmarcar todos". Dentro do filtro é "ou", entre filtros é "e" (`filtrarContasPagar`, puro); nenhum marcado = todos |
| **5.4 / 5.5 / 5.6** | datas continuam intervalo; "Limpar filtros" limpa tudo; os indicadores (total lançado, pendente, vencidas, a restituir) seguem o filtro |
| **5.7** | teclado: o botão abre com Enter/Espaço (`aria-haspopup`, `aria-expanded`), as caixas são `<input type="checkbox">` nativas (Tab/Espaço, estado anunciado), Escape fecha |
| **6.1** | coluna **Fornecedor** fixa à esquerda (`sticky left-0`) ao rolar horizontalmente |
| **6.2** | sem observação, a coluna Descrição mostra "—" em vez de repetir o PED |
| 6.3 / 6.4 | eyebrow e subtítulo já exibidos; padrão das telas entregues |

## Testes
`contas-pagar-regras.test.ts` +3 (itens 12, 13, 14; status exibido; cliente
nulo; intervalo). Suíte (1252), `tsc`, `eslint`, `next build` verdes.
Navegador, **só com teclado**: Espaço abre Categoria, Tab/Espaço marca duas →
30 de 75 linhas só com as duas categorias, Escape fecha; + Status "Vencida"
(interseção) → 15 linhas e contador "Vencidas 15"; "Limpar filtros" → 75;
coluna Fornecedor `sticky`; descrição vazia "—". Hash de `despesa` antes =
depois.
