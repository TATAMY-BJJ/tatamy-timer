DROP POLICY IF EXISTS "Veřejný přístup k akcím" ON public.akce;
DROP POLICY IF EXISTS "Veřejný přístup k rozhodčím" ON public.rozhodci;
DROP POLICY IF EXISTS "Veřejný přístup k úsekům" ON public.useky;
DROP POLICY IF EXISTS "Veřejný přístup k žínenkám" ON public.zinenky;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

REVOKE ALL ON public.akce, public.rozhodci, public.useky, public.zinenky FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.akce, public.rozhodci, public.useky, public.zinenky TO authenticated;
GRANT ALL ON public.akce, public.rozhodci, public.useky, public.zinenky TO service_role;

CREATE POLICY "Staff read akce" ON public.akce FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'casomeric'));
CREATE POLICY "Admins manage akce" ON public.akce FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrator')) WITH CHECK (public.has_role(auth.uid(),'administrator'));

CREATE POLICY "Staff read rozhodci" ON public.rozhodci FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'casomeric'));
CREATE POLICY "Admins manage rozhodci" ON public.rozhodci FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrator')) WITH CHECK (public.has_role(auth.uid(),'administrator'));

CREATE POLICY "Staff read zinenky" ON public.zinenky FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'casomeric'));
CREATE POLICY "Admins manage zinenky" ON public.zinenky FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrator')) WITH CHECK (public.has_role(auth.uid(),'administrator'));

CREATE POLICY "Staff read useky" ON public.useky FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'casomeric'));
CREATE POLICY "Timekeepers start useky" ON public.useky FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'casomeric') AND end_ts IS NULL);
CREATE POLICY "Timekeepers stop useky" ON public.useky FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'casomeric') AND end_ts IS NULL)
  WITH CHECK (public.has_role(auth.uid(),'casomeric'));
CREATE POLICY "Admins manage useky" ON public.useky FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrator')) WITH CHECK (public.has_role(auth.uid(),'administrator'));

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'administrator'));