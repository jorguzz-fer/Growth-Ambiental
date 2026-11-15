# GA-2 · Todas as datas em DD/MM/AAAA — relatório

## Resumo

Toda data que o usuário vê ou digita no app agora está em **DD/MM/AAAA**, com o botão de calendário. Isso vale qualquer que seja o idioma do navegador.

- **O formato interno não mudou:**
  - "MM/DD/YYYY" nas actions e no banco;
  - ISO "AAAA-MM-DD" nos filtros De/Até.
- Sem migração, e nenhum dado existente é alterado.

**Antes:**
- Algumas telas pediam que o usuário digitasse a data no formato americano. Quem digitava 03/10/2027 querendo 3 de outubro gravava **10 de março**.
- Os filtros De/Até usavam o campo nativo do navegador, que num Chrome em inglês mostra mm/dd/yyyy.

**Agora:** essas telas usam o mesmo `DateField` do resto do app.

## Campos trocados

### §1 — campos de texto que pediam MM/DD (gravavam data errada)

| Tela | Campo | Antes | Depois |
|---|---|---|---|
| Apontamento de Horas | Data | texto livre "Data * (MM/DD/AAAA)", exemplo "03/10/2027" | `DateField` DD/MM/AAAA; a action recebe MM/DD/YYYY |
| Implantação e Treinamento | Previsto | texto livre "Previsto (MM/DD/AAAA)" | `DateField` |
| Implantação e Treinamento | Realizado | texto livre "Realizado (MM/DD/AAAA)" | `DateField` |
| Implantação e Treinamento | Data do treinamento | texto livre "Data (MM/DD/AAAA)" | `DateField` |
| Medição de contrato | Início do período executado | texto livre "(MM/DD/AAAA)" | `DateField`, numa linha própria com rótulo |
| Medição de contrato | Fim do período executado | texto livre "(MM/DD/AAAA)" | `DateField`. Fim anterior ao início: aviso na tela e botões travados; a action também recusa |

**Junto, nas mesmas telas:**
- **Tabelas:** a de Horas, a de etapas e treinamentos e a de períodos das medições mostravam a data gravada em MM/DD. Agora mostram DD/MM.
- **Mensagens de erro:**
  - Implantação dizia "Datas no formato MM/DD/AAAA"; agora diz "Data inválida: informe no formato DD/MM/AAAA".
  - Horas dizia "Informe a data (MM/DD/AAAA)"; agora diz "Informe a data (DD/MM/AAAA)".

### §2 — campos nativos `type="date"` (mostravam o formato do navegador)

Todos viraram `DateField formato="iso"`. O valor continua ISO, e os links salvos com `?de=`/`?ate=` continuam funcionando.

| Tela | Arquivo | Campos |
|---|---|---|
| Contas a Pagar | `contas-pagar-table.tsx` | De (vencimento), Até |
| Dias fechados (Caixa) | `balanco-dia-table.tsx` | De, Até |
| Ficha do funcionário | `funcionario-ficha.tsx` | Nascimento do dependente, Data do desligamento |
| Documentos do funcionário | `funcionario-docs.tsx` | Validade (o selo "válido até" também passou de AAAA-MM-DD para DD/MM/AAAA) |
| Equipes | `equipes-manager.tsx` | De, Até |
| Estoque (movimentos) | `estoque-manager.tsx` | De, Até |
| Notas fiscais | `notasfiscais/page.tsx` | Criadas de, Criadas até |
| Auditoria (Ações) | `acoes/page.tsx` | De, Até |
| **Cadastro do funcionário** (achado pela trava, fora da lista) | `funcionario-campos.tsx` | Nascimento, Validade da CNH, Admissão |

**Cadastro do funcionário.** A trava da §5 achou mais três campos nativos que a lista não tinha. Eles foram trocados da mesma forma, e o valor continua ISO.

### §3 — dicas de data da Cris

- **As dicas `"MM/DD/YYYY"` continuam.** Elas vão só ao modelo, e o valor proposto cai num `DateField`, que mostra DD/MM. Ao lado de cada uma há o comentário "formato interno; vai só ao modelo, o usuário vê DD/MM pelo DateField".
- **Onde estão:**
  - nas 5 telas listadas: `acerto-manager`, `restituicoes-manager`, `contas-receber-manager` e `despesa-form` (2);
  - nas dicas equivalentes em `contrato-cris.ts`, `estoque-cris.ts` e `funcionario-cris.ts`.
- **Conferido:** todos esses campos já são `DateField`. Nenhum precisou da troca da §1.
- **Teste:** uma proposta `10/03/2027` aparece como `03/10/2027`.

### O componente

`src/components/ui/date-field.tsx`:

- **Prop nova `formato`:**
  - `"interno"`, o padrão, para MM/DD/YYYY;
  - `"iso"`, para AAAA-MM-DD.
  - Funciona controlado (`value` + `onChange`) e dentro de `<form>` (`name` + `defaultValue`), com o mesmo botão de calendário.
