'use strict';

// Supersample standard displays and respect native density on Retina screens.
// Bound the backing buffer so a large canvas never requests an unbounded GPU allocation.
function renderDefinition({
  width,
  height,
  devicePixelRatio = 1,
  deviceMemory = 8,
  maxRenderbufferSize = 4096,
} = {}) {
  const w = Math.max(1, Number.isFinite(width) ? width : 1);
  const h = Math.max(1, Number.isFinite(height) ? height : 1);
  const lowMemory = Number.isFinite(deviceMemory) && deviceMemory > 0 && deviceMemory <= 4;
  const pixelBudget = lowMemory ? 2_000_000 : 4_000_000;
  const density = Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1;
  const limit = Math.max(1, maxRenderbufferSize || 4096);
  const pixelRatio = Math.min(
    Math.max(1.5, Math.min(density, lowMemory ? 2 : 3)),
    Math.sqrt(pixelBudget / (w * h)),
    limit / w,
    limit / h,
  );
  return { pixelRatio, pixelBudget, shadowSize: lowMemory ? 1024 : 2048 };
}

if (typeof module !== 'undefined') module.exports = { renderDefinition };
