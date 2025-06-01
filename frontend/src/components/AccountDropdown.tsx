import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { 
  User, 
  LogOut, 
  Download, 
  UserPlus, 
  LogIn,
  Mail,
  Sparkles,
  Zap,
  Moon,
  Sun
} from "lucide-react";
import { apiClient } from "@/lib/api";

export function AccountDropdown() {
  const { user, logout } = useAuth();
  const { animationsEnabled, setAnimationsEnabled } = usePreferences();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await apiClient.exportData();
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aleator-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Error silently handled - user will see export didn't download
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  const isGuest = user?.email?.startsWith("guest_");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative h-10 w-10 rounded-full bg-[oklch(0.88_0.035_83.6)] hover:bg-[oklch(0.84_0.045_83.6)] border-2 border-[oklch(0.74_0.063_80.8)] transition-all hover:transform hover:scale-105"
        >
          <User className="h-5 w-5 text-[oklch(0.41_0.077_78.9)]" />
          {isGuest && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[oklch(0.71_0.097_111.7)] ring-2 ring-[oklch(0.94_0.035_83.6)]" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-64 bg-[oklch(0.94_0.035_83.6)] border-2 border-[oklch(0.74_0.063_80.8)] shadow-[0_4px_0_0_oklch(0.64_0.063_80.8)]"
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none text-[oklch(0.29_0.086_109)]">
              {isGuest ? "Guest Account" : "My Account"}
            </p>
            <div className="flex items-center gap-2 text-xs text-[oklch(0.51_0.077_74.3)]">
              <Mail className="h-3 w-3" />
              <span className="truncate">{user?.email || "Not signed in"}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-[oklch(0.74_0.063_80.8)]" />
        
        {/* Preferences Section - Available for all users */}
        <DropdownMenuCheckboxItem 
          checked={animationsEnabled}
          onCheckedChange={setAnimationsEnabled}
          className="cursor-pointer hover:bg-[oklch(0.88_0.035_83.6)] focus:bg-[oklch(0.88_0.035_83.6)] focus:text-[oklch(0.29_0.086_109)] transition-colors rounded-md"
        >
          <Zap className="h-4 w-4" />
          <span>Animations</span>
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem 
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          className="cursor-pointer hover:bg-[oklch(0.88_0.035_83.6)] focus:bg-[oklch(0.88_0.035_83.6)] focus:text-[oklch(0.29_0.086_109)] transition-colors rounded-md"
        >
          {theme === "dark" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span>Dark Mode</span>
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuSeparator className="bg-[oklch(0.74_0.063_80.8)]" />
        
        {/* Export - Available for all users */}
        <DropdownMenuItem 
          onClick={handleExport}
          disabled={isExporting}
          className="cursor-pointer hover:bg-[oklch(0.88_0.035_83.6)] focus:bg-[oklch(0.88_0.035_83.6)] focus:text-[oklch(0.29_0.086_109)] transition-colors rounded-md"
        >
          <Download className="h-4 w-4" />
          <span>{isExporting ? "Exporting..." : "Export Data"}</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-[oklch(0.74_0.063_80.8)]" />
        
        {isGuest ? (
          <>
            <DropdownMenuItem 
              onClick={() => navigate("/register")}
              className="cursor-pointer hover:bg-[oklch(0.88_0.035_83.6)] focus:bg-[oklch(0.88_0.035_83.6)] focus:text-[oklch(0.29_0.086_109)] transition-colors rounded-md"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Account</span>
              <Sparkles className="ml-auto h-3 w-3 text-amber-500" />
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigate("/login")}
              className="cursor-pointer hover:bg-[oklch(0.88_0.035_83.6)] focus:bg-[oklch(0.88_0.035_83.6)] focus:text-[oklch(0.29_0.086_109)] transition-colors rounded-md"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[oklch(0.74_0.063_80.8)]" />
            <div className="px-2 py-2">
              <p className="text-xs text-[oklch(0.51_0.077_74.3)] leading-relaxed">
                Sign in to sync decisions across devices.
              </p>
            </div>
          </>
        ) : (
          <>
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="cursor-pointer hover:bg-[oklch(0.54_0.19_29.2)]/10 focus:bg-[oklch(0.54_0.19_29.2)]/10 focus:text-[oklch(0.54_0.19_29.2)] text-[oklch(0.54_0.19_29.2)] transition-colors rounded-md"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}