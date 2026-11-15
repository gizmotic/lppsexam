// Every feature is a switch. Turn off here, never delete code.
export const CONFIG = {
  port: 5199,
  skinSize: 2048,          // composited skin texture size
  shadows: true,
  skinDetailNormal: true,  // tiling pore normal map
  expressions: true,       // blink / smile morph targets
  autoBlink: true,
  moles: true,             // click-to-place "Punkterl"
  tattoos: true,
  underwear: true,         // painted base layer so the body is never bare
  autosave: true,          // localStorage
  glbAnimations: true,     // bake clips into exported GLB
  turntableOnIdle: false,
  maxPixelRatio: 2,
};
