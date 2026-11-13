import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { getStakeholders, getUsoDosStakeholders } from "@/lib/queries";
import { analisarStakeholders } from "@/lib/stakeholder-analise";
import { AssistenteStakeholders } from "@/components/app/assistente-stakeholders";
import { can } from "@/lib/permissions";
import { isAiConfigured } from "@/lib/ai/despesa-extract";
import { PAPEIS_STAKEHOLDER_OFERECIDOS } from "@/lib/calc/constants";
import { PageHeader } from "@/components/app/page-header";
import { FornecedorForm } from "@/components/app/fornecedor-form";
import { FornecedoresTable } from "@/components/app/fornecedores-table";
import { AccessDenied } from "@/components/app/access-denied";

export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "fornecedores", "ver")) return <AccessDenied />;
  const [stakeholders, uso] = await Promise.all([getStakeholders(ctx.tenant.id), getUsoDosStakeholders(ctx.tenant.id)]);
  // Seção 7 — análises do assistente (somente leitura), em código puro, sobre
  // o que a página carregou. Nenhum documento vai a modelo.
  const analise = analisarStakeholders(stakeholders, uso);

  return (
    <>
      <PageHeader
        title="Fornecedores e Parceiros"
        subtitle={`Registro global do tenant · ${stakeholders.length} cadastrados`}
        actions={
          <Link
            href="/contas"
            className="text-[12px] text-[var(--color-accent2)] hover:underline"
          >
            Contas correntes →
          </Link>
        }
      />

      {/* Abaixo de 1180px o painel desce para baixo do conteúdo (Prompt E, 6.2). */}
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      {/* Novo stakeholder */}
      <FornecedorForm papeis={PAPEIS_STAKEHOLDER_OFERECIDOS} aiConfigured={isAiConfigured()} />

      <FornecedoresTable
        stakeholders={stakeholders.map((s) => ({
          id: s.id,
          nome: s.nome,
          nomeFantasia: s.nomeFantasia,
          tipo: s.tipo,
          doc: s.doc,
          papeis: s.papeis,
          email: s.email,
          tel: s.tel,
          obs: s.obs,
          ativo: s.ativo,
          endereco: s.endereco,
          numero: s.numero,
          complemento: s.complemento,
          bairro: s.bairro,
          cidade: s.cidade,
          estado: s.estado,
          cep: s.cep,
          bancoNome: s.bancoNome,
          bancoAgencia: s.bancoAgencia,
          bancoConta: s.bancoConta,
          bancoTipoConta: s.bancoTipoConta,
          bancoTitular: s.bancoTitular,
          pixTipo: s.pixTipo,
          pixChave: s.pixChave,
        }))}
        papeis={PAPEIS_STAKEHOLDER_OFERECIDOS}
        canEditar={can(ctx.perms, "fornecedores", "editar")}
        canExcluir={can(ctx.perms, "fornecedores", "excluir")}
      />
      </div>
      <AssistenteStakeholders usuario={ctx.userEmail ?? "anon"} analise={analise} />
      </div>
    </>
  );
}
