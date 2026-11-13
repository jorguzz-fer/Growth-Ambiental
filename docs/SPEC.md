# SPEC — Growth Tools · Construction App

> Especificação funcional **reconstruída a partir do protótipo** (`growth-tools-construction.html`, ~2.800 linhas, single-file).
> Este documento descreve **todas as funcionalidades que já existem** no protótipo, para servir de base à reconstrução em stack de produção (ver [`STACK.md`](./STACK.md)).

---

## 1. Visão geral

**Produto:** SaaS de **FP&A (Financial Planning & Analysis) e BI** especializado para **incorporadoras e construtoras imobiliárias**.

**Empresa:** Tools for Growth (TFG) — Sócios da TFG.

**Cliente piloto:** Cliente Piloto (incorporadora) / Construtora Piloto — empreendimento **EMPREENDIMENTO PILOTO** (padrão MCMV/PEC; quantidade de unidades e custo de edificações: [valor removido]).

**Precificação piloto:** [valor removido] (cliente fundador).

**Proposta de valor:** consolidar, em uma única ferramenta, o planejamento financeiro de um empreendimento imobiliário — projeção de receitas de venda (planos de pagamento complexos com correção INCC), controle de despesas por plano de contas CEF, conciliação de caixa via Open Finance, e relatórios gerenciais (DRE, fluxo de caixa, medição de obra para a Caixa Econômica Federal).

### Conceitos de domínio centrais

| Conceito | Descrição |
|---|---|
| **Tenant (empresa cliente)** | A incorporadora. Ex.: "Cliente Piloto (incorporadora)". Multi-tenant. |
| **Projeto / Unidade organizacional** | Um empreendimento (ex.: "Bloco A — Cliente Piloto") ou um escritório/filial. O usuário troca o contexto ativo. |
| **Unidade (imóvel)** | Apartamento à venda. Possui código (`UNID 401`), bloco, tipo, m², andar, valor (VGV), status (Disponível / Reservado / Vendido) e **plano de pagamento completo**. |
| **Versão (cenário)** | Cada projeto tem versões de planejamento com **dados completamente isolados**. Ver §4. |
| **Plano de pagamento** | Cascata de fontes de recebimento de uma unidade vendida (ver §5). |
| **INCC** | Índice Nacional de Custo da Construção — corrige parcelas a partir da 5ª (ver §6). |
| **Plano de Contas** | Classificação dupla das despesas: Grupo CEF (orçamento sintético) + Categoria DRE (ver §9). |

---

## 2. Layout & navegação

Aplicação de tela única (SPA) com:

- **Sidebar fixa (238px)** com:
  - Logo "Growth Tools / Construction App".
  - Empresa cliente (tenant).
  - Seletor de **Projeto / Unidade** (abre modal `switchProj`).
  - Seletor de **Versão ativa** (dropdown com indicador de cor + opção "Nova versão / duplicar").
  - Navegação agrupada em 4 seções: **Módulo Receitas**, **Módulo Despesas**, **Reports & Dashboards**, **Config**.
  - Badges numéricos por item (contagem de unidades, reembolsos, permutas, despesas, fornecedores).
  - Rodapé com usuário logado e papel (`owner`).
- **Topbar** com título/subtítulo da tela atual + área de ações contextuais (botões por tela).
- **Área de conteúdo** renderizada dinamicamente por tela.
- **Sistema de toast** (sucesso/erro) e **modais** sobrepostos.

### Mapa de telas (19 telas)

```
Módulo Receitas
 ├─ Unidades / Dados de Venda
 ├─ Simulador (SAC / PRICE / SBPE)
 ├─ Reembolso
 ├─ Permuta
 └─ Parâmetros / INCC
Módulo Despesas
 ├─ Lançamentos de Despesas
 ├─ Fornecedores & Stakeholders
 └─ Plano de Contas
Reports & Dashboards
 ├─ Dashboard (multi-versão)
 ├─ Projeção de Receitas
 ├─ Consolidado
 ├─ Caixa
 ├─ DRE
 ├─ Fluxo de Caixa Mensal
 ├─ Medição de Obra (imprimível CEF)
 ├─ Rolling Forecast
 └─ Resumo Executivo
Config
 ├─ Usuários & Acessos
 └─ Acesso Contabilidade
```

