create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'visitante' check (role in ('administrador','administração','recepção','manutenção','limpeza','visitante')),
  department_id uuid references public.departments(id) on delete set null,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'administrador', false)
$$;

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  capacity integer not null default 1 check (capacity > 0),
  location text,
  availability text not null default 'disponível' check (availability in ('disponível','indisponível')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  control_code text unique,
  title text not null,
  description text,
  category text not null,
  file_path text,
  file_name text,
  valid_until date,
  status text not null default 'ativo' check (status in ('ativo','vencendo','vencido','arquivado')),
  source_type text,
  source_id uuid,
  current_version integer not null default 1 check (current_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version integer not null,
  file_path text,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (document_id, version)
);

create table if not exists public.occurrences (
  id uuid primary key default gen_random_uuid(),
  control_code text unique,
  title text not null,
  description text not null default '',
  category text not null,
  location text not null,
  priority text not null default 'média' check (priority in ('baixa','média','alta','crítica')),
  status text not null default 'aberta' check (status in ('aberta','em análise','em execução','resolvida','cancelada')),
  assigned_to uuid references public.profiles(id) on delete set null,
  due_at date,
  solution text,
  reusable_solution boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.occurrence_comments (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.occurrences(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.occurrence_history (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.occurrences(id) on delete cascade,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  control_code text unique,
  title text not null,
  event_type text,
  space_id uuid not null references public.spaces(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer check (capacity is null or capacity > 0),
  status text not null default 'aguardando aprovação' check (status in ('aguardando aprovação','confirmado','recusado','cancelado')),
  contact_name text,
  contact_email text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint event_valid_period check (ends_at > starts_at)
);

create table if not exists public.event_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null,
  email text not null,
  organization text,
  registration_token uuid not null default gen_random_uuid() unique,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique(event_id, email)
);

create table if not exists public.supplies (
  id uuid primary key default gen_random_uuid(),
  control_code text unique,
  name text not null,
  category text not null,
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  minimum_quantity numeric(12,2) not null default 0 check (minimum_quantity >= 0),
  unit text not null default 'unidade',
  location text,
  status text not null default 'em estoque',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.supply_movements (
  id uuid primary key default gen_random_uuid(),
  supply_id uuid not null references public.supplies(id),
  movement_type text not null check (movement_type in ('entrada','baixa','requisição')),
  quantity numeric(12,2) not null check (quantity > 0),
  justification text,
  status text not null default 'confirmada' check (status in ('aguardando aprovação','confirmada','recusada')),
  requested_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  control_code text unique,
  item_name text not null,
  supply_id uuid references public.supplies(id) on delete set null,
  justification text,
  department_id uuid references public.departments(id) on delete set null,
  estimated_amount numeric(14,2),
  purchase_document_number text,
  invoice_document_id uuid references public.documents(id) on delete set null,
  status text not null default 'solicitada' check (status in ('solicitada','aguardando aprovação','aprovada','em cotação','compra realizada','recebida','concluída','cancelada')),
  priority text not null default 'média' check (priority in ('baixa','média','alta','crítica')),
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.purchase_history (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.equipments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  asset_code text not null unique,
  location text,
  assigned_to uuid references public.profiles(id) on delete set null,
  status text not null default 'disponível' check (status in ('disponível','em uso','em manutenção','indisponível','baixado')),
  acquired_at date,
  next_maintenance_at date,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.equipment_history (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipments(id) on delete cascade,
  action text not null,
  from_location text,
  to_location text,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  target_roles text[] not null default '{}',
  title text not null,
  message text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.demo_records (
  id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('ocorrencias','agenda','documentos','insumos','compras','equipamentos','relatorios','configuracoes','gestaodoc','contratos')),
  code text not null,
  title text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (module, code)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  changed_id uuid;
  previous_data jsonb;
  new_data jsonb;
begin
  if tg_op = 'INSERT' then
    changed_id := new.id;
    new_data := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    changed_id := new.id;
    previous_data := to_jsonb(old);
    new_data := to_jsonb(new);
  else
    changed_id := old.id;
    previous_data := to_jsonb(old);
  end if;
  insert into public.audit_logs(table_name, record_id, operation, old_data, new_data, actor_id)
  values (
    tg_table_name,
    changed_id,
    tg_op,
    previous_data,
    new_data,
    auth.uid()
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create or replace function public.track_event_updates()
returns trigger language plpgsql security definer set search_path = public
as $$
declare status_changed boolean;
begin
  if tg_op = 'INSERT' then
    status_changed := true;
  else
    status_changed := new.status is distinct from old.status;
  end if;
  if status_changed then
    insert into public.event_history(event_id, status, note, created_by)
    values (new.id, new.status, case when tg_op = 'INSERT' then 'Solicitação registrada.' else 'Status atualizado.' end, auth.uid());
    insert into public.notifications(target_roles, title, message, link, created_by)
    values (
      array['administrador','administração','recepção'],
      case when tg_op = 'INSERT' then 'Nova solicitação de agenda' else 'Agenda atualizada' end,
      new.title || ' · ' || new.status,
      '/agenda',
      auth.uid()
    );
    if tg_op = 'UPDATE' and new.created_by is not null then
      insert into public.notifications(recipient_id, title, message, link, created_by)
      values (new.created_by, 'Atualização da sua solicitação', new.title || ' · ' || new.status, '/agenda', auth.uid());
    end if;
  end if;
  return new;
end
$$;

create or replace function public.notify_low_stock()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  should_notify boolean;
begin
  if tg_op = 'INSERT' then
    should_notify := new.quantity <= new.minimum_quantity;
  else
    should_notify := new.quantity <= new.minimum_quantity
      and (old.quantity > old.minimum_quantity or old.quantity is distinct from new.quantity);
  end if;
  if should_notify then
    insert into public.notifications(target_roles, title, message, link, created_by)
    values (array['administrador','administração'], 'Estoque abaixo do mínimo', new.name || ' · ' || new.quantity || ' ' || new.unit, '/insumos', auth.uid());
  end if;
  return new;
end
$$;

create or replace function public.notify_equipment_movement()
returns trigger language plpgsql security definer set search_path = public
as $$
declare equipment_name text;
begin
  select name into equipment_name from public.equipments where id = new.equipment_id;
  insert into public.notifications(target_roles, title, message, link, created_by)
  values (array['administrador','administração'], 'Movimentação de patrimônio', coalesce(equipment_name, 'Equipamento') || ' · ' || coalesce(new.to_location, new.action), '/equipamentos', auth.uid());
  return new;
end
$$;

create or replace function public.notify_demo_record_changes()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.module = 'agenda' then
      insert into public.notifications(target_roles, title, message, link, created_by)
      values (array['administrador','administração','recepção'], 'Nova solicitação de agenda', new.title || ' · ' || new.status, '/agenda', auth.uid());
    elsif new.module = 'insumos' and new.status = 'Estoque baixo' then
      insert into public.notifications(target_roles, title, message, link, created_by)
      values (array['administrador','administração'], 'Estoque abaixo do mínimo', new.title, '/insumos', auth.uid());
    end if;
  else
    if new.module = 'agenda' and old.status is distinct from new.status then
      if public.current_user_role() <> 'administrador' then
        raise exception 'Somente o administrador pode alterar o status de uma solicitação de agenda.';
      end if;
      insert into public.notifications(target_roles, title, message, link, created_by)
      values (array['administrador','administração','recepção'], 'Agenda atualizada', new.title || ' · ' || new.status, '/agenda', auth.uid());
    elsif new.module = 'equipamentos' and old.payload ->> 'location' is distinct from new.payload ->> 'location' then
      insert into public.notifications(target_roles, title, message, link, created_by)
      values (array['administrador','administração'], 'Movimentação de patrimônio', new.title || ' · ' || coalesce(new.payload ->> 'location', 'Local atualizado'), '/equipamentos', auth.uid());
    end if;
  end if;
  return new;
end
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['departments','profiles','spaces','documents','occurrences','events','supplies','supply_movements','purchases','equipments','notifications','settings','demo_records'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
    execute format('drop trigger if exists audit_changes on public.%I', table_name);
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log()', table_name);
  end loop;
end
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'document_versions','occurrence_comments','occurrence_history','event_history','event_participants',
    'purchase_history','equipment_history'
  ] loop
    execute format('drop trigger if exists audit_changes on public.%I', table_name);
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log()', table_name);
  end loop;
end
$$;

drop trigger if exists track_event_updates on public.events;
create trigger track_event_updates after insert or update of status on public.events
for each row execute function public.track_event_updates();
drop trigger if exists notify_low_stock on public.supplies;
create trigger notify_low_stock after insert or update of quantity, minimum_quantity on public.supplies
for each row execute function public.notify_low_stock();
drop trigger if exists notify_equipment_movement on public.equipment_history;
create trigger notify_equipment_movement after insert on public.equipment_history
for each row execute function public.notify_equipment_movement();
drop trigger if exists notify_demo_record_changes on public.demo_records;
create trigger notify_demo_record_changes after insert or update on public.demo_records
for each row execute function public.notify_demo_record_changes();

do $$
begin
  alter table public.events add constraint events_no_space_time_overlap
    exclude using gist (space_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
    where (status in ('aguardando aprovação','confirmado'));
exception when duplicate_object then
  null;
end
$$;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'visitante'
  )
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.spaces enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.occurrences enable row level security;
alter table public.occurrence_comments enable row level security;
alter table public.occurrence_history enable row level security;
alter table public.events enable row level security;
alter table public.event_history enable row level security;
alter table public.event_participants enable row level security;
alter table public.supplies enable row level security;
alter table public.supply_movements enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_history enable row level security;
alter table public.equipments enable row level security;
alter table public.equipment_history enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;
alter table public.demo_records enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles select own or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles admin manage" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "departments authenticated read" on public.departments for select to authenticated using (true);
create policy "departments admin manage" on public.departments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "spaces authenticated read" on public.spaces for select to authenticated using (true);
create policy "spaces admin manage" on public.spaces for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "documents authorized read" on public.documents for select to authenticated using (
  public.current_user_role() in ('administrador','administração')
  or (category = 'Ocorrências' and public.current_user_role() in ('manutenção','limpeza'))
);
create policy "documents staff manage" on public.documents for all to authenticated using (public.current_user_role() in ('administrador','administração')) with check (public.current_user_role() in ('administrador','administração'));
create policy "document versions authorized read" on public.document_versions for select to authenticated using (public.current_user_role() in ('administrador','administração'));
create policy "document versions staff manage" on public.document_versions for all to authenticated using (public.current_user_role() in ('administrador','administração')) with check (public.current_user_role() in ('administrador','administração'));

create policy "occurrences authenticated read" on public.occurrences for select to authenticated using (true);
create policy "occurrences staff create" on public.occurrences for insert to authenticated with check (public.current_user_role() in ('administrador','administração','manutenção','limpeza'));
create policy "occurrences staff update" on public.occurrences for update to authenticated using (public.current_user_role() in ('administrador','administração','manutenção')) with check (public.current_user_role() in ('administrador','administração','manutenção'));
create policy "occurrences admin delete" on public.occurrences for delete to authenticated using (public.is_admin());
create policy "occurrence comments read" on public.occurrence_comments for select to authenticated using (true);
create policy "occurrence comments create" on public.occurrence_comments for insert to authenticated with check (auth.uid() = created_by);
create policy "occurrence history read" on public.occurrence_history for select to authenticated using (true);
create policy "occurrence history create" on public.occurrence_history for insert to authenticated with check (auth.uid() = created_by);

create policy "events visibility" on public.events for select to authenticated using (
  public.current_user_role() in ('administrador','administração','recepção') or created_by = auth.uid()
);
create policy "events request" on public.events for insert to authenticated with check (
  created_by = auth.uid()
  and public.current_user_role() in ('administrador','administração','visitante')
  and (public.current_user_role() <> 'visitante' or status = 'aguardando aprovação')
  and (public.current_user_role() <> 'administrador' or status = 'confirmado')
  and (public.current_user_role() <> 'administração' or status = 'aguardando aprovação')
);
create policy "events administrator update" on public.events for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "events admin delete" on public.events for delete to authenticated using (public.is_admin());
create policy "event history authorized" on public.event_history for select to authenticated using (public.current_user_role() in ('administrador','administração','recepção') or exists(select 1 from public.events e where e.id = event_id and e.created_by = auth.uid()));
create policy "event history admin write" on public.event_history for all to authenticated using (public.current_user_role() in ('administrador','administração')) with check (public.current_user_role() in ('administrador','administração'));
create policy "participant staff read" on public.event_participants for select to authenticated using (public.current_user_role() in ('administrador','administração','recepção'));
create policy "participant staff manage" on public.event_participants for all to authenticated using (public.current_user_role() in ('administrador','administração','recepção')) with check (public.current_user_role() in ('administrador','administração','recepção'));

create policy "supplies authenticated read" on public.supplies for select to authenticated using (true);
create policy "supplies admin manage" on public.supplies for all to authenticated using (public.current_user_role() in ('administrador','administração')) with check (public.current_user_role() in ('administrador','administração'));
create policy "supply movements authorized read" on public.supply_movements for select to authenticated using (public.current_user_role() in ('administrador','administração','manutenção','limpeza'));
create policy "supply request" on public.supply_movements for insert to authenticated with check (
  (public.current_user_role() in ('manutenção','limpeza') and movement_type = 'requisição' and status = 'aguardando aprovação')
  or (public.current_user_role() in ('administrador','administração') and movement_type in ('entrada','baixa') and status = 'confirmada')
);
create policy "supply approval" on public.supply_movements for update to authenticated using (public.current_user_role() in ('administrador','administração')) with check (public.current_user_role() in ('administrador','administração'));

create policy "purchases admin administration read" on public.purchases for select to authenticated using (public.current_user_role() in ('administrador','administração'));
create policy "purchases admin administration create" on public.purchases for insert to authenticated with check (public.current_user_role() in ('administrador','administração'));
create policy "purchases authorized update" on public.purchases for update to authenticated using (
  public.current_user_role() in ('administrador','administração')
  and (status <> 'cancelada' or public.current_user_role() = 'administração')
) with check (
  public.current_user_role() in ('administrador','administração')
  and (status <> 'cancelada' or public.current_user_role() = 'administração')
  and (status <> 'aprovada' or public.is_admin())
);
create policy "purchase admin delete" on public.purchases for delete to authenticated using (public.is_admin());
create policy "purchase history read" on public.purchase_history for select to authenticated using (public.current_user_role() in ('administrador','administração'));
create policy "purchase history write" on public.purchase_history for all to authenticated using (public.current_user_role() in ('administrador','administração')) with check (public.current_user_role() in ('administrador','administração'));

create policy "equipment authorized read" on public.equipments for select to authenticated using (true);
create policy "equipment admin administration manage" on public.equipments for all to authenticated using (public.current_user_role() in ('administrador','administração')) with check (public.current_user_role() in ('administrador','administração'));
create policy "equipment history authorized read" on public.equipment_history for select to authenticated using (true);
create policy "equipment history staff write" on public.equipment_history for insert to authenticated with check (public.current_user_role() in ('administrador','administração','manutenção'));

create policy "notifications recipient or role" on public.notifications for select to authenticated using (
  recipient_id = auth.uid() or public.current_user_role() = any(target_roles) or public.is_admin()
);
create policy "notifications insert authenticated" on public.notifications for insert to authenticated with check (auth.uid() = created_by);
create policy "notifications recipient update" on public.notifications for update to authenticated using (
  recipient_id = auth.uid() or public.current_user_role() = any(target_roles) or public.is_admin()
) with check (recipient_id = auth.uid() or public.current_user_role() = any(target_roles) or public.is_admin());
create policy "settings authenticated read" on public.settings for select to authenticated using (true);
create policy "settings admin manage" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "demo records role scoped read" on public.demo_records for select to authenticated using (
  (public.current_user_role() = 'visitante' and module = 'agenda' and (payload ->> 'owner' = (select full_name from public.profiles where id = auth.uid()) or status = 'Confirmado'))
  or (public.current_user_role() = 'recepção' and module in ('agenda','relatorios'))
  or (public.current_user_role() = 'administração' and module <> 'configuracoes')
  or public.is_admin()
  or (public.current_user_role() = 'manutenção' and module in ('ocorrencias','insumos','equipamentos'))
  or (public.current_user_role() = 'limpeza' and module in ('ocorrencias','insumos'))
  or (public.current_user_role() in ('manutenção','limpeza') and module = 'documentos' and payload ->> 'category' = 'Ocorrências')
);
create policy "demo records create by role" on public.demo_records for insert to authenticated with check (
  created_by = auth.uid()
  and ((public.current_user_role() = 'visitante' and module = 'agenda' and status = 'Aguardando aprovação')
  or (public.current_user_role() = 'administração' and module = 'agenda' and status = 'Aguardando aprovação')
  or (public.current_user_role() = 'administração' and module in ('documentos','insumos','compras','equipamentos','contratos','gestaodoc','ocorrencias'))
  or (public.current_user_role() = 'manutenção' and module in ('ocorrencias','insumos','equipamentos'))
  or (public.current_user_role() = 'limpeza' and module in ('ocorrencias','insumos'))
  or (public.current_user_role() in ('manutenção','limpeza') and module = 'documentos' and payload ->> 'category' = 'Ocorrências')
  or public.is_admin())
);
create policy "demo records update by role" on public.demo_records for update to authenticated using (
  public.is_admin()
  or (public.current_user_role() = 'administração' and module in ('agenda','documentos','insumos','compras','equipamentos','relatorios','gestaodoc','contratos','ocorrencias'))
  or (public.current_user_role() = 'manutenção' and module in ('ocorrencias','insumos','equipamentos'))
  or (public.current_user_role() = 'limpeza' and module in ('ocorrencias','insumos'))
) with check (
  public.is_admin()
  or (public.current_user_role() = 'administração' and module in ('agenda','documentos','insumos','compras','equipamentos','relatorios','gestaodoc','contratos','ocorrencias'))
  or (public.current_user_role() = 'manutenção' and module in ('ocorrencias','insumos','equipamentos'))
  or (public.current_user_role() = 'limpeza' and module in ('ocorrencias','insumos'))
  or (public.current_user_role() in ('manutenção','limpeza') and module = 'documentos' and payload ->> 'category' = 'Ocorrências')
);
create policy "demo records admin delete" on public.demo_records for delete to authenticated using (public.is_admin());
create policy "audit logs admin read" on public.audit_logs for select to authenticated using (public.is_admin());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('hub-files', 'hub-files', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "private hub files readable by authorized staff" on storage.objects for select to authenticated
using (bucket_id = 'hub-files' and (
  public.current_user_role() in ('administrador','administração','recepção')
  or (public.current_user_role() in ('manutenção','limpeza') and (storage.foldername(name))[1] = 'ocorrencias')
));
create policy "authorized staff upload hub files" on storage.objects for insert to authenticated
with check (bucket_id = 'hub-files' and (
  public.current_user_role() in ('administrador','administração')
  or (public.current_user_role() in ('manutenção','limpeza') and (storage.foldername(name))[1] = 'ocorrencias')
));
create policy "admin manages hub files" on storage.objects for delete to authenticated
using (bucket_id = 'hub-files' and public.is_admin());

create index if not exists occurrences_status_idx on public.occurrences(status);
create index if not exists occurrences_due_idx on public.occurrences(due_at);
create index if not exists documents_valid_until_idx on public.documents(valid_until);
create index if not exists events_period_idx on public.events(space_id, starts_at, ends_at);
create index if not exists notifications_recipient_unread_idx on public.notifications(recipient_id, created_at desc) where read_at is null;
create index if not exists demo_records_module_idx on public.demo_records(module, updated_at desc);
create index if not exists audit_logs_record_idx on public.audit_logs(table_name, record_id, created_at desc);
