-- Přidat sloupec pro jméno časoměřiče do tabulky zinenky
ALTER TABLE public.zinenky
ADD COLUMN casomeric text;