---

## 3. Modelo de dados (entidades do protótipo)

### Unidade (`unit`)
```
id, code (ex. "UNID 401"), bloco, tipo (ex. "3D T1"), m2, andar,
valor (VGV da unidade), status (Disponivel|Reservado|Vendido),
mesVenda, usarAS,
// blocos do plano de pagamento (cada um liga o próximo via flag "usar..."):
AS        {val, venc, n, usarS1}            // Ato de Assinatura
S1, S2, S3{val, venc, n, usar<próximo>}     // Sinais/reforços
Mensais   {val, venc, n, usarSem}
Semestrais{val, venc, n, usarAnu}
Anuais    {val, venc, n, usarFGTS}
FGTS      {val, dataPrev, usarSub}
Subsidio  {val, dataPrev, statusSub (Aguardando Caixa|Recebido), usarPer}
Permuta   {desc, val, dataPrev, usarFinanc}
Banco     {valFinanc, dataEntrada, dataPrimParc, statusFinanc}
```

### Permuta (`permuta`)
```
id, unit, cliente, dataRec, tipo (Carro|Imovel|...), desc,
estimado, status, dataVenda, valorVenda, tipoPerm, obs
```

### Reembolso (`reembolso`)
```
id, data (REAL), origem, valor, pct, obs, serial (automático), status (received|...)
```

### Lançamento de caixa (`cash`)
```
id, data, desc, val, cat (mensais|reembolso|AS|outro...), unit, rec (conciliado bool)
```

### Despesa (`despesa`) — por versão
```
id, fornecedorId, contaId (subitem do plano de contas), categoriaDRE,
competência, vencimento/caixa, valor, status, doc (anexo)
```

### Fornecedor / Stakeholder (`STAKEHOLDER`) — registro global do tenant
```
id, nome, tipo (PJ|PF), doc (CNPJ/CPF), papeis[] (multi), email, tel, obs
```
19 papéis possíveis: Fornecedor de Material, Prestador de Serviço, Mão de Obra CLT/RPA, Banco/Financiador, Comprador de Unidade, Sócio/Quotista, Responsável Técnico, Imobiliária Parceira, Corretor Autônomo, Incorporador, Construtora, Escritório Contábil/Jurídico, Agência de Marketing, Empresa de Tecnologia, Órgão Público, Consultor/Assessor, Seguradora.

### Conta bancária (`BANK_ACCOUNT`)
```
id, banco, ag, op, cc, tipo (Imobiliária|Construtora), openFinanceId, lastSync
```
→ Campos `openFinanceId` / `lastSync` já preparados para integração Open Finance.

### Projeto / Escritório
```
PROJECT {id, name, tipo:'proj', st (Em andamento|Planejamento), units}
OFFICE  {id, name, tipo:'unit', st}
```

---

## 4. Arquitetura de versões (cenários)

Recurso central do produto. Cada **projeto** mantém múltiplas **versões de planejamento**, cada uma com **dados isolados** (units, permutas, reembolsos, caixa, despesas — cópias independentes).

| Versão | Chave | Cor | Natureza |
|---|---|---|---|
| Budget / Orçamento | `budget` | Índigo `#6366f1` | Plano fixo original |
| Previsto / Forecast | `forecast` | Verde `#10b981` | Revisão mensal (default) |
| Atual — caixa real | `atual` | Âmbar `#f59e0b` | Realizado (extrato bancário) |
| Customizadas | até 3 | — | Duplicadas a partir de outra versão |

- **Limite:** 3 versões fixas + 3 customizadas = **6 por projeto**.
- Trocar a versão ativa recalcula **todas** as telas com os dados daquela versão.
- O Dashboard permite exibir **até 3 versões simultaneamente** (comparação lado a lado), via checkboxes `dashVers`.
- "Nova versão" duplica os dados de uma versão existente (deep clone).

---

## 5. Plano de pagamento (cascata de fontes)

O coração da projeção de receitas. Cada unidade vendida tem uma cascata de fontes de recebimento, cada uma **ativada por flag** que libera a próxima:

```
Ato de Assinatura (AS) → Sinal 1 → Sinal 2 → Sinal 3 →
Mensais → Semestrais → Anuais → FGTS → Subsídio → Permuta → Financiamento Bancário
```

