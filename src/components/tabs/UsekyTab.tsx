import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UsekyTabProps {
  akceId: string;
}

export const UsekyTab = ({ akceId }: UsekyTabProps) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Všechny úseky měření</CardTitle>
        <CardDescription>
          Kompletní seznam jednotlivých časových úseků
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Načítání...</p>
        ) : useky && useky.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Žíněnka</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Iniciály</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Stop</TableHead>
                  <TableHead className="text-right">Délka</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {useky.map((usek) => (
                  <TableRow key={usek.id}>
                    <TableCell className="font-medium">#{usek.zinenka_cislo}</TableCell>
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
  );
};
