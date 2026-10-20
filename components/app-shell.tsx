"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, Bell, BriefcaseBusiness, Boxes, CalendarDays, ChartNoAxesColumn,
  ChevronDown, FileText, LayoutDashboard, LogOut, Menu, Monitor, Search,
  Settings2, ShieldCheck, ShoppingCart, Sparkles, Wrench, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { VisitorWelcome } from "@/components/visitor-welcome";
import { HubRecord, ModuleKey, moduleConfig, seedRecords } from "@/lib/data";

type UserSession = { name: string; email: string; role: string };
type HubNotification = { id: string; title: string; message: string; link: string; read: boolean; createdAt: string };
type HubContextValue = {
  records: HubRecord[];
  addRecord: (record: Omit<HubRecord, "id" | "createdAt" | "updatedAt" | "history" | "code"> & { code?: string }) => Promise<HubRecord | null>;
  updateRecord: (record: HubRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  session: UserSession | null;
  notifications: HubNotification[];
  markNotificationsRead: () => Promise<void>;
  toast: string;
  notify: (message: string) => void;
};
const HubContext = createContext<HubContextValue | null>(null);
export function useHubData() {
  const value = useContext(HubContext);
  if (!value) throw new Error("useHubData deve ser usado dentro de AppShell.");
  return value;
}

const navItems: { href: string; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard, group: "PRINCIPAL" },
  { href: "/ocorrencias", label: "Ocorrências", icon: Wrench, group: "OPERAÇÃO" },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, group: "OPERAÇÃO" },
  { href: "/insumos", label: "Insumos", icon: Boxes, group: "OPERAÇÃO" },
  { href: "/equipamentos", label: "Equipamentos", icon: Monitor, group: "OPERAÇÃO" },
  { href: "/documentos", label: "Documentos", icon: FileText, group: "GESTÃO" },
  { href: "/gestaodoc", label: "Gestão documental", icon: Archive, group: "GESTÃO" },
  { href: "/contratos", label: "Contratos", icon: BriefcaseBusiness, group: "GESTÃO" },
  { href: "/compras", label: "Compras", icon: ShoppingCart, group: "GESTÃO" },
  { href: "/relatorios", label: "Relatórios", icon: ChartNoAxesColumn, group: "GESTÃO" },
  { href: "/configuracoes", label: "Configurações", icon: Settings2, group: "SISTEMA" },
];

const visitorRoutes = ["/agenda", "/ocorrencias"];

