-- PROPOSTA PARA REVISÃO: Visitante registra e lê somente as próprias ocorrências.
-- Não executar sem aprovação. Políticas aditivas (OR com as existentes); nada é removido.
-- Update e delete continuam sem política para visitante, portanto bloqueados.

create policy "visitor reads own occurrences" on public.demo_records
for select to authenticated using (
  module = 'ocorrencias'
  and created_by = auth.uid()
  and public.current_user_role() = 'visitante'
);

create policy "visitor creates own occurrences" on public.demo_records
for insert to authenticated with check (
  module = 'ocorrencias'
  and created_by = auth.uid()
  and status = 'Aberta'
  and public.current_user_role() = 'visitante'
);
