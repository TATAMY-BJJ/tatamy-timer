import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useState } from "react";
import { NovaAkceDialog } from "@/components/NovaAkceDialog";

const AkceList = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: akce, isLoading } = useQuery({
    queryKey: ["akce"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("akce")
        .select("*")
        .order("datum", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Akce</h1>
            <p className="text-muted-foreground mt-1">Správa závodních dnů</p>
          </div>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-secondary hover:bg-secondary/90"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Založit akci
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Načítání...</p>
          </div>
        ) : akce && akce.length > 0 ? (
          <div className="grid gap-4">
            {akce.map((akce) => (
              <Card 
                key={akce.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/akce/${akce.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-xl">
                    {new Date(akce.datum).toLocaleDateString("cs-CZ", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </CardTitle>
                  <CardDescription>
                    Počet žíněnek: {akce.pocet_zinenek}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm">
                    Otevřít detail →
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Zatím nejsou žádné akce
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                Vytvořit první akci
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <NovaAkceDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default AkceList;
