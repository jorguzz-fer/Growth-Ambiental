"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTenantAccount } from "@/lib/actions/tenants";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

interface Result {
  ok: boolean;
  error?: string;
  reusedUser?: boolean;
  ownerEmail?: string;
  tenantName?: string;
}

/**
 * Formulário de criação de conta (tenant) pelo super-admin. Cria a conta com a
 * estrutura padrão e mostra o resultado (com o login do responsável) inline.
 */
export function CreateTenantForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const ownerEmail = String(fd.get("ownerEmail") ?? "").trim().toLowerCase();
    const tenantName = String(fd.get("tenantName") ?? "").trim();
    setResult(null);
    start(async () => {
      const res = await createTenantAccount(fd);
      if (res.ok) {
        setResult({ ...res, ownerEmail, tenantName });
        form.reset();
        router.refresh();
      } else {
        setResult(res);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Nome da empresa (tenant)</Label>
          <Input name="tenantName" placeholder="Ex.: Consultoria Ambiental XPTO" required />
        </div>
        <div>
          <Label>Nome do primeiro projeto</Label>
          <Input name="projectName" placeholder="Ex.: Monitoramento Arqueológico 1" defaultValue="Projeto 1" />
        </div>
        <div>
          <Label>Responsável — nome</Label>
          <Input name="ownerName" placeholder="Nome do owner" />
        </div>
        <div>
          <Label>Responsável — e-mail</Label>
          <Input name="ownerEmail" type="email" placeholder="owner@empresa.com" required />
        </div>
        <div>
          <Label>Senha inicial do responsável (mín. 8)</Label>
          <PasswordInput name="ownerPassword" placeholder="mín. 8" autoComplete="new-password" required />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Criando conta…" : "Criar conta"}
          </Button>
        </div>
      </div>

      {result && !result.ok && (
        <div className="rounded-[8px] border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700">
          {result.error}
        </div>
      )}

      {result && result.ok && (
        <div className="rounded-[8px] border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700">
          <p className="font-semibold">
            ✓ Conta “{result.tenantName}” criada com estrutura padrão (projeto +
            3 versões + plano de contas + INCC).
          </p>
          <p className="mt-1">
            Acesso do responsável: <strong>{result.ownerEmail}</strong>
            {result.reusedUser
              ? " (usuário já existia — senha anterior preservada; ele já é dono desta nova conta)."
              : " — com a senha inicial que você definiu."}
          </p>
        </div>
      )}
    </form>
  );
}
