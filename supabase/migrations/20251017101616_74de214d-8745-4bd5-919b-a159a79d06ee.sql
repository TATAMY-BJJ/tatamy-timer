-- Vytvoření tabulky pro žíněnky s možností vlastního názvu
CREATE TABLE public.zinenky (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  akce_id UUID NOT NULL REFERENCES public.akce(id) ON DELETE CASCADE,
  cislo INTEGER NOT NULL,
  nazev TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(akce_id, cislo)
);

-- Enable Row Level Security
ALTER TABLE public.zinenky ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Veřejný přístup k žínenkám" 
ON public.zinenky 
FOR ALL 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_zinenky_akce_id ON public.zinenky(akce_id);