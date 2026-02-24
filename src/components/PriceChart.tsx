"use client";

import { PriceHistoryPoint } from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PriceChartProps {
  data: PriceHistoryPoint[];
  currency?: string;
}

export default function PriceChart({ data, currency = "EUR" }: PriceChartProps) {
  if (data.length < 2) {
    return (
      <div className="bg-slate-50 rounded-xl p-8 text-center">
        <p className="text-slate-500">
          Pas assez de données pour afficher un graphique.
          <br />
          <span className="text-sm">
            Les prix sont enregistrés automatiquement à chaque vérification.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">
        📈 Évolution du prix
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}${currency}`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            }}
            formatter={(value: number | undefined) => [`${value ?? 0} ${currency}`, "Prix"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", r: 3 }}
            activeDot={{ r: 5, fill: "#1d4ed8" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
