import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import type { DecisionWithDetails } from '@/types';
import { Plus, Dice1, LogOut, User } from 'lucide-react';
import { DecisionCard } from '@/components/DecisionCard';
import { CreateDecisionDialog } from '@/components/CreateDecisionDialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const { user, logout, isGuest, loading: authLoading } = useAuth();
  const navigate = useNavigate();
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

  const handleExportData = async () => {
    try {
      const response = await apiClient.exportData();
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aleator-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    if (!isGuest) {
      navigate('/login');
    }
  };

  return (
    <div className="matsu-app relative">
      <div className="texture"></div>
      
      <div className="relative z-10 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
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
              
              {/* Account Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="matsu-button"
                  >
                    <User className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-[oklch(0.94_0.035_83.6)] border-[oklch(0.74_0.063_80.8)]">
                  <SheetHeader>
                    <SheetTitle className="text-[oklch(0.29_0.086_109)]">
                      {isGuest ? 'Guest Session' : 'Account'}
                    </SheetTitle>
                    <SheetDescription className="text-[oklch(0.51_0.077_74.3)]">
                      {isGuest ? 'Your data is stored locally' : 'Manage your account and data'}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    {user && (
                      <div>
                        <p className="text-sm text-[oklch(0.51_0.077_74.3)] mb-1">Signed in as</p>
                        <p className="font-medium text-[oklch(0.29_0.086_109)]">
                          {isGuest ? 'Guest' : (user.email || 'Unknown')}
                        </p>
                        {isGuest && (
                          <Badge 
                            variant="secondary" 
                            className="mt-2 bg-[oklch(0.71_0.097_111.7)]/10 text-[oklch(0.51_0.097_111.7)] border-[oklch(0.71_0.097_111.7)]/20"
                          >
                            Guest Account
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {isGuest && (
                      <div className="space-y-3 p-4 bg-[oklch(0.71_0.097_111.7)]/5 rounded-lg border border-[oklch(0.71_0.097_111.7)]/20">
                        <p className="text-sm text-[oklch(0.29_0.086_109)]">
                          Create an account to save your decisions across devices.
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => navigate('/register')} 
                            size="sm"
                            className="flex-1 matsu-button"
                          >
                            Create Account
                          </Button>
                          <Button 
                            onClick={() => navigate('/login')} 
                            variant="outline" 
                            size="sm"
                            className="flex-1 matsu-button"
                          >
                            Sign In
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {user && (
                      <div className="space-y-3">
                        <Button 
                          onClick={handleExportData}
                          variant="outline"
                          className="w-full justify-start matsu-button"
                        >
                          Export Data
                        </Button>
                        
                        {!isGuest && (
                          <Button 
                            onClick={handleLogout}
                          variant="outline"
                          className="w-full justify-start matsu-button text-[oklch(0.54_0.19_29.2)] hover:text-[oklch(0.54_0.19_29.2)] hover:bg-[oklch(0.54_0.19_29.2)]/10"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </Button>
                      )}
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          <p className="text-[oklch(0.51_0.077_78.9)] text-base md:text-lg">
            Make moderation easier with mindful randomness
          </p>
        </div>

        {/* Decision Cards */}
        <div className="grid gap-6 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            // Loading skeleton
            [...Array(3)].map((_, i) => (
              <div key={i} className="matsu-card h-96 animate-pulse">
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