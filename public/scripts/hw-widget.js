const AMINO_ACIDS = [
    { code: 'A', name: 'Alanine', hydropathy: 1.8 },
    { code: 'R', name: 'Arginine', hydropathy: -4.5 },
    { code: 'N', name: 'Asparagine', hydropathy: -3.5 },
    { code: 'D', name: 'Aspartate', hydropathy: -3.5 },
    { code: 'C', name: 'Cysteine', hydropathy: 2.5 },
    { code: 'Q', name: 'Glutamine', hydropathy: -3.5 },
    { code: 'E', name: 'Glutamate', hydropathy: -3.5 },
    { code: 'G', name: 'Glycine', hydropathy: -0.4 },
    { code: 'H', name: 'Histidine', hydropathy: -3.2 },
    { code: 'I', name: 'Isoleucine', hydropathy: 4.5 },
    { code: 'L', name: 'Leucine', hydropathy: 3.8 },
    { code: 'K', name: 'Lysine', hydropathy: -3.9 },
    { code: 'M', name: 'Methionine', hydropathy: 1.9 },
    { code: 'F', name: 'Phenylalanine', hydropathy: 2.8 },
    { code: 'P', name: 'Proline', hydropathy: -1.6 },
    { code: 'S', name: 'Serine', hydropathy: -0.8 },
    { code: 'T', name: 'Threonine', hydropathy: -0.7 },
    { code: 'W', name: 'Tryptophan', hydropathy: -0.9 },
    { code: 'Y', name: 'Tyrosine', hydropathy: -1.3 },
    { code: 'V', name: 'Valine', hydropathy: 4.2 }
];

class ProteinSim {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.w = canvas.width; this.h = canvas.height;
        this.params = {
            bondK: 0.75,
            rest: 16,
            angleK: 0.12,
            repulse: 900,
            pairEps: {
                // Strong HH attraction, strong HP repulsion in water; invert tendencies in membrane
                water: { HH: 2.2, PP: 0.3, HP: -1.2 },
                membrane: { HH: 0.8, PP: 1.8, HP: -0.6 },
                intermediate: { HH: 1.4, PP: 1.0, HP: -0.9 }
            },
            temp: 0.55,
            speed: 1.0,
            radialK: 0.12,
            hbK: 0.22,
            hbDist: 34
        };
        this.sequence = this.makeSequence(30);
        this.reset();
        this.last = performance.now();
        this.paused = false;
        this.energy = 0;
        this.bindUI();
        this.cool = 1.0; // simulated annealing factor (decays toward 0.3)
        this.initInteraction();
        this.energyHistory = [];
        const chart = document.getElementById('energyChart');
        this.energyCtx = chart ? chart.getContext('2d') : null;
        this.energyMin = Infinity;
        this.energyMax = -Infinity;
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    makeSequence(n) {
        const arr = [];
        for (let i = 0; i < n; i++) {
            const aa = AMINO_ACIDS[Math.floor(Math.random() * AMINO_ACIDS.length)];
            arr.push({ code: aa.code, name: aa.name, hydropathy: aa.hydropathy, type: aa.hydropathy > 0 ? 'H' : 'P' });
        }
        return arr;
    }

    reset() {
        const n = this.sequence.length;
        this.nodes = [];
        for (let i = 0; i < n; i++) {
            const aa = this.sequence[i];
            this.nodes.push({
                code: aa.code,
                name: aa.name,
                hydropathy: aa.hydropathy,
                type: aa.hydropathy > 0 ? 'H' : 'P',
                x: this.w * 0.15 + i * (this.w * 0.7 / (n - 1)),
                y: this.h * 0.5 + (Math.random() - 0.5) * 10,
                vx: 0, vy: 0
            });
        }
    }

