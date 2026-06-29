
-- New signup logic: admin email becomes admin; everyone else auto-becomes a student of the admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email constant text := 'sidikhman@gmail.com';
  admin_id uuid;
  existing_student_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  -- Admin signup
  IF lower(NEW.email) = admin_email THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teacher')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Regular signup → student
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Link to existing student row if teacher pre-created one
  UPDATE public.students
     SET linked_user_id = NEW.id
   WHERE linked_user_id IS NULL
     AND lower(linked_email) = lower(NEW.email);

  SELECT id INTO existing_student_id FROM public.students WHERE linked_user_id = NEW.id LIMIT 1;
  IF existing_student_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Otherwise create a student row owned by the admin (if the admin exists)
  SELECT id INTO admin_id FROM auth.users WHERE lower(email) = admin_email LIMIT 1;
  IF admin_id IS NOT NULL THEN
    INSERT INTO public.students (teacher_id, linked_user_id, linked_email, full_name)
    VALUES (
      admin_id,
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Admin can see/manage everything across all teacher tables
CREATE POLICY "Admin reads all students" ON public.students
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin writes all students" ON public.students
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin reads all attendance" ON public.attendance
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin writes all attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin reads all memorization" ON public.memorization
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin writes all memorization" ON public.memorization
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin reads all evaluations" ON public.evaluations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin writes all evaluations" ON public.evaluations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin reads all assignments" ON public.assignments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin writes all assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Backfill: if the admin already signed up, ensure they have the admin role
DO $$
DECLARE admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE lower(email) = 'sidikhman@gmail.com' LIMIT 1;
  IF admin_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END$$;

-- Backfill: link any previously signed-up users (non-admin) as students under the admin
DO $$
DECLARE
  admin_id uuid;
  u record;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE lower(email) = 'sidikhman@gmail.com' LIMIT 1;
  IF admin_id IS NULL THEN RETURN; END IF;

  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    WHERE lower(au.email) <> 'sidikhman@gmail.com'
      AND NOT EXISTS (SELECT 1 FROM public.students s WHERE s.linked_user_id = au.id)
  LOOP
    INSERT INTO public.students (teacher_id, linked_user_id, linked_email, full_name)
    VALUES (admin_id, u.id, u.email,
            COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)));

    INSERT INTO public.user_roles (user_id, role) VALUES (u.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END$$;
