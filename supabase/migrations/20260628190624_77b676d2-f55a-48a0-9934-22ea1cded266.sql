
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS linked_email text;
CREATE INDEX IF NOT EXISTS students_linked_email_idx ON public.students (lower(linked_email));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  has_linked boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  -- Auto-link any student row whose linked_email matches this user's email
  UPDATE public.students
     SET linked_user_id = NEW.id
   WHERE linked_user_id IS NULL
     AND lower(linked_email) = lower(NEW.email);

  SELECT EXISTS (SELECT 1 FROM public.students WHERE linked_user_id = NEW.id) INTO has_linked;

  IF has_linked THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teacher')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
