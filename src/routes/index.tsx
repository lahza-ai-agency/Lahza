import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicShell } from "@/components/marketing/public-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { fetchCaseStudies } from "@/lib/case-studies";
import { motion } from "framer-motion";
import {
  Users,
  FolderKanban,
  Bot,
  Receipt,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Quote,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lahza — AI Automation for Modern Businesses" },
      {
        name: "description",
        content:
          "Lahza builds AI automation systems, chatbots, and business platforms that help companies save time and scale faster.",
      },
      { property: "og:title", content: "Lahza — AI Automation for Modern Businesses" },
      {
        property: "og:description",
        content: "AI automation systems, chatbots, and business platforms by Lahza.",
      },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: Bot,
    title: "AI Automation",
    desc: "Automate repetitive work and free your team for what matters.",
  },
  {
    icon: Users,
    title: "CRM & Leads",
    desc: "Capture, qualify, and track every lead in one clear pipeline.",
  },
  {
    icon: FolderKanban,
    title: "Project Management",
    desc: "Plan and ship work with simple, visual boards.",
  },
  {
    icon: ShieldCheck,
    title: "Client Portal",
    desc: "A branded space for your clients — projects, files, invoices.",
  },
  { icon: Receipt, title: "Billing", desc: "Invoices and payments, connected to your projects." },
  {
    icon: Sparkles,
    title: "AI Content",
    desc: "Generate content and reports without lifting a finger.",
  },
];

const faqs = [
  {
    q: "What does Lahza actually build?",
    a: "Custom AI automation systems, chatbots, CRMs, and client portals tailored to how your business already runs — not off-the-shelf templates.",
  },
  {
    q: "How long does a typical project take?",
    a: "Most automation and platform builds land between 2–6 weeks depending on scope, with milestones you can track inside your client portal.",
  },
  {
    q: "Do I need technical knowledge to use what you build?",
    a: "No. We design for the people who'll actually use the system day to day, and we walk you through it before handoff.",
  },
  {
    q: "Can you work with our existing tools?",
    a: "Yes — we regularly integrate with CRMs, messaging platforms, spreadsheets, and databases you already depend on.",
  },
  {
    q: "What happens after launch?",
    a: "You get a support channel through your client portal for fixes, tweaks, and questions — automation isn't a one-time delivery.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

function Index() {
  const { data: caseStudies = [] } = useQuery({
    queryKey: ["home-case-studies"],
    queryFn: fetchCaseStudies,
  });
  const published = caseStudies.filter((cs) => cs.published);
  const withMetrics = published.filter((cs) => cs.metrics.length > 0).slice(0, 3);
  const withQuotes = published.filter((cs) => cs.summary).slice(0, 5);

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-grid">
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[-10%] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-Powered Business Automation
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-balance text-4xl font-bold leading-tight tracking-tight sm:text-6xl"
          >
            <span className="text-gradient">Run your business smarter, not harder</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground"
          >
            Lahza unifies your CRM, projects, client portal, and billing — powered by AI automation
            that does the busywork for you.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild size="lg" className="gap-2 shadow-[var(--shadow-glow)]">
              <Link to="/auth">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">View pricing</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <motion.h2
          {...fadeUp}
          className="text-center text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Everything your business needs
        </motion.h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Case Studies */}
      {withMetrics.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <motion.div {...fadeUp} className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Real results, not promises
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              A look at what changed for businesses we've worked with.
            </p>
          </motion.div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {withMetrics.map((cs, i) => (
              <motion.div
                key={cs.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Link
                  to="/case-studies/$slug"
                  params={{ slug: cs.slug }}
                  className="group block h-full rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
                >
                  {cs.industry && <Badge variant="secondary">{cs.industry}</Badge>}
                  <h3 className="mt-3 text-lg font-semibold">{cs.company_name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{cs.summary}</p>
                  <div className="mt-5 space-y-2">
                    {cs.metrics.slice(0, 2).map((m) => (
                      <div key={m.label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{m.label}</span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="text-muted-foreground/60 line-through">{m.before}</span>
                          <ArrowRight className="h-3 w-3 text-primary" />
                          <span className="text-primary">{m.after}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Read case study <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {withQuotes.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <motion.h2
            {...fadeUp}
            className="text-center text-3xl font-bold tracking-tight sm:text-4xl"
          >
            What clients say
          </motion.h2>
          <Carousel className="mt-12">
            <CarouselContent>
              {withQuotes.map((cs) => (
                <CarouselItem key={cs.id} className="md:basis-1/1">
                  <div className="rounded-3xl border border-border bg-card p-8 text-center sm:p-12">
                    <Quote className="mx-auto h-8 w-8 text-primary/40" />
                    <p className="mx-auto mt-5 max-w-2xl text-balance text-lg sm:text-xl">
                      {cs.summary}
                    </p>
                    <p className="mt-6 text-sm font-semibold">
                      {cs.client_name ?? cs.company_name}
                    </p>
                    {cs.client_name && (
                      <p className="text-xs text-muted-foreground">{cs.company_name}</p>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {withQuotes.length > 1 && (
              <>
                <CarouselPrevious className="-left-4 sm:-left-12" />
                <CarouselNext className="-right-4 sm:-right-12" />
              </>
            )}
          </Carousel>
        </section>
      )}

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <motion.h2
          {...fadeUp}
          className="text-center text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Frequently asked questions
        </motion.h2>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-16 text-center"
        >
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to automate your business?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Join businesses already running on Lahza.
            </p>
            <Button asChild size="lg" className="mt-8 gap-2 shadow-[var(--shadow-glow)]">
              <Link to="/auth">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </PublicShell>
  );
}
