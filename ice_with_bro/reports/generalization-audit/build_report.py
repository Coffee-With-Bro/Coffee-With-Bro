"""Build a portable, offline HTML report with inline evidence and image comparisons."""
from pathlib import Path
import base64
import html
import json
import math
import re

HERE = Path(__file__).resolve().parent
DATA = json.loads((HERE / "audit.json").read_text())


def inline(text):
    text = html.escape(text)
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2" target="_blank" rel="noreferrer">\1</a>', text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    return re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)


def markdown(source):
    output, paragraph, list_type = [], [], None
    def flush():
        if paragraph: output.append("<p>" + inline(" ".join(paragraph)) + "</p>"); paragraph.clear()
    def close():
        nonlocal list_type
        if list_type: output.append(f"</{list_type}>"); list_type = None
    for line in source.splitlines():
        if not line.strip(): flush(); close(); continue
        heading = re.match(r"^(#{1,3}) (.*)", line)
        bullet = re.match(r"^(?:- |\d+\. )(.*)", line)
        if heading:
            flush(); close(); level = len(heading[1]); title = heading[2]
            if level == 1: continue
            anchor = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
            output.append(f'<h{level} id="{anchor}">{inline(title)}</h{level}>')
        elif bullet:
            flush(); kind = "ul" if line.startswith("- ") else "ol"
            if list_type != kind: close(); output.append(f"<{kind}>"); list_type = kind
            output.append("<li>" + inline(bullet[1]) + "</li>")
        else: close(); paragraph.append(line)
    flush(); close(); return "\n".join(output)


def chart(kind):
    width, height, left, right, top, bottom = 600, 250, 58, 20, 14, 45
    inner_w, inner_h = width - left - right, height - top - bottom
    x = lambda epoch: left + (epoch - 1) / 15 * inner_w
    if kind == "loss":
        y = lambda value: top + (1 - math.log10(value)) / 6 * inner_h
        ticks = [(10 ** exponent, f"{10 ** exponent:g}") for exponent in range(-5, 2)]
        title, ylabel = "Observed training loss", "Mean cross-entropy (log scale)"
        field = "train_loss"
    else:
        y = lambda value: top + (1 - value) * inner_h
        ticks = [(value / 100, str(value)) for value in (0, 25, 50, 75, 100)]
        title, ylabel = "Observed validation accuracy", "Accuracy (%)"
        field = "validation_accuracy"
    lines = [f'<svg viewBox="0 0 {width} {height}" role="img" aria-label="{title}: epoch on x axis; {ylabel} on y axis">']
    for value, label in ticks:
        lines.append(f'<line class="gridline" x1="{left}" x2="{width-right}" y1="{y(value):.2f}" y2="{y(value):.2f}"/><text x="{left-8}" y="{y(value)+4:.2f}" text-anchor="end">{label}</text>')
    for epoch in (1, 2, 4, 6, 8, 10, 12, 14, 16):
        lines.append(f'<text x="{x(epoch):.2f}" y="{height-22}" text-anchor="middle">{epoch}</text>')
    groups = [("train", "mainline"), ("fine-tune", "fineline")] if kind == "loss" else [(None, "mainline")]
    for phase, css in groups:
        rows = [r for r in DATA["history"] if phase is None or r["phase"] == phase]
        points = " ".join(f'{x(row["epoch"]):.2f},{y(row[field]):.2f}' for row in rows)
        lines.append(f'<polyline class="{css}" points="{points}"/>')
        for row in rows:
            lines.append(f'<circle class="{css}" cx="{x(row["epoch"]):.2f}" cy="{y(row[field]):.2f}" r="2.5"><title>Epoch {row["epoch"]}: {row[field]}</title></circle>')
    lines.append(f'<line data-cursor class="cursor" x1="{x(2)}" x2="{x(2)}" y1="{top}" y2="{height-bottom}"/><text x="{width/2}" y="{height-3}" text-anchor="middle">Epoch</text>')
    lines.append(f'<text transform="translate(13 {top+inner_h/2}) rotate(-90)" text-anchor="middle">{ylabel}</text></svg>')
    return "".join(lines)


