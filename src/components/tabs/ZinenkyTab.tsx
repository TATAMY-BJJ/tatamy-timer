import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Pencil, Trash2, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ZinenkyTabProps {
  akceId: string;
  pocetZinenek: number;
}

export const ZinenkyTab = ({ akceId, pocetZinenek }: ZinenkyTabProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingZinenka, setEditingZinenka] = useState<number | null>(null);
  const [novyNazev, setNovyNazev] = useState("");
  const [deletingZinenka, setDeletingZinenka] = useState<number | null>(null);

  // Načíst existující žíněnky z databáze
  const { data: zinenky } = useQuery({
    queryKey: ["zinenky", akceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zinenky")
        .select("*")
        .eq("akce_id", akceId)
        .order("cislo");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Načíst aktivní úseky (běžící měření)
  const { data: aktivniUseky } = useQuery({
    queryKey: ["aktivni-useky", akceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("useky")
        .select(`
          *,
          rozhodci:rozhodci_id (
            cislo_id,
            jmeno,
            prijmeni
          )
        `)
        .eq("akce_id", akceId)
        .is("end_ts", null);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000, // Automatický refresh každých 5 sekund
  });

  // Update názvu žíněnky
  const updateNazevMutation = useMutation({
    mutationFn: async ({ cislo, nazev, casomeric }: { cislo: number; nazev: string; casomeric: string }) => {
      // Najdi žíněnku v DB
      const existujici = zinenky?.find(z => z.cislo === cislo);
      
      if (existujici) {
        // Update existující
        const { error } = await supabase
          .from("zinenky")
          .update({ 
            nazev: nazev || null,
            casomeric: casomeric || null
          })
          .eq("id", existujici.id);
        
        if (error) throw error;
      } else {
        // Vytvoř novou
        const { error } = await supabase
          .from("zinenky")
          .insert({
            akce_id: akceId,
            cislo: cislo,
            nazev: nazev || null,
            casomeric: casomeric || null,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zinenky", akceId] });
      queryClient.invalidateQueries({ queryKey: ["zinenka", akceId] });
      setEditingZinenka(null);
      setNovyNazev("");
      toast.success("Název žíněnky upraven");
    },
    onError: () => {
      toast.error("Chyba při ukládání názvu");
    },
  });

  const [novyCasomeric, setNovyCasomeric] = useState("");

  const handleEditClick = (cislo: number) => {
    const zinenka = zinenky?.find(z => z.cislo === cislo);
    setEditingZinenka(cislo);
    setNovyNazev(zinenka?.nazev || "");
    setNovyCasomeric(zinenka?.casomeric || "");
  };

  const handleSaveNazev = () => {
    if (editingZinenka !== null) {
      updateNazevMutation.mutate({ 
        cislo: editingZinenka, 
        nazev: novyNazev,
        casomeric: novyCasomeric
      });
    }
  };

  const getZinenkaNazev = (cislo: number) => {
    const zinenka = zinenky?.find(z => z.cislo === cislo);
    return zinenka?.nazev || `Žíněnka #${cislo}`;
  };

  const getAktivniRozhodci = (cislo: number) => {
    return aktivniUseky?.find(u => u.zinenka_cislo === cislo);
  };

  // Přidat novou žíněnku
  const addZinenkaMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("akce")
        .update({ pocet_zinenek: pocetZinenek + 1 })
        .eq("id", akceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["akce", akceId] });
      toast.success("Nová žíněnka přidána");
    },
    onError: () => {
      toast.error("Chyba při přidávání žíněnky");
    },
  });

  // Smazat žíněnku
  const deleteZinenkaMutation = useMutation({
    mutationFn: async (cislo: number) => {
      // Smazat žíněnku z DB
      const zinenka = zinenky?.find(z => z.cislo === cislo);
      if (zinenka) {
        const { error: deleteZinenkaError } = await supabase
          .from("zinenky")
          .delete()
          .eq("id", zinenka.id);

        if (deleteZinenkaError) throw deleteZinenkaError;
      }

      // Smazat všechny úseky spojené s touto žíněnkou
      const { error: deleteUsekyError } = await supabase
        .from("useky")
        .delete()
        .eq("akce_id", akceId)
        .eq("zinenka_cislo", cislo);

      if (deleteUsekyError) throw deleteUsekyError;

      // Snížit počet žíněnek jen pokud je to poslední
      if (cislo === pocetZinenek) {
        const { error: updateError } = await supabase
          .from("akce")
          .update({ pocet_zinenek: pocetZinenek - 1 })
          .eq("id", akceId);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["akce", akceId] });
      queryClient.invalidateQueries({ queryKey: ["zinenky", akceId] });
      queryClient.invalidateQueries({ queryKey: ["useky", akceId] });
      queryClient.invalidateQueries({ queryKey: ["soucty", akceId] });
      setDeletingZinenka(null);
      toast.success("Žíněnka smazána");
    },
    onError: () => {
      toast.error("Chyba při mazání žíněnky");
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Žíněnky</CardTitle>
              <CardDescription>
                Otevřete administraci jednotlivých žíněnek
              </CardDescription>
            </div>
            <Button
              onClick={() => addZinenkaMutation.mutate()}
              disabled={addZinenkaMutation.isPending}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Přidat žíněnku
            </Button>
          </div>
        </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: pocetZinenek }, (_, i) => i + 1).map((cislo) => (
            <div key={cislo} className="relative">
              <Button
                onClick={() => navigate(`/akce/${akceId}/zinenka/${cislo}`)}
                className="h-40 w-full text-xl font-bold relative"
                size="lg"
              >
                <div className="flex flex-col items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  <div className="text-center">
                    <div>{getZinenkaNazev(cislo)}</div>
                    {zinenky?.find(z => z.cislo === cislo)?.casomeric && (
                      <div className="text-sm font-normal opacity-80 mt-1">
                        Časoměřič: {zinenky.find(z => z.cislo === cislo)?.casomeric}
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-primary-foreground/20 text-sm font-normal">
                      {(() => {
                        const aktivni = getAktivniRozhodci(cislo);
                        if (aktivni) {
                          return (
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                              <span>ID {String(aktivni.rozhodci?.cislo_id).padStart(2, "0")}</span>
                              {aktivni.rozhodci?.jmeno && aktivni.rozhodci?.prijmeni && (
                                <span className="text-xs">
                                  ({aktivni.rozhodci.jmeno.charAt(0)}. {aktivni.rozhodci.prijmeni})
                                </span>
                              )}
                            </div>
                          );
                        }
                        return <span className="text-muted-foreground/60">—</span>;
                      })()}
                    </div>
                  </div>
                </div>
              </Button>
              
              <div className="absolute top-2 right-2 flex gap-1">
                <Dialog open={editingZinenka === cislo} onOpenChange={(open) => !open && setEditingZinenka(null)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(cislo);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-heading">Přejmenovat žíněnku #{cislo}</DialogTitle>
                    <DialogDescription>
                      Zadejte vlastní název pro tuto žíněnku (nechte prázdné pro výchozí název)
                    </DialogDescription>
                  </DialogHeader>
                   <div className="space-y-4 py-4">
                     <div className="space-y-2">
                       <Label htmlFor="nazev">Název žíněnky</Label>
                       <Input
                         id="nazev"
                         value={novyNazev}
                         onChange={(e) => setNovyNazev(e.target.value)}
                         placeholder={`Žíněnka #${cislo}`}
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="casomeric">Časoměřič (nepovinné)</Label>
                       <Input
                         id="casomeric"
                         value={novyCasomeric}
                         onChange={(e) => setNovyCasomeric(e.target.value)}
                         placeholder="Např. Jan Novák"
                       />
                     </div>
                   </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingZinenka(null)}>
                      Zrušit
                    </Button>
                    <Button onClick={handleSaveNazev} disabled={updateNazevMutation.isPending}>
                      Uložit
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingZinenka(cislo);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={deletingZinenka !== null} onOpenChange={(open) => !open && setDeletingZinenka(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Opravdu chcete smazat žíněnku #{deletingZinenka}?</AlertDialogTitle>
          <AlertDialogDescription>
            Tato akce je nevratná. Budou smazány všechny úseky měření spojené s touto žíněnkou včetně jejich součtů.
            {deletingZinenka === pocetZinenek && " Počet žíněnek bude snížen o 1."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deletingZinenka && deleteZinenkaMutation.mutate(deletingZinenka)}
            disabled={deleteZinenkaMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteZinenkaMutation.isPending ? "Mažu..." : "Smazat žíněnku"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
