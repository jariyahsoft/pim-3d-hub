import { describe, expect, it } from 'vitest';
import {
  parseBinaryStl,
  parseAsciiStl,
  MAX_TRIANGLES,
} from './model-preview-demo.js';

describe('file security corpus — corrupt/oversized/malformed STL', () => {
  // ── Corrupt files ──

  it('rejects a truncated binary STL (missing triangle data)', () => {
    const buf = new ArrayBuffer(84); // header only, no triangles
    const result = parseBinaryStl(buf, 'truncated.stl');
    expect(result).toBe('PARSE_ERROR');
  });

  it('rejects a binary STL with header that says 10 triangles but only has 5', () => {
    const buf = new ArrayBuffer(84 + 5 * 50);
    const view = new DataView(buf);
    view.setUint32(80, 10, true); // claims 10 triangles
    for (let i = 0; i < 5; i++) {
      const idx = 84 + i * 50;
      view.setFloat32(idx + 12, i, true);
      view.setFloat32(idx + 16, i, true);
      view.setFloat32(idx + 20, i, true);
    }
    const result = parseBinaryStl(buf, 'mismatch.stl');
    expect(result).toBe('PARSE_ERROR');
  });

  it('rejects ASCII STL with no vertex lines', () => {
    const result = parseAsciiStl(
      'solid nothing\nendsolid nothing',
      'empty.stl',
    );
    expect(result).toBe('PARSE_ERROR');
  });

  it('rejects ASCII STL with malformed vertex (non-numeric)', () => {
    const result = parseAsciiStl(
      'solid bad\nfacet normal 0 0 1\nouter loop\nvertex abc def ghi\nendloop\nendfacet\nendsolid bad',
      'bad-vertex.stl',
    );
    expect(result).toBe('PARSE_ERROR');
  });

  it('rejects ASCII STL with NaN vertex values', () => {
    const result = parseAsciiStl(
      'solid nan\nfacet normal 0 0 1\nouter loop\nvertex NaN Infinity -NaN\nendloop\nendfacet\nendsolid nan',
      'nan.stl',
    );
    expect(result).toBe('PARSE_ERROR');
  });

  // ── Oversized / resource-heavy ──

  it('rejects a binary STL exceeding MAX_TRIANGLES', () => {
    const buf = new ArrayBuffer(84 + (MAX_TRIANGLES + 1) * 50);
    const view = new DataView(buf);
    view.setUint32(80, MAX_TRIANGLES + 1, true);
    const result = parseBinaryStl(buf, 'too-large.stl');
    expect(result).toBe('TOO_LARGE');
  });

  it('rejects a binary STL at exactly MAX_TRIANGLES+100 (oversized)', () => {
    const count = MAX_TRIANGLES + 100;
    const buf = new ArrayBuffer(84 + count * 50);
    const view = new DataView(buf);
    view.setUint32(80, count, true);
    const result = parseBinaryStl(buf, 'oversized.stl');
    expect(result).toBe('TOO_LARGE');
  });

  it('accepts a binary STL at MAX_TRIANGLES - 1', () => {
    const count = MAX_TRIANGLES - 1;
    const buf = new ArrayBuffer(84 + count * 50);
    const view = new DataView(buf);
    view.setUint32(80, count, true);
    const result = parseBinaryStl(buf, 'large-valid.stl');
    expect(result).not.toBe('TOO_LARGE');
    expect(result).not.toBe('PARSE_ERROR');
  });

  // ── Malformed / structural tests ──

  it('rejects a buffer with zero triangles', () => {
    const buf = new ArrayBuffer(84);
    const view = new DataView(buf);
    view.setUint32(80, 0, true);
    const result = parseBinaryStl(buf, 'zero-triangles.stl');
    expect(result).toBe('PARSE_ERROR');
  });

  it('rejects an undersized buffer', () => {
    const buf = new ArrayBuffer(20);
    const result = parseBinaryStl(buf, 'tiny.stl');
    expect(result).toBe('PARSE_ERROR');
  });

  it('rejects binary garbage as ASCII STL', () => {
    const result = parseAsciiStl(
      '\x00\x01\x02\x03\xFF\xFE\xFD\xFC',
      'binary-garbage.stl',
    );
    expect(result).toBe('PARSE_ERROR');
  });

  it('rejects incomplete ASCII STL facet', () => {
    const result = parseAsciiStl(
      'solid incomplete\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nendloop\nendfacet\nendsolid incomplete',
      'incomplete.stl',
    );
    expect(result).toBe('PARSE_ERROR');
  });

  // ── Mixed formats / boundary ──

  it('allows parsing when file has mixed line endings in ASCII STL', () => {
    const mixed =
      'solid test\r\nfacet normal 0 0 1\r\nouter loop\nvertex 0 0 0\nvertex 10 0 0\nvertex 0 10 0\nendloop\nendfacet\nendsolid test';
    const result = parseAsciiStl(mixed, 'mixed.stl');
    expect(result).not.toBe('PARSE_ERROR');
  });

  it('parses STL with all-zero coordinates gracefully', () => {
    const buf = new ArrayBuffer(84 + 1 * 50);
    const view = new DataView(buf);
    view.setUint32(80, 1, true);
    const result = parseBinaryStl(buf, 'zero-coords.stl');
    expect(result).not.toBe('PARSE_ERROR');
    expect(result).not.toBe('TOO_LARGE');
  });
});
