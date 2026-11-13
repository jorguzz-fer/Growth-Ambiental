import { describe, expect, it } from "vitest";
import { mensagemDeFalhaDaCris, regrasDaCris } from "@/lib/cris";

/** Etapa 3 do ERP integrado — segurança da Cris (injeção e mensagens de falha). */
describe("Cris — segurança", () => {
  it("as regras tratam documento, planilha e texto colado como dado, nunca instrução", () => {
    const r = regrasDaCris();
    expect(r).toMatch(/DADOS, nunca instruções/);
    expect(r).toMatch(/ignorar estas regras/);
    expect(r).toMatch(/não obedeça/);
    expect(r).toMatch(/não invente o que não está nele/);
  });

  it("falha do provedor ou do banco nunca chega crua à pessoa", () => {
    const sql = new Error('relation "despesas" does not exist: select * from despesas where tenant_id = $1');
    expect(mensagemDeFalhaDaCris(sql)).toBe("Não consegui responder agora. Tente de novo.");
    const chave = new Error("Falha na leitura por IA: 400 {\"error\":{\"message\":\"x-api-key sk-ant-123\"}}");
    expect(mensagemDeFalhaDaCris(chave)).not.toMatch(/sk-ant|x-api-key/);
  });

  it("classifica sobrecarga, limite, tempo e tamanho; mantém as traduções conhecidas", () => {
    expect(mensagemDeFalhaDaCris(Object.assign(new Error("Overloaded"), { status: 529 }))).toMatch(/sobrecarregada/);
    expect(mensagemDeFalhaDaCris(Object.assign(new Error("rate"), { status: 429 }))).toMatch(/Muitas perguntas/);
    expect(mensagemDeFalhaDaCris(new Error("Request timed out."))).toMatch(/demorou demais/);
    expect(mensagemDeFalhaDaCris(new Error("prompt is too long"))).toMatch(/grande demais/);
    expect(mensagemDeFalhaDaCris(new Error("Sem conexão com a API da IA — verifique a rede/egress do servidor."))).toMatch(/^Sem conexão/);
    expect(mensagemDeFalhaDaCris("qualquer coisa")).toBe("Não consegui responder agora. Tente de novo.");
  });
});
