<template>
  <div class="buscar-equipos-page">
    <div class="container py-4 py-lg-5">
      <!-- ===== Hero ===== -->
      <div class="hero card border-0 shadow-sm overflow-hidden mb-4">
        <div class="hero-bg"></div>

        <div class="card-body position-relative p-4 p-lg-5">
          <div class="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3">
            <div class="minw-0">
              <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span class="badge hero-badge">
                  <i class="bi bi-search me-1"></i> Buscador global
                </span>
                <span class="badge hero-badge-alt">
                  <i class="bi bi-truck-front me-1"></i> Equipos
                </span>
              </div>

              <h1 class="h3 fw-black mb-1">Buscar Equipos</h1>
              <p class="text-muted mb-0">
                Busca por nombre, patente, categoría, contrato o año. Usa filtros para acotar rápido.
              </p>

              <div class="stats mt-3">
                <div class="stat">
                  <div class="num">{{ equiposRaw.length }}</div>
                  <div class="label">Cargados</div>
                </div>
                <div class="stat">
                  <div class="num">{{ filteredEquipos.length }}</div>
                  <div class="label">Filtrados</div>
                </div>
                <div class="stat" v-if="!loading">
                  <div class="num"><i class="bi bi-funnel"></i></div>
                  <div class="label">Filtros</div>
                </div>
              </div>

              <div v-if="!loading && equiposRaw.length === 0" class="alert alert-warning mt-3 mb-0">
                <strong>No se cargaron equipos.</strong> Revisa:
                <ul class="mb-0">
                  <li>Que la colección se llame exactamente <code>equipos</code>.</li>
                  <li>Firestore Rules (que permitan leer).</li>
                  <li>Que tu <code>db</code> apunte al proyecto correcto.</li>
                </ul>
              </div>
            </div>

            <div class="d-flex gap-2 flex-wrap justify-content-lg-end">
              <div class="d-flex align-items-center gap-2">
                <label class="small text-secondary mb-0">Mostrar</label>
                <select
                  class="form-select form-select-sm"
                  style="width: 120px"
                  v-model.number="pageSize"
                  :disabled="loading"
                >
                  <option v-for="n in pageSizeOptions" :key="n" :value="n">{{ n }}</option>
                </select>
              </div>

              <button
                class="btn btn-outline-secondary btn-rect"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#filters"
                :disabled="loading"
              >
                <i class="bi bi-sliders me-1"></i> Filtros
              </button>

              <button class="btn btn-outline-danger btn-rect" type="button" @click="resetFilters" :disabled="loading">
                <i class="bi bi-eraser me-1"></i> Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Search ===== -->
      <div class="card border-0 shadow-sm mb-3 card-rect">
        <div class="card-body p-4">
          <label class="form-label fw-semibold mb-2">
            Buscar (nombre / patente / categoría / contrato / año)
          </label>

          <div class="input-group input-group-lg search">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input
              v-model.trim="qText"
              type="text"
              class="form-control"
              placeholder="Ej: XTM-CAPL · KPXG-14 · PLANO · 2018 · CASA MATRIZ..."
              :disabled="loading"
              ref="searchInput"
            />
            <button class="btn btn-primary btn-rect" type="button" @click="focusSearch" :disabled="loading">
              Buscar
            </button>
          </div>

          <div class="chips mt-3">
            <button class="chip chip-rect" type="button" @click="quick('plano')" :disabled="loading">
              <i class="bi bi-tag me-2"></i> Plano
            </button>
            <button class="chip chip-rect" type="button" @click="quick('camion')" :disabled="loading">
              <i class="bi bi-truck me-2"></i> Camión
            </button>
            <button class="chip chip-rect" type="button" @click="quick(String(yearMax ?? ''))" :disabled="loading || yearMax == null">
              <i class="bi bi-calendar2 me-2"></i> Año máx
            </button>
            <button class="chip chip-rect" type="button" @click="quick(String(yearMin ?? ''))" :disabled="loading || yearMin == null">
              <i class="bi bi-calendar2 me-2"></i> Año mín
            </button>
          </div>

          <div v-if="errorMsg" class="text-danger small mt-2">
            <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMsg }}
          </div>
        </div>
      </div>

      <!-- ===== Filters ===== -->
      <div id="filters" class="collapse show">
        <div class="card border-0 shadow-sm mb-3 card-rect">
          <div class="card-body p-4">
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

              <div class="col-12 d-flex flex-wrap gap-2 align-items-center mt-2">
                <button class="btn btn-outline-secondary btn-sm btn-rect" @click="toggleSortDir" :disabled="loading">
                  <i class="bi bi-sort-alpha-down me-1"></i>
                  Orden: {{ sortDir === "asc" ? "Asc" : "Desc" }}
                </button>

                <span v-if="yearMin != null && yearMax != null" class="small text-secondary">
                  Rango: <strong>{{ yearMin }}</strong> – <strong>{{ yearMax }}</strong>
                </span>

                <span class="ms-auto small text-secondary" v-if="filteredEquipos.length">
                  <i class="bi bi-list-ul me-1"></i>
                  Mostrando <strong>{{ pagedEquipos.length }}</strong> en esta página
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Loading ===== -->
      <div v-if="loading" class="card border-0 shadow-sm card-rect">
        <div class="card-body d-flex align-items-center gap-3 p-4">
          <div class="spinner-border" role="status" aria-label="Cargando"></div>
          <div>
            <div class="fw-semibold">Cargando equipos y contratos…</div>
            <div class="small text-secondary">Esto puede tardar si hay muchos registros.</div>
          </div>
        </div>
      </div>

      <!-- ===== Results ===== -->
      <div v-else class="card border-0 shadow-sm card-rect">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 table-pro">
              <thead class="table-light sticky-head">
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
                    <div class="small text-muted">
                      <i class="bi bi-hash me-1"></i>{{ e.__docId }}
                    </div>
                  </td>
                  <td><span class="badge text-bg-dark badge-rect">{{ e.patente || "-" }}</span></td>
                  <td><span class="badge text-bg-secondary badge-rect">{{ e.categoria || "-" }}</span></td>
                  <td><span class="badge text-bg-light border badge-rect">{{ e.fecha_modelo ?? "-" }}</span></td>
                  <td><div class="fw-semibold">{{ e.contratoNombre }}</div></td>
                  <td class="text-end pe-3">
                    <button class="btn btn-outline-primary btn-sm btn-rect" @click="openEquipoModal(e)">
                      <i class="bi bi-eye me-1"></i> Ver
                    </button>
                  </td>
                </tr>
              </tbody>

              <tbody v-else>
                <tr>
                  <td colspan="6" class="text-center py-5 text-secondary">
                    <div class="empty-icon mb-2"><i class="bi bi-search"></i></div>
                    <div class="fw-bold">No hay resultados</div>
                    <div>Prueba cambiando filtros o el texto de búsqueda.</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
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

      <div class="text-center text-muted small mt-4">
        <i class="bi bi-shield-check me-1"></i>
        Búsqueda y filtros locales (client-side) con datos cargados desde Firestore.
      </div>
    </div>

    <!-- ===== Modal Detalle Equipo ===== -->
    <div class="modal fade show" v-if="equipoModal.visible" style="display:block;" @click.self="closeEquipoModal">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content modal-pro">
          <div class="modal-header">
            <div class="d-flex align-items-center gap-2 minw-0">
              <span class="detail-icon">
                <i class="bi bi-truck-front"></i>
              </span>
              <div class="minw-0">
                <h5 class="modal-title fw-bold mb-0 text-truncate">
                  {{ equipoModal.data?.nombre_equipo || "Detalle equipo" }}
                </h5>
                <div class="small text-muted text-truncate">
                  {{ equipoModal.data?.contratoNombre || "Sin contrato" }}
                </div>
              </div>
            </div>
            <button class="btn-close" @click="closeEquipoModal"></button>
          </div>

          <div class="modal-body">
            <div class="d-flex flex-wrap gap-2 mb-3">
              <span class="badge text-bg-dark badge-rect" v-if="equipoModal.data?.patente">
                <i class="bi bi-upc-scan me-1"></i>{{ equipoModal.data?.patente }}
              </span>
              <span class="badge text-bg-secondary badge-rect" v-if="equipoModal.data?.categoria">
                <i class="bi bi-tag me-1"></i>{{ equipoModal.data?.categoria }}
              </span>
              <span class="badge text-bg-light border badge-rect" v-if="equipoModal.data?.fecha_modelo != null">
                <i class="bi bi-calendar2 me-1"></i>{{ equipoModal.data?.fecha_modelo }}
              </span>
              <span class="badge text-bg-light border badge-rect">
                <i class="bi bi-hash me-1"></i>{{ equipoModal.data?.__docId }}
              </span>
            </div>

            <div class="row g-3">
              <div class="col-12 col-md-6">
                <div class="detail-card">
                  <div class="label">Nombre equipo</div>
                  <div class="value">{{ equipoModal.data?.nombre_equipo || "—" }}</div>
                </div>
              </div>

              <div class="col-6 col-md-3">
                <div class="detail-card">
                  <div class="label">Patente</div>
                  <div class="value mono">{{ equipoModal.data?.patente || "—" }}</div>
                </div>
              </div>

              <div class="col-6 col-md-3">
                <div class="detail-card">
                  <div class="label">Año</div>
                  <div class="value">{{ equipoModal.data?.fecha_modelo ?? "—" }}</div>
                </div>
              </div>

              <div class="col-12 col-md-6">
                <div class="detail-card">
                  <div class="label">Categoría</div>
                  <div class="value">{{ equipoModal.data?.categoria || "—" }}</div>
                </div>
              </div>

              <div class="col-12 col-md-6">
                <div class="detail-card">
                  <div class="label">Contrato</div>
                  <div class="value">{{ equipoModal.data?.contratoNombre || "Sin contrato" }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-rect w-100 w-sm-auto" @click="closeEquipoModal">
              Cerrar
            </button>
            <button class="btn btn-primary btn-rect w-100 w-sm-auto" @click="focusSearch">
              <i class="bi bi-search me-1"></i> Volver a buscar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1085;">
      <div class="toast align-items-center text-bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true" ref="toastRef">
        <div class="d-flex">
          <div class="toast-body">{{ toastMsg }}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" @click="hideToast"></button>
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

const searchInput = ref(null);

/* ===== Modal state ===== */
const equipoModal = ref({ visible: false, data: null });

/* ===== Toast (copy) ===== */
const toastRef = ref(null);
const toastMsg = ref("Copiado al portapapeles ✅");

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
  const used = new Set(
    equiposRaw.value
      .map(e => String(e?.contratoId ?? "").trim())
      .filter(Boolean)
  );

  return contratosDisponibles.value.filter(c => {
    const docId = String(c.docId ?? "").trim();
    const idField = String(c.idField ?? "").trim();
    return used.has(docId) || (idField && used.has(idField));
  });
});

