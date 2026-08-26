// Design + verify the survey dark palette. Computes HSL triplets for the
// token definitions and WCAG contrast ratios for every text/background pair
// the survey UI actually renders, in BOTH themes.
type RGB = [number, number, number];
const hex2rgb = (h: string): RGB => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as RGB;
};
function rgb2hsl([r, g, b]: RGB): string {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
    else if (max === G) h = ((B - R) / d + 2) / 6;
    else h = ((R - G) / d + 4) / 6;
  }
  return `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}
const lum = (c: RGB) => {
  const [r, g, b] = c.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [l1, l2] = [lum(hex2rgb(a)), lum(hex2rgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const LIGHT: Record<string, string> = {
  ground: "#faf8f1", surface: "#fffefa", raised: "#f2f6ef",
  ink: "#241f18", muted: "#6f6757", faint: "#a89d88", border: "#e9e3d3",
  accent: "#3a6046", accentBg: "#e4ecdd",
  danger: "#b3432b", info: "#54749e", infoBg: "#e4ebf4", butter: "#f7edcb",
};
// Dark: same RELATIONSHIPS, not an inversion. Ground is a warm near-black
// (carrying the eggshell's warmth, not a neutral grey), surface sits one
// step LIGHTER than ground exactly as #fffefa sits above #faf8f1, and the
// accents are lifted in lightness until they clear AA on the dark ground.
const DARK: Record<string, string> = {
  ground: "#191512", surface: "#231e19", raised: "#2b251e",
  ink: "#f4efe4", muted: "#b5ab98", faint: "#9a9081", border: "#3a332b",
  accent: "#8fbf7a", accentBg: "#232e1e",
  danger: "#e79076", info: "#93b3da", infoBg: "#1e2632", butter: "#3a3223",
};

// Every pair the survey UI actually renders. `size` picks the AA threshold:
// 4.5 for body text, 3.0 for large text (>=24px or >=18.66px bold) and for
// non-text UI boundaries (borders, focus rings, progress track).
const PAIRS: { fg: string; bg: string; label: string; size?: "large" | "ui" }[] = [
  { fg: "ink", bg: "ground", label: "question text on page" },
  { fg: "ink", bg: "surface", label: "answer text on card" },
  { fg: "ink", bg: "raised", label: "text on raised surface" },
  { fg: "muted", bg: "ground", label: "secondary text on page" },
  { fg: "muted", bg: "surface", label: "secondary text on card" },
  { fg: "faint", bg: "ground", label: "progress '5 of 8' on page" },
  { fg: "faint", bg: "surface", label: "faint text on card" },
  { fg: "accent", bg: "ground", label: "accent text on page" },
  { fg: "accent", bg: "surface", label: "accent text on card" },
  { fg: "accent", bg: "accentBg", label: "accent text on accent chip" },
  { fg: "danger", bg: "ground", label: "error text on page" },
  { fg: "danger", bg: "surface", label: "error text on card" },
  { fg: "info", bg: "ground", label: "info text on page" },
  { fg: "surface", bg: "ink", label: "Continue button label", size: "large" },
  { fg: "border", bg: "ground", label: "card / pill border", size: "ui" },
  { fg: "border", bg: "surface", label: "divider on card", size: "ui" },
  { fg: "surface", bg: "ground", label: "[card lift] surface vs ground", size: "ui" },
];
const need = (s?: string) => (s === "large" || s === "ui" ? 3.0 : 4.5);

for (const [name, P] of [["LIGHT", LIGHT], ["DARK", DARK]] as const) {
  console.log(`\n=== ${name} ===`);
  let fails = 0;
  for (const p of PAIRS) {
    const r = ratio(P[p.fg], P[p.bg]);
    const t = need(p.size);
    const ok = r >= t;
    if (!ok) fails++;
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (need ${t})  ${p.label}`
    );
  }
  console.log(`  --> ${fails === 0 ? "all pass" : `${fails} FAILING`}`);
}
console.log("\n=== HSL triplets for globals.css ===");
for (const k of Object.keys(LIGHT)) {
  console.log(`  --sv-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: light ${rgb2hsl(hex2rgb(LIGHT[k]))}  |  dark ${rgb2hsl(hex2rgb(DARK[k]))}`);
}
