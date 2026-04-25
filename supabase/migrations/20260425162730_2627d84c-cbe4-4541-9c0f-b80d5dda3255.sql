ALTER TABLE public.akce ADD COLUMN mena TEXT NOT NULL DEFAULT 'CZK';

UPDATE public.akce SET mena = 'EUR' WHERE id = '9a8f2720-45fd-4dcc-895b-7e1a685389e8';