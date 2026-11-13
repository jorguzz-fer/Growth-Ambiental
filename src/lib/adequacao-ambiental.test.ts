import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { tiposDeReceitaOferecidos, ehTipoDeReceita } from "./conta-receber-regras";
import { indicesOferecidosNoContrato, ehIndiceDeReajuste } from "./incc-regras";
import { ENTRADA_ORIGENS, SAIDA_MOTIVOS, recusaDoMovimento } from "./estoque-regras";
import { FUNCOES_PADRAO, TIPOS_DOC_EQUIPE_DIA } from "./equipe-regras";
import { PAPEIS_STAKEHOLDER, PAPEIS_STAKEHOLDER_OFERECIDOS } from "./calc/constants";
import { ROTULO_TIPO_DE_CONTA, TIPOS_DE_CONTA_OFERECIDOS, rotuloTipoDeConta } from "./contas-regras";
import { CAMPOS_DO_CADASTRO } from "./projeto-cris";
import { ROTULO_CAMPO_PROJETO } from "./ai/projeto-doc";
import { CLIENTE_PROPRIO } from "./contas-pagar-regras";

/**
 * Growth Ambiental — adequação funcional (docs/ADEQUACAO_FUNCIONAL_GROWTH_AMBIENTAL.md).
 * O que é oferecido para lançamento NOVO é de consultoria ambiental; os
 * valores antigos (incorporação) continuam válidos e não são convertidos.
 */
describe("Adequação funcional: o que é oferecido × o que continua válido", () => {
  it("Contas a Receber: tipos de serviço; Sinal e Parcela mensal só nos registros antigos", () => {
    const novos = tiposDeReceitaOferecidos();
    expect(novos).toEqual(expect.arrayContaining(["Fatura de serviço", "Reembolso de despesas", "Adiantamento", "Outras Receitas"]));
    expect(novos).not.toContain("Sinal");
    expect(novos).not.toContain("Parcela mensal");
    expect(tiposDeReceitaOferecidos("Sinal")).toContain("Sinal"); // a edição mantém o gravado
    for (const t of ["Sinal", "Parcela mensal", "Fatura de serviço"]) expect(ehTipoDeReceita(t), t).toBe(true);
  });

  it("Reajuste do contrato: IPCA, IGP-M e INPC; INCC só quando já gravado", () => {
    expect(indicesOferecidosNoContrato()).toEqual(["IPCA", "IGP-M", "INPC"]);
    expect(indicesOferecidosNoContrato("INCC-DI")).toEqual(["IPCA", "IGP-M", "INPC", "INCC-DI"]);
    expect(indicesOferecidosNoContrato("qualquer")).toEqual(["IPCA", "IGP-M", "INPC"]);
    expect(ehIndiceDeReajuste("INCC-M")).toBe(true);
  });

  it("Materiais e Equipamentos: sem permuta e sem 'obra' nas origens e motivos novos; entrada exige a despesa", () => {
    const todos = [...ENTRADA_ORIGENS, ...SAIDA_MOTIVOS].join(" | ");
    expect(todos).not.toMatch(/permuta|\bobras?\b/i);
    expect(recusaDoMovimento({ tipo: "entrada", itemId: "i", quantidade: 1, despesaId: null, permutaId: null, projectId: null })).toMatch(/vincule a despesa/);
  });

  it("Equipes e Presença de Campo: funções padrão de campo; foto 'no canteiro' só para registro antigo", () => {
    expect(FUNCOES_PADRAO).not.toContain("Pedreiro");
    expect(FUNCOES_PADRAO).not.toContain("Mestre de Obra");
    expect(FUNCOES_PADRAO).toContain("Técnico de campo");
    expect(TIPOS_DOC_EQUIPE_DIA).toContain("Foto da equipe em campo");
  });

  it("Fornecedores: papéis de incorporação não são oferecidos, mas continuam válidos", () => {
    for (const p of ["Comprador de Unidade", "Incorporador", "Construtora", "Imobiliária Parceira", "Corretor Autônomo"]) {
      expect(PAPEIS_STAKEHOLDER_OFERECIDOS, p).not.toContain(p);
      expect(PAPEIS_STAKEHOLDER as readonly string[], p).toContain(p);
    }
    expect(PAPEIS_STAKEHOLDER_OFERECIDOS).toContain("Laboratório de Análises");
  });

  it("Contas correntes: o valor gravado 'Construtora' aparece como conta da própria empresa", () => {
    expect(rotuloTipoDeConta("Construtora")).toBe("Empresa (conta própria)");
    expect(TIPOS_DE_CONTA_OFERECIDOS).not.toContain("Imobiliária");
    expect(Object.values(ROTULO_TIPO_DE_CONTA).join(" ")).not.toMatch(/^Construtora$/);
  });

  it("Projetos: o cadastro (tela e Cris) não pede terreno, financiamento, área construída nem código da obra", () => {
    const fora = ["valorTerreno", "custoTerreno", "metragem", "financiamentoConstrucao", "financiamentoTerreno", "recursosProprios", "proprietarioTerreno", "formaPagamentoTerreno", "terrenoForaCaixa", "codigoObra"];
    const campos = CAMPOS_DO_CADASTRO.map((c) => c.chave);
    for (const f of fora) expect(campos, f).not.toContain(f);
    expect(Object.keys(ROTULO_CAMPO_PROJETO)).not.toContain("valorTerreno");
    expect(ROTULO_CAMPO_PROJETO.valorConstrucao).toBe("Receita prevista do projeto");
    const tela = fs.readFileSync("src/components/app/project-manager.tsx", "utf8");
    for (const rotulo of ["Valor do terreno", "Financiamento da construção", "Proprietário do terreno", "Área construída", "Código da obra", "Nome da obra", "não passa pelo caixa da construtora"]) {
      expect(tela, rotulo).not.toContain(rotulo);
    }
    expect(CLIENTE_PROPRIO).toBe("Projeto próprio (sem cliente)");
  });

  it("Clientes: a ficha é do contratante (razão social, fantasia, contatos); sem unidade, renda, FGTS ou score", () => {
    const ficha = fs.readFileSync("src/components/app/cliente-fields.tsx", "utf8");
    for (const campo of ["nomeFantasia", "contatoAdm", "contatoTecnico", "contatoFinanceiro", "Razão social", "Contato administrativo"]) expect(ficha, campo).toContain(campo);
    for (const campo of ['"unitCode"', '"rendaBruta"', '"saldoFgts"', '"scoreCredito"', '"morarOuInvestir"', '"statusContrato"']) expect(ficha, campo).not.toContain(campo);
  });

  it("Planilha da versão e Dashboard: sem VGV de unidades no cartão de cima", () => {
    const dash = fs.readFileSync("src/app/(app)/dashboard/page.tsx", "utf8");
    expect(dash).toContain('label: "Valor contratado"');
    expect(dash).not.toContain('label: "VGV total"');
    expect(dash).not.toContain("IndicadoresObraPanel");
  });
});
