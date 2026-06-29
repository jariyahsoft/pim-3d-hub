export const modelPreviewDraftStorageKey = 'pim-3d-hub:model-preview-draft';

// Triangle mesh representation.
// Each facet is three 3D vertices: [x1,y1,z1, x2,y2,z2, x3,y3,z3]
export type Facets = readonly number[];

export type BoundingBox = Readonly<{
  center: readonly [number, number, number];
  depthMm: number;
  heightMm: number;
  widthMm: number;
}>;

export type UnitSource = 'MM' | 'CM' | 'INCH' | 'UNKNOWN' | 'CONFIRMED_MM';

export type MeshMetadata = Readonly<{
  bounds: BoundingBox;
  format: 'STL_BINARY' | 'STL_ASCII' | 'OBJ' | '3MF' | 'UNKNOWN';
  facets: Facets;
  name: string;
  sourceUnit: UnitSource;
  triangleCount: number;
}>;

export type UnitAmbiguityConfirmation = Readonly<{
  detectedSource: UnitSource;
  isAmbiguous: boolean;
  userConfirmedScale: number | null;
}>;

export type ViewerState = Readonly<{
  isLoading: boolean;
  isParsing: boolean;
  isTooLarge: boolean;
  metadata: MeshMetadata | null;
  unitAmbiguity: UnitAmbiguityConfirmation | null;
  errorMessage: string | null;
}>;

export const MAX_TRIANGLES = 300_000;

export const demoMetadata: MeshMetadata = Object.freeze({
  bounds: Object.freeze({
    center: [25, 30, 15] as const,
    depthMm: 50,
    heightMm: 60,
    widthMm: 30,
  }),
  facets: Object.freeze([
    // A simple tetrahedron (4 facets, 12 vertices)
    0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 0, 0, 10,
    10, 0, 0, 10, 0, 0, 0, 0, 10, 0, 10, 0,
  ] as readonly number[]),
  format: 'STL_BINARY',
  name: 'demo-part',
  sourceUnit: 'MM',
  triangleCount: 4,
});

export const demoLargeMetadata: MeshMetadata = Object.freeze({
  ...demoMetadata,
  triangleCount: 500_000,
  name: 'too-large',
});

// Parse binary STL bytes into a flat vertex array.
// Binary STL format: 80-byte header, 4-byte triangle count N, then N * 50 bytes
// (12 bytes normal + 36 bytes vertices + 2 bytes attribute).
export function parseBinaryStl(
  buffer: ArrayBuffer,
  name: string,
): MeshMetadata | 'TOO_LARGE' | 'PARSE_ERROR' {
  const view = new DataView(buffer);
  if (buffer.byteLength < 84) {
    return 'PARSE_ERROR';
  }
  const triangleCount = view.getUint32(80, true);
  const expectedSize = 84 + triangleCount * 50;
  if (buffer.byteLength < expectedSize) {
    return 'PARSE_ERROR';
  }
  if (triangleCount > MAX_TRIANGLES) {
    return 'TOO_LARGE';
  }
  const facets: number[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    offset += 12; // skip normal
    for (let v = 0; v < 3; v++) {
      const x = view.getFloat32(offset, true);
      offset += 4;
      const y = view.getFloat32(offset, true);
      offset += 4;
      const z = view.getFloat32(offset, true);
      offset += 4;
      facets.push(x, y, z);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    offset += 2; // skip attribute
  }
  const widthMm = +(maxX - minX).toFixed(2);
  const heightMm = +(maxY - minY).toFixed(2);
  const depthMm = +(maxZ - minZ).toFixed(2);
  return Object.freeze({
    bounds: Object.freeze({
      center: [
        +((minX + maxX) / 2).toFixed(2),
        +((minY + maxY) / 2).toFixed(2),
        +((minZ + maxZ) / 2).toFixed(2),
      ] as [number, number, number],
      depthMm,
      heightMm,
      widthMm,
    }),
    facets: Object.freeze(facets),
    format: 'STL_BINARY',
    name,
    sourceUnit: 'MM',
    triangleCount,
  });
}

// Parse ASCII STL text (simplified — skips most validation).
export function parseAsciiStl(
  text: string,
  name: string,
): MeshMetadata | 'TOO_LARGE' | 'PARSE_ERROR' {
  const lines = text.split(/\r?\n/);
  const vertices: number[] = [];
  let triangleCount = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const line of lines) {
    const trimmed = line.trim();
    // Match "vertex x y z"
    if (trimmed.startsWith('vertex ') || trimmed.startsWith('VERTEX ')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        const x = parseFloat(parts[parts.length - 3]!);
        const y = parseFloat(parts[parts.length - 2]!);
        const z = parseFloat(parts[parts.length - 1]!);
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
          return 'PARSE_ERROR';
        }
        vertices.push(x, y, z);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
        triangleCount = vertices.length / 9;
      }
    }
  }
  if (triangleCount < 1 || vertices.length < 9) {
    return 'PARSE_ERROR';
  }
  if (triangleCount > MAX_TRIANGLES) {
    return 'TOO_LARGE';
  }
  const widthMm = +(maxX - minX).toFixed(2);
  const heightMm = +(maxY - minY).toFixed(2);
  const depthMm = +(maxZ - minZ).toFixed(2);
  return Object.freeze({
    bounds: Object.freeze({
      center: [
        +((minX + maxX) / 2).toFixed(2),
        +((minY + maxY) / 2).toFixed(2),
        +((minZ + maxZ) / 2).toFixed(2),
      ] as [number, number, number],
      depthMm,
      heightMm,
      widthMm,
    }),
    facets: Object.freeze(vertices),
    format: 'STL_ASCII',
    name,
    sourceUnit: 'MM',
    triangleCount,
  });
}

