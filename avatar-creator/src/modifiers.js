// Slider tables (German labels). A slider is [label, target, min, max].
// "$" in a target expands to the left and right variant, driven together.
// min/max empty -> single target, range 0..1.

export const DEFAULT_STATE = () => ({
  macro: { gender: 0.5, age: 0.0, muscle: 0.5, weight: 0.5, height: 0.5, proportions: 0.5, cup: 0.5, firmness: 0.5, african: 0, asian: 0, caucasian: 1 },
  mods: {},
  parts: { hair: 'short03', brows: 'eyebrow001', lashes: 'eyelashes01', top: 'male_casualsuit04_top', bottom: 'male_casualsuit02_bottom', full: null, shoes: 'shoes05', hat: null, glasses: null, extra: null },
  colors: { hair: '#3a2a1f', brows: '#2e2119', top: null, bottom: null, full: null, shoes: null, hat: null, glasses: null, extra: null },
  eyes: { color: '#6b4226' },
  skin: {
    base: 'young_lightskinned_male', tone: null, wrinkles: 0,
    freckles: 0, bodyFreckles: 0, freckleSeed: 1,
    lipColor: '#b0564f', lipStrength: 0, blush: 0, blushColor: '#d9665f',
    shadow: 0, shadowColor: '#5b4a6b', beard: 0, underColor: '#e9e6e1', underTop: 'auto',
    moles: [], tattoos: [],
  },
  anim: 'idle',
});

export const MACROS = [
  ['gender', 'Geschlecht', 'weiblich', 'männlich'],
  ['age', 'Alter', 'jung', 'alt'],
  ['height', 'Größe', 'klein', 'groß'],
  ['weight', 'Gewicht', 'schlank', 'kräftig'],
  ['muscle', 'Muskelmasse', 'wenig', 'viel'],
  ['proportions', 'Proportionen', 'ungewöhnlich', 'ideal'],
];
export const ETHNIC = [['caucasian', 'Europäisch'], ['african', 'Afrikanisch'], ['asian', 'Asiatisch']];

