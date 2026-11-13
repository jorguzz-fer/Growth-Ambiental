// Empacota o seed de demonstração (src/lib/db/seed-demo/index.ts) num único
// .mjs que roda com `node` — local ou dentro do container de produção.
// As ações do app importam módulos do Next.js e a sessão do Auth.js; fora do
// Next eles não funcionam, então este build troca SÓ esses módulos por stubs
// (src/lib/db/seed-demo/stubs). Toda a regra de negócio é a do app.
import { build } from "esbuild";
import path from "node:path";

const stubs = path.resolve("src/lib/db/seed-demo/stubs");
const troca = {
  "@/lib/auth": "auth.ts",
  "next/cache": "next-cache.ts",
  "next/headers": "next-headers.ts",
  "next/navigation": "next-navigation.ts",
  "next/server": "next-server.ts",
  "server-only": "server-only.ts",
};

const alvos = [
  ["src/lib/db/seed-demo/index.ts", ".migrate/seed.mjs"],
  // Conversão do Plano de Contas de empresa existente (prévia/aplicar/desfazer).
  ["src/lib/planocontas-conversao-cli.ts", ".migrate/converter-plano.mjs"],
];
for (const [entrada, saida] of alvos) await build({
  entryPoints: [entrada],
  outfile: saida,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  logLevel: "warning",
  banner: { js: "import{createRequire}from'module';const require=createRequire(import.meta.url);" },
  plugins: [
    {
      name: "stubs-do-seed",
      setup(b) {
        const filtro = new RegExp(`^(${Object.keys(troca).map((k) => k.replace(/[/@-]/g, "\\$&")).join("|")})$`);
        b.onResolve({ filter: filtro }, (args) => {
          // `next/server` só é trocado no código do app; bibliotecas (next-auth)
          // continuam usando o módulo real.
          if (args.path === "next/server" && !args.importer.includes(`${path.sep}src${path.sep}`)) return undefined;
          return { path: path.join(stubs, troca[args.path]) };
        });
        // `src/lib/context.ts` importa a sessão por caminho relativo ("./auth").
        const authReal = path.resolve("src/lib/auth.ts");
        b.onResolve({ filter: /(^|\/)auth$/ }, (args) => {
          if (!args.path.startsWith(".")) return undefined;
          const alvo = path.resolve(path.dirname(args.importer), args.path);
          return alvo + ".ts" === authReal ? { path: path.join(stubs, "auth.ts") } : undefined;
        });
      },
    },
  ],
});
console.log("seed empacotado em .migrate/seed.mjs; conversão do plano em .migrate/converter-plano.mjs");
