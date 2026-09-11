function removeDangerousAttributes(svg: string): string {
  let output = svg;
  output = output.replace(/\s+on[a-z0-9:_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  output = output.replace(/\s+(?:href|xlink:href)\s*=\s*(["'])(?:https?:|\/\/|javascript:|data:)[\s\S]*?\1/gi, '');
  output = output.replace(/\s+style\s*=\s*(["'])[^"']*(?:url\s*\(|expression\s*\(|javascript:)[^"']*\1/gi, '');
  return output;
}

function toCurrentColor(svg: string): string {
  return svg.replace(/\b(fill|stroke)\s*=\s*(["'])(.*?)\2/gi, (full, name: string, quote: string, value: string) => {
    const v = value.trim().toLowerCase();
    if (v === 'none' || v === 'currentcolor' || v === 'transparent' || v.startsWith('url(')) return full;
    return `${name}=${quote}currentColor${quote}`;
  });
}

export function sanitizeSvg(input: string, currentColor = false): string {
  if (!/<svg\b/i.test(input)) throw new Error('Input is not a valid SVG document.');
  let svg = input.trim();
  svg = svg.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  svg = svg.replace(/<\?xml[\s\S]*?\?>/gi, '');
  svg = svg.replace(/<(script|foreignObject|iframe|object|embed|style)\b[\s\S]*?<\/\1\s*>/gi, '');
  svg = svg.replace(/<(script|foreignObject|iframe|object|embed|style)\b[^>]*\/?\s*>/gi, '');
  svg = removeDangerousAttributes(svg);
  if (currentColor) svg = toCurrentColor(svg);
  svg = svg.replace(/>\s+</g, '><').replace(/[ \t]+\n/g, '\n').trim();
  return `${svg}\n`;
}
