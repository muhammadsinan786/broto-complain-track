/**
 * Parses markdown-style bold text (**text**) and returns React-compatible elements
 */
export function parseBoldText(text: string): string {
  // Replace **text** with <strong>text</strong> for HTML rendering
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

/**
 * Check if text contains bold markers
 */
export function hasBoldMarkers(text: string): boolean {
  return /\*\*[^*]+\*\*/.test(text);
}
