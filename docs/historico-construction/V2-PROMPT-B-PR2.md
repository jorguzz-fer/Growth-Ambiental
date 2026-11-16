# Prompt B · PR B-2 — a tela de Projetos redesenhada

Só apresentação e navegação local. Nenhum dado existente é alterado.

## Visão "Todos" (seções 2, 7, 8, 35)
- Título **"Projetos"** (tabela de nomenclatura), subtítulo renderizado.
- Seletor com **grupos** "Obras" e "Unidades / escritórios" (`ProjectPicker`
  ganhou `kind` opcional; as outras 23 telas que o usam não mudam). A ordem já
  vinha do contexto (Prompt A).
- **Busca** por nome ou cliente que filtra os cards; contador "N obra(s) · N
  unidade(s)"; "Novo projeto" e "Nova unidade" abrem o formulário só quando
  pedidos (menos altura).
- Cada obra é um card com **cabeçalho compacto**: ícone, nome (link para a
  obra), badge Ativo / Finalizado / **"—"** (não classificado), cliente, valor
  global (ou "sem valor global"), duração derivada, início e fim, e o menu
  **`[...]`** = Abrir projeto · Copiar link · Excluir projeto… (o Excluir saiu
  de perto do Salvar; abre o diálogo da B-1).
- Blocos: **Dados do projeto** (branco) · **Receitas** (verde suave) ·
  **Custos** (rosa suave) · **Estrutura financeira** (azul suave) ·
  **Documentos**. Receitas antes de Custos; o bloco "Terreno & valor global"
  misturado deixou de existir.

## Visão de um projeto (seções 14–22)
- Título "Projeto NOME", "← Projetos" no topo e "Voltar" no rodapé; só ele
  aparece; o seletor continua local.
- **Localização do projeto** (endereço, CEP, município, UF, código IBGE com
  aviso de efeito fiscal, latitude, longitude, CNO/CEI, ART, incidência do
  ISS) à esquerda; o espaço à direita recebe o **Orçado x Realizado** (B-3).
  Esses campos só vão no patch nesta visão.

## Regras na tela (seções 9, 12, 17)
- **Duração** virou somente-leitura: contagem de competências entre as datas;
  aviso quando difere do valor gravado ("O cadastro diz 24 meses, mas sem as
  duas datas não há janela"). `duration_months` não é lido para nada nem
  alterado. A frase falsa sobre as colunas do Budget foi removida (2 lugares).
- **Fase (legado)**: o enum antigo aparece somente-leitura; deixou de ser
  editável (era).
- **Datas**: fim < início trava o Salvar com aviso; o servidor recusa também.
- **Vazio ≠ zero**: campos monetários nulos ficam em branco ("não informado"
  como placeholder); "Valor global" e "Entrada financeira" mostram "—" sem
  valores. Regras de cálculo intactas.
- **Funding**: aviso com a diferença quando as fontes não alcançam o valor
  global; "não informadas" quando nunca preenchidas.
- **Município sem IBGE** e **coordenada em obra com ponto** avisam.
- Criar projeto: sem campo de duração; abre o recém-criado (ação local).

## Validação
- `tsc`, `eslint`, suíte 153/1470, `next build`.
- Navegador: título/subtítulo, 2 grupos no seletor, cards com cabeçalho,
  aviso de duração na obra com 24 meses e sem datas, Fase (legado) só leitura,
  campo vazio sem "0,00", Localização ausente na visão Todos; busca; criar
  obra com **25/01/2026 → 25/06/2026**, 6 competências, abre a obra, datas
  voltam iguais; CEP "11700000" → "11700-000"; avisos de IBGE e de funding;
  menu `[...]` e exclusão com retorno a "Todos". Projeto de teste e seus logs
  removidos.
