import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Pencil } from "lucide-react";
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

  // Update názvu žíněnky
  const updateNazevMutation = useMutation({
    mutationFn: async ({ cislo, nazev }: { cislo: number; nazev: string }) => {
      // Najdi žíněnku v DB
      const existujici = zinenky?.find(z => z.cislo === cislo);
      
      if (existujici) {
        // Update existující
        const { error } = await supabase
          .from("zinenky")
          .update({ nazev: nazev || null })
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

  const handleEditClick = (cislo: number) => {
    const zinenka = zinenky?.find(z => z.cislo === cislo);
    setEditingZinenka(cislo);
    setNovyNazev(zinenka?.nazev || "");
  };

  const handleSaveNazev = () => {
    if (editingZinenka !== null) {
      updateNazevMutation.mutate({ cislo: editingZinenka, nazev: novyNazev });
    }
  };

  const getZinenkaNazev = (cislo: number) => {
    const zinenka = zinenky?.find(z => z.cislo === cislo);
    return zinenka?.nazev || `Žíněnka #${cislo}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Žíněnky</CardTitle>
        <CardDescription>
          Otevřete administraci jednotlivých žíněnek
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: pocetZinenek }, (_, i) => i + 1).map((cislo) => (
            <div key={cislo} className="relative">
              <Button
                onClick={() => navigate(`/akce/${akceId}/zinenka/${cislo}`)}
                className="h-24 w-full text-xl font-bold bg-secondary hover:bg-secondary/90"
                size="lg"
              >
                <div className="flex flex-col items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  <span className="text-center">{getZinenkaNazev(cislo)}</span>
                </div>
              </Button>
              
              <Dialog open={editingZinenka === cislo} onOpenChange={(open) => !open && setEditingZinenka(null)}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
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
                    <DialogTitle>Přejmenovat žíněnku #{cislo}</DialogTitle>
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
