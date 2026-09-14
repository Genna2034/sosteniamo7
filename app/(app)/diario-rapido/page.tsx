import { guard } from "@/components/page-guard";
import { getEducatorQuickData } from "@/lib/queries";
import { QuickContactForm } from "@/components/forms/quick-contact-form";
import { Empty, PageHeader, Panel } from "@/components/ui/primitives";

export const metadata = { title: "Diario rapido" };

async function DiarioRapidoPage() {
  const d = await getEducatorQuickData();
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Diario rapido" lead="Registra il contatto appena avvenuto: due tocchi e sei a posto. Lo standard è di almeno due contatti a settimana, uno in presenza." />
      {d.cases.length ? <QuickContactForm cases={d.cases} /> : <Panel><Empty>Nessun PIAE attivo tra i casi che ti sono assegnati.</Empty></Panel>}
    </div>
  );
}

export default guard(DiarioRapidoPage);
