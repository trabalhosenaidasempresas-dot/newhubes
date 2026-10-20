"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { AlertTriangle, ArrowRight, CalendarDays } from "lucide-react";
import { HubRecord } from "@/lib/data";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

export function VisitorWelcome({ records }: { records: HubRecord[] }) {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    createClient()?.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const recent = records
    .filter((record) => (record.module === "agenda" || record.module === "ocorrencias") && !!userId && record.createdBy === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <section className="visitor-welcome" aria-labelledby="visitor-welcome-title">
      <div className="visitor-hero">
        <span className="visitor-eyebrow">HUB ES+ · Gestão integrada</span>
        <h1 id="visitor-welcome-title">A cultura conecta pessoas</h1>
        <p>Acesse os espaços e serviços culturais, solicite o uso dos ambientes e comunique qualquer problema para que a equipe possa cuidar deles com agilidade.</p>
      </div>
      <div className="visitor-cards">
        <Link href="/agenda" className="visitor-card">
          <span className="visitor-card-icon"><CalendarDays size={22} /></span>
          <strong>Agenda</strong>
          <small>Consultar espaços e acompanhar solicitações.</small>
          <span className="visitor-card-link">Abrir agenda <ArrowRight size={15} /></span>
        </Link>
        <Link href="/ocorrencias" className="visitor-card">
          <span className="visitor-card-icon"><AlertTriangle size={22} /></span>
          <strong>Ocorrências</strong>
          <small>Registrar problemas e acompanhar os próprios registros.</small>
          <span className="visitor-card-link">Abrir ocorrências <ArrowRight size={15} /></span>
        </Link>
      </div>
      {recent.length > 0 && (
        <div className="visitor-recent">
          <h2>Seus registros recentes</h2>
          <ul>
            {recent.map((record) => (
              <li key={record.id}>
                <span><strong>{record.title}</strong><small>{record.module === "agenda" ? "Agenda" : "Ocorrência"} · {formatDate(record.createdAt)}</small></span>
                <em>{record.status}</em>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
