-- Create login5p table for authentication in public schema
CREATE TABLE IF NOT EXISTS public.login5p (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user1', 'user2')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert users
INSERT INTO public.login5p (id, name, password, role) VALUES
  ('01011788', 'Pathom Lerkchalerm', 'Admin@11788', 'admin'),
  ('01025343', 'Sopida Molpichai', 'Admin@25343', 'admin'),
  ('01031192', 'Boonyaporn Suppanakorn', 'Admin@31192', 'admin'),
  ('01035012', 'Kanogwan Saingam', 'Admin@35012', 'admin'),
  ('01039029', 'Wilasinee Thongrattana', 'Admin@39029', 'admin'),
  ('01040464', 'Chayaporn Sawetanan', 'Admin@40464', 'admin'),
  ('01040589', 'Kittipat Sutthi', 'User@40589', 'user1'),
  ('01040919', 'Tanakorn Phankham', 'User@40919', 'user1'),
  ('01041230', 'Thanaporn Thongtao', 'User@41230', 'user2')
ON CONFLICT (id) DO NOTHING;
