import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditZinenkaDialogProps {
  akceId: string;
  cislo: number;
  currentNazev: string | null;
  currentCasomeric: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditZinenkaDialog = ({
  akceId,
  cislo,
  currentNazev,
  currentCasomeric,
  open,
  onOpenChange,
}: EditZinenkaDialogProps) => {
  const [nazev, setNazev] = useState(currentNazev || "");
  const [casomeric, setCasomeric] = useState(currentCasomeric || "");
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Zkontroluj, zda záznam existuje
      const { data: existing } = await supabase
        .from("zinenky")
        .select("id")
        .eq("akce_id", akceId)
        .eq("cislo", cislo)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from("zinenky")
          .update({ 
            nazev: nazev.trim() || null,
            casomeric: casomeric.trim() || null
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("zinenky")
          .insert({
            akce_id: akceId,
            cislo,
            nazev: nazev.trim() || null,
            casomeric: casomeric.trim() || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zinenky", akceId] });
      toast.success("Název žíněnky uložen");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Chyba při ukládání názvu");
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Přejmenovat žíněnku #{cislo}</DialogTitle>
          <DialogDescription>
            Zadejte vlastní název pro tuto žíněnku (volitelné)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nazev">Název</Label>
            <Input
              id="nazev"
              value={nazev}
              onChange={(e) => setNazev(e.target.value)}
              placeholder="Např. Hlavní žíněnka"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="casomeric">Časoměřič (nepovinné)</Label>
            <Input
              id="casomeric"
              value={casomeric}
              onChange={(e) => setCasomeric(e.target.value)}
              placeholder="Např. Jan Novák"
              maxLength={100}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
