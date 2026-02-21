

# Persistentní ukládání délek žíněnek a základní částky

## Co se změní

Délky žíněnek a základní mzdová částka se budou ukládat do databáze, takže přetrvají i po obnovení stránky.

## Technické kroky

### 1. Databázová migrace

- Přidat sloupce `delka_hodiny` (integer, default 0) a `delka_minuty` (integer, default 0) do tabulky `zinenky`
- Přidat sloupec `mzdy_zaklad` (integer, default 3000) do tabulky `akce`

### 2. Úprava komponenty `src/components/tabs/MzdyTab.tsx`

- Načítat délky žíněnek z databáze (query na `zinenky`) a základní částku z tabulky `akce`
- Při změně délky žíněnky automaticky uložit novou hodnotu do databáze (upsert do `zinenky`)
- Při změně základní částky automaticky uložit do `akce`
- Použít debounce nebo on-blur ukládání, aby se neposílal request při každém stisku klávesy
- Zobrazit vizuální potvrzení uložení (např. krátký toast nebo indikátor)

### 3. Žádné nové tabulky ani RLS změny

Existující RLS politiky na `zinenky` a `akce` již pokrývají čtení i zápis.
