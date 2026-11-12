import { simulateSaturnV, validateParams } from './simulation.js';
import { fetchArtemisVectors } from './horizonsApi.js';
import { Charts } from './charts.js';
import { renderDatasetTable, computeStats, renderStats } from './ui.js';

const charts = new Charts();
let lastSteps = [];

// ---------- Simulación ----------
function readParams() {
  return {
    m0: Number(document.getElementById('m0').value),
    mf: Number(document.getElementById('mf').value),
    F: Number(document.getElementById('F').value),
    tBurn: Number(document.getElementById('tBurn').value),
    g: Number(document.getElementById('g').value),
    dt: Number(document.getElementById('dt').value),
    N: Number(document.getElementById('N').value),
  };
}

function runSimulation() {
  const p = readParams();
  const errs = validateParams(p);
  const msg = document.getElementById('simMsg');
  if (errs.length) { msg.textContent = errs.join(' '); return; }
  msg.textContent = '';

  const steps = simulateSaturnV(p);
  lastSteps = steps;
  window.__eulerSteps = steps;

  charts.update(steps);
  renderIterTable(steps);
  updateReadout(steps[0]);
  renderScenarioTable();

  stopAnimation();
  currentIndex = 0;
  paused = false;
  document.getElementById('pauseSim').textContent = '⏸ Pausar';
}

function renderIterTable(steps) {
  const tbody = document.querySelector('#iterTable tbody');
  tbody.innerHTML = '';
  const rows = steps.length <= 15 ? steps : [...steps.slice(0, 10), null, steps[steps.length - 1]];
  rows.forEach(s => {
    const tr = document.createElement('tr');
    if (!s) tr.innerHTML = '<td colspan="7" style="text-align:center;color:#8ea0c8;">…</td>';
    else tr.innerHTML = `<td>${s.n}</td><td>${s.t.toFixed(2)}</td><td>${s.y.toFixed(1)}</td><td>${s.v.toFixed(2)}</td><td>${s.a.toFixed(3)}</td><td>${s.m.toFixed(0)}</td><td>${s.F.toFixed(0)}</td>`;
    tbody.appendChild(tr);
  });
}

function updateReadout(s) {
  if (!s) return;
  document.getElementById('roT').textContent = `${s.t.toFixed(2)} s`;
  document.getElementById('roY').textContent = `${s.y.toFixed(1)} m`;
  document.getElementById('roV').textContent = `${s.v.toFixed(2)} m/s`;
  document.getElementById('roA').textContent = `${s.a.toFixed(3)} m/s²`;
  document.getElementById('roM').textContent = `${s.m.toFixed(0)} kg`;
  document.getElementById('roF').textContent = `${s.F.toFixed(0)} N`;
}

