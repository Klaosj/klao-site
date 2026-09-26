// One copy path for the close band's button and the ⌘K "Copy email" row.
// Resolves false instead of throwing: navigator.clipboard exists only in a
// secure context and can reject (permission denied), and both callers then
// say how to copy by hand rather than claim a success that didn't happen.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// The prototype's fallback copy says ⌘C; everyone off Apple hardware
// gets Ctrl+C.
export function copyShortcutHint(template: string): string {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  const apple = /Mac|iPhone|iPad|iPod/.test(nav?.platform || nav?.userAgent || '');
  return apple ? template : template.replace('⌘C', 'Ctrl+C');
}