    bindUI() {
        const solvent = document.getElementById('solvent');
        const temp = document.getElementById('temperature');
        const tempLabel = document.getElementById('tempLabel');
        const speed = document.getElementById('speed');
        const rand = document.getElementById('randomize');
        const reset = document.getElementById('reset');
        const pause = document.getElementById('pause');
        const secBias = document.getElementById('secBias');
        const sequenceInput = document.getElementById('sequenceInput');
        const applySeq = document.getElementById('applySeq');
        const presetCore = document.getElementById('presetCore');
        const presetHelix = document.getElementById('presetHelix');
        const showHBonds = document.getElementById('showHBonds');
        const showTrails = document.getElementById('showTrails');
        const showCore = document.getElementById('showCore');
        const enableDrag = document.getElementById('enableDrag');

        this.solvent = solvent ? solvent.value : 'water';
        solvent && solvent.addEventListener('change', () => { this.solvent = solvent.value; });
        temp && temp.addEventListener('input', () => {
            const v = parseInt(temp.value, 10) / 100;
            this.params.temp = v;
            tempLabel.textContent = v < 0.34 ? 'Low' : (v > 0.67 ? 'High' : 'Medium');
        });
        speed && speed.addEventListener('input', () => { this.params.speed = parseInt(speed.value, 10) / 60; });
        rand && rand.addEventListener('click', () => { this.sequence = this.makeSequence(this.sequence.length); this.reset(); });
        reset && reset.addEventListener('click', () => { this.reset(); });
        pause && pause.addEventListener('click', () => { this.paused = !this.paused; pause.textContent = this.paused ? 'Resume' : 'Pause'; });
        this.secBias = (secBias && secBias.value) || 'none';
        secBias && secBias.addEventListener('change', () => { this.secBias = secBias.value; });

        // sequence apply & presets
        applySeq && applySeq.addEventListener('click', () => {
            if (!sequenceInput) return;
            this.applySequenceString(sequenceInput.value || '');
        });
        presetCore && presetCore.addEventListener('click', () => {
            // cluster of hydrophobics in middle with polar flanks
            const preset = 'KKSSRR' + 'VILFWY' + 'AVILMF' + 'DDDEEE';
            if (sequenceInput) sequenceInput.value = preset;
            this.applySequenceString(preset);
        });
        presetHelix && presetHelix.addEventListener('click', () => {
            // amphipathic-like alternation of H/P
            const preset = 'AKLAKLAKLAKLAKLAKLA';
            if (sequenceInput) sequenceInput.value = preset;
            this.applySequenceString(preset);
            this.secBias = 'helix';
            if (secBias) secBias.value = 'helix';
        });

        // display toggles
        this.showHBonds = showHBonds ? showHBonds.checked : false;
        this.showTrails = showTrails ? showTrails.checked : false;
        this.showCore = showCore ? showCore.checked : false;
        this.enableDrag = enableDrag ? enableDrag.checked : false;
        showHBonds && showHBonds.addEventListener('change', () => this.showHBonds = showHBonds.checked);
        showTrails && showTrails.addEventListener('change', () => this.showTrails = showTrails.checked);
        showCore && showCore.addEventListener('change', () => this.showCore = showCore.checked);
        enableDrag && enableDrag.addEventListener('change', () => this.enableDrag = enableDrag.checked);
    }

    applySequenceString(str) {
        const codes = (str || '')
            .toUpperCase()
            .replace(/[^A-Z]/g, '')
            .split('')
            .filter(c => AMINO_ACIDS.some(a => a.code === c));
        if (codes.length < 3) return; // ignore too-short inputs
        this.sequence = codes.map(c => {
            const aa = AMINO_ACIDS.find(a => a.code === c);
            return { code: aa.code, name: aa.name, hydropathy: aa.hydropathy, type: aa.hydropathy > 0 ? 'H' : 'P' };
        });
        this.reset();
    }

    initInteraction() {
        this.hoverIndex = -1;
        this.dragIndex = -1;
        const toLocal = (e) => {
            const r = this.canvas.getBoundingClientRect();
            return { x: (e.clientX - r.left) * (this.canvas.width / r.width), y: (e.clientY - r.top) * (this.canvas.height / r.height) };
        };
        this.canvas.addEventListener('pointermove', (e) => {
            const p = toLocal(e);
            // hover
            let best = -1, bestD = 14;
            for (let i = 0; i < this.nodes.length; i++) {
                const n = this.nodes[i];
                const d = Math.hypot(n.x - p.x, n.y - p.y);
                if (d < bestD) { bestD = d; best = i; }
            }
            this.hoverIndex = best;
            // drag
            if (this.dragIndex >= 0 && this.enableDrag) {
                const n = this.nodes[this.dragIndex];
                n.x = p.x; n.y = p.y; n.vx = 0; n.vy = 0;
            }
        });
        this.canvas.addEventListener('pointerdown', (e) => {
            if (!this.enableDrag) return;
            const p = toLocal(e);
            for (let i = 0; i < this.nodes.length; i++) {
                const n = this.nodes[i];
                if (Math.hypot(n.x - p.x, n.y - p.y) < 12) { this.dragIndex = i; break; }
            }
        });
        window.addEventListener('pointerup', () => { this.dragIndex = -1; });
    }

