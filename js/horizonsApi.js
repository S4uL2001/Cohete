/**
 * Cliente para la API de JPL Horizons con mecanismo de respaldo (Fallback).
 * Si la API falla (por CORS o caída del servidor), usa datos reales precargados.
 */
const HORIZONS_ENDPOINT = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// Datos reales de Artemis II (Orion) extraídos de JPL Horizons
const FALLBACK_DATA = {
  headers: ['JDTDB', 'Calendar Date', 'X', 'Y', 'Z', 'VX', 'VY', 'VZ'],
  rows: [
    { JDTDB: 2461132.277777778, 'Calendar Date': '2026-Apr-02 18:40', X: 6025.761471, Y: -59066.826509, Z: -5001.564896, VX: 1.001753, VY: 1.661326, VZ: 0.147208 },
    { JDTDB: 2461132.284722222, 'Calendar Date': '2026-Apr-02 18:50', X: 6624.666583, Y: -58049.790102, Z: -4911.526415, VX: 0.994423, VY: 1.729145, VZ: 0.152949 },
    { JDTDB: 2461132.291666667, 'Calendar Date': '2026-Apr-02 19:00', X: 7218.848961, Y: -56991.416788, Z: -4817.989843, VX: 0.985994, VY: 1.799144, VZ: 0.15887 },
    { JDTDB: 2461132.298611111, 'Calendar Date': '2026-Apr-02 19:10', X: 7807.617185, Y: -55890.345441, Z: -4720.84296, VX: 0.976355, VY: 1.871503, VZ: 0.164986 },
    { JDTDB: 2461132.305555556, 'Calendar Date': '2026-Apr-02 19:20', X: 8390.208272, Y: -54745.100591, Z: -4619.964194, VX: 0.96538, VY: 1.946424, VZ: 0.171313 },
    { JDTDB: 2461132.3125, 'Calendar Date': '2026-Apr-02 19:30', X: 8965.776707, Y: -53554.079087, Z: -4515.221543, VX: 0.95292, VY: 2.024132, VZ: 0.177869 }
  ]
};

export function buildHorizonsUrl({ start, stop, step = '10m' }) {
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: "'-1024'",
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: "'500@399'",
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: `'${step}'`,
    VEC_TABLE: "'2'",
    OUT_UNITS: "'KM-S'",
    CSV_FORMAT: "'YES'",
    VEC_LABELS: "'YES'",
  });
  return `${HORIZONS_ENDPOINT}?${params.toString()}`;
}

export async function fetchArtemisVectors({ start, stop, step }) {
  const targetUrl = buildHorizonsUrl({ start, stop, step });
  const proxiedUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;

  try {
    const res = await fetch(proxiedUrl);
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
    const data = await res.json();

    const text = data.result || '';
    const startIdx = text.indexOf('$$SOE');
    const endIdx = text.indexOf('$$EOE');
    
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('No se encontraron datos válidos en la respuesta.');
    }

    const block = text.slice(startIdx + 5, endIdx).trim();
    const lines = block.split('\n').filter(l => l.trim().length > 0);

    const headers = ['JDTDB', 'Calendar Date', 'X', 'Y', 'Z', 'VX', 'VY', 'VZ'];
    const rows = lines.map(line => {
      const parts = line.split(',').map(s => s.trim());
      const obj = {};
      headers.forEach((h, i) => {
        const val = parts[i] ?? '';
        obj[h] = i === 0 || i >= 2 ? Number(val) : val;
      });
      return obj;
    });

    return { headers, rows, isFallback: false };
  } catch (error) {
    console.warn('API falló, usando datos de respaldo:', error.message);
    return { ...FALLBACK_DATA, isFallback: true };
  }
}