'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderDefinition } = require('../src/guide/render-definition.js');

test('definition retains native Retina density and supersamples standard displays', () => {
  assert.equal(renderDefinition({ width: 1067, height: 440, devicePixelRatio: 2 }).pixelRatio, 2);
  assert.equal(renderDefinition({ width: 364, height: 520, devicePixelRatio: 3 }).pixelRatio, 3);
  assert.equal(renderDefinition({ width: 1067, height: 440, devicePixelRatio: 1 }).pixelRatio, 1.5);
});

test('large canvases, GPU limits and constrained memory keep allocations bounded', () => {
  for (const [width, height, deviceMemory, maxRenderbufferSize] of [
    [3840, 2160, 8, 4096],
    [3840, 2160, 2, 4096],
    [10000, 100, 8, 2048],
    [364, 520, 4, 4096],
  ]) {
    const { pixelRatio, pixelBudget, shadowSize } = renderDefinition({
      width,
      height,
      devicePixelRatio: 4,
      deviceMemory,
      maxRenderbufferSize,
    });
    const bufferWidth = Math.floor(width * pixelRatio);
    const bufferHeight = Math.floor(height * pixelRatio);
    assert.ok(bufferWidth * bufferHeight <= pixelBudget);
    assert.ok(bufferWidth <= maxRenderbufferSize && bufferHeight <= maxRenderbufferSize);
    if (deviceMemory <= 4) {
      assert.ok(pixelRatio <= 2);
      assert.equal(shadowSize, 1024);
    }
  }
});

test('temporary zero-size or invalid viewport measurements never request an invalid buffer', () => {
  for (const size of [0, undefined, NaN, -10]) {
    const result = renderDefinition({ width: size, height: size, devicePixelRatio: NaN });
    assert.ok(Number.isFinite(result.pixelRatio) && result.pixelRatio > 0);
  }
});
