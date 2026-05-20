"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

// TODO: Replace with real API key storage (DB, env vars, or secure backend)
const STORAGE_KEY_OPENAI = "wacampaign_openai_key";
const STORAGE_KEY_CLAUDE = "wacampaign_claude_key";

function getStoredKey(key: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(key) || "";
}

function setStoredKey(key: string, value: string) {
  if (typeof window === "undefined") return;
  if (value.trim()) {
    localStorage.setItem(key, value.trim());
  } else {
    localStorage.removeItem(key);
  }
}

export function AiIntegrationCard() {
  const [openaiKey, setOpenaiKey] = useState(() => getStoredKey(STORAGE_KEY_OPENAI));
  const [claudeKey, setClaudeKey] = useState(() => getStoredKey(STORAGE_KEY_CLAUDE));
  const [showOpenai, setShowOpenai] = useState(false);
  const [showClaude, setShowClaude] = useState(false);

  const handleSave = () => {
    setStoredKey(STORAGE_KEY_OPENAI, openaiKey);
    setStoredKey(STORAGE_KEY_CLAUDE, claudeKey);
    toast.success("AI API keys saved. You can now generate templates with AI.");
  };

  const hasKeys = !!(openaiKey || claudeKey);

  return (
    <Card className="border-zinc-200">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-black flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-500">
          Add your AI provider API keys to enable AI-powered template generation.
        </p>

        <div className="space-y-2">
          <Label htmlFor="openai-key" className="text-black">
            OpenAI API Key
          </Label>
          <div className="flex gap-2">
            <Input
              id="openai-key"
              type={showOpenai ? "text" : "password"}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="border-zinc-200 text-black focus-visible:ring-black"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowOpenai((v) => !v)}
              className="shrink-0 border-zinc-200 text-black hover:bg-zinc-50"
            >
              {showOpenai ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="claude-key" className="text-black">
            Claude API Key
          </Label>
          <div className="flex gap-2">
            <Input
              id="claude-key"
              type={showClaude ? "text" : "password"}
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              placeholder="sk-ant-..."
              className="border-zinc-200 text-black focus-visible:ring-black"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClaude((v) => !v)}
              className="shrink-0 border-zinc-200 text-black hover:bg-zinc-50"
            >
              {showClaude ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-400">
            {hasKeys
              ? "Keys are stored locally in your browser."
              : "No keys configured. Template generation is disabled."}
          </p>
          <Button
            onClick={handleSave}
            className="bg-black text-white hover:bg-zinc-800"
          >
            Save Keys
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { STORAGE_KEY_OPENAI, STORAGE_KEY_CLAUDE };
