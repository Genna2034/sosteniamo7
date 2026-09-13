"use client";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { coloreTerritorio } from "@/lib/territori";

export function FrequencyChart({ data, soglia }: { data: Array<{ name: string; value: number | null }>; soglia: number }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e8ec" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => (v == null ? "n.d." : `${v}%`)} />
          <ReferenceLine y={soglia} stroke="#b23a2e" strokeDasharray="6 4" label={{ value: `Soglia ${soglia}%`, position: "insideTopRight", fill: "#b23a2e", fontSize: 11 }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>{data.map(d => <Cell key={d.name} fill={coloreTerritorio(d.name)} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
