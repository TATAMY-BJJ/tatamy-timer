
ALTER TABLE public.zinenky ADD COLUMN delka_hodiny integer NOT NULL DEFAULT 0;
ALTER TABLE public.zinenky ADD COLUMN delka_minuty integer NOT NULL DEFAULT 0;
ALTER TABLE public.akce ADD COLUMN mzdy_zaklad integer NOT NULL DEFAULT 3000;
