export const analysisDraftStorageKey = 'pim-3d-hub:analysis-draft';

export type AnalysisState =
  | 'pending'
  | 'scanning'
  | 'analyzing'
  | 'ready'
  | 'warning'
  | 'manual_fallback'
  | 'rejected'
  | 'failed';

export type DraftStorageLike = Pick<
  Storage,
  'getItem' | 'removeItem' | 'setItem'
>;

export type AnalysisDraft = Readonly<{
  currentState: AnalysisState;
  filename: string;
  fileSize: number;
  mimeType: string;
  statusMessage: string | null;
  warningMessages: readonly string[];
  errorMessage: string | null;
  unitAmbiguous: boolean;
  fallbackPreserved: boolean;
}>;

export const demoAnalysisDraft: AnalysisDraft = Object.freeze({
  currentState: 'pending',
  filename: '',
  fileSize: 0,
  mimeType: '',
  statusMessage: null,
  warningMessages: [],
  errorMessage: null,
  unitAmbiguous: false,
  fallbackPreserved: false,
});

export function analysisAriaLabel(
  state: AnalysisState,
  filename: string,
): string {
  switch (state) {
    case 'pending':
      return 'รอการวิเคราะห์';
    case 'scanning':
      return `กำลังสแกนไฟล์${filename ? ` ${filename}` : ''}`;
    case 'analyzing':
      return `กำลังวิเคราะห์โมเดล${filename ? ` ${filename}` : ''}`;
    case 'ready':
      return 'การวิเคราะห์เสร็จสมบูรณ์';
    case 'warning':
      return 'การวิเคราะห์เสร็จสมบูรณ์แต่มีข้อควรระวัง';
    case 'manual_fallback':
      return 'ไม่สามารถวิเคราะห์ไฟล์อัตโนมัติได้ กรุณาส่งคำขอด้วยตนเอง';
    case 'rejected':
      return 'ไฟล์ไม่ผ่านการวิเคราะห์';
    case 'failed':
      return 'การวิเคราะห์ล้มเหลว';
  }
}

export function isTerminalState(state: AnalysisState): boolean {
  return state === 'ready' || state === 'rejected' || state === 'failed';
}

export function isProgressState(state: AnalysisState): boolean {
  return state === 'scanning' || state === 'analyzing';
}

export const demoWarningMessages: readonly string[] = Object.freeze([
  'ผนังบางเกินไป (น้อยกว่า 1 มม.)',
  'มี overhang ที่ต้องใช้ support',
  'ปริมาตรเกินขนาดพิมพ์แนะนำ',
]);
