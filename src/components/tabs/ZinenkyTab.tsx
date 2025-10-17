import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EditZinenkaDialog } from "@/components/EditZinenkaDialog";

interface ZinenkyTabProps {
  akceId: string;
  pocetZinenek: number;
}

export const ZinenkyTab = ({ akceId, pocetZinenek }: ZinenkyTabProps) => {
  const navigate = useNavigate();
  const [editingCislo, setEditingCislo] = useState<number | null>(null);

  const { data: zinenky } = useQuery({
    queryKey: ["zinenky", akceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zinenky")
        .select("*")
        .eq("akce_id", akceId);
      
      if (error) throw error;
      return data;
    },
  });

  const getZinenkaNazev = (cislo: number) => {
    const zinenka = zinenky?.find((z) => z.cislo === cislo);
    return zinenka?.nazev;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Žíněnky</CardTitle>
        <CardDescription>
          Otevřete administraci jednotlivých žíněnek
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: pocetZinenek }, (_, i) => i + 1).map((cislo) => {
            const nazev = getZinenkaNazev(cislo);
            return (
              <div key={cislo} className="relative">
                <Button
                  onClick={() => navigate(`/akce/${akceId}/zinenka/${cislo}`)}
                  className="h-24 w-full text-xl font-bold bg-secondary hover:bg-secondary/90"
                  size="lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    <span>
                      {nazev || `Žíněnka #${cislo}`}
                    </span>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCislo(cislo);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        {editingCislo && (
          <EditZinenkaDialog
            akceId={akceId}
            cislo={editingCislo}
            currentNazev={getZinenkaNazev(editingCislo) || null}
            open={editingCislo !== null}
            onOpenChange={(open) => !open && setEditingCislo(null)}
          />
        )}
      </CardContent>
    </Card>
  );
};
