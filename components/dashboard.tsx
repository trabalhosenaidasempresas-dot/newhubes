"use client";

import Link from "next/link";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, ChevronRight, CircleAlert,
  Clock3, FileText, Plus, ShoppingCart, Sparkles, TrendingUp, Wrench,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useHubData } from "@/components/app-shell";
import { HubRecord } from "@/lib/data";

const statusColors: Record<string, string> = {
  "Em execução": "#0057b8", "Em análise": "#e9a51a", "Aberta": "#ef4e36", "Resolvida": "#00a86b", "Cancelada": "#9ba4ae",
};
const monthData = [
  { month: "MAI", events: 18 }, { month: "JUN", events: 24 }, { month: "JUL", events: 21 },
  { month: "AGO", events: 32 }, { month: "SET", events: 27 }, { month: "OUT", events: 36 },
];
function countStatus(records: HubRecord[], module: HubRecord["module"], status: string) {
  return records.filter((item) => item.module === module && item.status.toLocaleLowerCase("pt-BR").includes(status.toLocaleLowerCase("pt-BR"))).length;
}
function StatusTag({ children }: { children: string }) {
  const key = children.toLowerCase();
  const variant = key.includes("resol") || key.includes("confirm") || key.includes("conclu") || key.includes("estoque") || key.includes("ativo") ? "green"
    : key.includes("crít") || key.includes("baixo") || key.includes("vencid") || key.includes("aberta") ? "red"
      : key.includes("análise") || key.includes("aguard") || key.includes("vencendo") || key.includes("cotação") ? "yellow" : "blue";
  return <span className={`status-tag ${variant}`}><i />{children}</span>;
}

