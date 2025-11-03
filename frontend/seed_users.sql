CREATE TABLE IF NOT EXISTS public."User" (
  id text PRIMARY KEY NOT NULL,
  email text NOT NULL,
  password text NOT NULL,
  name text,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_email_key') THEN
    CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);
  END IF;
END$$;

-- optional sample user (password: 'password')
INSERT INTO public."User" (id, email, password, name) VALUES ('sample-user-1','test@example.com','$2b$10$CwTycUXWue0Thq9StjUM0uJ8e1f3zYq8b6H0/8aN0mG6yY8rQ6Gq','Test') ON CONFLICT (id) DO NOTHING;
