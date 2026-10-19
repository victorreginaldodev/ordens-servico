import { CalendarClock, Wrench } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const OperationalOrderMaintenancePage = () => (
  <section
    className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-8"
    aria-labelledby="os-operacional-manutencao-titulo"
    aria-describedby="os-operacional-manutencao-descricao"
  >
    <Card className="w-full max-w-2xl overflow-hidden shadow-lg">
      <div className="h-1.5 bg-primary" aria-hidden />
      <CardHeader className="items-center space-y-4 px-6 pb-3 pt-8 text-center sm:px-10">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden>
          <Wrench className="size-7" />
        </div>
        <CardTitle id="os-operacional-manutencao-titulo" className="text-2xl leading-tight sm:text-3xl">
          Módulo temporariamente indisponível
        </CardTitle>
      </CardHeader>

      <CardContent id="os-operacional-manutencao-descricao" className="space-y-6 px-6 pb-8 text-center sm:px-10">
        <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            O módulo de <strong className="font-semibold text-foreground">OS Operacional</strong> está passando por uma
            reestruturação para adequação aos processos operacionais e comerciais da empresa.
          </p>
          <p>Durante esse período, o acesso permanecerá temporariamente indisponível.</p>
        </div>

        <div className="mx-auto flex max-w-md items-center justify-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground sm:text-base">
          <CalendarClock className="size-5 shrink-0 text-primary" aria-hidden />
          <p>
            <strong>Previsão de retorno: terça-feira, 20/10/2026.</strong>
          </p>
        </div>

        <p className="text-sm text-muted-foreground">Agradecemos a compreensão.</p>

        <div className="flex justify-center pt-2">
          <BackButton to="/inicio" label="Voltar ao início" />
        </div>
      </CardContent>
    </Card>
  </section>
);

export default OperationalOrderMaintenancePage;
