import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Dice1 } from "lucide-react"

function App() {
  const [probability, setProbability] = useState([67])
  const [rollResult, setRollResult] = useState<boolean | null>(null)

  const rollDice = () => {
    const result = Math.random() * 100 < probability[0]
    setRollResult(result)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Aleator</h1>
          </div>
          <p className="text-muted-foreground">
            Make moderation easier with mindful randomness
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Dice1 className="w-5 h-5" />
                  Have dessert
                </CardTitle>
                <CardDescription>
                  Sweet treats in moderation
                </CardDescription>
              </div>
              <Badge variant="secondary">Manual</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {rollResult !== null && (
              <div className={`p-4 rounded-lg text-center font-medium ${
                rollResult 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-orange-50 text-orange-700 border border-orange-200'
              }`}>
                {rollResult ? '🍰 Yes, have dessert!' : '🌙 No, save it for later'}
              </div>
            )}
            
            <div className="space-y-3">
              <Label>Probability: {probability[0]}%</Label>
              <Slider
                value={probability}
                onValueChange={setProbability}
                max={99}
                min={1}
                step={1}
              />
            </div>

            <Button 
              onClick={rollDice}
              className="w-full"
              size="lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Roll the Dice
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          ✨ Properly set up with shadcn/ui + Tailwind v4
        </div>
      </div>
    </div>
  )
}

export default App
