import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractItemsFromExcel, extractItemsFromPdf, parseRozpis, type RozpisResult } from "@/lib/rozpisParser";

interface Props { akceId: string; pocetZinenek: number }

export const ImportRozpisDialog = ({ akceId, pocetZinenek }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [data, setData] = useState<RozpisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onFile = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    try {
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      const items = isPdf ? await extractItemsFromPdf(file) : await extractItemsFromExcel(file);
      const result = parseRozpis(items, isPdf ? 3 : 0);
      if (!result.rozhodci.length && !result.zinenky.length) {
        toast.error("V souboru jsme nenašli žádné rozhodčí ani žíněnky");
      } else setData(result);
    } catch (e) {
      console.error(e);
      toast.error("Soubor se nepodařilo přečíst");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const refs = data.rozhodci.filter((r) => r.jmeno || r.prijmeni).map((r) => ({
        akce_id: akceId, cislo_id: r.cislo_id, jmeno: r.jmeno.trim() || null, prijmeni: r.prijmeni.trim() || null,
      }));
      if (refs.length) {
        const { error } = await supabase.from("rozhodci").upsert(refs, { onConflict: "akce_id,cislo_id" });
        if (error) throw error;
      }
      const { data: existing, error: e1 } = await supabase.from("zinenky").select("id,cislo").eq("akce_id", akceId);
      if (e1) throw e1;
      for (const z of data.zinenky) {
        const row = existing?.find((e) => e.cislo === z.cislo);
        const payload = { nazev: z.nazev.trim() || null, casomeric: z.casomeric.trim() || null };
        const { error } = row
          ? await supabase.from("zinenky").update(payload).eq("id", row.id)
          : await supabase.from("zinenky").insert({ akce_id: akceId, cislo: z.cislo, ...payload });
        if (error) throw error;
      }
      const maxCislo = Math.max(pocetZinenek, ...data.zinenky.map((z) => z.cislo));
      if (maxCislo !== pocetZinenek) {
        const { error } = await supabase.from("akce").update({ pocet_zinenek: maxCislo }).eq("id", akceId);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["rozhodci", akceId] });
      qc.invalidateQueries({ queryKey: ["zinenky", akceId] });
      qc.invalidateQueries({ queryKey: ["akce", akceId] });
      toast.success(`Importováno: ${refs.length} rozhodčích, ${data.zinenky.length} žíněnek`);
      setData(null);
    } catch (e) {
      console.error(e);
      toast.error("Import se nepodařilo uložit");
    } finally {
      setSaving(false);
    }
  };

  const setRef = (i: number, k: "jmeno" | "prijmeni", v: string) =>
    setData((d) => d && { ...d, rozhodci: d.rozhodci.map((r, j) => (j === i ? { ...r, [k]: v } : r)) });
  const setZin = (i: number, k: "nazev" | "casomeric", v: string) =>
    setData((d) => d && { ...d, zinenky: d.zinenky.map((z, j) => (j === i ? { ...z, [k]: v } : z)) });

  return (
    <>
      <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={loading}>
        <Upload className="mr-2 h-4 w-4" />
        {loading ? "Načítám rozpis..." : "Importovat rozpis (PDF / Excel)"}
      </Button>

      <Dialog open={!!data} onOpenChange={(o) => !o && setData(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Náhled importu</DialogTitle>
            <DialogDescription>Zkontrolujte a případně opravte údaje. Uložením se přepíší stávající jména u stejných ID a žíněnek.</DialogDescription>
          </DialogHeader>
          {data && (
            <Tabs defaultValue="rozhodci">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rozhodci">Rozhodčí ({data.rozhodci.length})</TabsTrigger>
                <TabsTrigger value="zinenky">Žíněnky ({data.zinenky.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="rozhodci">
                <table className="w-full text-sm">
                  <thead><tr className="text-left"><th className="p-2 text-right w-14">ID</th><th className="p-2">Jméno</th><th className="p-2">Příjmení</th></tr></thead>
                  <tbody>
                    {data.rozhodci.map((r, i) => (
                      <tr key={r.cislo_id} className="even:bg-muted/50">
                        <td className="p-2 text-right font-bold">{String(r.cislo_id).padStart(2, "0")}</td>
                        <td className="p-1"><Input value={r.jmeno} onChange={(e) => setRef(i, "jmeno", e.target.value)} /></td>
                        <td className="p-1"><Input value={r.prijmeni} onChange={(e) => setRef(i, "prijmeni", e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>
              <TabsContent value="zinenky">
                <table className="w-full text-sm">
                  <thead><tr className="text-left"><th className="p-2 text-right w-14">Č.</th><th className="p-2">Název</th><th className="p-2">Časoměřič</th></tr></thead>
                  <tbody>
                    {data.zinenky.map((z, i) => (
                      <tr key={z.cislo} className="even:bg-muted/50">
                        <td className="p-2 text-right font-bold">{z.cislo}</td>
                        <td className="p-1"><Input value={z.nazev} onChange={(e) => setZin(i, "nazev", e.target.value)} /></td>
                        <td className="p-1"><Input value={z.casomeric} placeholder="—" onChange={(e) => setZin(i, "casomeric", e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setData(null)}>Zrušit</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Ukládám..." : "Uložit import"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
