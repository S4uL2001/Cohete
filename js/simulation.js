/**
 * Modelo de ascenso vertical del Saturn V (primera etapa).
 * Método de Euler explícito.
 */
export function simulateSaturnV(params) {
  const { m0, mf, F, tBurn, g, dt, N } = params;

  if (dt <= 0 || N < 1) throw new Error('Δt y N deben ser positivos.');
  if (m0 <= mf || mf < 0) throw new Error('m₀ debe ser > mf ≥ 0.');

  const burnRate = (m0 - mf) / tBurn;
  const steps = [];

  let t = 0, y = 0, v = 0;

  for (let n = 0; n <= N; n++) {
    const burning = t <= tBurn;
    const m = burning ? m0 - burnRate * t : mf;
    const thrust = burning ? F : 0;
    const a = burning ? (thrust - m * g) / m : -g;

    steps.push({ n, t, y, v, a, m, F: thrust });

    if (n === N) break;
    // Euler explícito
    y = y + v * dt;
    v = v + a * dt;
    t = t + dt;
  }

  return steps;
}

export function validateParams(p) {
  const errs = [];
  if (!(p.m0 > 0)) errs.push('m₀ > 0.');
  if (!(p.mf >= 0)) errs.push('mf ≥ 0.');
  if (p.m0 <= p.mf) errs.push('m₀ > mf.');
  if (!(p.F >= 0)) errs.push('F ≥ 0.');
  if (!(p.tBurn > 0)) errs.push('t_burn > 0.');
  if (!(p.g > 0)) errs.push('g > 0.');
  if (!(p.dt > 0)) errs.push('Δt > 0.');
  if (!(p.N >= 1 && p.N <= 2000)) errs.push('N entre 1 y 2000.');
  return errs;
}