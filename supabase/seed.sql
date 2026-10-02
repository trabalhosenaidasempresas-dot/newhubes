insert into public.departments(name, description) values
  ('Administração', 'Gestão administrativa e apoio institucional do HUB ES+.'),
  ('Operações', 'Manutenção, limpeza e funcionamento dos espaços.'),
  ('Programação Cultural', 'Produção de eventos e atividades do HUB.')
on conflict (name) do nothing;

insert into public.spaces(name, capacity, location) values
  ('Auditório', 120, 'Térreo'),
  ('Lab Maker', 24, '1º andar'),
  ('Sala Criativa', 28, '1º andar'),
  ('Coworking', 36, '2º andar'),
  ('Hall', 90, 'Térreo'),
  ('Espaço Multiuso', 60, 'Térreo')
on conflict (name) do nothing;

insert into public.supplies(control_code, name, category, quantity, minimum_quantity, unit, location, status) values
  ('INS-021', 'Papel toalha interfolhado', 'Limpeza', 12, 20, 'pacote', 'Depósito A', 'estoque baixo'),
  ('INS-018', 'Copo biodegradável 200ml', 'Evento', 450, 100, 'unidade', 'Depósito A', 'em estoque'),
  ('INS-016', 'Marcador para quadro branco', 'Escritório', 8, 15, 'unidade', 'Depósito B', 'estoque baixo'),
  ('INS-014', 'Detergente neutro 500ml', 'Limpeza', 32, 12, 'unidade', 'Depósito A', 'em estoque'),
  ('INS-011', 'Fita crepe 48mm', 'Manutenção', 6, 10, 'rolo', 'Depósito B', 'estoque baixo')
on conflict (control_code) do nothing;

insert into public.documents(control_code, title, description, category, valid_until, status) values
  ('DOC-081', 'Contrato de manutenção predial', 'Contrato nº 014/2024 — renovação em andamento.', 'Contratos', '2026-10-15', 'vencendo'),
  ('DOC-080', 'Ata — Conselho de Gestão · setembro', 'Reunião ordinária de 18 de setembro.', 'Atas', '2027-09-30', 'ativo'),
  ('DOC-079', 'Plano de segurança do espaço', 'Procedimentos de emergência e evacuação.', 'Normas', '2027-03-15', 'ativo'),
  ('DOC-078', 'Relatório de atividades · agosto', 'Consolidado mensal das ações e eventos.', 'Relatórios', '2027-08-31', 'ativo')
on conflict (control_code) do nothing;

insert into public.occurrences(control_code, title, description, category, location, priority, status, due_at) values
  ('OC-0248', 'Projetor do auditório sem sinal', 'Equipamento liga, mas não reconhece a entrada HDMI.', 'Equipamentos', 'Auditório', 'alta', 'em execução', '2026-10-03'),
  ('OC-0247', 'Vazamento próximo ao Lab Maker', 'Goteira identificada após as chuvas de ontem.', 'Infraestrutura', 'Lab Maker', 'crítica', 'aberta', '2026-10-02'),
  ('OC-0246', 'Reposição de material de limpeza', 'Solicitada reposição de detergente e sacos de lixo.', 'Limpeza', 'Área comum', 'média', 'em análise', '2026-10-04'),
  ('OC-0245', 'Lâmpadas queimadas no coworking', 'Troca realizada pela equipe de manutenção.', 'Manutenção', 'Coworking', 'baixa', 'resolvida', '2026-09-29'),
  ('OC-0244', 'Wi-Fi instável na Sala Criativa', 'Quedas intermitentes relatadas por participantes.', 'Tecnologia', 'Sala Criativa', 'alta', 'em análise', '2026-10-05')
on conflict (control_code) do nothing;

