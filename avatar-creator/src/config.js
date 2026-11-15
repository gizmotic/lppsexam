// Every feature is a switch. Turn off here, never delete code.
export const CONFIG = {
  port: 5199,
  schoolSafe: true,        // school use: every figure always wears a top and trousers/skirt (no "none"); the painted base layer is on regardless
  defaultTop: 'male_casualsuit04_top', defaultBottom: 'male_casualsuit02_bottom',
  skinSize: 2048,          // composited skin texture size
  shadows: true,
  skinDetailNormal: true,  // tiling pore normal map
  hairSoftPass: false,     // second blended pass for strand tips (left a pale band at the fringe: off)
  hairCleanEdge: true,     // smooth the hair's alpha contour instead of using the raw 512px strand mask
  hiddenParts: ['short01', 'afro01'],   // hairstyles that failed two critic rounds: packed, but not offered
  expressions: true,       // blink / smile morph targets
  autoBlink: true,
  moles: true,             // click-to-place "Punkterl"
  tattoos: true,
  autosave: true,          // localStorage
  glbAnimations: true,     // bake clips into exported GLB
  turntableOnIdle: false,
  maxPixelRatio: 2,
};
