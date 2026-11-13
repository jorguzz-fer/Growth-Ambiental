# Planejamento de Projetos — Plano de Trabalho, Biblioteca de Fases e Atividades e Cris

> **Princípio:** o Growth Ambiental sugere, mas a consultoria decide. Nenhuma fase
> é obrigatória; cada projeto usa só o que escolher.

## 1. Visão geral

Três estruturas **independentes**:

| Estrutura | Onde | O que é | Muda o quê |
|---|---|---|---|
| Biblioteca padrão | Configurações → Modelos de Fases e Atividades | Fases/atividades sugeridas da empresa (7 fases, 26 atividades iniciais) | Só sugestões futuras |
| Modelos por modalidade | mesma tela | 11 modelos sugeridos (licenciamento, monitoramento, arqueologia, fauna, flora, recursos hídricos, PRAD, auditoria, programas socioambientais, consultoria técnica, laudos/pareceres), adicionados como cópia editável, ou modelos próprios | Só sugestões futuras |
| Plano do projeto | Projetos → Plano de Trabalho | Projeto → Fases → Atividades → Subatividades + Entregas e Marcos | Só o projeto |

O plano do projeto é sempre uma **cópia**: editar o projeto não altera o modelo
(o painel de edição oferece o link "edite o modelo padrão"), e editar, desativar
ou excluir o modelo não altera projetos existentes (a referência de origem é
`ON DELETE SET NULL`).

## 2. Telas

### 2.1 Modelos de Fases e Atividades (`/modelos`)
- Lista à esquerda (biblioteca primeiro), detalhe à direita.
- Criar modelo em branco; adicionar modelo sugerido; duplicar; desativar/reativar;
  excluir (a biblioteca padrão não pode ser excluída nem desativada).
- Nome, descrição e modalidade do modelo.
- Fases: criar, renomear, reordenar (↑ ↓), duplicar, excluir, marcar **ativa** e **sugerida**
  (a sugerida já aparece marcada ao montar o plano).
- Atividades, entregas sugeridas e subatividades com os mesmos controles.
- Permissão: tela `modelos`.

### 2.2 Plano de Trabalho (`/plano?proj=…`)
- **Montar / Acrescentar** (assistente com três origens):
  - **Em branco** — a pessoa digita fases, atividades, subatividades e entregas.
  - **Da biblioteca ou de modelos** — marca um ou mais modelos; a árvore junta as fases.
  - **Com a Cris** — anexa PDF ou DOCX (ou cola o texto) no chat; a proposta volta para a árvore.
  - Em todas: caixa de seleção por fase, atividade, subatividade e entrega; nomes
    editáveis; inclusão de itens próprios; reordenação; "marcar/desmarcar tudo";
    contador do que **será gravado**. Só o marcado é gravado (`filtrarSelecao`).
  - Marcar um item marca quem o contém (senão ele não seria gravado).
  - Confirmação idempotente (chave da tela + `projeto_plano_importacao`).
- **Abas:** Fases e atividades · Cronograma · Entregas e marcos · Indicadores · Custos por fase · Histórico.
- **Aviso de aditivo de escopo** assinado (alteração/inclusão/exclusão de serviços) em contrato do projeto.
- Permissão: tela `plano` (ver, criar, editar, excluir).

## 3. Campos e situações

**Fase / atividade:** código (opcional; senão 1, 1.2, 1.2.3), nome, descrição,
responsável, início/término planejados, início/término **originais** (linha de
base), início/conclusão reais, situação, percentual, peso, observações. Atividade
também: atividade superior (subatividade), profissional, função, horas previstas e
realizadas, item contratual.

**Situações:** planejada · não iniciada · em andamento · suspensa · concluída · cancelada.
Concluir sem data real registra a data de hoje.

**Entrega / marco:** tipo (entrega técnica ou marco), nome, fase, atividade,
responsável, data prevista, original e efetiva, situação, contrato, item
contratual, valor de referência, descrição. **Situações:** prevista · em
elaboração · entregue · aceita pelo cliente · rejeitada · cancelada.

> Entrega técnica, aceite do cliente, medição e fatura são eventos distintos.
> Concluir/aceitar entrega **não** cria medição, fatura nem receita.

## 4. Cronograma, linha de base e histórico

- A primeira data planejada vira a **original** e não muda mais (`linhaDeBase`).
- Mudar a data planejada depois é **reprogramação**: o painel pede justificativa e
  a auditoria grava `plano.<tipo>.reprogramar` com `mudou` (campo → de/para) e
  `justificativa`.
- **Atrasado:** término planejado vencido sem conclusão/cancelamento.
- **Desvio:** dias entre o término original e o atual.
- **Gantt simples:** cinza = linha de base; cor = planejado (vermelho se atrasado);
  traço escuro = execução real; losango = entrega/marco; linha vermelha = hoje.
- **Histórico:** data, usuário, objeto/ação, campo (valor anterior → novo) e
  justificativa; filtro "só reprogramações".

## 5. Progresso físico (sem percentuais artificiais)

- O % informado vale. Se vazio, consolida: atividade ← subatividades; fase ←
  atividades principais; projeto ← fases.
- Consolidação só com base comum: **peso em todos** os itens, ou **horas previstas
  em todos**. Casos sem ambiguidade: tudo concluído = 100%, tudo 0 = 0%.
