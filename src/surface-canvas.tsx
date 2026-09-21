import { useCallback, useEffect, useRef } from "react";

type SurfaceCanvasProps = {
  fn: ((x: number, y: number) => number) | null;
  range: number;
  x0: number;
  y0: number;
  z0: number;
  fx: number;
  fy: number;
  showPartials: boolean;
  showNormal: boolean;
  resetKey: number;
};

type Point3 = { x: number; y: number; z: number; depth?: number };

export default function SurfaceCanvas({ fn, range, x0, y0, z0, fx, fy, showPartials, showNormal, resetKey }: SurfaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useRef({ yaw: -0.68, pitch: 0.62, zoom: 1 });
  const drag = useRef({ active: false, x: 0, y: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fn) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const count = width < 620 ? 22 : 30;
    const raw: Point3[][] = [];
    const zs: number[] = [];
    for (let j = 0; j <= count; j++) {
      const row: Point3[] = [];
      const y = -range + (2 * range * j) / count;
      for (let i = 0; i <= count; i++) {
        const x = -range + (2 * range * i) / count;
        let z = fn(x, y);
        if (!Number.isFinite(z)) z = NaN;
        if (Number.isFinite(z)) zs.push(z);
        row.push({ x, y, z });
      }
      raw.push(row);
    }
    if (!zs.length) return;
    const sorted = [...zs].sort((a, b) => a - b);
    const low = sorted[Math.floor(sorted.length * 0.03)] ?? -1;
    const high = sorted[Math.floor(sorted.length * 0.97)] ?? 1;
    const zMid = (low + high) / 2;
    const zSpan = Math.max(high - low, 0.5);
    const cam = camera.current;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const unit = Math.min(width / 7.2, height / 6.1) * cam.zoom;
    const centerX = width * 0.52;
    const centerY = height * 0.51;

    const project = (p: Point3) => {
      const wx = (p.x / range) * 2.6;
      const wy = (p.y / range) * 2.6;
      const clampedZ = Math.max(low - zSpan * 0.2, Math.min(high + zSpan * 0.2, p.z));
      const wz = ((clampedZ - zMid) / zSpan) * 3.25;
      const rx = wx * cy - wy * sy;
      const ry = wx * sy + wy * cy;
      const screenY = ry * sp - wz * cp;
      const depth = ry * cp + wz * sp;
      return { x: centerX + rx * unit, y: centerY + screenY * unit, z: p.z, depth };
    };

    const projected = raw.map((row) => row.map(project));
    const cells: { points: Point3[]; depth: number; value: number }[] = [];
    for (let j = 0; j < count; j++) {
      for (let i = 0; i < count; i++) {
        const source = [raw[j][i], raw[j][i + 1], raw[j + 1][i + 1], raw[j + 1][i]];
        if (source.some((p) => !Number.isFinite(p.z))) continue;
        const points = [projected[j][i], projected[j][i + 1], projected[j + 1][i + 1], projected[j + 1][i]];
        cells.push({
          points,
          depth: points.reduce((s, p) => s + (p.depth || 0), 0) / 4,
          value: source.reduce((s, p) => s + p.z, 0) / 4,
        });
      }
    }
    cells.sort((a, b) => a.depth - b.depth);
    for (const cell of cells) {
      const t = Math.max(0, Math.min(1, (cell.value - low) / zSpan));
      const hue = 174 - t * 86;
      ctx.beginPath();
      ctx.moveTo(cell.points[0].x, cell.points[0].y);
      for (let k = 1; k < cell.points.length; k++) ctx.lineTo(cell.points[k].x, cell.points[k].y);
      ctx.closePath();
      ctx.fillStyle = `hsla(${hue}, 73%, ${39 + t * 13}%, .38)`;
      ctx.fill();
      ctx.strokeStyle = `hsla(${hue}, 66%, 72%, .16)`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    const planeRadius = range * 0.72;
    const planeRaw = [
      { x: x0 - planeRadius, y: y0 - planeRadius, z: z0 - fx * planeRadius - fy * planeRadius },
      { x: x0 + planeRadius, y: y0 - planeRadius, z: z0 + fx * planeRadius - fy * planeRadius },
      { x: x0 + planeRadius, y: y0 + planeRadius, z: z0 + fx * planeRadius + fy * planeRadius },
      { x: x0 - planeRadius, y: y0 + planeRadius, z: z0 - fx * planeRadius + fy * planeRadius },
    ];
    const plane = planeRaw.map(project);
    ctx.beginPath();
    ctx.moveTo(plane[0].x, plane[0].y);
    plane.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = "rgba(185, 245, 94, .17)";
    ctx.fill();
    ctx.strokeStyle = "rgba(207, 255, 132, .9)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(207, 255, 132, .35)";
    const a = project({ x: x0 - planeRadius, y: y0, z: z0 - fx * planeRadius });
    const b = project({ x: x0 + planeRadius, y: y0, z: z0 + fx * planeRadius });
    const c = project({ x: x0, y: y0 - planeRadius, z: z0 - fy * planeRadius });
    const d = project({ x: x0, y: y0 + planeRadius, z: z0 + fy * planeRadius });
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    ctx.restore();

    const drawArrow = (from: Point3, to: Point3, color: string, label: string, dashed = false) => {
      const p1 = project(from), p2 = project(to);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      ctx.save();
      if (dashed) ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x - 10 * Math.cos(angle - Math.PI / 6), p2.y - 10 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(p2.x - 10 * Math.cos(angle + Math.PI / 6), p2.y - 10 * Math.sin(angle + Math.PI / 6));
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
      ctx.font = "600 12px ui-monospace, monospace";
      ctx.fillText(label, p2.x + 8 * Math.cos(angle), p2.y + 8 * Math.sin(angle) - 7);
      ctx.restore();
    };

    if (showPartials) {
      const xSpan = Math.min(range * 0.55, (zSpan * 0.48) / Math.max(Math.abs(fx), 0.001));
      const ySpan = Math.min(range * 0.55, (zSpan * 0.48) / Math.max(Math.abs(fy), 0.001));
      const txStart = { x: x0 - xSpan, y: y0, z: z0 - fx * xSpan };
      const txEnd = { x: x0 + xSpan, y: y0, z: z0 + fx * xSpan };
      const tyStart = { x: x0, y: y0 - ySpan, z: z0 - fy * ySpan };
      const tyEnd = { x: x0, y: y0 + ySpan, z: z0 + fy * ySpan };
      drawArrow(txStart, txEnd, "#65a7ff", "tₓ");
      drawArrow(tyStart, tyEnd, "#ffaf5f", "tᵧ");
    }

    if (showNormal) {
      const xyLimit = range * 0.68 / Math.max(Math.abs(fx), Math.abs(fy), 0.001);
      const normalScale = Math.min(xyLimit, zSpan * 0.58);
      drawArrow(
        { x: x0, y: y0, z: z0 },
        { x: x0 - fx * normalScale, y: y0 - fy * normalScale, z: z0 + normalScale },
        "#e88cff",
        "n",
      );
    }

    const axis = (from: Point3, to: Point3, color: string, label: string) => {
      const p1 = project(from), p2 = project(to);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = color; ctx.font = "600 12px ui-monospace, monospace"; ctx.fillText(label, p2.x + 6, p2.y - 4);
    };
    axis({ x: -range, y: 0, z: 0 }, { x: range, y: 0, z: 0 }, "rgba(244,248,246,.48)", "x");
    axis({ x: 0, y: -range, z: 0 }, { x: 0, y: range, z: 0 }, "rgba(244,248,246,.48)", "y");
    axis({ x: 0, y: 0, z: low }, { x: 0, y: 0, z: high }, "rgba(244,248,246,.48)", "z");

    const point = project({ x: x0, y: y0, z: z0 });
    const halo = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 18);
    halo.addColorStop(0, "rgba(255,255,255,.65)"); halo.addColorStop(1, "rgba(185,245,94,0)");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(point.x, point.y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f8fff0"; ctx.strokeStyle = "#b9f55e"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(point.x, point.y, 5.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(243,247,245,.82)"; ctx.font = "600 12px ui-monospace, monospace";
    ctx.fillText("P", point.x + 10, point.y - 10);
  }, [fn, range, x0, y0, z0, fx, fy, showPartials, showNormal]);

  useEffect(() => {
    camera.current = { yaw: -0.68, pitch: 0.62, zoom: 1 };
    draw();
  }, [resetKey, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full min-h-[430px] w-full cursor-grab touch-none active:cursor-grabbing"
      aria-label="Interactive 3D plot of the selected surface, tangent plane, partial derivative directions, and normal vector. Drag to rotate and scroll to zoom."
      role="img"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { active: true, x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => {
        if (!drag.current.active) return;
        const dx = event.clientX - drag.current.x;
        const dy = event.clientY - drag.current.y;
        drag.current = { active: true, x: event.clientX, y: event.clientY };
        camera.current.yaw += dx * 0.008;
        camera.current.pitch = Math.max(0.08, Math.min(1.38, camera.current.pitch + dy * 0.006));
        draw();
      }}
      onPointerUp={() => { drag.current.active = false; }}
      onPointerCancel={() => { drag.current.active = false; }}
      onWheel={(event) => {
        event.preventDefault();
        camera.current.zoom = Math.max(0.62, Math.min(1.7, camera.current.zoom * (event.deltaY > 0 ? 0.92 : 1.08)));
        draw();
      }}
    />
  );
}
