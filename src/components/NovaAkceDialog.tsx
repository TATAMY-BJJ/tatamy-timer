import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface NovaAkceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NovaAkceDialog = ({ open, onOpenChange }: NovaAkceDialogProps) => {
  const [datum, setDatum] = useState("");
  const [pocetZinenek, setPocetZinenek] = useState("12");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createAkce = useMutation({
    mutationFn: async () => {
      const pocet = parseInt(pocetZinenek);
      if (pocet < 1 || pocet > 30) {
        throw new Error("Počet žíněnek musí být mezi 1 a 30");
      }

      const { data, error } = await supabase
        .from("akce")
        .insert({
          datum,
          pocet_zinenek: pocet,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["akce"] });
      toast.success("Akce vytvořena");
      onOpenChange(false);
      navigate(`/akce/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Chyba při vytváření akce");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAkce.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Založit akci</DialogTitle>
            <DialogDescription>
              Vytvořte nový závodní den s daným počtem žíněnek
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="datum">Datum akce</Label>
              <Input
                id="datum"
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="pocet">Počet žíněnek (1-30)</Label>
              <Input
                id="pocet"
                type="number"
                min="1"
                max="30"
                value={pocetZinenek}
                onChange={(e) => setPocetZinenek(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Zrušit
            </Button>
            <Button 
              type="submit" 
              className="bg-secondary hover:bg-secondary/90"
              disabled={createAkce.isPending}
            >
              {createAkce.isPending ? "Vytváří se..." : "Vytvořit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
