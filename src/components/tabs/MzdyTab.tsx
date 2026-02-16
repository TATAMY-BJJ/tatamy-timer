import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MzdyTabProps {
  akceId: string;
  pocetZinenek: number;
}

export const MzdyTab = ({ akceId, pocetZinenek }: MzdyTabProps) => {
  const [zaklad, setZaklad] = useState(3000);
  const [delkyZinenek, setDelkyZinenek] = useState<Record<number, { hodiny: number; minuty: number }>>(
    () => {
      const init: Record<number, { hodiny: number; minuty: number }> = {};
      for (let i = 1; i <= pocetZinenek; i++) {
        init[i] = { hodiny: 0, minuty: 0 };
      }
      return init;
    }
  );

  const { data: zinenky } = useQuery({
    queryKey: ["zinenky", akceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zinenky")
        .select("*")
        .eq("akce_id", akceId)
        .order("cislo");
      if (error) throw error;
      return data;
    },
  });

  const { data: soucty } = useQuery({
    queryKey: ["soucty", akceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("soucty")
        .select("*")
        .eq("akce_id", akceId);
      if (error) throw error;
      return data;
    },
  });

  const updateDelka = (cislo: number, field: "hodiny" | "minuty", value: number) => {
    setDelkyZinenek((prev) => ({
      ...prev,
      [cislo]: { ...prev[cislo], [field]: value },
    }));
  };

  const roundTo500 = (value: number) => Math.round(value / 500) * 500;

  const vypocty = useMemo(() => {
    if (!soucty || soucty.length === 0) return [];

    // Group soucty by rozhodci_id — each row has rozhodci_id, zinenka_cislo, celkem_ms
    // Build per-referee data
    const refereeMap = new Map<
      string,
      { cislo_id: number; jmeno: string; prijmeni: string; zinenky: Map<number, number> }
    >();

    for (const row of soucty) {
      if (!row.rozhodci_id || row.zinenka_cislo == null) continue;
      if (!refereeMap.has(row.rozhodci_id)) {
        refereeMap.set(row.rozhodci_id, {
          cislo_id: row.cislo_id ?? 0,
          jmeno: row.jmeno ?? "",
          prijmeni: row.prijmeni ?? "",
          zinenky: new Map(),
        });
      }
      const ref = refereeMap.get(row.rozhodci_id)!;
      const existing = ref.zinenky.get(row.zinenka_cislo) ?? 0;
      ref.zinenky.set(row.zinenka_cislo, existing + (row.celkem_ms ?? 0));
    }

    const results: {
      cislo_id: number;
      jmeno: string;
      odpracovanoMin: number;
      stoProcentMin: number;
      pomer: number;
      mzda: number;
    }[] = [];

    for (const [, ref] of refereeMap) {
      let totalOdpracovanoMs = 0;
      let totalStoProcentMin = 0;

      for (const [zinenkaCislo, casMs] of ref.zinenky) {
        totalOdpracovanoMs += casMs;
        const delka = delkyZinenek[zinenkaCislo];
        if (delka) {
          const delkaMin = delka.hodiny * 60 + delka.minuty;
          totalStoProcentMin += delkaMin / 2;
        }
      }

      const odpracovanoMin = Math.round(totalOdpracovanoMs / 60000);
      const pomer = totalStoProcentMin > 0 ? odpracovanoMin / totalStoProcentMin : 0;
      const mzda = totalStoProcentMin > 0 ? roundTo500(zaklad * pomer) : 0;

      results.push({
        cislo_id: ref.cislo_id,
        jmeno: `${ref.jmeno} ${ref.prijmeni}`.trim(),
        odpracovanoMin,
        stoProcentMin: Math.round(totalStoProcentMin),
        pomer,
        mzda,
      });
    }

    results.sort((a, b) => a.cislo_id - b.cislo_id);
    return results;
  }, [soucty, delkyZinenek, zaklad]);

  const zinenkyCisla = zinenky?.map((z) => z.cislo) ?? Array.from({ length: pocetZinenek }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Základní částka */}
      <Card>
        <CardHeader>
          <CardTitle>Nastavení</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label htmlFor="zaklad">Základní částka (100 %)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="zaklad"
                type="number"
                value={zaklad}
                onChange={(e) => setZaklad(Number(e.target.value))}
                min={0}
                step={100}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">Kč</span>
            </div>
          </div>

          {/* Délky žíněnek */}
          <div>
            <Label>Délka žíněnek</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {zinenkyCisla.map((cislo) => {
                const delka = delkyZinenek[cislo] ?? { hodiny: 0, minuty: 0 };
                return (
                  <div key={cislo} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                    <span className="text-sm font-medium min-w-[70px]">Žíněnka {cislo}</span>
                    <Input
                      type="number"
                      className="w-16"
                      value={delka.hodiny}
                      onChange={(e) => updateDelka(cislo, "hodiny", Number(e.target.value))}
                      min={0}
                      max={24}
                    />
                    <span className="text-xs text-muted-foreground">h</span>
                    <Input
                      type="number"
                      className="w-16"
                      value={delka.minuty}
                      onChange={(e) => updateDelka(cislo, "minuty", Number(e.target.value))}
                      min={0}
                      max={59}
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabulka výpočtů */}
      <Card>
        <CardHeader>
          <CardTitle>Výpočet mezd</CardTitle>
        </CardHeader>
        <CardContent>
          {vypocty.length === 0 ? (
            <p className="text-muted-foreground text-sm">Žádná data k zobrazení. Zadejte délky žíněnek a ujistěte se, že existují záznamy v součtech.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Jméno</TableHead>
                  <TableHead className="text-right">Odpracováno (min)</TableHead>
                  <TableHead className="text-right">100 % (min)</TableHead>
                  <TableHead className="text-right">Poměr (%)</TableHead>
                  <TableHead className="text-right">Mzda (Kč)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vypocty.map((v) => (
                  <TableRow key={v.cislo_id}>
                    <TableCell>{v.cislo_id}</TableCell>
                    <TableCell>{v.jmeno}</TableCell>
                    <TableCell className="text-right">{v.odpracovanoMin}</TableCell>
                    <TableCell className="text-right">{v.stoProcentMin}</TableCell>
                    <TableCell className="text-right">
                      {v.stoProcentMin > 0 ? `${(v.pomer * 100).toFixed(1)} %` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {v.mzda.toLocaleString("cs-CZ")} Kč
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
