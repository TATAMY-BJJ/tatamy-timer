

## Propsání názvů žíněnek v záložce Mzdy

### Problém
Na záložce Mzdy se všude zobrazuje jen číslo žíněnky (např. "Žíněnka 1", "2"), přestože žíněnky mají v databázi uložený vlastní název (např. "MAT 1 KIDS").

### Řešení
Vytvořit pomocnou mapu `cislo -> nazev` z načtených dat `zinenky` a použít ji na dvou místech:

1. **Nastavení délek** (řádek 266) -- místo "Žíněnka 1" zobrazit název, pokud existuje, např. "MAT 1 KIDS", jinak fallback "Žíněnka 1"
2. **Tabulka výpočtů** (řádek 333) -- ve sloupci "Žíněnka" místo pouhého čísla zobrazit název, pokud existuje

### Technický detail

Změny v `src/components/tabs/MzdyTab.tsx`:

- Přidat helper funkci/mapu, která pro dané číslo žíněnky vrátí název z DB nebo fallback:
  ```
  const nazevZinenky = (cislo) => zinenky?.find(z => z.cislo === cislo)?.nazev || `Žíněnka ${cislo}`
  ```
- Řádek 266: nahradit `Žíněnka {cislo}` za výsledek helperu
- Řádek 333: nahradit `{z.cislo}` za výsledek helperu (nebo zobrazit obojí -- název + číslo)

Žádné databázové změny nejsou potřeba.
