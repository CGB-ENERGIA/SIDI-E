-- Execute apenas a policy que falta (anon_insert já existe)
CREATE POLICY "anon_select_collaborators" ON public.collaborators
  FOR SELECT TO anon USING (true);
