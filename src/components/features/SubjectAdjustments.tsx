"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { BackgroundOptions } from "@/types";

interface SubjectAdjustmentsProps {
  current: BackgroundOptions;
  onChange: (options: BackgroundOptions) => void;
  disabled?: boolean;
}

export function SubjectAdjustments({ current, onChange, disabled }: SubjectAdjustmentsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          Subject Adjustments
        </Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs px-2 hover:bg-muted"
          onClick={() => onChange({
            ...current,
            filters: { brightness: 100, contrast: 100, saturation: 100, shadow: 0, opacity: 100 }
          })}
          disabled={disabled}
        >
          Reset
        </Button>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            <span>Brightness</span>
            <span className="text-primary font-mono">{current.filters?.brightness || 100}%</span>
          </div>
          <Slider
            value={[current.filters?.brightness || 100]}
            min={0}
            max={200}
            step={1}
            onValueChange={([v]) => onChange({
              ...current,
              filters: { ...(current.filters || { brightness: 100, contrast: 100, saturation: 100, opacity: 100 }), brightness: v }
            })}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            <span>Contrast</span>
            <span className="text-primary font-mono">{current.filters?.contrast || 100}%</span>
          </div>
          <Slider
            value={[current.filters?.contrast || 100]}
            min={0}
            max={200}
            step={1}
            onValueChange={([v]) => onChange({
              ...current,
              filters: { ...(current.filters || { brightness: 100, contrast: 100, saturation: 100, opacity: 100 }), contrast: v }
            })}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            <span>Saturation</span>
            <span className="text-primary font-mono">{current.filters?.saturation || 100}%</span>
          </div>
          <Slider
            value={[current.filters?.saturation || 100]}
            min={0}
            max={200}
            step={1}
            onValueChange={([v]) => onChange({
              ...current,
              filters: { ...(current.filters || { brightness: 100, contrast: 100, saturation: 100, opacity: 100 }), saturation: v }
            })}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            <span>Shadow</span>
            <span className="text-primary font-mono">{(current.filters?.shadow || 0)}px</span>
          </div>
          <Slider
            value={[current.filters?.shadow || 0]}
            min={0}
            max={50}
            step={1}
            onValueChange={([v]) => onChange({
              ...current,
              filters: { ...(current.filters || { brightness: 100, contrast: 100, saturation: 100, shadow: 0, opacity: 100 }), shadow: v }
            })}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            <span>Opacity</span>
            <span className="text-primary font-mono">{current.filters?.opacity ?? 100}%</span>
          </div>
          <Slider
            value={[current.filters?.opacity ?? 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => onChange({
              ...current,
              filters: { ...(current.filters || { brightness: 100, contrast: 100, saturation: 100, shadow: 0, opacity: 100 }), opacity: v }
            })}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
