// His logo (30/10), made ready for every place it shows: a square PNG on white, the picture whole in the middle.
// Mail services do not show SVG and some cut transparent pictures oddly, so whatever he uploads becomes this.
// The colour the logo suggests is the one most of its coloured points share; white and near-white are background.

const SIZE = 192;
const PAD = 14;

export async function prepareLogo(file: File): Promise<{ png: Blob; color: string | null }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = img.naturalWidth || SIZE, h = img.naturalHeight || SIZE;
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const g = c.getContext('2d')!;
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, SIZE, SIZE);
    const k = Math.min((SIZE - 2 * PAD) / w, (SIZE - 2 * PAD) / h);
    g.drawImage(img, (SIZE - w * k) / 2, (SIZE - h * k) / 2, w * k, h * k);
    const color = suggest(g.getImageData(0, 0, SIZE, SIZE).data);
    const png = await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('png'))), 'image/png'));
    return { png, color };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Points grouped by a coarse colour; a vivid point counts more than a grey one, since a logo's colour is its vivid part. */
function suggest(px: Uint8ClampedArray): string | null {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!, g = px[i + 1]!, b = px[i + 2]!;
    if (r > 225 && g > 225 && b > 225) continue;
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    const wgt = 1 + sat * 4;
    const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
    const x = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    x.n += wgt; x.r += r * wgt; x.g += g * wgt; x.b += b * wgt;
    bins.set(key, x);
  }
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const x of bins.values()) if (!best || x.n > best.n) best = x;
  if (!best || best.n < 40) return null;
  const hex = (v: number) => Math.round(v / best!.n).toString(16).padStart(2, '0');
  return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`.toUpperCase();
}
