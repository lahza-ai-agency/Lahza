import { motion } from "framer-motion";
import { Users, Bot, TrendingUp, MessageSquare, Receipt, CheckCircle2 } from "lucide-react";

const nodes = [
  { icon: Users, label: "New Lead", x: 40, y: 60 },
  { icon: MessageSquare, label: "AI Qualifies", x: 220, y: 30 },
  { icon: Bot, label: "Automation Runs", x: 400, y: 60 },
  { icon: Receipt, label: "Invoice Sent", x: 220, y: 110 },
  { icon: CheckCircle2, label: "Client Active", x: 580, y: 60 },
];

const paths = [
  "M 76 60 C 130 50, 160 35, 200 32",
  "M 76 60 C 130 75, 160 100, 200 108",
  "M 256 32 C 300 35, 330 50, 364 58",
  "M 256 108 C 300 100, 330 75, 364 62",
  "M 436 60 C 480 60, 510 60, 544 60",
];

export function AutomationFlowGraphic() {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <svg
        viewBox="0 0 620 140"
        className="w-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="flow-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--aurora-violet)" stopOpacity="0.9" />
            <stop offset="50%" stopColor="var(--aurora-blue)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--aurora-cyan)" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {paths.map((d, i) => (
          <g key={d}>
            <path d={d} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="2" />
            <motion.path
              d={d}
              fill="none"
              stroke="url(#flow-line)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="10 220"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: -230 }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.45,
              }}
            />
          </g>
        ))}

        {nodes.map((node, i) => (
          <g key={node.label} transform={`translate(${node.x - 36}, ${node.y - 36})`}>
            <motion.rect
              width="72"
              height="72"
              rx="20"
              fill="oklch(0.16 0.03 290 / 0.9)"
              stroke="oklch(1 0 0 / 0.12)"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
            />
            <foreignObject x="0" y="0" width="72" height="72">
              <div className="flex h-full w-full items-center justify-center">
                <node.icon className="h-7 w-7 text-aurora-cyan" strokeWidth={1.75} />
              </div>
            </foreignObject>
          </g>
        ))}
      </svg>

      <div className="mt-3 grid grid-cols-5 gap-2 text-center">
        {nodes.map((node) => (
          <span key={node.label} className="text-[11px] text-muted-foreground sm:text-xs">
            {node.label}
          </span>
        ))}
      </div>
    </div>
  );
}