- **Prop nova `aria-label`:** dá o nome acessível do campo de texto.
- **Conversões:** ficam em `src/lib/datas-br.ts`. Agora recusam data que não existe (31/02, 29/02 fora de ano bissexto). Antes, qualquer dia até 31 passava.
- **Campo nativo:** o `type="date"` só existe aqui, escondido. Serve só para abrir o calendário.

## §4 — Datas já gravadas: medição (só leitura, nada corrigido)

`scripts/medicao-datas.sql` conta, por empresa e por tela:
- as datas preenchidas;
- as **ambíguas**: dia e mês ambos até 12, que podem ter sido gravadas invertidas.

O script roda em `BEGIN READ ONLY … ROLLBACK`.

**Base local (demonstração, só para conferir o script):**

```
 Consultoria Ambiental              | horas: data                     | 1858 | 1019
 Consultoria Ambiental              | implantacao: previsto/realizado |    0 |    0
 Consultoria Ambiental              | medicao de contrato: periodo    |   56 |   56
 Consultoria Ambiental              | treinamento: data               |    0 |    0
 Consultoria Antiga (antes do GA-1) | (as quatro)                     |    0 |    0
```

- **A demonstração não conta:** o seed grava no formato interno correto. As "ambíguas" dela estão certas; só têm dia e mês até 12.
- **As 4 horas a mais** que os 1.854 do seed são apontamentos de testes anteriores de navegador na base local.

**Produção: rodada pelo dono em 15/11/2026, no terminal do GA-postgres. Nada foi gravado.**

| Empresa | Horas | Implantação | Treinamento | Medição de contrato |
|---|---|---|---|---|
| Empresa real (a única cliente em produção) | 0 | 0 | 0 | 0 |
| Consultoria Ambiental (demonstração) | 1.848 | 0 | 0 | 56 |

- **A empresa real não tem nenhum registro** nas quatro telas. Não há data real a revisar.
- **Os dados da demonstração** foram gravados pelo seed no formato interno correto. As "ambíguas" dela estão certas e não precisam de revisão.
- **Resultado:** nada a corrigir. O script fica no repositório para uso futuro, por exemplo se surgir suspeita de data invertida digitada antes do GA-2.

**Para rodar de novo:** no terminal do GA-postgres, entre com `psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"` e cole o conteúdo de `scripts/medicao-datas.sql`. O script é somente leitura e termina em ROLLBACK.

**Se uma empresa real tiver ambíguas,** as linhas são revistas com o cliente. O código não altera nada.

## Testes

| # | O que | Onde | Resultado |
|---|---|---|---|
| 1 | Digitar 03/10/2027 → a action recebe 10/03/2027; 31/12/2027 aceito | unitário `datas-br.test.ts` e **navegador**: Horas (2 apontamentos), Implantação (previsto e realizado), Treinamento, Medição (início e fim), conferidos no banco | passou |
| 2 | Registro gravado 10/03/2027 aparece como 03/10/2027 ao editar | unitário (render do campo) e navegador (Editar etapa de implantação) | passou |
| 3 | Medição: fim antes do início recusado | tela: aviso e botões travados, no navegador e por teste; action: `nucleo-financeiro.test.ts` (com banco) | passou |
| 4 | §2: 31/12/2027 → 2027-12-31; `?de=2027-01-31` abre com 31/01/2027 | unitário e navegador: Contas a Pagar, `/acoes`, `/notasfiscais`, `/estoque`, `/equipes`; em `/acoes`, filtrar mantém `de`/`ate` em ISO na URL | passou |
| 5 | Cris: proposta 10/03/2027 aparece como 03/10/2027 | unitário (`datas-br.test.ts`) | passou |
| 6 | Trava `datas-na-tela.test.ts` | unitário | passou |

**Navegador.** Build de produção, base da demonstração, Chrome com idioma **en-US**: 32 conferências nas telas acima e 7 em Dias fechados, ficha do funcionário e Equipes.
- Em nenhuma tela sobrou campo de data nativo visível.
- Zero erro no servidor e na página.
- Os registros de teste foram apagados da base local depois.

**Suíte completa.** `npm run test:all` com banco: **280 arquivos, 2454 testes, 0 pulados**. Typecheck OK; lint com 0 erros (11 avisos antigos, de arquivos de teste).

**Outra mudança.** `vitest.config.ts` passou a compilar JSX no modo automático, como o Next. Isso permite os testes que renderizam o `DateField`.

## Critérios de aceite (§8)

- **`grep -rn "MM/DD" src/components src/app`:** só encontra comentários, tipos internos e as 5 dicas da Cris, todas comentadas.
- **`grep -rn 'type="date"' src`:** só encontra o comentário do `date-field.tsx` (o campo usa `type={nativeType}`), um comentário em `utils.ts` e os testes.
- **Prints:**
  - Horas, Implantação e Medição de contrato, com a data em DD/MM;
  - Medição com fim antes do início;
  - Contas a Pagar com o navegador em inglês, mostrando DD/MM.
  - Os prints foram enviados na conversa e não estão no repositório.

## Fora do escopo

- Textos internos visíveis ("Prompt I", "BAA-6"): ficam para o GA-2B.
- O formato interno e qualquer migração de dados.
- A competência (MM/AAAA) não mudou.
