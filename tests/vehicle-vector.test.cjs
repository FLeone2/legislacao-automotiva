const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const vector = require('../src/core/vehicle-vector.js');
const root = path.resolve(__dirname, '..');

function polygon(d) {
  const tokens = d.match(/[A-Za-z]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g);
  const points = [];
  let x = 0;
  let y = 0;
  let command;
  for (let i = 0; i < tokens.length; ) {
    if (/^[A-Za-z]$/.test(tokens[i])) command = tokens[i++];
    if (command.toLowerCase() === 'z') break;
    assert(['M', 'l'].includes(command));
    const px = Number(tokens[i++]);
    const py = Number(tokens[i++]);
    x = command === 'l' ? x + px : px;
    y = command === 'l' ? y + py : py;
    points.push([x, y]);
  }
  return points;
}

function contains([x, y], points) {
  let result = false;
  let previous = points.at(-1);
  for (const current of points) {
    const [ax, ay] = previous;
    const [bx, by] = current;
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) result = !result;
    previous = current;
  }
  return result;
}

test('all 37 source pieces retain distinct IDs, routes and exact SVG geometry bounds', () => {
  assert.equal(vector.viewBox, '0 0 1536 1024');
  assert.deepEqual([vector.width, vector.height], [1536, 1024]);
  assert.equal(vector.asset, 'assets/vehicle-vector/vehicle.svg');
  assert.equal(vector.parts.length, 37);
  assert.equal(new Set(vector.parts.map((part) => part.id)).size, 37);
  const expected = {
    bancos: [8, 9],
    motor: [24, 29],
    tanque: [30],
    freios: [35, 37],
    chassi: [32, 33],
    vidros: [2, 3, 4, 5, 6, 7, 18, 19, 20],
    iluminacao: [12, 13, 15, 16],
    carroceria: [1, 10, 11, 14, 17, 21, 22],
    retrovisores: [23],
    'pneus-rodas': [34, 36],
    eletrica: [27, 28],
    escapamento: [31],
    bateria: [25, 26],
  };
  const routes = Object.fromEntries(
    Object.entries(expected).flatMap(([component, pieces]) =>
      pieces.map((number) => [number, component]),
    ),
  );
  for (const [index, part] of vector.parts.entries()) {
    assert.match(part.id, new RegExp(`^peca_${String(index + 1).padStart(2, '0')}_[a-z0-9_]+$`));
    assert.equal(part.componentId, routes[index + 1]);
    assert.equal(part.contourId, `contorno_${part.id}`);
    assert.equal(part.fillRule, 'evenodd');
    assert.equal(part.asset, `assets/vehicle-vector/${part.id}.svg`);
    assert(fs.statSync(path.join(root, part.asset)).isFile());
    const [x, y, width, height] = part.bbox;
    assert(x >= 0 && y >= 0 && width > 0 && height > 0);
    assert(x + width <= vector.width && y + height <= vector.height);
    const points = polygon(part.path);
    assert(points.length > 3);
    assert(points.every(([px, py]) => x <= px && px <= x + width && y <= py && py <= y + height));
    assert.equal(typeof part.label, 'string');
    assert(part.label.trim().length > 0);
  }
  assert(
    !vector.parts.some(
      (part) => part.componentId === 'identificacao' || /\bVIN\b/i.test(part.label),
    ),
  );
});

test('tank, traction, 12 V, wheels and seats have unambiguous points in their actual contours', () => {
  const shapes = vector.parts.map((part) => polygon(part.path));
  for (const [index, part] of vector.parts.entries()) {
    assert.deepEqual(
      shapes.flatMap((shape, candidate) => (contains(part.testPoint, shape) ? [candidate] : [])),
      [index],
      part.id,
    );
  }
  assert.equal(vector.parts[25].componentId, 'bateria');
  assert.equal(vector.parts[26].componentId, 'eletrica');
  assert.match(vector.parts[24].label, /Motor elétrico, inversor e cabos/);
});

test('regeneration validates the original ZIP and preserves every published SVG and contour byte', () => {
  const output = execFileSync('python', ['scripts/import_vehicle_vector.py', '--check'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.match(output, /37 reviewed pieces, 38 exact-source SVG assets \(checked\)/);
});

test('import validation rejects active SVG content and paths outside the global image bounds', () => {
  execFileSync(
    'python',
    [
      '-c',
      String.raw`
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('vehicle_vector', Path('scripts/import_vehicle_vector.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
template = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" {}>{}</svg>'
cases = [
    template.format('onload="alert(1)"', ''),
    template.format('', '<script>alert(1)</script>'),
    template.format('', '<image href="https://example.com/image.svg"/>'),
    template.format('', '<path fill="url(https://example.com)" d="M1 1l1 0 0 1z" fill-rule="evenodd"/>'),
    template.format('', '<path d="M1535 0l2 0 0 2z" fill-rule="evenodd"/>'),
    '<!DOCTYPE svg [<!ENTITY test "hello">]>' + template.format('', ''),
]
for svg in cases:
    try:
        module.validate_svg(svg.encode(), 'unsafe.svg')
    except ValueError:
        continue
    raise AssertionError('Unsafe SVG was accepted')
`,
    ],
    { cwd: root, timeout: 10000 },
  );
});
