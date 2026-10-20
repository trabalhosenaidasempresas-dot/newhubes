"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Fingerprint, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [visitorForm, setVisitorForm] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorPassword, setVisitorPassword] = useState("");

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    if (supabase) {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !data.user) {
        setError(authError?.message ?? "Não foi possível entrar.");
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("full_name,role").eq("id", data.user.id).single();
      localStorage.setItem("hubcentral-session", JSON.stringify({
        name: profile?.full_name ?? data.user.email?.split("@")[0] ?? "Usuário",
        email: data.user.email ?? email,
        role: profile?.role ?? "visitante",
      }));
    } else {
      localStorage.setItem("hubcentral-session", JSON.stringify({
        name: email.split("@")[0] || "Administrador",
        email: email || "demo@hubes.es.gov.br",
        role: "administrador",
      }));
    }
    const role = JSON.parse(localStorage.getItem("hubcentral-session") ?? "{}").role;
    router.replace(role === "visitante" ? "/agenda" : "/dashboard");
  }

  async function enterAsVisitor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    if (supabase) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: visitorEmail,
        password: visitorPassword,
        options: { data: { full_name: visitorName } },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      if (!data.session) {
        setError("Cadastro criado. Confirme seu e-mail para liberar o acesso.");
        setLoading(false);
        return;
      }
    }
    const visitor = { name: visitorName || "Visitante", email: visitorEmail || "visitante@demo.hubes.es.gov.br", role: "visitante" };
    localStorage.setItem("hubcentral-session", JSON.stringify(visitor));
    router.replace("/agenda");
  }

  return (
    <main className="login-page">
      <section className="login-art">
        <div className="login-art-orb orb-one" />
        <div className="login-art-orb orb-two" />
        <div className="login-brand"><span className="brand-symbol">+</span><span>HUB ES<span className="brand-plus">+</span></span></div>
        <div className="login-art-copy">
          <span className="eyebrow light"><Sparkles size={14} /> CULTURA • CRIATIVIDADE • INOVAÇÃO</span>
          <h1>Ideias que<br />movem o <em>Espírito Santo.</em></h1>
          <p>Um espaço para conectar pessoas, projetos e novas possibilidades.</p>
        </div>
        <div className="login-art-footer"><span>HUB ES+ · GOVERNO DO ESTADO DO ESPÍRITO SANTO</span><span>01 — 04</span></div>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="mobile-login-brand"><span className="brand-symbol">+</span> HUB ES<span className="brand-plus">+</span></div>
          <span className="eyebrow">PLATAFORMA DE GESTÃO</span>
          <h2>Boas-vindas!</h2>
          <p className="muted">Entre para acessar o HubCentral ES+.</p>
          <form onSubmit={signIn} className="login-form">
            <label htmlFor="email">E-mail</label>
            <div className="input-icon"><Mail size={17} /><input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></div>
            <label htmlFor="password">Senha</label>
            <div className="input-icon"><LockKeyhole size={17} /><input id="password" type={showPassword ? "text" : "password"} placeholder="Sua senha" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /><button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="button button-primary login-submit" disabled={loading}>{loading ? "Entrando..." : "Entrar na plataforma"} {!loading && <ArrowRight size={17} />}</button>
          </form>
          {!process.env.NEXT_PUBLIC_SUPABASE_URL && <p className="demo-hint"><Fingerprint size={15} /> Modo demonstração: informe qualquer e-mail e senha para entrar.</p>}
          <div className="login-divider"><span>ou</span></div>
          {!visitorForm ? <button type="button" className="button button-outline visitor-button" onClick={() => { setVisitorForm(true); setError(""); }}>Continuar como visitante <ArrowRight size={16} /></button> :
            <form className="visitor-signup" onSubmit={enterAsVisitor}>
              <div className="visitor-signup-heading"><strong>Cadastro de visitante</strong><button type="button" onClick={() => setVisitorForm(false)} aria-label="Fechar cadastro"><span>×</span></button></div>
              <input aria-label="Nome completo" placeholder="Nome completo" value={visitorName} onChange={(event) => setVisitorName(event.target.value)} required />
              <input aria-label="E-mail do visitante" type="email" placeholder="E-mail" value={visitorEmail} onChange={(event) => setVisitorEmail(event.target.value)} required />
              <input aria-label="Senha do visitante" type="password" placeholder="Crie uma senha (mín. 8 caracteres)" minLength={8} value={visitorPassword} onChange={(event) => setVisitorPassword(event.target.value)} required />
              <button type="submit" className="button button-primary visitor-button" disabled={loading}>{loading ? "Criando cadastro..." : "Criar acesso de visitante"} <ArrowRight size={16} /></button>
              {error && <p className="form-error visitor-error">{error}</p>}
            </form>}
          <p className="visitor-note">Acesso de visitante: solicitação e acompanhamento de agenda.</p>
          <div className="login-bottom">HubCentral ES+ <span>·</span> Gestão integrada do HUB ES+</div>
        </div>
      </section>
    </main>
  );
}
