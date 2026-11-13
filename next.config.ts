import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagem Docker mínima para deploy no Coolify (ver docs/STACK.md §4)
  output: "standalone",
  reactStrictMode: true,
  // O `next build` roda lint + type-check em processo. Dentro do container de
  // deploy (memória limitada), o type-check com dependências de tipos grandes
  // (ex.: @anthropic-ai/sdk) estoura a RAM e o processo é morto (exit 255,
  // sem erro de tipo — só o build interrompido). Lint e tipos já são validados
  // no CI/localmente (`npm run typecheck` + `eslint` + `vitest`) antes de todo
  // push, então desligamos essa etapa no build de produção para o container
  // não morrer por OOM. Ver docs/STACK.md §4.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // `unpdf` (leitura de texto de PDF do extrato) carrega o pdf.js por import
  // dinâmico aninhado. Com `output: "standalone"`, o tracer do Next às vezes não
  // copia esses arquivos para o bundle, e a leitura do PDF falha em produção
  // (Coolify) mesmo funcionando em dev. Marcá-lo como externo faz o Next
  // resolvê-lo de node_modules em runtime (nft copia o pacote inteiro).
  serverExternalPackages: ["unpdf"],
  // Rolling Forecast foi descontinuado: URLs antigas /rolling redirecionam
  // para /forecast (o enforcement de permissão da rota-destino continua valendo).
  async redirects() {
    return [
      { source: "/rolling", destination: "/forecast", permanent: true },
      // Prompt AN, Parte 5: a Conferência mudou de endereço para ter id próprio
      // em SCREENS. Filtros na URL antiga seguem junto (query preservada).
      { source: "/diagnostico/categorias-invertidas", destination: "/conferencia", permanent: false },
      // Prompt AP: os downloads da planilha mudaram de endereço (?v= segue junto);
      // os específicos vêm antes do genérico de /versao.
      { source: "/versao/export", destination: "/projeto/planilha/exportar", permanent: false },
      { source: "/versao/template", destination: "/projeto/planilha/modelo", permanent: false },
      // Telas removidas (src/lib/telas-removidas.ts; o teste de lá confere que
      // esta lista bate): redirecionamento com aviso de uma linha no destino.
      // 307, não 308: o navegador não grava. Growth Ambiental: unidades,
      // simulador, permuta, INCC, medição por grupo de obra (CEF), liberações
      // de obra e projeção por unidade.
      { source: "/contabilidade", destination: "/usuarios?de=contabilidade", permanent: false },
      { source: "/contabilidade/:path*", destination: "/usuarios?de=contabilidade", permanent: false },
      { source: "/versao", destination: "/projeto?de=versao", permanent: false },
      { source: "/versao/:path*", destination: "/projeto?de=versao", permanent: false },
      { source: "/diagnostico/planos-recebiveis", destination: "/contasreceber?saiu=planos-recebiveis", permanent: false },
      { source: "/diagnostico/planos-recebiveis/:path*", destination: "/contasreceber?saiu=planos-recebiveis", permanent: false },
      { source: "/consolidado", destination: "/contratos/painel?saiu=consolidado", permanent: false },
      { source: "/consolidado/:path*", destination: "/contratos/painel?saiu=consolidado", permanent: false },
      { source: "/balancodia", destination: "/caixa?saiu=balancodia", permanent: false },
      { source: "/balancodia/:path*", destination: "/caixa?saiu=balancodia", permanent: false },
      { source: "/unidades", destination: "/contasreceber?saiu=unidades", permanent: false },
      { source: "/unidades/:path*", destination: "/contasreceber?saiu=unidades", permanent: false },
      { source: "/simulador", destination: "/contratos?saiu=simulador", permanent: false },
      { source: "/simulador/:path*", destination: "/contratos?saiu=simulador", permanent: false },
      { source: "/permuta", destination: "/contasreceber?saiu=permuta", permanent: false },
      { source: "/permuta/:path*", destination: "/contasreceber?saiu=permuta", permanent: false },
      { source: "/parametros", destination: "/contratos?saiu=parametros", permanent: false },
      { source: "/parametros/:path*", destination: "/contratos?saiu=parametros", permanent: false },
      { source: "/medicao", destination: "/contratos/medicoes?saiu=medicao", permanent: false },
      { source: "/medicao/:path*", destination: "/contratos/medicoes?saiu=medicao", permanent: false },
      { source: "/medicaolanc", destination: "/contratos/medicoes?saiu=medicaolanc", permanent: false },
      { source: "/medicaolanc/:path*", destination: "/contratos/medicoes?saiu=medicaolanc", permanent: false },
      { source: "/reembolso", destination: "/contratos/reembolsos?saiu=reembolso", permanent: false },
      { source: "/reembolso/:path*", destination: "/contratos/reembolsos?saiu=reembolso", permanent: false },
      { source: "/projecao", destination: "/contratos/painel?saiu=projecao", permanent: false },
      { source: "/projecao/:path*", destination: "/contratos/painel?saiu=projecao", permanent: false },
    ];
  },
  experimental: {
    // Uploads (logo da empresa até 2 MB, documentos de despesas até 10 MB)
    // passam pela Server Action como FormData. O limite padrão do body de
    // Server Actions é 1 MB, o que rejeitava esses arquivos antes mesmo da
    // action rodar — deixando o upload de logo/documento "sem funcionar".
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
