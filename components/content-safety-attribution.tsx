import { ShieldCheck } from "lucide-react"

export function ContentSafetyAttribution() {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 dark:border-white/10 dark:bg-white/3">
      <ShieldCheck
        className="size-4 shrink-0 text-lime-700 dark:text-lime-300"
        aria-hidden
      />
      <p className="text-xs leading-snug text-muted-foreground dark:text-white/50">
        Generated content is reviewed with{" "}
        <span className="font-medium text-foreground/90 dark:text-white/80">NVIDIA Nemotron</span>{" "}
        before you practice.
      </p>
    </div>
  )
}
