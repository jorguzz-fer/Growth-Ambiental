import { PageHeader } from "@/components/app/page-header";
import { ProjectPicker } from "@/components/app/project-picker";
import { RecuperarProjeto } from "@/components/app/projeto-da-aba";
import { Card, CardContent } from "@/components/ui/card";
import { primeiroProjetoAtivo, TODOS_OS_PROJETOS } from "@/lib/projeto-selecao";

/**
 * Tela aberta sem obra na URL (Prompt A, 12 e B-A2): a aba reabre a última
 * obra escolhida nela. GA-13 H2: sem memória, a tela não abre vazia: com a
 * opção "Todos" (`allOption`), abre em Todos; senão, no primeiro projeto
 * ativo. O aviso "Selecione um projeto" só aparece sem nenhum projeto.
 */
export function PedirProjeto({
  titulo,
  projetos,
  oQue,
  allOption = false,
  aviso,
}: {
  titulo: string;
  projetos: { id: string; name: string; situacao?: string | null; kind?: string | null }[];
  /** complemento de "Selecione um projeto para …" (ex.: "ver as unidades"). */
  oQue: string;
  allOption?: boolean;
  /** Linha logo abaixo do título (ex.: aviso de tela que saiu). */
  aviso?: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={titulo}
        actions={
          <ProjectPicker
            projects={projetos.map((p) => ({ id: p.id, label: p.name }))}
            selected=""
            allOption={allOption}
          />
        }
      />
      {aviso}
      <RecuperarProjeto idsPermitidos={projetos.map((p) => p.id)} semMemoria={allOption ? TODOS_OS_PROJETOS : primeiroProjetoAtivo(projetos)?.id}>
        <Card>
          <CardContent className="p-8 text-center text-[var(--color-ink3)]">
            {projetos.length === 0
              ? "Nenhum projeto cadastrado. Cadastre o projeto em Projetos."
              : `Selecione um projeto para ${oQue}.`}
          </CardContent>
        </Card>
      </RecuperarProjeto>
    </>
  );
}
