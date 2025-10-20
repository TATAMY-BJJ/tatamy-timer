import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { NovaAkceDialog } from "@/components/NovaAkceDialog";
import { EditAkceDialog } from "@/components/EditAkceDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { TatamyLogo } from "@/components/TatamyLogo";
const AkceList = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [akceToEdit, setAkceToEdit] = useState<{
    id: string;
    nazev: string | null;
    datum: string;
  } | null>(null);
  const [akceToDelete, setAkceToDelete] = useState<{
    id: string;
    datum: string;
  } | null>(null);
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const {
    data: akce,
    isLoading
  } = useQuery({
    queryKey: ["akce"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("akce").select("*").order("datum", {
        ascending: false
      });
      if (error) throw error;
      return data;
    }
  });
  const deleteMutation = useMutation({
    mutationFn: async (akceId: string) => {
      const {
        error
      } = await supabase.from("akce").delete().eq("id", akceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["akce"]
      });
      toast({
        title: "Akce smazána",
        description: "Akce byla úspěšně smazána"
      });
      setDeleteDialogOpen(false);
      setAkceToDelete(null);
    },
    onError: error => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat akci",
        variant: "destructive"
      });
      console.error(error);
    }
  });
  const handleEditClick = (akce: {
    id: string;
    nazev: string | null;
    datum: string;
  }) => {
    setAkceToEdit(akce);
    setEditDialogOpen(true);
  };
  const handleDeleteClick = (akce: {
    id: string;
    datum: string;
  }) => {
    setAkceToDelete(akce);
    setDeleteDialogOpen(true);
  };
  const handleConfirmDelete = () => {
    if (akceToDelete) {
      deleteMutation.mutate(akceToDelete.id);
    }
  };
  return <div className="min-h-screen bg-background p-4 md:p-8">
      <TatamyLogo />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">TATAMY | EVIDENCE ROZHODČÍCH</h1>
            <p className="text-muted-foreground mt-1">Správa závodních dnů</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-secondary hover:bg-secondary/90" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Založit akci
          </Button>
        </div>

        {isLoading ? <div className="text-center py-12">
            <p className="text-muted-foreground">Načítání...</p>
          </div> : akce && akce.length > 0 ? <div className="grid gap-4">
            {akce.map(akce => <Card key={akce.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-xl">
                        {akce.nazev && `${akce.nazev} · `}
                        {new Date(akce.datum).toLocaleDateString("cs-CZ", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                      </CardTitle>
                      <CardDescription>
                        Počet žíněnek: {akce.pocet_zinenek}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={e => {
                e.stopPropagation();
                handleEditClick(akce);
              }} className="shrink-0">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/akce/${akce.id}`)} className="flex-1">
                      Otevřít detail →
                    </Button>
                    <Button variant="destructive" size="sm" onClick={e => {
                e.stopPropagation();
                handleDeleteClick(akce);
              }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>)}
          </div> : <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Zatím nejsou žádné akce
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                Vytvořit první akci
              </Button>
            </CardContent>
          </Card>}
      </div>

      <NovaAkceDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      
      {akceToEdit && <EditAkceDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} akce={akceToEdit} />}
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat akci?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat akci{" "}
              <strong>
                {akceToDelete && new Date(akceToDelete.datum).toLocaleDateString("cs-CZ", {
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
              </strong>
              ? Tato akce bude nenávratně odstraněna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default AkceList;