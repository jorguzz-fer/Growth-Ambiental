# Onboarding (implantação) — Growth Ambiental

A tela **Configurações → Implantação e Treinamento** (`/implantacao`) acompanha a implantação de cada empresa.
- Serve à primeira cliente e a qualquer outra: cada empresa tem as próprias etapas.
- Migração **0083**, que só acrescenta tabelas: `implantacao_etapa` e `implantacao_treinamento`.
- O provisionamento da empresa (`provisionTenant`) continua igual. Ele cria a empresa, o responsável, o primeiro projeto, as três versões e o Plano de Contas ambiental.

## 1. Etapas

- **Modelo padrão** (`MODELO_DE_IMPLANTACAO`, em `src/lib/implantacao-regras.ts`): o botão "Aplicar o modelo padrão (A a H)" inclui as etapas sugeridas.
- **Reaplicar não duplica nem sobrescreve:** inclui só as etapas que faltam, pelo código, que é único por empresa.

| Grupo | Etapas sugeridas |
|---|---|
| A. Diagnóstico e levantamento | levantamento de necessidades, cadastro de responsáveis, validação do escopo |
| B. Configuração inicial | empresa, usuários, permissões, parâmetros |
| C. Estrutura financeira | Plano de Contas, centros de custo, contas bancárias, DRE, Budget e Forecast |
| D. Cadastros operacionais | clientes, projetos, contratos, equipes, fornecedores |
| E. Processos financeiros | despesas, medições, reembolsos, faturamento, contas a pagar e receber |
| F. Treinamento | administrativo, financeiro, gestores, diretoria, Cris |
| G. Piloto assistido | projeto fictício, lançamentos, medições, Forecast, relatórios |
| H. Homologação e entrada em operação | checklist, aprovação, pendências, suporte inicial |

- **Campos de cada etapa:**
  - grupo, código, título e descrição;
  - responsável;
  - datas prevista e realizada (MM/DD/AAAA);
  - situação e dependência (código de outra etapa);
  - observações;
  - **evidência**: documento, link ou relatório que comprova a conclusão.

  O documento da evidência fica referenciado em texto. Não há anexo próprio da etapa.
- **Situações:** Não iniciada · Planejada · Em andamento · Aguardando cliente · Bloqueada · Concluída.
- **Regras** (servidor e testes):
  - **concluir exige evidência**;
  - iniciar ou concluir exige a **dependência concluída**; planejar pode antes;
  - "Bloqueada" e "Aguardando cliente" pedem o motivo nas observações;
  - a dependência precisa existir na empresa, não pode ser a própria etapa e não pode formar ciclo;
  - não se exclui uma etapa de que outra depende;
  - reabrir uma etapa de que outras concluídas dependem só gera aviso.
- **Modelo personalizado por cliente:** depois de aplicar o modelo, a empresa inclui, edita e exclui etapas e cria grupos ou códigos próprios. O modelo **não traz prazos**: as datas são combinadas com cada cliente.
- **Resumo da tela:**
  - percentual concluído;
  - quantas etapas estão em andamento, bloqueadas ou aguardando cliente;
  - quantas estão atrasadas (data prevista passada e não concluída);
  - quantas aguardam dependência.

## 2. Treinamentos por perfil

| Perfil | Temas padrão |
|---|---|
| Administrativo e financeiro | Despesas, Pagamentos, Recebimentos, Reembolsos, Conciliação |
| Gestores de projeto | Projetos, Contratos, Fases, Equipes, Medições, Orçamento e Forecast |
| Diretoria | Dashboard, DRE, Fluxo de caixa, Margens, Relatórios, Cris |
| Administradores | Usuários, Permissões, Plano de Contas, Configurações, Auditoria |

- **"Planejar os temas padrão"** inclui os temas do perfil sem duplicar os já registrados. Também é possível registrar temas livres.
- **Registro:** cada treinamento tem participantes, data, situação (Planejado, Realizado ou Pendente) e pendências. "Realizado" exige data.

## 3. Permissões e auditoria

- **Ver** exige `empresa:ver`. **Aplicar o modelo, editar e registrar** exige `empresa:editar`.
- O item de menu usa `perm: "empresa"` e não cria uma chave nova de permissão.
- Toda operação é auditada (`implantacao.*`): modelo aplicado, etapa criada, alterada ou excluída, treinamento.
- Tudo é filtrado pela empresa da sessão. Outra empresa não encontra as etapas desta (testado).

## 4. Responsabilidades e cronograma

- O sistema não impõe cronograma.
- Sugestão de uso:
  1. A3, a validação do escopo, fixa as datas previstas das demais etapas junto com o cliente;
  2. o responsável de cada etapa é a pessoa de contato, do cliente ou da implantação;
  3. a etapa H2, a aprovação, registra o aceite formal como evidência.

## 5. Pendências

- **Anexo direto na etapa:** hoje a evidência é texto ou link.
- **Centros de custo (C2):** o sistema apropria por projeto e contrato. A entidade de centro de custo continua pendente (ver `INTEGRACAO_OPERACIONAL_GROWTH_AMBIENTAL.md`).

## 6. Testes

- `src/lib/implantacao-regras.test.ts`: grupos A a H, situações, códigos únicos, dependências do modelo sem ciclo, modelo sem prazos, temas por perfil, regras de evidência, dependência, motivo e resumo.
- `src/lib/actions/homologacao-ponta-a-ponta.test.ts` (Postgres), bloco ONBOARDING:
  - modelo aplicado duas vezes sem duplicar;
  - dependência e evidência exigidas;
  - etapa própria da empresa;
  - ciclo recusado;
  - exclusão bloqueada por dependência;
  - treinamentos planejados e "realizado" exigindo data;
  - isolamento entre empresas;
  - perfil sem `empresa:editar` recusado.