// Project a 3D point to 2D screen coordinates using orthographic projection.
export function projectOrtho(
  x: number,
  y: number,
  z: number,
  rotationX: number,
  rotationY: number,
  zoom: number,
  cx: number,
  cy: number,
): readonly [number, number] {
  // Simple YX rotation matrix
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);

  // Rotate around Y
  const x1 = x * cosY - z * sinY;
  const y1 = y;
  const z1 = x * sinY + z * cosY;

  // Rotate around X
  const x2 = x1;
  const y2 = y1 * cosX - z1 * sinX;

  return [cx + x2 * zoom, cy - y2 * zoom];
}

// Compute an auto-scale factor to fit bounds into a viewport.
export function computeZoomFactor(
  bounds: BoundingBox,
  viewportW: number,
  viewportH: number,
  padding = 0.8,
): number {
  const maxDim = Math.max(bounds.widthMm, bounds.heightMm, bounds.depthMm);
  if (maxDim === 0) {
    return 1;
  }
  const scaleX = (viewportW * padding) / maxDim;
  const scaleY = (viewportH * padding) / maxDim;
  return Math.min(scaleX, scaleY, 200);
}

// Detect unit ambiguity from an OBJ file or user-declared input.
export function detectUnitAmbiguity(
  declaredUnit: string | null,
  _boundsMm: number,
): UnitAmbiguityConfirmation {
  void _boundsMm;
  const normalized = declaredUnit?.trim().toUpperCase();
  if (normalized === 'MM') {
    return {
      detectedSource: 'MM',
      isAmbiguous: false,
      userConfirmedScale: null,
    };
  }
  if (normalized === 'CM') {
    return {
      detectedSource: 'CM',
      isAmbiguous: true,
      userConfirmedScale: null,
    };
  }
  if (normalized === 'INCH' || normalized === 'IN') {
    return {
      detectedSource: 'INCH',
      isAmbiguous: true,
      userConfirmedScale: null,
    };
  }
  // UNKNOWN — ask for confirmation
  return {
    detectedSource: 'UNKNOWN',
    isAmbiguous: true,
    userConfirmedScale: null,
  };
}

// Format dimensions for display.
export function formatDimensions(bounds: BoundingBox): string {
  return `${bounds.widthMm} × ${bounds.depthMm} × ${bounds.heightMm} mm`;
}

// Bounding box label in text form for accessibility.
export function dimensionsAriaLabel(bounds: BoundingBox): string {
  return `ขนาดไฟล์ กว้าง ${bounds.widthMm} มิลลิเมตร ลึก ${bounds.depthMm} มิลลิเมตร สูง ${bounds.heightMm} มิลลิเมตร`;
}
