import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicShell } from "@/components/marketing/public-shell";
import { IntroSplash } from "@/components/marketing/intro-splash";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutomationFlowGraphic } from "@/components/marketing/automation-flow";
import { StatCounter } from "@/components/marketing/stat-counter";
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

const stats = [
  { value: 40, suffix: "+", label: "Automations shipped" },
  { value: 6, suffix: "x", label: "Avg. response speed" },
  { value: 98, suffix: "%", label: "Client retention" },
  { value: 2, suffix: "–6 wks", label: "Time to launch" },
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
    <>
      <IntroSplash />
      <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-aurora-mesh bg-grid">
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[-15%] h-[460px] w-[860px] -translate-x-1/2 rounded-full bg-aurora-violet/25 blur-[150px]"
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute right-[5%] top-[10%] h-[300px] w-[300px] rounded-full bg-aurora-cyan/20 blur-[120px]"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        />

        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xl"
          >
            <Sparkles className="h-3.5 w-3.5 text-aurora-cyan" />
            AI-Powered Business Automation
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-balance font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl"
          >
            <span className="text-gradient">Run your business</span>
            <br />
            <span className="text-foreground">smarter, not harder</span>
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
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                asChild
                size="lg"
                className="gap-2 rounded-full shadow-[var(--shadow-glow)]"
              >
                <Link to="/auth">
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/15 bg-white/5 backdrop-blur-xl hover:bg-white/10"
              >
                <Link to="/pricing">View pricing</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Signature: live automation flow preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="relative mx-auto max-w-4xl px-4 pb-20 sm:px-6"
        >
          <div className="glass-panel-strong rounded-3xl p-6 sm:p-10">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Live in your dashboard
              </span>
              <span className="flex items-center gap-1.5 text-xs text-aurora-cyan">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-aurora-cyan" />
                Running now
              </span>
            </div>
            <AutomationFlowGraphic />
          </div>
        </motion.div>

        {/* Proof stats */}
        <div className="relative mx-auto grid max-w-4xl grid-cols-2 gap-6 border-t border-white/10 px-4 py-12 sm:grid-cols-4 sm:px-6">
          {stats.map((s) => (
            <StatCounter key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <motion.h2
          {...fadeUp}
          className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl"
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
              className="group glass-panel relative overflow-hidden rounded-2xl p-6 transition-shadow hover:shadow-[var(--shadow-glow)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-aurora-mesh opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-aurora-violet/30 to-aurora-cyan/20 text-aurora-cyan transition-transform group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="relative mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Case Studies */}
      {withMetrics.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <motion.div {...fadeUp} className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
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
                  className="group glass-panel block h-full rounded-2xl p-6 transition-shadow hover:shadow-[var(--shadow-glow)]"
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
                          <ArrowRight className="h-3 w-3 text-aurora-cyan" />
                          <span className="text-aurora-cyan">{m.after}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-aurora-cyan opacity-0 transition-opacity group-hover:opacity-100">
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
            className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            What clients say
          </motion.h2>
          <Carousel className="mt-12">
            <CarouselContent>
              {withQuotes.map((cs) => (
                <CarouselItem key={cs.id} className="md:basis-1/1">
                  <div className="glass-panel rounded-3xl p-8 text-center sm:p-12">
                    <Quote className="mx-auto h-8 w-8 text-aurora-cyan/50" />
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
          className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Frequently asked questions
        </motion.h2>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-white/10">
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
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/40 px-6 py-16 text-center backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-0 bg-aurora-mesh opacity-70" />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to automate your business?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Join businesses already running on Lahza.
            </p>
            <motion.div
              className="mt-8 inline-block"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button asChild size="lg" className="gap-2 rounded-full shadow-[var(--shadow-glow)]">
                <Link to="/auth">
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>
      </PublicShell>
    </>
  );
}