function initialRecords(): HubRecord[] {
  try {
    const stored = localStorage.getItem("hubcentral-records");
    return stored ? JSON.parse(stored) as HubRecord[] : seedRecords;
  } catch (error) {
    console.error("Não foi possível ler os registros locais. A demonstração será reinicializada.", error);
    localStorage.removeItem("hubcentral-records");
    return seedRecords;
  }
}
function initialNotifications(): HubNotification[] {
  try {
    const stored = localStorage.getItem("hubcentral-notifications");
    return stored ? JSON.parse(stored) as HubNotification[] : [
      { id: "demo-stock", title: "Estoque abaixo do mínimo", message: "Papel toalha · agora", link: "/insumos", read: false, createdAt: new Date().toISOString() },
      { id: "demo-event", title: "Nova solicitação de agenda", message: "Sala Criativa · há 18 min", link: "/agenda", read: false, createdAt: new Date().toISOString() },
      { id: "demo-occurrence", title: "Ocorrência atualizada", message: "Projetor do auditório · há 1 h", link: "/ocorrencias", read: false, createdAt: new Date().toISOString() },
    ];
  } catch (error) {
    console.error("Não foi possível ler as notificações locais.", error);
    localStorage.removeItem("hubcentral-notifications");
    return [];
  }
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [records, setRecords] = useState<HubRecord[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [saveError, setSaveError] = useState("");
  const [notifications, setNotifications] = useState<HubNotification[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedSession = localStorage.getItem("hubcentral-session");
    if (!storedSession) {
      router.replace("/login");
      return;
    }
    try { setSession(JSON.parse(storedSession) as UserSession); }
    catch { localStorage.removeItem("hubcentral-session"); router.replace("/login"); return; }
    const localRecords = initialRecords();
    setRecords(localRecords);
    const localNotifications = initialNotifications();
    setNotifications(localNotifications);
    const supabase = createClient();
    if (supabase) {
      supabase.from("demo_records").select("id,module,code,payload,updated_at,created_by").then(({ data, error }) => {
        if (data?.length) {
          const remote = data.map((row) => ({ ...(row.payload as HubRecord), id: row.id, module: row.module as ModuleKey, code: row.code, createdBy: row.created_by ?? undefined, createdAt: row.payload?.createdAt ?? row.updated_at, updatedAt: row.updated_at }));
          setRecords(remote);
          localStorage.setItem("hubcentral-records", JSON.stringify(remote));
        } else if (error) {
          setToast(`Banco indisponível: ${error.message}. Exibindo dados de demonstração.`);
        }
      });
      supabase.from("notifications").select("id,title,message,link,read_at,created_at").order("created_at", { ascending: false }).limit(30).then(({ data, error }) => {
        if (error) { setToast(`Notificações indisponíveis: ${error.message}`); return; }
        if (data?.length) {
          const remote = data.map((item) => ({ id: item.id, title: item.title, message: item.message, link: item.link ?? "/dashboard", read: !!item.read_at, createdAt: item.created_at }));
          setNotifications(remote);
          localStorage.setItem("hubcentral-notifications", JSON.stringify(remote));
        }
      });
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase || !session) return;
    const channel = supabase.channel("hubcentral-notifications").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
      const row = payload.new as { id: string; title: string; message: string; link: string | null; created_at: string };
      const notification = { id: row.id, title: row.title, message: row.message, link: row.link ?? "/dashboard", read: false, createdAt: row.created_at };
      setNotifications((current) => {
        const next = [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 30);
        localStorage.setItem("hubcentral-notifications", JSON.stringify(next));
        return next;
      });
      setToast(row.title);
    }).subscribe((status, error) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setToast(`Notificações em tempo real indisponíveis: ${error?.message ?? status}`);
    });
    return () => { void supabase.removeChannel(channel); };
  }, [session]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase("pt-BR") === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function persist(next: HubRecord[]) {
    setRecords(next);
    localStorage.setItem("hubcentral-records", JSON.stringify(next));
  }

  async function addRecord(input: Omit<HubRecord, "id" | "createdAt" | "updatedAt" | "history" | "code"> & { code?: string }): Promise<HubRecord | null> {
    const seq = String(records.filter((r) => r.module === input.module).length + 1).padStart(3, "0");
    const code = input.code || `${input.module.slice(0, 3).toUpperCase()}-${seq}`;
    const now = new Date().toISOString();
    const record: HubRecord = {
      ...input, id: crypto.randomUUID(), code, createdAt: now, updatedAt: now,
      history: [{ action: "Registro criado", actor: input.owner || session?.name || "Equipe HUB ES+", at: now, details: `Código ${code}` }],
    };
    const next = [record, ...records];
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from("demo_records").insert({
        id: record.id, module: record.module, code, title: record.title, status: record.status,
        payload: record, created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) {
        setSaveError(`Não foi possível salvar no servidor (${error.message}). O registro não foi criado nem mantido neste navegador; ele não está disponível para outros usuários. Tente novamente.`);
        return null;
      }
    }
    persist(next);
    if (!supabase && record.module === "agenda") addLocalNotification("Nova solicitação de agenda", `${record.title} · ${record.location}`, "/agenda");
    if (!supabase && record.module === "insumos" && record.status === "Estoque baixo") addLocalNotification("Estoque abaixo do mínimo", record.title, "/insumos");
    const successMessage: Record<ModuleKey, string> = {
      ocorrencias: "Ocorrência registrada com sucesso.",
      agenda: "Solicitação de agenda enviada com sucesso.",
      documentos: "Documento registrado com sucesso.",
      insumos: "Item de estoque registrado com sucesso.",
      compras: "Solicitação de compra registrada com sucesso.",
      equipamentos: "Equipamento registrado com sucesso.",
      relatorios: "Relatório atualizado.",
      configuracoes: "Configuração salva com sucesso.",
      gestaodoc: "Documento registrado com sucesso.",
      contratos: "Contrato registrado com sucesso.",
    };
    notify(successMessage[record.module]);
    return record;
  }

  async function updateRecord(record: HubRecord) {
    const previous = records.find((item) => item.id === record.id);
    const now = new Date().toISOString();
    const changed = previous ? Object.keys(record).filter((key) => !["updatedAt", "history"].includes(key) && record[key as keyof HubRecord] !== previous[key as keyof HubRecord]) : [];
    const action = changed.includes("status") ? "Status atualizado" : changed.includes("location") ? "Movimentação de patrimônio" : "Registro atualizado";
    const updated = { ...record, updatedAt: now, history: [...(previous?.history ?? record.history ?? []), { action, actor: session?.name ?? "Equipe HUB ES+", at: now, details: changed.length ? `Campos: ${changed.join(", ")}` : "Informações revisadas" }] };
    persist(records.map((item) => item.id === record.id ? updated : item));
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from("demo_records").update({
        code: updated.code, title: updated.title, status: updated.status, payload: updated, updated_at: updated.updatedAt,
      }).eq("id", updated.id);
      if (error) { notify(`Alteração local salva; falha ao sincronizar: ${error.message}`); return; }
    }
    if (!supabase && record.module === "agenda" && previous?.status !== record.status) addLocalNotification("Agenda atualizada", `${record.title} · ${record.status}`, "/agenda");
    if (!supabase && record.module === "equipamentos" && previous?.location !== record.location) addLocalNotification("Movimentação de patrimônio", `${record.title} · ${record.location}`, "/equipamentos");
    notify("Registro atualizado.");
  }

  async function deleteRecord(id: string) {
    persist(records.filter((item) => item.id !== id));
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from("demo_records").delete().eq("id", id);
      if (error) { notify(`Removido da demonstração; falha ao sincronizar: ${error.message}`); return; }
    }
    notify("Registro removido.");
  }

  function notify(message: string) { setToast(message); }
  function addLocalNotification(title: string, message: string, link: string) {
    const item: HubNotification = { id: `demo-${crypto.randomUUID()}`, title, message, link, read: false, createdAt: new Date().toISOString() };
    setNotifications((current) => {
      const next = [item, ...current].slice(0, 30);
      localStorage.setItem("hubcentral-notifications", JSON.stringify(next));
      return next;
    });
  }
  async function markNotificationsRead() {
    setNotifications((current) => {
      const next = current.map((item) => ({ ...item, read: true }));
      localStorage.setItem("hubcentral-notifications", JSON.stringify(next));
      return next;
    });
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
      if (error) notify(`Não foi possível atualizar as notificações: ${error.message}`);
    }
  }
  const isVisitor = session?.role?.toLocaleLowerCase("pt-BR") === "visitante";
  useEffect(() => { if (isVisitor && pathname === "/dashboard") router.replace("/agenda"); }, [isVisitor, pathname, router]);
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return records.filter((record) => `${record.title} ${record.code} ${record.category}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))).slice(0, 6);
  }, [records, search]);
  const groups = [...new Set(navItems.map((item) => item.group))];

  if (!ready || !session) return <div className="boot-screen"><span className="brand-symbol">+</span><span>Preparando o HubCentral...</span></div>;

  return (
    <HubContext.Provider value={{ records, addRecord, updateRecord, deleteRecord, session, notifications, markNotificationsRead, toast, notify }}>
      <div className="app-shell">
        {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />}
        <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
          <Link href="/dashboard" className="brand-lockup" onClick={() => setMobileOpen(false)}>
            <span className="brand-symbol">+</span><span className="brand-name">HUB ES<span className="brand-plus">+</span><small>GESTÃO INTEGRADA</small></span>
          </Link>
          <div className="sidebar-rule" />
          {!isVisitor && <div className="workspace-select"><div className="workspace-avatar">H</div><div><strong>Hub ES+</strong><small>Espaço de trabalho</small></div><ChevronDown size={15} /></div>}
          <nav className="side-nav">
            {groups.filter((group) => !isVisitor || navItems.some((item) => item.group === group && visitorRoutes.includes(item.href))).map((group) => <div key={group} className="nav-group">{!isVisitor && <div className="nav-heading">{group}</div>}
              {navItems.filter((item) => item.group === group && (!isVisitor || visitorRoutes.includes(item.href))).map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`nav-link ${pathname === href ? "active" : ""}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === "Ocorrências" && <span className="nav-count">3</span>}</Link>
              ))}
            </div>)}
          </nav>
          <button className="profile-switch" onClick={() => setProfileOpen(!profileOpen)}><span className="avatar">{session.name.slice(0, 1).toLocaleUpperCase("pt-BR")}</span><span className="profile-text"><strong>{session.name}</strong><small>{session.role}</small></span><ChevronDown size={15} /></button>
          {profileOpen && <div className="profile-popover"><button onClick={() => { localStorage.removeItem("hubcentral-session"); createClient()?.auth.signOut(); router.replace("/login"); }}><LogOut size={16} /> Sair da conta</button></div>}
        </aside>
        <div className="app-main">
          <header className="topbar">
            <button className="mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
            <div className="breadcrumb"><span>Hub ES+</span><span className="breadcrumb-slash">/</span><strong>{pathname === "/dashboard" ? "Visão geral" : moduleConfig[(pathname.slice(1) in moduleConfig ? pathname.slice(1) : "dashboard") as ModuleKey]?.title || "HubCentral"}</strong></div>
            <div className="topbar-actions">
              <div className="global-search"><Search size={17} /><input ref={searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar em tudo..." aria-label="Busca global" /><kbd>⌘ K</kbd>
                {!!search && <div className="search-results">{searchResults.length ? searchResults.map((record) => <Link key={record.id} href={`/${record.module}`} onClick={() => setSearch("")}><span className="search-result-icon"><FileText size={16} /></span><span><strong>{record.title}</strong><small>{record.code} · {record.category}</small></span><span>↗</span></Link>) : <div className="search-empty">Nenhum registro encontrado</div>}</div>}
              </div>
              {!isVisitor && <div className="notification-wrap"><button className={`top-icon-button ${showNotifications ? "selected" : ""}`} onClick={() => setShowNotifications(!showNotifications)} aria-label="Notificações"><Bell size={19} />{notifications.some((item) => !item.read) && <i />}</button>
                {showNotifications && <NotificationPopover notifications={notifications} onRead={markNotificationsRead} onClose={() => setShowNotifications(false)} />}
              </div>}
             <div className="topbar-divider" />
              <span className="topbar-date">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </span>
              <span className="avatar topbar-avatar">{session.name.slice(0, 1).toLocaleUpperCase("pt-BR")}</span>

            </div>
          </header>
          <main className="page-main" key={pathname}>{isVisitor && !visitorRoutes.includes(pathname) ? <div className="access-denied"><ShieldCheck size={38} /><h2>Acesso restrito</h2><p>Seu perfil de visitante permite acessar a agenda e as ocorrências.</p><Link className="button button-primary" href="/agenda">Ir para a agenda</Link></div> : <>{isVisitor && pathname === "/agenda" && <VisitorWelcome records={records} />}{children}</>}</main>
          <footer className="app-footer"><span><span className="footer-spark">✳</span> HUB ES+ <span className="footer-dot">·</span> GESTÃO INTEGRADA</span><span>Construído para conectar ideias e transformar espaços.</span></footer>
        </div>
        {saveError && <div className="toast" role="alert" style={{ bottom: toast ? 84 : undefined, background: "#a8321f" }}><span className="toast-check">!</span>{saveError}<button onClick={() => setSaveError("")} aria-label="Fechar aviso"><X size={15} /></button></div>}
        {toast && <div className="toast"><span className="toast-check">✓</span>{toast}<button onClick={() => setToast("")} aria-label="Fechar aviso"><X size={15} /></button></div>}
      </div>
    </HubContext.Provider>
  );
}

function NotificationPopover({ notifications, onRead, onClose }: { notifications: HubNotification[]; onRead: () => void; onClose: () => void }) {
  return <div className="notification-popover"><div className="popover-title"><strong>Notificações</strong><span>{notifications.filter((item) => !item.read).length} novas</span></div>
    <div className="notification-list">{notifications.length ? notifications.slice(0, 5).map((item) => <Link className="notification-item" key={item.id} href={item.link} onClick={() => { void onRead(); onClose(); }}><span className={`notification-dot ${item.title.toLocaleLowerCase("pt-BR").includes("estoque") ? "red" : item.title.toLocaleLowerCase("pt-BR").includes("agenda") ? "yellow" : "blue"}`} /><span><strong>{item.title}</strong><small>{item.message}</small></span></Link>) : <div className="search-empty">Você está em dia por aqui.</div>}</div>
    <button className="notification-footer" onClick={() => { void onRead(); onClose(); }}>Marcar todas como lidas <span>✓</span></button></div>;
}
