// Browser APIs the standard DOM types don't include yet, plus the test flags pages set on window.

interface XRSystemLite {
  isSessionSupported(mode: 'immersive-vr' | 'immersive-ar' | 'inline'): Promise<boolean>;
  requestSession(mode: 'immersive-vr' | 'immersive-ar' | 'inline', init?: { requiredFeatures?: string[]; optionalFeatures?: string[] }): Promise<any>;
}

interface Navigator {
  readonly xr?: XRSystemLite;
}

interface Window {
  /** Older Safari's prefixed AudioContext; audio/core.js falls back to it. */
  webkitAudioContext?: typeof AudioContext;
  /** Set by dev/boot.js once the module build has started; the smoke test waits for it. */
  __bootOK?: boolean;
  /** Set by drop/main.js once Last Drop has booted; the smoke test waits for it. */
  __dropOK?: boolean;
  /** Last Drop's systems, for headless test scripts. */
  __drop?: any;
}
