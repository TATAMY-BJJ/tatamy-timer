
# Nová záložka "Mzdy" pro výpočet odměn rozhodčích

## Shrnutí požadavku

Nová záložka "Mzdy" v detailu akce (viditelná pouze pro administrátora), která:

1. Umožní zadat **základní částku** (default 3 000 Kč) platnou pro všechny rozhodčí
2. Umožní zadat **délku každé žíněnky** (hodiny a minuty)
3. Automaticky vypočítá mzdu každého rozhodčího na základě:
   - 100% odpracovaného času = polovina délky žíněnky (protože na žíněnce jsou 2 rozhodčí)
   - Skutečný odpracovaný čas se bere z existujících dat (tabulka součtů)
   - Poměr skutečného času ku 100% se aplikuje na základní částku
   - Výsledek se zaokrouhlí matematicky na nejbližších 500 Kč

### Příklad výpočtu
- Žíněnka trvala 7h 30min = 450 min
- 100% pro rozhodčího = 225 min
- Rozhodčí odpracoval 280 min -> poměr = 280/225 = 124,4%
- Mzda = 3000 x 1,244 = 3 733 Kč -> zaokrouhleno na **3 500 Kč**

---

## Technický plán

### 1. Nová komponenta `src/components/tabs/MzdyTab.tsx`

- Přijímá prop `akceId` a `pocetZinenek`
- Obsahuje:
  - Input pro základní částku (default 3 000 Kč) - uloženo v local state
  - Sekci pro zadání délky každé žíněnky (hodiny + minuty) pro každou žíněnku v akci
  - Tabulku rozhodčích s výpočtem mzdy

- **Data z databáze**: Použije existující view `soucty` (filtr na `akce_id`) pro odpracovaný čas a tabulku `zinenky` pro seznam žíněnek
- Také použije `useky` data pro zjištění, na které žíněnce rozhodčí pracoval

- **Logika výpočtu**:
  1. Pro každého rozhodčího zjistit, na kterých žíněnkách pracoval a kolik celkem odpracoval (ze `soucty` view, per žíněnka)
  2. Pro každou žíněnku vzít zadanou délku / 2 = 100% čas
  3. Sečíst 100% časy žíněnek, na kterých rozhodčí pracoval = celkový 100% čas
  4. Poměr = skutečný čas / celkový 100% čas
  5. Mzda = základ x poměr, zaokrouhleno na nejbližších 500 Kč

- **UI**: Tabulka se sloupci: ID, Jméno, Odpracováno (min), 100% čas (min), Poměr (%), Mzda (Kč)

### 2. Úprava `src/pages/AkceDetail.tsx`

- Import `MzdyTab`
- Přidání záložky "Mzdy" do TabsList (admin only) - celkem 5 záložek pro admina
- Úprava grid-cols z `grid-cols-4` na `grid-cols-5` pro admina

### 3. Bez databázových změn

Délky žíněnek a základní částka budou v lokálním stavu komponenty (session-only). Pokud bude potřeba persistovat, lze přidat později. Výpočet je čistě na frontendu z existujících dat.
