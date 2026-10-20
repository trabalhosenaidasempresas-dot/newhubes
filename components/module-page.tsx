"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle, ArrowRight, ArrowUpRight, CalendarDays, Check,
  ChevronDown, ChevronLeft, ChevronRight, Download, FileText,
  Filter, History, Lightbulb, MapPin, Plus, Search, Sparkles, Upload, X,
} from "lucide-react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { HubRecord, ModuleKey, Field, PermissionGroup, canAccessByPermission, getModuleKey, moduleConfig, permissionGroups } from "@/lib/data";
import { useHubData } from "@/components/app-shell";
import { createClient } from "@/lib/supabase";
import { suggestOccurrence } from "@/lib/occurrence-suggestions";

const GESTAODOC_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "odt", "ods", "odp", "rtf", "jpg", "jpeg", "png", "gif", "webp"];
const GESTAODOC_ACCEPT = GESTAODOC_EXTENSIONS.map((extension) => `.${extension}`).join(",");
function validateGestaoDocFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!GESTAODOC_EXTENSIONS.includes(extension)) return "Formato não permitido. Envie PDF, Word, Excel, PowerPoint, CSV, TXT, ODF, RTF ou imagem.";
  if (file.size > 10 * 1024 * 1024) return "O arquivo deve ter no máximo 10 MB.";
  return "";
}
function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const permissionsLabel = (groups?: PermissionGroup[]) => !groups?.length ? "Não definidas" : groups.length === permissionGroups.length ? "Todos" : permissionGroups.filter((group) => groups.includes(group.key)).map((group) => group.label).join(", ");

function PermissionsPicker({ value, onChange }: { value: PermissionGroup[]; onChange: (next: PermissionGroup[]) => void }) {
  const row = { display: "flex", alignItems: "center", gap: 8 } as const;
  return <div className="form-field"><label>Quem pode acessar esta configuração?</label>
    <label style={row}><input type="checkbox" checked={value.length === permissionGroups.length} onChange={(event) => onChange(event.target.checked ? permissionGroups.map((group) => group.key) : [])} /> Todos os perfis</label>
    {permissionGroups.map((group) => <label key={group.key} style={row}><input type="checkbox" checked={value.includes(group.key)} onChange={(event) => onChange(event.target.checked ? [...value, group.key] : value.filter((item) => item !== group.key))} /> {group.label}</label>)}
    <small>Selecione pelo menos um perfil.</small></div>;
}

const statusOptions: Record<ModuleKey, string[]> = {
  ocorrencias: ["Aberta", "Em análise", "Em execução", "Resolvida", "Cancelada"],
  agenda: ["Aguardando aprovação", "Confirmado", "Recusado", "Cancelado"],
  documentos: ["Ativo", "Vencendo", "Vencido", "Arquivado"],
  insumos: ["Em estoque", "Estoque baixo", "Solicitação de baixa"],
  compras: ["Solicitada", "Aguardando aprovação", "Aprovada", "Em cotação", "Compra realizada", "Recebida", "Concluída", "Cancelada"],
  equipamentos: ["Disponível", "Em uso", "Em manutenção", "Indisponível", "Baixado"],
  relatorios: [], configuracoes: ["Ativo", "Inativo"], gestaodoc: ["Ativo", "Arquivado"], contratos: ["Vigente", "Vencendo", "Encerrado"],
};
const canManage: Record<string, ModuleKey[]> = {
  administrador: ["ocorrencias", "agenda", "documentos", "insumos", "compras", "equipamentos", "relatorios", "configuracoes", "gestaodoc", "contratos"],
  administração: ["agenda", "documentos", "insumos", "compras", "equipamentos", "relatorios", "gestaodoc", "contratos"],
  recepção: ["agenda", "relatorios"], manutenção: ["ocorrencias", "insumos", "equipamentos"], limpeza: ["ocorrencias", "insumos"],
};
const validationSchema = z.object({
  title: z.string().min(3, "Informe pelo menos 3 caracteres."),
  category: z.string().optional(), owner: z.string().optional(), location: z.string().optional(),
  due: z.string().optional(), description: z.string().optional(), priority: z.string().optional(),
  amount: z.coerce.number().optional(), code: z.string().optional(),
});
type FormValues = z.input<typeof validationSchema>;
type ParsedFormValues = z.output<typeof validationSchema>;

const statusVariant = (status: string) => {
  const s = status.toLocaleLowerCase("pt-BR");
  if (/resolvid|conclu|confirm|disponível|ativo|vigente|em estoque/.test(s)) return "green";
  if (/crític|vencid|baixo|aberta|cancelad|recusad/.test(s)) return "red";
  if (/aguard|análise|vencendo|cotação|solicitad/.test(s)) return "yellow";
  return "blue";
};
const formatDate = (date: string) => date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR") : date || "—";