function renderScenarioTable() {
  const tbody = document.querySelector('#scenarioTable tbody');
  tbody.innerHTML = '';
  const base = { ...readParams() };
  const dts = [2, 1, 0.5, 0.25];
  const results = dts.map(dt => {
    const p = { ...base, dt, N: Math.min(2000, Math.floor(base.tBurn * 1.5 / dt) + 50) };
    const steps = simulateSaturnV(p);
    const maxY = Math.max(...steps.map(s => s.y));
    const maxV = Math.max(...steps.map(s => s.v));
    return { dt, maxY, maxV };
  });
  const ref = results[results.length - 1];
  results.forEach(r => {
    const err = Math.abs(r.maxY - ref.maxY);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.dt}</td><td>${r.maxY.toFixed(0)}</td><td>${r.maxV.toFixed(1)}</td><td>${err.toFixed(1)}</td>`;
    tbody.appendChild(tr);
  });
}

// ---------- Animación Dinámica y Mejorada ----------
let anim = null;
let paused = false;
let currentIndex = 0;
let animSpeed = 1;

function stopAnimation() {
  if (anim) cancelAnimationFrame(anim);
  anim = null;
}

function drawFrame(ctx, W, H, s, maxY, timestamp, params) {
  // 1. Fondo dinámico
  const rel = Math.min(1, s.y / maxY);
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, `rgb(${26 + rel * 0}, ${58 - rel * 50}, ${138 - rel * 120})`);
  skyGrad.addColorStop(1, `rgb(${126 - rel * 100}, ${200 - rel * 180}, 255)`);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Estrellas
  if (rel > 0.2) {
    ctx.fillStyle = `rgba(255,255,255,${(rel - 0.2) * 1.5})`;
    for (let i = 0; i < 50; i++) {
      const sx = (Math.sin(i * 132.7) * 0.5 + 0.5) * W;
      const sy = (Math.cos(i * 78.3) * 0.5 + 0.5) * H * 0.8;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  const groundH = 40;
  const groundY = H - groundH;
  ctx.fillStyle = '#1a1e1a';
  ctx.fillRect(0, groundY, W, groundH);
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(W / 2 - 40, groundY - 5, 80, 5);

  // 2. Calcular posición en pantalla
  const rx = W / 2;
  const maxPixelHeight = H - groundH - 80; 
  let ry = groundY - (s.y / maxY) * maxPixelHeight;

  // 3. Efecto Cámara: Si el cohete supera la parte superior, lo anclamos arriba
  const isOutOfBounds = ry < 20;
  if (isOutOfBounds) {
    ry = 20; 
  }

  // 4. Estela de humo persistente
  if (s.F > 0 && s.y > 0) {
    ctx.fillStyle = 'rgba(200, 200, 200, 0.15)';
    const maxSmokeTrail = Math.min(10, currentIndex);
    for (let i = 1; i <= maxSmokeTrail; i++) {
      const prevState = lastSteps[Math.max(0, currentIndex - i * 2)];
      let prevRy = groundY - (prevState.y / maxY) * maxPixelHeight;
      if (prevRy < 20) prevRy = 20;
      const size = 8 + i * 2;
      ctx.beginPath();
      ctx.arc(rx, prevRy + 25, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. Dibujo del Cohete
  ctx.save();
  ctx.translate(rx, ry);

  // Llama parpadeante
  if (s.F > 0) {
    const flicker = Math.sin(timestamp / 40) * 6;
    const flameGrad = ctx.createLinearGradient(0, 15, 0, 45 + flicker);
    flameGrad.addColorStop(0, '#fff');
    flameGrad.addColorStop(0.4, '#ff9d3c');
    flameGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-6, 15); ctx.lineTo(6, 15); ctx.lineTo(0, 45 + flicker);
    ctx.fill();
  }

  // Cuerpo
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.quadraticCurveTo(12, -10, 12, 15);
  ctx.lineTo(-12, 15);
  ctx.quadraticCurveTo(-12, -10, 0, -30);
  ctx.fill();
  ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.stroke();

  // Franja roja
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(-12, -5, 24, 5);

  // Ventana
  ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(0, -12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.arc(0, -12, 2, 0, Math.PI * 2); ctx.fill();

  // Aletas
  ctx.fillStyle = '#bdc3c7';
  ctx.beginPath(); ctx.moveTo(-12, 5); ctx.lineTo(-22, 20); ctx.lineTo(-12, 20); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12, 5); ctx.lineTo(22, 20); ctx.lineTo(12, 20); ctx.fill();

  ctx.restore();

  // 6. Indicador de fuera de pantalla (Si el cohete está muy alto)
  if (isOutOfBounds) {
    ctx.fillStyle = '#4ea8ff';
    ctx.beginPath(); ctx.moveTo(rx, 5); ctx.lineTo(rx - 8, 15); ctx.lineTo(rx + 8, 15); ctx.fill();
    
    ctx.strokeStyle = 'rgba(78, 168, 255, 0.4)'; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(rx, 15); ctx.lineTo(rx, groundY); ctx.stroke();
    ctx.setLineDash([]);
  }

  // 7. HUD Matemático en el Canvas
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(10, H - 110, 260, 95);
  ctx.strokeStyle = '#4ea8ff'; ctx.lineWidth = 2; ctx.strokeRect(10, H - 110, 260, 95);

  ctx.fillStyle = '#fff'; ctx.font = '12px monospace';
  ctx.fillText('--- ITERACIÓN EULER ---', 20, H - 90);
  ctx.fillStyle = '#7ce0a3';
  ctx.fillText(`a = (${(s.F/1000).toFixed(0)}kN - ${(s.m/1000).toFixed(0)}t*${params.g}) / ${(s.m/1000).toFixed(0)}t`, 20, H - 70);
  ctx.fillText(`a = ${s.a.toFixed(2)} m/s²`, 20, H - 50);
  ctx.fillStyle = '#ffcf5a';
  ctx.fillText(`v = ${s.v.toFixed(1)} + ${s.a.toFixed(1)} * ${params.dt}`, 20, H - 30);
}

function animate() {
  if (!lastSteps.length) return;
  const canvas = document.getElementById('rocketCanvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = rect.width; const H = rect.height;
  const maxY = Math.max(1, ...lastSteps.map(s => s.y));
  const params = readParams();

  let lastTs = performance.now();
  let accumulator = 0;

  function frame(ts) {
    if (!anim) return;
    const delta = (ts - lastTs) / 1000;
    lastTs = ts;

    if (!paused) {
      accumulator += delta * animSpeed * 4;
      while (accumulator >= 1 && currentIndex < lastSteps.length - 1) {
        accumulator -= 1;
        currentIndex++;
      }
    }

    const s = lastSteps[currentIndex];
    drawFrame(ctx, W, H, s, maxY, ts, params);
    updateReadout(s);
    charts.updateUntil(lastSteps, currentIndex);

    if (currentIndex >= lastSteps.length - 1) { anim = null; return; }
    anim = requestAnimationFrame(frame);
  }

  stopAnimation();
  currentIndex = 0;
  paused = false;
  document.getElementById('pauseSim').textContent = '⏸ Pausar';
  charts.updateUntil(lastSteps, 0);
  anim = requestAnimationFrame(frame);
}

// ---------- Exploración de datos (API) ----------
async function fetchData() {
  const start = document.getElementById('apiStart').value;
  const stop = document.getElementById('apiStop').value;
  const step = document.getElementById('apiStep').value;
  const msg = document.getElementById('apiMsg');
  msg.textContent = 'Consultando API de Horizons…';
  msg.style.color = 'var(--warn)';

  try {
    const { headers, rows, isFallback } = await fetchArtemisVectors({ start, stop, step });
    renderDatasetTable(document.getElementById('datasetTable'), headers, rows);
    const stats = computeStats(rows, headers);
    renderStats(document.getElementById('statsBox'), stats);
    
    if (isFallback) {
      msg.textContent = '⚠️ API no disponible. Mostrando datos reales precargados de Artemis II.';
      msg.style.color = '#ffcf5a';
    } else {
      msg.textContent = `Consulta exitosa en vivo: ${rows.length} registros obtenidos.`;
      msg.style.color = 'var(--accent2)';
    }

    document.getElementById('selectedVars').innerHTML = `
      <li><strong>JDTDB</strong>: referencia temporal juliana, no usada directamente en Euler.</li>
      <li><strong>VX, VY, VZ</strong>: componentes de velocidad; la magnitud se usa para comparar órdenes de magnitud con la simulación.</li>
      <li><strong>X, Y, Z</strong>: posición geocéntrica; contexto de la trayectoria orbital.</li>
      <li><strong>m₀, F, t_burn, g</strong>: parámetros del Saturn V, usados como entradas de la simulación.</li>
    `;
  } catch (e) {
    msg.textContent = `Error inesperado: ${e.message}`;
    msg.style.color = 'var(--danger)';
  }
}

// ---------- Eventos ----------
document.getElementById('runSim').addEventListener('click', runSimulation);
document.getElementById('playSim').addEventListener('click', () => { stopAnimation(); animate(); });
document.getElementById('pauseSim').addEventListener('click', () => {
  if (!anim) return;
  paused = !paused;
  document.getElementById('pauseSim').textContent = paused ? '▶ Continuar' : '⏸ Pausar';
});
document.getElementById('resetSim').addEventListener('click', () => {
  stopAnimation(); currentIndex = 0; paused = false;
  document.getElementById('pauseSim').textContent = '⏸ Pausar';
  if (!lastSteps[0]) return;
  updateReadout(lastSteps[0]); charts.updateUntil(lastSteps, 0);
  const canvas = document.getElementById('rocketCanvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const maxY = Math.max(1, ...lastSteps.map(s => s.y));
  drawFrame(ctx, rect.width, rect.height, lastSteps[0], maxY, performance.now(), readParams());
});
document.getElementById('animSpeed').addEventListener('input', (e) => {
  animSpeed = Number(e.target.value);
  document.getElementById('animSpeedLabel').textContent = `${animSpeed}×`;
});
document.getElementById('fetchApi').addEventListener('click', fetchData);

window.addEventListener('load', () => {
  runSimulation();
  fetchData().catch(() => {});
});