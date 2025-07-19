'use client';

import { Bar, BarChart, XAxis } from 'recharts';
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

interface ChartStackedBarProps {
  title: string;
  description?: string;
  data: Array<Record<string, unknown>>;
  config: ChartConfig;
  dataKeys: string[];
  xAxisKey: string;
  formatXAxis?: (value: string | number) => string;
  className?: string;
}

export function ChartStackedBar({
  title,
  description,
  data,
  config,
  dataKeys,
  xAxisKey,
  formatXAxis,
  className = '',
}: ChartStackedBarProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-full">
          <BarChart accessibilityLayer data={data}>
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={formatXAxis || ((value) => {
                return new Date(value).toLocaleDateString('en-US', {
                  weekday: 'short',
                });
              })}
            />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={`var(--color-${key})`}
                radius={index === 0 ? [0, 0, 4, 4] : [4, 4, 0, 0]}
              />
            ))}
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={false}
              defaultIndex={1}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 