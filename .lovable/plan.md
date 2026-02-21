
# Úprava výpočtu mezd -- per žíněnka

## Jak to bude fungovat

Pro každého rozhodčího se mzda počítá za každou žíněnku zvlášť a pak se sečte:

1. Žíněnka trvá Y minut, 100% = Y / 2
2. Rozhodčí na ní odpískal X minut
3. Poměr = X / (Y / 2)
4. Mzda za žíněnku = základ (3 000 Kč) x poměr
5. Celková mzda = součet mezd za všechny žíněnky, zaokrouhleno na nejbližších 500 Kč

### Příklad
- Žíněnka 1: 480 min, odpískal 200 min -> 200/240 = 83,3% -> 2 500 Kč
- Žíněnka 2: 360 min, odpískal 150 min -> 150/180 = 83,3% -> 2 500 Kč
- Celkem: 5 000 Kč (zaokrouhlení beze změny)

---

## Technické změny

### Úprava `src/components/tabs/MzdyTab.tsx`

Komponenta již existuje, bude přepsána výpočetní logika:

**Aktuální logika** (chybná): sčítá veškerý čas rozhodčího dohromady a porovnává s celkovým 100% časem.

**Nová logika**:
1. Z view `soucty` získat řádky per rozhodčí per žíněnka (`rozhodci_id`, `zinenka_cislo`, `celkem_ms`)
2. Pro každý řádek vypočítat mzdu za danou žíněnku: `zaklad * (celkem_ms_min / (delka_zinenky_min / 2))`
3. Sečíst mzdy za všechny žíněnky daného rozhodčího
4. Zaokrouhlit celkový součet na nejbližších 500 Kč

**UI tabulka** -- nové sloupce:
- ID, Jméno
- Detail per žíněnka (které žíněnky, kolik minut, poměr)
- Celkem mzda (Kč) -- zaokrouhlená

Žádné databázové změny nejsou potřeba -- vše se počítá z existujícího view `soucty`.
