/** Base de conhecimento da Cris — módulo Contratos e Aditivos (Growth Ambiental). */
export const TEXTO = `## Contratos (/contratos) — módulo Contratos

**Para que serve:** gestão contratual de consultoria ambiental, arqueologia e serviços técnicos: o contrato, os projetos que ele atende, os itens, os aditivos, as medições, o faturamento, os recebimentos, as despesas reembolsáveis e o cronograma. É uma camada sobre os registros financeiros de sempre: a fatura do contrato é uma **conta a receber**; o custo é uma **despesa**; o documento é o mesmo repositório de documentos.

**Telas:**
- **Contratos**: lista com busca e filtros (cliente, projeto, tipo, gestor, situação e período). Mostra valor atualizado, medido e saldo contratual.
- **Página do contrato**, com abas: Visão geral, Escopo e itens (com o cronograma físico-financeiro), Projetos, Aditivos, Medições, Faturamento e recebimentos (com despesas reembolsáveis), Custos e resultados, Documentos e Histórico.
- **Painel de Contratos**: ativos, valor contratado, disponível para medição, medições e aditivos pendentes, vencimentos em 60 dias, margem por contrato e rentabilidade por cliente.
- **Aditivos** e **Medições** (medições de serviço): listas de todos os contratos.
- **Despesas Reembolsáveis**: relatório por contrato e período, com exportação em PDF e XLSX.
- **Modalidades de Serviço**: a empresa cria, renomeia, desativa e reativa as modalidades.

**Regras que confundem:**
- **Valor original nunca muda depois de o contrato valer.** O valor atualizado é o original mais os aditivos **assinados e com vigência iniciada**. Aditivo aprovado e ainda não assinado aparece como "sem efeito até a assinatura" e não conta no valor nem no limite.
- **Aditivo assinado não se edita nem se apaga.** A correção é cancelar com motivo (fica no histórico, e só quem aprova pode) ou registrar outro aditivo.
- **Guarda-chuva:** ordem de serviço ou derivado que **consome o limite** gasta o saldo do principal e não soma de novo no total; o **valor adicional** soma.
- **Medição não é fatura nem receita.** Só a medição **aprovada** conta no saldo. A aprovação confere o limite do item e do contrato; acima do limite, é preciso um aditivo.
- **Faturar** cria uma conta a receber do contrato. A baixa, a conciliação e o cancelamento continuam em Receitas → Contas a Receber, e a DRE e o Fluxo de Caixa a leem pelo vencimento, como qualquer conta a receber.
- **Despesa reembolsável** é a despesa já lançada, marcada como reembolsável pelo contratante. Não é "Ressarcimento" (que é a empresa devolvendo a quem pagou por ela).
- **Margem do contrato** é gerencial (medido menos custo apropriado); a DRE continua por projeto.

**Com a Cris:** anexe o contrato em PDF (ou cole o texto) na tela "Novo contrato" e peça para preencher. A Cris propõe cliente, objeto, valor, datas, itens e condições; os campos duvidosos aparecem para conferir e nada é gravado até o botão "Salvar contrato". Ela também consulta contratos, saldos, aditivos, medições e (com acesso financeiro) faturamento e recebimentos.

**Quem acessa:** "Contratos" (ver, criar, editar); "registrar aditivos"; "lançar medições"; "aprovar aditivos e medições" (nasce só com proprietário e administrador); "faturamento, recebimentos, custos, reembolsos e exportação".

**Caminhos:**
- Para **cadastrar um contrato**, vá em Contratos → Contratos → "+ Novo contrato".
- Para **registrar um aditivo**, abra o contrato → aba Aditivos → "+ Novo aditivo" → envie para aprovação → aprove → registre a assinatura.
- Para **lançar uma medição**, abra o contrato → aba Medições → escolha o item e o período → "Salvar e enviar"; quem aprova clica em "Aprovar".
- Para **faturar**, abra o contrato → aba Faturamento e recebimentos → escolha o projeto, o valor e o vencimento → "Faturar".`;