Cada fonte tem **valor**, **data de vencimento**, **quantidade de parcelas (n)** e gera lançamentos projetados na matriz mês a mês (`calcProj`):
- Parcelas mensais espaçadas de 1 mês; semestrais de 6; anuais de 12.
- **Subsídio** só projeta se `statusSub === 'Recebido'`.
- **Total da unidade** (`calcUnitTotal`) soma todas as fontes; comparado ao `valor` (VGV) gera **saldo** (verde se bate, vermelho se diverge).

`calcTotals()` agrega por versão: VGV, total de sinais, mensais, semestrais, anuais, FGTS, subsídio, permuta (recebida/vendida), reembolsos, banco/financiamento, e contagem de unidades por status.

---

## 6. INCC — correção monetária

- Tabela `INCC` de **48 meses** (05/2025 → 04/2029): variação mensal (`mo`) + acumulada (`ac`).
- `recalcINCC()` recalcula o acumulado encadeado a partir das variações mensais (editável).
- `getINCC(mm)` retorna o acumulado de um mês.
- **Regra de negócio:** parcelas mensais/semestrais/anuais são corrigidas pelo INCC **a partir da 5ª parcela** (`i >= 4`).
- Tela **Parâmetros / INCC**: edição da tabela + botão Salvar.

---

## 7. Módulo Receitas — telas

### 7.1 Unidades / Dados de Venda
- Listagem das unidades (código, bloco, tipo, m², valor, status com badge colorido).
- Ações: **Importar xlsx** (modal de upload de planilha com parsing via XLSX.js + preview `pendingImport`), **Nova Unidade**, **Editar Venda** (modal completo do plano de pagamento — grupos colapsáveis por fonte, com total e saldo calculados ao vivo).
- Badge na sidebar com contagem de unidades da versão.

### 7.2 Simulador (SAC / PRICE / SBPE)
- Simulação de financiamento de uma unidade. Entrada: valor do imóvel, entrada, sinais, parcelas anuais, nº de mensais, FGTS, subsídio, financiamento, renda, data de início.
- Calcula: total de entrada, saldo a financiar, parcela mensal, % de entrada, **comprometimento de renda (limite 30%)**.
- Gera **fluxo de 36 meses** (evolução de obra linear) com:
  - **SAC** — parcela decrescente (amortização constante + juros 1%/mês).
  - **PRICE** — parcela fixa (fórmula de anuidade, taxa 1%/mês).
  - **SBPE** — variante de financiamento bancário.
  - Correção INCC aplicada a partir da 5ª parcela.

### 7.3 Reembolso
- Aba própria. Lançamentos com **Data REAL** + **SERIAL automático**. Valor, origem, %, observações, status. Badge de contagem.

### 7.4 Permuta
- Inventário de ativos recebidos como permuta (carro, imóvel, etc.). Valor estimado vs. valor de venda realizado, status, datas. Entra no agregado de receitas.

### 7.5 Parâmetros / INCC
- Ver §6.

---

## 8. Módulo Despesas — telas

### 8.1 Lançamentos de Despesas
Tela com abas internas:
- **Lançamentos** — despesa por competência, vinculada a fornecedor + conta (subitem do plano de contas) + categoria DRE.
- **A Pagar** — contas a pagar por vencimento.
- **Repositório de Documentos** — anexos (notas fiscais/contratos) por despesa.
- Ação **Upload Extrato** (conciliação bancária) + **Nova Despesa**.

### 8.2 Fornecedores & Stakeholders
- Cadastro completo: nome, PJ/PF, documento (CNPJ/CPF), múltiplos **papéis**, contato.
- Aba de **Contas Bancárias** (`BANK_ACCOUNTS`) com tipo (Imobiliária/Construtora) e campos Open Finance.
- Registro **global do tenant** (compartilhado entre versões).

### 8.3 Plano de Contas
- **Dupla classificação:**
  - **10 grupos CEF** (Orçamento Sintético Habitação) com subitens: Serviços Preliminares, Fundações, Supraestrutura, Paredes/Painéis, Cobertura, Revestimentos, Pavimentação, Instalações, Complementações, Infraestrutura/Urbanização.
  - **9 grupos complementares**: Técnicos/Projetos, Comercial/Vendas, Marketing, Tecnologia, Administrativo, Financeiro/Contábil, RH, Pós-obra, Tributos.
  - **7 categorias DRE**: Receita, Custo Variável, Custo Fixo, Despesa Variável, Despesa Fixa, Retiradas, Investimento.
