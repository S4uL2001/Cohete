export function renderDatasetTable(container, headers, rows) {
  const thead = container.querySelector('thead');
  const tbody = container.querySelector('tbody');
  thead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
  tbody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = headers.map(h => {
      const v = r[h];
      return `<td>${typeof v === 'number' ? v.toFixed(3) : v}</td>`;
    }).join('');
    tbody.appendChild(tr);
  });
}

export function computeStats(rows, headers) {
  const stats = {};
  headers.forEach(h => {
    const vals = rows.map(r => r[h]).filter(v => typeof v === 'number' && !isNaN(v));
    if (vals.length === 0) return;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
    stats[h] = { mean, min, max, std };
  });
  return stats;
}

export function renderStats(container, stats) {
  container.innerHTML = '';
  for (const [k, s] of Object.entries(stats)) {
    const div = document.createElement('div');
    div.className = 'stat';
    div.innerHTML = `<div class="k">${k}</div><div class="v">μ=${s.mean.toFixed(2)} · [${s.min.toFixed(2)}, ${s.max.toFixed(2)}]</div>`;
    container.appendChild(div);
  }
}