    pairStrength(a, b) {
        const key = a.type + b.type; // e.g., HH, HP, PH, PP
        const table = this.params.pairEps[this.solvent || 'water'];
        // treat HP and PH the same
        const k = key === 'HP' || key === 'PH' ? 'HP' : key;
        return table[k];
    }

    step(dt) {
        const nodes = this.nodes;
        const n = nodes.length;
        const { bondK, rest, angleK, repulse, temp, speed, radialK, hbK, hbDist } = this.params;
        const sdt = (dt / 16.67) * speed; // normalize to ~60fps base
        const cx = this.w * 0.5, cy = this.h * 0.5;

        // forces
        for (let i = 0; i < n; i++) { nodes[i].fx = 0; nodes[i].fy = 0; }

        // bond springs
        for (let i = 0; i < n - 1; i++) {
            const a = nodes[i], b = nodes[i+1];
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.max(1e-3, Math.hypot(dx, dy));
            const ext = d - rest;
            const f = bondK * ext;
            const ux = dx / d, uy = dy / d;
            a.fx += f * ux; a.fy += f * uy;
            b.fx -= f * ux; b.fy -= f * uy;
        }

        // angle stiffness (secondary bias adjustable)
        for (let i = 1; i < n - 1; i++) {
            const a = nodes[i-1], b = nodes[i], c = nodes[i+1];
            const v1x = a.x - b.x, v1y = a.y - b.y;
            const v2x = c.x - b.x, v2y = c.y - b.y;
            const l1 = Math.max(1e-3, Math.hypot(v1x, v1y));
            const l2 = Math.max(1e-3, Math.hypot(v2x, v2y));
            const cos = (v1x*v2x + v1y*v2y) / (l1*l2);
            const angle = Math.acos(Math.min(1, Math.max(-1, cos)));
            let target = Math.PI * 0.75; // default slightly bent to avoid straightening
            if (this.secBias === 'helix') target = Math.PI * 0.7; // more curvature
            if (this.secBias === 'sheet') target = Math.PI * 0.98; // extended
            const diff = angle - target;
            const f = -angleK * diff;
            // apply a small torque along bisector
            const nx = (v1x/l1 + v2x/l2), ny = (v1y/l1 + v2y/l2);
            b.fx += f * nx; b.fy += f * ny;
        }

        // secondary-structure hydrogen-bond-like attractions
        if (this.secBias === 'helix') {
            for (let i = 0; i < n - 3; i++) {
                const a = nodes[i], b = nodes[i+3];
                const dx = b.x - a.x, dy = b.y - a.y; const d = Math.max(1e-3, Math.hypot(dx, dy));
                const ux = dx/d, uy = dy/d; const ext = d - hbDist;
                const f = -hbK * ext; // spring toward hbDist
                a.fx += f*ux; a.fy += f*uy; b.fx -= f*ux; b.fy -= f*uy;
            }
        } else if (this.secBias === 'sheet') {
            for (let i = 0; i < n - 2; i++) {
                const a = nodes[i], b = nodes[i+2];
                const dx = b.x - a.x, dy = b.y - a.y; const d = Math.max(1e-3, Math.hypot(dx, dy));
                const ux = dx/d, uy = dy/d; const ext = d - (hbDist + 8);
                const f = -hbK * 0.8 * ext;
                a.fx += f*ux; a.fy += f*uy; b.fx -= f*ux; b.fy -= f*uy;
            }
        }

        // non-bonded interactions (self-avoid + hydropathy)
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const a = nodes[i], b = nodes[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const d2 = dx*dx + dy*dy; const d = Math.max(1e-2, Math.sqrt(d2));
                // soft-core repulsion (stronger at very short range to prevent collapse)
                const fr = repulse / (d2) + (d < 16 ? 3000 / Math.max(64, d2) : 0);
                const ux = dx / d, uy = dy / d;
                a.fx -= fr * ux; a.fy -= fr * uy;
                b.fx += fr * ux; b.fy += fr * uy;
                // hydrophobic/hydrophilic attraction/repulsion (short-range)
                const eps = this.pairStrength(a, b);
                const range = 100; // interaction range
                if (d < range) {
                    // Make HP repulsion grow near contact; amplify homotypic attraction per solvent
                    let fa = (eps * (1 - d / range)) * (1 - 0.3 * this.params.temp);
                    if ((a.type !== b.type)) fa *= 1.3; // stronger HP repulsion
                    if (this.solvent === 'water' && a.type === 'H' && b.type === 'H') fa *= 1.6; // orange↔orange in water
                    if (this.solvent === 'membrane' && a.type === 'P' && b.type === 'P') fa *= 1.6; // blue↔blue in membrane
                    // eps>0: attraction; eps<0: repulsion
                    a.fx += fa * ux; a.fy += fa * uy;
                    b.fx -= fa * ux; b.fy -= fa * uy;
                }
            }
        }

