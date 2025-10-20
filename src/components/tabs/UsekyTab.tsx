import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UsekyTabProps {
  akceId: string;
}

export const UsekyTab = ({ akceId }: UsekyTabProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: useky, isLoading } = useQuery({
    queryKey: ["useky", akceId],
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
        .order("start_ts", { ascending: false });
      
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
        .eq("akce_id", akceId);
      
      if (error) throw error;
      return data || [];
    },
  });

  const getZinenkaNazev = (cislo: number) => {
    const zinenka = zinenky?.find(z => z.cislo === cislo);
    return zinenka?.nazev || `Žíněnka #${cislo}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "Běží...";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.floor(ms / 60000) + " min";
  };

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("useky")
        .delete()
        .eq("akce_id", akceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["useky", akceId] });
      queryClient.invalidateQueries({ queryKey: ["soucty", akceId] });
      toast({
        title: "Úseky vymazány",
        description: "Všechny úseky byly úspěšně vymazány",
      });
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se vymazat úseky",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Všechny úseky měření</CardTitle>
              <CardDescription>
                Kompletní seznam jednotlivých časových úseků
              </CardDescription>
            </div>
            {useky && useky.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Vymazat vše
              </Button>
            )}
          </div>
        </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Načítání...</p>
        ) : useky && useky.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10 hover:bg-primary/10">
                  <TableHead className="text-primary font-semibold">Žíněnka</TableHead>
                  <TableHead className="text-primary font-semibold">ID</TableHead>
                  <TableHead className="text-primary font-semibold">Iniciály</TableHead>
                  <TableHead className="text-primary font-semibold">Start</TableHead>
                  <TableHead className="text-primary font-semibold">Stop</TableHead>
                  <TableHead className="text-right text-primary font-semibold">Délka</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {useky.map((usek, index) => (
                  <TableRow key={usek.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                    <TableCell className="font-medium">{getZinenkaNazev(usek.zinenka_cislo)}</TableCell>
                    <TableCell>
                      {String(usek.rozhodci?.cislo_id || "-").padStart(2, "0")}
                    </TableCell>
                    <TableCell>
                      {usek.rozhodci?.jmeno && usek.rozhodci?.prijmeni
                        ? `${usek.rozhodci.jmeno.charAt(0)}. ${usek.rozhodci.prijmeni}`
                        : "-"}
                    </TableCell>
                    <TableCell>{formatTime(usek.start_ts)}</TableCell>
                    <TableCell>{usek.end_ts ? formatTime(usek.end_ts) : "-"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatDuration(usek.start_ts, usek.end_ts)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Zatím nebylo provedeno žádné měření
          </p>
        )}
      </CardContent>
    </Card>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Opravdu chcete vymazat všechny úseky?</AlertDialogTitle>
          <AlertDialogDescription>
            Tato akce je nevratná. Budou vymazány všechny úseky měření včetně jejich součtů. 
            Všechna naměřená data pro tuto akci budou trvale ztracena.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteAllMutation.mutate()}
            disabled={deleteAllMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteAllMutation.isPending ? "Mažu..." : "Vymazat vše"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
