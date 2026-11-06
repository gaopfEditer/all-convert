const BLOCKED = new Set([
  'exe',
  'dll',
  'bat',
  'cmd',
  'msi',
  'scr',
  'com',
  'vbs',
  'js',
  'jar',
])

export function extensionFromName(name: string): string | null {
  const i = name.lastIndexOf('.')
  if (i <= 0 || i === name.length - 1) return null
  return name.slice(i + 1).toLowerCase()
}

export function isBlockedExtension(name: string): boolean {
  const ext = extensionFromName(name)
  return ext !== null && BLOCKED.has(ext)
}

export function guessFormatFromName(name: string): string | null {
  const ext = extensionFromName(name)
  if (!ext) return null
  if (ext === 'jpeg') return 'jpg'
  return ext
}
