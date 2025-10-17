-- Vytvoření tabulek pro měření času rozhodčích

-- Tabulka akcí (jednotlivé závodní dny)
CREATE TABLE public.akce (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum DATE NOT NULL,
  pocet_zinenek INTEGER NOT NULL CHECK (pocet_zinenek >= 1 AND pocet_zinenek <= 30),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabulka rozhodčích pro každou akci
CREATE TABLE public.rozhodci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  akce_id UUID NOT NULL REFERENCES public.akce(id) ON DELETE CASCADE,
  cislo_id INTEGER NOT NULL CHECK (cislo_id >= 0 AND cislo_id <= 99),
  jmeno TEXT,
  prijmeni TEXT,
  UNIQUE (akce_id, cislo_id)
);

-- Tabulka časových úseků měření
CREATE TABLE public.useky (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  akce_id UUID NOT NULL REFERENCES public.akce(id) ON DELETE CASCADE,
  zinenka_cislo INTEGER NOT NULL,
  rozhodci_id UUID NOT NULL REFERENCES public.rozhodci(id) ON DELETE CASCADE,
  start_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_ts TIMESTAMP WITH TIME ZONE
);

-- Unikátní index: rozhodčí může mít pouze jeden běžící úsek (end_ts IS NULL) v rámci jedné akce
CREATE UNIQUE INDEX idx_aktivni_mereni ON public.useky (akce_id, rozhodci_id) WHERE end_ts IS NULL;

-- Index pro rychlé vyhledávání úseků podle žíněnky
CREATE INDEX idx_useky_zinenka ON public.useky (akce_id, zinenka_cislo);

-- Index pro rychlé vyhledávání úseků podle rozhodčího
CREATE INDEX idx_useky_rozhodci ON public.useky (rozhodci_id);

-- Pohled pro součty času po rozhodčích a žínenkách (v milisekundách)
CREATE OR REPLACE VIEW public.soucty AS
SELECT 
  u.akce_id,
  u.zinenka_cislo,
  u.rozhodci_id,
  r.cislo_id,
  r.jmeno,
  r.prijmeni,
  COALESCE(SUM(EXTRACT(EPOCH FROM (u.end_ts - u.start_ts)) * 1000), 0)::BIGINT as celkem_ms
FROM public.useky u
JOIN public.rozhodci r ON u.rozhodci_id = r.id
WHERE u.end_ts IS NOT NULL
GROUP BY u.akce_id, u.zinenka_cislo, u.rozhodci_id, r.cislo_id, r.jmeno, r.prijmeni;

-- Enable RLS na všech tabulkách
ALTER TABLE public.akce ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rozhodci ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.useky ENABLE ROW LEVEL SECURITY;

-- Veřejný přístup ke všem tabulkám (bez autentizace podle specifikace)
CREATE POLICY "Veřejný přístup k akcím" ON public.akce FOR ALL USING (true);
CREATE POLICY "Veřejný přístup k rozhodčím" ON public.rozhodci FOR ALL USING (true);
CREATE POLICY "Veřejný přístup k úsekům" ON public.useky FOR ALL USING (true);

-- Testovací data
INSERT INTO public.akce (datum, pocet_zinenek) VALUES 
  ('2025-01-15', 12),
  ('2025-01-20', 8);

-- Testovací rozhodčí pro první akci
INSERT INTO public.rozhodci (akce_id, cislo_id, jmeno, prijmeni)
SELECT 
  (SELECT id FROM public.akce WHERE datum = '2025-01-15'),
  generate_series,
  CASE generate_series 
    WHEN 0 THEN 'Jan'
    WHEN 1 THEN 'Petra'
    WHEN 2 THEN 'Pavel'
    WHEN 3 THEN 'Marie'
    WHEN 4 THEN 'Tomáš'
    ELSE NULL
  END,
  CASE generate_series
    WHEN 0 THEN 'Novák'
    WHEN 1 THEN 'Svobodová'
    WHEN 2 THEN 'Dvořák'
    WHEN 3 THEN 'Nováková'
    WHEN 4 THEN 'Černý'
    ELSE NULL
  END
FROM generate_series(0, 4);