insert into public.events(control_code, title, event_type, space_id, starts_at, ends_at, capacity, status, contact_name, contact_email, description)
select 'EV-0108', 'Conexões Criativas: edição outubro', 'Workshop', s.id, '2026-10-02 14:00-03'::timestamptz, '2026-10-02 17:00-03'::timestamptz, 80, 'confirmado', 'Equipe HUB ES+', 'agenda@hubes.es.gov.br', 'Encontro mensal de conexões do ecossistema criativo.'
from public.spaces s where s.name = 'Auditório'
on conflict (control_code) do nothing;
insert into public.events(control_code, title, event_type, space_id, starts_at, ends_at, capacity, status, contact_name, contact_email, description)
select 'EV-0110', 'Oficina de prototipagem', 'Workshop', s.id, '2026-10-03 09:00-03'::timestamptz, '2026-10-03 12:00-03'::timestamptz, 20, 'confirmado', 'Lucas Ferreira', 'lucas@hubes.es.gov.br', 'Atividade prática no laboratório maker.'
from public.spaces s where s.name = 'Lab Maker'
on conflict (control_code) do nothing;

insert into public.purchases(control_code, item_name, justification, estimated_amount, status, priority) values
  ('CMP-042', 'Reposição de material de limpeza', 'Reposição mensal de itens de consumo.', 680, 'aguardando aprovação', 'alta'),
  ('CMP-041', 'Cabos HDMI para salas', 'Aquisição de 4 cabos HDMI de 10m.', 420, 'em cotação', 'média'),
  ('CMP-039', 'Materiais oficina de outubro', 'Materiais de apoio para atividades.', 950, 'concluída', 'baixa')
on conflict (control_code) do nothing;

insert into public.equipments(name, asset_code, location, status, next_maintenance_at) values
  ('Projetor Epson PowerLite', 'PAT-0042', 'Auditório', 'em uso', '2026-11-12'),
  ('Impressora multifuncional', 'PAT-0038', 'Administração', 'disponível', '2026-12-01'),
  ('Cortadora a laser', 'PAT-0035', 'Lab Maker', 'em manutenção', '2026-10-04')
on conflict (asset_code) do nothing;

insert into public.settings(key, value, description) values
  ('sla_occurrence_hours', '{"baixa":120,"média":72,"alta":24,"crítica":8}', 'Prazos de referência para resolução de ocorrências, em horas.'),
  ('document_expiry_alert_days', '30', 'Antecedência para alertar sobre vencimentos documentais.'),
  ('demo_mode', 'true', 'Indica se os dados demonstrativos devem ser exibidos.')
on conflict (key) do nothing;

