import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Play, Square, LogOut } from "lucide-react";
import { toast } from "sonner";
import { TatamyLogo } from "@/components/TatamyLogo";

const ZinenkaAdmin = () => {
  const { akceId, cislo } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rozhodciId, setRozhodciId] = useState("");
  const [error, setError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  const { data: aktivniUsek, refetch: refetchUsek } = useQuery({
    queryKey: ["aktivni-usek", akceId, cislo],
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
        .eq("zinenka_cislo", parseInt(cislo!))
        .is("end_ts", null)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Sync každých 10 sekund
  });

  // Stopky
  useEffect(() => {
    if (!aktivniUsek) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(aktivniUsek.start_ts).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [aktivniUsek]);

  const startMutation = useMutation({
    mutationFn: async (cisloId: number) => {
      setError("");

      // Ověř, že ID existuje
      const { data: rozhodci, error: rozhodciError } = await supabase
        .from("rozhodci")
        .select("id")
        .eq("akce_id", akceId)
        .eq("cislo_id", cisloId)
        .maybeSingle();

      if (rozhodciError) throw rozhodciError;
      if (!rozhodci) {
        throw new Error("ID neexistuje v této akci");
      }

      // Zkontroluj, zda rozhodčí nemá aktivní měření
      const { data: existujici, error: checkError } = await supabase
        .from("useky")
        .select("id, zinenka_cislo")
        .eq("akce_id", akceId)
        .eq("rozhodci_id", rozhodci.id)
        .is("end_ts", null)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existujici) {
        throw new Error(`Rozhodčí s tímto ID už měří na jiné žíněnce (#${existujici.zinenka_cislo})`);
      }

      // Start měření
      const { error: insertError } = await supabase
        .from("useky")
        .insert({
          akce_id: akceId,
          zinenka_cislo: parseInt(cislo!),
          rozhodci_id: rozhodci.id,
          start_ts: new Date().toISOString(),
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aktivni-usek", akceId, cislo] });
      queryClient.invalidateQueries({ queryKey: ["soucty", akceId] });
      queryClient.invalidateQueries({ queryKey: ["useky", akceId] });
      setRozhodciId("");
      toast.success("Měření spuštěno");
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error(err.message);
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      if (!aktivniUsek) return;

      const { error } = await supabase
        .from("useky")
        .update({ end_ts: new Date().toISOString() })
        .eq("id", aktivniUsek.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aktivni-usek", akceId, cislo] });
      queryClient.invalidateQueries({ queryKey: ["soucty", akceId] });
      queryClient.invalidateQueries({ queryKey: ["useky", akceId] });
      toast.success("Měření zastaveno");
    },
    onError: () => {
      toast.error("Chyba při zastavení měření");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (aktivniUsek) {
        await stopMutation.mutateAsync();
      }
    },
    onSuccess: () => {
      refetchUsek();
    },
  });

  const handleStart = () => {
    const cisloId = parseInt(rozhodciId);
    if (isNaN(cisloId) || cisloId < 0 || cisloId > 99) {
      setError("Zadejte platné ID (00-99)");
      return;
    }
    startMutation.mutate(cisloId);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <div className="min-h-screen bg-background">
      <TatamyLogo />
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/akce/${akceId}`)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na detail akce
          </Button>
          <h1 className="text-2xl font-bold">
            {akce && new Date(akce.datum).toLocaleDateString("cs-CZ")} · Žíněnka #{cislo}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {!aktivniUsek ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Nepřihlášen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-warning text-warning-foreground">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="id" className="text-lg">ID rozhodčího (00-99)</Label>
                <Input
                  id="id"
                  type="number"
                  min="0"
                  max="99"
                  value={rozhodciId}
                  onChange={(e) => {
                    setRozhodciId(e.target.value);
                    setError("");
                  }}
                  placeholder="Např. 11"
                  className="text-xl h-16"
                />
              </div>

              <Button
                onClick={handleStart}
                disabled={startMutation.isPending}
                size="lg"
                className="w-full h-16 text-xl bg-primary hover:bg-primary/90"
              >
                <Play className="mr-2 h-6 w-6" />
                Spustit měření
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Měří se</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground mb-2">
                  Měří: ID {String(aktivniUsek.rozhodci?.cislo_id).padStart(2, "0")}
                  {aktivniUsek.rozhodci?.jmeno && aktivniUsek.rozhodci?.prijmeni && (
                    <span> ({aktivniUsek.rozhodci.jmeno} {aktivniUsek.rozhodci.prijmeni})</span>
                  )}
                </p>
                <p className="text-6xl font-bold font-mono">{formatTime(elapsedSeconds)}</p>
              </div>

              <div className="grid gap-4">
                <Button
                  onClick={() => stopMutation.mutate()}
                  disabled={stopMutation.isPending}
                  size="lg"
                  variant="destructive"
                  className="w-full h-16 text-xl"
                >
                  <Square className="mr-2 h-6 w-6" />
                  Stop
                </Button>

                <Button
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  size="lg"
                  variant="outline"
                  className="w-full h-16 text-xl"
                >
                  <LogOut className="mr-2 h-6 w-6" />
                  Odhlásit
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ZinenkaAdmin;
