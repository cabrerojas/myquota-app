import React from "react";
import { View, Platform } from "react-native";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface BarChartData {
  label: string;
  value: number;
}

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface WebChartProps {
  data: BarChartData[] | PieChartData[];
  type: "bar" | "pie";
  testID?: string;
}

// ─── WebChart Component ──────────────────────────────────────────────────────────

/**
 * Web-only chart wrapper that renders Recharts components.
 * On native platforms (iOS/Android), returns null — charting is handled
 * by react-native-chart-kit in the parent ChartsScreen.
 *
 * This component is designed to be rendered inside react-native-web's
 * DOM environment, where Recharts (a React DOM library) works natively.
 */
export function WebChart({ data, type, testID }: WebChartProps) {
  // Only render on web — native handles charting via react-native-chart-kit
  if (Platform.OS !== "web") {
    return null;
  }

  if (type === "bar" && data.length > 0) {
    const barData = data as BarChartData[];
    return (
      <View testID={testID}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={barData.map((d) => ({
              name: d.label,
              amount: d.value,
            }))}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#94A3B8", fontSize: 11 }}
              axisLine={{ stroke: "rgba(148,163,184,0.15)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94A3B8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1E293B",
                border: "1px solid rgba(148,163,184,0.2)",
                borderRadius: 8,
                color: "#F8FAFC",
              }}
              labelStyle={{ color: "#94A3B8" }}
              formatter={(value: number) => [`$${value.toLocaleString("es-CL")}`, ""]}
            />
            <Bar
              dataKey="amount"
              fill="rgba(59, 130, 246, 0.8)"
              radius={[4, 4, 0, 0]}
              label={{
                position: "top",
                fill: "#94A3B8",
                fontSize: 11,
                formatter: (value: number) => `$${value.toLocaleString("es-CL")}`,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </View>
    );
  }

  if (type === "pie" && data.length > 0) {
    const pieData = data as PieChartData[];
    return (
      <View testID={testID}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData.map((d) => ({
                name: d.name,
                value: d.value,
              }))}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1E293B",
                border: "1px solid rgba(148,163,184,0.2)",
                borderRadius: 8,
                color: "#F8FAFC",
              }}
              formatter={(value: number) => [
                `$${value.toLocaleString("es-CL")}`,
                "",
              ]}
            />
            <Legend
              wrapperStyle={{ color: "#94A3B8", fontSize: 12 }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </View>
    );
  }

  // Empty data — render empty container
  return <View testID={testID} />;
}

export default WebChart;
