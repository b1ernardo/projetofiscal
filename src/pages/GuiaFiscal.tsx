import { useState } from "react";
import { FileText, BookOpen, Hash, Info, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react";

interface TableItem { code: string; desc: string; obs?: string; }

const CFOP_SAIDA: TableItem[] = [
  { code: "5101", desc: "Venda de produção própria", obs: "Fabricante" },
  { code: "5102", desc: "Venda de mercadoria adquirida para revenda", obs: "Comércio — o mais comum" },
  { code: "5103", desc: "Venda de produção para o exterior via trading" },
  { code: "5104", desc: "Venda de mercadoria via trading" },
  { code: "5113", desc: "Venda de produção dentro do estado p/ zona franca" },
  { code: "5115", desc: "Venda de mercadoria p/ zona franca de Manaus" },
  { code: "5116", desc: "Venda de produto industrial p/ zona franca" },
  { code: "5117", desc: "Venda de mercadoria p/ zona franca — adquirida" },
  { code: "5118", desc: "Venda de produção ao governo (ICMS desonerado)" },
  { code: "5119", desc: "Venda de mercadoria ao governo (ICMS desonerado)" },
  { code: "5120", desc: "Venda de prod. própria com substituição tributária" },
  { code: "5401", desc: "Venda de produção com ST (substituto)" },
  { code: "5402", desc: "Venda de mercadoria com ST (substituto)" },
  { code: "5403", desc: "Venda de mercadoria sujeita a ST (substituído)" },
  { code: "5405", desc: "Venda de mercadoria com ST (adquirida ou recebida terceiro)" },
  { code: "5501", desc: "Remessa para armazenagem" },
  { code: "5910", desc: "Remessa em consignação mercantil" },
  { code: "5201", desc: "Devolução de compra — produção própria" },
  { code: "5202", desc: "Devolução de compra — mercadoria para revenda" },
  { code: "6101", desc: "Venda de produção — outro estado" },
  { code: "6102", desc: "Venda de mercadoria — outro estado", obs: "Operação interestadual" },
  { code: "6107", desc: "Venda de prod. para uso e consumo — outro estado" },
  { code: "6108", desc: "Transf. de mercadoria para filial — outro estado" },
  { code: "6401", desc: "Venda com ST — outro estado (substituto)" },
  { code: "6403", desc: "Venda de mercadoria com ST — outro estado" },
  { code: "7101", desc: "Exportação de produto de produção própria" },
  { code: "7102", desc: "Exportação de mercadoria adquirida" },
];

const CSOSN: TableItem[] = [
  { code: "101", desc: "Tributada pelo SN com permissão de crédito", obs: "Permite crédito ao comprador" },
  { code: "102", desc: "Tributada pelo SN sem permissão de crédito", obs: "Mais comum no varejo" },
  { code: "103", desc: "Isenção do ICMS por faixa de receita bruta" },
  { code: "201", desc: "Tributada c/ crédito e com ICMS-ST" },
  { code: "202", desc: "Tributada s/ crédito e com ICMS-ST" },
  { code: "203", desc: "Isenção por faixa e com ICMS-ST" },
  { code: "300", desc: "Imune" },
  { code: "400", desc: "Não tributada pelo Simples Nacional" },
  { code: "500", desc: "ICMS cobrado anteriormente por ST ou antecipação", obs: "Substituído tributário" },
  { code: "900", desc: "Outros", obs: "Regime Normal dentro do SN" },
];

const CST_ICMS: TableItem[] = [
  { code: "00", desc: "Tributada Integralmente" },
  { code: "10", desc: "Tributada e com cobrança de ICMS-ST" },
  { code: "20", desc: "Com Redução de Base de Cálculo" },
  { code: "30", desc: "Isenta ou não tributada e com cobrança de ICMS-ST" },
  { code: "40", desc: "Isenta" },
  { code: "41", desc: "Não Tributada" },
  { code: "50", desc: "Suspensão" },
  { code: "51", desc: "Diferimento" },
  { code: "60", desc: "ICMS cobrado anteriormente por ST" },
  { code: "70", desc: "Com Redução de BC e com cobrança de ICMS-ST" },
  { code: "90", desc: "Outras" },
];

const CST_PIS_COFINS: TableItem[] = [
  { code: "01", desc: "Operação Tributável – alíquota básica" },
  { code: "02", desc: "Operação Tributável – alíquota diferenciada" },
  { code: "03", desc: "Operação Tributável – qtd vendida × alíq. p/ unidade" },
  { code: "04", desc: "Operação Tributável – monofásica (alíquota zero p/ revendedor)", obs: "Combustíveis, medicamentos, autopeças…" },
  { code: "05", desc: "Operação Tributável – substituição tributária" },
  { code: "06", desc: "Operação Tributável – alíquota zero" },
  { code: "07", desc: "Operação Isenta" },
  { code: "08", desc: "Operação sem Incidência" },
  { code: "09", desc: "Operação com Suspensão" },
  { code: "49", desc: "Outras Operações de Saída", obs: "Simples Nacional — saída tributada" },
  { code: "50", desc: "Operação com Direito a Crédito – vinc. à venda tributada" },
  { code: "70", desc: "Operação de Aquisição sem Direito a Crédito" },
  { code: "98", desc: "Outras Operações de Entrada" },
  { code: "99", desc: "Outras Operações" },
];

const ORIGEM: TableItem[] = [
  { code: "0", desc: "Nacional — exceto indicados abaixo" },
  { code: "1", desc: "Estrangeira — importação direta" },
  { code: "2", desc: "Estrangeira — adquirida no mercado interno" },
  { code: "3", desc: "Nacional — mercadoria c/ conteúdo de importação > 40% e ≤ 70%" },
  { code: "4", desc: "Nacional — produção em conformidade com processos básicos (PP/PPB)" },
  { code: "5", desc: "Nacional — mercadoria c/ conteúdo de importação ≤ 40%" },
  { code: "6", desc: "Estrangeira — importação direta, sem similar nacional" },
  { code: "7", desc: "Estrangeira — adquirida no mercado interno, sem similar nacional" },
  { code: "8", desc: "Nacional — mercadoria c/ conteúdo de importação > 70%" },
];

const STEPS = [
  { n: "1", title: "Configurar Dados Fiscais", desc: "Em Configurações → Fiscal: CNPJ, IE, CSRT, série NF-e, certificado A1 e ambiente (homologação/produção)." },
  { n: "2", title: "Cadastrar Produtos com NCM", desc: "Cada produto precisa de NCM (8 dígitos), CFOP padrão, CSOSN/CST, origem e opcionalmente CEST para produtos com ST." },
  { n: "3", title: "Definir Naturezas de Operação", desc: "Em Configurações → Naturezas de Operação cadastre seus CFOPs e descrições (ex: 5102 – Venda de Mercadoria)." },
  { n: "4", title: "Emitir a NF-e", desc: "Acesse Fiscal → NF-e Avulsa ou gere direto na tela de vendas. Preencha destinatário, produtos e pagamento." },
  { n: "5", title: "Transmitir para SEFAZ", desc: "Clique em 'Emitir NF-e Agora'. O sistema assina o XML com o certificado e envia à SEFAZ automaticamente." },
  { n: "6", title: "Acompanhar Status", desc: "Em Fiscal → NF-e veja as notas autorizadas, canceladas ou em contingência. Baixe o XML e DANFE quando necessário." },
];

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-5 py-4 font-semibold text-left hover:bg-muted/50 transition-colors">
        <span className="flex items-center gap-3 text-base">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function CodeTable({ items, cols = ["Código", "Descrição", "Obs"] }: { items: TableItem[]; cols?: string[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60">
          <tr>
            {cols.map(c => <th key={c} className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.code} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              <td className="px-3 py-2 font-mono font-bold text-primary whitespace-nowrap">{it.code}</td>
              <td className="px-3 py-2">{it.desc}</td>
              {cols.length > 2 && <td className="px-3 py-2 text-muted-foreground text-xs">{it.obs ?? ""}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GuiaFiscal() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Guia Completo NF-e — Modelo 55</h1>
          <p className="text-muted-foreground mt-1">Referência técnica: tabelas de CFOP, CSOSN, CST, PIS/COFINS, Origem e passo a passo de emissão.</p>
        </div>
      </div>

      {/* Alert */}
      <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          <strong>Valide sempre com seu contador.</strong> A classificação fiscal correta (NCM, CFOP, CST) depende da natureza do produto, UF de origem/destino e regime tributário da empresa. Este guia é informativo.
          <a href="https://www.nfe.fazenda.gov.br" target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 underline font-medium">
            Portal NF-e SEFAZ <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* O que é NF-e */}
      <Section title="O que é a NF-e Modelo 55?" icon={Info}>
        <div className="grid sm:grid-cols-2 gap-4 mt-2">
          {[
            { t: "Documento Fiscal Eletrônico", d: "A NF-e (Nota Fiscal Eletrônica) modelo 55 é o documento fiscal utilizado para operações de compra e venda de mercadorias entre empresas (B2B) e também para vendas ao consumidor final quando exigida." },
            { t: "Assinatura Digital Obrigatória", d: "Toda NF-e deve ser assinada digitalmente com certificado A1 ou A3 (e-CNPJ ou certificado NF-e) antes de ser transmitida à SEFAZ para autorização." },
            { t: "Chave de Acesso (44 dígitos)", d: "Após autorização a SEFAZ gera um protocolo e uma chave de acesso com 44 dígitos, que identifica unicamente a nota. O DANFE é o documento auxiliar impresso." },
            { t: "Validade Legal", d: "Só tem validade jurídica após autorização (status 'Autorizado o uso da NF-e'). Notas em contingência devem ser retransmitidas quando a SEFAZ voltar online." },
          ].map(c => (
            <div key={c.t} className="rounded-lg border border-border p-4">
              <p className="font-semibold text-sm mb-1 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" />{c.t}</p>
              <p className="text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/60 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Grupos obrigatórios no XML da NF-e</div>
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border text-sm">
            {[
              ["&lt;ide&gt;", "Identificação: número, série, data, natureza, finalidade, destino, tipo de emissão"],
              ["&lt;emit&gt;", "Emitente: CNPJ, razão social, IE, endereço completo, regime tributário (CRT)"],
              ["&lt;dest&gt;", "Destinatário: CPF/CNPJ, nome, IE, email, endereço completo"],
              ["&lt;det&gt;", "Produtos: código, NCM, CFOP, unidade, qtd, preço, impostos (ICMS, PIS, COFINS, IPI)"],
              ["&lt;total&gt;", "Totais: base ICMS, valor ICMS, produtos, frete, seguro, desconto, valor NF"],
              ["&lt;transp&gt;", "Transporte: modalidade de frete, dados do transportador"],
              ["&lt;cobr&gt;", "Cobrança: fatura e parcelas (opcional mas recomendado)"],
              ["&lt;pag&gt;", "Pagamento: forma(s) de pagamento e valores"],
              ["&lt;infAdic&gt;", "Informações complementares: texto livre que sai no DANFE"],
            ].map(([tag, desc]) => (
              <div key={tag as string} className="flex gap-3 px-4 py-3">
                <code className="shrink-0 font-mono text-xs text-primary font-bold mt-0.5">{tag as string}</code>
                <span className="text-xs text-muted-foreground">{desc as string}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Passo a Passo */}
      <Section title="Passo a Passo — Emitir NF-e no Sistema" icon={FileText}>
        <div className="mt-2 space-y-3">
          {STEPS.map(s => (
            <div key={s.n} className="flex gap-4 rounded-lg border border-border p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">{s.n}</div>
              <div>
                <p className="font-semibold text-sm">{s.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* CFOP */}
      <Section title="Tabela CFOP — Saídas (principais)" icon={Hash}>
        <p className="text-sm text-muted-foreground mb-3 mt-1">CFOP 5xxx = dentro do estado • 6xxx = outro estado • 7xxx = exportação</p>
        <CodeTable items={CFOP_SAIDA} />
      </Section>

      {/* CSOSN */}
      <Section title="CSOSN — Simples Nacional (ICMS)" icon={Hash}>
        <p className="text-sm text-muted-foreground mb-3 mt-1">Use CSOSN se a empresa é optante pelo Simples Nacional. Não use CST de ICMS e CSOSN ao mesmo tempo.</p>
        <CodeTable items={CSOSN} />
      </Section>

      {/* CST ICMS */}
      <Section title="CST ICMS — Lucro Real / Lucro Presumido" icon={Hash}>
        <p className="text-sm text-muted-foreground mb-3 mt-1">Use CST se a empresa é do Regime Normal (Lucro Real ou Presumido). O 1º dígito indica a origem da mercadoria.</p>
        <CodeTable items={CST_ICMS} cols={["CST", "Descrição"]} />
      </Section>

      {/* PIS COFINS */}
      <Section title="CST PIS / COFINS" icon={Hash}>
        <p className="text-sm text-muted-foreground mb-3 mt-1">Tanto Simples Nacional quanto Regime Normal usam o mesmo CST para PIS e COFINS. Mais comum para SN: CST 49 (saída) ou 07 (isento).</p>
        <CodeTable items={CST_PIS_COFINS} />
      </Section>

      {/* Origem */}
      <Section title="Origem da Mercadoria" icon={Hash}>
        <p className="text-sm text-muted-foreground mb-3 mt-1">Campo obrigatório no item. Determina o 1º dígito do CSOSN/CST. Produto nacional fabricado no Brasil = 0.</p>
        <CodeTable items={ORIGEM} cols={["Código", "Descrição"]} />
      </Section>

      {/* Dicas finais */}
      <Section title="Campos Importantes por Produto" icon={Info}>
        <div className="mt-2 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                {["Campo", "Obrigatório", "Onde encontrar / Dica"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["NCM", "✅ Sim", "8 dígitos. Consulte www.tarifaweb.com.br. Ex: 2202.10.00 (água mineral)"],
                ["CFOP", "✅ Sim", "4 dígitos. Use 5102 para venda de mercadoria dentro do estado"],
                ["CSOSN / CST", "✅ Sim", "Simples Nacional → CSOSN (102 mais comum). Regime Normal → CST (00 tributada integral)"],
                ["Origem", "✅ Sim", "0 = nacional. Definido no cadastro do produto"],
                ["CEST", "⚠️ Se ST", "7 dígitos. Obrigatório para produtos sujeitos a substituição tributária"],
                ["CST PIS", "✅ Sim", "Simples Nacional exporta com CST 49 na saída ou 07 se isento"],
                ["CST COFINS", "✅ Sim", "Mesmo raciocínio do PIS"],
                ["Alíquota ICMS", "Se CST 00/10/20", "Definida pela UF. Ex: SP → 12% ou 18% dependendo do produto"],
                ["Alíquota PIS/COFINS", "Se CST 01-03", "Regime cumulativo: PIS 0,65% e COFINS 3%. Não cumulativo: 1,65% / 7,6%"],
              ].map(([f, o, d], i) => (
                <tr key={f as string} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-3 py-2 font-mono font-semibold text-primary text-xs">{f as string}</td>
                  <td className="px-3 py-2 text-center text-xs">{o as string}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{d as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

    </div>
  );
}
