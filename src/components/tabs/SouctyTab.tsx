import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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
        .eq("akce_id", akceId);
      
      if (error) throw error;
      return data;
    },
  });

  // Seskupit data podle rozhodčího a sečíst časy
  const groupedSoucty = soucty?.reduce((acc, soucet) => {
    const key = soucet.rozhodci_id || soucet.cislo_id;
    if (!acc[key]) {
      acc[key] = {
        cislo_id: soucet.cislo_id,
        jmeno: soucet.jmeno,
        prijmeni: soucet.prijmeni,
        celkem_ms: 0,
      };
    }
    acc[key].celkem_ms += soucet.celkem_ms || 0;
    return acc;
  }, {} as Record<string, { cislo_id: number; jmeno: string; prijmeni: string; celkem_ms: number }>);

  // Převést na pole a seřadit podle ID
  const souctyArray = groupedSoucty 
    ? Object.values(groupedSoucty).sort((a, b) => a.cislo_id - b.cislo_id)
    : [];

  const formatMinutes = (ms: number) => {
    return Math.floor(ms / 60000);
  };

  const chartData = souctyArray.map(soucet => ({
    name: `${String(soucet.cislo_id).padStart(2, "0")} ${soucet.jmeno && soucet.prijmeni ? `${soucet.jmeno.charAt(0)}. ${soucet.prijmeni}` : "-"}`,
    minutes: formatMinutes(soucet.celkem_ms),
  })).sort((a, b) => b.minutes - a.minutes);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Součty měření</CardTitle>
        <CardDescription>
          Celkový čas každého rozhodčího ze všech žíněnek
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Načítání...</p>
        ) : souctyArray.length > 0 ? (
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table">Tabulka</TabsTrigger>
              <TabsTrigger value="chart">Graf</TabsTrigger>
            </TabsList>
            
            <TabsContent value="table">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/10 hover:bg-primary/10">
                      <TableHead className="text-primary font-semibold">ID</TableHead>
                      <TableHead className="text-primary font-semibold">Iniciály</TableHead>
                      <TableHead className="text-right text-primary font-semibold">Součet (min)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {souctyArray.map((soucet, index) => (
                      <TableRow key={soucet.cislo_id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">{String(soucet.cislo_id).padStart(2, "0")}</TableCell>
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
            </TabsContent>

            <TabsContent value="chart">
              <div className="h-[500px] w-full">
                <ChartContainer
                  config={{
                    minutes: {
                      label: "Minuty",
                      color: "hsl(var(--primary))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        className="text-xs"
                      />
                      <YAxis label={{ value: 'Minuty', angle: -90, position: 'insideLeft' }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Zatím nebylo provedeno žádné měření
          </p>
        )}
      </CardContent>
    </Card>
  );
};
