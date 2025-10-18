import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditAkceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  akce: {
    id: string;
    nazev: string | null;
    datum: string;
  };
}

export const EditAkceDialog = ({ open, onOpenChange, akce }: EditAkceDialogProps) => {
  const [nazev, setNazev] = useState(akce.nazev || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("akce")
        .update({ nazev: nazev.trim() || null })
        .eq("id", akce.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["akce"] });
      toast({
        title: "Název akce změněn",
        description: "Název akce byl úspěšně aktualizován",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit název akce",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upravit název akce</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nazev">Název akce</Label>
              <Input
                id="nazev"
                type="text"
                value={nazev}
                onChange={(e) => setNazev(e.target.value)}
                placeholder="Např. Krajské kolo"
                maxLength={100}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Datum: {new Date(akce.datum).toLocaleDateString("cs-CZ", {
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Ukládám..." : "Uložit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
