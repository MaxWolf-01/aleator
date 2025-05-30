import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import type { DecisionWithDetails } from '@/types';
import { Plus, Dice1 } from 'lucide-react';
import { DecisionCard } from '@/components/DecisionCard';
import { CreateDecisionDialog } from '@/components/CreateDecisionDialog';
import { AccountDropdown } from '@/components/AccountDropdown';

export function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: decisions = [], isLoading, refetch } = useQuery<DecisionWithDetails[]>({
    queryKey: ['decisions'],
    queryFn: () => apiClient.getDecisions() as Promise<DecisionWithDetails[]>,
    enabled: !authLoading && !!user,
  });

  const handleDecisionCreated = () => {
    refetch();
    setShowCreateDialog(false);
  };


  return (
    <div className="matsu-app relative">
      <div className="texture"></div>
      
      <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 lg:mb-10">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <Dice1 className="w-6 h-6 md:w-8 md:h-8 text-[oklch(0.71_0.097_111.7)]" />
              <h1 className="text-2xl md:text-3xl font-bold">Aleator</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="matsu-button shrink-0"
                size="sm"
              >
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">New Decision</span>
              </Button>
              
              {/* Account Dropdown */}
              <AccountDropdown />
            </div>
          </div>
          <p className="text-[oklch(0.51_0.077_78.9)] text-base md:text-lg">
            Make moderation easier with mindful randomness
          </p>
        </div>

        {/* Decision Cards */}
        <div className="grid gap-6 md:gap-8 lg:gap-10 lg:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            // Loading skeleton
            [...Array(3)].map((_, i) => (
              <div key={i} className="matsu-card h-96 lg:h-[26rem] animate-pulse">
                <div className="p-6">
                  <div className="h-6 bg-[oklch(0.88_0.035_83.6)] rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-[oklch(0.88_0.035_83.6)] rounded w-1/2 mb-6"></div>
                  <div className="h-32 bg-[oklch(0.88_0.035_83.6)] rounded mb-4"></div>
                  <div className="h-12 bg-[oklch(0.88_0.035_83.6)] rounded"></div>
                </div>
              </div>
            ))
          ) : decisions.length === 0 ? (
            // Empty state
            <div className="col-span-full">
              <div className="matsu-card text-center py-12 px-6">
                <Dice1 className="w-16 h-16 text-[oklch(0.71_0.097_111.7)] mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">No decisions yet</h3>
                <p className="text-[oklch(0.51_0.077_74.3)] mb-6">
                  Create your first decision to start making choices with mindful randomness.
                </p>
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="matsu-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Decision
                </Button>
              </div>
            </div>
          ) : (
            // Decision cards
            decisions.map((decision: DecisionWithDetails) => (
              <DecisionCard 
                key={decision.id} 
                decision={decision}
                onUpdate={refetch}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Decision Dialog */}
      <CreateDecisionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleDecisionCreated}
      />
    </div>
  );
}