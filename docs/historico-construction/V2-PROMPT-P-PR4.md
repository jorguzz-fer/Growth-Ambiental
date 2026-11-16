# Prompt P · PR P-4 — inventário: tempo em estoque, totais por tipo, planilha

Quarta PR de código do Prompt P, conforme
[`V2-PROMPT-P-FASE1.md`](./V2-PROMPT-P-FASE1.md). Seção 5 inteira, sobre a
decisão BP-1. **Sem migração.** A única escrita é a importação por planilha,
depois da prévia e por decisão humana; nada é alterado sem isso.

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **5.1/5.2 · onde e o quê** | seção abaixo da listagem, com os ativos em estoque e totais por tipo | seção "Inventário · em estoque" na mesma tela: tipo, descrição, unidade de origem, cliente, data de recebimento, estimado, tempo em estoque; chips com quantidade e estimado por tipo e o total. Só ativos não vendidos e não cancelados (`inventario()`, puro) |
| **5.3 · tempo em estoque** | dias entre o recebimento e hoje | calculado no servidor (São Paulo); acima de 180 dias fica em destaque; sem data mostra "sem data" |
| **BP-1 · "no Estoque"** | o bem que também entrou como insumo | selo quando existe `stock_movement.permuta_id` apontando para o ativo (já vinha da P-2 na lista; agora também no inventário) |
| **5.4 · exportar** | `.xlsx` no padrão das exportações | "Exportar inventário": uma linha por ativo não cancelado, com a coluna **Id** (é o identificador da atualização), datas em DD/MM/AAAA |
| **5.5 · importar com prévia** | inserir / atualizar / ignorar e por quê; atualiza em vez de duplicar; respeita `version.locked`; não toca em vendido; vírgula decimal | prévia obrigatória com Ação e Validação por linha; Id existente **atualiza**, sem Id **insere**; vendido e cancelado são ignorados com motivo; Id desconhecido é ignorado; **célula ilegível é reportada, nunca gravada como zero** (`numeroDaCelula` devolve NaN; `dataDaCelula` devolve null); a action confere a trava da versão e a permissão de criar; transação com os ativos da versão travados; auditoria `permuta.import` com inseridas, atualizadas (de/para) e ignoradas. O cliente vem por nome e, quando casa exatamente com o cadastro, grava também o id (3.6) |
| **5.6 · modelo** | como em Unidades | botão "Modelo" com os cabeçalhos e uma linha de exemplo (sem Id) |

## Arquivos

- `src/lib/permuta-inventario.ts` (+ teste, 4 casos): `inventario`, `totaisPorTipo`, `COLUNAS_DA_PLANILHA`, `numeroDaCelula`, `dataDaCelula`, `prepararImportacaoDePermutas`, `resumoDaImportacaoDePermutas`.
- `src/lib/actions/receitas.ts` — `importPermutas(rows, projectId)`.
- `src/components/app/permuta-import-export.tsx` (novo); `permuta/page.tsx` (seção de inventário e botões).
- `src/lib/actions/permuta-importacao.test.ts` (novo, 4 casos com banco).

## Verificação

- Testes com banco: sem Id insere (cliente do cadastro leva o id; avulso só o nome; linha sem estimado reportada); exportar e reimportar com Id **não duplica** (teste 12); Id existente atualiza; vendido não é alterado (teste 14); versão congelada e sem permissão recusam (teste 13); vírgula decimal (teste 15) nos testes puros.
- Suíte completa, `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): inventário lista o ativo disponível com o tempo em estoque e o chip por tipo; o vendido não aparece; exportar baixa o `.xlsx`. Linhas de teste apagadas; antes/depois de `permuta` local 0 → 0.

## Fica para depois

- P-5 documentos do ativo; P-6 assistente (ativos parados, cadastro incompleto, venda abaixo da entrada, duplicidade com o plano).
