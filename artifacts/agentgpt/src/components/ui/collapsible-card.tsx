import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useCardToggle } from "@/hooks/use-card-toggle"

interface CollapsibleCardProps {
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  defaultOpen?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
  children: React.ReactNode
}

export function CollapsibleCard({
  id,
  title,
  description,
  defaultOpen = true,
  className,
  headerClassName,
  contentClassName,
  children,
}: CollapsibleCardProps) {
  const { isOpen, toggle } = useCardToggle(id, defaultOpen)

  return (
    <Card className={className}>
      <CardHeader className={cn("flex flex-row items-center justify-between pb-2", headerClassName)}>
        <div className="flex flex-col space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <button
          onClick={toggle}
          aria-label={isOpen ? "Collapse card" : "Expand card"}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
          />
        </button>
      </CardHeader>
      <div
        className={cn(
          "grid transition-all duration-200",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <CardContent className={contentClassName}>{children}</CardContent>
        </div>
      </div>
    </Card>
  )
}
