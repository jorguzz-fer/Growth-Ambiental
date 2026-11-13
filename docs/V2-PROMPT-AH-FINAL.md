# Prompt AH · Empresa — relatório final (seção 11)

Entregue em 3 PRs: Fase 1 (#215), AH-1 (#216), AH-2.

1. **BAH-1**: base local, 1 cadastro (Cliente Piloto) com todos os campos fiscais
   vazios — **nenhuma pendência nova**, nada corrigido. Produção: 1º e 2º
   relatórios de `docs/sql/v2-prompt-ah-diagnostico.sql`.
2. **BAH-2**: confirmado — a tela é pré-condição do Emissor (Prompt AG usa
   `emitentePronto`); o texto agora aponta para Receitas › Notas Fiscais.
3. **Placeholders**: IBGE → "7 dígitos, sem ponto" + ajuda; alíquota → "0 a
   5" + ajuda; LC 116 → sem placeholder, ajuda "construção civil costuma ser
   7.02 (obra) ou 7.05 (reforma) — confirme com a contabilidade"; CNAE → sem
   placeholder, ajuda "construção de edifícios costuma ser 4120-4/00…".
   O código IBGE da cidade-sede não aparece em lugar nenhum da interface.
4. **Validações**: `salvarDadosFiscais` chama `recusaDoCadastroFiscal`, que
   usa os validadores existentes sem reescrevê-los:
   ```ts
   if (v.cep && !cepValido(v.cep)) return "CEP: informe os 8 dígitos …";
   if (v.codigoMunicipio && !codigoMunicipioValido(v.codigoMunicipio)) return "Código IBGE …";
   if (v.uf && !ufValida(v.uf)) return "UF: …";
   ```
   Campo vazio passa; retorno `{ ok, error }` em todas as actions.
5. **`renameTenant`**: `{ ok, error }` (sem permissão, nome vazio) e
   `logAudit("tenant.rename", { changes: { name: { de, para } } })`.
6. **Avisos novos**: `codigoTributarioMunicipio` vazio; `municipio` vazio ou
   sem IBGE válido — fora do checklist (conflito 4.1 × 9.4, resolvido sem
   tocar `calc/emitente-fiscal.ts`). **Nenhum bloqueio mudou**;
   `emitentePronto` igual (testes 14 e 15).
7. **R2**: selo "R2 não configurado" / "configurado (sem teste)" / "testado"
   / "com falha no teste"; verde só após round-trip. Cada teste da rota grava
   `tenant.r2.health` (ok + etapa) e a tela mostra data e resultado. Chave do
   teste com sufixo por tentativa.
8. **Token**: o texto deixou de mandar definir a variável e diz que, com o
   cadastro fechado, a emissão é em Receitas › Notas Fiscais.
9. **Assistente**: quatro ações somente leitura (falta para emitir, onde
   encontrar, conferir, histórico); não sugere nem preenche valor fiscal,
   não chama action, não lê env; nada vai a modelo.
10. **Nenhum dado de `tenant` alterado**: linha Cliente Piloto idêntica antes e depois
    (conferida por SQL); testes com banco usam tenant próprio.
11. **Nenhuma migração criada.**
12. **Limitações**: sem tabela de municípios do IBGE, não há checagem nome ×
    código (4.3); a checagem CNAE × item é por divisão (41–43 × grupo 7) e só
    pede conferência; o histórico mostra campos, não valores (8.2 pendente no
    módulo de auditoria); `getAllTenantsOverview` sem projeção (8.3)
    registrado, não corrigido.

## Perguntas em aberto (não bloqueiam)
1. Os dois avisos novos ficam fora do checklist (adotado) ou dentro?
2. Produção: algum cadastro com CEP/IBGE/UF preenchido e inválido no 2º
   relatório do SQL? Fica como está, só vira pendência.
