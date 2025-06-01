import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Info, Github, ExternalLink, Palette, Bot } from "lucide-react";

export function AboutButton() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-10 px-3 text-[oklch(0.51_0.077_74.3)] hover:text-[oklch(0.41_0.077_78.9)] hover:bg-[oklch(0.88_0.035_83.6)] transition-all"
        >
          <Info className="h-4 w-4 mr-2" />
          <span className="font-medium">About</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] bg-[oklch(0.94_0.035_83.6)] border-l-2 border-[oklch(0.74_0.063_80.8)]">
        <div className="px-6">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold text-[oklch(0.29_0.086_109)] font-['Nunito']">
              About Aleator
            </SheetTitle>
            <SheetDescription className="sr-only">
              Information about Aleator decision-making app
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Quote first */}
            <div className="p-4 bg-[oklch(0.88_0.035_83.6)] rounded-[0.625rem] border-2 border-[oklch(0.74_0.063_80.8)]">
              <p className="text-sm text-[oklch(0.41_0.077_78.9)] italic leading-relaxed font-['Nunito'] font-medium">
                "A recent dilemma: how to eat less sweet food but still have it in moderation? 
                My solution: Have it with prob 2/3. Abiding by the RNG is far easier than resisting temptation!"
              </p>
              <p className="text-xs text-[oklch(0.51_0.077_74.3)] mt-2 font-['Nunito'] font-semibold">
                — Neel Nanda
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[oklch(0.41_0.077_78.9)] leading-relaxed font-['Nunito']">
                So I went ahead and implemented an app for that! Aleator helps you stick to your goals by letting RNG make the hard choices. 
                We're good at setting high-level goals, and the RNG both enforces discipline and rewards you with treats sometimes.
              </p>
              
              <p className="text-sm text-[oklch(0.41_0.077_78.9)] leading-relaxed font-['Nunito']">
                The name comes from "aleatoric" - relating to chance or randomness (alea = 🎲). 
                Aleator lets you gradually improve your habits while tracking your progress along the way.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[oklch(0.29_0.086_109)] font-['Nunito']">Credits & Links</h3>
              
                <a 
                  href="https://x.com/NeelNanda5/status/1926581501405082036" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[oklch(0.71_0.097_111.7)] hover:text-[oklch(0.59_0.096_111.8)] transition-colors font-['Nunito'] font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  Original idea by Neel Nanda
                </a>
                
                <a 
                  href="https://github.com/MaxWolf-01/aleator" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[oklch(0.71_0.097_111.7)] hover:text-[oklch(0.59_0.096_111.8)] transition-colors font-['Nunito'] font-medium"
                >
                  <Github className="h-4 w-4" />
                  View source on GitHub
                </a>
                
                <a 
                  href="https://matsu-theme.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[oklch(0.71_0.097_111.7)] hover:text-[oklch(0.59_0.096_111.8)] transition-colors font-['Nunito'] font-medium"
                >
                  <Palette className="h-4 w-4" />
                  Matsu theme by Matt Wierzbicki
                </a>
                
                <a 
                  href="https://www.anthropic.com/claude-code" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[oklch(0.71_0.097_111.7)] hover:text-[oklch(0.59_0.096_111.8)] transition-colors font-['Nunito'] font-medium"
                >
                  <Bot className="h-4 w-4" />
                  Built with (by) Claude Code 🦜
                </a>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
