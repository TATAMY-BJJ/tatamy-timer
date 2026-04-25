import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
import { toast } from "@/hooks/use-toast";

interface MzdyTabProps {
  akceId: string;
  pocetZinenek: number;
}

export const MzdyTab = ({ akceId, pocetZinenek }: MzdyTabProps) => {
  const queryClient = useQueryClient();

  // Fetch akce for mzdy_zaklad
  const { data: akce } = useQuery({
    queryKey: ["akce", akceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("akce")
        .select("*")
        .eq("id", akceId)
        .single();
      if (error) throw error;
      return data;
    },
  });

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

  // Local state initialized from DB
  const [zaklad, setZaklad] = useState(3000);
  const [zakladInited, setZakladInited] = useState(false);
  const [delkyZinenek, setDelkyZinenek] = useState<Record<number, { hodiny: number; minuty: number }>>({});
  const [delkyInited, setDelkyInited] = useState(false);

  // Init zaklad from DB
  useEffect(() => {
    if (akce && !zakladInited) {
      setZaklad((akce as any).mzdy_zaklad ?? 3000);
      setZakladInited(true);
    }
  }, [akce, zakladInited]);

  // Init delky from DB
  useEffect(() => {
    if (zinenky && !delkyInited) {
      const init: Record<number, { hodiny: number; minuty: number }> = {};
      for (let i = 1; i <= pocetZinenek; i++) {
        const z = zinenky.find((x) => x.cislo === i);
        init[i] = {
          hodiny: (z as any)?.delka_hodiny ?? 0,
          minuty: (z as any)?.delka_minuty ?? 0,
        };
      }
      setDelkyZinenek(init);
      setDelkyInited(true);
    }
  }, [zinenky, delkyInited, pocetZinenek]);

  // Debounced save for zaklad
  const zakladTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveZakladMutation = useMutation({
    mutationFn: async (value: number) => {
      const { error } = await supabase
        .from("akce")
        .update({ mzdy_zaklad: value } as any)
        .eq("id", akceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["akce", akceId] });
    },
    onError: () => {
      toast({ title: "Chyba", description: "Nepodařilo se uložit základní částku.", variant: "destructive" });
    },
  });

  const handleZakladChange = useCallback((value: number) => {
    setZaklad(value);
    if (zakladTimerRef.current) clearTimeout(zakladTimerRef.current);
    zakladTimerRef.current = setTimeout(() => {
      saveZakladMutation.mutate(value);
    }, 800);
  }, [saveZakladMutation]);

  // Debounced save for delka
  const delkaTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const saveDelkaMutation = useMutation({
    mutationFn: async ({ cislo, hodiny, minuty }: { cislo: number; hodiny: number; minuty: number }) => {
      // Check if zinenka row exists
      const existing = zinenky?.find((z) => z.cislo === cislo);
      if (existing) {
        const { error } = await supabase
          .from("zinenky")
          .update({ delka_hodiny: hodiny, delka_minuty: minuty } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("zinenky")
          .insert({ akce_id: akceId, cislo, delka_hodiny: hodiny, delka_minuty: minuty } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zinenky", akceId] });
    },
    onError: () => {
      toast({ title: "Chyba", description: "Nepodařilo se uložit délku žíněnky.", variant: "destructive" });
    },
  });

  const updateDelka = useCallback((cislo: number, field: "hodiny" | "minuty", value: number) => {
    setDelkyZinenek((prev) => {
      const updated = { ...prev, [cislo]: { ...prev[cislo], [field]: value } };
      // Debounced save
      if (delkaTimersRef.current[cislo]) clearTimeout(delkaTimersRef.current[cislo]);
      delkaTimersRef.current[cislo] = setTimeout(() => {
        const d = updated[cislo];
        saveDelkaMutation.mutate({ cislo, hodiny: d.hodiny, minuty: d.minuty });
      }, 800);
      return updated;
    });
  }, [saveDelkaMutation]);

  const mena = ((akce as any)?.mena ?? "CZK") as string;
  const roundStep = mena === "EUR" ? 5 : 500;
  const roundToStep = (value: number) => Math.round(value / roundStep) * roundStep;

  const vypocty = useMemo(() => {
    if (!soucty || soucty.length === 0) return [];

    const refereeMap = new Map<
      string,
      {
        cislo_id: number;
        jmeno: string;
        prijmeni: string;
        perZinenka: { cislo: number; odpracovanoMin: number; stoProcentMin: number; pomer: number; mzda: number }[];
      }
    >();

    for (const row of soucty) {
      if (!row.rozhodci_id || row.zinenka_cislo == null) continue;
      if (!refereeMap.has(row.rozhodci_id)) {
        refereeMap.set(row.rozhodci_id, {
          cislo_id: row.cislo_id ?? 0,
          jmeno: row.jmeno ?? "",
          prijmeni: row.prijmeni ?? "",
          perZinenka: [],
        });
      }
    }

    const msMap = new Map<string, Map<number, number>>();
    for (const row of soucty) {
      if (!row.rozhodci_id || row.zinenka_cislo == null) continue;
      if (!msMap.has(row.rozhodci_id)) msMap.set(row.rozhodci_id, new Map());
      const rm = msMap.get(row.rozhodci_id)!;
      rm.set(row.zinenka_cislo, (rm.get(row.zinenka_cislo) ?? 0) + (row.celkem_ms ?? 0));
    }

    for (const [refId, ref] of refereeMap) {
      const matTimes = msMap.get(refId);
      if (!matTimes) continue;

      for (const [zinenkaCislo, casMs] of matTimes) {
        const delka = delkyZinenek[zinenkaCislo];
        const delkaMin = delka ? delka.hodiny * 60 + delka.minuty : 0;
        const stoProcentMin = delkaMin / 2;
        const odpracovanoMin = Math.round(casMs / 60000);
        const pomer = stoProcentMin > 0 ? odpracovanoMin / stoProcentMin : 0;
        const mzda = stoProcentMin > 0 ? zaklad * pomer : 0;

        ref.perZinenka.push({
          cislo: zinenkaCislo,
          odpracovanoMin,
          stoProcentMin: Math.round(stoProcentMin),
          pomer,
          mzda,
        });
      }

      ref.perZinenka.sort((a, b) => a.cislo - b.cislo);
    }

    const results = Array.from(refereeMap.values()).map((ref) => {
      const sumMzda = ref.perZinenka.reduce((s, z) => s + z.mzda, 0);
      return {
        cislo_id: ref.cislo_id,
        jmeno: `${ref.jmeno} ${ref.prijmeni}`.trim(),
        perZinenka: ref.perZinenka,
        celkovaMzda: roundToStep(sumMzda),
      };
    });

    results.sort((a, b) => a.cislo_id - b.cislo_id);
    return results;
  }, [soucty, delkyZinenek, zaklad]);

  const nazevZinenky = useCallback((cislo: number) => {
    return zinenky?.find(z => z.cislo === cislo)?.nazev || `Žíněnka ${cislo}`;
  }, [zinenky]);

  // mena already declared above
  const menaSymbol = mena === "EUR" ? "€" : "Kč";
  const menaLocale = mena === "EUR" ? "sk-SK" : "cs-CZ";
  const formatMena = useCallback(
    (value: number) => `${Math.round(value).toLocaleString(menaLocale)} ${menaSymbol}`,
    [menaLocale, menaSymbol]
  );

  const zinenkyCisla = Array.from({ length: pocetZinenek }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nastavení</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label htmlFor="zaklad">Základní částka (100 %) per žíněnka</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="zaklad"
                type="number"
                value={zaklad}
                onChange={(e) => handleZakladChange(Number(e.target.value))}
                min={0}
                step={100}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">{menaSymbol}</span>
            </div>
          </div>

          <div>
            <Label>Délka žíněnek</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {zinenkyCisla.map((cislo) => {
                const delka = delkyZinenek[cislo] ?? { hodiny: 0, minuty: 0 };
                return (
                  <div key={cislo} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                    <span className="text-sm font-medium min-w-[70px]">{nazevZinenky(cislo)}</span>
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

      <Card>
        <CardHeader>
          <CardTitle>Výpočet mezd</CardTitle>
        </CardHeader>
        <CardContent>
          {vypocty.length === 0 ? (
            <p className="text-muted-foreground text-sm">Žádná data k zobrazení. Zadejte délky žíněnek a ujistěte se, že existují záznamy v součtech.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Jméno</TableHead>
                    <TableHead className="text-center">Žíněnka</TableHead>
                    <TableHead className="text-right">Odpracováno (min)</TableHead>
                    <TableHead className="text-right">100 % (min)</TableHead>
                    <TableHead className="text-right">Poměr</TableHead>
                    <TableHead className="text-right">Mzda za ž.</TableHead>
                    <TableHead className="text-right font-semibold">Celkem (Kč)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vypocty.map((v) => (
                    v.perZinenka.length === 0 ? (
                      <TableRow key={v.cislo_id}>
                        <TableCell>{v.cislo_id}</TableCell>
                        <TableCell>{v.jmeno}</TableCell>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">—</TableCell>
                        <TableCell className="text-right font-semibold">0 Kč</TableCell>
                      </TableRow>
                    ) : (
                      v.perZinenka.map((z, idx) => (
                        <TableRow key={`${v.cislo_id}-${z.cislo}`} className={idx === 0 ? "border-t-2" : ""}>
                          {idx === 0 && (
                            <>
                              <TableCell rowSpan={v.perZinenka.length} className="align-top">{v.cislo_id}</TableCell>
                              <TableCell rowSpan={v.perZinenka.length} className="align-top">{v.jmeno}</TableCell>
                            </>
                          )}
                          <TableCell className="text-center">{nazevZinenky(z.cislo)}</TableCell>
                          <TableCell className="text-right">{z.odpracovanoMin}</TableCell>
                          <TableCell className="text-right">{z.stoProcentMin}</TableCell>
                          <TableCell className="text-right">
                            {z.stoProcentMin > 0 ? `${(z.pomer * 100).toFixed(1)} %` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {z.stoProcentMin > 0 ? `${Math.round(z.mzda).toLocaleString("cs-CZ")} Kč` : "—"}
                          </TableCell>
                          {idx === 0 && (
                            <TableCell rowSpan={v.perZinenka.length} className="text-right font-semibold align-top">
                              {v.celkovaMzda.toLocaleString("cs-CZ")} Kč
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
