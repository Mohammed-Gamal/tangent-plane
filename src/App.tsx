import { useMemo, useState } from "react";
import { Box, Info, LocateFixed, RefreshCw, Sparkles } from "lucide-react";
import { Switch } from "./components/ui/switch";
import SurfaceCanvas from "./surface-canvas";

type Preset = { name: string; formula: string; range: number; point: [number, number]; note: string };

const presets: Preset[] = [
  { name: "Paraboloid", formula: "x^2 + y^2", range: 2.5, point: [0.8, -0.6], note: "A bowl with an upward-opening tangent plane." },
  { name: "Saddle", formula: "x^2 - y^2", range: 2.5, point: [0.8, 0.7], note: "Curves upward in x and downward in y." },
  { name: "Wave", formula: "sin(x) * cos(y)", range: 3.2, point: [1, 0.7], note: "A periodic surface whose slope changes continuously." },
  { name: "Gaussian", formula: "exp(-(x^2 + y^2))", range: 2.4, point: [0.7, 0.5], note: "A smooth bell surface that flattens away from the center." },
  { name: "Ripple", formula: "sin(x^2 + y^2) / 2", range: 2.8, point: [1.1, 0.5], note: "Concentric oscillations with direction-dependent slope." },
];

const functionNames = new Set(["sin", "cos", "tan", "asin", "acos", "atan", "sqrt", "abs", "exp", "log", "min", "max", "pow", "floor", "ceil", "round"]);

function compileExpression(expression: string): { fn: ((x: number, y: number) => number) | null; error: string | null } {
  const source = expression.trim();
  if (!source) return { fn: null, error: "Enter a function of x and y." };
  if (!/^[0-9a-zA-Z_+\-*/^().,\s]+$/.test(source)) return { fn: null, error: "Use numbers, x, y, operators, and supported functions only." };
  const identifiers = source.match(/[a-zA-Z_]+/g) || [];
  if (identifiers.some((id) => !["x", "y", "pi", "e", ...functionNames].includes(id.toLowerCase()))) {
    return { fn: null, error: "Unknown term. Try sin, cos, exp, sqrt, abs, or log." };
  }
  let safe = source.replace(/\^/g, "**");
  safe = safe.replace(/[a-zA-Z_]+/g, (token) => {
    const lower = token.toLowerCase();
    if (lower === "x" || lower === "y") return lower;
    if (lower === "pi") return "Math.PI";
    if (lower === "e") return "Math.E";
    return functionNames.has(lower) ? `Math.${lower}` : token;
  });
  try {
    const evaluator = new Function("x", "y", `"use strict"; return (${safe});`) as (x: number, y: number) => number;
    const test = evaluator(0.37, -0.21);
    if (typeof test !== "number") throw new Error("Not numeric");
    return { fn: evaluator, error: null };
  } catch {
    return { fn: null, error: "That expression could not be evaluated. Check the parentheses and operators." };
  }
}

function clean(value: number) {
  if (!Number.isFinite(value)) return "undefined";
  const rounded = Math.abs(value) < 0.00005 ? 0 : value;
  return Number(rounded.toFixed(4)).toString();
}

