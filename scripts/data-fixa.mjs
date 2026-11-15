// Fixa o "hoje" de um processo Node para gerar números comparáveis entre dias.
//
// O seed da demonstração e várias telas dependem da data de hoje (mês corrente,
// fração do mês, vencidos, projeção ao término). Para a foto dos números do
// GA-9 (e a comparação de cada fase com ela), o seed, a conferência e o
// servidor precisam enxergar o MESMO dia.
//
// Uso (só em ambiente local de teste; nunca em produção):
//   DATA_FIXA=2026-11-15 node --import ./scripts/data-fixa.mjs .migrate/seed.mjs
//   DATA_FIXA=2026-11-15 NODE_OPTIONS="--import $PWD/scripts/data-fixa.mjs" npx next start
//
// Sem DATA_FIXA, não faz nada. O relógio continua andando a partir do dia
// fixado (meio-dia, horário local), para que esperas e tempos limite funcionem.
const fixa = process.env.DATA_FIXA;
if (fixa) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fixa)) throw new Error(`DATA_FIXA deve ser AAAA-MM-DD (recebido: ${fixa})`);
  const Real = Date;
  const [a, m, d] = fixa.split("-").map(Number);
  const base = new Real(a, m - 1, d, 12, 0, 0).getTime();
  const inicio = Real.now();
  const agora = () => base + (Real.now() - inicio);
  class DataFixa extends Real {
    constructor(...args) {
      if (args.length === 0) super(agora());
      else super(...args);
    }
    static now() {
      return agora();
    }
  }
  // Métodos estáticos como propriedades PRÓPRIAS: o Next.js reembrulha `Date`
  // copiando só as propriedades próprias, e a herança de classe se perderia.
  for (const k of ["UTC", "parse"]) Object.defineProperty(DataFixa, k, { value: Real[k], writable: true, configurable: true });
  globalThis.Date = DataFixa;
}
