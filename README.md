# HubCentral ES+

Plataforma de demonstração para centralizar a gestão operacional, documental e administrativa do HUB ES+, com uma experiência responsiva para gestores, equipes operacionais e visitantes.

## O problema e a solução

Informações descentralizadas sobre documentos, ocorrências, espaços, insumos, equipamentos e compras aumentam o retrabalho e dificultam o acompanhamento. O HubCentral organiza esses fluxos em uma visão integrada, com indicadores executivos, busca global, rastreabilidade por registro e alertas de atenção.

## Tecnologias

- Next.js App Router, React e TypeScript
- Tailwind CSS 4 e estilos responsivos mobile-first
- Supabase Auth, PostgreSQL, Row Level Security e Storage (opcionais para a demonstração local)
- Recharts para visualizações
- React Hook Form e Zod para formulários
- Lucide React para ícones

## Como executar

Requisitos: Node.js 20 ou superior e npm.

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Sem credenciais Supabase, escolha um perfil de demonstração: informe qualquer e-mail e senha para entrar como administrador ou crie um visitante no formulário da tela de entrada. Os cadastros e alterações ficam salvos no armazenamento local do navegador.

Para verificar tipos e gerar a versão de produção:

```bash
npm run typecheck
npm run lint
npm run build
npm start
```

## Supabase

1. Crie um projeto Supabase.
2. Copie `.env.example` para `.env.local` e configure a URL e a chave pública `anon` (ou `publishable`). Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` em variáveis `NEXT_PUBLIC_*` ou no cliente web.
3. Execute `supabase/schema.sql` no SQL Editor do projeto e, em seguida, `supabase/seed.sql`.
4. Para autenticação real, crie usuários em Authentication. Cadastros feitos pela própria tela de visitante recebem o perfil `visitante`; perfis internos devem ser atribuídos por um administrador diretamente na tabela `profiles`.
5. O bucket privado `hub-files` é criado pelo schema. A interface usa o bucket para anexos quando Supabase está configurado.
6. Defina as URLs de redirecionamento do Supabase Auth para os domínios local e de produção.

Variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

A aplicação nunca utiliza a service-role key no navegador. Com Supabase configurado, login, perfil, leitura/gravação dos registros de demonstração e upload de arquivos usam as APIs do Supabase; sem configuração, a demonstração continua disponível com armazenamento local. As tabelas de domínio do schema dão suporte à evolução para fluxos normalizados.

## Perfis de acesso

- **Administrador:** acesso total e confirmação automática de solicitações de agenda.
- **Administração:** agenda (com aprovação), documentos, compras, insumos, contratos e módulos de gestão autorizados.
- **Recepção:** consulta de agenda e apoio aos eventos.
- **Manutenção:** ocorrências, equipamentos e requisições operacionais.
- **Limpeza:** ocorrências e requisições de insumos.
- **Visitante:** solicita e acompanha espaços pela agenda.

No modo local, a entrada de demonstração libera o perfil Administrador; o botão de visitante abre um cadastro separado e restrito. No modo Supabase, o perfil não é escolhido no cadastro: novos usuários recebem `visitante` por padrão.

## Roteiro para demonstração

1. Entre como administrador e explore o dashboard e seus alertas de estoque, documentos e ocorrências.
2. Abra a ocorrência crítica do Lab Maker e confira status, prioridade e histórico.
3. Registre uma ocorrência de equipamento: a sugestão local estima prioridade, equipe, prazo e caso semelhante a partir de palavras-chave.
4. Consulte documentos e contratos e cadastre um novo documento com arquivo.
5. Abra a agenda, percorra o calendário e tente solicitar o mesmo espaço e dia para visualizar o alerta de conflito.
6. Cadastre uma solicitação como administrador (confirmada automaticamente) ou crie um visitante e acompanhe a solicitação pendente.
7. Confira insumos, compras e patrimônio e atualize o status de um registro.
8. Exporte os dados da visão de relatórios em CSV.

## Estrutura

- `app/`: rotas do App Router e estilos globais
- `components/`: shell responsivo, dashboard e registros dos módulos
- `lib/`: modelo de dados, conexão Supabase e sugestão de ocorrências
- `supabase/schema.sql`: tabelas, funções, gatilhos de auditoria, RLS, Storage e índices
- `supabase/seed.sql`: dados fictícios para apresentação

Os dados e nomes da demonstração são fictícios. Antes de produção, revisar as políticas RLS com a equipe responsável, configurar SMTP do Supabase Auth, definir os domínios de Storage, e integrar os fluxos de e-mail, QR Code e notificações com os provedores institucionais.
