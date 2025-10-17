import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface ZinenkyTabProps {
  akceId: string;
  pocetZinenek: number;
}

export const ZinenkyTab = ({ akceId, pocetZinenek }: ZinenkyTabProps) => {
  const navigate = useNavigate();

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
          {Array.from({ length: pocetZinenek }, (_, i) => i + 1).map((cislo) => (
            <Button
              key={cislo}
              onClick={() => navigate(`/akce/${akceId}/zinenka/${cislo}`)}
              className="h-24 text-xl font-bold bg-secondary hover:bg-secondary/90"
              size="lg"
            >
              <div className="flex flex-col items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                <span>Žíněnka #{cislo}</span>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
