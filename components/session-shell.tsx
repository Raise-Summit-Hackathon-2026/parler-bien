import { ScenarioBackButton } from "@/components/scenario-back-button"

type SessionShellProps = {
  onBack: () => void
  backLabel?: string
  children: React.ReactNode
}

export function SessionShell({ onBack, backLabel, children }: SessionShellProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-4 pt-2 sm:px-6">
        <ScenarioBackButton onBack={onBack} label={backLabel} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-4 sm:px-6">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </div>
  )
}
