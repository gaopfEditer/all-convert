interface ConversionSettingsProps {
  imageQuality: number
  onImageQualityChange: (v: number) => void
}

export function ConversionSettings({
  imageQuality,
  onImageQualityChange,
}: ConversionSettingsProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-800">转换参数（v1 预留）</h3>
      <p className="mt-1 text-xs text-slate-500">
        后端 PATCH /files 尚未实现；参数将在接口就绪后随上传一并提交。
      </p>
      <label className="mt-3 flex items-center gap-3 text-sm">
        <span className="w-28 text-slate-600">图片质量</span>
        <input
          type="range"
          min={1}
          max={100}
          value={imageQuality}
          onChange={(e) => onImageQualityChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-10 text-right tabular-nums">{imageQuality}</span>
      </label>
    </div>
  )
}
