import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Sculpted, unbranded crossover body. Coordinates are visual proportions, not CAD dimensions.
export function buildCarBody({ mesh, rod, COLOR }) {
  const paint = 0x6d879d;
  const trim = 0x111922;
  const rubber = 0x19212a;
  const glass = 0x213e50;
  const paintOptions = { edges: false, roughness: 0.24, metalness: 0.72, clearcoat: 0.95 };
  const trimOptions = { edges: false, roughness: 0.5, metalness: 0.18 };
  const glassOptions = {
    edges: false,
    roughness: 0.08,
    metalness: 0.35,
    clearcoat: 1,
    opacity: 0.78,
  };

  function rounded(id, size, position, color, opts = {}) {
    return mesh(id, new RoundedBoxGeometry(...size, 3, Math.min(...size) * 0.28), position, color, {
      edges: false,
      ...opts,
    });
  }

  function patch(id, fn, color = paint, opts = {}, uSteps = 24, vSteps = 16) {
    const positions = [];
    const indices = [];
    for (let u = 0; u <= uSteps; u++) {
      for (let v = 0; v <= vSteps; v++) positions.push(...fn(u / uSteps, v / vSteps));
    }
    for (let u = 0; u < uSteps; u++) {
      for (let v = 0; v < vSteps; v++) {
        const a = u * (vSteps + 1) + v;
        const b = a + vSteps + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return mesh(id, geometry, [0, 0, 0], color, { ...paintOptions, ...opts });
  }

  function shape(points) {
    const outline = new THREE.Shape();
    outline.moveTo(...points[0]);
    points.slice(1).forEach((p) => outline.lineTo(...p));
    outline.closePath();
    return outline;
  }

  function sideSurface(id, points, side, color, opts = {}, depth = 0.035) {
    const geometry = new THREE.ExtrudeGeometry(shape(points), {
      depth,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.015,
      bevelSegments: 3,
      curveSegments: 24,
    });
    const attr = geometry.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      const x = attr.getX(i);
      const y = attr.getY(i);
      // The shoulder crowns outwards, then draws in at the rocker panel and the ends.
      const shoulder = 0.042 * Math.sin(Math.min(1, Math.max(0, (y - 0.65) / 0.76)) * Math.PI);
      const endTaper = 0.045 * Math.max(0, (Math.abs(x) - 1.85) / 0.45);
      attr.setZ(i, side * (0.92 + attr.getZ(i) + shoulder - endTaper));
    }
    geometry.computeVertexNormals();
    return mesh(id, geometry, [0, 0, 0], color, { ...paintOptions, ...opts });
  }

  function polygon(id, points, color, opts = {}) {
    const geometry = new THREE.BufferGeometry();
    const indices = [];
    for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return mesh(id, geometry, [0, 0, 0], color, { ...paintOptions, ...opts });
  }

  function tube(id, points, radius, color, opts = {}) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return mesh(id, new THREE.TubeGeometry(curve, 40, radius, 8, false), [0, 0, 0], color, {
      ...trimOptions,
      ...opts,
    });
  }

  function windowPanel(points, side) {
    const center = points.reduce(
      (c, p) => [c[0] + p[0] / points.length, c[1] + p[1] / points.length],
      [0, 0],
    );
    const inner = points.map(([x, y]) => [
      center[0] + (x - center[0]) * 0.965,
      center[1] + (y - center[1]) * 0.94,
    ]);
    const border = shape(points);
    const hole = new THREE.Path();
    hole.moveTo(...inner[0]);
    inner.slice(1).forEach((p) => hole.lineTo(...p));
    hole.closePath();
    border.holes.push(hole);
    const borderGeometry = new THREE.ShapeGeometry(border, 20);
    const glassGeometry = new THREE.ShapeGeometry(shape(inner), 20);
    for (const geometry of [borderGeometry, glassGeometry]) {
      const attr = geometry.attributes.position;
      for (let i = 0; i < attr.count; i++) {
        const y = attr.getY(i);
        attr.setZ(i, side * (0.965 - 0.19 * Math.max(0, (y - 1.35) / 0.64)));
      }
      geometry.computeVertexNormals();
    }
    mesh('glass', borderGeometry, [0, 0, 0], trim, { ...trimOptions });
    mesh('glass', glassGeometry, [0, 0, 0], glass, { ...glassOptions });
  }

  // Curved hood with crown and two restrained creases running into the A pillars.
  patch('body', (u, v) => {
    const x = -2.23 + u * 1.32;
    const t = v * 2 - 1;
    const halfWidth = 0.85 + 0.075 * Math.sin((u * Math.PI) / 2);
    const crown = 0.052 * (1 - t * t);
    return [x, 1.18 + 0.15 * u + crown + 0.016 * Math.sin(u * Math.PI), t * halfWidth];
  });
  for (const side of [-1, 1]) {
    tube(
      'body',
      [
        [-2.13, 1.232, side * 0.51],
        [-1.69, 1.29, side * 0.57],
        [-1.04, 1.36, side * 0.65],
      ],
      0.006,
      0x91a7b8,
      { ...paintOptions },
    );
  }

  // Roof is gently crowned in both directions rather than a flat slab.
  patch('body', (u, v) => {
    const t = v * 2 - 1;
    return [
      -0.49 + 1.6 * u,
      1.975 + 0.034 * Math.sin(u * Math.PI) + 0.047 * (1 - t * t),
      t * (0.775 + 0.005 * Math.sin(u * Math.PI)),
    ];
  });

  // Raked front glass, with narrow real A-pillars framing the opening.
  patch(
    'glass',
    (u, v) => {
      const t = v * 2 - 1;
      return [-0.909 + 0.416 * u, 1.345 + 0.629 * u + 0.028 * (1 - t * t), t * (0.895 - 0.124 * u)];
    },
    glass,
    glassOptions,
  );
  for (const side of [-1, 1]) {
    tube(
      'body',
      [
        [-0.933, 1.346, side * 0.91],
        [-0.72, 1.685, side * 0.847],
        [-0.485, 1.982, side * 0.782],
      ],
      0.035,
      paint,
      paintOptions,
    );
    tube(
      'glass',
      [
        [-0.923, 1.345, side * 0.888],
        [-0.714, 1.678, side * 0.825],
        [-0.499, 1.968, side * 0.759],
      ],
      0.009,
      trim,
    );
  }
  tube(
    'glass',
    [
      [-0.914, 1.348, -0.887],
      [-0.925, 1.377, 0],
      [-0.914, 1.348, 0.887],
    ],
    0.018,
    trim,
  );
  // Windshield wipers are slim dark strips, fully parked under the sight line.
  rod('glass', [-0.901, 1.375, -0.65], [-0.868, 1.416, -0.04], 0.009, trim, trimOptions);
  rod('glass', [-0.9, 1.376, 0.05], [-0.87, 1.413, 0.64], 0.009, trim, trimOptions);

  // Rear hatch surrounds a separate raked glass panel instead of filling it with bodywork.
  const hatch = (u, v) => {
    const t = v * 2 - 1;
    return [1.105 + 1.13 * u, 1.975 - 0.64 * u + 0.035 * (1 - t * t), t * (0.775 + 0.145 * u)];
  };
  patch('body', (u, v) => hatch(u * 0.13, v));
  patch('body', (u, v) => hatch(0.83 + u * 0.17, v));
  for (const side of [-1, 1]) {
    patch('body', (u, v) => hatch(0.13 + u * 0.7, side < 0 ? v * 0.07 : 0.93 + v * 0.07));
  }
  patch(
    'glass',
    (u, v) => {
      const p = hatch(0.13 + u * 0.7, 0.07 + v * 0.86);
      p[1] += 0.008;
      return p;
    },
    glass,
    glassOptions,
  );
  rounded('body', [0.17, 0.06, 1.63], [1.21, 1.978, 0], paint, paintOptions);
  rounded('lights', [0.035, 0.023, 0.48], [1.29, 1.937, 0], 0xb71923, {
    roughness: 0.2,
    emissive: 0x7d080a,
    emissiveIntensity: 0.7,
  });

  for (const side of [-1, 1]) {
    // Front and rear wings have genuine open wheel arches, not painted-on circles.
    const frontWing = [
      [-2.27, 0.66],
      [-2.29, 1.1],
      [-2.16, 1.24],
      [-1.14, 1.365],
      [-0.925, 1.34],
      [-0.925, 0.67],
    ];
    for (let i = 0; i <= 38; i++) {
      const angle = 0.255 + (i / 38) * (Math.PI - 0.51);
      frontWing.push([-1.48 + 0.585 * Math.cos(angle), 0.51 + 0.585 * Math.sin(angle)]);
    }
    frontWing.push([-2.27, 0.66]);
    sideSurface('body', frontWing, side, paint);

    const rearWing = [
      [0.975, 1.345],
      [1.34, 1.4],
      [2.12, 1.345],
      [2.29, 1.18],
      [2.28, 0.66],
      [2.047, 0.657],
    ];
    for (let i = 0; i <= 38; i++) {
      const angle = 0.255 + (i / 38) * (Math.PI - 0.51);
      rearWing.push([1.48 + 0.585 * Math.cos(angle), 0.51 + 0.585 * Math.sin(angle)]);
    }
    rearWing.push([0.975, 0.77]);
    sideSurface('body', rearWing, side, paint);

    sideSurface(
      'doors',
      [
        [-0.903, 1.336],
        [0.115, 1.345],
        [0.115, 0.71],
        [-0.903, 0.71],
      ],
      side,
      paint,
    );
    sideSurface(
      'doors',
      [
        [0.151, 1.345],
        [0.952, 1.35],
        [0.952, 0.785],
        [0.883, 0.71],
        [0.151, 0.71],
      ],
      side,
      paint,
    );
    rounded('body', [1.83, 0.12, 0.12], [0.015, 0.673, side * 0.923], rubber, trimOptions);
    tube(
      'doors',
      [
        [-0.85, 1.119, side * 0.997],
        [0.06, 1.145, side * 0.997],
        [0.88, 1.144, side * 0.997],
      ],
      0.005,
      0x536b80,
      paintOptions,
    );
    for (const x of [-0.08, 0.78]) {
      rounded('doors', [0.17, 0.028, 0.024], [x, 1.254, side * 0.995], 0xb8c6cd, {
        roughness: 0.18,
        metalness: 0.85,
      });
      rounded('doors', [0.115, 0.019, 0.019], [x + 0.012, 1.242, side * 0.982], trim, trimOptions);
    }

    windowPanel(
      [
        [-0.897, 1.385],
        [-0.46, 1.942],
        [0.109, 1.953],
        [0.109, 1.386],
      ],
      side,
    );
    windowPanel(
      [
        [0.17, 1.386],
        [0.17, 1.953],
        [1.055, 1.931],
        [1.424, 1.403],
      ],
      side,
    );
    // Black B pillar and body-coloured rear pillar integrate the greenhouse with the shell.
    polygon(
      'doors',
      [
        [0.112, 1.383, side * 0.959],
        [0.112, 1.96, side * 0.784],
        [0.168, 1.96, side * 0.784],
        [0.168, 1.383, side * 0.959],
      ],
      trim,
      trimOptions,
    );
    polygon(
      'body',
      [
        [1.074, 1.96, side * 0.789],
        [1.48, 1.408, side * 0.957],
        [1.642, 1.4, side * 0.95],
        [1.181, 1.958, side * 0.795],
      ],
      paint,
    );
    tube(
      'body',
      [
        [-0.47, 1.985, side * 0.794],
        [0.2, 2.01, side * 0.795],
        [1.08, 1.968, side * 0.794],
      ],
      0.022,
      paint,
      paintOptions,
    );
    tube(
      'glass',
      [
        [-0.91, 1.375, side * 0.967],
        [0.15, 1.377, side * 0.967],
        [1.45, 1.39, side * 0.958],
      ],
      0.012,
      trim,
    );

    for (const axleX of [-1.48, 1.48]) {
      const points = [];
      for (let i = 0; i <= 40; i++) {
        const angle = 0.19 + (i / 40) * (Math.PI - 0.38);
        points.push([
          axleX + Math.cos(angle) * 0.608,
          0.51 + Math.sin(angle) * 0.608,
          side * 0.997,
        ]);
      }
      tube('body', points, 0.025, rubber);
    }

    // Slim rails, black mirror stalk and a painted, rounded mirror housing.
    tube(
      'body',
      [
        [-0.22, 2.077, side * 0.64],
        [0.18, 2.105, side * 0.64],
        [0.98, 2.068, side * 0.64],
      ],
      0.018,
      0x303d49,
    );
    for (const x of [-0.18, 0.92])
      rod('body', [x, 2.012, side * 0.64], [x, 2.077, side * 0.64], 0.018, trim, trimOptions);
    rod(
      'mirrors',
      [-0.73, 1.423, side * 0.94],
      [-0.75, 1.451, side * 1.105],
      0.027,
      trim,
      trimOptions,
    );
    rounded('mirrors', [0.265, 0.14, 0.175], [-0.76, 1.472, side * 1.12], paint, paintOptions);
    rounded('mirrors', [0.015, 0.097, 0.139], [-0.622, 1.47, side * 1.124], 0x7292a1, {
      roughness: 0.05,
      metalness: 0.95,
    });
    rounded('lights', [0.15, 0.012, 0.018], [-0.79, 1.434, side * 1.211], 0xe4eff4, {
      emissive: 0xb4d6ed,
      emissiveIntensity: 0.6,
      roughness: 0.1,
    });
  }

  // Rounded, fully closed front and rear bumpers anchor the vehicle silhouette.
  rounded('body', [0.23, 0.43, 1.78], [-2.235, 0.946, 0], paint, paintOptions);
  rounded('body', [0.21, 0.43, 1.79], [2.225, 0.975, 0], paint, paintOptions);
  rounded('body', [0.16, 0.16, 1.8], [-2.267, 0.713, 0], trim, trimOptions);
  rounded('body', [0.15, 0.16, 1.82], [2.267, 0.725, 0], trim, trimOptions);
  rounded('body', [0.05, 0.044, 1.42], [-2.351, 0.657, 0], 0xa5b3bc, {
    metalness: 0.8,
    roughness: 0.25,
  });
  rounded('body', [0.03, 0.035, 1.35], [2.353, 0.672, 0], 0xa5b3bc, {
    metalness: 0.8,
    roughness: 0.25,
  });

  // Recessed grille, horizontal blades and two lower side intakes.
  rounded('body', [0.035, 0.25, 1.05], [-2.362, 0.965, 0], trim, trimOptions);
  for (let i = 0; i < 5; i++)
    rounded('body', [0.017, 0.012, 0.96], [-2.384, 0.874 + i * 0.045, 0], 0x43515d, {
      metalness: 0.65,
      roughness: 0.3,
    });
  for (const side of [-1, 1]) {
    rounded('body', [0.035, 0.15, 0.26], [-2.34, 0.811, side * 0.714], trim, trimOptions);
    rounded('lights', [0.027, 0.018, 0.17], [-2.366, 0.822, side * 0.714], 0xdcebf1, {
      emissive: 0xa2c7df,
      emissiveIntensity: 0.7,
    });
    polygon(
      'lights',
      [
        [-2.362, 1.184, side * 0.53],
        [-2.31, 1.18, side * 0.878],
        [-2.315, 1.069, side * 0.883],
        [-2.372, 1.075, side * 0.545],
      ],
      0x142331,
      { roughness: 0.1, metalness: 0.3, clearcoat: 1 },
    );
    polygon(
      'lights',
      [
        [-2.375, 1.164, side * 0.548],
        [-2.324, 1.159, side * 0.864],
        [-2.326, 1.143, side * 0.862],
        [-2.377, 1.145, side * 0.549],
      ],
      0xe8f4ff,
      { emissive: 0xc4e4ff, emissiveIntensity: 1.6, roughness: 0.1 },
    );
    rounded('lights', [0.018, 0.051, 0.084], [-2.365, 1.111, side * 0.621], 0xcddce5, {
      emissive: 0x9fb9cc,
      emissiveIntensity: 0.25,
      roughness: 0.05,
    });
    polygon(
      'lights',
      [
        [2.351, 1.272, side * 0.49],
        [2.32, 1.266, side * 0.902],
        [2.325, 1.123, side * 0.898],
        [2.362, 1.14, side * 0.51],
      ],
      0x701722,
      { roughness: 0.12, metalness: 0.25 },
    );
    polygon(
      'lights',
      [
        [2.367, 1.244, side * 0.515],
        [2.334, 1.241, side * 0.884],
        [2.336, 1.214, side * 0.883],
        [2.369, 1.217, side * 0.518],
      ],
      0xe3373e,
      { emissive: 0xb31421, emissiveIntensity: 1.2, roughness: 0.1 },
    );
    rounded('lights', [0.019, 0.03, 0.21], [2.356, 0.79, side * 0.66], 0x9c1320, {
      emissive: 0x680d10,
      emissiveIntensity: 0.3,
    });
  }
  // White/blue plates provide familiar scale without a real registration or brand.
  for (const x of [-2.393, 2.363]) {
    rounded('vin', [0.018, 0.12, 0.44], [x, 0.937, 0], 0xe4e9e9, {
      roughness: 0.3,
      metalness: 0.1,
    });
    rounded('vin', [0.022, 0.024, 0.443], [x + (x < 0 ? -0.004 : 0.004), 0.984, 0], 0x2c5e91, {
      roughness: 0.3,
    });
  }
  // Rear hatch cut line, handle and parked wiper complete the back of the body.
  rounded('doors', [0.026, 0.022, 0.19], [2.349, 1.084, 0], 0xb2c0c9, {
    roughness: 0.2,
    metalness: 0.85,
  });
  rod('glass', [1.923, 1.52, -0.19], [1.918, 1.522, 0.34], 0.009, trim, trimOptions);
}
