export class Charts {
  constructor() {
    const opts = (ylabel) => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { labels: { color: '#b9c6e8' } } },
      scales: {
        x: { ticks: { color: '#8ea0c8' }, grid: { color: 'rgba(255,255,255,.05)' }, title: { display: true, text: 't (s)', color: '#8ea0c8' } },
        y: { ticks: { color: '#8ea0c8' }, grid: { color: 'rgba(255,255,255,.05)' }, title: { display: true, text: ylabel, color: '#8ea0c8' } },
      },
    });

    this.cy = new Chart(document.getElementById('chartY'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Euler', data: [], borderColor: '#4ea8ff', pointRadius: 0, borderWidth: 2, fill: false }] },
      options: opts('Altura (m)'),
    });
    this.cv = new Chart(document.getElementById('chartV'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Euler', data: [], borderColor: '#ffcf5a', pointRadius: 0, borderWidth: 2, fill: false }] },
      options: opts('Velocidad (m/s)'),
    });
    this.ca = new Chart(document.getElementById('chartA'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Euler', data: [], borderColor: '#ff7a59', pointRadius: 0, borderWidth: 2, fill: false }] },
      options: opts('Aceleración (m/s²)'),
    });
  }

  update(steps) {
    const labels = steps.map(s => s.t.toFixed(1));
    this.cy.data.labels = labels;
    this.cy.data.datasets[0].data = steps.map(s => s.y);
    this.cv.data.labels = labels;
    this.cv.data.datasets[0].data = steps.map(s => s.v);
    this.ca.data.labels = labels;
    this.ca.data.datasets[0].data = steps.map(s => s.a);
    this.cy.update('none');
    this.cv.update('none');
    this.ca.update('none');
  }

  updateUntil(steps, index) {
    const partial = steps.slice(0, Math.min(index + 1, steps.length));
    this.update(partial);
  }
}