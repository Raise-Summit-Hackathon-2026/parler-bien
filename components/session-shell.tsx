import { ScenarioBackButton } from "@/components/scenario-back-button"

type SessionShellProps = {
  onBack: () => void
  backLabel?: string
  children: React.ReactNode
}

export function SessionShell({
  onBack,
  backLabel,
  children,
}: SessionShellProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground dark:bg-[#05070a] dark:text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 18% 42%, rgba(132, 204, 22, 0.12), transparent 26%), radial-gradient(circle at 82% 34%, rgba(59, 130, 246, 0.09), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 24%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          maskImage:
            "linear-gradient(to top, black, transparent), radial-gradient(ellipse at center, black 0%, transparent 68%)",
        }}
        aria-hidden
      />
      <div className="relative z-10 shrink-0 px-4 pt-4 sm:px-8">
        <ScenarioBackButton onBack={onBack} label={backLabel} />
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-6 sm:px-8">
        <div className="w-full max-w-4xl">{children}</div>
      </div>
    </div>
  )
}
