<!-- src/views/GestorOT.vue -->
<template>
  <div class="container-fluid py-4">
    <!-- Top bar -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h1 class="h4 fw-semibold mb-0">Gestor OT · Órdenes de Trabajo</h1>

      <div class="d-flex align-items-center gap-2">
        <!-- Resumen pequeño -->
        <span class="badge bg-dark">Total: {{ enrichedRows.length }}</span>
        <span class="badge bg-danger">Vencidas: {{ totalVencidas }}</span>
        <span class="badge bg-success">No vencidas: {{ totalNoVencidas }}</span>

        <!-- Acciones -->
        <label class="btn btn-outline-secondary mb-0">
          <i class="bi bi-upload"></i> Subir Excel
          <input type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="onFileChange" />
        </label>
        <button class="btn btn-outline-danger" :disabled="rows.length === 0" @click="limpiarTodo" title="Borrar datos locales">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>

    <!-- Controles de vista (opcional: para que quepa más info) -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-2 align-items-center">
          <div class="col-12 col-md-6">
            <label class="form-label mb-1">Tamaño de tabla</label>
            <div class="d-flex align-items-center gap-2">
              <input type="range" min="0.7" max="1.1" step="0.05" v-model.number="ui.fontScale" class="form-range" />
              <span class="text-muted small">{{ Math.round(ui.fontScale * 100) }}%</span>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label mb-1">Densidad</label>
            <select v-model="ui.density" class="form-select">
              <option value="normal">Normal</option>
              <option value="compacto">Compacto</option>
            </select>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label mb-1">Filas por pág. (solo visual)</label>
            <select v-model.number="pageSize" class="form-select">
              <option v-for="s in [10,25,50,100]" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
        <div class="small text-muted mt-2">
          * Se agrupa automáticamente por <strong>Contrato</strong> usando el <strong>contratoId</strong> del equipo matcheado (por nombre o patente).
        </div>
      </div>
    </div>

    <!-- Secciones por Contrato -->
    <div v-for="grupo in gruposPorContrato" :key="grupo.contratoKey" class="mb-4">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h5 class="mb-0">
          Contrato: <span class="fw-semibold">{{ grupo.contratoNombre }}</span>
          <span class="badge ms-2 bg-secondary">{{ grupo.items.length }}</span>
        </h5>
      </div>

      <div
        class="table-responsive border rounded excel-area"
        :class="{'dense': ui.density==='compacto'}"
        :style="{'--excel-font-scale': ui.fontScale}"
      >
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light sticky-head">
            <tr>
              <th class="text-nowrap">Equipo</th>
              <th class="text-nowrap">Patente</th>
              <th class="text-nowrap">Categoría</th>
              <th class="text-nowrap">Folio OT</th>
              <th class="text-nowrap">Del</th>
              <th class="text-nowrap">Al</th>
              <th class="text-nowrap">Estado</th>
              <th class="text-nowrap">Días abiertos</th>
              <th class="text-nowrap">Usuario que generó</th>
            </tr>
          </thead>
          <tbody v-if="grupo.items.length">
            <tr v-for="(r, idx) in paginar(grupo.items)" :key="idx">
              <td class="text-truncate" :title="r.eq?.nombre_equipo" style="max-width: 220px">
                {{ r.eq?.nombre_equipo || '—' }}
              </td>
              <td class="text-nowrap">{{ r.eq?.patente || '—' }}</td>
              <td class="text-nowrap">{{ r.eq?.categoria || '—' }}</td>

              <td class="text-nowrap">{{ r.folio_ot }}</td>
              <td class="text-nowrap">{{ fmtFecha(r.del) }}</td>
              <td class="text-nowrap">{{ fmtFecha(r.al) }}</td>

              <td class="text-nowrap">
                <span class="badge" :class="r.vencido ? 'bg-danger' : 'bg-primary-subtle text-primary'">
                  {{ r.estado_calculado }}
                </span>
              </td>

              <td class="text-nowrap" :class="r.vencido ? 'text-danger fw-bold' : ''">
                {{ r.dias_abiertos }}
              </td>

              <td class="text-truncate" :title="r.usuario_genero" style="max-width: 220px">
                {{ r.usuario_genero }}
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr><td colspan="11" class="text-center text-muted py-4">Sin datos</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Paginador global simple (afecta a cada sección visualmente) -->
    <div class="d-flex align-items-center justify-content-between mt-3">
      <div class="text-muted small">Filas por sección: {{ pageSize }}</div>
      <div class="text-muted small">Hoy: {{ hoy }}</div>
    </div>
  </div>
</template>

<script setup>
import * as XLSX from "xlsx";
import { computed, onMounted, reactive, ref, watch } from "vue";

/* ===== Firestore =====
   Ajusta la importación de 'db' según tu proyecto.
   Si tu app ya tiene Firebase inicializado, cambia '@/firebase' por tu ruta real.
*/
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/firebase/config"; 

/** ===== Config & Storage Keys ===== **/
const DIAS_VENCIMIENTO = 7;
const STORAGE_ROWS_KEY = "gestor_ot_rows_v1";

/** ===== UI State ===== **/
const ui = reactive({
  fontScale: 0.85,
  density: "compacto",
});

/** ===== Header map (Excel -> Interno) ===== **/
const headerMap = {
  "Folio OT": "folio_ot",
  "Del": "del",
  "Al": "al",
  "Usuario que generó la OT": "usuario_genero",
  "Duración estimada": "duracion_estimada",
  "Responsable": "responsable",
  "Localización (al momento de generarse la OT)": "localizacion",
  "Estado": "estado",
  "Tipo OT": "tipo_ot",
  "Equipo / Inmueble": "equipo_inmueble",
};