        // solvent radial field: in water, H toward center, P outward; invert in membrane
        const strengthen = 1 + (1 - this.cool) * 1.2; // stronger as we cool
        for (let i = 0; i < n; i++) {
            const p = nodes[i];
            const dx = cx - p.x, dy = cy - p.y; const d = Math.max(1e-3, Math.hypot(dx, dy));
            const ux = dx/d, uy = dy/d;
            let dir = 0;
            if (this.solvent === 'water') dir = (p.type === 'H') ? 1 : -1;
            else if (this.solvent === 'membrane') dir = (p.type === 'H') ? -1 : 1;
            else dir = (p.type === 'H') ? 0.6 : -0.6;
            const solventScale = this.solvent === 'water' ? 1.0 : (this.solvent === 'intermediate' ? 0.7 : 0.5);
            // stronger with distance
            const mag = radialK * solventScale * strengthen * (1 - 0.5 * this.params.temp) * dir * d * 1.0;
            p.fx += mag * ux; p.fy += mag * uy;
        }

        // target radius field for robust native-like arrangement (orange-in/blue-out)
        {
            const minDim = Math.min(this.w, this.h);
            const coreR = 0.22 * minDim; // preferred hydrophobic core radius
            const shellR = 0.40 * minDim; // preferred polar shell radius
            const kRing = 0.06 * strengthen * (1 - 0.4 * this.params.temp);
            for (let i = 0; i < n; i++) {
                const p = nodes[i];
                const dx = p.x - cx, dy = p.y - cy; const r = Math.max(1e-3, Math.hypot(dx, dy));
                const ux = dx / r, uy = dy / r;
                let rTarget;
                if (this.solvent === 'water') rTarget = (p.type === 'H') ? coreR : shellR;
                else if (this.solvent === 'membrane') rTarget = (p.type === 'H') ? shellR : coreR;
                else rTarget = (p.type === 'H') ? (0.28 * minDim) : (0.36 * minDim);
                const delta = r - rTarget; // positive means too far out
                const f = -kRing * delta;
                p.fx += f * ux; p.fy += f * uy;
            }
        }

        // soft wall forces to keep enclosed (no flinging out)
        const margin = 22, kWall = 0.6;
        for (let i = 0; i < n; i++) {
            const p = nodes[i];
            if (p.x < margin) p.fx += kWall * (margin - p.x);
            if (p.x > this.w - margin) p.fx -= kWall * (p.x - (this.w - margin));
            if (p.y < margin) p.fy += kWall * (margin - p.y);
            if (p.y > this.h - margin) p.fy -= kWall * (p.y - (this.h - margin));
        }

        // thermal jitter (with cooling)
        for (let i = 0; i < n; i++) {
            const jitter = (this.params.temp * this.cool) * 0.8;
            nodes[i].fx += (Math.random() - 0.5) * jitter;
            nodes[i].fy += (Math.random() - 0.5) * jitter;
        }

