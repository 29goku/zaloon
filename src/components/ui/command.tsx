"use client"

import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

// ----- Context -----
type CommandContextValue = {
  search: string
  setSearch: (v: string) => void
  selectedIndex: number
  setSelectedIndex: (i: number) => void
}

const CommandContext = React.createContext<CommandContextValue>({
  search: "",
  setSearch: () => {},
  selectedIndex: -1,
  setSelectedIndex: () => {},
})

// ----- Root -----
function Command({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const [search, setSearch] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(-1)

  return (
    <CommandContext.Provider value={{ search, setSearch, selectedIndex, setSelectedIndex }}>
      <div
        data-slot="command"
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  )
}

// ----- Dialog -----
function CommandDialog({
  children,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  children?: React.ReactNode
}) {
  return (
    <Dialog {...(props as React.ComponentProps<typeof Dialog>)}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

// ----- Input -----
function CommandInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const { search, setSearch } = React.useContext(CommandContext)

  return (
    <div
      data-slot="command-input-wrapper"
      className="flex items-center border-b border-border px-3"
    >
      <SearchIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
      <input
        data-slot="command-input"
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={cn(
          "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch("")}
          className="ml-1 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-3.5" />
          <span className="sr-only">Clear</span>
        </button>
      )}
    </div>
  )
}

// ----- List -----
function CommandList({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-list"
      role="listbox"
      className={cn(
        "max-h-80 overflow-x-hidden overflow-y-auto scroll-smooth",
        className
      )}
      {...props}
    />
  )
}

// ----- Empty -----
function CommandEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

// ----- Group -----
function CommandGroup({
  className,
  heading,
  children,
  ...props
}: React.ComponentProps<"div"> & { heading?: React.ReactNode }) {
  const { search } = React.useContext(CommandContext)

  // Check if group has any visible children matching search
  const hasVisibleChildren = React.useMemo(() => {
    if (!search) return true
    // Simple heuristic: always show group, items handle their own visibility
    return true
  }, [search])

  if (!hasVisibleChildren) return null

  return (
    <div
      data-slot="command-group"
      role="group"
      className={cn("overflow-hidden p-1", className)}
      {...props}
    >
      {heading && (
        <div
          data-slot="command-group-heading"
          className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
        >
          {heading}
        </div>
      )}
      {children}
    </div>
  )
}

// ----- Separator -----
function CommandSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-separator"
      role="separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  )
}

// ----- Item -----
function CommandItem({
  className,
  onSelect,
  disabled,
  children,
  keywords,
  value,
  ...props
}: React.ComponentProps<"div"> & {
  onSelect?: (value: string) => void
  disabled?: boolean
  keywords?: string[]
  value?: string
}) {
  const { search } = React.useContext(CommandContext)

  // Filter based on search
  const isVisible = React.useMemo(() => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    const textValue = value ?? (typeof children === "string" ? children : "")
    const allKeywords = [textValue, ...(keywords ?? [])].join(" ").toLowerCase()
    return allKeywords.includes(searchLower)
  }, [search, value, children, keywords])

  if (!isVisible) return null

  return (
    <div
      data-slot="command-item"
      role="option"
      aria-selected="false"
      aria-disabled={disabled}
      onClick={disabled ? undefined : () => onSelect?.(value ?? "")}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          onSelect?.(value ?? "")
        }
      }}
      tabIndex={disabled ? undefined : 0}
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ----- Shortcut -----
function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
}