export default function Home() {
  const [formula, setFormula] = useState(presets[0].formula);
  const [draft, setDraft] = useState(presets[0].formula);
  const [range, setRange] = useState(presets[0].range);
  const [x0, setX0] = useState(presets[0].point[0]);
  const [y0, setY0] = useState(presets[0].point[1]);
  const [activePreset, setActivePreset] = useState(presets[0].name);
  const [showPartials, setShowPartials] = useState(true);
  const [showNormal, setShowNormal] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const compiled = useMemo(() => compileExpression(formula), [formula]);
  const draftResult = useMemo(() => compileExpression(draft), [draft]);

  const values = useMemo(() => {
    if (!compiled.fn) return { z0: NaN, fx: NaN, fy: NaN };
    const h = Math.max(1e-5, range * 0.00005);
    const z0 = compiled.fn(x0, y0);
    const fx = (compiled.fn(x0 + h, y0) - compiled.fn(x0 - h, y0)) / (2 * h);
    const fy = (compiled.fn(x0, y0 + h) - compiled.fn(x0, y0 - h)) / (2 * h);
    return { z0, fx, fy };
  }, [compiled.fn, x0, y0, range]);

  const validPoint = [values.z0, values.fx, values.fy].every(Number.isFinite);
  const equation = validPoint
    ? `z = ${clean(values.z0)} ${values.fx < 0 ? "−" : "+"} ${clean(Math.abs(values.fx))}(x ${x0 < 0 ? "+" : "−"} ${clean(Math.abs(x0))}) ${values.fy < 0 ? "−" : "+"} ${clean(Math.abs(values.fy))}(y ${y0 < 0 ? "+" : "−"} ${clean(Math.abs(y0))})`
    : "The tangent plane is undefined at this point.";

  const applyPreset = (preset: Preset) => {
    setFormula(preset.formula); setDraft(preset.formula); setRange(preset.range);
    setX0(preset.point[0]); setY0(preset.point[1]); setActivePreset(preset.name); setResetKey((key) => key + 1);
  };

  return (
    <main className="min-h-screen px-4 py-4 text-foreground sm:px-6 lg:px-8">
      <header className="mx-auto mb-4 flex max-w-[1600px] items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_30px_rgb(185_245_94/12%)]"><Box size={21} strokeWidth={1.8} /></div>
          <div><h1 className="text-lg font-semibold tracking-tight sm:text-xl">Tangent Plane Lab</h1><p className="text-sm text-muted-foreground">Surface → point → local linear approximation</p></div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-border bg-card/55 px-3 py-1.5 text-sm text-muted-foreground sm:flex"><span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />Live computation</div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 xl:grid-cols-[310px_minmax(500px,1fr)_320px]">
        <aside className="order-2 rounded-[1.25rem] border border-border/80 bg-card/72 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl xl:order-1">
          <section>
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">1 · Choose a surface</h2><Sparkles size={16} className="text-primary" /></div>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset, index) => (
                <button key={preset.name} type="button" onClick={() => applyPreset(preset)} className={`rounded-xl border px-3 py-2.5 text-left transition ${activePreset === preset.name ? "border-primary/55 bg-primary/12 text-primary" : "border-border/70 bg-background/25 text-foreground hover:border-muted-foreground/50 hover:bg-accent/45"}`}>
                  <span className="mr-2 font-mono text-xs opacity-55">0{index + 1}</span><span className="text-sm font-medium">{preset.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6 border-t border-border/70 pt-5">
            <label htmlFor="function" className="mb-2 block text-sm font-medium text-foreground">Custom function <span className="font-normal text-muted-foreground">z = f(x,y)</span></label>
            <div className="rounded-xl border border-input bg-background/45 p-2 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10">
              <input id="function" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && draftResult.fn) { setFormula(draft); setActivePreset(""); } }} spellCheck={false} className="w-full bg-transparent px-2 py-1.5 font-mono text-[15px] text-foreground outline-none" aria-describedby="function-help" />
              <button type="button" disabled={!draftResult.fn} onClick={() => { setFormula(draft); setActivePreset(""); }} className="mt-1 w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35">Plot function</button>
            </div>
            <p id="function-help" className={`mt-2 min-h-10 text-xs leading-5 ${draftResult.error ? "text-[#ff9494]" : "text-muted-foreground"}`}>{draftResult.error || "Supports sin, cos, exp, sqrt, abs, log, pi, and powers with ^."}</p>
          </section>

          <section className="mt-5 border-t border-border/70 pt-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">2 · Place the point</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-muted-foreground">x₀<input type="number" step="0.1" value={x0} onChange={(event) => setX0(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-input bg-background/45 px-3 py-2.5 font-mono text-base text-foreground outline-none focus:border-primary/60" /></label>
              <label className="text-sm text-muted-foreground">y₀<input type="number" step="0.1" value={y0} onChange={(event) => setY0(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-input bg-background/45 px-3 py-2.5 font-mono text-base text-foreground outline-none focus:border-primary/60" /></label>
            </div>
            <label className="mt-3 block text-sm text-muted-foreground">Visible domain ±<input type="number" min="0.5" max="10" step="0.25" value={range} onChange={(event) => setRange(Math.max(0.5, Math.min(10, Number(event.target.value) || 0.5)))} className="mt-1.5 w-full rounded-xl border border-input bg-background/45 px-3 py-2.5 font-mono text-base text-foreground outline-none focus:border-primary/60" /></label>
          </section>

          <section className="mt-5 border-t border-border/70 pt-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">3 · Display vectors</h2>
            <div className="grid gap-2">
              <label htmlFor="partial-directions" className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/30 px-3.5 py-3">
                <span><span className="block text-sm font-medium text-foreground">Partial directions</span><span className="mt-0.5 block text-xs text-muted-foreground">tₓ and tᵧ intersecting at P</span></span>
                <Switch id="partial-directions" checked={showPartials} onCheckedChange={setShowPartials} aria-label="Show partial derivative tangent directions" />
              </label>
              <label htmlFor="normal-vector" className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/30 px-3.5 py-3">
                <span><span className="block text-sm font-medium text-foreground">Normal vector</span><span className="mt-0.5 block text-xs text-muted-foreground">Perpendicular to the plane</span></span>
                <Switch id="normal-vector" checked={showNormal} onCheckedChange={setShowNormal} aria-label="Show normal vector" />
              </label>
            </div>
          </section>
        </aside>

        <section className="order-1 overflow-hidden rounded-[1.35rem] border border-border/80 bg-[#091512]/85 shadow-[0_24px_80px_rgb(0_0_0/32%)] xl:order-2">
          <div className="flex min-h-[560px] flex-col sm:min-h-[650px]">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"><LocateFixed size={16} className="shrink-0 text-primary" /><span className="truncate font-mono">z = {formula}</span></div>
              <button type="button" onClick={() => setResetKey((key) => key + 1)} className="ml-3 inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card/65 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground" aria-label="Reset 3D view"><RefreshCw size={14} /><span className="hidden sm:inline">Reset view</span></button>
            </div>
            <div className="relative min-h-0 flex-1">
              {validPoint && compiled.fn ? <SurfaceCanvas fn={compiled.fn} range={range} x0={x0} y0={y0} z0={values.z0} fx={values.fx} fy={values.fy} showPartials={showPartials} showNormal={showNormal} resetKey={resetKey} /> : <div className="grid h-full min-h-[430px] place-items-center p-8 text-center text-muted-foreground">Choose a valid function and a point where it is defined.</div>}
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-center text-xs text-white/65 backdrop-blur-md">Drag to orbit · Scroll to zoom</div>
              <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2 text-xs"><span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-white/70 backdrop-blur-md"><i className="h-2 w-2 rounded-full bg-[#43dbc1]" />Surface</span><span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-white/70 backdrop-blur-md"><i className="h-2 w-2 rounded-full bg-primary" />Tangent plane</span>{showPartials && <><span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-white/70 backdrop-blur-md"><i className="h-2 w-2 rounded-full bg-[#65a7ff]" />x-partial direction</span><span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-white/70 backdrop-blur-md"><i className="h-2 w-2 rounded-full bg-[#ffaf5f]" />y-partial direction</span></>}{showNormal && <span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-white/70 backdrop-blur-md"><i className="h-2 w-2 rounded-full bg-[#e88cff]" />Normal vector</span>}</div>
            </div>
          </div>
        </section>

        <aside className="order-3 grid content-start gap-4 md:grid-cols-2 xl:grid-cols-1">
          <section className="rounded-[1.25rem] border border-primary/25 bg-[linear-gradient(145deg,rgb(185_245_94/10%),rgb(13_27_24/78%)_55%)] p-5 shadow-xl shadow-black/10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Tangent plane</p><p className="mt-3 break-words font-mono text-[15px] leading-7 text-[#efffde]">{equation}</p>
          </section>
          <section className="rounded-[1.25rem] border border-border/80 bg-card/72 p-5 backdrop-blur-xl">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">At point P</h2>
            <dl className="mt-4 grid gap-3">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-background/35 px-3.5 py-3"><dt className="text-sm text-muted-foreground">Coordinates</dt><dd className="text-right font-mono text-sm">({clean(x0)}, {clean(y0)}, {clean(values.z0)})</dd></div>
              <div className="flex items-center justify-between rounded-xl bg-background/35 px-3.5 py-3"><dt className="text-sm text-muted-foreground">∂f/∂x</dt><dd className="font-mono text-sm text-[#77e7d3]">{clean(values.fx)}</dd></div>
              <div className="flex items-center justify-between rounded-xl bg-background/35 px-3.5 py-3"><dt className="text-sm text-muted-foreground">∂f/∂y</dt><dd className="font-mono text-sm text-[#77e7d3]">{clean(values.fy)}</dd></div>
              <div className="flex items-center justify-between rounded-xl bg-background/35 px-3.5 py-3"><dt className="text-sm text-muted-foreground">Gradient ∇f</dt><dd className="font-mono text-sm">⟨{clean(values.fx)}, {clean(values.fy)}⟩</dd></div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-background/35 px-3.5 py-3"><dt className="text-sm text-muted-foreground">Normal n</dt><dd className="text-right font-mono text-sm text-[#f0afff]">⟨{clean(-values.fx)}, {clean(-values.fy)}, 1⟩</dd></div>
            </dl>
          </section>
          <section className="rounded-[1.25rem] border border-border/80 bg-card/72 p-5 backdrop-blur-xl md:col-span-2 xl:col-span-1">
            <div className="flex items-start gap-3"><div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f6b455]/12 text-[#f6b455]"><Info size={17} /></div><div><h2 className="font-semibold">What you’re seeing</h2><p className="mt-1.5 text-sm leading-6 text-muted-foreground">The plane matches the surface’s value and its two directional slopes at P. Near that point, the plane is the best linear approximation of the surface.</p></div></div>
            <div className="mt-4 space-y-2 rounded-xl border border-border/60 bg-background/30 p-3 font-mono text-xs leading-6 text-muted-foreground"><p>L(x,y) = f(x₀,y₀) + fₓ(x₀,y₀)(x−x₀) + fᵧ(x₀,y₀)(y−y₀)</p><p>tₓ = ⟨1, 0, fₓ⟩ · tᵧ = ⟨0, 1, fᵧ⟩</p><p>n = tₓ × tᵧ = ⟨−fₓ, −fᵧ, 1⟩</p></div>
          </section>
          <p className="px-1 text-xs leading-5 text-muted-foreground md:col-span-2 xl:col-span-1">{presets.find((preset) => preset.name === activePreset)?.note || "Custom surface: change the point to see how the local approximation evolves."}</p>
        </aside>
      </div>
    </main>
  );
}
