'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { StatisticsService } from '@/lib/api/services/statistics';
import { ApiKeyStatistics } from '@/lib/api/schemas/statistics';
import { ChartStackedBar } from '@/components/charts/chart-stacked-bar';
import { ChartLine } from '@/components/charts/chart-line';
import { ChartConfig } from '@/components/ui/chart';

interface StatisticsModalProps {
  open: boolean;
  onClose: () => void;
  apiKeyId: string;
  apiKeyName: string;
}

const chartConfig = {
  incoming: {
    label: 'Incoming',
    color: 'hsl(var(--chart-2))',
  },
  outgoing: {
    label: 'Outgoing',
    color: 'hsl(var(--chart-1))',
  },
  cost: {
    label: 'Cost',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

export function StatisticsModal({
  open,
  onClose,
  apiKeyId,
  apiKeyName,
}: StatisticsModalProps) {
  const [statistics, setStatistics] = useState<ApiKeyStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (value: string | number) => {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const setDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const fetchStatistics = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { start_date?: string; end_date?: string } = {};
      if (startDate) {
        params.start_date = new Date(startDate).toISOString();
      }
      if (endDate) {
        params.end_date = new Date(endDate + 'T23:59:59').toISOString();
      }

      const data = await StatisticsService.getApiKeyStatistics(apiKeyId, params);
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  }, [apiKeyId, startDate, endDate]);

  useEffect(() => {
    if (open && apiKeyId) {
      setDateRange(30);
    }
  }, [open, apiKeyId]);

  useEffect(() => {
    if (open && apiKeyId && (startDate || endDate)) {
      fetchStatistics();
    }
  }, [open, apiKeyId, startDate, endDate, fetchStatistics]);

  if (!open) return null;

    return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-[70vw] max-h-[95vh] overflow-y-auto w-[95vw] md:w-[70vw] p-3 md:p-6 mx-auto my-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
            <span className="truncate">API Key Statistics - {apiKeyName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 md:space-y-8">
           <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
             <div className="flex flex-wrap gap-2">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setDateRange(7)}
                 className="text-xs px-2 py-1"
               >
                 7 days
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setDateRange(30)}
                 className="text-xs px-2 py-1"
               >
                 30 days
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setDateRange(90)}
                 className="text-xs px-2 py-1"
               >
                 90 days
               </Button>
             </div>
             
             <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
               <div>
                 <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                 <Input
                   id="start-date"
                   type="date"
                   value={startDate}
                   onChange={(e) => setStartDate(e.target.value)}
                   className="w-full sm:w-32 h-8 text-xs"
                 />
               </div>
               <div>
                 <Label htmlFor="end-date" className="text-xs">End Date</Label>
                 <Input
                   id="end-date"
                   type="date"
                   value={endDate}
                   onChange={(e) => setEndDate(e.target.value)}
                   className="w-full sm:w-32 h-8 text-xs"
                 />
               </div>
               <Button
                 onClick={fetchStatistics}
                 disabled={isLoading}
                 size="sm"
                 className="h-8 w-full sm:w-auto"
               >
                 {isLoading ? (
                   <RefreshCw className="h-4 w-4 animate-spin" />
                 ) : (
                   <Calendar className="h-4 w-4" />
                 )}
               </Button>
             </div>
           </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mr-2" />
              Loading statistics...
            </div>
                                ) : statistics ? (
             <div className="space-y-4 md:space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="text-center p-4 md:p-8 border rounded-lg min-w-0">
                    <div className="text-xl md:text-3xl font-bold text-green-600 break-words overflow-hidden">
                      <span className="block">{formatCurrency(statistics.total_incoming)}</span>
                      <span className="text-xs md:text-sm font-normal text-muted-foreground">msat</span>
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2">Total Incoming</div>
                  </div>
                  <div className="text-center p-4 md:p-8 border rounded-lg min-w-0">
                    <div className="text-xl md:text-3xl font-bold text-red-600 break-words overflow-hidden">
                      <span className="block">{formatCurrency(statistics.total_outgoing)}</span>
                      <span className="text-xs md:text-sm font-normal text-muted-foreground">msat</span>
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2">Total Outgoing</div>
                  </div>
                  <div className="text-center p-4 md:p-8 border rounded-lg min-w-0">
                    <div className={`text-xl md:text-3xl font-bold break-words overflow-hidden ${
                      statistics.total_cost >= 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      <span className="block">{statistics.total_cost >= 0 ? '+' : ''}{formatCurrency(statistics.total_cost)}</span>
                      <span className="text-xs md:text-sm font-normal text-muted-foreground">msat</span>
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2">Net Cost</div>
                  </div>
                  <div className="text-center p-4 md:p-8 border rounded-lg min-w-0">
                    <div className="text-xl md:text-3xl font-bold break-words overflow-hidden">
                      <span className="block">{statistics.daily_stats.length}</span>
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2">Days with Activity</div>
                  </div>
                </div>

              <Separator />

              {statistics.daily_stats.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8">
                  <ChartStackedBar
                    title="Daily Transactions"
                    description="Incoming vs Outgoing amounts per day (in msat)"
                    data={statistics.daily_stats}
                    config={chartConfig}
                    dataKeys={['incoming', 'outgoing']}
                    xAxisKey="date"
                    formatXAxis={formatDate}
                    className="h-[300px] md:h-[450px]"
                  />
                  
                  <ChartLine
                    title="Daily Cost Trend"
                    description="Net cost (outgoing - incoming) over time (in msat)"
                    data={statistics.daily_stats}
                    config={chartConfig}
                    dataKey="cost"
                    xAxisKey="date"
                    formatXAxis={formatDate}
                    className="h-[300px] md:h-[450px]"
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transaction data found for the selected date range</p>
                  <p className="text-sm">Try selecting a different date range or check if there are any transactions for this API key</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a date range to view statistics</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 