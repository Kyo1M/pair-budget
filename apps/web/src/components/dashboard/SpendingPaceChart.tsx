"use client";

import { useState } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DashboardAnalysis, PaceMode } from "@/lib/analytics";

const money = (value: number) => `¥${value.toLocaleString("ja-JP")}`;
const modes: { value: PaceMode; label: string }[] = [
  { value: "daily", label: "日別" },
  { value: "weekly", label: "週別" },
  { value: "cumulative", label: "累計" },
];

export function SpendingPaceChart({
  analysis,
  mode,
  onModeChange,
}: {
  analysis: DashboardAnalysis;
  mode: PaceMode;
  onModeChange: (mode: PaceMode) => void;
}) {
  const [selectedKey, setSelectedKey] = useState("");
  const points = mode === "weekly" ? analysis.weekly : analysis.daily;
  const available = points.filter((p) => p.amount !== null);
  const selected =
    available.find((p) => p.key === selectedKey) ??
    available[available.length - 1];
  const chartData = points.map((p) => ({
    ...p,
    value: mode === "cumulative" ? p.cumulative : p.amount,
  }));
  const description =
    mode === "daily"
      ? "日ごとの家計支出です。未来の日には値を表示しません。"
      : mode === "weekly"
        ? "月曜〜日曜の合計。月初・月末は対象月内のみ、今週は今日までを集計します。"
        : "月初からの累計。実線は対象月、破線は前月の同じ日付までです。";

  return (
    <Card className="gap-5 overflow-hidden rounded-[var(--pb-radius-lg)] border-border py-5 text-pb-ink shadow-[var(--pb-shadow-md)] sm:py-6">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2.5 text-base font-extrabold">
              <span className="rounded-xl bg-pb-bg p-2 text-pb-muted">
                <ChartNoAxesCombined className="h-5 w-5" strokeWidth={1.75} />
              </span>
              対象月の利用ペース
            </CardTitle>
            <p className="mt-3 max-w-lg text-xs leading-relaxed text-pb-muted">
              {description}
            </p>
          </div>
          <div
            className="flex w-full gap-1 rounded-xl bg-pb-primary-soft/60 p-1 sm:w-auto"
            role="group"
            aria-label="利用ペースの表示方法"
          >
            {modes.map((item) => (
              <Button
                key={item.value}
                type="button"
                className={`min-h-11 flex-1 rounded-lg px-5 sm:flex-none ${mode === item.value ? "bg-white font-bold text-pb-primary shadow-[var(--pb-shadow-sm)] hover:bg-white" : "text-pb-muted hover:bg-white/60"}`}
                variant="ghost"
                aria-pressed={mode === item.value}
                onClick={() => {
                  onModeChange(item.value);
                  setSelectedKey("");
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {analysis.period.isFuture ? (
          <p className="py-12 text-center text-sm text-gray-500">
            まだ到来していない月です
          </p>
        ) : (
          <>
            {!analysis.hasRecords && (
              <p className="mb-3 text-sm text-gray-500">
                この期間の記録はありません。入力済みの記録に基づくグラフです。
              </p>
            )}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-pb-muted">
              <span>利用額（万円）</span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-pb-primary/80" />
                  対象月
                </span>
                {mode === "cumulative" && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 border-t-2 border-dashed border-pb-faint" />
                    前月
                  </span>
                )}
              </span>
            </div>
            <div
              className="h-64 min-w-0 w-full"
              role="img"
              aria-label={`${analysis.period.month}の${modes.find((m) => m.value === mode)?.label}利用額。各期間の金額は下の選択欄でも確認できます。`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                  onClick={(event) => {
                    const index = Number(event.activeTooltipIndex);
                    const point = chartData[index];
                    if (point?.amount !== null && point)
                      setSelectedKey(point.key);
                  }}
                >
                  <CartesianGrid
                    stroke="var(--pb-border)"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    interval="preserveStartEnd"
                    minTickGap={24}
                    tick={{ fontSize: 11, fill: "var(--pb-muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    width={36}
                    domain={[0, "auto"]}
                    tickFormatter={(value: number) =>
                      `${Number((value / 10000).toFixed(1))}`
                    }
                    tick={{ fontSize: 11, fill: "var(--pb-muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) =>
                      typeof value === "number" ? money(value) : "—"
                    }
                    contentStyle={{
                      borderRadius: 13,
                      border: "1px solid var(--pb-border)",
                      boxShadow: "var(--pb-shadow-md)",
                      fontSize: 13,
                    }}
                  />
                  <Line
                    name={mode === "cumulative" ? "対象月の累計" : "利用額"}
                    dataKey="value"
                    type="linear"
                    stroke="var(--pb-primary)"
                    strokeOpacity={0.8}
                    strokeWidth={2.5}
                    dot={mode === "weekly" ? { r: 4 } : false}
                    activeDot={{ r: 6, stroke: "white", strokeWidth: 3 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  {mode === "cumulative" && (
                    <Line
                      name="前月の累計"
                      dataKey="previousCumulative"
                      type="linear"
                      stroke="var(--pb-faint)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {selected && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-pb-bg p-4">
                <label className="flex max-w-full flex-wrap items-center gap-2 text-xs text-pb-muted">
                  確認する期間
                  <select
                    className="min-h-11 max-w-full rounded-xl border bg-white px-3 text-base font-medium text-pb-ink"
                    aria-label="確認する日または週"
                    value={selected.key}
                    onChange={(e) => setSelectedKey(e.target.value)}
                  >
                    {available.map((point) => (
                      <option key={point.key} value={point.key}>
                        {point.label}
                        {mode === "weekly"
                          ? `（${point.dayCount}日分${point.partial ? "・一部期間" : ""}）`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <p
                  aria-live="polite"
                  className="text-xl font-extrabold tabular-nums text-pb-ink"
                >
                  {mode === "cumulative" ? "月初から " : ""}
                  {money(
                    (mode === "cumulative"
                      ? selected.cumulative
                      : selected.amount) ?? 0,
                  )}
                  {mode === "cumulative" &&
                    selected.previousCumulative !== null && (
                      <span className="mt-1 block text-xs font-normal text-pb-muted">
                        前月 {money(selected.previousCumulative)}
                      </span>
                    )}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
