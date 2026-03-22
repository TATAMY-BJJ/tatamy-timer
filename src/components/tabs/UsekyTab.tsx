import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { RotateCcw, Pencil, Check, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UsekyTabProps {
  akceId: string;
}

export const UsekyTab = ({ akceId }: UsekyTabProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
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

  const formatTimeForInput = (timestamp: string) => {
    const d = new Date(timestamp);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "Běží...";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.floor(ms / 60000) + " min";
  };

  const startEditing = (usek: typeof useky extends (infer U)[] | undefined ? U : never) => {
    if (!usek) return;
    setEditingId(usek.id);
    setEditStart(formatTimeForInput(usek.start_ts));
    setEditEnd(usek.end_ts ? formatTimeForInput(usek.end_ts) : "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditStart("");
    setEditEnd("");
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, start_ts, end_ts }: { id: string; start_ts: string; end_ts: string | null }) => {
      const { error } = await supabase
        .from("useky")
        .update({ start_ts, end_ts })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["useky", akceId] });
      queryClient.invalidateQueries({ queryKey: ["soucty", akceId] });
      toast({ title: "Úsek upraven", description: "Časy byly úspěšně aktualizovány" });
      cancelEditing();
    },
    onError: () => {
      toast({ title: "Chyba", description: "Nepodařilo se upravit úsek", variant: "destructive" });
    },
  });

  const saveEditing = (usek: NonNullable<typeof useky>[number]) => {
    const originalDate = new Date(usek.start_ts);
    
    const parseTime = (timeStr: string, refDate: Date) => {
      const parts = timeStr.split(":");
      if (parts.length < 2) return null;
      const h = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const s = parts[2] ? parseInt(parts[2]) : 0;
      if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
      const d = new Date(refDate);
      d.setHours(h, m, s, 0);
      return d;
    };

    const newStart = parseTime(editStart, originalDate);
    if (!newStart) {
      toast({ title: "Chyba", description: "Neplatný formát času startu (HH:MM:SS)", variant: "destructive" });
      return;
    }

    let newEnd: Date | null = null;
    if (editEnd.trim()) {
      const refEnd = usek.end_ts ? new Date(usek.end_ts) : originalDate;
      newEnd = parseTime(editEnd, refEnd);
      if (!newEnd) {
        toast({ title: "Chyba", description: "Neplatný formát času stopu (HH:MM:SS)", variant: "destructive" });
        return;
      }
    }

    updateMutation.mutate({
      id: usek.id,
      start_ts: newStart.toISOString(),
      end_ts: newEnd ? newEnd.toISOString() : null,
    });
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
          <CardTitle>Všechny úseky měření</CardTitle>
          <CardDescription>
            Kompletní seznam jednotlivých časových úseků — klikněte na tužku pro úpravu časů
          </CardDescription>
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
                  <TableHead className="text-primary font-semibold w-[80px]"></TableHead>
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
                    <TableCell>
                      {editingId === usek.id ? (
                        <Input
                          value={editStart}
                          onChange={(e) => setEditStart(e.target.value)}
                          placeholder="HH:MM:SS"
                          className="h-8 w-24 font-mono text-xs"
                        />
                      ) : (
                        formatTime(usek.start_ts)
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === usek.id ? (
                        <Input
                          value={editEnd}
                          onChange={(e) => setEditEnd(e.target.value)}
                          placeholder="HH:MM:SS"
                          className="h-8 w-24 font-mono text-xs"
                        />
                      ) : (
                        usek.end_ts ? formatTime(usek.end_ts) : "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatDuration(usek.start_ts, usek.end_ts)}
                    </TableCell>
                    <TableCell>
                      {editingId === usek.id ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700"
                            onClick={() => saveEditing(usek)}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => startEditing(usek)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
        
        {useky && useky.length > 0 && (
          <div className="flex justify-center mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Vymazat vše
            </Button>
          </div>
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
