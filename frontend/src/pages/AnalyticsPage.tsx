import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import type { AnalyticsOverview } from '@/types';
import { ArrowLeft, TrendingUp, Target, Calendar, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsPageProps {
  onBack: () => void;
}

export function AnalyticsPage({ onBack }: AnalyticsPageProps) {
  const { data: overview, isLoading } = useQuery<AnalyticsOverview>({
    queryKey: ['analytics', 'overview'],
    queryFn: () => apiClient.getAnalyticsOverview() as Promise<AnalyticsOverview>,
  });

  const mockTrendData = [
    { date: '2024-01-01', decisions: 3, followThrough: 2 },
    { date: '2024-01-02', decisions: 5, followThrough: 4 },
    { date: '2024-01-03', decisions: 2, followThrough: 2 },
    { date: '2024-01-04', decisions: 4, followThrough: 3 },
    { date: '2024-01-05', decisions: 6, followThrough: 5 },
    { date: '2024-01-06', decisions: 3, followThrough: 1 },
    { date: '2024-01-07', decisions: 7, followThrough: 6 },
  ];

  const mockDecisionTypes = [
    { name: 'Followed Through', value: 75, color: 'var(--color-forest-600)' },
    { name: 'Skipped', value: 25, color: 'var(--color-honey-400)' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ghibli-forest p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-forest-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-forest-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-forest-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghibli-forest p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-primary font-handwritten">
            Analytics & Insights
          </h1>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-ghibli">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Decisions</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.total_decisions || 0}</div>
              <p className="text-xs text-muted-foreground">Active decision rules</p>
            </CardContent>
          </Card>

          <Card className="shadow-ghibli">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rolls</CardTitle>
              <TrendingUp className="h-4 w-4 text-sky-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.total_rolls || 0}</div>
              <p className="text-xs text-muted-foreground">Decisions made</p>
            </CardContent>
          </Card>

          <Card className="shadow-ghibli">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Follow-through Rate</CardTitle>
              <Award className="h-4 w-4 text-honey-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.overall_follow_through_rate ? 
                  `${Math.round(overview.overall_follow_through_rate * 100)}%` : 
                  '0%'
                }
              </div>
              <p className="text-xs text-muted-foreground">Decisions followed</p>
            </CardContent>
          </Card>

          <Card className="shadow-ghibli">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Active</CardTitle>
              <Calendar className="h-4 w-4 text-lavender-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">
                {overview?.most_active_decision?.title || 'No data'}
              </div>
              <p className="text-xs text-muted-foreground">Top decision</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <Card className="shadow-ghibli">
            <CardHeader>
              <CardTitle>Decision Trends</CardTitle>
              <CardDescription>
                Your decision-making patterns over the last week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-forest-200)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--color-forest-600)"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="var(--color-forest-600)" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-card)', 
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="decisions" 
                    stroke="var(--color-sky-600)" 
                    strokeWidth={2}
                    name="Decisions Made"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="followThrough" 
                    stroke="var(--color-forest-600)" 
                    strokeWidth={2}
                    name="Followed Through"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Follow-through Rate Pie Chart */}
          <Card className="shadow-ghibli">
            <CardHeader>
              <CardTitle>Follow-through Rate</CardTitle>
              <CardDescription>
                How often you follow your decision outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockDecisionTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockDecisionTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-card)', 
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {mockDecisionTypes.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-sm text-muted-foreground">
                      {entry.name}: {entry.value}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights Section */}
        <Card className="shadow-ghibli">
          <CardHeader>
            <CardTitle>Insights & Recommendations</CardTitle>
            <CardDescription>
              Personalized tips to improve your decision-making journey
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-forest-50 rounded-lg border border-forest-200">
                <h4 className="font-medium text-forest-800 mb-2">🌱 Keep Growing</h4>
                <p className="text-sm text-forest-700">
                  You're building great habits! Your 75% follow-through rate shows commitment to mindful decision-making.
                </p>
              </div>
              
              <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                <h4 className="font-medium text-sky-800 mb-2">📈 Trending Up</h4>
                <p className="text-sm text-sky-700">
                  Your decision frequency has increased this week. You're becoming more intentional about choices.
                </p>
              </div>
              
              <div className="p-4 bg-honey-50 rounded-lg border border-honey-200">
                <h4 className="font-medium text-honey-800 mb-2">⚖️ Find Balance</h4>
                <p className="text-sm text-honey-700">
                  Consider adjusting probabilities on decisions you skip often. Sometimes small changes make big differences.
                </p>
              </div>
              
              <div className="p-4 bg-lavender-50 rounded-lg border border-lavender-200">
                <h4 className="font-medium text-lavender-800 mb-2">✨ Stay Mindful</h4>
                <p className="text-sm text-lavender-700">
                  Remember: the goal isn't perfection, but conscious choice. Every decision is a step toward better habits.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}