import { Input, Label } from "@/components/ui/input";
import type { ClienteRow } from "@/lib/queries";
import { campoSensivelCliente } from "@/lib/clientes-sensivel";

/**
 * Growth Ambiental: o cliente é o CONTRATANTE dos serviços (empresa, órgão
 * público ou pessoa física). A ficha tem os dados cadastrais e os três
 * contatos de um contratante pessoa jurídica.
 *
 * Os campos de comprador de imóvel (unidade comprada, status do contrato de
 * venda, renda, FGTS, score, motivação de compra…) saíram da tela. Eles NÃO
 * foram apagados do banco: a action só grava o que o formulário envia, então
 * salvar a ficha não toca no que já estava gravado.
 */
type FieldType = "text" | "textarea";
interface Field {
  name: keyof ClienteRow;
  label: string;
  type?: FieldType;
  required?: boolean;
  colSpan?: string;
  placeholder?: string;
}

interface Group {
  title: string;
  fields: Field[];
  /** Bloco inteiro exige a permissão de dados do cliente (Prompt M, 5.4.1). */
  sensivel?: boolean;
}

const contato = (prefixo: "contatoAdm" | "contatoTecnico" | "contatoFinanceiro"): Field[] => [
  { name: `${prefixo}Nome`, label: "Nome", colSpan: "sm:col-span-2" },
  { name: `${prefixo}Email`, label: "E-mail" },
  { name: `${prefixo}Telefone`, label: "Telefone" },
];

const GROUPS: Group[] = [
  {
    title: "Dados do contratante",
    fields: [
      { name: "nomeCompleto", label: "Razão social / nome", required: true, colSpan: "sm:col-span-2" },
      { name: "nomeFantasia", label: "Nome fantasia" },
      { name: "cpfCnpj", label: "CNPJ / CPF" },
      { name: "endereco", label: "Endereço", colSpan: "sm:col-span-2" },
      { name: "cidadeEstado", label: "Cidade / UF" },
      { name: "cep", label: "CEP" },
      { name: "emailPrincipal", label: "E-mail principal" },
      { name: "emailSecundario", label: "E-mail secundário" },
      { name: "telefone", label: "Telefone" },
      { name: "celular", label: "Celular / WhatsApp" },
    ],
  },
  { title: "Contato administrativo", fields: contato("contatoAdm") },
  { title: "Contato técnico", fields: contato("contatoTecnico") },
  { title: "Contato financeiro", fields: contato("contatoFinanceiro") },
  {
    title: "Observações internas",
    sensivel: true,
    fields: [{ name: "obsEstrategicas", label: "Observações", type: "textarea", colSpan: "sm:col-span-4" }],
  },
];

/** Campos que a ficha do contratante mostra (os testes e a listagem leem daqui). */
export const CAMPOS_DA_FICHA_DO_CONTRATANTE = GROUPS.flatMap((g) => g.fields.map((f) => f.name));

/**
 * Campos do contratante. Quem não tem `clientesdados:ver` não vê o bloco
 * sensível — ele não existe na tela (nem vazio), e o servidor nem o seleciona.
 * Com `ver` sem `editar`, aparece desabilitado (campo desabilitado não é
 * enviado, e a action também o ignora).
 */
export function ClienteFields({
  cliente,
  veDados = false,
  editaDados = false,
  cpfMascarado = null,
}: {
  cliente?: Partial<ClienteRow>;
  veDados?: boolean;
  editaDados?: boolean;
  /** Documento já cadastrado, mascarado, para quem não vê o documento completo. */
  cpfMascarado?: string | null;
}) {
  const val = (f: keyof ClienteRow) => {
    const v = cliente?.[f];
    return v == null ? "" : String(v);
  };
  const grupos = GROUPS.filter((g) => !g.sensivel || veDados).map((g) => ({
    ...g,
    fields: g.fields.filter((f) => veDados || !campoSensivelCliente(f.name)),
  }));
  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <div key={g.title}>
          <h3 className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
            {g.title}
            {g.sensivel && (
              <span className="ml-2 normal-case tracking-normal text-[var(--color-ink4)]">
                · exige permissão de dados do cliente
              </span>
            )}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {g.fields.map((f) => {
              const bloqueado = campoSensivelCliente(f.name) && !editaDados;
              return (
                <div key={f.name} className={f.colSpan}>
                  <Label>{f.label}</Label>
                  {f.name === "cpfCnpj" && !veDados ? (
                    // Sem a permissão, o documento não vem do servidor. Vazio =
                    // mantém o cadastrado; digitar substitui.
                    <Input
                      name="cpfCnpj"
                      defaultValue=""
                      placeholder={cpfMascarado ? `${cpfMascarado} — digite para substituir` : ""}
                    />
                  ) : f.type === "textarea" ? (
                    <textarea
                      name={f.name}
                      defaultValue={val(f.name)}
                      rows={2}
                      disabled={bloqueado}
                      className="w-full rounded-[8px] border border-[var(--color-accent2)]/20 bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent2)]"
                    />
                  ) : (
                    <Input name={f.name} type="text" required={f.required} defaultValue={val(f.name)} disabled={bloqueado} placeholder={f.placeholder} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
