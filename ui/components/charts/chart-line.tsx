'use client';

import { CartesianGrid, Line, LineChart, XAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface ChartLineProps {
  title: string;
  description?: string;
  data: Array<Record<string, unknown>>;
  config: ChartConfig;
  dataKey: string;
  xAxisKey: string;
  formatXAxis?: (value: string | number) => string;
  className?: string;
}

export function ChartLine({
  title,
  description,
  data,
  config,
  dataKey,
  xAxisKey,
  formatXAxis,
  className = '',
}: ChartLineProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatXAxis || ((value) => value?.toString().slice(0, 3))}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey={dataKey}
              type="natural"
              stroke={`var(--color-${dataKey})`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 