const filteredEquipos = computed(() => {
  const text = normalize(qText.value);
  const cat = String(fCategoria.value || "");

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
  () => { page.value = 1; },
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
  searchInput.value?.focus?.();
}

function quick(text) {
  qText.value = String(text || "");
  focusSearch();
}

/* ===== Modal handlers ===== */
function openEquipoModal(e) {
  equipoModal.value = { visible: true, data: e };
}
function closeEquipoModal() {
  equipoModal.value = { visible: false, data: null };
}




function hideToast() {
  toastRef.value?.classList?.remove("show");
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
    const idField = importingIdField(data);

    list.push({ docId, idField, nombre });
    map.set(String(docId), nombre);
    if (idField) map.set(idField, nombre);
  });

  list.sort((a, b) => a.nombre.localeCompare(b.nombre));

  contratosDisponibles.value = list;
  contratosByAnyId.value = map;
}

function importingIdField(data) {
  // mantiene tu lógica, pero evita undefined / null
  return data?.id != null ? String(data.id) : "";
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
/* ===== Page background ===== */
.buscar-equipos-page{
  min-height: calc(100vh - 56px);
  background:
    radial-gradient(1200px 650px at 15% 10%, rgba(220, 53, 69, 0.10), transparent 60%),
    radial-gradient(900px 550px at 85% 20%, rgba(13, 110, 253, 0.08), transparent 60%),
    linear-gradient(180deg, #ffffff, #fbfbfc);
}

/* ===== Rect style helpers ===== */
.card-rect{ border-radius: 12px; }
.btn-rect{
  border-radius: 10px;
  font-weight: 800;
}
.badge-rect{
  border-radius: 10px;
  font-weight: 800;
}

/* ===== Hero (cuadrado/rectangular) ===== */
.hero{
  border-radius: 12px;
  position: relative;
}
.hero-bg{
  position:absolute; inset:0;
  background: linear-gradient(90deg, rgba(220,53,69,.10), rgba(170,25,40,.05));
}
.fw-black{ font-weight: 900; }

.hero-badge{
  background: rgba(220,53,69,.14);
  color:#b21f2d;
  border:1px solid rgba(220,53,69,.20);
  border-radius: 10px;
  padding:.42rem .6rem;
  font-weight: 900;
}
.hero-badge-alt{
  background: rgba(13,110,253,.10);
  color:#0b5ed7;
  border:1px solid rgba(13,110,253,.18);
  border-radius: 10px;
  padding:.42rem .6rem;
  font-weight: 900;
}

/* ===== Stats (rectangulares) ===== */
.stats{ display:flex; gap:.6rem; flex-wrap:wrap; }
.stat{
  background: rgba(255,255,255,.88);
  border: 1px solid rgba(0,0,0,.06);
  border-radius: 12px;
  padding: .55rem .75rem;
  min-width: 110px;
  box-shadow: 0 10px 22px rgba(0,0,0,.06);
}
.stat .num{ font-weight: 950; font-size: 1.02rem; line-height: 1; }
.stat .label{ color:#6c757d; font-size:.78rem; font-weight: 800; }

/* ===== Search ===== */
.search .input-group-text{
  background:#fff;
  border-right:0;
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}
.search .form-control{
  border-left:0;
}
.search .form-control:focus{ box-shadow:none; }
.search .btn{
  border-top-right-radius: 10px !important;
  border-bottom-right-radius: 10px !important;
}

/* ===== Chips (rectangulares) ===== */
.chips{ display:flex; flex-wrap:wrap; gap:.5rem; }
.chip-rect{
  border:1px solid rgba(0,0,0,.08);
  background: rgba(255,255,255,.85);
  border-radius: 10px;
  padding:.45rem .7rem;
  font-weight: 900;
  color:#212529;
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
}
.chip-rect:hover{
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(0,0,0,.06);
  background:#fff;
}

/* ===== Cards & table ===== */
.card{ border-radius: 12px; }
.table > :not(caption) > * > * { vertical-align: middle; }
.table-pro thead th{ font-weight: 900; }
.table-pro tbody tr:hover{ background: rgba(220,53,69,.04); }

.sticky-head{
  position: sticky;
  top: 0;
  z-index: 2;
}

/* Empty */
.empty-icon{
  width: 58px; height: 58px;
  border-radius: 12px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-size: 1.5rem;
  background: rgba(220,53,69,.10);
  color:#b21f2d;
  margin: 0 auto;
}

/* ===== Modal (rectangular) ===== */
.modal{ background: rgba(0,0,0,.45); }
.modal-pro{
  border-radius: 12px;
  border: 0;
  box-shadow: 0 20px 60px rgba(0,0,0,.22);
}
.detail-icon{
  width: 42px; height: 42px;
  border-radius: 10px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  background: rgba(220,53,69,.12);
  color: #dc3545;
}
.detail-card{
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 12px;
  padding: .85rem;
  background: rgba(255,255,255,.92);
}
.detail-card .label{
  color:#6c757d;
  font-weight: 800;
  font-size: .8rem;
  margin-bottom: .15rem;
}
.detail-card .value{ font-weight: 900; }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

/* Toast */
.toast{ border-radius: 12px; }

/* Responsive small tweaks */
@media (max-width: 575.98px){
  .stat{ min-width: 100px; }
}
</style>

