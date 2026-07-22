'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function PortfolioChart({ data }: { data: { date: string, value: number }[] }) {
  
  const minVal = Math.min(...data.map(d => d.value)) * 0.95;
  const maxVal = Math.max(...data.map(d => d.value)) * 1.05;
  
  // Determine if it's green or red overall
  const start = data[0]?.value || 0;
  const end = data[data.length - 1]?.value || 0;
  const isUp = end >= start;
  const color = isUp ? '#34d399' : '#f87171'; // emerald-400 or red-400

  return (
    <div className="w-full h-full relative group">
      {/* Glow Effect */}
      <div 
        className="absolute inset-0 blur-3xl opacity-20 pointer-events-none transition-opacity duration-1000"
        style={{ background: color }}
      />
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" hide />
          <YAxis domain={[minVal, maxVal]} hide />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-background/80 backdrop-blur border border-foreground/10 px-4 py-2 rounded-xl shadow-2xl">
                    <p className="text-foreground/60 text-xs mb-1 font-mono">{payload[0].payload.date}</p>
                    <p className="text-xl font-mono text-foreground">₹{Number(payload[0].value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                );
              }
              return null;
            }}
            cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: color, stroke: 'var(--background)', strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
