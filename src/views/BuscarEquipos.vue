<!-- src/views/BuscarEquipos.vue -->
<template>
  <div class="container py-4">
    <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-3">
      <div>
        <h2 class="mb-1">Buscar Equipos</h2>
        <div class="text-secondary small">
          Total cargados: <strong>{{ equiposRaw.length }}</strong>
          <span v-if="filteredEquipos.length !== equiposRaw.length">
            · Filtrados: <strong>{{ filteredEquipos.length }}</strong>
          </span>
        </div>


        <div v-if="!loading && equiposRaw.length === 0" class="alert alert-warning mt-2 mb-0">
          <strong>No se cargaron equipos.</strong> Revisa:
          <ul class="mb-0">
            <li>Que la colección se llame exactamente <code>equipos</code>.</li>
            <li>Firestore Rules (que permitan leer).</li>
            <li>Que tu <code>db</code> apunte al proyecto correcto.</li>
          </ul>
        </div>
      </div>


      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-lg-end">
        <div class="d-flex align-items-center gap-2">
          <label class="small text-secondary mb-0">Mostrar</label>
          <select class="form-select form-select-sm" style="width: 110px" v-model.number="pageSize" :disabled="loading">
            <option v-for="n in pageSizeOptions" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>

        <button class="btn btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#filters">
          Filtros
        </button>
        <button class="btn btn-outline-danger" type="button" @click="resetFilters" :disabled="loading">
          Limpiar
        </button>
      </div>
    </div>


    <div class="card shadow-sm border-0 mb-3">
      <div class="card-body">
        <label class="form-label fw-semibold mb-2">Buscar (nombre / patente / categoría / contrato / año)</label>
        <div class="input-group">
          <span class="input-group-text">🔎</span>
          <input
            v-model.trim="qText"
            type="text"
            class="form-control"
            placeholder="Ej: XTM-CAPL · KPXG-14 · PLANO · 2018 · CASA MATRIZ..."
            :disabled="loading"
          />
          <button class="btn btn-primary" type="button" @click="focusSearch" :disabled="loading">
            Buscar
          </button>
        </div>
      </div>
    </div>

    <div id="filters" class="collapse show">
      <div class="card shadow-sm border-0 mb-3">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-12 col-md-4">
              <label class="form-label fw-semibold">Categoría</label>
              <select v-model="fCategoria" class="form-select" :disabled="loading">
                <option value="">Todas</option>
                <option v-for="c in categoriasDisponibles" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>

            <div class="col-12 col-md-5">
              <label class="form-label fw-semibold">Contrato</label>
              <select v-model="fContratoDocId" class="form-select" :disabled="loading">
                <option value="">Todos</option>
                <option v-for="c in contratosConEquipos" :key="c.docId" :value="c.docId">
                {{ c.nombre }}
                </option>
              </select>
            </div>

            <div class="col-6 col-md-1">
              <label class="form-label fw-semibold">Año desde</label>
              <input
                v-model.number="fYearFrom"
                type="number"
                class="form-control"
                :min="yearMin ?? undefined"
                :max="yearMax ?? undefined"
                :placeholder="yearMin ?? '—'"
                :disabled="loading || yearMin == null"
              />
            </div>

            <div class="col-6 col-md-1">
              <label class="form-label fw-semibold">Año hasta</label>
              <input
                v-model.number="fYearTo"
                type="number"
                class="form-control"
                :min="yearMin ?? undefined"
                :max="yearMax ?? undefined"
                :placeholder="yearMax ?? '—'"
                :disabled="loading || yearMax == null"
              />
            </div>

            <div class="col-12 col-md-1">
              <label class="form-label fw-semibold">Orden</label>
              <select v-model="sortKey" class="form-select" :disabled="loading">
                <option value="nombre_equipo">Nombre</option>
                <option value="patente">Patente</option>
                <option value="categoria">Categoría</option>
                <option value="fecha_modelo">Año</option>
                <option value="contratoNombre">Contrato</option>
              </select>
            </div>

            <div class="col-12 d-flex gap-2 align-items-center mt-2">
              <button class="btn btn-outline-secondary btn-sm" @click="toggleSortDir" :disabled="loading">
                Orden: {{ sortDir === "asc" ? "Asc" : "Desc" }}
              </button>

              <span v-if="yearMin != null && yearMax != null" class="small text-secondary">
                Rango: <strong>{{ yearMin }}</strong> – <strong>{{ yearMax }}</strong>
              </span>

              <span v-if="errorMsg" class="text-danger small">
                {{ errorMsg }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="card border-0 shadow-sm">
      <div class="card-body d-flex align-items-center gap-3">
        <div class="spinner-border" role="status" aria-label="Cargando"></div>
        <div>
          <div class="fw-semibold">Cargando equipos y contratos…</div>
          <div class="small text-secondary">Esto puede tardar si hay muchos registros.</div>
        </div>
      </div>
    </div>

    <div v-else class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Nombre equipo</th>
                <th>Patente</th>
                <th>Categoría</th>
                <th>Año</th>
                <th>Contrato</th>
                <th class="text-end pe-3">Acción</th>
              </tr>
            </thead>

            <tbody v-if="pagedEquipos.length">
              <tr v-for="e in pagedEquipos" :key="e.__docId">
                <td class="ps-3">
                  <div class="fw-semibold">{{ e.nombre_equipo || "-" }}</div>
                </td>
                <td><span class="badge text-bg-dark">{{ e.patente || "-" }}</span></td>
                <td><span class="badge text-bg-secondary">{{ e.categoria || "-" }}</span></td>
                <td><span class="badge text-bg-light border">{{ e.fecha_modelo ?? "-" }}</span></td>
                <td>
                  <div class="fw-semibold">{{ e.contratoNombre }}</div>
                </td>
                <td class="text-end pe-3">
                  <button class="btn btn-outline-primary btn-sm" @click="verEquipo(e)">Ver</button>
                </td>
              </tr>
            </tbody>

            <tbody v-else>
              <tr>
                <td colspan="6" class="text-center py-4 text-secondary">
                  No hay resultados con esos filtros.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 p-3 border-top">
          <div class="small text-secondary">
            Página <strong>{{ page }}</strong> de <strong>{{ totalPages }}</strong>
          </div>

          <nav v-if="totalPages > 1">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: page === 1 }">
                <button class="page-link" @click="page = page - 1" :disabled="page === 1">Prev</button>
              </li>

              <li
                v-for="p in visiblePages"
                :key="p"
                class="page-item"
                :class="{ active: p === page, disabled: p === '…' }"
              >
                <button v-if="p !== '…'" class="page-link" @click="page = p">{{ p }}</button>
                <span v-else class="page-link">…</span>
              </li>

              <li class="page-item" :class="{ disabled: page === totalPages }">
                <button class="page-link" @click="page = page + 1" :disabled="page === totalPages">Next</button>
              </li>
            </ul>
          </nav>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const loading = ref(true);