export const GROUPS = [
  { id: 'head', label: 'Kopfform', cam: 'face', sliders: [
    ['Gesichtsfülle', 'head/head-fat', 'decr', 'incr'], ['Kopfalter', 'head/head-age', 'decr', 'incr'],
    ['Kopfbreite', 'head/head-scale-horiz', 'decr', 'incr'], ['Kopfhöhe', 'head/head-scale-vert', 'decr', 'incr'],
    ['Kopftiefe', 'head/head-scale-depth', 'decr', 'incr'], ['Hinterkopf', 'head/head-back-scale-depth', 'decr', 'incr'],
    ['Profilwinkel', 'head/head-angle', 'in', 'out'],
    ['Form: oval', 'head/head-oval', '', ''], ['Form: rund', 'head/head-round', '', ''],
    ['Form: rechteckig', 'head/head-rectangular', '', ''], ['Form: eckig', 'head/head-square', '', ''],
    ['Form: dreieckig', 'head/head-triangular', '', ''], ['Form: Herz', 'head/head-invertedtriangular', '', ''],
    ['Form: Diamant', 'head/head-diamond', '', ''],
  ] },
  { id: 'forehead', label: 'Stirn', cam: 'face', sliders: [
    ['Stirnhöhe', 'forehead/forehead-scale-vert', 'decr', 'incr'], ['Stirn vor / zurück', 'forehead/forehead-trans', 'backward', 'forward'],
    ['Stirnwölbung', 'forehead/forehead-nubian', 'decr', 'incr'], ['Schläfen', 'forehead/forehead-temple', 'decr', 'incr'],
  ] },
  { id: 'eyes', label: 'Augen', cam: 'eyes', sliders: [
    ['Augengröße', 'eyes/$-eye-scale', 'decr', 'incr'], ['Augenabstand', 'eyes/$-eye-trans', 'in', 'out'],
    ['Augenhöhe', 'eyes/$-eye-trans', 'down', 'up'],
    ['Öffnung innen', 'eyes/$-eye-height1', 'decr', 'incr'], ['Öffnung Mitte', 'eyes/$-eye-height2', 'decr', 'incr'],
    ['Öffnung außen', 'eyes/$-eye-height3', 'decr', 'incr'],
    ['Innerer Augenwinkel', 'eyes/$-eye-corner1', 'down', 'up'], ['Äußerer Augenwinkel', 'eyes/$-eye-corner2', 'down', 'up'],
    ['Tiefe innen', 'eyes/$-eye-push1', 'in', 'out'], ['Tiefe außen', 'eyes/$-eye-push2', 'in', 'out'],
    ['Lidfalte Höhe', 'eyes/$-eye-eyefold', 'down', 'up'], ['Lidfalte Wölbung', 'eyes/$-eye-eyefold', 'concave', 'convex'],
    ['Lidfalte Winkel', 'eyes/$-eye-eyefold-angle', 'down', 'up'], ['Epikanthus-Falte', 'eyes/$-eye-epicanthus', 'in', 'out'],
    ['Tränensäcke', 'eyes/$-eye-bag', 'decr', 'incr'], ['Tränensack Tiefe', 'eyes/$-eye-bag', 'in', 'out'],
    ['Tränensack Höhe', 'eyes/$-eye-bag-height', 'decr', 'incr'],
  ] },
  { id: 'brows', label: 'Augenbrauen', cam: 'eyes', sliders: [
    ['Brauenhöhe', 'eyebrows/eyebrows-trans', 'down', 'up'], ['Brauenwinkel', 'eyebrows/eyebrows-angle', 'down', 'up'],
    ['Brauenknochen', 'eyebrows/eyebrows-trans', 'backward', 'forward'],
  ] },
  { id: 'nose', label: 'Nase', cam: 'face', sliders: [
    ['Nasengröße', 'nose/nose-volume', 'decr', 'incr'], ['Nasenlänge', 'nose/nose-scale-vert', 'decr', 'incr'],
    ['Nasenbreite', 'nose/nose-scale-horiz', 'decr', 'incr'], ['Nasentiefe', 'nose/nose-scale-depth', 'decr', 'incr'],
    ['Position hoch / tief', 'nose/nose-trans', 'down', 'up'], ['Position vor / zurück', 'nose/nose-trans', 'backward', 'forward'],
    ['Nasenflügel Breite', 'nose/nose-nostrils-width', 'decr', 'incr'], ['Nasenflügel Winkel', 'nose/nose-nostrils-angle', 'down', 'up'],
    ['Nasenflügel Blähung', 'nose/nose-flaring', 'decr', 'incr'],
    ['Nasenspitze Breite', 'nose/nose-point-width', 'decr', 'incr'], ['Nasenspitze hoch / tief', 'nose/nose-point', 'down', 'up'],
    ['Nasenbasis', 'nose/nose-base', 'down', 'up'], ['Nasensteg Winkel', 'nose/nose-septumangle', 'decr', 'incr'],
    ['Nasenrücken oben', 'nose/nose-width1', 'decr', 'incr'], ['Nasenrücken Mitte', 'nose/nose-width2', 'decr', 'incr'],
    ['Nasenrücken unten', 'nose/nose-width3', 'decr', 'incr'],
    ['Höcker', 'nose/nose-hump', 'decr', 'incr'], ['Krümmung', 'nose/nose-curve', 'concave', 'convex'],
    ['Griechisches Profil', 'nose/nose-greek', 'decr', 'incr'], ['Stauchung', 'nose/nose-compression', 'compress', 'uncompress'],
  ] },
  { id: 'mouth', label: 'Mund', cam: 'mouth', sliders: [
    ['Mundbreite', 'mouth/mouth-scale-horiz', 'decr', 'incr'], ['Mundhöhe', 'mouth/mouth-scale-vert', 'decr', 'incr'],
    ['Mundtiefe', 'mouth/mouth-scale-depth', 'decr', 'incr'],
    ['Position hoch / tief', 'mouth/mouth-trans', 'down', 'up'], ['Position vor / zurück', 'mouth/mouth-trans', 'backward', 'forward'],
    ['Oberlippe Volumen', 'mouth/mouth-upperlip-volume', 'decr', 'incr'], ['Oberlippe Höhe', 'mouth/mouth-upperlip-height', 'decr', 'incr'],
    ['Oberlippe Breite', 'mouth/mouth-upperlip-width', 'decr', 'incr'], ['Oberlippe Mitte', 'mouth/mouth-upperlip-middle', 'down', 'up'],
    ['Oberlippe außen', 'mouth/mouth-upperlip-ext', 'down', 'up'],
    ['Unterlippe Volumen', 'mouth/mouth-lowerlip-volume', 'decr', 'incr'], ['Unterlippe Höhe', 'mouth/mouth-lowerlip-height', 'decr', 'incr'],
    ['Unterlippe Breite', 'mouth/mouth-lowerlip-width', 'decr', 'incr'], ['Unterlippe Mitte', 'mouth/mouth-lowerlip-middle', 'down', 'up'],
    ['Unterlippe außen', 'mouth/mouth-lowerlip-ext', 'down', 'up'],
    ['Amorbogen', 'mouth/mouth-cupidsbow', 'decr', 'incr'], ['Amorbogen Breite', 'mouth/mouth-cupidsbow-width', 'decr', 'incr'],
    ['Philtrum', 'mouth/mouth-philtrum-volume', 'decr', 'incr'], ['Mundwinkel', 'mouth/mouth-angles', 'down', 'up'],
    ['Grübchen', 'mouth/mouth-dimples', 'in', 'out'], ['Lachfalten', 'mouth/mouth-laugh-lines', 'in', 'out'],
  ] },
  { id: 'cheek', label: 'Wangen', cam: 'face', sliders: [
    ['Wangenvolumen', 'cheek/$-cheek-volume', 'decr', 'incr'], ['Wangenknochen', 'cheek/$-cheek-bones', 'decr', 'incr'],
    ['Wange innen', 'cheek/$-cheek-inner', 'decr', 'incr'], ['Wangenhöhe', 'cheek/$-cheek-trans', 'down', 'up'],
  ] },
  { id: 'chin', label: 'Kinn & Kiefer', cam: 'face', sliders: [
    ['Kinnhöhe', 'chin/chin-height', 'decr', 'incr'], ['Kinnbreite', 'chin/chin-width', 'decr', 'incr'],
    ['Kinn vorstehend', 'chin/chin-prominent', 'decr', 'incr'], ['Kinngrübchen', 'chin/chin-cleft', 'decr', 'incr'],
    ['Kieferknochen', 'chin/chin-bones', 'decr', 'incr'], ['Kieferwinkel', 'chin/chin-jaw-drop', 'decr', 'incr'],
    ['Unterkiefer vor', 'chin/chin-prognathism', 'decr', 'incr'],
  ] },
  { id: 'ears', label: 'Ohren', cam: 'side', sliders: [
    ['Ohrgröße', 'ears/$-ear-scale', 'decr', 'incr'], ['Ohrhöhe', 'ears/$-ear-scale-vert', 'decr', 'incr'],
    ['Ohrtiefe', 'ears/$-ear-scale-depth', 'decr', 'incr'], ['Abstehend', 'ears/$-ear-wing', 'decr', 'incr'],
    ['Ohrläppchen', 'ears/$-ear-lobe', 'decr', 'incr'], ['Ohrmuschel', 'ears/$-ear-flap', 'decr', 'incr'],
    ['Position hoch / tief', 'ears/$-ear-trans', 'down', 'up'], ['Position vor / zurück', 'ears/$-ear-trans', 'backward', 'forward'],
    ['Drehung', 'ears/$-ear-rot', 'backward', 'forward'], ['Spitz ↔ dreieckig', 'ears/$-ear-shape', 'pointed', 'triangle'],
    ['Eckig ↔ rund', 'ears/$-ear-shape', 'square', 'round'],
  ] },
  { id: 'neck', label: 'Hals', cam: 'face', sliders: [
    ['Halslänge', 'neck/neck-scale-vert', 'decr', 'incr'], ['Halsbreite', 'neck/neck-scale-horiz', 'decr', 'incr'],
    ['Halstiefe', 'neck/neck-scale-depth', 'decr', 'incr'], ['Nacken', 'neck/neck-back-scale-depth', 'decr', 'incr'],
    ['Doppelkinn', 'neck/neck-double', 'decr', 'incr'],
  ] },
  { id: 'torso', label: 'Oberkörper', cam: 'upper', sliders: [
    ['Schulterbreite', 'torso/torso-scale-horiz', 'decr', 'incr'], ['Brustkorb Tiefe', 'torso/torso-scale-depth', 'decr', 'incr'],
    ['Rumpflänge', 'torso/torso-scale-vert', 'decr', 'incr'], ['V-Form', 'torso/torso-vshape', 'decr', 'incr'],
    ['Brustmuskeln', 'torso/torso-muscle-pectoral', 'decr', 'incr'], ['Rückenmuskeln', 'torso/torso-muscle-dorsi', 'decr', 'incr'],
    ['Haltung vor / zurück', 'torso/torso-trans', 'backward', 'forward'],
  ] },
  { id: 'breast', label: 'Brust', cam: 'upper', sliders: [
    ['Position hoch / tief', 'breast/breast-trans', 'down', 'up'], ['Abstand', 'breast/breast-dist', 'decr', 'incr'],
    ['Spitzform', 'breast/breast-point', 'decr', 'incr'], ['Volumen oben / unten', 'breast/breast-volume-vert', 'down', 'up'],
  ] },
  { id: 'belly', label: 'Bauch & Hüfte', cam: 'mid', sliders: [
    ['Bauchmuskeln', 'stomach/stomach-tone', 'decr', 'incr'], ['Bauchumfang', 'stomach/stomach-pregnant', 'decr', 'incr'],
    ['Taille', 'hip/hip-waist', 'down', 'up'], ['Hüftbreite', 'hip/hip-scale-horiz', 'decr', 'incr'],
    ['Hüfttiefe', 'hip/hip-scale-depth', 'decr', 'incr'], ['Hüfthöhe', 'hip/hip-scale-vert', 'decr', 'incr'],
    ['Po', 'buttocks/buttocks-volume', 'decr', 'incr'], ['Becken straff', 'pelvis/pelvis-tone', 'decr', 'incr'],
    ['Nabel', 'stomach/stomach-navel', 'in', 'out'],
  ] },
  { id: 'arms', label: 'Arme & Hände', cam: 'upper', sliders: [
    ['Schultermuskeln', 'armslegs/$-upperarm-shoulder-muscle', 'decr', 'incr'], ['Oberarm Muskeln', 'armslegs/$-upperarm-muscle', 'decr', 'incr'],
    ['Oberarm Fülle', 'armslegs/$-upperarm-fat', 'decr', 'incr'], ['Oberarm Länge', 'armslegs/$-upperarm-scale-horiz', 'decr', 'incr'],
    ['Unterarm Muskeln', 'armslegs/$-lowerarm-muscle', 'decr', 'incr'], ['Unterarm Fülle', 'armslegs/$-lowerarm-fat', 'decr', 'incr'],
    ['Unterarm Länge', 'armslegs/$-lowerarm-scale-horiz', 'decr', 'incr'],
    ['Handgröße', 'armslegs/$-hand-scale', 'decr', 'incr'], ['Fingerlänge', 'armslegs/$-hand-fingers-length', 'decr', 'incr'],
    ['Fingerdicke', 'armslegs/$-hand-fingers-diameter', 'decr', 'incr'],
  ] },
  { id: 'legs', label: 'Beine & Füße', cam: 'lower', sliders: [
    ['Oberschenkel Muskeln', 'armslegs/$-upperleg-muscle', 'decr', 'incr'], ['Oberschenkel Fülle', 'armslegs/$-upperleg-fat', 'decr', 'incr'],
    ['Oberschenkel Länge', 'armslegs/upperlegs-height', 'decr', 'incr'],
    ['Waden Muskeln', 'armslegs/$-lowerleg-muscle', 'decr', 'incr'], ['Waden Fülle', 'armslegs/$-lowerleg-fat', 'decr', 'incr'],
    ['Unterschenkel Länge', 'armslegs/lowerlegs-height', 'decr', 'incr'],
    ['X- / O-Beine', 'armslegs/$-leg-valgus', 'decr', 'incr'], ['Fußgröße', 'armslegs/$-foot-scale', 'decr', 'incr'],
  ] },
];

