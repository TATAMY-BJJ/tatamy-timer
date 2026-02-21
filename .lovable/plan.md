

## Problem

Na záložce Mzdy se délky žíněnek zobrazují podle toho, které záznamy existují v databázi — pokud pro některou žíněnku ještě nebyl vytvořen řádek (např. žíněnka 10), v seznamu chybí. Navíc pořadí závisí na pořadí z databáze místo jednoduchého sekvenčního řazení 1, 2, 3...

## Řešení

Na řádku 235 v `MzdyTab.tsx` se `zinenkyCisla` bere z `zinenky?.map(z => z.cislo)`, což vrací jen žíněnky, které mají záznam v DB. Místo toho se vždy použije sekvenční pole `[1, 2, 3, ..., pocetZinenek]`, aby byly všechny žíněnky zobrazeny ve správném pořadí bez ohledu na stav databáze.

## Technický detail

Změna v `src/components/tabs/MzdyTab.tsx`:

- Řádek 235: nahradit `zinenkyCisla` za `Array.from({ length: pocetZinenek }, (_, i) => i + 1)` — vždy generovat čísla 1 až N bez závislosti na existujících DB záznamech.

Jde o jednořádkovou opravu, žádné další soubory ani databáze se nemění.
