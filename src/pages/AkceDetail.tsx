import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { RozhodciTab } from "@/components/tabs/RozhodciTab";
import { SouctyTab } from "@/components/tabs/SouctyTab";
import { UsekyTab } from "@/components/tabs/UsekyTab";
import { ZinenkyTab } from "@/components/tabs/ZinenkyTab";
import { MzdyTab } from "@/components/tabs/MzdyTab";
import { TatamyLogo } from "@/components/TatamyLogo";
import { useAuth } from "@/contexts/AuthContext";

const AkceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  
  const isAdmin = userRole === "administrator";

  const { data: akce, isLoading } = useQuery({
    queryKey: ["akce", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("akce")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Načítání...</p>
      </div>
    );
  }

  if (!akce) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Akce nenalezena</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TatamyLogo />
      <div className="border-b-2 border-b-primary bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na přehled
          </Button>
          <h1 className="text-3xl font-heading font-bold">
            {akce.nazev && `${akce.nazev} · `}
            {new Date(akce.datum).toLocaleDateString("cs-CZ", {
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </h1>
          <p className="text-muted-foreground mt-1">
            Počet žíněnek: {akce.pocet_zinenek}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="rozhodci" className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-2'} mb-8`}>
            <TabsTrigger value="rozhodci">Rozhodčí</TabsTrigger>
            <TabsTrigger value="zinenky">Žíněnky</TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="soucty">Součty</TabsTrigger>
                <TabsTrigger value="useky">Úseky</TabsTrigger>
                <TabsTrigger value="mzdy">Mzdy</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="rozhodci">
            <RozhodciTab akceId={id!} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="zinenky">
            <ZinenkyTab akceId={id!} pocetZinenek={akce.pocet_zinenek} isAdmin={isAdmin} />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="soucty">
                <SouctyTab akceId={id!} />
              </TabsContent>

              <TabsContent value="useky">
                <UsekyTab akceId={id!} />
              </TabsContent>

              <TabsContent value="mzdy">
                <MzdyTab akceId={id!} pocetZinenek={akce.pocet_zinenek} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default AkceDetail;
