import { useCallback, useRef, useState } from 'react'

interface FileUploaderProps {
  onFiles: (files: FileList | File[]) => void
  disabled?: boolean
  maxHint?: string
}

export function FileUploader({ onFiles, disabled, maxHint }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const pick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        onFiles(e.target.files)
        e.target.value = ''
      }
    },
    [onFiles],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (disabled) return
      if (e.dataTransfer.files?.length) {
        onFiles(e.dataTransfer.files)
      }
    },
    [disabled, onFiles],
  )

  return (
    <div
      className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        dragOver
          ? 'border-sky-500 bg-sky-50'
          : 'border-slate-300 bg-white hover:border-sky-400'
      } ${disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={pick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') pick()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onInputChange}
        disabled={disabled}
      />
      <p className="text-lg font-medium text-slate-800">拖拽文件到此处，或点击选择</p>
      <p className="mt-2 text-sm text-slate-500">支持多文件；转换能力由后端格式矩阵决定</p>
      {maxHint ? (
        <p className="mt-1 text-xs text-slate-400">{maxHint}</p>
      ) : null}
    </div>
  )
}
