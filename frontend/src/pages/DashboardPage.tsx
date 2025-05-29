import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import type { DecisionWithDetails } from '@/types';
import { Plus, Sparkles, LogOut, BarChart3, Settings } from 'lucide-react';
import { DecisionCard } from '@/components/DecisionCard';
import { CreateDecisionDialog } from '@/components/CreateDecisionDialog';
import { AnalyticsPage } from '@/pages/AnalyticsPage';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: decisions = [], isLoading, refetch } = useQuery<DecisionWithDetails[]>({
    queryKey: ['decisions'],
    queryFn: () => apiClient.getDecisions() as Promise<DecisionWithDetails[]>,
  });

  const handleDecisionCreated = () => {
    refetch();
    setShowCreateDialog(false);
  };

  if (showAnalytics) {
    return <AnalyticsPage onBack={() => setShowAnalytics(false)} />;
  }

  return (
    <div className="min-h-screen bg-ghibli-forest">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10 shadow-ghibli">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary animate-sparkle" />
              <h1 className="text-2xl font-bold text-primary font-handwritten">Aleator</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {user?.email}
              </Badge>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAnalytics(true)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back! 🌟
          </h2>
          <p className="text-gray-600">
            Ready to make some mindful decisions? Your probability-guided choices await.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="flex-1 sm:flex-none"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Decision
            </Button>
            
            <Card className="flex-1 sm:max-w-sm">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Active Decisions</p>
                  <p className="text-2xl font-bold">{decisions.length}</p>
                </div>
                <Sparkles className="w-8 h-8 text-primary animate-float" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Decisions Grid */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900">Your Decisions</h3>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : decisions.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No decisions yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Create your first decision to start making choices with mindful randomness.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Decision
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {decisions.map((decision: DecisionWithDetails) => (
                <DecisionCard 
                  key={decision.id} 
                  decision={decision}
                  onUpdate={refetch}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Decision Dialog */}
      <CreateDecisionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleDecisionCreated}
      />
    </div>
  );
}