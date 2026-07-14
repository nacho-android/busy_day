/**
 * Phaser's WebGL capability probe can throw after Safari/WebKit has reclaimed
 * a context (most often during repeated scene or page starts on memory-limited
 * devices). The game only uses Canvas-compatible 2D features, so Safari and
 * every iOS browser get the more resilient Canvas renderer.
 */
export function shouldUseCanvasRenderer(userAgent: string): boolean {
  const isAppleWebKit = /AppleWebKit/i.test(userAgent);
  if (!isAppleWebKit) return false;

  // iPadOS desktop-site mode can identify as Macintosh, so retain the iOS
  // browser tokens as an independent signal instead of relying on device text.
  const isIos = /(?:iPhone|iPad|iPod|CriOS|EdgiOS|FxiOS|OPiOS)/i.test(userAgent);
  const isChromiumFamily = /(?:Chrome|Chromium|Edg\/|OPR|SamsungBrowser)/i.test(userAgent);
  return isIos || !isChromiumFamily;
}
