'use client';

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
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

interface ChartBarProps {
  title: string;
  description?: string;
  data: Array<Record<string, unknown>>;
  config: ChartConfig;
  dataKey: string;
  xAxisKey: string;
  formatXAxis?: (value: string | number) => string;
  className?: string;
}

export function ChartBar({
  title,
  description,
  data,
  config,
  dataKey,
  xAxisKey,
  formatXAxis,
  className = '',
}: ChartBarProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-full">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={formatXAxis || ((value) => value?.toString().slice(0, 3))}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar 
              dataKey={dataKey} 
              fill={`var(--color-${dataKey})`} 
              radius={8} 
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 