export const sliderKey = (s) => `${s[1]}|${s[2]}|${s[3]}`;

// state -> [[targetName, weight], ...]
export function targetWeights(state) {
  const out = [];
  const m = state.macro;
  const g = { male: m.gender, female: 1 - m.gender };
  const a = { young: 1 - m.age, old: m.age };
  const tri = (v, lo, mid, hi) => ({ [hi]: Math.max(0, 2 * v - 1), [lo]: Math.max(0, 1 - 2 * v), [mid]: 1 - Math.abs(2 * v - 1) });
  const mu = tri(m.muscle, 'minmuscle', 'averagemuscle', 'maxmuscle');
  const we = tri(m.weight, 'minweight', 'averageweight', 'maxweight');
  const he = tri(m.height, 'minheight', 'x', 'maxheight');
  const pr = tri(m.proportions, 'uncommonproportions', 'x', 'idealproportions');
  const cu = tri(m.cup, 'mincup', 'averagecup', 'maxcup');
  const fi = tri(m.firmness, 'minfirmness', 'averagefirmness', 'maxfirmness');
  const es = m.african + m.asian + m.caucasian || 1;
  const eth = { african: m.african / es, asian: m.asian / es, caucasian: m.caucasian / es };
  const add = (n, w) => { if (w > 1e-4) out.push([n, w]); };
  for (const [gk, gv] of Object.entries(g)) for (const [ak, av] of Object.entries(a)) {
    const ga = gv * av; if (ga <= 0) continue;
    for (const [mk, mv] of Object.entries(mu)) for (const [wk, wv] of Object.entries(we)) {
      add(`macrodetails/universal-${gk}-${ak}-${mk}-${wk}`, ga * mv * wv);
      if (gk === 'female') for (const [ck, cv] of Object.entries(cu)) for (const [fk, fv] of Object.entries(fi)) {
        if (ck === 'averagecup' && fk === 'averagefirmness') continue;
        add(`breast/female-${ak}-${mk}-${wk}-${ck}-${fk}`, ga * mv * wv * cv * fv);
      }
    }
    for (const [ek, ev] of Object.entries(eth)) add(`macrodetails/${ek}-${gk}-${ak}`, ga * ev);
    for (const hk of ['minheight', 'maxheight']) add(`macrodetails/height/${gk}-${ak}-averagemuscle-averageweight-${hk}`, ga * he[hk]);
    for (const pk of ['uncommonproportions', 'idealproportions']) add(`macrodetails/proportions/${gk}-${ak}-averagemuscle-averageweight-${pk}`, ga * pr[pk]);
  }
  // above average, "Muskelmasse" also sharpens definition (the macro alone mostly adds bulk)
  const def = Math.max(0, 2 * m.muscle - 1) * 0.85;
  if (def > 0) for (const t of ['stomach/stomach-tone', 'torso/torso-muscle-pectoral', 'torso/torso-muscle-dorsi', 'armslegs/l-upperarm-muscle', 'armslegs/r-upperarm-muscle',
    'armslegs/l-upperarm-shoulder-muscle', 'armslegs/r-upperarm-shoulder-muscle', 'armslegs/l-lowerarm-muscle', 'armslegs/r-lowerarm-muscle',
    'armslegs/l-upperleg-muscle', 'armslegs/r-upperleg-muscle', 'armslegs/l-lowerleg-muscle', 'armslegs/r-lowerleg-muscle']) add(t + '-incr', def);
  for (const [key, v] of Object.entries(state.mods)) {
    if (!v) continue;
    const [t, lo, hi] = key.split('|');
    const names = t.includes('$') ? [t.replace('$', 'l'), t.replace('$', 'r')] : [t];
    for (const n of names) {
      if (!lo && !hi) add(n, v);
      else add(`${n}-${v > 0 ? hi : lo}`, Math.abs(v));
    }
  }
  return out;
}
