// Every feature is a switch. Turn off here, never delete code.
// ?skin=1024 in the address lowers the composited skin resolution (weak school devices, software rendering)
const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

export const CONFIG = {
  port: 5199,
  paintedBase: false,      // painted undershirt/shorts in the skin texture: off (clothes are mandatory instead)
  hemMargin: 0.004,        // metres above a top's hem where trousers/skirt are cut off
  schoolSafe: true,        // school use: every figure always wears a top and trousers/skirt (no "none"); the painted base layer is on regardless
  defaultTop: 'male_casualsuit04_top', defaultBottom: 'male_casualsuit02_bottom',
  skinSize: [512, 1024, 2048, 4096].includes(+q.get('skin')) ? +q.get('skin') : 2048,          // composited skin texture size
  shadows: true,
  skinDetailNormal: true,  // tiling pore normal map
  hairSoftPass: false,     // second blended pass for strand tips (left a pale band at the fringe: off)
  hairCleanEdge: true,     // smooth the hair's alpha contour instead of using the raw 512px strand mask
  // the bundled alpha-card hairstyles failed three critic rounds; the generated styles in src/hair.js replace them (packed, not offered)
  hiddenParts: ['short01', 'short02', 'short03', 'short04', 'bob01', 'bob02', 'long01', 'ponytail01', 'braid01', 'afro01'],
  expressions: true,       // blink / smile morph targets
  autoBlink: true,
  faceTexture: true,       // import an own head scan as skin (stays in memory, never uploaded or saved)
  moles: true,             // click-to-place "Punkterl"
  tattoos: true,
  autosave: true,          // localStorage
  glbAnimations: true,     // bake clips into exported GLB
  turntableOnIdle: false,
  maxPixelRatio: 2,
};