/** ===== Estado base ===== **/
const rows = ref([]);                 // OTs desde Excel
const equipos = ref([]);              // desde Firestore (equipos)
const contratos = ref([]);            // desde Firestore (contratos)
const contratosMap = computed(() => { // id -> contrato
  const m = new Map();
  for (const c of contratos.value) m.set(c.id, c);
  return m;
});

// Paginación visual común (por sección)
const pageSize = ref(25);

/** ===== Helpers de fechas ===== **/
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtFecha(v) {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}
function parseFecha(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return "";
    const dd = new Date(Date.UTC(d.y, d.m - 1, d.d));
    return dd.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/");
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!isNaN(d)) return toISODate(d);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d)) return toISODate(d);
  return "";
}

/** ===== Carga inicial ===== **/
onMounted(async () => {
  // Datos locales (OTs)
  try {
    const raw = localStorage.getItem(STORAGE_ROWS_KEY);
    if (raw) rows.value = JSON.parse(raw);
  } catch(e) {console.error("Error leyendo localStorage:", e);}

  // Firestore: equipos y contratos
  try {
    const [snapEq, snapCt] = await Promise.all([
      getDocs(collection(db, "equipos")),
      getDocs(collection(db, "contratos")),
    ]);

    equipos.value = snapEq.docs.map(d => ({ id: d.id, ...d.data() }));
    contratos.value = snapCt.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Error cargando Firestore:", e);
  }
});

// Persistir OTs locales
watch(rows, (val) => {
  try {
    localStorage.setItem(STORAGE_ROWS_KEY, JSON.stringify(val || []));
  } catch(e) {console.error("Error guardando en localStorage:", e);}
}, { deep: true });

/** ===== Acciones ===== **/
function limpiarTodo() {
  rows.value = [];
  localStorage.removeItem(STORAGE_ROWS_KEY);
}

function normalizarFila(obj) {
  const out = {};
  for (const [label, key] of Object.entries(headerMap)) {
    out[key] = (obj[label] ?? obj[key] ?? "").toString().trim();
  }
  out.del = parseFecha(obj["Del"] ?? obj["del"]);
  out.al  = parseFecha(obj["Al"] ?? obj["al"]);
  return out;
}

async function onFileChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  rows.value = rawRows.map(normalizarFila);
}

/** ===== Cálculos (enriquecimiento + match equipo/contrato) ===== **/
const today = new Date();
const hoy = toISODate(today);

function diffDiasDesde(fechaISO) {
  if (!fechaISO) return 0;
  const d = new Date(fechaISO);
  const ms = new Date(hoy).getTime() - new Date(toISODate(d)).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// Match heurístico: por nombre_equipo o patente incluido en 'equipo_inmueble'
function matchEquipoForOT(ot) {
  const txt = (ot.equipo_inmueble || "").toLowerCase();
  if (!txt) return null;
  // prioriza patente
  let candidato = equipos.value.find(e =>
    e.patente && txt.includes(String(e.patente).toLowerCase())
  );
  if (candidato) return candidato;

  // luego por nombre_equipo
  candidato = equipos.value.find(e =>
    e.nombre_equipo && txt.includes(String(e.nombre_equipo).toLowerCase())
  );
  return candidato || null;
}

const enrichedRows = computed(() =>
  rows.value.map(r => {
    const dias = diffDiasDesde(r.del);
    const vencido = (r.estado || "").toLowerCase() !== "cerrada" && dias > DIAS_VENCIMIENTO;

    // match equipo
    const eq = matchEquipoForOT(r);
    const contratoId = eq?.contratoId || null;
    const contratoNombre = contratoId ? (contratosMap.value.get(contratoId)?.nombre || `Contrato ${contratoId}`) : "Sin contrato";

    // localización concatenada con contrato
    const localizacion_concat = [r.localizacion, contratoNombre].filter(Boolean).join(" · ");

    return {
      ...r,
      dias_abiertos: dias,
      vencido,
      estado_calculado: vencido ? "Vencida" : (r.estado || "Abierta"),
      eq,
      contratoId,
      contratoNombre,
      localizacion_concat,
    };
  })
);

// Agrupar por contrato
const gruposPorContrato = computed(() => {
  const byKey = new Map();
  for (const r of enrichedRows.value) {
    const key = r.contratoId || "__sin__";
    if (!byKey.has(key)) {
      byKey.set(key, {
        contratoKey: key,
        contratoNombre: r.contratoNombre || "Sin contrato",
        items: [],
      });
    }
    byKey.get(key).items.push(r);
  }

  // ordenar grupos alfabéticamente por nombre de contrato
  return Array.from(byKey.values()).sort((a, b) =>
    String(a.contratoNombre).localeCompare(String(b.contratoNombre))
  );
});

// Paginador visual simple por sección (toma los primeros N)
function paginar(arr) {
  return arr.slice(0, pageSize.value);
}

/** ===== KPI pequeño ===== **/
const totalVencidas = computed(() => enrichedRows.value.filter(r => r.vencido).length);
const totalNoVencidas = computed(() => enrichedRows.value.length - totalVencidas.value);
</script>

<style scoped>
/* Área de tabla grande + control de escala */
.excel-area {
  max-height: 70vh;
  font-size: calc(0.96rem * var(--excel-font-scale, 1));
}

/* Densidad compacta: menos padding para que quepa más */
.excel-area.dense :is(td, th) {
  padding: 0.28rem 0.5rem !important;
  line-height: 1.1;
}

/* Header sticky */
.sticky-head th {
  position: sticky;
  top: 0;
  background: var(--bs-light);
  z-index: 2;
}

/* Mejoras de lectura */
.table-hover tbody tr:hover {
  background-color: rgba(0,0,0,0.025);
}

/* Evita que las celdas crezcan demasiado */
td, th {
  white-space: nowrap;
}
</style>