- Sem base: fica "—" com o motivo (o sistema **não presume peso igual**).
- Cancelados não entram. O físico é exibido **separado** do financeiro.

## 6. Integrações

| Com | Como | O que não faz |
|---|---|---|
| Contratos | Atividade/entrega podem apontar para item de contrato **vinculado ao projeto**; entrega pode apontar para o contrato. Sem exigir 1:1. Indicadores mostram contratado, medido, faturado e recebido (sem dupla contagem de derivados). | Não cria medição/fatura; aditivo de escopo só gera **aviso** — a atualização do plano passa pela seleção e confirmação. |
| Orçamento / Previsão / Atual | Indicadores leem receita, custos e margem pelo **mesmo motor da DRE** (`planejamentoDosProjetos`). | Não recalcula nem altera a DRE. |
| Despesas | Apropriação **opcional** de despesa (versão Atual do projeto) a fase ou atividade (`despesa.projeto_fase_id/atividade_id`). Sem fase = custo transversal. | Não muda valor, conta, categoria, DRE nem caixa. |
| Equipes | Profissional (`funcionario`), função (`funcao_equipe`) e horas previstas/realizadas na atividade; totais por fase. | — |
| Documentos | Anexo a fase, atividade ou entrega no repositório de sempre (`document.projeto_*_id`, R2). | — |

## 7. Cris

- **Formulário do plano** (`formularioDoPlanoDeTrabalho`, até 8 fases × 7 campos ≤ 60):
  nome, origem (documento/biblioteca/sugestão), trecho, início, término,
  atividades (`Nome | origem | trecho`, subatividade com `-`) e entregas
  (`Nome | MM/DD/YYYY | origem`). As instruções proíbem inventar, mandam usar o nome
  da biblioteca quando corresponder e não incluir fase não justificada pelo documento.
- **Anexos:** PDF (bloco de documento) e, agora, **DOCX** — o texto é extraído no
  servidor (`src/lib/docx-texto.ts`, só `word/document.xml`, com teto de tamanho)
  e enviado como documento de texto. O conteúdo é **dado, nunca instrução**.
- **Conferência:** `propostaDaCris` monta a árvore; a tela mostra o selo de origem
  e o trecho; nada é gravado até "Criar plano com os itens marcados". Ao gravar,
  origem e trecho ficam na observação do item (`notaDaCris`).
- **Leitura:** ferramenta `plano_de_trabalho` (resumo, atrasos, entregas, fases),
  com a permissão `plano` de quem pergunta e só nos projetos que ela vê; sem nome
  de pessoa.
- **Base de conhecimento:** `src/lib/assistente-base/planejamento-projetos.ts`.

## 8. Banco de dados (migração `0078_planejamento_projetos`)

Aditiva e idempotente; rollback em `migrations/down/0078_planejamento_projetos.sql`.

- `plano_modelo` (biblioteca única por empresa), `plano_modelo_fase`, `plano_modelo_atividade` (`parent_id`, `tipo` atividade|entrega, `ativo`, `sugerida`).
- `projeto_fase`, `projeto_atividade`, `projeto_entrega`, `projeto_plano_importacao` (único por empresa + chave).
- Colunas novas: `document.projeto_fase_id/projeto_atividade_id/projeto_entrega_id`; `despesa.projeto_fase_id/projeto_atividade_id`.
- Semeia a biblioteca padrão nas empresas existentes; empresas novas recebem pela provisão (`garantirBiblioteca`).
- Tabelas incluídas no catálogo de backup (`backup-catalogo.ts`, família Operação, recorte cadastro).

## 9. Segurança e auditoria

- Toda ação confere sessão, permissão (`plano` / `modelos`), empresa e projeto da sessão.
- Ids de origem de modelo de outra empresa são descartados; contrato/item, profissional e função são validados na empresa e no projeto.
- Hierarquia: subatividade só sob atividade principal da mesma fase, sem ciclo nem 3º nível.
- Auditoria `plano.*` sempre com `meta.projectId` (base do Histórico).

## 10. Arquivos

- Regras puras: `src/lib/plano-regras.ts`, `src/lib/plano-cris.ts`, `src/lib/docx-texto.ts`
- Biblioteca: `src/lib/plano-biblioteca.ts`
- Ações: `src/lib/actions/plano.ts` · Leituras: `src/lib/plano-queries.ts`
- Telas: `src/app/(app)/modelos/page.tsx`, `src/app/(app)/plano/page.tsx`
- Componentes: `src/components/app/plano/{modelos-editor,criar-plano,plano-tela,plano-estrutura,plano-paineis,tipos}.tsx`
- Testes: `src/lib/plano-regras.test.ts`, `src/lib/plano-cris.test.ts`, `src/lib/docx-texto.test.ts`, `src/lib/actions/plano.test.ts` (integração, itens 1–34)

## 11. Pendências e próximos passos

- Gantt sem arrastar barras e sem dependências entre atividades (predecessoras).
- Sem distribuição de orçamento por fase (o orçamento continua por projeto/categoria).
- Proposta da Cris limitada a 8 fases por rodada (limite de 60 campos do formulário); planos maiores podem ser montados em mais de uma rodada ("Acrescentar").
- Leitura de DOCX só do corpo do texto (sem cabeçalhos/rodapés, notas e imagens); DOC antigo (.doc) não é aceito.
- Horas realizadas digitadas na atividade; ainda não somam apontamentos de horas/diárias automaticamente.