- Cada despesa recebe um subitem CEF **+** uma categoria DRE.

---

## 9. Reports & Dashboards — telas

### 9.1 Dashboard
- **Comparação multi-versão** (até 3 simultâneas via checkboxes).
- KPIs: VGV, vendidas/disponíveis/reservadas, receita realizada (caixa), etc.
- Gráficos (Chart.js): evolução de recebíveis, comparativo entre versões, distribuição por fonte/status.
- `postDash()` renderiza os charts após o HTML.

### 9.2 Projeção de Receitas
- **Matriz unidade × mês × fonte** ao longo de 48 meses. Soma por mês de todas as fontes projetadas (`calcProj` por unidade + reembolsos por mês).

### 9.3 Consolidado
- Recebíveis agregados em visões **Mensal / Trimestral / Semestral / Anual**.

### 9.4 Caixa
- Abas: **Lançamentos**, **Conciliação** (marcar `rec`), **Upload de Extrato**, **Previstas**.
- Janela de 7 dias + entradas previstas. Lançamentos reais por versão.

### 9.5 DRE — Demonstração de Resultado
- Por **competência**, período selecionável. Agrupa despesas/receitas pelas 7 categorias DRE.

### 9.6 Fluxo de Caixa Mensal
- Entradas e saídas por **data de vencimento**, com **saldo mensal** acumulado.

### 9.7 Medição de Obra (imprimível CEF)
- Evolução por **grupo CEF**: orçado vs. realizado. Layout **imprimível** (`window.print()`) + exportar PDF — para envio à Caixa Econômica Federal (formulário FRE / Cronograma CEF).

### 9.8 Rolling Forecast
- Projeção atualizada em tempo real (barras previsto vs. realizado por período). `postRolling()` renderiza.

### 9.9 Resumo Executivo
- Indicadores gerais do empreendimento (síntese para gestão/sócios).

---

## 10. Config — telas

### 10.1 Usuários & Acessos
- Gestão de membros do tenant (papéis: owner, etc.). Convites.

### 10.2 Acesso Contabilidade
- Visão **restrita / somente leitura** para o escritório contábil: balancetes e demonstrativos. Modal `inviteContador` para convidar contador.

---

## 11. Recursos transversais

| Recurso | Estado no protótipo |
|---|---|
| **Importação XLSX** | Funcional via XLSX.js (planilha de unidades, extratos). |
| **Exportação / Impressão** | `window.print()` na Medição; export PDF stub. |
| **Open Finance** | Campos preparados (`openFinanceId`, `lastSync`) — integração não implementada. |
| **Multi-tenant** | Estruturado (tenant + projetos), sem backend. |
| **Multi-projeto** | Troca de contexto via modal. |
| **Gráficos** | Chart.js 4.4.1. |
| **Formatação BRL** | Helpers `brl`, `brl0`, `brlk`. |
| **Persistência** | ❌ Nenhuma — todo o estado é em memória (variáveis JS). Recarregar a página perde tudo. |
| **Autenticação** | ❌ Nenhuma — usuário "Cliente Piloto Admin" hardcoded. |
| **Backend / API** | ❌ Nenhum — 100% client-side. |

---

## 12. Lacunas do protótipo (a resolver na reconstrução)

1. **Persistência real** — banco de dados (substituir estado em memória).
2. **Autenticação e autorização** — login, papéis (owner/admin/contador/leitura), RLS multi-tenant.
3. **Open Finance** — integração real com agregador bancário (Pluggy/Belvo) para puxar extratos e conciliar caixa automaticamente.
4. **Persistência de uploads** — repositório de documentos (notas, contratos) em storage real.
5. **Geração de PDF server-side** — medição de obra e relatórios.
6. **Isolamento de versões em banco** — modelar as 6 versões/projeto com dados versionados.
7. **API e auditoria** — histórico de alterações, log de quem mudou o quê.

> A reconstrução de stack para deploy em **VPS + Coolify** está descrita em [`STACK.md`](./STACK.md).
