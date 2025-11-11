"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

export default function MonthlyLine({ data }: { data: Array<{ month: string; value: number }> }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line dataKey="value" name="เธเธณเธเธงเธเธฃเธฒเธขเธเธฒเธฃ">
            <LabelList dataKey="value" position="top" />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
