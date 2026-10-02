import { ModulePage } from "@/components/module-page";

export default async function WorkspaceModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <ModulePage module={module} />;
}
