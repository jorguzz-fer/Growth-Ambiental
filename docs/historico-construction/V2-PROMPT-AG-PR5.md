# Prompt AG — PR 5: o PDF e o XML da nota

Quinta parte do emissor de NFS-e (Focus NFe). A nota autorizada passa a ter
**cópia própria** do PDF e do XML no nosso armazenamento (Cloudflare R2), e o
download é feito pela tela.

## Como funciona, para quem usa

- Na nota autorizada ou cancelada aparecem **Baixar PDF** e **Baixar XML**.
  Em homologação o link diz "(homologação)".
- O arquivo baixado sempre leva a marca no nome:
  `HOMOLOGACAO-SEM-VALOR-FISCAL-NFSe-77.pdf`. Em produção: `NFSe-77.pdf`.
- Quando a Focus ainda não liberou um dos arquivos, a tela diz "ainda não
  disponível no provedor".
- Quando a cópia já está guardada, a tela mostra "Cópia guardada no sistema".
  A partir daí o download não depende mais da Focus.

## Quando a cópia é feita

1. **Logo depois da autorização**, ao "Atualizar situação" ou na resposta do
   envio. É melhor esforço: se a Focus falhar nesse momento, a autorização
   vale do mesmo jeito.
2. **No primeiro download**, se a cópia ainda não existir.

A primeira cópia guardada vale e nunca é sobrescrita. Cada cópia entra no
histórico da nota ("PDF guardado: …").

Sem o R2 configurado, o download entrega o arquivo direto da Focus e não
guarda nada.

## Segurança

- Baixar exige **ver Notas Fiscais**, e a nota precisa ser de uma obra que a
  pessoa vê. O download fica na auditoria (`nfse.arquivo.baixar`, só o tipo).
- O token da Focus só é enviado ao endereço da própria Focus, nunca a outro
  endereço que apareça na resposta.
- Só `https`. Caminhos estranhos (`//outro-site`, `javascript:`) são
  recusados. O limite de tamanho é 10 MB.
- O número da nota que vai no nome do arquivo é limpo: só letras, dígitos,
  ponto e hífen.

## O que não muda

Não há migração, porque as colunas `pdf_key` e `xml_key` vieram na PR 1. Não
mexe em financeiro nem em relatório.

## Testes

- `src/lib/actions/notas-servico-arquivos.test.ts` (banco real; Focus e R2
  simulados):
  - primeiro download guarda a cópia e o segundo vem dela;
  - cópia automática na autorização;
  - autorização vale mesmo com a Focus fora;
  - sem R2;
  - recusas (sem permissão, rascunho, tipo inválido, nota de outra empresa,
    Focus fora).
- `src/lib/fiscal/focus-arquivo.test.ts`: o token vai só à Focus; http,
  `//host` e caminho inválido são recusados; erro HTTP e arquivo vazio viram
  erro.

## Próximo passo

Painel do assistente (somente leitura) e o relatório final do Prompt AG.
