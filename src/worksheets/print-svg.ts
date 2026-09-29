/**
 * The placement test's charts and diagrams are drawn for the app's dark
 * page; on paper they are recoloured for white (roadmap E05). The classes
 * the page styles are styled inside the SVG itself, so the picture is the
 * same in a printed HTML file, a Word document or a PNG made from it.
 */
const COLOURS: ReadonlyArray<[string, string]> = [
  ['#6ec8ff', '#1d4ed8'], ['#f5c451', '#b45309'], ['#ff8a8a', '#b91c1c'], ['#7ddba0', '#047857'], ['#c9a0ff', '#6d28d9'],
  ['#e8eef6', '#111827'], ['#8494a8', '#4b5563'], ['#26303c', '#d1d5db'], ['#1d4f7a', '#bfdbfe'], ['#dfe6ee', '#e5e7eb'], ['#9fb0c4', '#6b7280'],
];
const STYLE = '<style>.grid{stroke:#d1d5db;stroke-width:1;fill:none}.tick{fill:#374151;font:11px sans-serif}.axis{fill:#111827;font:11.5px sans-serif}'
  + '.legend{fill:#111827;font:11.5px sans-serif}.radar-before{fill:rgba(180,83,9,.15);stroke:#b45309;stroke-width:2}</style>';

export function printSvg(svg: string): string {
  let out = svg;
  for (const [dark, light] of COLOURS) out = out.split(dark).join(light).split(dark.toUpperCase()).join(light);
  // the letters on the gold marks stay dark on gold
  out = out.replace(/fill="#b45309"\/><text([^>]*)fill="#221700"/g, 'fill="#fcd34d"/><text$1fill="#221700"');
  if (!/xmlns=/.test(out)) out = out.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  return out.replace(/(<svg[^>]*>)/, `$1${STYLE}`);
}

/** The width and height of an SVG from its viewBox. */
export function svgSize(svg: string): { width: number; height: number } {
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : { width: 520, height: 260 };
}
