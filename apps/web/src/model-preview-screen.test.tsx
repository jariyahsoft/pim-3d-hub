import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ModelPreviewScreen } from './model-preview-screen.js';
import {
  MAX_TRIANGLES,
  computeZoomFactor,
  demoMetadata,
  detectUnitAmbiguity,
  dimensionsAriaLabel,
  formatDimensions,
  parseAsciiStl,
  parseBinaryStl,
  projectOrtho,
} from './model-preview-demo.js';

describe('ModelPreviewScreen', () => {
  it('renders empty state with a select button', () => {
    const html = renderToStaticMarkup(<ModelPreviewScreen />);
    expect(html).toContain('พรีวิวโมเดล 3D');
    expect(html).toContain('เลือกไฟล์โมเดล 3D');
    expect(html).toContain('.stl,.obj,.3mf');
  });

  it('renders with demo metadata and canvas', () => {
    const html = renderToStaticMarkup(
      <ModelPreviewScreen initialMetadata={demoMetadata} />,
    );
    expect(html).toContain('demo-part');
    expect(html).toContain('STL_BINARY');
    expect(html).toContain('4');
    expect(html).toContain('canvas');
    expect(html).toContain('รีเซ็ต');
    expect(html).toContain('ขยาย');
  });

  it('renders loading state', () => {
    const html = renderToStaticMarkup(<ModelPreviewScreen initialLoading />);
    expect(html).toContain('กำลังโหลด');
  });

  it('renders error state', () => {
    const html = renderToStaticMarkup(
      <ModelPreviewScreen initialError="ไม่สามารถอ่านไฟล์ STL ได้" />,
    );
    expect(html).toContain('ไม่สามารถอ่านไฟล์ STL ได้');
  });

  it('renders unit ambiguity dialog', () => {
    const html = renderToStaticMarkup(
      <ModelPreviewScreen
        initialMetadata={demoMetadata}
        initialUnitAmbiguity={{
          detectedSource: 'UNKNOWN',
          isAmbiguous: true,
          userConfirmedScale: null,
        }}
      />,
    );
    expect(html).toContain('ยืนยันหน่วยวัด');
    expect(html).toContain('สเกล');
  });
});

describe('STL parser', () => {
  function createBinaryStl(triangleCount: number): ArrayBuffer {
    const buf = new ArrayBuffer(84 + triangleCount * 50);
    const view = new DataView(buf);
    view.setUint32(80, triangleCount, true); // triangle count
    for (let i = 0; i < triangleCount; i++) {
      const idx = 84 + i * 50;
      // Normal (skip)
      view.setFloat32(idx + 0, 0, true);
      view.setFloat32(idx + 4, 0, true);
      view.setFloat32(idx + 8, 1, true);
      // Vertices: a small triangle
      view.setFloat32(idx + 12, 0, true);
      view.setFloat32(idx + 16, 0, true);
      view.setFloat32(idx + 20, 0, true);
      view.setFloat32(idx + 24, 10, true);
      view.setFloat32(idx + 28, 0, true);
      view.setFloat32(idx + 32, 0, true);
      view.setFloat32(idx + 36, 0, true);
      view.setFloat32(idx + 40, 10, true);
      view.setFloat32(idx + 44, 0, true);
      // Attribute (skip)
    }
    return buf;
  }

  it('parses a valid binary STL', () => {
    const buf = createBinaryStl(5);
    const result = parseBinaryStl(buf, 'test.stl');
    expect(result).not.toBe('PARSE_ERROR');
    expect(result).not.toBe('TOO_LARGE');
    if (typeof result === 'object') {
      expect(result.name).toBe('test.stl');
      expect(result.format).toBe('STL_BINARY');
      expect(result.triangleCount).toBe(5);
      expect(result.bounds.widthMm).toBeGreaterThan(0);
      expect(result.facets.length).toBe(5 * 9);
    }
  });

  it('rejects buffer smaller than STL header', () => {
    const buf = new ArrayBuffer(10);
    const result = parseBinaryStl(buf, 'tiny.stl');
    expect(result).toBe('PARSE_ERROR');
  });

  it('rejects files with too many triangles', () => {
    const buf = createBinaryStl(MAX_TRIANGLES + 1);
    const result = parseBinaryStl(buf, 'huge.stl');
    expect(result).toBe('TOO_LARGE');
  });

  it('parses a valid ASCII STL', () => {
    const ascii = `solid test
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 10 0 0
      vertex 0 10 0
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 0 10 0
      vertex 0 0 10
    endloop
  endfacet
endsolid test`;
    const result = parseAsciiStl(ascii, 'ascii.stl');
    expect(result).not.toBe('PARSE_ERROR');
    expect(result).not.toBe('TOO_LARGE');
    if (typeof result === 'object') {
      expect(result.name).toBe('ascii.stl');
      expect(result.format).toBe('STL_ASCII');
      expect(result.triangleCount).toBe(2);
      expect(result.facets.length).toBe(2 * 9);
    }
  });

  it('rejects malformed ASCII STL', () => {
    const result = parseAsciiStl('not a valid stl file', 'bad.stl');
    expect(result).toBe('PARSE_ERROR');
  });
});

describe('3D projection', () => {
  it('projectOrtho returns finite coordinates', () => {
    const result = projectOrtho(5, 5, 5, 0.5, -0.3, 80, 250, 200);
    expect(Number.isFinite(result[0])).toBe(true);
    expect(Number.isFinite(result[1])).toBe(true);
  });

  it('projectOrtho at zero rotation maps center to viewport center', () => {
    const [x, y] = projectOrtho(0, 0, 0, 0, 0, 80, 250, 200);
    expect(x).toBe(250);
    expect(y).toBe(200);
  });
});

describe('dimension helpers', () => {
  it('computeZoomFactor produces a positive finite value', () => {
    const result = computeZoomFactor(demoMetadata.bounds, 500, 400);
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('formatDimensions formats correctly', () => {
    expect(formatDimensions(demoMetadata.bounds)).toBe('30 × 50 × 60 mm');
  });

  it('dimensionsAriaLabel returns Thai text', () => {
    const label = dimensionsAriaLabel(demoMetadata.bounds);
    expect(label).toContain('มิลลิเมตร');
    expect(label).toContain('30');
    expect(label).toContain('50');
    expect(label).toContain('60');
  });

  it('detectUnitAmbiguity returns non-ambiguous for MM', () => {
    const result = detectUnitAmbiguity('MM', 100);
    expect(result.isAmbiguous).toBe(false);
  });

  it('detectUnitAmbiguity returns ambiguous for UNKNOWN', () => {
    const result = detectUnitAmbiguity(null, 100);
    expect(result.isAmbiguous).toBe(true);
    expect(result.detectedSource).toBe('UNKNOWN');
  });
});