        // integrate (damped) and update trails
        const damp = 0.88;
        for (let i = 0; i < n; i++) {
            const p = nodes[i];
            p.vx = (p.vx + p.fx * 0.1 * sdt) * damp;
            p.vy = (p.vy + p.fy * 0.1 * sdt) * damp;
            p.x += p.vx * sdt; p.y += p.vy * sdt;
            // keep inside canvas
            if (p.x < 20) { p.x = 20; p.vx *= -0.4; }
            if (p.x > this.w - 20) { p.x = this.w - 20; p.vx *= -0.4; }
            if (p.y < 20) { p.y = 20; p.vy *= -0.4; }
            if (p.y > this.h - 20) { p.y = this.h - 20; p.vy *= -0.4; }
            if (this.showTrails) {
                p.trail = p.trail || [];
                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > 24) p.trail.shift();
            }
        }

        // recentre cluster gently toward canvas center (keeps native shape in middle)
        let sumX = 0, sumY = 0;
        for (let i = 0; i < n; i++) { sumX += nodes[i].x; sumY += nodes[i].y; }
        const cxNow = sumX / n, cyNow = sumY / n;
        const shiftX = (cx - cxNow) * 0.05;
        const shiftY = (cy - cyNow) * 0.05;
        for (let i = 0; i < n; i++) { nodes[i].x += shiftX; nodes[i].y += shiftY; }

        // compute a simple potential energy estimate
        let E = 0;
        // bond energy ~ (d-rest)^2
        for (let i = 0; i < n - 1; i++) {
            const a = nodes[i], b = nodes[i+1];
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.max(1e-3, Math.hypot(dx, dy));
            E += 0.5 * bondK * (d - rest) * (d - rest);
        }
        // pair energies
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const a = nodes[i], b = nodes[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const d = Math.max(1e-3, Math.hypot(dx, dy));
                const eps = this.pairStrength(a, b);
                const range = 90;
                if (d < range) {
                    const s = (1 - d / range);
                    E -= eps * s; // lower energy for favorable interactions
                }
            }
        }
        // radial contribution (favoring desired exposure)
        for (let i = 0; i < n; i++) {
            const p = nodes[i];
            const dx = (this.w*0.5) - p.x, dy = (this.h*0.5) - p.y; const d = Math.hypot(dx, dy);
            let pref = 0;
            if (this.solvent === 'water') pref = (p.type === 'H') ? d : (this.w*0.5 - d);
            else if (this.solvent === 'membrane') pref = (p.type === 'P') ? d : (this.w*0.5 - d);
            E -= this.params.radialK * 0.05 * pref;
        }

        this.energy = E;
        // track dynamic range for the energy bar
        if (Number.isFinite(E)) {
            if (E < this.energyMin) this.energyMin = E;
            if (E > this.energyMax) this.energyMax = E;
        }
    }

    draw() {
        const ctx = this.ctx; const nodes = this.nodes; const n = nodes.length;
        if (!n) return;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0,0,this.w,this.h);
        // background
        ctx.fillStyle = '#0b0b0c';
        ctx.fillRect(0,0,this.w,this.h);
        // optional hydrophobic core ring
        if (this.showCore) {
            const r = Math.min(this.w, this.h) * 0.28;
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.setLineDash([6, 8]);
            ctx.beginPath();
            ctx.arc(this.w/2, this.h/2, r, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // bonds
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < n - 1; i++) {
            const a = nodes[i], b = nodes[i+1];
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();

        // trails
        if (this.showTrails) {
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1;
            for (let i = 0; i < n; i++) {
                const t = nodes[i].trail || [];
                if (t.length < 2) continue;
                ctx.beginPath();
                ctx.moveTo(t[0].x, t[0].y);
                for (let k = 1; k < t.length; k++) ctx.lineTo(t[k].x, t[k].y);
                ctx.stroke();
            }
        }

        // show hydrogen-bond lines per bias
        if (this.showHBonds && this.secBias !== 'none') {
            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < n; i++) {
                const j = this.secBias === 'helix' ? i + 3 : i + 2;
                if (j < n) {
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.stroke();
                }
            }
        }
        // residues with labels; color by type (blue = polar, orange = nonpolar)
        for (let i = 0; i < n; i++) {
            const p = nodes[i];
            ctx.beginPath();
            const fill = p.type === 'H' ? '#ff9f0a' : '#64d2ff';
            ctx.fillStyle = fill;
            ctx.arc(p.x, p.y, 10, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = p.type === 'H' ? 'rgba(255,159,10,0.9)' : 'rgba(100,210,255,0.9)';
            ctx.lineWidth = 2; ctx.stroke();
            // label with one-letter code
            const code = p.code || (p.type === 'H' ? 'H' : 'P');
            ctx.fillStyle = '#0b0b0c';
            ctx.font = '10px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(code, p.x, p.y);
        }

        // hover tooltip
        if (this.hoverIndex >= 0 && this.hoverIndex < n) {
            const p = nodes[this.hoverIndex];
            const text = `${p.code} — ${p.name}  (hydropathy ${p.hydropathy.toFixed(1)})`;
            ctx.font = '12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial';
            const w = ctx.measureText(text).width + 12;
            const x = Math.min(this.w - w - 8, Math.max(8, p.x + 12));
            const y = Math.max(20, p.y - 20);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(x, y - 14, w, 20);
            ctx.fillStyle = '#0b0b0c';
            ctx.fillText(text, x + 6, y);
        }
        // legend text only (no color blocks), right-aligned for readability
        ctx.font = '13px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        const keyText = 'Orange = nonpolar (hydrophobic); Blue = polar (hydrophilic)';
        const tw = ctx.measureText(keyText).width;
        ctx.fillText(keyText, Math.max(12, this.w - tw - 12), 22);
        ctx.restore();
    }

    updateEnergyBar() {
        const fill = document.getElementById('energyFill');
        const valueEl = document.getElementById('energyValue');
        if (!fill) return;
        const E = this.energy;
        if (!Number.isFinite(E)) return;
        // Use dynamic min/max with sensible fallback span
        const span = Math.max(40, this.energyMax - this.energyMin);
        const mid = (this.energyMax + this.energyMin) / 2;
        // lower energy (more stable) → higher fill
        let pct = 50 - ((E - mid) / span) * 100; // center at 50%
        pct = Math.max(2, Math.min(98, pct));
        fill.style.height = pct.toFixed(1) + '%';
        // subtle color shift with stability
        const t = Math.max(0, Math.min(1, (pct - 2) / 96));
        const r = Math.round(10 + (100 - 10) * (1 - t));
        const g = Math.round(132 + (210 - 132) * t);
        const b = Math.round(255 + (255 - 255) * t);
        fill.style.background = `linear-gradient(180deg, rgb(${g},${b},${b}), rgb(${r},${g},255))`;
        if (valueEl) valueEl.textContent = `E ≈ ${E.toFixed(1)} (min ${isFinite(this.energyMin)?this.energyMin.toFixed(1):'…'}, max ${isFinite(this.energyMax)?this.energyMax.toFixed(1):'…'})`;
    }

    loop(now) {
        const dt = now - this.last; this.last = now;
        if (!this.paused) this.step(dt);
        this.draw();
        this.updateEnergyBar();
        // Gradual cooling to help settle into compact state
        this.cool = Math.max(0.3, this.cool * 0.9995);
        this.updateEnergyChart();
        requestAnimationFrame(this.loop);
    }

    updateEnergyChart() {
        if (!this.energyCtx) return;
        const ctx = this.energyCtx;
        const W = ctx.canvas.width, H = ctx.canvas.height;
        this.energyHistory.push(this.energy);
        if (this.energyHistory.length > W) this.energyHistory.shift();
        ctx.clearRect(0,0,W,H);
        ctx.fillStyle = '#0b0b0c'; ctx.fillRect(0,0,W,H);
        ctx.strokeStyle = '#64d2ff'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < this.energyHistory.length; i++) {
            const v = this.energyHistory[i];
            const clamped = Math.max(-50, Math.min(150, v));
            const y = H - ((clamped + 50) / 200) * H;
            const x = i;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('protein');
    if (canvas) new ProteinSim(canvas);
});
function lerpColor(c1, c2, t) {
    return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t)
    ];
}