export function Dashboard() {
  const { records, session } = useHubData();
  const occurrences = records.filter((record) => record.module === "ocorrencias");
  const openOccurrences = occurrences.filter((record) => !["Resolvida", "Cancelada"].includes(record.status));
  const criticalStock = records.filter((record) => record.module === "insumos" && record.status === "Estoque baixo");
  const pendingPurchases = records.filter((record) => record.module === "compras" && !["Concluída", "Cancelada"].includes(record.status));
  const documents = records.filter((record) => record.module === "documentos").slice(0, 3);
  const events = records.filter((record) => record.module === "agenda" && record.due === "2026-10-02");
  const attention: { icon: typeof CircleAlert; color: string; title: string; subtitle: string; href: string }[] = [
    ...criticalStock.map((item) => ({ icon: CircleAlert, color: "red", title: `Estoque crítico: ${item.title}`, subtitle: `${item.amount ?? item.description.split("•")[0]} · ${item.location}`, href: "/insumos" })),
    ...openOccurrences.filter((item) => item.priority === "Crítica").map((item) => ({ icon: Wrench, color: "orange", title: `Ocorrência crítica: ${item.title}`, subtitle: `${item.code} · ${item.location}`, href: "/ocorrencias" })),
    ...records.filter((item) => item.module === "documentos" && item.status === "Vencendo").map((item) => ({ icon: FileText, color: "yellow", title: `Documento vencendo: ${item.title}`, subtitle: `Validade em ${new Date(`${item.due}T12:00:00`).toLocaleDateString("pt-BR")}`, href: "/documentos" })),
  ];
  const pieData = ["Aberta", "Em análise", "Em execução", "Resolvida"].map((status) => ({ name: status, value: countStatus(records, "ocorrencias", status), color: statusColors[status] }));

  return (
    <div className="dashboard-page">
      <div className="welcome-banner">
        <div className="welcome-copy"><div className="welcome-date"><span className="date-sun">✳</span> </div><h1>Olá, {session?.name.split(" ")[0] ?? "equipe"} <span>✳</span></h1><p>Acompanhe o que acontece no HUB ES+ hoje.</p></div>
        <div className="welcome-art"><div className="art-ring ring-a" /><div className="art-ring ring-b" /><div className="art-circle"><Sparkles size={31} /></div><span className="art-star">✳</span><span className="art-dot" /></div>
        <span className="banner-index">01 <i /> 04</span>
      </div>

      <div className="page-heading dashboard-heading"><div><div className="eyebrow">CENTRAL DE OPERAÇÕES <span className="heading-spark">✳</span></div><h2>Visão geral</h2><p>O essencial para manter tudo em movimento.</p></div><Link className="button button-dark" href="/ocorrencias"><Plus size={17} /> Nova ocorrência</Link></div>

      <section className="metrics-grid" aria-label="Indicadores principais">
        <MetricCard label="Ocorrências abertas" value={String(openOccurrences.length).padStart(2, "0")} note="Demandas em andamento" icon={Wrench} tone="blue" trend="+2 esta semana" href="/ocorrencias" />
        <MetricCard label="Eventos hoje" value={String(events.length).padStart(2, "0")} note="Na agenda do HUB ES+" icon={CalendarDays} tone="orange" trend={`${records.filter((r) => r.module === "agenda").length} no mês`} href="/agenda" />
        <MetricCard label="Compras pendentes" value={String(pendingPurchases.length).padStart(2, "0")} note="Aguardam próxima etapa" icon={ShoppingCart} tone="green" trend="1 precisa de aprovação" href="/compras" />
        <MetricCard label="Alertas de estoque" value={String(criticalStock.length).padStart(2, "0")} note="Abaixo do mínimo definido" icon={CircleAlert} tone="pink" trend="Verificar reposição" href="/insumos" />
      </section>

      <div className="dashboard-content-grid">
        <section className="panel chart-panel">
          <div className="panel-heading"><div><span className="eyebrow">ACOMPANHAMENTO</span><h3>Ocorrências</h3><p>Distribuição por status</p></div><Link href="/ocorrencias" className="text-link">Ver todas <ArrowRight size={14} /></Link></div>
          <div className="occurrence-chart-wrap">
            <div className="pie-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={59} outerRadius={79} paddingAngle={4} stroke="none">{pieData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => [`${value} ocorrência(s)`, ""]} /></PieChart></ResponsiveContainer><div className="pie-center"><strong>{occurrences.length}</strong><span>TOTAL</span></div></div>
            <div className="chart-legend">{pieData.map((item) => <div key={item.name}><span className="legend-dot" style={{ background: item.color }} /><span>{item.name}</span><strong>{String(item.value).padStart(2, "0")}</strong></div>)}</div>
          </div>
          <div className="chart-bottom-note"><TrendingUp size={15} /><span><strong>Ritmo positivo.</strong> 1 ocorrência resolvida nos últimos 7 dias.</span></div>
        </section>
        <section className="panel events-chart-panel">
          <div className="panel-heading"><div><span className="eyebrow">ATIVIDADE</span><h3>Eventos no HUB</h3><p>Eventos realizados por mês</p></div><button className="select-like">Últimos 6 meses <ChevronRight size={14} /></button></div>
          <div className="area-chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthData} margin={{ top: 10, right: 7, left: -20, bottom: 0 }}><defs><linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6b1a" stopOpacity={0.2} /><stop offset="95%" stopColor="#ff6b1a" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#ece9e2" strokeDasharray="3 4" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9ba4ae", fontSize: 10, fontWeight: 650 }} dy={12} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ba4ae", fontSize: 10 }} /><Tooltip contentStyle={{ border: "1px solid #eeeae1", borderRadius: 12, boxShadow: "0 8px 24px #182b3c12" }} /><Area type="monotone" dataKey="events" stroke="#ff6b1a" strokeWidth={2.5} fill="url(#eventGradient)" activeDot={{ r: 5, fill: "#ff6b1a", stroke: "#fff", strokeWidth: 3 }} /></AreaChart></ResponsiveContainer></div>
          <div className="area-summary"><span><i /> EVENTOS REALIZADOS</span><strong>158 <small>no semestre</small></strong><span className="growth-pill"><ArrowUpRight size={13} /> 18,4%</span></div>
        </section>
      </div>

      <div className="dashboard-lower-grid">
        <section className="panel table-panel">
          <div className="panel-heading"><div><span className="eyebrow">PRECISAM DE ACOMPANHAMENTO</span><h3>Ocorrências recentes</h3></div><Link href="/ocorrencias" className="text-link">Ver todas <ArrowRight size={14} /></Link></div>
          <div className="table-scroll"><table className="data-table"><thead><tr><th>DEMANDA</th><th>LOCAL</th><th>PRIORIDADE</th><th>STATUS</th></tr></thead><tbody>{occurrences.slice(0, 4).map((item) => <tr key={item.id}><td><Link href="/ocorrencias" className="table-primary">{item.title}<small>{item.code}</small></Link></td><td>{item.location}</td><td><PriorityTag value={item.priority || "Média"} /></td><td><StatusTag>{item.status}</StatusTag></td></tr>)}</tbody></table></div>
          <Link href="/ocorrencias" className="table-bottom-link">Acessar central de ocorrências <ArrowRight size={14} /></Link>
        </section>
        <section className="panel attention-panel">
          <div className="panel-heading"><div><span className="eyebrow">VISÃO DO GESTOR</span><h3>Atenção necessária <span className="attention-count">{attention.length}</span></h3><p>Pontos que precisam de uma ação.</p></div><span className="attention-spark">✳</span></div>
          <div className="attention-list">{attention.length ? attention.slice(0, 4).map((item, index) => <Link href={item.href} className="attention-item" key={`${item.title}-${index}`}><span className={`attention-icon ${item.color}`}><item.icon size={16} /></span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><ChevronRight size={16} /></Link>) : <div className="empty-inline">Tudo em dia por aqui ✳</div>}</div>
          <Link href="/relatorios" className="attention-footer">Ver painel de indicadores <ArrowRight size={14} /></Link>
        </section>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="panel documents-panel"><div className="panel-heading"><div><span className="eyebrow">CENTRAL DE ARQUIVOS</span><h3>Documentos recentes</h3></div><Link href="/documentos" className="text-link">Biblioteca <ArrowRight size={14} /></Link></div>
          <div className="recent-document-list">{documents.map((doc, index) => <Link href="/documentos" key={doc.id} className="recent-document"><span className={`document-file-icon file-${index}`}><FileText size={18} /></span><span className="document-meta"><strong>{doc.title}</strong><small>{doc.category} <i /> {doc.code}</small></span><StatusTag>{doc.status}</StatusTag><ChevronRight className="doc-chevron" size={15} /></Link>)}</div>
        </section>
        <section className="panel today-panel"><div className="today-panel-head"><span className="eyebrow">AGENDA DE HOJE</span><Link href="/agenda" className="text-link">Abrir agenda <ArrowRight size={14} /></Link></div><h3>Seu dia em movimento<span>✳</span></h3><div className="today-events">{events.length ? events.slice(0, 3).map((event, index) => <div key={event.id} className="today-event"><div className="event-time"><strong>{index ? "15:00" : "14:00"}</strong><span>{index ? "16:30" : "17:00"}</span></div><div className={`event-color-line line-${index}`} /><div className="event-detail"><strong>{event.title}</strong><small>{event.location} <i /> {event.category}</small></div></div>) : <div className="empty-inline">Nenhum evento hoje.</div>}</div><div className="today-footer"><Clock3 size={14} /> Agenda atualizada agora</div></section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, note, icon: Icon, tone, trend, href }: { label: string; value: string; note: string; icon: typeof Wrench; tone: string; trend: string; href: string }) {
  return <Link href={href} className={`metric-card metric-${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={18} /></span></div><div className="metric-value">{value}</div><div className="metric-note">{note}</div><div className="metric-trend"><span>{tone === "pink" ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}{trend}</span><ArrowRight size={15} className="metric-arrow" /></div></Link>;
}
function PriorityTag({ value }: { value: string }) {
  const color = value === "Crítica" ? "critical" : value === "Alta" ? "high" : value === "Média" ? "medium" : "low";
  return <span className={`priority-tag ${color}`}><i />{value}</span>;
}