insert into public.demo_records(module, code, title, status, payload) values
  ('ocorrencias', 'OC-0248', 'Projetor do auditório sem sinal', 'Em execução', '{"module":"ocorrencias","code":"OC-0248","title":"Projetor do auditório sem sinal","status":"Em execução","category":"Equipamentos","owner":"Rafael Costa","location":"Auditório","due":"2026-10-03","description":"Equipamento liga, mas não reconhece a entrada HDMI.","priority":"Alta"}'),
  ('ocorrencias', 'OC-0247', 'Vazamento próximo ao Lab Maker', 'Aberta', '{"module":"ocorrencias","code":"OC-0247","title":"Vazamento próximo ao Lab Maker","status":"Aberta","category":"Infraestrutura","owner":"Marina Alves","location":"Lab Maker","due":"2026-10-02","description":"Goteira identificada após as chuvas de ontem.","priority":"Crítica"}'),
  ('ocorrencias', 'OC-0246', 'Reposição de material de limpeza', 'Em análise', '{"module":"ocorrencias","code":"OC-0246","title":"Reposição de material de limpeza","status":"Em análise","category":"Limpeza","owner":"Joana Lima","location":"Área comum","due":"2026-10-04","description":"Solicitada reposição de detergente e sacos de lixo.","priority":"Média"}'),
  ('ocorrencias', 'OC-0245', 'Lâmpadas queimadas no coworking', 'Resolvida', '{"module":"ocorrencias","code":"OC-0245","title":"Lâmpadas queimadas no coworking","status":"Resolvida","category":"Manutenção","owner":"Rafael Costa","location":"Coworking","due":"2026-09-29","description":"Troca realizada pela equipe de manutenção.","priority":"Baixa"}'),
  ('ocorrencias', 'OC-0244', 'Wi-Fi instável na Sala Criativa', 'Em análise', '{"module":"ocorrencias","code":"OC-0244","title":"Wi-Fi instável na Sala Criativa","status":"Em análise","category":"Tecnologia","owner":"Pedro Nunes","location":"Sala Criativa","due":"2026-10-05","description":"Quedas intermitentes relatadas por participantes.","priority":"Alta"}'),
  ('agenda', 'EV-0108', 'Conexões Criativas: edição outubro', 'Confirmado', '{"module":"agenda","code":"EV-0108","title":"Conexões Criativas: edição outubro","status":"Confirmado","category":"Workshop","owner":"Equipe HUB ES+","location":"Auditório","due":"2026-10-02","description":"14:00 — 17:00 • 80 participantes"}'),
  ('agenda', 'EV-0109', 'Encontro de economia criativa', 'Aguardando aprovação', '{"module":"agenda","code":"EV-0109","title":"Encontro de economia criativa","status":"Aguardando aprovação","category":"Reunião","owner":"Ana Paula","location":"Sala Criativa","due":"2026-10-02","description":"15:00 — 16:30 • 18 participantes"}'),
  ('agenda', 'EV-0110', 'Oficina de prototipagem', 'Confirmado', '{"module":"agenda","code":"EV-0110","title":"Oficina de prototipagem","status":"Confirmado","category":"Workshop","owner":"Lucas Ferreira","location":"Lab Maker","due":"2026-10-03","description":"09:00 — 12:00 • 20 participantes"}'),
  ('documentos', 'DOC-081', 'Contrato de manutenção predial', 'Vencendo', '{"module":"documentos","code":"DOC-081","title":"Contrato de manutenção predial","status":"Vencendo","category":"Contratos","owner":"Administração","location":"Gestão documental","due":"2026-10-15","description":"Contrato nº 014/2024 — renovação em andamento"}'),
  ('documentos', 'DOC-080', 'Ata — Conselho de Gestão · setembro', 'Ativo', '{"module":"documentos","code":"DOC-080","title":"Ata — Conselho de Gestão · setembro","status":"Ativo","category":"Atas","owner":"Secretaria","location":"Gestão documental","due":"2027-09-30","description":"Reunião ordinária de 18 de setembro"}'),
  ('documentos', 'DOC-079', 'Plano de segurança do espaço', 'Ativo', '{"module":"documentos","code":"DOC-079","title":"Plano de segurança do espaço","status":"Ativo","category":"Normas","owner":"Marina Alves","location":"Gestão documental","due":"2027-03-15","description":"Procedimentos de emergência e evacuação"}'),
  ('insumos', 'INS-021', 'Papel toalha interfolhado', 'Estoque baixo', '{"module":"insumos","code":"INS-021","title":"Papel toalha interfolhado","status":"Estoque baixo","category":"Limpeza","owner":"Almoxarifado","location":"Depósito A","due":"2026-10-01","description":"12 pacotes • mínimo: 20"}'),
  ('insumos', 'INS-018', 'Copo biodegradável 200ml', 'Em estoque', '{"module":"insumos","code":"INS-018","title":"Copo biodegradável 200ml","status":"Em estoque","category":"Evento","owner":"Almoxarifado","location":"Depósito A","due":"2026-10-01","description":"450 unidades • mínimo: 100","amount":450}'),
  ('insumos', 'INS-016', 'Marcador para quadro branco', 'Estoque baixo', '{"module":"insumos","code":"INS-016","title":"Marcador para quadro branco","status":"Estoque baixo","category":"Escritório","owner":"Almoxarifado","location":"Depósito B","due":"2026-10-01","description":"8 unidades • mínimo: 15","amount":8}'),
  ('compras', 'CMP-042', 'Reposição de material de limpeza', 'Aguardando aprovação', '{"module":"compras","code":"CMP-042","title":"Reposição de material de limpeza","status":"Aguardando aprovação","category":"Operação","owner":"Joana Lima","location":"Administração","due":"2026-10-01","description":"Reposição mensal de itens de consumo.","priority":"Alta","amount":680}'),
  ('compras', 'CMP-041', 'Cabos HDMI para salas', 'Em cotação', '{"module":"compras","code":"CMP-041","title":"Cabos HDMI para salas","status":"Em cotação","category":"Tecnologia","owner":"Pedro Nunes","location":"Administração","due":"2026-09-30","description":"Aquisição de 4 cabos HDMI de 10m.","priority":"Média","amount":420}'),
  ('compras', 'CMP-039', 'Materiais oficina de outubro', 'Concluída', '{"module":"compras","code":"CMP-039","title":"Materiais oficina de outubro","status":"Concluída","category":"Eventos","owner":"Lucas Ferreira","location":"Administração","due":"2026-09-25","description":"Materiais de apoio para atividades.","priority":"Baixa","amount":950}'),
  ('equipamentos', 'PAT-0042', 'Projetor Epson PowerLite', 'Em uso', '{"module":"equipamentos","code":"PAT-0042","title":"Projetor Epson PowerLite","status":"Em uso","category":"Audiovisual","owner":"Rafael Costa","location":"Auditório","due":"2026-11-12","description":"Projetor principal do auditório"}'),
  ('equipamentos', 'PAT-0038', 'Impressora multifuncional', 'Disponível', '{"module":"equipamentos","code":"PAT-0038","title":"Impressora multifuncional","status":"Disponível","category":"Escritório","owner":"Joana Lima","location":"Administração","due":"2026-12-01","description":"Impressora de rede"}'),
  ('equipamentos', 'PAT-0035', 'Cortadora a laser', 'Em manutenção', '{"module":"equipamentos","code":"PAT-0035","title":"Cortadora a laser","status":"Em manutenção","category":"Lab Maker","owner":"Pedro Nunes","location":"Lab Maker","due":"2026-10-04","description":"Revisão preventiva do sistema de exaustão"}'),
  ('contratos', 'CT-014/2024', 'Manutenção predial preventiva', 'Vigente', '{"module":"contratos","code":"CT-014/2024","title":"Manutenção predial preventiva","status":"Vigente","category":"Manutenção Capixaba Ltda.","owner":"Marina Alves","location":"HUB ES+","due":"2026-10-15","description":"Contrato anual de serviços de manutenção.","amount":48000}'),
  ('contratos', 'CT-009/2025', 'Serviços de conectividade', 'Vigente', '{"module":"contratos","code":"CT-009/2025","title":"Serviços de conectividade","status":"Vigente","category":"Rede ES Tecnologia","owner":"Pedro Nunes","location":"HUB ES+","due":"2027-01-30","description":"Link dedicado e suporte de rede.","amount":26400}'),
  ('gestaodoc', 'GD-019', 'Plano de segurança do espaço', 'Ativo', '{"module":"gestaodoc","code":"GD-019","title":"Plano de segurança do espaço","status":"Ativo","category":"Normas","owner":"Marina Alves","location":"Arquivo central","due":"2027-03-15","description":"Revisão 2 • atualizado em 15/09/2026"}'),
  ('configuracoes', 'USR-001', 'Marina Alves', 'Ativo', '{"module":"configuracoes","code":"USR-001","title":"Marina Alves","status":"Ativo","category":"Administrador","owner":"marina@hubes.es.gov.br","location":"Gestão","due":"2026-10-01","description":"Administração total do sistema"}'),
  ('configuracoes', 'USR-002', 'Joana Lima', 'Ativo', '{"module":"configuracoes","code":"USR-002","title":"Joana Lima","status":"Ativo","category":"Administração","owner":"joana@hubes.es.gov.br","location":"Administrativo","due":"2026-10-01","description":"Compras e agenda"}'),
  ('configuracoes', 'USR-003', 'Rafael Costa', 'Ativo', '{"module":"configuracoes","code":"USR-003","title":"Rafael Costa","status":"Ativo","category":"Manutenção","owner":"rafael@hubes.es.gov.br","location":"Operação","due":"2026-10-01","description":"Ordens de manutenção"}')
on conflict (module, code) do nothing;
