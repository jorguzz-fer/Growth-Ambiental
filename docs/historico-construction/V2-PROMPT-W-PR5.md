# Prompt W · PR W-5 — assistente de Fornecedores (somente leitura)

Seção 7 do Prompt W. **Nada é gravado, nada vai a modelo, nenhum CPF sai do
servidor por aqui; sem migração.** A leitura por documento (`CampoIA`,
`ResumoLeituraIA`, `extractFornecedorFromDoc`) **não mudou uma linha** (7.1);
o painel é outro selo, "Somente leitura", ao lado — não unificados (7.4).

## As cinco análises (7.2), em `src/lib/stakeholder-analise.ts` (puro)

| Ação | O que mostra |
|---|---|
| **Documentos duplicados** | grupos pelo mesmo CPF/CNPJ (pelos dígitos), lado a lado: nome, tipo, ativo, papéis. "Erro ou coincidência? Você decide" |
| **Cadastro incompleto** | ativos sem documento, sem papel, sem contato (e-mail, telefone ou WhatsApp) ou sem endereço obrigatório (PF com serviço/mão de obra). Sem papel vem primeiro: não aparece em seletor filtrado |
| **Documento inválido** | não passa na verificação; tipo incompatível com o documento |
| **Inativos ainda em uso** | inativo com despesa nos últimos 90 dias como fornecedor, ou obrigação como pagador |
| **Papéis e uso real** | com obrigação como pagador e **sem o papel "Pagador por Terceiro"** (candidatos da 1.6 — a concessão é sua, na tabela, item a item); com despesa e sem papel de fornecedor; marcado como fornecedor e sem despesa |

Os dados de uso vêm de `getUsoDosStakeholders` (só contagens e a data da
última despesa; nada de valor nem de documento).

## Nunca (7.3)

Não cria, edita, inativa nem exclui; não concede nem retira papel; não envia
documento a modelo — tudo é código puro, sem chamada a modelo algum.

## Testes

`stakeholder-analise.test.ts` (5 casos). Suíte (1214), `tsc`, `eslint`,
`next build` verdes. Navegador: painel com o selo, as cinco ações abrem com
o resultado da base local (3 cadastros: 1 incompleto, nenhum duplicado), o
bloco de leitura por documento continua acima com o seu próprio comportamento.
Hash de `stakeholder` antes = depois.
