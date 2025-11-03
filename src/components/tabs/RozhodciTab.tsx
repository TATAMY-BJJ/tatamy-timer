import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RozhodciTabProps {
  akceId: string;
  isAdmin: boolean;
}

export const RozhodciTab = ({ akceId, isAdmin }: RozhodciTabProps) => {
  const queryClient = useQueryClient();
  const [editedData, setEditedData] = useState<Record<number, { jmeno: string; prijmeni: string }>>({});

  const { data: rozhodci } = useQuery({
    queryKey: ["rozhodci", akceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rozhodci")
        .select("*")
        .eq("akce_id", akceId)
        .order("cislo_id");
      
      if (error) throw error;
      
      // Vytvoříme mřížku 00-99
      const grid: Record<number, any> = {};
      for (let i = 0; i <= 99; i++) {
        const existing = data?.find(r => r.cislo_id === i);
        grid[i] = existing || null;
      }
      return grid;
    },
  });

  const saveRozhodci = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(editedData).map(([cisloId, data]) => ({
        akce_id: akceId,
        cislo_id: parseInt(cisloId),
        jmeno: data.jmeno.trim() || null,
        prijmeni: data.prijmeni.trim() || null,
      })).filter(r => r.jmeno || r.prijmeni);

      if (updates.length === 0) return;

      const { error } = await supabase
        .from("rozhodci")
        .upsert(updates, { onConflict: "akce_id,cislo_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rozhodci", akceId] });
      setEditedData({});
      toast.success("Rozhodčí uloženi");
    },
    onError: () => {
      toast.error("Chyba při ukládání rozhodčích");
    },
  });

  const handleChange = (cisloId: number, field: "jmeno" | "prijmeni", value: string) => {
    setEditedData(prev => ({
      ...prev,
      [cisloId]: {
        jmeno: field === "jmeno" ? value : (prev[cisloId]?.jmeno || rozhodci?.[cisloId]?.jmeno || ""),
        prijmeni: field === "prijmeni" ? value : (prev[cisloId]?.prijmeni || rozhodci?.[cisloId]?.prijmeni || ""),
      }
    }));
  };

  const getValue = (cisloId: number, field: "jmeno" | "prijmeni") => {
    return editedData[cisloId]?.[field] ?? rozhodci?.[cisloId]?.[field] ?? "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Správa rozhodčích</CardTitle>
        <CardDescription>
          Vyplňte jména rozhodčích pro ID 00-99
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {rozhodci && Object.keys(rozhodci).map((key) => {
            const cisloId = parseInt(key);
            const idStr = cisloId.toString().padStart(2, "0");
            
            return (
              <div key={cisloId} className="border rounded-lg p-4 space-y-3">
                <Label className="text-lg font-bold">ID {idStr}</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Jméno"
                    value={getValue(cisloId, "jmeno")}
                    onChange={(e) => handleChange(cisloId, "jmeno", e.target.value)}
                    disabled={!isAdmin}
                  />
                  <Input
                    placeholder="Příjmení"
                    value={getValue(cisloId, "prijmeni")}
                    onChange={(e) => handleChange(cisloId, "prijmeni", e.target.value)}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <Button
            onClick={() => saveRozhodci.mutate()}
            disabled={saveRozhodci.isPending || Object.keys(editedData).length === 0}
            size="lg"
          >
            {saveRozhodci.isPending ? "Ukládání..." : "Uložit rozhodčí"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
