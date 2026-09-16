/** Procedural canvas textures for stage skins (panel seams, rings, markings). */
import * as THREE from 'three';

const cache = new Map<string, THREE.CanvasTexture>();

export interface SkinOptions {
  color: string;
  accent: string;
  label?: string;
  country?: string;
  /** stage length in metres, used to scale seams */
  length: number;
  diameter: number;
  metallic?: boolean;
}

const FLAGS: Record<string, string[]> = {
  RU: ['#ffffff', '#0039a6', '#d52b1e'],
  US: ['#b22234', '#ffffff', '#3c3b6e'],
  EU: ['#003399', '#ffcc00', '#003399'],
  CN: ['#de2910', '#ffde00', '#de2910'],
  JP: ['#ffffff', '#bc002d', '#ffffff'],
  IN: ['#ff9933', '#ffffff', '#138808'],
  'NZ/US': ['#00247d', '#ffffff', '#cc142b'],
  KZ: ['#00afca', '#fec50c', '#00afca'],
};

export function stageSkin(o: SkinOptions): THREE.CanvasTexture {
  const key = JSON.stringify(o);
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 512, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = o.color;
  g.fillRect(0, 0, W, H);
  // subtle weathering noise
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * (o.metallic ? 26 : 10);
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  g.putImageData(img, 0, 0);
  // vertical panel seams
  const seams = 12;
  g.strokeStyle = 'rgba(0,0,0,0.22)';
  g.lineWidth = 2;
  for (let i = 0; i < seams; i++) {
    const x = (i / seams) * W;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
  }
  // horizontal weld rings, ~ every 4 m of stage length
  const rings = Math.max(2, Math.round(o.length / 4));
  for (let i = 1; i < rings; i++) {
    const y = (i / rings) * H;
    g.strokeStyle = 'rgba(0,0,0,0.28)';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, y + 3); g.lineTo(W, y + 3); g.stroke();
  }
  // stringers (light vertical lines) for metallic skins
  if (o.metallic) {
    g.strokeStyle = 'rgba(255,255,255,0.06)';
    g.lineWidth = 1;
    for (let x = 0; x < W; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  }
  // flag stripes and label on one side
  const flag = o.country ? FLAGS[o.country] : undefined;
  if (flag) {
    const fx = W * 0.62, fy = H * 0.12, fw = 40, fh = 90;
    flag.forEach((col, i) => { g.fillStyle = col; g.fillRect(fx, fy + (fh / flag.length) * i, fw, fh / flag.length); });
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; g.strokeRect(fx, fy, fw, fh);
  }
  if (o.label) {
    g.save();
    g.translate(W * 0.55, H * 0.55);
    g.rotate(-Math.PI / 2);
    g.font = `bold ${Math.min(64, Math.max(26, 900 / o.label.length))}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.fillStyle = isDark(o.color) ? 'rgba(235,235,235,0.85)' : 'rgba(30,30,40,0.75)';
    g.fillText(o.label, 0, 0);
    g.restore();
  }
  // grime near the base
  const grad = g.createLinearGradient(0, H, 0, H * 0.82);
  grad.addColorStop(0, 'rgba(20,15,10,0.35)');
  grad.addColorStop(1, 'rgba(20,15,10,0)');
  g.fillStyle = grad;
  g.fillRect(0, H * 0.82, W, H * 0.18);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return false;
  const l = (parseInt(m[1], 16) * 0.3 + parseInt(m[2], 16) * 0.59 + parseInt(m[3], 16) * 0.11) / 255;
  return l < 0.45;
}
