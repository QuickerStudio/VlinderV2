import { useCallback, useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useExtensionState } from "@/context/extension-state-context";
import { vscode } from "@/utils/vscode";
import Banner from "@/components/ui/Banner";

const isNewMajorOrMinorVersion = (
  currentVersion: string,
  lastVersion: string
) => {
  const [currentMajor, currentMinor] = currentVersion.split(".").map(Number);
  const [lastMajor, lastMinor] = lastVersion.split(".").map(Number);

  return currentMajor > lastMajor || currentMinor > lastMinor;
};

export default function AnnouncementBanner() {
  const { lastShownAnnouncementId, version } = useExtensionState();
  const isNewVersion = isNewMajorOrMinorVersion(
    version,
    lastShownAnnouncementId ?? "0.0.0"
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const closeAnnouncement = useCallback(() => {
    vscode.postMessage({
      type: "didCloseAnnouncement",
    });
    setIsDismissed(true);
  }, []);

  if (!isNewVersion || isDismissed) return null;

  return (
    <Card className="rounded-none sticky top-0">
      <CardContent className="p-4 rounded-none">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Latest Updates (v3.7.21)</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => closeAnnouncement()}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="mt-2 text-sm text-card-foreground space-y-2">
            <p>
              ⚡ Lightning Quick Questions - Ask AI instantly without interrupting your main conversation
            </p>
            <p>🛠️ Redesigned Tools Tab - Centralized tool management in Settings</p>
            <p>🎯 Smart Drag & Drop - Drag banner to code editor for instant formatting</p>
          </div>

          <CollapsibleContent className="mt-2 text-sm text-card-foreground space-y-2">
            <p>🌟 Perfect TSX Support - Full TypeScript React formatting capabilities</p>
            <p>🔧 20+ Language Support - Auto-detect and format any file type</p>
            <p>� Enhanced UX - Improved interface design and user experience</p>

            {/* Drag-and-drop formatting banner */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/30">
              <p className="text-xs text-muted-foreground mb-2">
                🎯 New Feature: Drag & Drop Formatting
              </p>
              <div className="flex items-center gap-3">
                <Banner
                  className="w-16 h-10 rounded border border-muted-foreground/20 hover:border-primary/50 transition-colors"
                  draggable={true}
                />
                <div className="flex-1 text-xs">
                  <p className="font-medium">Drag this icon to code editor</p>
                  <p className="text-muted-foreground">
                    Automatically execute Prettier formatting
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleContent>

          <div className="mt-3 flex items-center gap-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1" />
                )}
                {isExpanded ? "Show less" : "Show more"}
              </Button>
            </CollapsibleTrigger>

            <Button asChild variant="ghost" size="sm">
              <a
                href="https://github.com/QuickerStudio/Vlinder"
                target="_blank"
                rel="noreferrer"
              >
                View on GitHub
              </a>
            </Button>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
