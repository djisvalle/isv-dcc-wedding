/**
 * Copies text to the clipboard, verifying the write actually succeeded rather
 * than assuming it did. The async Clipboard API silently rejects in cases
 * mobile Safari tolerates less gracefully than desktop browsers (focus
 * timing, permission quirks), so callers must not toast success on faith.
 * Falls back to the legacy execCommand selection-copy method, which remains
 * more reliably supported there, when the modern API is unavailable or fails.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy fallback below.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let succeeded = false;
  try {
    succeeded = document.execCommand('copy');
  } catch {
    succeeded = false;
  }
  document.body.removeChild(textarea);

  return succeeded;
}
