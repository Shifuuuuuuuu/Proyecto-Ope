<!-- src/views/CambioAceiteMotor.vue -->
<template>
  <div class="container-fluid py-4 position-relative">
    <!-- Top bar -->
    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-2">
      <button
        class="btn btn-outline-secondary"
        @click="$router.back()"
        title="Volver a la página anterior"
      >
        <i class="bi bi-arrow-left-circle me-1"></i> Volver al menú
      </button>

      <h1 class="h4 fw-semibold mb-0">Cambio de Aceite · Motor</h1>

      <div class="d-flex flex-wrap gap-2 align-items-center">
        <div class="d-flex align-items-center gap-2">
          <label class="form-label mb-0 small text-muted">Fuente:</label>
          <select v-model="fuente" class="form-select form-select-sm" style="width: 190px">
            <option value="firestore">Publica</option>
            <option value="local">Local</option>
          </select>
          <button
            class="btn btn-sm btn-outline-secondary"
            @click="refreshRemote"
            :disabled="sync.loading || fuente!=='firestore'"
          >
            <i class="bi bi-arrow-clockwise"></i> Refrescar
          </button>
        </div>
        <span class="badge bg-warning text-dark">
          Cambio aceite motor &gt;{{ ACEITE_MIN_ATRASO }}: {{ viewAceite.length }}
        </span>
      </div>
    </div>

    <!-- CONTENIDO: solo cuando NO está cargando -->
    <div v-if="!sync.loading" class="col-12">
      <div v-for="grupo in gruposPorContrato" :key="grupo.key" class="mb-4">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="mb-0">
            Contrato:
            <span class="fw-semibold">{{ grupo.nombre || 'Sin contrato' }}</span>
            <span
              class="badge ms-2"
              :class="grupo.key==='__sin__' ? 'bg-warning text-dark' : 'bg-secondary'"
            >
              {{ grupo.items.length }}
            </span>
          </h5>
        </div>

        <div
          class="table-responsive border rounded excel-area"
          :class="{ dense: ui.density==='compacto', mobile: isMobile }"
          :style="{ '--excel-font-scale': ui.fontScale }"
        >
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light sticky-head">
              <tr>
                <th class="text-nowrap">Equipo</th>
                <th class="text-nowrap">Tipo</th>
                <th class="text-nowrap">Localización</th>
                <th class="text-nowrap text-end pe-3">Días atraso</th>
              </tr>
            </thead>
            <tbody v-if="grupo.items.length">
              <tr
                v-for="(r, idx) in grupo.items"
                :key="idx"
                class="row-click"
                @click="openDetail(r)"
              >
                <td class="text-truncate" style="max-width: 340px" :title="r.eq ? equipoTitle(r.eq) : r.equipo">
                  <template v-if="r.eq">{{ equipoLabel(r.eq) }}</template>
                  <template v-else>
                    {{ r.equipo || '—' }}
                    <span class="badge bg-warning text-dark ms-1">Falta agregar equipo</span>
                  </template>
                </td>
                <td class="text-nowrap">{{ r.tipo || '—' }}</td>
                <td class="text-truncate" style="max-width: 260px" :title="r.localizacion">
                  {{ r.localizacion || '—' }}
                </td>
                <td class="text-end pe-3 fw-bold" :class="r.atraso_dias>0 ? 'text-danger' : 'text-success'">
                  {{ r.atraso_dias }} d
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr>
                <td colspan="7" class="text-center text-muted py-4">
                  Sin equipos con atraso &gt; {{ ACEITE_MIN_ATRASO }} días
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ALERTA cuando no hay resultados (luego de cargar) -->
      <div v-if="!gruposPorContrato.length" class="alert alert-secondary mt-5">
        No hay pendientes de cambio de aceite con atraso &gt; {{ ACEITE_MIN_ATRASO }} días.
      </div>
    </div>

    <!-- OVERLAY DE CARGA (spinner) -->
    <transition name="fade">
      <div
        v-if="sync.loading"
        class="loading-overlay d-flex flex-column align-items-center justify-content-center"
      >
        <div class="loading-card text-center">
          <div class="spinner-border mb-3" role="status" aria-label="Cargando"></div>
          <div class="fw-semibold">Cargando datos…</div>
          <div class="small text-muted" v-if="sync.msg">{{ sync.msg }}</div>
        </div>
      </div>
    </transition>

    <!-- FAB & Panel -->
    <button class="btn btn-danger fab" @click="uiPanelAbierto = !uiPanelAbierto" title="Controles y cargas">
      <i class="bi" :class="uiPanelAbierto ? 'bi-x-lg' : 'bi-sliders'"></i>
    </button>

    <div class="panel-flotante" v-if="uiPanelAbierto">
      <div class="panel-header d-flex align-items-center justify-content-between">
        <strong>Controles y Cargas</strong>
        <button class="btn btn-sm btn-outline-secondary" @click="uiPanelAbierto=false">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <div class="panel-body">
        <!-- Vista -->
        <div class="mb-3">
          <label class="form-label mb-1">Tamaño de tabla</label>
          <div class="d-flex align-items-center gap-2">
            <input
              type="range"
              min="0.62"
              max="1.1"
              step="0.02"
              v-model.number="ui.fontScale"
              class="form-range"
            />
            <span class="text-muted small">{{ Math.round(ui.fontScale * 100) }}%</span>
          </div>
          <div class="form-text">En móvil se sugiere ≤ 75% para ver más columnas.</div>
        </div>
        <div class="mb-3">
          <label class="form-label mb-1">Densidad</label>
          <select v-model="ui.density" class="form-select">
            <option value="normal">Normal</option>
            <option value="compacto">Compacto</option>
          </select>
        </div>

        <hr>

        <!-- Carga archivos (local) -->
        <div class="mb-3">
          <label class="form-label fw-semibold">Subir Aceite (Excel/CSV)</label>
          <label class="btn btn-outline-secondary w-100 mb-2">
            <i class="bi bi-upload"></i> Subir archivo
            <input type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="onFileChangeAceite" />
          </label>
        </div>

        <hr>

        <!-- Sincronización Firestore -->
        <div class="mb-3">
          <label class="form-label fw-semibold">Sincronizar con Firestore</label>
          <div class="d-grid gap-2">
            <button class="btn btn-outline-dark" :disabled="sync.loading" @click="pushAceite(false)">
              <i class="bi bi-cloud-upload"></i> Publicar (upsert)
            </button>
            <button class="btn btn-outline-danger" :disabled="sync.loading" @click="pushAceite(true)">
              <i class="bi bi-arrow-repeat"></i> Reemplazar todo
            </button>
          </div>
          <div class="small mt-2" :class="sync.error ? 'text-danger' : 'text-muted'">
            <template v-if="sync.loading">Sincronizando… {{ sync.msg }}</template>
            <template v-else-if="sync.msg">{{ sync.msg }}</template>
          </div>
        </div>

        <hr>

        <!-- Limpieza local -->
        <div class="mb-2">
          <label class="form-label fw-semibold">Limpieza de datos locales</label>
          <div class="d-grid gap-2">
            <button class="btn btn-outline-danger" @click="clearAceite">
              <i class="bi bi-trash"></i> Limpiar Aceite
            </button>
          </div>
          <div class="small text-muted mt-2">Borra solo lo guardado en este navegador.</div>
        </div>
      </div>
    </div>

    <!-- MODAL DETALLE -->
    <div v-if="detail.open" class="modal-backdrop-custom" @click.self="closeDetail">
      <div class="modal-card">
        <div class="modal-card-header">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-droplet-half"></i>
            <strong>Detalle · Cambio de Aceite</strong>
          </div>
          <button class="btn btn-sm btn-outline-secondary" @click="closeDetail">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-card-body" v-if="detail.item">
          <div class="row g-3">
            <div class="col-12">
              <div class="small text-muted">Equipo</div>
              <div class="fw-semibold">
                <template v-if="detail.item.eq">{{ equipoTitle(detail.item.eq) }}</template>
                <template v-else>
                  {{ detail.item.equipo || '—' }}
                  <span class="badge bg-warning text-dark ms-1">Falta agregar equipo</span>
                </template>
              </div>
            </div>
            <div class="col-6 col-md-4">
              <div class="small text-muted">Tipo</div>
              <div class="fw-semibold">{{ detail.item.tipo || '—' }}</div>
            </div>
            <div class="col-6 col-md-4">
              <div class="small text-muted">Días atraso</div>
              <div class="fw-bold" :class="detail.item.atraso_dias>0 ? 'text-danger' : 'text-success'">
                {{ detail.item.atraso_dias }} d
              </div>
            </div>
            <div class="col-12 col-md-4">
              <div class="small text-muted">Localización</div>
              <div class="fw-semibold text-truncate">{{ detail.item.localizacion || '—' }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="small text-muted">Contrato</div>
              <div class="fw-semibold">{{ detail.item.contratoNombre || '—' }}</div>
            </div>
          </div>
        </div>
        <div class="modal-card-footer">
          <button class="btn btn-secondary" @click="closeDetail">
            <i class="bi bi-x-circle"></i> Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as XLSX from "xlsx";
import { computed, onMounted, reactive, ref, watch, onBeforeUnmount } from "vue";
import { getDocs, collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import {
  ACEITE_MIN_ATRASO,
  FIRE_COL_ACEITE,
  parseAceiteFileToRows,
  useCatalogos,
  plateKey, toKey, toKeyNoDash,
} from "@/services/useGestorShared";

/** ===== UI & estado ===== **/
const ui = reactive({ fontScale: 0.85, density: "compacto" });
const uiPanelAbierto = ref(false);
const sync = reactive({ loading: false, msg: "", error: false });
const fuente = ref("firestore");

/** Responsive flag **/
const isMobile = ref(false);
function updateIsMobile() {
  isMobile.value = window.matchMedia("(max-width: 576px)").matches;
  if (isMobile.value && ui.fontScale > 0.75) ui.fontScale = 0.72;
}

/** Catálogos / índices **/
const { equipos, contratos, idxEqByKey, loadCatalogos, equipoLabel, equipoTitle } = useCatalogos();

/** Datos locales / remotos **/
const aceiteLocal = ref([]);   // [{equipo, tipo, atraso_dias, localizacion, eq?, contratoId?, contratoNombre?}]
const aceiteRemote = ref([]);

/** Detalle **/
const detail = reactive({ open: false, item: null });

/* ===== Carga inicial ===== */
onMounted(async () => {
  updateIsMobile(); window.addEventListener("resize", updateIsMobile);
  try {
    const raw = localStorage.getItem("gestor_aceite_v1");
    if (raw) aceiteLocal.value = JSON.parse(raw);
  } catch(e) { console.error(e); }
  await loadCatalogos();
  await refreshRemote();
});
onBeforeUnmount(() => window.removeEventListener("resize", updateIsMobile));

/* ===== Persistencia local ===== */
watch(aceiteLocal, v => {
  try { localStorage.setItem("gestor_aceite_v1", JSON.stringify(v||[])); } catch(e) { console.error(e); }
}, {deep:true});

/* ===== Subida local ===== */
async function onFileChangeAceite(e) {
  const file = e.target.files?.[0]; if (!file) return;
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array" });
  const rows = parseAceiteFileToRows(wb);
  // Enriquecer con equipo/contrato
  aceiteLocal.value = rows.map(r => {
    const eq = matchEquipoPorTexto(r.equipo);
    let contrato = null;
    if (eq?.contratoId) contrato = contratos.value.find(c => c.id === eq.contratoId) || null;
    return { ...r, eq, contratoId: contrato?.id || null, contratoNombre: contrato?.nombre || null };
  });
  e.target.value = "";
}

/* ===== Match por equipo ===== */
function matchEquipoPorTexto(txt) {
  const s = String(txt || "");
  const pk = plateKey(s);
  if (idxEqByKey.value?.has?.(pk)) return idxEqByKey.value.get(pk);
  const k = toKey(s);
  if (idxEqByKey.value?.has?.(k)) return idxEqByKey.value.get(k);
  const k2 = toKeyNoDash(k);
  if (idxEqByKey.value?.has?.(k2)) return idxEqByKey.value.get(k2);
  return null;
}

/* ===== Carga Firestore (ver publicado) ===== */
async function refreshRemote() {
  try {
    if (fuente.value !== "firestore") return;
    sync.loading = true; sync.msg = "Cargando Firestore…"; sync.error = false;

    const snap = await getDocs(collection(db, FIRE_COL_ACEITE));
    const rows = [];
    snap.forEach(d => {
      const r = d.data() || {};
      let eq = null;
      if (r.equipoId) eq = equipos.value.find(e => e.id === r.equipoId) || null;
      if (!eq && r.equipoPatente) {
        const pk = plateKey(r.equipoPatente);
        eq = idxEqByKey.value.get(pk) || idxEqByKey.value.get(toKey(r.equipoPatente)) || null;
      }
      if (!eq && r.equipoNombre) {
        const nk = toKey(r.equipoNombre);
        eq = idxEqByKey.value.get(nk) || idxEqByKey.value.get(toKeyNoDash(nk)) || null;
      }
      rows.push({
        equipo: r.equipoLabel || r.equipoNombre || r.equipoPatente || "",
        tipo: r.tipo || "",
        localizacion: r.localizacion || "",
        atraso_dias: Number(r.atraso_dias) || 0,
        eq,
        contratoId: r.contratoId || null,
        contratoNombre: r.contratoNombre || null,
      });
    });
    aceiteRemote.value = rows.filter(x => Number(x.atraso_dias) > ACEITE_MIN_ATRASO);

    sync.loading = false; sync.msg = "Firestore cargado.";
  } catch (e) {
    sync.loading = false; sync.error = true; sync.msg = `Error: ${e?.message || e}`;
    console.error(e);
  }
}

/* ===== Vista ===== */
const viewAceite = computed(() =>
  fuente.value === "firestore"
    ? aceiteRemote.value
    : aceiteLocal.value.filter(x => Number(x.atraso_dias) > ACEITE_MIN_ATRASO)
);

const gruposPorContrato = computed(() => {
  const map = new Map();
  for (const r of viewAceite.value) {
    const key = r.contratoId || "__sin__";
    if (!map.has(key)) map.set(key, { key, nombre: r.contratoNombre, items: [] });
    map.get(key).items.push(r);
  }
  return Array.from(map.values()).sort((a, b) =>
    String(a.nombre || "").localeCompare(String(b.nombre || ""))
  );
});

/* ===== Modal ===== */
function openDetail(item) { detail.item = item; detail.open = true; document.body.style.overflow = "hidden"; }
function closeDetail() { detail.open = false; detail.item = null; document.body.style.overflow = ""; }

/* ===== Limpieza local ===== */
function confirmAction(msg){ try { return window.confirm(msg); } catch { return true; } }
function clearAceite(){
  if (!confirmAction("¿Borrar datos locales de Aceite?")) return;
  aceiteLocal.value = [];
  try { localStorage.removeItem("gestor_aceite_v1"); } catch(e) { console.error(e); }
}

/* ===== Publicación a Firestore ===== */
async function batchedUpsert(colName, docs, replace=false) {
  sync.loading = true; sync.error = false; sync.msg = `Preparando ${docs.length} docs…`;
  let currentIds = new Set();
  if (replace) {
    const snap = await getDocs(collection(db, colName));
    snap.forEach(d => currentIds.add(d.id));
  }
  const CHUNK = 450;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = writeBatch(db);
    const slice = docs.slice(i, i + CHUNK);
    slice.forEach(d => {
      const ref = doc(db, colName, d.id);
      batch.set(ref, { ...d.data, updatedAt: serverTimestamp() }, { merge: true });
      if (replace) currentIds.delete(d.id);
    });
    sync.msg = `Escribiendo ${Math.min(i+CHUNK, docs.length)} / ${docs.length}…`;
    await batch.commit();
  }
  if (replace && currentIds.size) {
    const ids = Array.from(currentIds);
    for (let i = 0; i < ids.length; i += 450) {
      const batch = writeBatch(db);
      const chunk = ids.slice(i, i + 450);
      chunk.forEach(id => batch.delete(doc(db, colName, id)));
      sync.msg = `Eliminando restos ${Math.min(i+450, ids.length)} / ${ids.length}…`;
      await batch.commit();
    }
  }
  sync.loading = false; sync.msg = `OK: ${docs.length} ${replace ? 'reemplazados' : 'actualizados'}.`;
  if (fuente.value === "firestore") await refreshRemote();
}

/* Genera un id reproducible por equipo */
function equipoKeyFromRow(r){
  return r.eq ? (plateKey(r.eq.patente) || plateKey(r.eq.equipo_text)) : plateKey(r.equipo || "");
}
async function pushAceite(replace=false) {
  const source = (fuente.value === "firestore"
    ? viewAceite.value
    : aceiteLocal.value.filter(x => x.atraso_dias > ACEITE_MIN_ATRASO)
  );
  const docs = source.map(r => {
    const equipoKey = equipoKeyFromRow(r) || 's/eq';
    // Si tienes una fecha de referencia, úsala. Aquí usamos el atraso como parte del id.
    const id = `${equipoKey}_oil_${r.atraso_dias}`;
    return {
      id,
      data: {
        tipo: r.tipo || null,
        localizacion: r.localizacion || null,
        atraso_dias: Number(r.atraso_dias) || 0,

        equipoId: r.eq?.id || null,
        equipoLabel: r.eq ? (r.eq.equipo_text || r.eq.patente) : (r.equipo || null),
        equipoPatente: r.eq?.patente || null,
        equipoNombre: r.eq?.equipo_text || null,
        equipoKey,

        contratoId: r.contratoId || null,
        contratoNombre: r.contratoNombre || null,
      }
    };
  });
  await batchedUpsert(FIRE_COL_ACEITE, docs, replace);
}
</script>

<style scoped>
/* Área de tabla + control de escala */
.excel-area { max-height: 70vh; font-size: calc(0.96rem * var(--excel-font-scale, 1)); }
.excel-area.dense :is(td, th) { padding: 0.28rem 0.5rem !important; line-height: 1.1; }
.sticky-head th { position: sticky; top: 0; background: var(--bs-light); z-index: 2; }
.table-hover tbody tr:hover { background-color: rgba(0,0,0,0.025); }
td, th { white-space: nowrap; }

/* Móvil */
.excel-area.mobile { font-size: calc(0.88rem * var(--excel-font-scale, 1)); }
@media (max-width: 576px) {
  .excel-area.mobile :is(td, th) { padding: 0.2rem 0.35rem !important; line-height: 1.05; font-size: 0.82rem; }
  .excel-area.mobile table { table-layout: fixed; }
}

/* Fila clickeable */
.row-click { cursor: pointer; }
.row-click:hover { background-color: rgba(13,110,253,.06) !important; }

/* FAB */
.fab {
  position: fixed; right: 16px; bottom: 16px;
  border-radius: 999px; width: 52px; height: 52px;
  display: grid; place-items: center;
  box-shadow: 0 6px 18px rgba(0,0,0,.2);
  z-index: 1040;
}

/* Panel flotante */
.panel-flotante {
  position: fixed; right: 16px; bottom: 84px;
  width: min(420px, 92vw); max-height: 80vh;
  background: #fff; border: 1px solid #e9ecef; border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0,0,0,.2);
  z-index: 1040; display: flex; flex-direction: column;
}
.panel-header { padding: .75rem .9rem; border-bottom: 1px solid #f1f3f5; }
.panel-body   { padding: .75rem; overflow: auto; }

/* Modal */
.modal-backdrop-custom { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: grid; place-items: center; padding: 16px; z-index: 2000; }
.modal-card { width: min(640px, 96vw); background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,.35); }
.modal-card-header, .modal-card-footer { padding: .75rem .9rem; background: #f8f9fa; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #eef0f2; }
.modal-card-footer { border-top: 1px solid #eef0f2; border-bottom: none; }
.modal-card-body { padding: .9rem; max-height: 70vh; overflow: auto; }

/* Overlay de carga */
.loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,.85); z-index: 3000; }
.loading-card {
  background: #fff; border: 1px solid #e9ecef; border-radius: 12px;
  padding: 18px 22px; box-shadow: 0 10px 30px rgba(0,0,0,.12);
}

/* Fade del overlay */
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
