interface ErrorDisplayProps {
  message: string | null
  onDismiss?: () => void
}

export function ErrorDisplay({ message, onDismiss }: ErrorDisplayProps) {
  if (!message) return null
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <span>{message}</span>
        {onDismiss ? (
          <button
            type="button"
            className="shrink-0 text-red-700 underline"
            onClick={onDismiss}
          >
            关闭
          </button>
        ) : null}
      </div>
    </div>
  )
}