const errorMsg = ref("");


const equiposRaw = ref([]);
const contratosDisponibles = ref([]); 
const contratosByAnyId = ref(new Map());


const qText = ref("");
const fCategoria = ref("");
const fContratoDocId = ref("");
const fYearFrom = ref(null);
const fYearTo = ref(null);


const sortKey = ref("nombre_equipo");
const sortDir = ref("asc");

const pageSizeOptions = [10, 30, 50, 70, 100, 150, 200];
const pageSize = ref(10);
const page = ref(1);

const yearMin = ref(null);
const yearMax = ref(null);

function normalize(s) {
  return String(s ?? "").trim().toLowerCase();
}
function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}
function getContratoNombre(contratoId) {
  const key = String(contratoId ?? "");
  if (!key) return "Sin contrato";
  return contratosByAnyId.value.get(key) || "Contrato no encontrado";
}

const categoriasDisponibles = computed(() => {
  const set = new Set();
  for (const e of equiposRaw.value) if (e?.categoria) set.add(String(e.categoria));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});
const contratosConEquipos = computed(() => {
  // ids que realmente están presentes en equipos
  const used = new Set(
    equiposRaw.value
      .map(e => String(e?.contratoId ?? "").trim())
      .filter(Boolean)
  );

  // incluimos contrato si su docId o su idField aparece en equipos
  return contratosDisponibles.value.filter(c => {
    const docId = String(c.docId ?? "").trim();
    const idField = String(c.idField ?? "").trim();
    return used.has(docId) || (idField && used.has(idField));
  });
});

