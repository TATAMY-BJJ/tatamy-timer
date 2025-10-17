import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SouctyTabProps {
  akceId: string;
}

export const SouctyTab = ({ akceId }: SouctyTabProps) => {
  const { data: soucty, isLoading } = useQuery({
    queryKey: ["soucty", akceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("soucty")
        .select("*")
        .eq("akce_id", akceId)
        .order("zinenka_cislo")
        .order("cislo_id");
      
      if (error) throw error;
      return data;
    },
  });

  const formatMinutes = (ms: number) => {
    return Math.floor(ms / 60000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Součty měření</CardTitle>
        <CardDescription>
          Přehled celkového času po rozhodčích a žínenkách
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Načítání...</p>
        ) : soucty && soucty.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Žíněnka</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Iniciály</TableHead>
                  <TableHead className="text-right">Součet (min)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {soucty.map((soucet, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">#{soucet.zinenka_cislo}</TableCell>
                    <TableCell>{String(soucet.cislo_id).padStart(2, "0")}</TableCell>
                    <TableCell>
                      {soucet.jmeno && soucet.prijmeni 
                        ? `${soucet.jmeno.charAt(0)}. ${soucet.prijmeni}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMinutes(soucet.celkem_ms)}
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
