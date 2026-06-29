'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  computeZoomFactor,
  dimensionsAriaLabel,
  formatDimensions,
  modelPreviewDraftStorageKey,
  parseBinaryStl,
  projectOrtho,
  type BoundingBox,
  type Facets,
  type MeshMetadata,
  type UnitAmbiguityConfirmation,
} from './model-preview-demo.js';
void modelPreviewDraftStorageKey;

export type ModelPreviewScreenProps = Readonly<{
  initialMetadata?: MeshMetadata | null;
  initialError?: string | null;
  initialLoading?: boolean;
  initialUnitAmbiguity?: UnitAmbiguityConfirmation | null;
  onConfirmUnits?: (scale: number) => void | Promise<void>;
  onFileSelect?: (file: File) => void | Promise<void>;
}>;

function renderWireframe(
  ctx: CanvasRenderingContext2D,
  facets: Facets,
  rotX: number,
  rotY: number,
  zoom: number,
  bounds: BoundingBox,
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // Draw a subtle grid for depth perception
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
  ctx.lineWidth = 0.5;
  for (let gx = -5; gx <= 5; gx++) {
    const [sx, sy] = projectOrtho(
      gx * (bounds.widthMm / 5),
      -bounds.heightMm / 2 - 5,
      0,
      rotX,
      rotY,
      zoom,
      cx,
      cy,
    );
    const [ex, ey] = projectOrtho(
      gx * (bounds.widthMm / 5),
      bounds.heightMm / 2 + 5,
      0,
      rotX,
      rotY,
      zoom,
      cx,
      cy,
    );
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
  for (let gz = -5; gz <= 5; gz++) {
    const [sx, sy] = projectOrtho(
      -bounds.widthMm / 2 - 5,
      -bounds.heightMm / 2 - 5,
      gz * (bounds.depthMm / 5),
      rotX,
      rotY,
      zoom,
      cx,
      cy,
    );
    const [ex, ey] = projectOrtho(
      bounds.widthMm / 2 + 5,
      -bounds.heightMm / 2 - 5,
      gz * (bounds.depthMm / 5),
      rotX,
      rotY,
      zoom,
      cx,
      cy,
    );
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  // Draw facets
  ctx.strokeStyle = 'rgba(80, 130, 200, 0.85)';
  ctx.lineWidth = 1.5;

  for (let i = 0; i < facets.length; i += 9) {
    const x1 = facets[i]!;
    const y1 = facets[i + 1]!;
    const z1 = facets[i + 2]!;
    const x2 = facets[i + 3]!;
    const y2 = facets[i + 4]!;
    const z2 = facets[i + 5]!;
    const x3 = facets[i + 6]!;
    const y3 = facets[i + 7]!;
    const z3 = facets[i + 8]!;

    const [p1x, p1y] = projectOrtho(x1, y1, z1, rotX, rotY, zoom, cx, cy);
    const [p2x, p2y] = projectOrtho(x2, y2, z2, rotX, rotY, zoom, cx, cy);
    const [p3x, p3y] = projectOrtho(x3, y3, z3, rotX, rotY, zoom, cx, cy);

    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.lineTo(p3x, p3y);
    ctx.closePath();
    ctx.stroke();

    // Light fill for depth perception
    ctx.fillStyle = 'rgba(80, 130, 200, 0.08)';
    ctx.fill();
  }

  // Bounding box bounds label
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formatDimensions(bounds), 12, h - 16);
}

export function ModelPreviewScreen(
  props: ModelPreviewScreenProps,
): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [metadata, setMetadata] = useState<MeshMetadata | null>(
    props.initialMetadata ?? null,
  );
  const [loading, setLoading] = useState(props.initialLoading ?? false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    props.initialError ?? null,
  );
  const [unitAmbiguity, setUnitAmbiguity] =
    useState<UnitAmbiguityConfirmation | null>(
      props.initialUnitAmbiguity ?? null,
    );
  const [unitScaleInput, setUnitScaleInput] = useState('1.0');
  const [rotX, setRotX] = useState(0.5);
  const [rotY, setRotY] = useState(-0.3);
  const [zoom, setZoom] = useState(80);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [rotStart, setRotStart] = useState<{ x: number; y: number }>({
    x: 0.5,
    y: -0.3,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  void modelPreviewDraftStorageKey; // Reserved for draft persistence.

  // Auto-fit when metadata loads
  useEffect(() => {
    if (!metadata || !canvasRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    const factor = computeZoomFactor(
      metadata.bounds,
      canvas.width,
      canvas.height,
    );
    setZoom(factor);
  }, [metadata]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const mesh = metadata;
    if (!canvas || !mesh) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const activeCtx: CanvasRenderingContext2D = ctx;
    const activeMesh = mesh;
    function draw(): void {
      renderWireframe(
        activeCtx,
        activeMesh.facets,
        rotX,
        rotY,
        zoom,
        activeMesh.bounds,
      );
      animationRef.current = requestAnimationFrame(draw);
    }

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [metadata, rotX, rotY, zoom]);

  const handleFileSelect = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        const bytes = await file.arrayBuffer();
        const result = parseBinaryStl(bytes, file.name);
        if (result === 'TOO_LARGE') {
          setErrorMessage(
            'ไฟล์มีจำนวนรูปสามเหลี่ยมมากเกินไป กรุณาอัปโหลดไฟล์ที่มีรายละเอียดน้อยลง (สูงสุด 300,000 รูป)',
          );
          return;
        }
        if (result === 'PARSE_ERROR') {
          setErrorMessage(
            'ไม่สามารถอ่านไฟล์ STL ได้ กรุณาตรวจสอบว่าไฟล์ถูกต้อง',
          );
          return;
        }
        setMetadata(result);
      } catch {
        setErrorMessage('เกิดข้อผิดพลาดในการอ่านไฟล์');
      } finally {
        setLoading(false);
      }
      await props.onFileSelect?.(file);
    },
    [props],
  );

  const handleCanvasMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(true);
      setDragStart({ x: event.clientX, y: event.clientY });
      setRotStart({ x: rotX, y: rotY });
    },
    [rotX, rotY],
  );

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleCanvasMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !dragStart) {
        return;
      }
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      setRotY(rotStart.y + dx * 0.008);
      setRotX(rotStart.x + dy * 0.008);
    },
    [isDragging, dragStart, rotStart],
  );

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.15, 400));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.15, 10));
  }, []);

  const handleResetView = useCallback(() => {
    setRotX(0.5);
    setRotY(-0.3);
    if (metadata) {
      const canvas = canvasRef.current;
      if (canvas) {
        setZoom(
          computeZoomFactor(metadata.bounds, canvas.width, canvas.height),
        );
      }
    }
  }, [metadata]);

  const handleUnitConfirm = useCallback(() => {
    if (!unitAmbiguity || !metadata) {
      return;
    }
    const scale = parseFloat(unitScaleInput);
    if (!isFinite(scale) || scale <= 0) {
      setErrorMessage('กรุณาป้อนตัวเลขที่ถูกต้องสำหรับสเกล');
      return;
    }
    setUnitAmbiguity({
      ...unitAmbiguity,
      userConfirmedScale: scale,
      isAmbiguous: false,
    });
    void props.onConfirmUnits?.(scale);
  }, [unitAmbiguity, unitScaleInput, metadata, props]);

  const handleClickSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  return (
    <div className="model-preview" role="region" aria-label="พรีวิวโมเดล 3D">
      <h2 className="model-preview__title">พรีวิวโมเดล 3D</h2>

      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.obj,.3mf"
        onChange={handleInputChange}
        className="model-preview__file-input"
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* Error state */}
      {errorMessage && (
        <p className="model-preview__error" role="alert">
          {errorMessage}
        </p>
      )}

      {/* Loading state */}
      {loading && (
        <p
          className="model-preview__loading"
          role="status"
          aria-label="กำลังโหลด"
        >
          กำลังโหลดไฟล์...
        </p>
      )}

      {/* Empty / select file state */}
      {!metadata && !loading && !errorMessage && (
        <div className="model-preview__empty">
          <button
            className="model-preview__select-btn"
            onClick={handleClickSelect}
            aria-label="เลือกไฟล์โมเดล 3D"
          >
            📂 เลือกไฟล์โมเดล 3D
          </button>
          <p className="model-preview__hint">รองรับไฟล์ STL, OBJ, 3MF</p>
        </div>
      )}

      {/* Viewer canvas */}
      {metadata && (
        <div className="model-preview__viewer">
          <canvas
            ref={canvasRef}
            width={500}
            height={400}
            className="model-preview__canvas"
            role="img"
            aria-label={dimensionsAriaLabel(metadata.bounds)}
            tabIndex={0}
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseUp}
            onKeyDown={(e) => {
              if (e.key === 'r' || e.key === 'R') {
                handleResetView();
              }
            }}
          />

          {/* Viewer controls */}
          <div
            className="model-preview__controls"
            role="toolbar"
            aria-label="ควบคุมมุมมอง"
          >
            <button
              className="model-preview__btn"
              onClick={handleZoomIn}
              aria-label="ขยาย"
              title="ขยาย"
            >
              🔍+
            </button>
            <button
              className="model-preview__btn"
              onClick={handleZoomOut}
              aria-label="ย่อ"
              title="ย่อ"
            >
              🔍−
            </button>
            <button
              className="model-preview__btn"
              onClick={handleResetView}
              aria-label="รีเซ็ตมุมมอง"
              title="รีเซ็ตมุมมอง"
            >
              🏠 รีเซ็ต
            </button>
          </div>

          {/* Metadata */}
          <div className="model-preview__metadata" aria-label="ข้อมูลโมเดล">
            <p>
              <strong>ชื่อไฟล์:</strong> {metadata.name}
            </p>
            <p>
              <strong>รูปแบบ:</strong> {metadata.format}
            </p>
            <p>
              <strong>จำนวนรูปสามเหลี่ยม:</strong>{' '}
              {metadata.triangleCount.toLocaleString()}
            </p>
            <p>
              <strong>ขนาด:</strong> {formatDimensions(metadata.bounds)}
            </p>
            <p className="sr-only" role="status">
              {dimensionsAriaLabel(metadata.bounds)}
            </p>
          </div>
        </div>
      )}

      {/* Unit ambiguity confirmation */}
      {unitAmbiguity?.isAmbiguous && metadata && (
        <div
          className="model-preview__unit-confirm"
          role="alertdialog"
          aria-label="ยืนยันหน่วยวัด"
        >
          <p className="model-preview__unit-warning">
            ⚠️ ไม่สามารถตรวจสอบหน่วยวัดของไฟล์นี้ได้ ขนาดที่คำนวณได้:{' '}
            {formatDimensions(metadata.bounds)}
          </p>
          <p>
            กรุณาป้อนสเกลที่ถูกต้อง (1.0 = มิลลิเมตร, 10.0 = เซนติเมตร, 25.4 =
            นิ้ว):
          </p>
          <div className="model-preview__unit-form">
            <input
              type="number"
              step="0.1"
              min="0.001"
              value={unitScaleInput}
              onChange={(e) => {
                setUnitScaleInput(e.target.value);
              }}
              aria-label="สเกล"
              className="model-preview__unit-input"
            />
            <button
              className="model-preview__btn model-preview__btn--primary"
              onClick={handleUnitConfirm}
              aria-label="ยืนยันสเกล"
            >
              ยืนยัน
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
