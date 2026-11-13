import { PageHeader } from "@/components/app/page-header";
import { ProjectPicker } from "@/components/app/project-picker";
import { RecuperarProjeto } from "@/components/app/projeto-da-aba";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Tela aberta sem obra na URL (Prompt A, 12 e B-A2): a aba reabre a última
 * obra escolhida nela; sem memória, pede a escolha. Nunca escolhe o primeiro
 * projeto.
 */
export function PedirProjeto({
  titulo,
  projetos,
  oQue,
  allOption = false,
  aviso,
}: {
  titulo: string;
  projetos: { id: string; name: string }[];
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
      <RecuperarProjeto idsPermitidos={projetos.map((p) => p.id)}>
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
