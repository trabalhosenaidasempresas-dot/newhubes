export type ModuleKey =
  | "ocorrencias" | "agenda" | "documentos" | "insumos" | "compras"
  | "equipamentos" | "relatorios" | "configuracoes" | "gestaodoc" | "contratos";

export type HubRecord = {
  id: string;
  module: ModuleKey;
  code: string;
  createdAt: string;
  title: string;
  status: string;
  category: string;
  owner: string;
  location: string;
  due: string;
  description: string;
  updatedAt: string;
  history?: { action: string; actor: string; at: string; details: string }[];
  priority?: string;
  amount?: number;
  allowedRoles?: PermissionGroup[];
  createdBy?: string;
};

export type PermissionGroup = "admin" | "colaborador" | "visitante";
export const permissionGroups: { key: PermissionGroup; label: string; roles: string[] }[] = [
  { key: "admin", label: "Admin", roles: ["administrador", "administração"] },
  { key: "colaborador", label: "Colaborador", roles: ["administração", "recepção", "manutenção", "limpeza"] },
  { key: "visitante", label: "Visitante", roles: ["visitante"] },
];
export const canAccessByPermission = (allowedRoles: PermissionGroup[] | undefined, role: string) =>
  !!allowedRoles?.some((group) => permissionGroups.find((item) => item.key === group)?.roles.includes(role));

export type FieldKind = "text" | "select" | "date" | "number" | "textarea";
export type Field = { key: keyof HubRecord; label: string; kind?: FieldKind; options?: string[]; required?: boolean };

export const moduleConfig: Record<ModuleKey, { title: string; singular: string; description: string; icon: string; fields: Field[] }> = {
  ocorrencias: { title: "Ocorrências", singular: "ocorrência", description: "Registre, acompanhe e resolva demandas do HUB.", icon: "wrench", fields: [
    { key: "title", label: "Título", required: true }, { key: "category", label: "Categoria", kind: "select", options: ["Infraestrutura", "Limpeza", "Equipamentos", "Evento", "Segurança", "Tecnologia", "Manutenção", "Outros"], required: true },
    { key: "location", label: "Local", required: true }, { key: "priority", label: "Prioridade", kind: "select", options: ["Baixa", "Média", "Alta", "Crítica"] },
    { key: "owner", label: "Responsável" }, { key: "due", label: "Prazo", kind: "date" }, { key: "description", label: "Descrição", kind: "textarea" },
  ] },
  agenda: { title: "Agenda", singular: "evento", description: "Organize eventos e solicite os espaços do HUB ES+.", icon: "calendar", fields: [
    { key: "title", label: "Nome do evento", required: true }, { key: "category", label: "Tipo", kind: "select", options: ["Workshop", "Reunião", "Palestra", "Exposição", "Evento cultural"] },
    { key: "location", label: "Espaço", kind: "select", options: ["Auditório", "Lab Maker", "Sala Criativa", "Coworking", "Hall", "Espaço Multiuso"], required: true },
    { key: "due", label: "Data", kind: "date", required: true }, { key: "owner", label: "Responsável", required: true }, { key: "description", label: "Horário e detalhes", kind: "textarea" },
  ] },
  documentos: { title: "Documentos", singular: "documento", description: "Encontre arquivos, acompanhe validades e mantenha tudo organizado.", icon: "files", fields: [
    { key: "title", label: "Nome do documento", required: true }, { key: "category", label: "Categoria", kind: "select", options: ["Contratos", "Editais", "POPs", "Atas", "Normas", "Relatórios", "Comunicação institucional", "Ocorrências", "Documentos Fiscais", "Patrimônio"], required: true },
    { key: "owner", label: "Responsável" }, { key: "due", label: "Validade", kind: "date" }, { key: "description", label: "Descrição", kind: "textarea" },
  ] },
  insumos: { title: "Insumos", singular: "item de estoque", description: "Acompanhe níveis de estoque e movimentações de materiais.", icon: "boxes", fields: [
    { key: "title", label: "Nome do item", required: true }, { key: "category", label: "Categoria", kind: "select", options: ["Limpeza", "Escritório", "Evento", "Manutenção", "Tecnologia", "Consumo"] },
    { key: "amount", label: "Quantidade atual", kind: "number", required: true }, { key: "location", label: "Unidade / local" }, { key: "description", label: "Estoque mínimo e unidade", kind: "textarea" },
  ] },
  compras: { title: "Compras", singular: "solicitação", description: "Acompanhe as etapas e a documentação das compras.", icon: "shopping", fields: [
    { key: "title", label: "Item solicitado", required: true }, { key: "category", label: "Setor", kind: "select", options: ["Administrativo", "Operação", "Eventos", "Tecnologia"] },
    { key: "amount", label: "Valor estimado (R$)", kind: "number" }, { key: "priority", label: "Prioridade", kind: "select", options: ["Baixa", "Média", "Alta", "Crítica"] },
    { key: "owner", label: "Solicitante" }, { key: "description", label: "Justificativa", kind: "textarea" },
  ] },
  equipamentos: { title: "Equipamentos", singular: "equipamento", description: "Gerencie patrimônio, localização e manutenção preventiva.", icon: "monitor", fields: [
    { key: "title", label: "Nome do equipamento", required: true }, { key: "code", label: "Código patrimonial" }, { key: "location", label: "Local" },
    { key: "owner", label: "Responsável" }, { key: "status", label: "Condição", kind: "select", options: ["Disponível", "Em uso", "Em manutenção", "Indisponível", "Baixado"] }, { key: "due", label: "Próxima manutenção", kind: "date" },
  ] },
  relatorios: { title: "Relatórios", singular: "relatório", description: "Indicadores para uma gestão mais informada.", icon: "chart", fields: [] },
  configuracoes: { title: "Configurações", singular: "configuração", description: "Gerencie acessos, espaços e parâmetros do sistema.", icon: "settings", fields: [
    { key: "title", label: "Nome", required: true }, { key: "category", label: "Perfil / categoria" }, { key: "owner", label: "E-mail / responsável" }, { key: "description", label: "Observações", kind: "textarea" },
  ] },
  gestaodoc: { title: "Gestão documental", singular: "documento", description: "Controle documentos, versões e trilhas de auditoria.", icon: "files", fields: [
    { key: "title", label: "Descrição do documento", required: true }, { key: "code", label: "ID de controle" }, { key: "category", label: "Categoria", kind: "select", options: ["Contratos", "Editais", "POPs", "Atas", "Normas", "Relatórios", "Documentos Fiscais"] }, { key: "owner", label: "Responsável" },
  ] },
  contratos: { title: "Contratos", singular: "contrato", description: "Centralize contratos, fornecedores e prazos de vigência.", icon: "briefcase", fields: [
    { key: "title", label: "Objeto do contrato", required: true }, { key: "code", label: "Número do contrato" }, { key: "owner", label: "Fiscal responsável" }, { key: "category", label: "Fornecedor" },
    { key: "due", label: "Vigência até", kind: "date" }, { key: "amount", label: "Valor (R$)", kind: "number" }, { key: "description", label: "Observações", kind: "textarea" },
  ] },
};