const filteredEquipos = computed(() => {
  const text = normalize(qText.value);
  const cat = String(fCategoria.value || "");

  // si eliges un contrato, permitimos match por docId o por idField
  let allowedContratoIds = null;
  if (fContratoDocId.value) {
    const selected = contratosDisponibles.value.find(c => c.docId === fContratoDocId.value);
    const ids = [selected?.docId, selected?.idField].filter(Boolean).map(String);
    allowedContratoIds = new Set(ids);
  }

  const yFrom = safeNum(fYearFrom.value);
  const yTo = safeNum(fYearTo.value);

  let arr = equiposRaw.value.map((e) => ({
    ...e,
    contratoNombre: getContratoNombre(e.contratoId),
  }));

  if (cat) arr = arr.filter((e) => String(e.categoria || "") === cat);

  if (allowedContratoIds) {
    arr = arr.filter((e) => allowedContratoIds.has(String(e.contratoId || "")));
  }

  if (yFrom !== null) arr = arr.filter((e) => safeNum(e.fecha_modelo) != null && safeNum(e.fecha_modelo) >= yFrom);
  if (yTo !== null) arr = arr.filter((e) => safeNum(e.fecha_modelo) != null && safeNum(e.fecha_modelo) <= yTo);

  if (text) {
    arr = arr.filter((e) => {
      const blob = [
        e.categoria,
        e.contratoId,
        e.fecha_modelo,
        e.id,
        e.nombre_equipo,
        e.patente,
        e.contratoNombre,
      ].map(normalize).join(" | ");
      return blob.includes(text);
    });
  }

  const k = sortKey.value;
  const dir = sortDir.value === "asc" ? 1 : -1;

  arr.sort((a, b) => {
    const va = a?.[k];
    const vb = b?.[k];

    const na = safeNum(va);
    const nb = safeNum(vb);
    if (na !== null && nb !== null) return (na - nb) * dir;

    return normalize(va).localeCompare(normalize(vb)) * dir;
  });

  return arr;
});

watch(
  [qText, fCategoria, fContratoDocId, fYearFrom, fYearTo, pageSize, sortKey, sortDir],
  () => {
    page.value = 1;
  },
  { flush: "sync" }
);


const totalPages = computed(() => {
  const t = Math.ceil(filteredEquipos.value.length / pageSize.value);
  return Math.max(1, t);
});

const pagedEquipos = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredEquipos.value.slice(start, start + pageSize.value);
});

const visiblePages = computed(() => {
  const t = totalPages.value;
  const p = page.value;
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);

  const pages = [];
  pages.push(1);
  if (p > 3) pages.push("…");

  const from = Math.max(2, p - 1);
  const to = Math.min(t - 1, p + 1);
  for (let i = from; i <= to; i++) pages.push(i);

  if (p < t - 2) pages.push("…");
  pages.push(t);
  return pages;
});

function toggleSortDir() {
  sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
}
function resetFilters() {
  qText.value = "";
  fCategoria.value = "";
  fContratoDocId.value = "";

  fYearFrom.value = yearMin.value;
  fYearTo.value = yearMax.value;

  sortKey.value = "nombre_equipo";
  sortDir.value = "asc";
  pageSize.value = 10;
  page.value = 1;
}
async function focusSearch() {
  await nextTick();
}
function verEquipo(e) {
  console.log("Equipo:", e);
}

function computeYearRange() {
  const years = equiposRaw.value
    .map(e => safeNum(e.fecha_modelo))
    .filter(y => y != null);

  if (!years.length) {
    yearMin.value = null;
    yearMax.value = null;
    fYearFrom.value = null;
    fYearTo.value = null;
    return;
  }

  const min = Math.min(...years);
  const max = Math.max(...years);

  yearMin.value = min;
  yearMax.value = max;

  if (fYearFrom.value == null) fYearFrom.value = min;
  if (fYearTo.value == null) fYearTo.value = max;
}

async function loadContratos() {
  const snap = await getDocs(collection(db, "contratos"));
  const list = [];
  const map = new Map();

  snap.forEach((d) => {
    const data = d.data() || {};
    const nombre = data.nombre || "(Sin nombre)";
    const docId = d.id;
    const idField = data.id != null ? String(data.id) : "";

    list.push({ docId, idField, nombre });
    map.set(String(docId), nombre);
    if (idField) map.set(idField, nombre);
  });

  list.sort((a, b) => a.nombre.localeCompare(b.nombre));

  contratosDisponibles.value = list;
  contratosByAnyId.value = map;
}

async function loadEquipos() {
  const snap = await getDocs(collection(db, "equipos"));
  const list = [];
  snap.forEach((d) => list.push({ __docId: d.id, ...d.data() }));
  equiposRaw.value = list;

  computeYearRange();
}

onMounted(async () => {
  loading.value = true;
  errorMsg.value = "";
  try {
    await Promise.all([loadContratos(), loadEquipos()]);
  } catch (err) {
    console.error(err);
    errorMsg.value = "Error cargando datos desde Firestore. Revisa consola y permisos (rules).";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.card { border-radius: 1rem; }
.table > :not(caption) > * > * { vertical-align: middle; }
</style>
