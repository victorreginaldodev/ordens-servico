import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackButton from "@/components/BackButton";

export default function UnderDevelopmentOverlay() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="under-dev-title"
      aria-describedby="under-dev-desc"
    >
      <div className="absolute inset-0 -z-10">
        <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.08),transparent_60%)]" />
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute -inset-x-24 -inset-y-20 rounded-[40px] bg-gradient-to-tr from-primary/10 via-transparent to-primary/10 blur-2xl" />
        <Card className="mx-4 w-full max-w-lg border-border bg-card/90 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Wrench className="h-7 w-7 text-primary" />
            </div>
            <CardTitle id="under-dev-title" className="mt-4 text-xl">Funcionalidade em desenvolvimento</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p id="under-dev-desc" className="text-muted-foreground">
              Estamos preparando esta área do sistema para oferecer uma experiência completa.
              Em breve você poderá acessar os recursos disponíveis aqui.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block h-1 w-16 rounded-full bg-primary/30" />
              <span className="inline-block h-1 w-6 rounded-full bg-primary/20" />
              <span className="inline-block h-1 w-3 rounded-full bg-primary/10" />
            </div>
            <div className="mt-8 flex justify-center">
              <BackButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
