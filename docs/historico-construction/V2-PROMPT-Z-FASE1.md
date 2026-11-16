# Prompt Z · Módulo Pessoas — Fase 1, inventário antes de escrever código

Prompt Z (24 de 42). Módulo novo (`/funcionarios`, `/equipes`), extingue
`/ponto`. **Só leitura; nada foi alterado.** SQL em
[`sql/v2-prompt-z-diagnostico.sql`](./sql/v2-prompt-z-diagnostico.sql).

## O que existe hoje (confirmado no código)
- **`/ponto`** (`ponto/page.tsx`, `ponto-manager.tsx`, `actions/ponto.ts`):
  registro de entrada/saída por **geolocalização** (`registrarPonto` compara
  com `project.latitude/longitude/raio`), `gerarContaPagarPonto` que cria
  **despesa sem fornecedor** (`obs = "Mão de obra (ponto) · nome · n dia(s)"`,
  categoria "Custo Variável") e marca `time_entry.despesa_id`. Os defeitos de
  1.2 estão lá (conta só entradas; `dias.size × valor` — este já conta dias
  distintos; sem `fornecedorId`). Menu: item "Ponto" no módulo Obra; chave de
  permissão `ponto` (módulo "Despesas" na matriz).
- **`time_entry`**: tabela com `latitude/longitude/precisao/distancia/
  dentro_raio/dispositivo/justificativa/despesa_id`. **Base local: 0 linhas,
  0 despesas geradas, 0 auditorias `ponto.gerar_conta`.** Produção: rodar o
  SQL (BZ-4) — a tabela **fica** em qualquer cenário.
- **Fornecedores** (Prompt W): `cpfValido` em `stakeholder-regras.ts`
  (reusar, 2.5); endereço condicional para PF com papel de serviço/mão de obra
  **já implementado** (W-1); papéis incluem "Prestador de Serviço", "Mão de
  Obra CLT", "Mão de Obra RPA", "Sócio/Quotista", "Responsável Técnico (RT)".
  **Não há campo de diária** no cadastro (3.5.4 confirma).
- **Dado sensível** (Prompt M, BM-3): padrão pronto — tela de permissão de
  CAMPO (`clientesdados`, em `TELAS_SENSIVEIS`: nasce só com owner/admin),
  `CAMPOS_SENSIVEIS_CLIENTE` omitidos **no servidor** para quem não tem a
  permissão, `mascararDocumento` para CPF na listagem, `changesSemValorSensivel`
  no log e `CAMPOS_PROTEGIDOS` em `audit-mask.ts`. **É o molde.**
- **Documentos**: `document` tem vínculos por despesa, cliente, stakeholder,
  conta a receber, permuta e (Prompt Y) movimento de estoque; versão por tipo
  e remoção que desfaz só o vínculo (`addPermutaDocs` / `addStockMovementDocs`);
  várias imagens com miniatura e compressão no navegador (Prompt Y, 4-A).
- **Menu**: 8 módulos (bi, planejamento, receitas, despesas, caixa, obra,
  config…). O comentário do `nav-menu.ts` diz que "Pessoas" não entra até a
  tela existir. `Modulo` da matriz não tem "Pessoas".
- **Assistentes**: padrão "somente leitura" (Contas) e "propõe, você
  confirma" (Caixa, Estoque) prontos para replicar.

## Bloqueios — decisões adotadas
| | Decisão |
|---|---|
| **BZ-1** | **Recomendação do prompt**: a Equipe **registra a diária executada e propõe** o lançamento; a despesa nasce **só** em `/despesas` (uma porta só, como Ressarcimentos e Cartões), com o autônomo como fornecedor, por link pré-preenchido (valor = acumulado do período, competência, fornecedor, histórico). Nenhuma conta a pagar é gerada automaticamente. CLT: não se aplica (folha). |
| **BZ-2** | **Registro**, com **salário e jornada** guardados (resolvido no prompt), atrás de permissão própria de campo (`funcionariosdados`), fora do log em claro e fora do assistente. Sem folha: nada é calculado. |
| **BZ-3** | **Lista fechada, editável**: tabela `funcao_equipe` por tenant, com as cinco funções citadas criadas na primeira leitura do tenant (sem migração de dado); gestão na própria tela de Equipes (permissão `equipes:editar`) — o prompt sugere Configurações; fica na tela do módulo para não espalhar. **Pergunta ao usuário:** prefere em Configurações? É só mover. |
| **BZ-4** | 0 registros na base local; SQL para produção. **Tabela não é apagada.** Se produção tiver registros, ficam consultáveis; o relatório final diz quantos. |

