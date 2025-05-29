import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Area, AreaChart } from 'recharts';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Plus, TrendingUp, TrendingDown, Calendar, Target, CheckCircle, XCircle, Sparkles, BarChart3, Edit2, Trash2, Save, X } from 'lucide-react';

const ProbabilisticDecisionApp = () => {
  const [decisions, setDecisions] = useState([
    {
      id: 1,
      title: "Have dessert",
      description: "Sweet treats in moderation",
      type: "binary",
      probability: 67,
      frequency: "manual",
      dailyLimit: null,
      weeklyLimit: null,
      monthlyLimit: null,
      lastRollTime: null,
      rollsToday: 0,
      rollsThisWeek: 0,
      rollsThisMonth: 0,
      yesText: "Yes, have dessert!",
      noText: "No, save it for later",
      lastRoll: true,
      pendingCompliance: false,
      totalRolls: 45,
      compliance: 89,
      history: [
        { decision: "#1", probability: 80, compliance: 85 },
        { decision: "#2", probability: 75, compliance: 87 },
        { decision: "#3", probability: 70, compliance: 91 },
        { decision: "#4", probability: 67, compliance: 89 },
      ]
    },
    {
      id: 2,
      title: "What to eat for lunch",
      description: "Random meal selection",
      type: "choice",
      options: [
        { name: "Salad", probability: 40 },
        { name: "Pasta", probability: 25 },
        { name: "Soup", probability: 20 },
        { name: "Sandwich", probability: 15 }
      ],
      frequency: "daily",
      dailyLimit: 1,
      weeklyLimit: null,
      monthlyLimit: null,
      lastRollTime: null,
      rollsToday: 0,
      rollsThisWeek: 0,
      rollsThisMonth: 0,
      lastChoice: "Pasta",
      pendingCompliance: false,
      totalRolls: 28,
      compliance: 92,
      history: [
        { decision: "#1", choice: "Salad", compliance: 88, probabilities: { "Salad": 45, "Pasta": 25, "Soup": 20, "Sandwich": 10 } },
        { decision: "#2", choice: "Soup", compliance: 90, probabilities: { "Salad": 42, "Pasta": 25, "Soup": 20, "Sandwich": 13 } },
        { decision: "#3", choice: "Pasta", compliance: 94, probabilities: { "Salad": 40, "Pasta": 25, "Soup": 20, "Sandwich": 15 } },
        { decision: "#4", choice: "Sandwich", compliance: 92, probabilities: { "Salad": 40, "Pasta": 25, "Soup": 20, "Sandwich": 15 } },
      ]
    },
    {
      id: 3,
      title: "Check social media",
      description: "Mindful digital consumption",
      type: "binary",
      probability: 30,
      frequency: "weekly",
      dailyLimit: null,
      weeklyLimit: 5,
      monthlyLimit: null,
      lastRollTime: Date.now() - 2000000,
      rollsToday: 0,
      rollsThisWeek: 2,
      rollsThisMonth: 0,
      yesText: "Yes, check feeds",
      noText: "No, stay focused",
      lastRoll: null,
      pendingCompliance: false,
      totalRolls: 62,
      compliance: 78,
      history: [
        { decision: "#1", probability: 50, compliance: 72 },
        { decision: "#2", probability: 40, compliance: 75 },
        { decision: "#3", probability: 35, compliance: 79 },
        { decision: "#4", probability: 30, compliance: 78 },
      ]
    }
  ]);

  const [newDecision, setNewDecision] = useState({
    title: '',
    description: '',
    type: 'binary',
    probability: 50,
    options: [
      { name: 'Option 1', probability: 40 },
      { name: 'Option 2', probability: 35 },
      { name: 'Option 3', probability: 25 }
    ],
    frequency: 'manual',
    dailyLimit: 1,
    weeklyLimit: 5,
    monthlyLimit: 20,
    yesText: 'Yes, do it!',
    noText: 'No, skip this time'
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDecision, setEditingDecision] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(d.setDate(diff)).toDateString();
  };

  const getMonthStart = (date) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1).toDateString();
  };

  const canRoll = (decision) => {
    if (decision.frequency === 'manual') return true;
    
    const now = new Date();
    const today = now.toDateString();
    const thisWeek = getWeekStart(now);
    const thisMonth = getMonthStart(now);
    
    const lastRollDate = decision.lastRollTime ? new Date(decision.lastRollTime).toDateString() : null;
    const lastRollWeek = decision.lastRollTime ? getWeekStart(new Date(decision.lastRollTime)) : null;
    const lastRollMonth = decision.lastRollTime ? getMonthStart(new Date(decision.lastRollTime)) : null;
    
    // Check daily limit
    if (decision.frequency === 'daily' && decision.dailyLimit) {
      if (lastRollDate === today && decision.rollsToday >= decision.dailyLimit) {
        return false;
      }
    }
    
    // Check weekly limit
    if (decision.frequency === 'weekly' && decision.weeklyLimit) {
      if (lastRollWeek === thisWeek && decision.rollsThisWeek >= decision.weeklyLimit) {
        return false;
      }
    }
    
    // Check monthly limit
    if (decision.frequency === 'monthly' && decision.monthlyLimit) {
      if (lastRollMonth === thisMonth && decision.rollsThisMonth >= decision.monthlyLimit) {
        return false;
      }
    }
    
    return true;
  };

  const adjustProbability = (decisionId, change) => {
    setDecisions(prev => prev.map(d => 
      d.id === decisionId 
        ? { ...d, probability: Math.max(0, Math.min(100, d.probability + change)) }
        : d
    ));
  };

  const adjustChoiceProbability = (decisionId, optionIndex, change) => {
    setDecisions(prev => prev.map(d => {
      if (d.id === decisionId) {
        const newOptions = [...d.options];
        const currentProb = newOptions[optionIndex].probability;
        const newProb = Math.max(0, Math.min(100, currentProb + change));
        const delta = newProb - currentProb;
        
        // Only proceed if there's actually a change
        if (delta === 0) return d;
        
        // Calculate how much we need to redistribute
        const otherOptions = newOptions.filter((_, i) => i !== optionIndex);
        const totalOtherProb = otherOptions.reduce((sum, opt) => sum + opt.probability, 0);
        
        // If we can't redistribute (would make others negative), don't change
        if (totalOtherProb + delta < 0) return d;
        
        // Update the target option
        newOptions[optionIndex].probability = newProb;
        
        // Redistribute the delta proportionally among other options
        if (otherOptions.length > 0 && totalOtherProb > 0) {
          otherOptions.forEach((option, i) => {
            const originalIndex = newOptions.findIndex(opt => opt === option);
            const proportion = option.probability / totalOtherProb;
            const adjustment = delta * proportion;
            newOptions[originalIndex].probability = Math.max(0, option.probability - adjustment);
          });
          
          // Ensure it sums to 100% (handle rounding errors)
          const currentTotal = newOptions.reduce((sum, opt) => sum + opt.probability, 0);
          if (currentTotal !== 100) {
            const diff = 100 - currentTotal;
            newOptions[0].probability = Math.max(0, newOptions[0].probability + diff);
          }
        } else if (otherOptions.length > 0) {
          // If other options have 0 probability, distribute evenly
          const redistributeAmount = -delta / otherOptions.length;
          otherOptions.forEach(option => {
            const originalIndex = newOptions.findIndex(opt => opt === option);
            newOptions[originalIndex].probability = Math.max(0, redistributeAmount);
          });
        }
        
        return { ...d, options: newOptions };
      }
      return d;
    }));
  };

  const rollDice = (decisionId) => {
    const decision = decisions.find(d => d.id === decisionId);
    if (!canRoll(decision)) return;
    
    const now = Date.now();
    const today = new Date().toDateString();
    const thisWeek = getWeekStart(new Date());
    const thisMonth = getMonthStart(new Date());
    
    const lastRollDate = decision.lastRollTime ? new Date(decision.lastRollTime).toDateString() : null;
    const lastRollWeek = decision.lastRollTime ? getWeekStart(new Date(decision.lastRollTime)) : null;
    const lastRollMonth = decision.lastRollTime ? getMonthStart(new Date(decision.lastRollTime)) : null;
    
    // Reset counters if needed
    const newRollsToday = lastRollDate === today ? decision.rollsToday + 1 : 1;
    const newRollsThisWeek = lastRollWeek === thisWeek ? decision.rollsThisWeek + 1 : 1;
    const newRollsThisMonth = lastRollMonth === thisMonth ? decision.rollsThisMonth + 1 : 1;
    
    if (decision.type === 'binary') {
      const result = Math.random() * 100 < decision.probability;
      setDecisions(prev => prev.map(d => 
        d.id === decisionId 
          ? { ...d, lastRoll: result, pendingCompliance: true, totalRolls: d.totalRolls + 1, lastRollTime: now, rollsToday: newRollsToday, rollsThisWeek: newRollsThisWeek, rollsThisMonth: newRollsThisMonth }
          : d
      ));
    } else if (decision.type === 'choice') {
      // Weighted random selection
      const rand = Math.random() * 100;
      let cumulative = 0;
      let selectedOption = decision.options[0];
      
      for (const option of decision.options) {
        cumulative += option.probability;
        if (rand <= cumulative) {
          selectedOption = option;
          break;
        }
      }
      
      setDecisions(prev => prev.map(d => 
        d.id === decisionId 
          ? { ...d, lastChoice: selectedOption.name, pendingCompliance: true, totalRolls: d.totalRolls + 1, lastRollTime: now, rollsToday: newRollsToday, rollsThisWeek: newRollsThisWeek, rollsThisMonth: newRollsThisMonth }
          : d
      ));
    }
  };

  const deleteDecision = (decisionId) => {
    setDecisions(prev => prev.filter(d => d.id !== decisionId));
    setDeleteConfirm(null);
  };

  const startEdit = (decision) => {
    setEditingDecision({...decision});
  };

  const saveEdit = () => {
    if (!editingDecision.title) return;
    
    setDecisions(prev => prev.map(d => 
      d.id === editingDecision.id ? editingDecision : d
    ));
    setEditingDecision(null);
  };

  const cancelEdit = () => {
    setEditingDecision(null);
  };

  const recordCompliance = (decisionId, followed) => {
    setDecisions(prev => prev.map(d => {
      if (d.id === decisionId) {
        // Calculate new compliance rate based on current history
        const currentCompliantRolls = d.history.length > 0 ? 
          Math.round(d.history[d.history.length - 1].compliance * d.history.length / 100) : 0;
        const newCompliantRolls = followed ? currentCompliantRolls + 1 : currentCompliantRolls;
        const newTotalDecisions = d.history.length + 1;
        const newCompliance = Math.round((newCompliantRolls / newTotalDecisions) * 100);
        
        // Add new decision point to history
        let newHistoryPoint;
        if (d.type === 'binary') {
          newHistoryPoint = {
            decision: `#${newTotalDecisions}`,
            probability: d.probability,
            compliance: newCompliance
          };
        } else {
          // For choice decisions, save the current probability distribution
          const probabilities = {};
          d.options.forEach(opt => {
            probabilities[opt.name] = opt.probability;
          });
          
          newHistoryPoint = {
            decision: `#${newTotalDecisions}`,
            choice: d.lastChoice,
            compliance: newCompliance,
            probabilities: probabilities
          };
        }
        
        return { 
          ...d, 
          pendingCompliance: false,
          compliance: newCompliance,
          history: [...d.history, newHistoryPoint]
        };
      }
      return d;
    }));
  };

  const getDiceIcon = (probability) => {
    if (probability <= 16) return <Dice1 className="w-8 h-8" />;
    if (probability <= 33) return <Dice2 className="w-8 h-8" />;
    if (probability <= 50) return <Dice3 className="w-8 h-8" />;
    if (probability <= 66) return <Dice4 className="w-8 h-8" />;
    if (probability <= 83) return <Dice5 className="w-8 h-8" />;
    return <Dice6 className="w-8 h-8" />;
  };

  const getFrequencyLabel = (freq, dailyLimit, weeklyLimit, monthlyLimit) => {
    if (freq === 'manual') return 'Manual';
    if (freq === 'daily') return `${dailyLimit}x daily`;
    if (freq === 'weekly') return `${weeklyLimit}x weekly`;
    if (freq === 'monthly') return `${monthlyLimit}x monthly`;
    return freq;
  };

  const getCardStyle = (lastRoll) => {
    // Keep all cards with neutral paper background
    return {
      background: 'oklch(0.94 0.035 83.6)',
      borderColor: 'oklch(0.74 0.063 80.8)'
    };
  };

  // Custom CSS for the matsu theme
  const matsuStyles = `
    .matsu-app {
      background: oklch(0.91 0.048 83.6);
      color: oklch(0.41 0.077 78.9);
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      min-height: 100vh;
    }
    
    .matsu-card {
      background: oklch(0.94 0.035 83.6);
      border: 2px solid oklch(0.74 0.063 80.8);
      border-radius: 0.625rem;
      box-shadow: 0 2px 0 0 oklch(0.74 0.063 80.8), inset 0 1px 0 0 rgba(255,255,255,0.1);
      transition: all 0.3s ease;
      position: relative;
    }
    
    .matsu-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.03) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.03) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(120, 200, 255, 0.02) 0%, transparent 50%);
      border-radius: 0.625rem;
      pointer-events: none;
    }
    
    .matsu-button {
      background: oklch(0.71 0.097 111.7);
      color: oklch(0.98 0.005 0);
      border: 2px solid oklch(0.59 0.096 111.8);
      border-radius: 0.625rem;
      box-shadow: 0 2px 0 0 oklch(0.59 0.096 111.8);
      font-weight: 700;
      transition: all 0.2s ease;
    }
    
    .matsu-button:hover {
      transform: translateY(1px);
      box-shadow: 0 1px 0 0 oklch(0.59 0.096 111.8);
    }
    
    .result-yes {
      background: oklch(0.85 0.08 140);
      border-color: oklch(0.75 0.12 140);
      box-shadow: 0 2px 0 0 oklch(0.75 0.12 140);
      color: oklch(0.25 0.05 140);
    }
    
    .result-no {
      background: oklch(0.85 0.08 20);
      border-color: oklch(0.75 0.12 20);
      box-shadow: 0 2px 0 0 oklch(0.75 0.12 20);
      color: oklch(0.25 0.05 20);
    }
    
    .roll-button {
      background: oklch(0.71 0.097 111.7);
      border: 2px solid oklch(0.59 0.096 111.8);
      border-radius: 0.625rem;
      box-shadow: 0 2px 0 0 oklch(0.59 0.096 111.8);
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }
    
    .roll-button:hover {
      transform: translateY(1px);
      box-shadow: 0 1px 0 0 oklch(0.59 0.096 111.8);
    }
    
    .probability-button {
      background: oklch(0.88 0.035 83.6);
      border: 2px solid oklch(0.78 0.063 80.8);
      border-radius: 0.5rem;
      box-shadow: 0 1px 0 0 oklch(0.78 0.063 80.8);
      color: oklch(0.41 0.077 78.9);
      transition: all 0.2s ease;
      min-width: 44px;
      min-height: 44px;
    }
    
    .probability-button:hover {
      background: oklch(0.84 0.045 83.6);
      transform: translateY(0.5px);
      box-shadow: 0 0.5px 0 0 oklch(0.78 0.063 80.8);
    }
    
    .result-choice {
      background: oklch(0.87 0.06 220);
      border-color: oklch(0.77 0.10 220);
      box-shadow: 0 2px 0 0 oklch(0.77 0.10 220);
      color: oklch(0.25 0.05 220);
    }
    
    .matsu-badge {
      background: oklch(0.89 0.025 83.6);
      border: 1px solid oklch(0.79 0.045 80.8);
      color: oklch(0.45 0.077 78.9);
      border-radius: 0.375rem;
      font-weight: 600;
      font-size: 0.75rem;
    }
    
    .matsu-badge-outline {
      background: oklch(0.92 0.015 83.6);
      border: 1px solid oklch(0.82 0.035 80.8);
      color: oklch(0.48 0.067 78.9);
      border-radius: 0.375rem;
      font-weight: 600;
      font-size: 0.75rem;
    }
    
    .probability-button:active {
      transform: translateY(1px);
      box-shadow: none;
    }
    
    .roll-button:active {
      transform: translateY(2px);
      box-shadow: none;
    }
    
    .texture {
      background-image: 
        radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px),
        radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 1px, transparent 1px),
        linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.01) 50%, transparent 60%);
      background-size: 24px 24px, 16px 16px, 100px 100px;
      opacity: 0.4;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 1;
    }
  `;

  return (
    <div className="matsu-app relative">
      <style>{matsuStyles}</style>
      <div className="texture"></div>
      
      <div className="relative z-10 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-[oklch(0.71_0.097_111.7)]" />
              <h1 className="text-2xl md:text-3xl font-bold">Probabilistic Decisions</h1>
            </div>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="matsu-button shrink-0"
              size="sm"
            >
              <Plus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">New Decision</span>
            </Button>
          </div>
          <p className="text-[oklch(0.51_0.077_78.9)] text-base md:text-lg">
            Make moderation easier with mindful randomness
          </p>
        </div>

        {/* Decision Cards */}
        <div className="grid gap-6 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          {decisions.map((decision) => {
            const cardStyle = getCardStyle(decision.lastRoll);
            return (
              <Card 
                key={decision.id} 
                className="matsu-card relative overflow-hidden"
                style={cardStyle}
              >
                <div className="relative z-10">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-xl">{decision.title}</CardTitle>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(decision)}
                              className="w-7 h-7 rounded-md bg-[oklch(0.88_0.035_83.6)] hover:bg-[oklch(0.84_0.045_83.6)] border border-[oklch(0.78_0.063_80.8)] flex items-center justify-center text-[oklch(0.41_0.077_78.9)] hover:text-[oklch(0.31_0.077_78.9)] transition-all"
                              title="Edit decision"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(decision.id)}
                              className="w-7 h-7 rounded-md bg-[oklch(0.88_0.035_83.6)] hover:bg-[oklch(0.94_0.08_20)] border border-[oklch(0.78_0.063_80.8)] hover:border-[oklch(0.75_0.12_20)] flex items-center justify-center text-[oklch(0.41_0.077_78.9)] hover:text-[oklch(0.75_0.12_20)] transition-all"
                              title="Delete decision"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-[oklch(0.51_0.077_74.3)] mb-3">
                          {decision.description}
                        </p>
                      </div>
                      <div className="ml-2 flex flex-col items-end gap-1">
                        <div className="matsu-badge px-2 py-1">
                          {getFrequencyLabel(decision.frequency, decision.dailyLimit, decision.weeklyLimit, decision.monthlyLimit)}
                        </div>
                        <div className="matsu-badge-outline px-2 py-1">
                          {decision.type === 'binary' ? 'Yes/No' : 'Choice'}
                        </div>
                      </div>
                    </div>

                    {/* Prominent Outcome Display */}
                    {(decision.lastRoll !== null || decision.lastChoice) && (
                      <div className={`p-4 rounded-xl mb-4 text-center ${
                        decision.type === 'binary' 
                          ? (decision.lastRoll ? 'result-yes' : 'result-no')
                          : 'result-choice'
                      }`}>
                        {decision.type === 'binary' ? (
                          <>
                            <div className="flex items-center justify-center gap-3 mb-1">
                              {decision.lastRoll ? (
                                <CheckCircle className="w-6 h-6" />
                              ) : (
                                <XCircle className="w-6 h-6" />
                              )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="matsu-card w-full max-w-md" style={{background: 'oklch(0.92 0.042 83.6)'}}>
              <CardHeader>
                <CardTitle className="text-red-600">Delete Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Are you sure you want to delete this decision? This action cannot be undone and will remove all associated history.</p>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => setDeleteConfirm(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => deleteDecision(deleteConfirm)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Decision Modal */}
        {editingDecision && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="matsu-card w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{background: 'oklch(0.92 0.042 83.6)'}}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5" />
                  Edit Decision
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Decision Title</Label>
                  <Input 
                    id="edit-title"
                    value={editingDecision.title}
                    onChange={(e) => setEditingDecision({...editingDecision, title: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea 
                    id="edit-description"
                    value={editingDecision.description}
                    onChange={(e) => setEditingDecision({...editingDecision, description: e.target.value})}
                    className="mt-1"
                  />
                </div>

                {editingDecision.type === 'binary' && (
                  <>
                    <div>
                      <Label>Probability: {editingDecision.probability}%</Label>
                      <Slider
                        value={[editingDecision.probability]}
                        onValueChange={([value]) => setEditingDecision({...editingDecision, probability: value})}
                        max={100}
                        step={1}
                        className="mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Yes Text</Label>
                        <Input 
                          value={editingDecision.yesText}
                          onChange={(e) => setEditingDecision({...editingDecision, yesText: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>No Text</Label>
                        <Input 
                          value={editingDecision.noText}
                          onChange={(e) => setEditingDecision({...editingDecision, noText: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </>
                )}

                {editingDecision.type === 'choice' && (
                  <div>
                    <Label>Choice Options (names only - probabilities can be adjusted on the card)</Label>
                    <div className="space-y-2 mt-2">
                      {editingDecision.options.map((option, index) => (
                        <Input 
                          key={index}
                          value={option.name}
                          onChange={(e) => {
                            const newOptions = [...editingDecision.options];
                            newOptions[index] = { ...newOptions[index], name: e.target.value };
                            setEditingDecision({ ...editingDecision, options: newOptions });
                          }}
                          placeholder={`Option ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Frequency</Label>
                  <Select 
                    value={editingDecision.frequency} 
                    onValueChange={(value) => setEditingDecision({...editingDecision, frequency: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual (roll whenever)</SelectItem>
                      <SelectItem value="daily">Daily limit</SelectItem>
                      <SelectItem value="weekly">Weekly limit</SelectItem>
                      <SelectItem value="monthly">Monthly limit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingDecision.frequency === 'daily' && (
                  <div>
                    <Label>Daily Limit: {editingDecision.dailyLimit} roll(s)</Label>
                    <Slider
                      value={[editingDecision.dailyLimit || 1]}
                      onValueChange={([value]) => setEditingDecision({...editingDecision, dailyLimit: value})}
                      min={1}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                )}

                {editingDecision.frequency === 'weekly' && (
                  <div>
                    <Label>Weekly Limit: {editingDecision.weeklyLimit} roll(s)</Label>
                    <Slider
                      value={[editingDecision.weeklyLimit || 5]}
                      onValueChange={([value]) => setEditingDecision({...editingDecision, weeklyLimit: value})}
                      min={1}
                      max={50}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                )}

                {editingDecision.frequency === 'monthly' && (
                  <div>
                    <Label>Monthly Limit: {editingDecision.monthlyLimit} roll(s)</Label>
                    <Slider
                      value={[editingDecision.monthlyLimit || 20]}
                      onValueChange={([value]) => setEditingDecision({...editingDecision, monthlyLimit: value})}
                      min={1}
                      max={200}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={cancelEdit}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveEdit}
                    className="matsu-button flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
                              <span className="text-2xl font-bold">
                                {decision.lastRoll ? decision.yesText : decision.noText}
                              </span>
                            </div>
                            <p className="text-sm opacity-90">Alea iacta est!</p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-center gap-3 mb-1">
                              <Sparkles className="w-6 h-6" />
                              <span className="text-2xl font-bold">
                                {decision.lastChoice}
                              </span>
                            </div>
                            <p className="text-sm opacity-90">
                              Your random choice 🎲
                            </p>
                          </>
                        )}

                        {/* Compliance Tracking */}
                        {decision.pendingCompliance && (
                          <div className="mt-4 space-y-3">
                            <p className="text-sm font-medium">Did you follow this decision?</p>
                            <div className="flex gap-2 justify-center">
                              <Button
                                onClick={() => recordCompliance(decision.id, true)}
                                className="bg-white/20 hover:bg-white/30 border border-current flex-1 md:flex-none min-h-[44px]"
                              >
                                ✓ Yes, I did
                              </Button>
                              <Button
                                onClick={() => recordCompliance(decision.id, false)}
                                className="bg-white/20 hover:bg-white/30 border border-current flex-1 md:flex-none min-h-[44px]"
                              >
                                ✗ No, I didn't
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Probability & Roll Section for Binary Decisions */}
                    {decision.type === 'binary' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            {getDiceIcon(decision.probability)}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl md:text-3xl font-bold">{decision.probability}%</span>
                              </div>
                              <span className="text-xs text-[oklch(0.51_0.077_74.3)]">probability</span>
                            </div>
                          </div>
                          
                          {/* Probability adjustment buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => adjustProbability(decision.id, -1)}
                              size="sm"
                              className="probability-button text-xl font-bold"
                            >
                              −
                            </Button>
                            <Button
                              onClick={() => adjustProbability(decision.id, 1)}
                              size="sm"
                              className="probability-button text-xl font-bold"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Choice Section for Choice Decisions */}
                    {decision.type === 'choice' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-[oklch(0.87_0.06_220)] flex items-center justify-center">
                            <span className="text-lg font-bold text-[oklch(0.25_0.05_220)]">{decision.options.length}</span>
                          </div>
                          <div>
                            <span className="text-2xl md:text-3xl font-bold">Weighted Choice</span>
                            <div className="text-xs text-[oklch(0.51_0.077_74.3)]">individual probabilities</div>
                          </div>
                        </div>
                        
                        {/* Individual Option Probabilities */}
                        <div className="space-y-3">
                          {decision.options.map((option, index) => (
                            <div key={option.name} className="flex items-center justify-between gap-3 p-3 bg-[oklch(0.89_0.04_83.6)] rounded-lg">
                              <div className="flex items-center gap-3 flex-1">
                                {getDiceIcon(Math.round(option.probability))}
                                <span className="font-medium">{option.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold min-w-[3rem] text-right">{Math.round(option.probability)}%</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    onClick={() => adjustChoiceProbability(decision.id, index, -1)}
                                    size="sm"
                                    className="probability-button text-lg font-bold w-8 h-8 p-0"
                                  >
                                    −
                                  </Button>
                                  <Button
                                    onClick={() => adjustChoiceProbability(decision.id, index, 1)}
                                    size="sm"
                                    className="probability-button text-lg font-bold w-8 h-8 p-0"
                                  >
                                    +
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Total Check */}
                        <div className="text-xs text-center text-[oklch(0.51_0.077_74.3)]">
                          Total: {Math.round(decision.options.reduce((sum, opt) => sum + opt.probability, 0))}%
                        </div>
                      </div>
                    )}

                    {/* Frequency Status */}
                    {decision.frequency !== 'manual' && (
                      <div className="text-xs text-[oklch(0.51_0.077_74.3)] bg-[oklch(0.89_0.04_83.6)] p-2 rounded">
                        {decision.frequency === 'daily' && `Today: ${decision.rollsToday} / ${decision.dailyLimit} rolls used`}
                        {decision.frequency === 'weekly' && `This week: ${decision.rollsThisWeek} / ${decision.weeklyLimit} rolls used`}
                        {decision.frequency === 'monthly' && `This month: ${decision.rollsThisMonth} / ${decision.monthlyLimit} rolls used`}
                      </div>
                    )}

                    {/* Roll Button */}
                    <Button 
                      onClick={() => rollDice(decision.id)}
                      disabled={!canRoll(decision)}
                      className="w-full roll-button text-lg py-6 font-bold disabled:opacity-50"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      {!canRoll(decision) ? 'Daily limit reached' : 
                       decision.type === 'binary' ? 'Roll the Dice' : 'Pick Random Choice'}
                    </Button>

                    {/* Integrated Charts */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <BarChart3 className="w-4 h-4" />
                        <span>Progress & Compliance</span>
                      </div>
                      
                      {decision.type === 'binary' ? (
                        <div className="h-32 md:h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={decision.history} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.74 0.063 80.8)" opacity={0.3} />
                              <XAxis 
                                dataKey="decision" 
                                stroke="oklch(0.51 0.077 74.3)" 
                                fontSize={10}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis 
                                yAxisId="left"
                                stroke="oklch(0.71 0.097 111.7)" 
                                fontSize={10}
                                axisLine={false}
                                tickLine={false}
                                domain={[0, 100]}
                                width={25}
                              />
                              <YAxis 
                                yAxisId="right"
                                orientation="right"
                                stroke="oklch(0.75 0.12 140)" 
                                fontSize={10}
                                axisLine={false}
                                tickLine={false}
                                domain={[0, 100]}
                                width={25}
                              />
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: 'oklch(0.92 0.042 83.6)',
                                  border: '2px solid oklch(0.74 0.063 80.8)',
                                  borderRadius: '0.625rem',
                                  fontSize: '12px'
                                }}
                                formatter={(value, name) => [
                                  `${value}%`, 
                                  name === 'probability' ? 'Target %' : 'Compliance %'
                                ]}
                              />
                              
                              <Area
                                yAxisId="right"
                                type="monotone"
                                dataKey="compliance"
                                fill="oklch(0.75 0.12 140)"
                                fillOpacity={0.2}
                                stroke="oklch(0.75 0.12 140)"
                                strokeWidth={2}
                              />
                              
                              <Line 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="probability" 
                                stroke="oklch(0.71 0.097 111.7)" 
                                strokeWidth={3}
                                dot={{ fill: 'oklch(0.71 0.097 111.7)', strokeWidth: 2, r: 3 }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        // Chart for choice decisions showing probability evolution
                        <div className="h-32 md:h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart 
                              data={decision.history} 
                              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.74 0.063 80.8)" opacity={0.3} />
                              <XAxis 
                                dataKey="decision" 
                                stroke="oklch(0.51 0.077 74.3)" 
                                fontSize={10}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis 
                                stroke="oklch(0.51 0.077 74.3)" 
                                fontSize={10}
                                axisLine={false}
                                tickLine={false}
                                domain={[0, 100]}
                                width={25}
                              />
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: 'oklch(0.92 0.042 83.6)',
                                  border: '2px solid oklch(0.74 0.063 80.8)',
                                  borderRadius: '0.625rem',
                                  fontSize: '12px'
                                }}
                                formatter={(value, name) => [`${Math.round(value)}%`, name]}
                              />
                              
                              {/* Create a line for each option */}
                              {decision.options.map((option, index) => {
                                const colors = [
                                  'oklch(0.71 0.097 111.7)',
                                  'oklch(0.75 0.12 140)', 
                                  'oklch(0.75 0.12 20)',
                                  'oklch(0.75 0.12 260)',
                                  'oklch(0.75 0.12 300)'
                                ];
                                return (
                                  <Line
                                    key={option.name}
                                    type="monotone"
                                    dataKey={`probabilities.${option.name}`}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={2}
                                    dot={{ fill: colors[index % colors.length], strokeWidth: 1, r: 2 }}
                                  />
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      
                      {/* Legend & Stats */}
                      <div className="flex justify-between items-center text-xs text-[oklch(0.51_0.077_74.3)]">
                        <div className="flex items-center gap-3">
                          {decision.type === 'binary' ? (
                            <>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'oklch(0.71 0.097 111.7)' }}></div>
                                <span>Target</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'oklch(0.75 0.12 140)' }}></div>
                                <span>Follow-through</span>
                              </div>
                            </>
                          ) : (
                            decision.options.slice(0, 3).map((option, index) => {
                              const colors = ['oklch(0.71 0.097 111.7)', 'oklch(0.75 0.12 140)', 'oklch(0.75 0.12 20)'];
                              return (
                                <div key={option.name} className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index] }}></div>
                                  <span>{option.name}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div className="text-right">
                          <span>{decision.totalRolls} decisions • {decision.compliance}% followed</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Create New Decision Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="matsu-card w-full max-w-lg" style={{background: 'oklch(0.92 0.042 83.6)'}}>
              <CardHeader>
                <CardTitle>Create New Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Decision Title</Label>
                  <Input 
                    id="title"
                    placeholder="e.g., Have dessert"
                    value={newDecision.title}
                    onChange={(e) => setNewDecision({...newDecision, title: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea 
                    id="description"
                    placeholder="e.g., Sweet treats in moderation"
                    value={newDecision.description}
                    onChange={(e) => setNewDecision({...newDecision, description: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Decision Type</Label>
                  <Select 
                    value={newDecision.type} 
                    onValueChange={(value) => setNewDecision({...newDecision, type: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="binary">Yes/No Decision</SelectItem>
                      <SelectItem value="choice">Random Choice from List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newDecision.type === 'binary' && (
                  <>
                    <div>
                      <Label>Initial Probability: {newDecision.probability}%</Label>
                      <Slider
                        value={[newDecision.probability]}
                        onValueChange={([value]) => setNewDecision({...newDecision, probability: value})}
                        max={100}
                        step={1}
                        className="mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="yesText">Yes Text</Label>
                        <Input 
                          id="yesText"
                          placeholder="Yes, do it!"
                          value={newDecision.yesText}
                          onChange={(e) => setNewDecision({...newDecision, yesText: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="noText">No Text</Label>
                        <Input 
                          id="noText"
                          placeholder="No, skip this time"
                          value={newDecision.noText}
                          onChange={(e) => setNewDecision({...newDecision, noText: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </>
                )}

                {newDecision.type === 'choice' && (
                  <div>
                    <Label>Choice Options</Label>
                    <div className="space-y-2 mt-2">
                      {newDecision.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input 
                            placeholder={`Option ${index + 1}`}
                            value={option.name}
                            onChange={(e) => {
                              const newOptions = [...newDecision.options];
                              newOptions[index] = { ...newOptions[index], name: e.target.value };
                              setNewDecision({ ...newDecision, options: newOptions });
                            }}
                            className="flex-1"
                          />
                          <div className="flex items-center gap-1">
                            <Input 
                              type="number"
                              min="0"
                              max="100"
                              value={option.probability}
                              onChange={(e) => {
                                const newProb = parseInt(e.target.value) || 0;
                                const newOptions = [...newDecision.options];
                                newOptions[index] = { ...newOptions[index], probability: newProb };
                                setNewDecision({ ...newDecision, options: newOptions });
                              }}
                              className="w-16 text-center"
                            />
                            <span className="text-sm">%</span>
                          </div>
                          {newDecision.options.length > 2 && (
                            <Button
                              onClick={() => {
                                const newOptions = newDecision.options.filter((_, i) => i !== index);
                                setNewDecision({ ...newDecision, options: newOptions });
                              }}
                              size="sm"
                              variant="outline"
                              className="px-2"
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                      <div className="flex justify-between items-center">
                        <Button
                          onClick={() => {
                            const newOptions = [...newDecision.options, { name: `Option ${newDecision.options.length + 1}`, probability: 10 }];
                            setNewDecision({ ...newDecision, options: newOptions });
                          }}
                          size="sm"
                          variant="outline"
                          className="text-sm"
                        >
                          + Add Option
                        </Button>
                        <span className="text-sm text-[oklch(0.51_0.077_74.3)]">
                          Total: {newDecision.options.reduce((sum, opt) => sum + opt.probability, 0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select 
                    value={newDecision.frequency} 
                    onValueChange={(value) => setNewDecision({...newDecision, frequency: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual (roll whenever)</SelectItem>
                      <SelectItem value="daily">Daily limit</SelectItem>
                      <SelectItem value="weekly">Weekly limit</SelectItem>
                      <SelectItem value="monthly">Monthly limit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newDecision.frequency === 'daily' && (
                  <div>
                    <Label>Daily Limit: {newDecision.dailyLimit} roll(s)</Label>
                    <Slider
                      value={[newDecision.dailyLimit]}
                      onValueChange={([value]) => setNewDecision({...newDecision, dailyLimit: value})}
                      min={1}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                )}

                {newDecision.frequency === 'weekly' && (
                  <div>
                    <Label>Weekly Limit: {newDecision.weeklyLimit} roll(s)</Label>
                    <Slider
                      value={[newDecision.weeklyLimit]}
                      onValueChange={([value]) => setNewDecision({...newDecision, weeklyLimit: value})}
                      min={1}
                      max={50}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                )}

                {newDecision.frequency === 'monthly' && (
                  <div>
                    <Label>Monthly Limit: {newDecision.monthlyLimit} roll(s)</Label>
                    <Slider
                      value={[newDecision.monthlyLimit]}
                      onValueChange={([value]) => setNewDecision({...newDecision, monthlyLimit: value})}
                      min={1}
                      max={200}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={() => setShowCreateForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      if (newDecision.title && (newDecision.type === 'binary' || (newDecision.options.length > 1 && newDecision.options.every(opt => opt.name.trim())))) {
                        setDecisions([...decisions, {
                          ...newDecision,
                          id: Date.now(),
                          lastRoll: newDecision.type === 'binary' ? null : undefined,
                          lastChoice: newDecision.type === 'choice' ? null : undefined,
                          pendingCompliance: false,
                          totalRolls: 0,
                          compliance: 0,
                          history: [],
                          lastRollTime: null,
                          rollsToday: 0,
                          rollsThisWeek: 0,
                          rollsThisMonth: 0
                        }]);
                        setNewDecision({
                          title: '',
                          description: '',
                          type: 'binary',
                          probability: 50,
                          options: [
                            { name: 'Option 1', probability: 40 },
                            { name: 'Option 2', probability: 35 },
                            { name: 'Option 3', probability: 25 }
                          ],
                          frequency: 'manual',
                          dailyLimit: 1,
                          weeklyLimit: 5,
                          monthlyLimit: 20,
                          yesText: 'Yes, do it!',
                          noText: 'No, skip this time'
                        });
                        setShowCreateForm(false);
                      }
                    }}
                    className="matsu-button flex-1"
                  >
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProbabilisticDecisionApp;
