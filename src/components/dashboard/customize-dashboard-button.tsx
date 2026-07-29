"use client"

import { SlidersHorizontal, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { WIDGETS, WidgetId } from "@/components/dashboard/widget-registry"

type Props = {
  visible: Record<WidgetId, boolean>
  toggleWidget: (id: WidgetId) => void
  resetLayout: () => void
}

export function CustomizeDashboardButton({ visible, toggleWidget, resetLayout }: Props) {
  const widgetList = Object.values(WIDGETS)

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2" />
        }
      >
        <SlidersHorizontal className="w-4 h-4" />
        Customize
      </SheetTrigger>

      <SheetContent side="right" className="flex flex-col gap-0 p-0">
        <SheetHeader className="p-5 pb-4 border-b border-border">
          <SheetTitle>Customize Dashboard</SheetTitle>
          <SheetDescription>
            Toggle widgets on or off. Changes are saved automatically.
          </SheetDescription>
        </SheetHeader>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto py-2">
          {widgetList.map((widget) => {
            const isOn = visible[widget.id as WidgetId]
            return (
              <div
                key={widget.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {widget.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isOn ? "Visible" : "Hidden"}
                  </span>
                </div>
                <Switch
                  checked={isOn}
                  onCheckedChange={() => toggleWidget(widget.id as WidgetId)}
                  aria-label={`Toggle ${widget.label}`}
                />
              </div>
            )
          })}
        </div>

        <SheetFooter className="p-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={resetLayout}
          >
            <RotateCcw className="w-4 h-4" />
            Reset to default
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