## Decisões de modelagem
1. **Tabelas novas (migração 0061)**, todas por tenant, aditivas:
   - `funcionario`: identificação (nome, nascimento, nacionalidade, estado
     civil, nome da mãe), documentos com número (CPF, RG + órgão/UF, CTPS
     número/série, PIS, título, reservista, CNH), endereço residencial,
     contrato (admissão, cargo, setor/obra `project_id`, tipo de contrato,
     prazo, jornada, desligamento, situação), **salário**, dados bancários,
     observações. `ativo` deriva de `data_desligamento IS NULL`.
   - `funcionario_dependente`: nome, nascimento, parentesco, IR, salário-família.
   - `funcao_equipe`: nome, ativo (BZ-3).
   - `equipe_projeto`: `project_id`, `stakeholder_id` **ou** `funcionario_id`
     (**CHECK no banco**: exatamente um), `funcao_id`, `valor_diaria`
     (nulo para CLT e sócio), `entrada`, `saida`, `situacao`, obs.
   - `equipe_dia`: `project_id`, `data`, obs — o "dia da equipe" ao qual se
     anexam folha de ponto e fotos (3.6.5: por dia, não por membro).
   - `diaria`: `equipe_dia_id`, `equipe_projeto_id`, `quantidade` (1 ou 0,5),
     **`valor` gravado** no registro (3.5.4), obs, `despesa_id` (preenchido
     quando a pessoa lança em `/despesas` pelo link — rastro do BZ-1).
   - `folha_competencia`: `competencia` (MM/YYYY), obs, `despesa_id` (vínculo
     com a despesa que pagou a folha, 2.2-B.4).
   - `document`: `funcionario_id`, `equipe_dia_id`, `folha_id` (todas `set
     null`) e `validade` (data ISO, 2.2-A.7).
   - `aso_acesso`: registro de quem abriu um ASO e quando (7.3-A).
2. **Permissões (matriz)**: módulo novo **"Pessoas"**; telas `funcionarios`
   (ficha), `funcionariosdados` (**sensível**: endereço, salário, jornada,
   dados bancários, dependentes — campos omitidos no servidor sem `ver`),
   `funcionariosaso` (**sensível**: ASO — sem `ver`, o servidor não devolve
   nem a existência), `equipes` (alocação, diárias, funções). Sensíveis nascem
   só com owner/admin (`TELAS_SENSIVEIS`).
3. **CPF**: `cpfValido` reusado; duplicidade avisa (entre funcionários e
   contra `stakeholder` PF); listagem **mascarada** com `mascararDocumento`;
   log registra só que mudou (`changesSemValorSensivel`-equivalente com a
   lista do funcionário); `CAMPOS_PROTEGIDOS` ganha cpf, pis, ctps, salario,
   endereço e banco para a exibição do log antigo.
4. **Extinção do `/ponto`**: rota, componente, actions e item do menu saem;
   chave `ponto` sai de `SCREENS` (permissões salvas com a chave sobram no
   JSON sem efeito); `time_entry` e as colunas de geolocalização de `project`
   **ficam**. Teste do menu: 39 → 38 telas antigas.
5. **Assistentes**: Funcionários **somente leitura** sobre nomes, datas, tipos
   e contagens (nunca CPF, endereço, salário, banco, dependentes, folha, nem
   conteúdo de documento); Equipes **propõe e para** (diárias do dia a partir
   da equipe; ler folha de ponto anexada → propõe; sem gravar). A leitura da
   folha de ponto por IA recebe **só a folha de ponto** (tipo "Folha de ponto
   assinada"), nunca documento de funcionário.
6. **Retenção (7.3-C)**: registrada **por tipo** numa tabela de referência em
   código (`PRAZOS_GUARDA`) com o prazo usual (ex.: ASO 20 anos após
   desligamento, NR-7; CTPS/contrato enquanto durar + prescrição…), marcada
   **"confirmar com o contador"**; nada é apagado automaticamente.

## Plano de PRs
| PR | Entrega |
|---|---|
| Z-1 | Migração 0061; extinção do `/ponto`; módulo Pessoas no menu e na matriz; **Funcionários**: ficha completa, dependentes, campos sensíveis separados no servidor, CPF mascarado/validado/duplicidade, desligamento, exclusão com nome digitado, auditoria sem valor sensível |
| Z-2 | Documentos do funcionário (tipos, validade, checklist de admissão, ASO com permissão própria e registro de acesso) e **Folha por competência** (documentos, vínculo com despesa, conferência) |
| Z-3 | **Equipes**: funções (BZ-3), alocação com origem única, diárias em lote com valor gravado, acumulado, documentos por dia, proposta de lançamento em `/despesas` (BZ-1) |
| Z-4 | Dois assistentes (6.1 somente leitura, 6.2 propõe) e relatório final |

## Base local — antes
`time_entry` 0 · `stakeholder` 3 · `despesa` 75 /
R$ 43.701,75 · `project` 3.
