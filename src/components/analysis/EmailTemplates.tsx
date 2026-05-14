"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EmailTemplate } from "@/types";
import { Copy, Check, Mail } from "lucide-react";

const TYPE_LABELS: Record<EmailTemplate["type"], string> = {
  principeverzoek: "Principeverzoek",
  "informatievraag-provincie": "Provincie",
  "vooroverleg-omgevingsdienst": "Vooroverleg",
};

export function EmailTemplates({ templates }: { templates: EmailTemplate[] }) {
  const [gekopieerd, setGekopieerd] = useState<string | null>(null);

  async function kopieer(type: string, tekst: string) {
    await navigator.clipboard.writeText(tekst);
    setGekopieerd(type);
    setTimeout(() => setGekopieerd(null), 2000);
  }

  if (!templates.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Concept E-mails
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Professionele brieven klaar voor verzending — pas aan naar eigen situatie
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={templates[0]?.type}>
          <TabsList className="w-full">
            {templates.map((t) => (
              <TabsTrigger key={t.type} value={t.type} className="flex-1 text-xs">
                {TYPE_LABELS[t.type]}
              </TabsTrigger>
            ))}
          </TabsList>
          {templates.map((template) => (
            <TabsContent key={template.type} value={template.type} className="mt-4 space-y-3">
              <div className="rounded-md bg-muted/50 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span><strong>Aan:</strong> {template.ontvanger}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong>Onderwerp:</strong> {template.onderwerp}
                </div>
              </div>
              <div className="relative">
                <pre className="rounded-md border bg-card p-4 text-xs leading-relaxed whitespace-pre-wrap font-sans overflow-auto max-h-64">
                  {template.inhoud}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2 h-7 text-xs"
                  onClick={() => kopieer(template.type, `Onderwerp: ${template.onderwerp}\n\n${template.inhoud}`)}
                >
                  {gekopieerd === template.type ? (
                    <><Check className="h-3 w-3 mr-1" /> Gekopieerd</>
                  ) : (
                    <><Copy className="h-3 w-3 mr-1" /> Kopieer</>
                  )}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