const make = (module: ModuleKey, code: string, title: string, status: string, category: string, owner: string, location: string, due: string, description: string, priority?: string, amount?: number): HubRecord => ({
  id: `${module}-${code}`, module, code, title, status, category, owner, location, due, description, priority, amount, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});

export const seedRecords: HubRecord[] = [
  make("ocorrencias", "OC-0248", "Projetor do auditório sem sinal", "Em execução", "Equipamentos", "Rafael Costa", "Auditório", "2026-10-03", "Equipamento liga, mas não reconhece a entrada HDMI.", "Alta"),
  make("ocorrencias", "OC-0247", "Vazamento próximo ao Lab Maker", "Aberta", "Infraestrutura", "Marina Alves", "Lab Maker", "2026-10-02", "Goteira identificada após as chuvas de ontem.", "Crítica"),
  make("ocorrencias", "OC-0246", "Reposição de material de limpeza", "Em análise", "Limpeza", "Joana Lima", "Área comum", "2026-10-04", "Solicitada reposição de detergente e sacos de lixo.", "Média"),
  make("ocorrencias", "OC-0245", "Lâmpadas queimadas no coworking", "Resolvida", "Manutenção", "Rafael Costa", "Coworking", "2026-09-29", "Troca realizada pela equipe de manutenção.", "Baixa"),
  make("ocorrencias", "OC-0244", "Wi-Fi instável na Sala Criativa", "Em análise", "Tecnologia", "Pedro Nunes", "Sala Criativa", "2026-10-05", "Quedas intermitentes relatadas por participantes.", "Alta"),
  make("agenda", "EV-0108", "Conexões Criativas: edição outubro", "Confirmado", "Workshop", "Equipe HUB ES+", "Auditório", "2026-10-02", "14:00 — 17:00 • 80 participantes"),
  make("agenda", "EV-0109", "Encontro de economia criativa", "Aguardando aprovação", "Reunião", "Ana Paula", "Sala Criativa", "2026-10-02", "15:00 — 16:30 • 18 participantes"),
  make("agenda", "EV-0110", "Oficina de prototipagem", "Confirmado", "Workshop", "Lucas Ferreira", "Lab Maker", "2026-10-03", "09:00 — 12:00 • 20 participantes"),
  make("documentos", "DOC-081", "Contrato de manutenção predial", "Vencendo", "Contratos", "Administração", "Gestão documental", "2026-10-15", "Contrato nº 014/2024 — renovação em andamento"),
  make("documentos", "DOC-080", "Ata — Conselho de Gestão · setembro", "Ativo", "Atas", "Secretaria", "Gestão documental", "2027-09-30", "Reunião ordinária de 18 de setembro"),
  make("documentos", "DOC-079", "Plano de segurança do espaço", "Ativo", "Normas", "Marina Alves", "Gestão documental", "2027-03-15", "Procedimentos de emergência e evacuação"),
  make("insumos", "INS-021", "Papel toalha interfolhado", "Estoque baixo", "Limpeza", "Almoxarifado", "Depósito A", "2026-10-01", "12 pacotes • mínimo: 20"),
  make("insumos", "INS-018", "Copo biodegradável 200ml", "Em estoque", "Evento", "Almoxarifado", "Depósito A", "2026-10-01", "450 unidades • mínimo: 100", undefined, 450),
  make("insumos", "INS-016", "Marcador para quadro branco", "Estoque baixo", "Escritório", "Almoxarifado", "Depósito B", "2026-10-01", "8 unidades • mínimo: 15", undefined, 8),
  make("compras", "CMP-042", "Reposição de material de limpeza", "Aguardando aprovação", "Operação", "Joana Lima", "Administração", "2026-10-01", "Reposição mensal de itens de consumo.", "Alta", 680),
  make("compras", "CMP-041", "Cabos HDMI para salas", "Em cotação", "Tecnologia", "Pedro Nunes", "Administração", "2026-09-30", "Aquisição de 4 cabos HDMI de 10m.", "Média", 420),
  make("compras", "CMP-039", "Materiais oficina de outubro", "Concluída", "Eventos", "Lucas Ferreira", "Administração", "2026-09-25", "Materiais de apoio para atividades.", "Baixa", 950),
  make("equipamentos", "PAT-0042", "Projetor Epson PowerLite", "Em uso", "Audiovisual", "Rafael Costa", "Auditório", "2026-11-12", "Projetor principal do auditório"),
  make("equipamentos", "PAT-0038", "Impressora multifuncional", "Disponível", "Escritório", "Joana Lima", "Administração", "2026-12-01", "Impressora de rede"),
  make("equipamentos", "PAT-0035", "Cortadora a laser", "Em manutenção", "Lab Maker", "Pedro Nunes", "Lab Maker", "2026-10-04", "Revisão preventiva do sistema de exaustão"),
  make("contratos", "CT-014/2024", "Manutenção predial preventiva", "Vigente", "Manutenção Capixaba Ltda.", "Marina Alves", "HUB ES+", "2026-10-15", "Contrato anual de serviços de manutenção.", undefined, 48000),
  make("contratos", "CT-009/2025", "Serviços de conectividade", "Vigente", "Rede ES Tecnologia", "Pedro Nunes", "HUB ES+", "2027-01-30", "Link dedicado e suporte de rede.", undefined, 26400),
  make("gestaodoc", "GD-019", "Plano de segurança do espaço", "Ativo", "Normas", "Marina Alves", "Arquivo central", "2027-03-15", "Revisão 2 • atualizado em 15/09/2026"),
  make("configuracoes", "USR-001", "Marina Alves", "Ativo", "Administrador", "marina@hubes.es.gov.br", "Gestão", "2026-10-01", "Administração total do sistema"),
  make("configuracoes", "USR-002", "Joana Lima", "Ativo", "Administração", "joana@hubes.es.gov.br", "Administrativo", "2026-10-01", "Compras e agenda"),
  make("configuracoes", "USR-003", "Rafael Costa", "Ativo", "Manutenção", "rafael@hubes.es.gov.br", "Operação", "2026-10-01", "Ordens de manutenção"),
];

export function getModuleKey(value: string): ModuleKey | null {
  return value in moduleConfig ? value as ModuleKey : null;
}
