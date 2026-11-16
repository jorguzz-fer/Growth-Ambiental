# Prompt D · PR D-2 — a tela de Orçamentos e Previsão Atualizada

Só apresentação e as ações de interface previstas. Nenhum número gravado muda.

## Nomes e textos (seção 2)
- Título **"Orçamentos"** (rota `/budget`) com subtítulo "Planeje e acompanhe
  as receitas e despesas do projeto."; **"Previsão Atualizada"** (rota
  `/forecast`) com "Revise a distribuição mensal a partir do Orçamento; os
  totais e as linhas são herdados dele." O menu já dizia isso (Prompt C).
- **Alternador** `Orçamentos | Previsão Atualizada` ao lado do título (BD-4):
  só navega entre as duas rotas, preservando `?proj=`.
- Badge **"N competências"** (2.4).
- Previsão (2.5): "Nova Previsão Atualizada a partir do Orçamento", "Nome da
  Previsão", "Criar Previsão", "Comparar com o Orçamento"; a comparação diz
  "Comparação Orçamento × Previsão Atualizada" com colunas Orçamento /
  Previsão. Nenhum nome interno mudou (`forecast`, `duplicateForecast`…).
- **2.6**: quando a versão já foi replicada do Atual, uma linha diz a data da
  última replicação (lida do `audit_log`, nada novo gravado) e que o valor
  carrega a correção do INCC daquele momento.

## Linha "Receitas do Projeto" (seção 3)
Primeira do bloco, com o subtítulo "Total vem do cadastro do projeto
(distribuição mensal editável)". A célula do total é **somente-leitura, com
aparência própria** (tracejada), com link "editar" para `/projeto?proj=<id>`
(3.4). Projeto sem valor de receita no cadastro: a célula mostra **"falta
preencher o cadastro"** (link), **nunca R$ 0,00**, e o resto da tela segue
funcional (3.5). Descrição do bloco conforme 3.3. Os percentuais mensais
continuam editáveis e salvam (3.2).

## Incluir e excluir linha (seção 4-A)
- Rodapé de cada bloco em **Orçamentos**: "Incluir linha do Plano de Contas"
  com a lista de grupos **cadastrados, ativos, da natureza e ausentes**
  (4-A.2); quando não há, diz que todos já estão na grade; sempre o link
  "Grupo não existe? Cadastre no Plano de Contas" — não se cria grupo aqui.
  A linha incluída entra zerada, sem remontar a grade (a distribuição não
  salva de outras linhas não se perde).
- Ação **×** na linha (4-A.3): zerada sai direto; com valor abre o diálogo
  "Remover lançamento?" dizendo quantas competências e qual total serão
  apagados desta versão, e que o grupo continua no Plano de Contas. A fixa e
  as legadas não têm a ação (4-A.4).
- **Previsão Atualizada**: sem as ações; a grade diz "As linhas desta grade
  vêm do Orçamento de origem" (4-A.7, BD-7).
- Importação de planilha continua só atualizando linhas da grade (4-A.6).

## Validação
- Suíte 159 / 1508; `tsc`, `eslint`, `next build`.
- Navegador, com obra de teste criada e excluída ao fim: título, alternador,
  "3 competências"; célula "falta preencher o cadastro" antes do valor e
  "R$ 270.000 · editar" depois; 50/50 na fixa salvo; remover zerada sem
  diálogo (19 → 18 grupos), incluir de volta; linha com valor abre o diálogo
  com "1 competência(s)" e "R$ 1.000,00" e remove; Previsão com os textos
  novos, sem ação de remover e com a nota de herança; comparação com os
  rótulos novos. Logs da obra de teste removidos.
