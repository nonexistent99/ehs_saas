import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const data = [
  { semana: "22/12", naoIniciado: 5, pendentes: 22, atencao: 3, resolvidos: 4 },
  { semana: "29/12", naoIniciado: 4, pendentes: 8, atencao: 6, resolvidos: 5 },
  { semana: "05/01", naoIniciado: 3, pendentes: 10, atencao: 12, resolvidos: 18 },
  { semana: "12/01", naoIniciado: 2, pendentes: 13, atencao: 8, resolvidos: 6 },
];

const legendItems = [
  { key: "naoIniciado", label: "Não iniciado", color: "hsl(var(--muted-foreground))" },
  { key: "pendentes", label: "Pendentes", color: "hsl(var(--primary))" },
  { key: "atencao", label: "Atenção", color: "hsl(var(--destructive))" },
  { key: "resolvidos", label: "Resolvidos", color: "hsl(var(--success))" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="rounded-xl border border-primary/30 bg-card/95 backdrop-blur-xl p-4 shadow-2xl"
        style={{
          boxShadow: "0 0 30px rgba(255, 120, 50, 0.2), 0 10px 40px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-sm font-semibold text-foreground">Semana {label}</p>
          <span className="ml-auto text-xs text-muted-foreground">Total: {total}</span>
        </div>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-md shadow-lg"
                  style={{ 
                    backgroundColor: entry.color,
                    boxShadow: `0 0 10px ${entry.color}40`
                  }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-bold text-foreground tabular-nums">{entry.value}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }
  return null;
};

export function WeeklyChart() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="rounded-xl border border-border bg-card overflow-hidden relative"
    >
      {/* Futuristic glow effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent blur-sm" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/5 to-transparent" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 sm:px-6 py-4 relative">
        <div className="flex items-center gap-3">
          <div className="relative">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div className="absolute inset-0 blur-md bg-primary/40" />
          </div>
          <h3 className="font-semibold text-foreground">Acompanhamento Semanal</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-primary">
          <Sparkles className="h-3 w-3" />
          <span className="hidden sm:inline">Interativo</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 px-4 sm:px-6 py-3 border-b border-border/50">
        {legendItems.map((item, index) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div
              className="h-3 w-3 rounded-md transition-all duration-300 group-hover:scale-125"
              style={{ 
                backgroundColor: item.color,
                boxShadow: `0 0 10px ${item.color}40`
              }}
            />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart 
            data={data} 
            barCategoryGap="15%"
            onMouseMove={(state: any) => {
              if (state?.activeTooltipIndex !== undefined) {
                setActiveIndex(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              {/* Gradients for bars */}
              <linearGradient id="gradientNaoIniciado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.9} />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id="gradientPendentes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary-glow))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="gradientAtencao" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 85%, 60%)" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="gradientResolvidos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142, 71%, 55%)" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.7} />
              </linearGradient>

              {/* Glow filters */}
              <filter id="glowPrimary" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
              opacity={0.5}
            />
            <XAxis
              dataKey="semana"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ 
                fill: "hsl(var(--primary) / 0.08)",
                radius: 8
              }}
            />
            
            <Bar
              dataKey="naoIniciado"
              name="Não iniciado"
              fill="url(#gradientNaoIniciado)"
              radius={[6, 6, 0, 0]}
              animationDuration={1000}
              animationBegin={0}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-ni-${index}`}
                  style={{
                    transition: "all 0.3s ease",
                    transform: activeIndex === index ? "scaleY(1.05)" : "scaleY(1)",
                    transformOrigin: "bottom",
                    filter: activeIndex === index ? "brightness(1.2)" : "none",
                  }}
                />
              ))}
            </Bar>
            <Bar
              dataKey="pendentes"
              name="Pendentes"
              fill="url(#gradientPendentes)"
              radius={[6, 6, 0, 0]}
              animationDuration={1000}
              animationBegin={200}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-p-${index}`}
                  style={{
                    transition: "all 0.3s ease",
                    transform: activeIndex === index ? "scaleY(1.05)" : "scaleY(1)",
                    transformOrigin: "bottom",
                    filter: activeIndex === index ? "brightness(1.2) drop-shadow(0 0 8px hsl(var(--primary) / 0.5))" : "none",
                  }}
                />
              ))}
            </Bar>
            <Bar
              dataKey="atencao"
              name="Atenção"
              fill="url(#gradientAtencao)"
              radius={[6, 6, 0, 0]}
              animationDuration={1000}
              animationBegin={400}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-a-${index}`}
                  style={{
                    transition: "all 0.3s ease",
                    transform: activeIndex === index ? "scaleY(1.05)" : "scaleY(1)",
                    transformOrigin: "bottom",
                    filter: activeIndex === index ? "brightness(1.2)" : "none",
                  }}
                />
              ))}
            </Bar>
            <Bar
              dataKey="resolvidos"
              name="Resolvidos"
              fill="url(#gradientResolvidos)"
              radius={[6, 6, 0, 0]}
              animationDuration={1000}
              animationBegin={600}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-r-${index}`}
                  style={{
                    transition: "all 0.3s ease",
                    transform: activeIndex === index ? "scaleY(1.05)" : "scaleY(1)",
                    transformOrigin: "bottom",
                    filter: activeIndex === index ? "brightness(1.2)" : "none",
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 sm:px-6 pb-4">
        {legendItems.map((item, index) => {
          const total = data.reduce((sum, d) => sum + (d[item.key as keyof typeof d] as number), 0);
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              className="text-center p-2 rounded-lg bg-muted/30 border border-border/50"
            >
              <p className="text-lg sm:text-xl font-bold" style={{ color: item.color }}>
                {total}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{item.label}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