export function ModulePage({ module: moduleName }: { module: string }) {
  const moduleKey = getModuleKey(moduleName);
  if (!moduleKey) return <NotFoundModule />;
  if (moduleKey === "relatorios") return <Reports />;
  return <RegistryPage module={moduleKey} />;
}

function RegistryPage({ module }: { module: ModuleKey }) {
  const { records, addRecord, updateRecord, deleteRecord, session, notify } = useHubData();
  const config = moduleConfig[module];
  const role = session?.role?.toLocaleLowerCase("pt-BR") ?? "visitante";
  const canEdit = (canManage[role] ?? []).includes(module) || (role === "visitante" && (module === "agenda" || module === "ocorrencias"));
  const canCreate = canEdit && !(module === "agenda" && role === "recepção");
  const canEditDetails = canEdit && role !== "visitante" && !(module === "agenda" && role !== "administrador") && role !== "recepção";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas as categorias");
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<HubRecord | null>(null);
  const [upload, setUpload] = useState<File | null>(null);
  const [agendaConflict, setAgendaConflict] = useState("");
  const [permTab, setPermTab] = useState<"general" | "permissions">("general");
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([]);
  const values = useForm<FormValues, unknown, ParsedFormValues>({ resolver: zodResolver(validationSchema), defaultValues: { title: "", category: "", owner: session?.name ?? "", location: "", due: "", description: "", priority: "Média", amount: undefined, code: "" } });
  const canViewRecord = (item: HubRecord) => (module !== "configuracoes" || role === "administrador" || canAccessByPermission(item.allowedRoles, role)) && !(role === "visitante" && module === "ocorrencias" && item.owner !== session?.name);
  const entries = useMemo(() => records.filter((item) => item.module === module && canViewRecord(item) && (category === "Todas as categorias" || item.category === category) && `${item.title} ${item.code} ${item.category} ${item.owner} ${item.location}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [records, module, category, search, role]);  // eslint-disable-line react-hooks/exhaustive-deps
  const categories = [...new Set(records.filter((item) => item.module === module && item.category && canViewRecord(item)).map((item) => item.category))];
  const isVisitor = role === "visitante";
  const availableStatuses = statusOptions[module].filter((status) => {
    if (isVisitor) return false;
    if (module === "agenda") return role === "administrador";
    if (module === "configuracoes") return role === "administrador";
    if (module === "compras" && role === "administrador") return status !== "Cancelada";
    if (module === "compras" && role === "administração") return status !== "Aprovada";
    if (module === "insumos" && ["manutenção", "limpeza"].includes(role)) return status === "Solicitação de baixa";
    return true;
  });

  function openCreate() {
    if (!canCreate) { notify("Seu perfil não tem permissão para cadastrar neste módulo."); return; }
    values.reset({ title: "", category: "", owner: session?.name ?? "", location: "", due: "", description: "", priority: "Média", amount: undefined, code: "" });
    setUpload(null);
    setAgendaConflict("");
    setPermTab("general");
    setPermGroups([]);
    setModal(true);
  }

  async function submit(valuesFromForm: ParsedFormValues) {
    if (module === "configuracoes" && permGroups.length === 0) { setPermTab("permissions"); notify("Selecione pelo menos um perfil na aba Permissões."); return; }
    let description = valuesFromForm.description ?? "";
    if (upload) {
      if (module === "agenda" && /\.csv$/i.test(upload.name)) {
        const lines = (await upload.text()).split(/\r?\n/).filter((line) => line.trim());
        const columns = (lines[0] ?? "").toLocaleLowerCase("pt-BR").split(",").map((column) => column.trim());
        const emailColumn = columns.indexOf("email");
        const nameColumn = columns.indexOf("nome");
        if (emailColumn < 0 || nameColumn < 0) { notify("O CSV precisa conter as colunas nome,email. Baixe o modelo para conferir o formato."); return; }
        const attendees = lines.slice(1).map((line) => line.split(",")).filter((row) => row[nameColumn]?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row[emailColumn]?.trim() ?? ""));
        if (attendees.length === 0) { notify("Nenhuma linha válida encontrada no CSV. Confira nome e e-mail."); return; }
        description = `${description}\nLista CSV: ${attendees.length} participante(s) com dados válidos.`;
      } else {
        const fileProblem = module === "gestaodoc" ? validateGestaoDocFile(upload) : "";
        if (fileProblem) { notify(fileProblem); return; }
        if (upload.size > 10 * 1024 * 1024) { notify("O arquivo deve ter no máximo 10 MB."); return; }
        const supabase = createClient();
        if (supabase) {
          const path = `${module}/${crypto.randomUUID()}-${upload.name}`;
          const { error } = await supabase.storage.from("hub-files").upload(path, upload, { upsert: false });
          if (error) { notify(`Falha ao enviar arquivo: ${error.message}`); return; }
          const { data, error: signingError } = await supabase.storage.from("hub-files").createSignedUrl(path, 3600);
          if (signingError) { notify(`Arquivo enviado, mas não foi possível gerar o link: ${signingError.message}`); return; }
          description = `${description}\nArquivo: ${data.signedUrl}`;
        } else {
          description = `${description}\nArquivo anexado à demonstração: ${upload.name}`;
        }
      }
    }
    const status = module === "agenda" ? role === "administrador" ? "Confirmado" : "Aguardando aprovação"
      : module === "ocorrencias" ? "Aberta" : module === "compras" ? "Solicitada"
        : module === "insumos" ? "Em estoque" : module === "documentos" || module === "gestaodoc" ? "Ativo" : module === "equipamentos" ? "Disponível" : module === "contratos" ? "Vigente" : "Ativo";
    const record: Omit<HubRecord, "id" | "createdAt" | "updatedAt" | "history" | "code"> & { code?: string } = {
      module, title: valuesFromForm.title, status, category: valuesFromForm.category || config.title,
      owner: (isVisitor && module === "ocorrencias" ? session?.name : valuesFromForm.owner) || session?.name || "Equipe HUB ES+", location: valuesFromForm.location || "HUB ES+",
      due: valuesFromForm.due || new Date().toISOString().slice(0, 10), description,
      priority: valuesFromForm.priority || "Média", amount: valuesFromForm.amount, code: valuesFromForm.code || (isVisitor && module === "ocorrencias" ? `OCO-V${crypto.randomUUID().slice(0, 8).toUpperCase()}` : undefined),
      ...(module === "configuracoes" ? { allowedRoles: permGroups } : {}),
    };
    const createdRecord = await addRecord(record);
    if (!createdRecord) return;
    if (module === "ocorrencias" && upload) {
      await addRecord({
        module: "documentos", title: `Evidência · ${record.title}`, status: "Ativo", category: "Ocorrências",
        owner: record.owner, location: record.location, due: record.due,
        description: `Origem: ${createdRecord.code}\n${description}`,
      });
    }
    setModal(false);
  }

  function onFormChange() {
    if (module !== "agenda") return;
    const selectedDay = values.getValues("due");
    const selectedSpace = values.getValues("location");
    const conflict = records.find((item) => item.module === "agenda" && item.due === selectedDay && item.location === selectedSpace && ["Confirmado", "Aguardando aprovação"].includes(item.status));
    setAgendaConflict(conflict ? `${selectedSpace} já possui “${conflict.title}” nesta data (${conflict.code}). Escolha outro espaço ou dia.` : "");
  }

  const stateCounts = statusOptions[module].map((status) => ({ status, count: entries.filter((item) => item.status === status).length })).filter((item) => item.count > 0);
  if (!canManage[role]?.includes(module) && !isVisitor && module !== "configuracoes") return <AccessPanel />;
  function openRecord(entry: HubRecord) {
    if (!canViewRecord(entry)) { notify("Você não possui permissão para acessar esta configuração."); return; }
    setSelected(entry);
  }
  return (
    <div className="module-page">
      <div className="page-heading module-heading"><div><div className="eyebrow">HUB ES+ <span className="heading-spark">✳</span> GESTÃO</div><h1>{config.title}</h1><p>{config.description}</p></div>
        {canCreate && <button className="button button-dark" onClick={openCreate}><Plus size={17} /> {isVisitor && module === "agenda" ? "Solicitar espaço" : module === "agenda" ? "Novo evento" : `${module === "ocorrencias" ? "Nova" : "Novo"} ${config.singular}`}</button>}
      </div>

      {module === "agenda" && <AgendaOverview records={records.filter((item) => item.module === "agenda")} />}
      {module === "ocorrencias" && <div className="quick-tip"><span><Sparkles size={16} /></span><div><strong>Um problema bem descrito se resolve mais rápido.</strong><small>Descreva o que aconteceu e onde. A sugestão inteligente ajuda a encaminhar a demanda.</small></div><button onClick={openCreate}>Registrar ocorrência <ArrowRight size={14} /></button></div>}

      {module !== "agenda" && <div className="module-summary-strip">{stateCounts.map((item) => <div key={item.status}><span className={`summary-dot ${statusVariant(item.status)}`} />{item.status}<strong>{String(item.count).padStart(2, "0")}</strong></div>)}<span className="summary-total">{entries.length} registros</span></div>}

      <section className="panel registry-panel">
        <div className="registry-toolbar"><div className="registry-title"><h3>{module === "agenda" ? "Eventos e solicitações" : "Todos os registros"}</h3><span>{entries.length}</span></div><div className="registry-actions"><label className="registry-search"><Search size={16} /><input placeholder={`Buscar ${config.title.toLocaleLowerCase("pt-BR")}...`} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="filter-select"><Filter size={14} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Todas as categorias</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label>
          {module === "documentos" && <label className="button button-outline upload-quick"><Upload size={15} /> Upload<input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setUpload(file); setModal(true); } }} hidden /></label>}
        </div></div>
        {module === "agenda" ? <EventList entries={entries} onSelect={setSelected} /> : <div className="table-scroll"><table className="data-table registry-table"><thead><tr><th>REGISTRO</th><th>CATEGORIA</th><th>{module === "insumos" ? "QUANTIDADE / LOCAL" : module === "compras" ? "SOLICITANTE" : module === "equipamentos" ? "LOCAL / RESPONSÁVEL" : "RESPONSÁVEL"}</th><th>{module === "documentos" || module === "contratos" ? "VALIDADE" : module === "compras" ? "VALOR ESTIMADO" : "ATUALIZADO / PRAZO"}</th><th>STATUS</th><th /></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} onClick={() => openRecord(entry)} className="clickable-row"><td><span className="table-primary">{entry.title}<small>{entry.code}</small></span></td><td><span className="category-chip">{entry.category || "Geral"}</span></td><td>{module === "insumos" ? <><strong className="stock-number">{entry.amount ?? entry.description.split("•")[0]}</strong><small className="table-sub">{entry.location}</small></> : module === "equipamentos" ? <>{entry.location}<small className="table-sub">{entry.owner}</small></> : entry.owner}</td><td>{module === "compras" ? entry.amount ? `R$ ${entry.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—" : formatDate(entry.due)}</td><td><span className={`status-tag ${statusVariant(entry.status)}`}><i />{entry.status}</span></td><td><button className="row-arrow" onClick={(event) => { event.stopPropagation(); openRecord(entry); }} aria-label="Abrir registro"><ChevronRight size={17} /></button></td></tr>)}</tbody></table>
          {!entries.length && <div className="empty-state"><div className="empty-illustration"><FileText size={25} /></div><h3>Nenhum registro encontrado</h3><p>{search ? "Tente mudar os termos da busca ou os filtros." : "Adicione o primeiro registro deste módulo."}</p>{canCreate && !search && <button className="button button-primary" onClick={openCreate}><Plus size={16} /> Novo registro</button>}</div>}</div>}
      </section>

      {modal && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}><section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="modal-heading"><div><span className="eyebrow">{module === "ocorrencias" ? "NOVA SOLICITAÇÃO" : module === "agenda" ? "SOLICITAÇÃO DE ESPAÇO" : `CADASTRO · ${config.title.toUpperCase()}`}</span><h2 id="form-title">{module === "agenda" ? "Novo evento" : `Novo ${config.singular}`}</h2></div><button className="modal-close" onClick={() => setModal(false)} aria-label="Fechar"><X size={19} /></button></div>
        <form className="module-form" onSubmit={values.handleSubmit(submit, () => setPermTab("general"))}>
          {module === "configuracoes" && <div className="detail-tabs"><button type="button" className={permTab === "general" ? "selected" : ""} onClick={() => setPermTab("general")}>Dados gerais</button><button type="button" className={permTab === "permissions" ? "selected" : ""} onClick={() => setPermTab("permissions")}>Permissões</button></div>}
          {(module !== "configuracoes" || permTab === "general") && config.fields.map((field) => <FormField key={field.key} field={field} form={values} onChange={onFormChange} />)}
          {module === "configuracoes" && permTab === "permissions" && <PermissionsPicker value={permGroups} onChange={setPermGroups} />}
          {module === "ocorrencias" && <SuggestionBlock text={`${values.watch("title") ?? ""} ${values.watch("description") ?? ""}`} />}
          {module === "agenda" && <>
            <div className="form-field"><label htmlFor="upload">Lista de participantes (opcional)</label><label className="file-drop" htmlFor="event-csv"><Upload size={17} /><span><strong>{upload?.name ?? "Anexar lista de participantes"}</strong><small>PDF, Word, Excel, PowerPoint, CSV, imagens e outros · máximo 10 MB</small></span><input id="event-csv" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.odt,.ods,.odp,.rtf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/*" onChange={(event) => setUpload(event.target.files?.[0] ?? null)} /></label><a className="text-link csv-template" href="/modelo-participantes.csv" download><Download size={14} /> Baixar modelo CSV</a></div>
            {agendaConflict && <div className="conflict-warning"><AlertCircle size={17} /><span>{agendaConflict}</span></div>}
            <div className="form-note"><AlertCircle size={15} /><span>{role === "administrador" ? "Como administrador, este evento será confirmado automaticamente." : "Sua solicitação ficará pendente até a aprovação da Administração."}</span></div>
          </>}
          {module === "ocorrencias" && !isVisitor && <div className="form-field"><label htmlFor="occurrence-evidence">Foto ou evidência (opcional)</label><label className="file-drop" htmlFor="occurrence-evidence"><Upload size={17} /><span><strong>{upload?.name ?? "Anexar evidência"}</strong><small>Imagem ou PDF · ficará classificado em Ocorrências</small></span><input id="occurrence-evidence" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setUpload(event.target.files?.[0] ?? null)} /></label></div>}
          {module === "gestaodoc" && <div className="form-field"><label htmlFor="gestaodoc-file">Anexar documento</label><label className="file-drop" htmlFor="gestaodoc-file"><Upload size={17} /><span><strong>{upload?.name ?? "Escolher arquivo"}</strong><small>{upload ? formatFileSize(upload.size) : "PDF, Word, Excel, PowerPoint, CSV, TXT, ODF, RTF ou imagem · máximo 10 MB"}</small></span><input id="gestaodoc-file" type="file" accept={GESTAODOC_ACCEPT} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; const problem = validateGestaoDocFile(file); if (problem) { notify(problem); return; } setUpload(file); }} /></label>{upload && <button type="button" className="text-link" onClick={() => setUpload(null)}><X size={14} /> Remover arquivo</button>}</div>}
          {module === "documentos" && <div className="form-field"><label htmlFor="document-file">Arquivo</label><label className="file-drop" htmlFor="document-file"><Upload size={17} /><span><strong>{upload?.name ?? "Escolher arquivo"}</strong><small>PDF, PNG ou JPG · Supabase Storage quando configurado</small></span><input id="document-file" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setUpload(event.target.files?.[0] ?? null)} /></label></div>}
          <div className="form-actions"><button type="button" className="button button-outline" onClick={() => setModal(false)}>Cancelar</button><button className="button button-dark" type="submit" disabled={values.formState.isSubmitting || !!agendaConflict}>{values.formState.isSubmitting ? "Salvando..." : <>{module === "agenda" ? "Enviar solicitação" : "Salvar registro"} <ArrowRight size={15} /></>}</button></div>
        </form>
      </section></div>}
      {selected && canViewRecord(selected) && <RecordDetail record={selected} onClose={() => setSelected(null)} canEdit={canEditDetails} canDelete={role === "administrador"} statuses={availableStatuses} onUpdate={(updated) => { setSelected({ ...updated, updatedAt: new Date().toISOString() }); void updateRecord(updated); }} onDelete={deleteRecord} />}
    </div>
  );
}

function FormField({ field, form, onChange }: { field: Field; form: UseFormReturn<FormValues, unknown, ParsedFormValues>; onChange: () => void }) {
  const id = `field-${field.key}`;
  const error = form.formState.errors[field.key as keyof FormValues]?.message;
  return <div className="form-field"><label htmlFor={id}>{field.label}{field.required && <span className="required-star"> *</span>}</label>
    {field.kind === "select" ? <select id={id} {...form.register(field.key as keyof FormValues)} onChange={(event) => { form.register(field.key as keyof FormValues).onChange(event); onChange(); }}><option value="">Selecione...</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select>
      : field.kind === "textarea" ? <textarea id={id} rows={3} placeholder={`Descreva ${field.label.toLocaleLowerCase("pt-BR")}...`} {...form.register(field.key as keyof FormValues)} onChange={(event) => { form.register(field.key as keyof FormValues).onChange(event); onChange(); }} />
        : <input id={id} type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"} placeholder={field.kind === "number" ? "0" : `Informe ${field.label.toLocaleLowerCase("pt-BR")}`} {...form.register(field.key as keyof FormValues)} onChange={(event) => { form.register(field.key as keyof FormValues).onChange(event); onChange(); }} />}
    {error && <small className="field-error">{String(error)}</small>}
  </div>;
}

function SuggestionBlock({ text }: { text: string }) {
  const suggestion = suggestOccurrence(text);
  return <div className="suggestion-block"><div className="suggestion-header"><span><Lightbulb size={17} /></span><div><strong>Sugestão inteligente</strong><small>Recomendação automática baseada na descrição</small></div><span className="simulated-badge">SIMULADA</span></div><div className="suggestion-grid"><div><small>PRIORIDADE PROVÁVEL</small><strong>{suggestion.priority}</strong></div><div><small>SETOR RESPONSÁVEL</small><strong>{suggestion.team}</strong></div><div><small>PRAZO RECOMENDADO</small><strong>{suggestion.deadline}</strong></div></div><div className="similar-record"><History size={14} /><span><strong>Ocorrência parecida</strong>{suggestion.similar}</span></div></div>;
}

function AgendaOverview({ records }: { records: HubRecord[] }) {
  const [month, setMonth] = useState(new Date(2026, 9, 1));
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const slots = Array.from({ length: Math.ceil((days + offset) / 7) * 7 }, (_, index) => index - offset + 1);
  const eventDates = new Set(records.filter((item) => item.due).map((item) => item.due));
  const monthName = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return <div className="agenda-overview"><div className="agenda-calendar panel"><div className="calendar-header"><div><span className="eyebrow">CALENDÁRIO DE ESPAÇOS</span><h3>Disponibilidade</h3></div><div className="calendar-switch"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mês anterior"><ChevronLeft size={16} /></button><strong>{monthName}</strong><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Próximo mês"><ChevronRight size={16} /></button></div></div>  <div className="calendar-grid">{labels.map((label) => <span key={label} className="calendar-weekday">{label}</span>)}{slots.map((day, index) => { const dateKey = day > 0 && day <= days ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : ""; const hasEvent = eventDates.has(dateKey); const isToday = dateKey === "2026-10-02"; return <span key={index} className={`calendar-day ${day < 1 || day > days ? "out-month" : ""} ${isToday ? "today" : ""} ${hasEvent ? "has-event" : ""}`}>{day > 0 && day <= days ? day : ""}{hasEvent && <i />}</span>; })}</div><div className="calendar-legend"><span><i className="legend-event" />Com evento</span><span><i className="legend-today" />Hoje</span><span><i className="legend-free" />Disponível</span></div></div><div className="agenda-spaces panel"><div><span className="eyebrow">ESPAÇOS</span><h3>Visão rápida</h3></div>{["Auditório", "Lab Maker", "Sala Criativa", "Coworking", "Hall"].map((name, index) => { const occupied = records.some((item) => item.location === name && item.due === "2026-10-02" && item.status === "Confirmado"); return <div className="space-status" key={name}><span className={`space-color space-${index}`} /><span><strong>{name}</strong><small>{occupied ? "Ocupado hoje" : "Disponível hoje"}</small></span><span className={`space-badge ${occupied ? "occupied" : "available"}`}><i />{occupied ? "Ocupado" : "Livre"}</span></div>; })}<div className="space-note"><span>✳</span> A disponibilidade é atualizada conforme as solicitações aprovadas.</div></div></div>;
}

function EventList({ entries, onSelect }: { entries: HubRecord[]; onSelect: (record: HubRecord) => void }) {
  if (!entries.length) return <div className="empty-state"><div className="empty-illustration"><CalendarDays size={25} /></div><h3>Nenhum evento encontrado</h3><p>Experimente ajustar os filtros.</p></div>;
  return <div className="event-list">{entries.map((event) => <button type="button" className="event-list-item" key={event.id} onClick={() => onSelect(event)}><span className="event-date-tile"><small>{new Date(`${event.due}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase()}</small><strong>{event.due ? event.due.slice(-2) : "—"}</strong></span><span className="event-list-main"><strong>{event.title}</strong><small><MapPin size={13} />{event.location}<i />{event.category}</small></span><span className="event-list-owner">{event.owner}</span><span className={`status-tag ${statusVariant(event.status)}`}><i />{event.status}</span><ChevronRight size={16} /></button>)}</div>;
}

function RecordDetail({ record, onClose, canEdit, canDelete, statuses, onUpdate, onDelete }: { record: HubRecord; onClose: () => void; canEdit: boolean; canDelete: boolean; statuses: string[]; onUpdate: (record: HubRecord) => void; onDelete: (id: string) => void }) {
  const [tab, setTab] = useState<"details" | "history">("details");
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState<"general" | "permissions">("general");
  const [editGroups, setEditGroups] = useState<PermissionGroup[]>(record.allowedRoles ?? []);
  const isConfig = record.module === "configuracoes";
  const { notify } = useHubData();
  const availableStatuses = statuses.includes(record.status) ? statuses : [record.status, ...statuses];
  const form = useForm<FormValues, unknown, ParsedFormValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: { title: record.title, code: record.code, category: record.category, owner: record.owner, location: record.location, due: record.due, description: record.description, priority: record.priority, amount: record.amount },
  });
  function beginEdit() {
    form.reset({ title: record.title, code: record.code, category: record.category, owner: record.owner, location: record.location, due: record.due, description: record.description, priority: record.priority, amount: record.amount });
    setEditGroups(record.allowedRoles ?? []);
    setEditTab("general");
    setEditing(true);
  }
  const fileUrl = record.description.match(/https?:\/\/\S+/)?.[0];
  async function openDocument() {
    if (!fileUrl) return;
    const tabWindow = window.open("about:blank", "_blank");
    if (tabWindow) tabWindow.opener = null;
    let target = fileUrl;
    const storagePath = fileUrl.match(/\/object\/sign\/hub-files\/([^?]+)/)?.[1];
    const supabase = createClient();
    if (storagePath && supabase) {
      const { data } = await supabase.storage.from("hub-files").createSignedUrl(decodeURIComponent(storagePath), 3600);
      if (data?.signedUrl) target = data.signedUrl;
    }
    if (tabWindow) tabWindow.location.href = target; else window.open(target, "_blank", "noopener,noreferrer");
  }
  return <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="detail-modal" role="dialog" aria-modal="true" aria-label={record.title}><div className="detail-top"><span className="detail-code">{record.code}</span><button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={19} /></button></div><h2>{record.title}</h2><div className="detail-badges"><span className={`status-tag ${statusVariant(record.status)}`}><i />{record.status}</span><span className="category-chip">{record.category}</span></div><div className="detail-tabs"><button className={tab === "details" ? "selected" : ""} onClick={() => setTab("details")}>Informações</button><button className={tab === "history" ? "selected" : ""} onClick={() => setTab("history")}><History size={14} /> Histórico</button></div>
    {tab === "details" ? editing ? <form className="module-form detail-edit-form" onSubmit={form.handleSubmit((values) => {
      if (isConfig && editGroups.length === 0) { setEditTab("permissions"); notify("Selecione pelo menos um perfil na aba Permissões."); return; }
      const sameGroups = editGroups.length === (record.allowedRoles?.length ?? -1) && editGroups.every((group) => record.allowedRoles?.includes(group));
      onUpdate({ ...record, ...values, amount: values.amount, category: values.category ?? record.category, owner: values.owner ?? record.owner, location: values.location ?? record.location, due: values.due ?? record.due, description: values.description ?? record.description, priority: values.priority ?? record.priority, ...(isConfig ? { allowedRoles: sameGroups ? record.allowedRoles : editGroups } : {}) }); setEditing(false);
    }, () => setEditTab("general"))}>
      {isConfig && <div className="detail-tabs"><button type="button" className={editTab === "general" ? "selected" : ""} onClick={() => setEditTab("general")}>Dados gerais</button><button type="button" className={editTab === "permissions" ? "selected" : ""} onClick={() => setEditTab("permissions")}>Permissões</button></div>}
      {(!isConfig || editTab === "general") && moduleConfig[record.module].fields.map((field) => <FormField field={field} form={form} onChange={() => undefined} key={field.key} />)}
      {isConfig && editTab === "permissions" && <PermissionsPicker value={editGroups} onChange={setEditGroups} />}
      <div className="form-actions"><button type="button" className="button button-outline" onClick={() => setEditing(false)}>Cancelar</button><button className="button button-dark" type="submit"><Check size={15} /> Salvar alterações</button></div>
    </form> : <div className="detail-content">{[
      ["Responsável", record.owner], ["Local / espaço", record.location], ["Data / prazo", formatDate(record.due)], ["Prioridade", record.priority || "—"], ["Valor", record.amount ? `R$ ${record.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"], ["Descrição", record.description || "Sem descrição."],
            ...(isConfig ? [["Permissões", permissionsLabel(record.allowedRoles)]] : []),
          ].map(([label, value]) => <div key={label} className="detail-field"><small>{label}</small><p>{value}</p></div>)}
      {(record.module === "agenda" || record.module === "gestaodoc") && fileUrl && <button type="button" className="button button-outline" onClick={() => void openDocument()}><FileText size={15} /> Visualizar documento</button>}
      {record.module !== "agenda" && record.module !== "gestaodoc" && record.description.match(/https?:\/\/\S+/) && <a href={record.description.match(/https?:\/\/\S+/)?.[0]} target="_blank" rel="noreferrer" className="text-link">Abrir arquivo <ArrowRight size={14} /></a>}
      {(canEdit || canDelete || statuses.length > 0) && <div className="detail-actions">{canEdit && <button className="button button-outline" onClick={beginEdit}>Editar informações</button>}{statuses.length > 0 && <label className="status-edit">Alterar status<select value={record.status} onChange={(event) => onUpdate({ ...record, status: event.target.value })}>{availableStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>}{canDelete && <button className="button button-danger-ghost" onClick={() => { onDelete(record.id); onClose(); }}><X size={15} /> Remover</button>}</div>}</div>
      : <div className="detail-timeline">{(record.history?.length ? record.history : [
        { action: "Registro criado", actor: record.owner, at: record.createdAt || record.updatedAt, details: `Código ${record.code}` },
        { action: "Última atualização", actor: record.owner, at: record.updatedAt, details: `Status: ${record.status}` },
      ]).slice().reverse().map((entry, index) => <div className="timeline-entry" key={`${entry.action}-${entry.at}-${index}`}><span className={`timeline-dot ${index ? "timeline-blue" : "timeline-orange"}`}>{index ? <Plus size={12} /> : <History size={12} />}</span><div><strong>{entry.action}</strong><p>{entry.details} · {entry.actor}</p><small>{new Date(entry.at).toLocaleString("pt-BR")}</small></div></div>)}</div>}
    <div className="detail-footer"><span><span className="timeline-mini" />Trilha de atividade do HubCentral</span><button onClick={onClose}>Concluído</button></div></section></div>;
}

function Reports() {
  const { records, notify } = useHubData();
  const occurrences = records.filter((item) => item.module === "ocorrencias");
  const compras = records.filter((item) => item.module === "compras");
  const supplies = records.filter((item) => item.module === "insumos");
  const events = records.filter((item) => item.module === "agenda");
  const expiring = records.filter((item) => item.module === "documentos" && ["Vencido", "Vencendo"].includes(item.status));
  const categoryData = [...new Set(occurrences.map((item) => item.category))].map((category, index) => ({ category, quantidade: occurrences.filter((item) => item.category === category).length, fill: ["#0057b8", "#ff6b1a", "#00a86b", "#e83e8c", "#35bceb", "#ffd23f"][index % 6] }));
  function exportCsv() {
    const rows = [["Módulo", "Código", "Registro", "Status", "Categoria", "Responsável"], ...records.map((item) => [item.module, item.code, item.title, item.status, item.category, item.owner])];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "hubcentral-relatorio.csv"; anchor.click(); URL.revokeObjectURL(url); notify("Relatório CSV exportado.");
  }
  return <div className="module-page reports-page"><div className="page-heading module-heading"><div><div className="eyebrow">INTELIGÊNCIA DE GESTÃO <span className="heading-spark">✳</span></div><h1>Relatórios</h1><p>Indicadores para uma gestão mais informada do HUB ES+.</p></div><button className="button button-dark" onClick={exportCsv}><Download size={16} /> Exportar CSV</button></div>
    <div className="reports-kpis"><ReportKpi label="Ocorrências registradas" value={String(occurrences.length).padStart(2, "0")} variation="no período demonstrativo" tone="blue" /><ReportKpi label="Compras em andamento" value={String(compras.filter((item) => !["Concluída", "Cancelada"].includes(item.status)).length).padStart(2, "0")} variation="solicitações ativas" tone="orange" /><ReportKpi label="Itens com estoque baixo" value={String(supplies.filter((item) => item.status === "Estoque baixo").length).padStart(2, "0")} variation="requerem reposição" tone="red" /><ReportKpi label="Documentos a revisar" value={String(expiring.length).padStart(2, "0")} variation="vencidos ou vencendo" tone="green" /></div>
    <div className="reports-grid"><section className="panel report-chart-panel"><div className="panel-heading"><div><span className="eyebrow">OPERAÇÃO</span><h3>Ocorrências por categoria</h3><p>Distribuição das demandas registradas</p></div></div><div className="horizontal-bars">{categoryData.map((item) => <div className="horizontal-bar-row" key={item.category}><span>{item.category}</span><div><i style={{ width: `${Math.max(10, item.quantidade / Math.max(1, occurrences.length) * 100)}%`, background: item.fill }} /></div><strong>{String(item.quantidade).padStart(2, "0")}</strong></div>)}</div></section>
      <section className="panel report-chart-panel"><div className="panel-heading"><div><span className="eyebrow">ESPAÇOS</span><h3>Eventos por espaço</h3><p>Solicitações e eventos cadastrados</p></div></div><div className="space-report-list">{["Auditório", "Lab Maker", "Sala Criativa", "Coworking", "Hall", "Espaço Multiuso"].map((space, index) => <div className="space-report-row" key={space}><span className={`space-color space-${index % 5}`} /><span>{space}</span><strong>{String(events.filter((event) => event.location === space).length).padStart(2, "0")}</strong></div>)}</div></section>
      <section className="panel report-chart-panel"><div className="panel-heading"><div><span className="eyebrow">COMPRAS</span><h3>Fluxo de solicitações</h3></div></div><div className="purchase-flow">{["Solicitada", "Aguardando aprovação", "Em cotação", "Concluída"].map((status, index) => <div className="flow-step" key={status}><span className={`flow-number flow-${index}`}>{String(compras.filter((item) => item.status === status).length).padStart(2, "0")}</span><span>{status}</span>{index < 3 && <ArrowRight size={14} />}</div>)}</div></section>
      <section className="panel report-chart-panel"><div className="panel-heading"><div><span className="eyebrow">ATENÇÃO</span><h3>Documentos e estoque</h3></div></div><div className="report-alerts">{expiring.map((item) => <div className="report-alert-row" key={item.id}><FileText size={16} /><span><strong>{item.title}</strong><small>{item.status} · {formatDate(item.due)}</small></span></div>)}{supplies.filter((item) => item.status === "Estoque baixo").map((item) => <div className="report-alert-row stock" key={item.id}><AlertCircle size={16} /><span><strong>{item.title}</strong><small>{item.description} · estoque baixo</small></span></div>)}{!expiring.length && !supplies.some((item) => item.status === "Estoque baixo") && <div className="empty-inline">Nenhum alerta.</div>}</div></section></div></div>;
}
function ReportKpi({ label, value, variation, tone }: { label: string; value: string; variation: string; tone: string }) {
  return <div className={`report-kpi report-${tone}`}><span>{label}</span><strong>{value}</strong><small>{variation}</small><ArrowUpRight size={17} /></div>;
}
function AccessPanel() { return <div className="access-denied"><AlertCircle size={37} /><h2>Acesso não autorizado</h2><p>Este módulo é restrito ao seu perfil. Se precisar de acesso, procure o Administrador do sistema.</p></div>; }
function NotFoundModule() { return <div className="access-denied"><FileText size={35} /><h2>Página não encontrada</h2><p>O módulo solicitado não existe.</p><Link className="button button-primary" href="/dashboard">Voltar à visão geral</Link></div>; }