def main():
    pairs = []
    for pair in DATA["perceptual_audit"]["examples"]:
        item = dict(pair)
        for side in ("train", "test"):
            path = Path(pair[side]); item[side + "_name"] = path.name
            item[side + "_image"] = "data:image/jpeg;base64," + base64.b64encode(path.read_bytes()).decode()
        pairs.append(item)
    participant_rows = []
    for subject in sorted(DATA["splits"]["train"]["subjects"], key=lambda s: int(s[1:])):
        values = [DATA["splits"][name]["subjects"][subject] for name in ("train", "fine-tune", "validation", "test")]
        participant_rows.append("<tr><th>" + subject + "</th>" + "".join(f"<td>{v:,}</td>" for v in values) + "</tr>")
    controls = "".join(f'<button type="button" data-pair="{i}" aria-pressed="{str(i == 0).lower()}">Class {p["label"]}</button>' for i, p in enumerate(pairs))
    report = markdown((HERE / "REPORT.md").read_text(encoding="utf-8"))
    first = pairs[0]
    page = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ASL generalization audit — evidence and GPU plan</title>
<style>
:root {color-scheme:light dark;--paper:Canvas;--ink:CanvasText;--accent:LinkText;--muted:GrayText;--rule:color-mix(in srgb,CanvasText 20%,Canvas);--soft:color-mix(in srgb,CanvasText 4%,Canvas)}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.65 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:36px 24px 80px}h1{font-size:clamp(26px,4vw,40px);line-height:1.18;margin:12px 0 20px;max-width:900px}h2{font-size:24px;line-height:1.3;margin:44px 0 16px;border-top:1px solid var(--rule);padding-top:24px}h3{font-size:19px;margin:26px 0 12px}p{margin:12px 0}a{color:var(--accent);overflow-wrap:anywhere}code{font: .88em ui-monospace,monospace;overflow-wrap:anywhere}li{margin:8px 0}.eyebrow{letter-spacing:.1em;text-transform:uppercase;font-size:12px;color:var(--muted)}.lead{font-size:20px;max-width:900px}.status{border-left:3px solid var(--accent);padding:10px 16px;margin:24px 0;background:var(--soft)}nav{display:flex;flex-wrap:wrap;gap:18px;margin:22px 0}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;border-block:1px solid var(--rule);padding:20px 0;margin:28px 0}.stats strong{display:block;font-size:28px;font-weight:600}.small,figcaption{font-size:13px;color:var(--muted)}.charts{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:12px 0}svg{display:block;width:100%;height:auto;color:var(--ink);overflow:visible}svg text{fill:currentColor;font-size:11px}.gridline{stroke:var(--rule);stroke-width:1}.mainline{stroke:var(--accent);fill:none;stroke-width:2}.fineline{stroke:var(--ink);fill:none;stroke-width:2;stroke-dasharray:5 3}circle.mainline{fill:var(--accent)}circle.fineline{fill:var(--ink)}.cursor{stroke:var(--muted);stroke-dasharray:2 3}.controls{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin:16px 0}input[type=range]{width:min(460px,100%);accent-color:var(--accent)}button{font:inherit;padding:6px 12px;background:var(--paper);color:var(--ink);border:1px solid var(--rule);cursor:pointer}button[aria-pressed=true]{background:var(--ink);color:var(--paper)}.pair-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.pair-grid img{width:auto;max-width:100%;height:260px;object-fit:contain;display:block;margin:12px auto}.pair-grid code{display:block;text-align:center}.pair-grid figcaption{text-align:center}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;font-size:14px;margin:20px 0}th,td{padding:8px 12px;border-bottom:1px solid var(--rule);text-align:right}th:first-child{text-align:left}table caption{text-align:left;color:var(--muted);font-size:13px;margin-bottom:10px}.breakdown{margin:16px 0}.bar{display:flex;height:22px;background:var(--soft);margin:5px 0}.bar span:first-child{background:var(--accent)}.bar span:last-child{background:var(--rule)}.report{max-width:900px}.note{color:var(--muted)}@media(max-width:650px){main{padding:20px 16px 50px}.charts,.pair-grid{grid-template-columns:1fr}.stats{grid-template-columns:1fr;gap:16px}.pair-grid img{height:210px}th,td{padding:7px 5px;font-size:12px}}@media print{nav,.controls{display:none}body{font-size:10pt}main{padding:0;max-width:none}.report{max-width:none}h2{break-after:avoid}figure,table,.pair-grid{break-inside:avoid}}
</style></head><body><main>
<div class="eyebrow">Project evidence audit · 17 November 2026 · No retraining</div>
<h1>The score is real.<br>The generalization claim is not established.</h1>
<p class="lead">The existing test split shares every participant-prefix/class group with training. Fix the experiment before spending more GPU time on the model.</p>
<div class="status"><strong>Conclusion:</strong> confirmed evaluation dependence; plausible shortcut memorization; classical overfitting and unseen-webcam performance remain unmeasured. Existing model and dataset were not changed.</div>
<nav aria-label="Report sections"><a href="#proof">Split and image proof</a><a href="#learning">Learning history</a><a href="#capacity">Capacity vs compute</a><a href="#6-gpu-and-fixed-memory-plan-reflecting-your-instructions">GPU and memory plan</a><a href="#9-scenario-by-scenario-operational-playbook">Scenario playbook</a><a href="#11-what-should-happen-next-in-exact-order">Next actions</a></nav>
<div class="stats"><div><strong>10 / 10</strong>Participant prefixes shared across every split</div><div><strong>58.31%</strong>Test images within one filename index of same-group training data</div><div><strong>98.78%</strong>Parameter slots concentrated in the flattening dense layer</div></div>
<section id="proof"><h2>Split and visual evidence</h2>
<p>All four splits contain every participant-prefix × class group. The prefixes are inferred identities, pending confirmation against dataset metadata. Exact SHA-256 overlap is zero.</p>
<table><caption>Selected image counts by filename-inferred participant; source: selected manifests, completed run.</caption><thead><tr><th>Prefix</th><th>Train</th><th>Fine-tune</th><th>Validation</th><th>Test</th></tr></thead><tbody>__SUBJECT_ROWS__</tbody></table>
<h3>Similar images cross the boundary despite different file hashes</h3>
<p>965 of 3,600 test images meet the stated weak candidate criterion: dHash Hamming ≤2 and normalized 9×8 grayscale MAE ≤0.02, against a same-class/same-prefix training candidate. This is <strong>not</strong> a certified duplicate count.</p>
<div class="controls" role="group" aria-label="Example image pairs">__PAIR_CONTROLS__</div>
<div class="pair-grid"><figure><figcaption>Main training image</figcaption><img id="train-image" src="__TRAIN_IMAGE__" alt="Training hand image"><code id="train-name">__TRAIN_NAME__</code></figure><figure><figcaption>Test image</figcaption><img id="test-image" src="__TEST_IMAGE__" alt="Test hand image"><code id="test-name">__TEST_NAME__</code></figure></div>
<p id="pair-detail" class="small" aria-live="polite"></p><p class="small">Source: original ASL-HG images selected by the existing manifests. Index gaps are filename proximity, not verified timestamps. Group separation is the primary fix; hashes alone are insufficient.</p></section>
<section id="learning"><h2>Observed learning history</h2><p>The validation set is dependent on familiar acquisition groups. These curves do not establish an independent generalization gap; validation loss and training accuracy were not logged.</p>
<div class="charts"><figure><figcaption>Training cross-entropy; main phase and fine-tuning shown separately.</figcaption>__LOSS_CHART__</figure><figure><figcaption>Validation accuracy, including the epoch-11 instability event.</figcaption>__ACCURACY_CHART__</figure></div>
<div class="controls"><label for="epoch">Inspect epoch</label><input id="epoch" type="range" min="1" max="16" value="2"><output id="epoch-readout" for="epoch" aria-live="polite"></output></div><p class="small">Source: history.csv, 16–17 November 2026. Best saved checkpoint: epoch 2. Fine-tuning epochs 15–16 restart from that checkpoint on different samples; their losses are not directly comparable to the previous main epoch.</p></section>
<section id="capacity"><h2>Two different bottlenecks</h2>
<div class="breakdown"><strong>Parameter slots: dense head 98.78%; all other slots 1.22%</strong><div class="bar" role="img" aria-label="Dense layer uses 98.78 percent of parameter slots"><span style="width:98.78%"></span><span style="width:1.22%"></span></div></div>
<div class="breakdown"><strong>Estimated forward MACs: convolutions 95.16%; other MACs 4.84%</strong><div class="bar" role="img" aria-label="Convolutions use 95.16 percent of estimated multiply accumulates"><span style="width:95.16%"></span><span style="width:4.84%"></span></div></div>
<p>A same-width GAP + 64-dimensional head candidate has approximately 104,740 slots versus 8,492,260 now. That is an approximately 81× parameter reduction, <strong>not</strong> an 81× speedup. The dominant convolution work remains.</p><p class="small">Source: serialized model dimensions. Counts include BN statistics; MACs exclude normalization, activation and pooling. Proposed architecture has not been trained or benchmarked.</p></section>
<article class="report">__REPORT__</article>
<footer class="small"><hr>Read-only audit. No CNN retraining, RAPIDS installation or model replacement performed. This document embeds its evidence images and uses no external scripts, fonts or network calls.</footer>
</main><script>
const pairs=__PAIRS_JSON__,history=__HISTORY_JSON__;
function showPair(index){const p=pairs[index];for(const side of ['train','test']){document.getElementById(side+'-image').src=p[side+'_image'];document.getElementById(side+'-image').alt=side+' sample, class '+p.label;document.getElementById(side+'-name').textContent=p[side+'_name'];}document.getElementById('pair-detail').textContent='Class '+p.label+' · '+p.subject+' · filename index gap '+p.index_gap+' · dHash Hamming '+p.hamming+' · thumbnail MAE '+p.gray_mae.toFixed(5);document.querySelectorAll('[data-pair]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.pair)===index)));}
document.querySelectorAll('[data-pair]').forEach(button=>button.addEventListener('click',()=>showPair(Number(button.dataset.pair))));
function showEpoch(){const r=history[Number(document.getElementById('epoch').value)-1];document.getElementById('epoch-readout').textContent='Epoch '+r.epoch+' · '+r.phase+' · loss '+r.train_loss.toFixed(6)+' · validation '+(100*r.validation_accuracy).toFixed(4)+'%';const x=58+(r.epoch-1)/15*522;document.querySelectorAll('[data-cursor]').forEach(line=>{line.setAttribute('x1',String(x));line.setAttribute('x2',String(x));});}
document.getElementById('epoch').addEventListener('input',showEpoch);showPair(0);showEpoch();
</script></body></html>'''
    replacements = {"__SUBJECT_ROWS__": "".join(participant_rows), "__PAIR_CONTROLS__": controls,
                    "__LOSS_CHART__": chart("loss"), "__ACCURACY_CHART__": chart("accuracy"), "__REPORT__": report,
                    "__PAIRS_JSON__": json.dumps(pairs), "__HISTORY_JSON__": json.dumps(DATA["history"]),
                    "__TRAIN_IMAGE__": first["train_image"], "__TEST_IMAGE__": first["test_image"],
                    "__TRAIN_NAME__": first["train_name"], "__TEST_NAME__": first["test_name"]}
    for key, value in replacements.items(): page = page.replace(key, value)
    (HERE / "report.html").write_text(page, encoding="utf-8")
    print("Built", HERE / "report.html", "bytes=", len(page.encode()))


if __name__ == "__main__": main()
