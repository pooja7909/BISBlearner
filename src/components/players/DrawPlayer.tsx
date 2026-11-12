import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eraser,
  Pencil,
  RotateCcw,
  Send,
  Tag,
  Undo2,
} from 'lucide-react';
import type { DrawPayload, LiveRoom } from '../../types.ts';
import { soundtrack } from '../../utils/soundtrack.ts';

interface DrawPlayerProps {
  payload: DrawPayload;
  boardMode: boolean;
  largeType: boolean;
  liveRoom?: LiveRoom | null;
  studentSession?: {
    code: string;
    participantId: string;
    name: string;
    team: string;
  } | null;
  onTeacherControl?: (action: Record<string, unknown>) => void;
  onProgress?: (score: number, total: number, completed: boolean, summary: string) => void;
}

const PEN_COLORS = [
  { name: 'Ink', value: '#0f172a' },
  { name: 'Cobalt', value: '#1d4ed8' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Coral', value: '#dc2626' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Violet', value: '#7c3aed' },
];

export function DrawPlayer({
  payload,
  boardMode,
  largeType,
  liveRoom,
  studentSession,
  onTeacherControl,
  onProgress,
}: DrawPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0f172a');
  const [brushSize, setBrushSize] = useState(4);
  const [eraserMode, setEraserMode] = useState(false);
  const [activeLabelStamp, setActiveLabelStamp] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([canvas.toDataURL('image/png')]);
    setCheckedSteps({});
    setSubmittedNotice(null);
  }, [payload.prompt]);

  function getCanvasCoords(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function pushSnapshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory((prev) => [...prev.slice(-14), canvas.toDataURL('image/png')]);
  }

  function stampLabelAt(x: number, y: number, labelText: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    const textWidth = ctx.measureText(labelText).width;
    const padX = 12;
    const boxW = textWidth + padX * 2;
    const boxH = 30;
    const bx = Math.max(8, Math.min(canvas.width - boxW - 8, x - boxW / 2));
    const by = Math.max(8, Math.min(canvas.height - boxH - 8, y - boxH / 2));

    ctx.fillStyle = '#eff6ff';
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e3a8a';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, bx + padX, by + boxH / 2 + 1);

    pushSnapshot();
    setActiveLabelStamp(null);
    soundtrack.playCorrectChime();
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasCoords(e);

    if (activeLabelStamp) {
      stampLabelAt(x, y, activeLabelStamp);
      return;
    }

    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = eraserMode ? '#ffffff' : color;
    ctx.lineWidth = eraserMode ? brushSize * 3.5 : brushSize;
    setIsDrawing(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handlePointerUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    pushSnapshot();
  }

  function handleUndo() {
    if (history.length <= 1) return;
    const nextHistory = history.slice(0, -1);
    const prevUrl = nextHistory[nextHistory.length - 1];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !prevUrl) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = prevUrl;
    setHistory(nextHistory);
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pushSnapshot();
    setSubmittedNotice(null);
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'classroom-sketch.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function handleSubmitDrawing() {
    const canvas = canvasRef.current;
    if (!canvas || !liveRoom) return;
    setSubmitting(true);
    setSubmittedNotice(null);
    try {
      const imageDataUrl = canvas.toDataURL('image/png');
      const res = await fetch(`/api/rooms/${liveRoom.code}/drawing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: studentSession?.name || 'Teacher Board',
          team: studentSession?.team || 'Class',
          imageDataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit drawing.');
      soundtrack.playCorrectChime();
      setSubmittedNotice('Drawing sent to the Teacher Gallery!');
      onProgress?.(1, 1, true, 'Submitted sketch');
    } catch (err) {
      setSubmittedNotice(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const spotlightDrawing = liveRoom?.drawingSubmissions.find(
    (d) => d.id === liveRoom.spotlightDrawingId
  );

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-200 pb-4 space-y-2">
        <p className={`font-semibold text-slate-950 ${boardMode || largeType ? 'text-xl' : 'text-lg'}`}>
          {payload.prompt}
        </p>
        <p className="text-sm text-slate-600">{payload.instructions}</p>
      </div>

      {/* Label Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Tag className="h-3.5 w-3.5" />
            Vocabulary Label Stamps (tap a chip, then click the canvas)
          </span>
          {activeLabelStamp && (
            <span className="text-xs font-semibold text-blue-700">
              Click anywhere on the canvas to place "{activeLabelStamp}"
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {payload.labelChips.map((chip) => {
            const isSelected = activeLabelStamp === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setActiveLabelStamp(isSelected ? null : chip);
                  setEraserMode(false);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors min-h-[36px] ${
                  isSelected
                    ? 'border-blue-600 bg-blue-700 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                + {chip}
              </button>
            );
          })}
        </div>
      </div>

      {/* Drawing Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {PEN_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              aria-label={`Color ${c.name}`}
              onClick={() => {
                setColor(c.value);
                setEraserMode(false);
                setActiveLabelStamp(null);
              }}
              className={`h-8 w-8 rounded-full border-2 transition-transform ${
                !eraserMode && !activeLabelStamp && color === c.value
                  ? 'border-slate-950 scale-110'
                  : 'border-white shadow-sm'
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}

          <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden="true" />

          {[3, 6, 10].map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => {
                setBrushSize(sz);
                setEraserMode(false);
              }}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold min-h-[34px] ${
                !eraserMode && brushSize === sz
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {sz === 3 ? 'Fine' : sz === 6 ? 'Medium' : 'Bold'}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setEraserMode((e) => !e);
              setActiveLabelStamp(null);
            }}
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-semibold min-h-[34px] ${
              eraserMode
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <Eraser className="h-3.5 w-3.5" />
            Eraser
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={history.length <= 1}
            onClick={handleUndo}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[34px]"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[34px]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[34px]"
          >
            <Download className="h-3.5 w-3.5" />
            Save PNG
          </button>
        </div>
      </div>

      {/* Interactive Canvas + Checklist */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-9 overflow-hidden rounded-xl border border-slate-300 bg-white">
          <canvas
            ref={canvasRef}
            width={760}
            height={440}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={`w-full touch-none block ${
              activeLabelStamp ? 'cursor-crosshair' : 'cursor-cell'
            }`}
          />
        </div>

        <div className="xl:col-span-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <Pencil className="h-3.5 w-3.5" />
            Drawing Checklist
          </h4>
          <ul className="space-y-2">
            {payload.checklist.map((item, idx) => (
              <li key={idx}>
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(checkedSteps[idx])}
                    onChange={(e) =>
                      setCheckedSteps((prev) => ({ ...prev, [idx]: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700"
                  />
                  <span className={checkedSteps[idx] ? 'line-through text-slate-400' : ''}>
                    {item}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {liveRoom && (
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <button
                type="button"
                disabled={submitting || liveRoom.paused}
                onClick={handleSubmitDrawing}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 min-h-[42px]"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'Sending…' : 'Submit to Board Gallery'}
              </button>
              {submittedNotice && (
                <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  {submittedNotice}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live Student Gallery (Teacher Board) */}
      {liveRoom && !studentSession && liveRoom.drawingSubmissions.length > 0 && (
        <div className="border-t border-slate-200 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-semibold text-slate-900">
              Class Drawing Gallery ({liveRoom.drawingSubmissions.length})
            </h4>
            {spotlightDrawing && (
              <button
                type="button"
                onClick={() => onTeacherControl?.({ spotlightDrawingId: null })}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Close Spotlight
              </button>
            )}
          </div>

          {spotlightDrawing && (
            <div className="rounded-xl border border-blue-300 bg-blue-50/40 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-900">
                Spotlighting: {spotlightDrawing.author} · Team {spotlightDrawing.team}
              </p>
              <img
                src={spotlightDrawing.imageDataUrl}
                alt={`Drawing by ${spotlightDrawing.author}`}
                className="w-full max-h-[420px] object-contain rounded-lg border border-slate-200 bg-white"
              />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {liveRoom.drawingSubmissions.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => onTeacherControl?.({ spotlightDrawingId: sub.id })}
                className={`overflow-hidden rounded-xl border bg-white text-left transition-all hover:border-blue-500 ${
                  liveRoom.spotlightDrawingId === sub.id
                    ? 'border-blue-600 ring-2 ring-blue-600/20'
                    : 'border-slate-200'
                }`}
              >
                <img
                  src={sub.imageDataUrl}
                  alt={`Sketch by ${sub.author}`}
                  className="h-28 w-full object-cover border-b border-slate-100"
                />
                <div className="px-2.5 py-2 text-xs">
                  <p className="font-semibold text-slate-900 truncate">{sub.author}</p>
                  <p className="text-slate-500">Team {sub.team}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
