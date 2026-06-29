import type { ModelAnalyzerPort } from '@pim/application';

export const SANDBOX_ANALYZER_VERSION = '1.0.0-sandbox';

export function createSandboxModelAnalyzer(): ModelAnalyzerPort {
  return Object.freeze({
    async analyze(_input) {
      // Sandbox analyzer simulates a 3D model analysis:
      //   - Parses the file metadata (in production this uses a sandboxed
      //     native parser running in an isolated container/worker)
      //   - Computes bounding box, volume, mesh health indicators
      //   - Returns eligibility hints for the pricing engine
      //
      // The sandbox does NOT read the actual file bytes. It returns
      // deterministic plausible values for test and development.
      return {
        analyzerVersion: SANDBOX_ANALYZER_VERSION,
        boundsMm: [100, 80, 60] as [number, number, number],
        durationMs: 150,
        eligibilityHints: {
          materialSuggestion: 'PLA',
          maxAngleDeg: 45,
          minWallThicknessMm: 1.2,
          overhangPercentage: 15,
          printVolumeEligible: true,
          shellThicknessWarning: false,
          supportRequired: false,
        },
        meshHealth: {
          degenerateFacets: 0,
          edgesManifold: true,
          hasSolidOrientation: true,
          holes: 0,
          volumeClosed: true,
        },
        units: 'MM',
        volumeMm3: 480_000,
      };
    },
  });
}
