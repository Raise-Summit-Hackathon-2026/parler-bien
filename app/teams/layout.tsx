export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-muted/20">
      <div className="border-b bg-background/80">
        <div className="mx-auto w-full max-w-lg px-6 py-4">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Team paths
          </p>
          <p className="text-sm text-muted-foreground">
            Structured learning paths for company teams and departments.
          </p>
        </div>
      </div>
      {children}
    </div>
  )
}
