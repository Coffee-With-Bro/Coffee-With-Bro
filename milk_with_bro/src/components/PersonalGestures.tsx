import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, FALLBACK_API_URL } from "../lib/signTranslator";
import type { LandmarkSample } from "../lib/handTracking";

interface Gesture { label: string; examples: number; ready: boolean }
interface Match { predictionId: string | null; label: string; similarity: number; recognized: boolean; message: string }
interface Props { cameraOn: boolean; getSample: () => LandmarkSample; onCommit: (text: string) => void }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`${API_URL}/gestures${path}`, init); }
  catch { response = await fetch(`${FALLBACK_API_URL}/gestures${path}`, init); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}
const post = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export function PersonalGestures({ cameraOn, getSample, onCommit }: Props) {
  const [gestures, setGestures] = useState<Gesture[]>([]);
  const [label, setLabel] = useState("");
  const [correction, setCorrection] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [message, setMessage] = useState("Record each symbol three to five times. Hold a static shape or perform a short movement.");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const operationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const abortRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    try { const list = await request<Gesture[]>(""); if (mountedRef.current) { setGestures(list); setError(null); } }
    catch (err) { if (mountedRef.current) setError(err instanceof Error ? err.message : "Cannot load gesture library"); }
  }, []);
  useEffect(() => {
    mountedRef.current = true;
    void request<Gesture[]>("").then(list => {
      if (mountedRef.current) { setGestures(list); setError(null); }
    }).catch(err => {
      if (mountedRef.current) setError(err instanceof Error ? err.message : "Cannot load gesture library");
    });
    return () => {
      mountedRef.current = false; operationRef.current += 1;
      abortRef.current?.();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh]);
  useEffect(() => {
    if (!cameraOn) { operationRef.current += 1; abortRef.current?.(); }
  }, [cameraOn]);

  const capture = (): Promise<number[][]> => new Promise((resolve, reject) => {
    const frames: number[][] = [];
    const operation = ++operationRef.current, started = performance.now();
    let previous = 0;
    abortRef.current = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null; reject(new Error("Recording cancelled"));
    };
    timerRef.current = setInterval(() => {
      if (operation !== operationRef.current) { abortRef.current?.(); return; }
      const elapsed = performance.now() - started;
      if (elapsed < 1000) { setMessage("Get ready… recording starts in one second"); return; }
      setMessage(`Recording… ${Math.max(0, Math.ceil((4000 - elapsed) / 1000))}s. Keep your hands in view.`);
      const sample = getSample();
      if (sample.features && sample.timestamp > previous && sample.timestamp >= started + 1000) {
        frames.push([...sample.features]); previous = sample.timestamp;
      }
      if (elapsed >= 4000) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null; abortRef.current = null;
        if (frames.length < 6) reject(new Error("Not enough tracked frames. Improve lighting and keep your hands visible."));
        else resolve(frames.slice(0, 60));
      }
    }, 100);
  });

  const record = async (purpose: "teach" | "recognize") => {
    if (!cameraOn || busy) return;
    if (purpose === "teach" && !label.trim()) { setError("Enter a symbol name first"); return; }
    setBusy(true); setError(null); setMatch(null); setCorrection("");
    try {
      const frames = await capture();
      if (!mountedRef.current) return;
      setMessage("Comparing local hand landmarks…");
      if (purpose === "teach") {
        const list = await request<Gesture[]>("/examples", post({ label: label.trim(), frames }));
        if (!mountedRef.current) return;
        setGestures(list);
        const gesture = list.find(g => g.label === label.trim());
        setMessage(`${label.trim()}: ${gesture?.examples ?? 1} examples saved. ${gesture?.ready ? "Ready to recognize. Add more examples for variation." : "Record again until you have at least three."}`);
      } else {
        const prediction = await request<Match>("/recognize", post({ frames }));
        if (!mountedRef.current) return;
        setMatch(prediction); setMessage(prediction.message);
      }
    } catch (err) { if (mountedRef.current) setError(err instanceof Error ? err.message : "Recording failed"); }
    finally { if (mountedRef.current) setBusy(false); }
  };

  const feedback = async (correct: boolean) => {
    if (!match?.predictionId || busy) return;
    setBusy(true); setError(null);
    try {
      const list = await request<Gesture[]>("/feedback", post({ predictionId: match.predictionId, correct, correction: correct ? null : correction || null }));
      if (!mountedRef.current) return;
      setGestures(list);
      if (correct) onCommit(match.label);
      else if (correction) onCommit(correction);
      setMatch(null);
      setMessage(correct ? "Confirmed and added to your transcript. This example strengthens your library." : "Feedback saved for the next match.");
    } catch (err) { if (mountedRef.current) setError(err instanceof Error ? err.message : "Could not save feedback"); }
    finally { if (mountedRef.current) setBusy(false); }
  };
  const remove = async (name: string) => {
    setBusy(true); setError(null);
    try { await request(`?label=${encodeURIComponent(name)}`, { method: "DELETE" }); setMatch(null); await refresh(); }
    catch (err) { if (mountedRef.current) setError(err instanceof Error ? err.message : "Could not delete symbol"); }
    finally { if (mountedRef.current) setBusy(false); }
  };

  return <section className="personal-gestures" aria-labelledby="personal-title">
    <div className="personal-heading"><div><p className="eyebrow">Your personal vocabulary</p><h2 id="personal-title">Teach it a symbol.</h2></div><span>Saved on this computer · No retraining</span></div>
    <p>Name a symbol, then repeat the same shape or movement three to five times. Keep your hands visible and use similar framing and speed.</p>
    <div className="personal-actions">
      <label>Symbol name<input maxLength={40} value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Water" disabled={busy} /></label>
      <button className="btn btn-start" disabled={!cameraOn || busy || !label.trim()} onClick={() => void record("teach")}>Record example (3s)</button>
      <button className="btn btn-ghost" disabled={!cameraOn || busy || !gestures.some(g => g.ready)} onClick={() => void record("recognize")}>Recognize my gesture (3s)</button>
    </div>
    {!cameraOn && <p>Turn on the camera above to record or recognize a symbol.</p>}
    <p role="status" aria-live="polite">{busy ? "● " : ""}{message}</p>
    {error && <p className="error" role="alert">{error}</p>}
    {match && <div className="personal-match">
      <strong>{match.recognized ? match.label : "No confident match"}</strong>
      <span>Similarity {Math.round(match.similarity * 100)}% (template similarity, not a probability)</span>
      {match.predictionId && <div className="personal-actions">
        {match.recognized && <button className="btn btn-start" disabled={busy} onClick={() => void feedback(true)}>Correct — add to transcript</button>}
        <label>Correct symbol<select value={correction} onChange={e => setCorrection(e.target.value)} disabled={busy}>
          <option value="">None / reject match</option>{gestures.map(g => <option key={g.label} value={g.label}>{g.label}</option>)}
        </select></label>
        <button className="btn btn-ghost" disabled={busy} onClick={() => void feedback(false)}>{correction ? "Correct and teach" : "Reject"}</button>
      </div>}
    </div>}
    <ul className="personal-library" aria-label="Saved personal symbols">
      {gestures.map(g => <li key={g.label}><button className="btn btn-ghost" disabled={busy} onClick={() => setLabel(g.label)}>{g.label} · {g.examples} examples · {g.ready ? "Ready" : `${3 - g.examples} more needed`}</button><button className="btn btn-ghost btn-sm" disabled={busy} aria-label={`Delete ${g.label}`} onClick={() => void remove(g.label)}>Delete</button></li>)}
    </ul>
    <p className="personal-note">Only hand landmarks are saved. Examples and feedback persist across restarts. Matching uses your examples; it does not translate arbitrary sign language sentences.</p>
  </section>;
}
