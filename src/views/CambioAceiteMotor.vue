<template>
  <div class="aceite-page container-fluid py-4 position-relative">

    <!-- ===== HERO (rectangular) ===== -->
    <div class="hero card border-0 shadow-sm overflow-hidden mb-3">
      <div class="hero-bg"></div>

      <div class="card-body position-relative py-3 px-3 px-sm-4">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <!-- Left -->
          <div class="d-flex align-items-start gap-2 minw-0">
            <button
              class="btn btn-outline-secondary btn-sm btn-rect"
              @click="$router.back()"
              title="Volver a la página anterior"
            >
              <i class="bi bi-arrow-left"></i>
              <span class="d-none d-sm-inline ms-1">Volver</span>
            </button>

            <div class="minw-0">
              <h1 class="h6 fw-black mb-0">Cambio de Aceite · Motor</h1>
              <div class="text-muted small">
                Revisión de atrasos por contrato. Puedes comparar con un archivo local.
              </div>

              <div class="metrics mt-2">
                <span class="badge text-bg-warning text-dark badge-rect">
                  <i class="bi bi-droplet-half me-1"></i>
                  Aceite &gt;{{ ACEITE_MIN_ATRASO }}: {{ viewAceite.length }}
                </span>
                <span class="badge text-bg-secondary badge-rect" v-if="fuente === 'firestore'">
                  <i class="bi bi-cloud-check me-1"></i> Fuente: Pública
                </span>
                <span class="badge text-bg-secondary badge-rect" v-else>
                  <i class="bi bi-hdd me-1"></i> Fuente: Local
                </span>
                <span class="badge text-bg-warning text-dark badge-rect" v-if="comparar.enabled">
                  <i class="bi bi-intersect me-1"></i> Comparación activa
                </span>
              </div>
            </div>
          </div>

          <!-- Right -->
          <div class="controls d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2 w-100 w-lg-auto">
            <div class="d-flex align-items-center gap-2 w-100">
              <label class="small text-secondary mb-0 d-none d-sm-inline">Fuente</label>
              <select v-model="fuente" class="form-select form-select-sm minw-190 flex-grow-1">
                <option value="firestore">Pública</option>
                <option value="local">Local</option>
              </select>

              <button
                class="btn btn-outline-secondary btn-sm btn-rect"
                @click="refreshRemote"
                :disabled="sync.loading || fuente!=='firestore'"
                title="Refrescar datos publicados"
              >
                <i class="bi bi-arrow-clockwise me-1"></i>
                <span class="d-none d-sm-inline">Refrescar</span>
              </button>
            </div>

            <div class="d-flex align-items-center gap-2 flex-wrap justify-content-sm-end">
              <div class="form-check form-switch d-flex align-items-center gap-2 mb-0">
                <input class="form-check-input" type="checkbox" id="chkComparar" v-model="comparar.enabled">
                <label class="form-check-label small text-secondary" for="chkComparar">
                  Comparar
                </label>
              </div>

              <label
                v-if="comparar.enabled"
                class="btn btn-outline-secondary btn-sm btn-rect mb-0"
                title="Subir archivo para comparar"
              >
                <i class="bi bi-upload me-1"></i> Archivo
                <input type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="onFileChangeCmp">
              </label>
            </div>
          </div>
        </div>

        <!-- Ayuda comparación -->
        <div v-if="comparar.enabled" class="helper mt-3">
          <div class="small">
            <i class="bi bi-info-circle me-2"></i>
            Vista: <strong>{{ fuente === 'firestore' ? 'Pública' : 'Local' }}</strong>.
            Se marcarán como <strong>Repetido</strong> si el registro existe también en
            <strong>{{ fuente === 'firestore' ? 'Archivo comparación (derecha)' : 'Publicado (izquierda)' }}</strong>.
          </div>
        </div>
      </div>
    </div>

    <!-- CONTENIDO -->
    <div v-if="!sync.loading" class="col-12">
      <!-- ===== Normal ===== -->
      <template v-if="!comparar.enabled">
        <div v-for="grupo in gruposPorContrato" :key="grupo.key" class="mb-4">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <h5 class="mb-0 d-flex align-items-center gap-2 flex-wrap">
              <span class="text-muted">Contrato:</span>
              <span class="fw-semibold">{{ grupo.nombre || 'Sin contrato' }}</span>
              <span
                class="badge badge-rect"
                :class="grupo.key==='__sin__' ? 'text-bg-warning text-dark' : 'text-bg-secondary'"
              >
                {{ grupo.items.length }}
              </span>
            </h5>
          </div>

          <div
            class="table-responsive border excel-area box-rect"
            :class="{ dense: ui.density==='compacto', mobile: isMobile }"
            :style="{ '--excel-font-scale': ui.fontScale }"
          >
            <table class="table table-hover align-middle mb-0 table-pro">
              <thead class="table-light sticky-head">
                <tr>
                  <th class="text-nowrap">Equipo</th>
                  <th class="text-nowrap">Tipo</th>
                  <th class="text-nowrap">Localización</th>
                  <th class="text-nowrap text-end pe-3">Días atraso</th>
                </tr>
              </thead>

              <tbody v-if="grupo.items.length">
                <tr v-for="(r, idx) in grupo.items" :key="idx" class="row-click" @click="openDetail(r)">
                  <td class="text-truncate" style="max-width: 380px" :title="r.eq ? equipoTitle(r.eq) : r.equipo">
                    <template v-if="r.eq">{{ equipoLabel(r.eq) }}</template>
                    <template v-else>
                      {{ r.equipo || '—' }}
                      <span class="badge bg-warning text-dark ms-1 badge-rect">Falta agregar equipo</span>
                    </template>

                    <span
                      v-if="comparar.enabled && isDuplicate(r)"
                      class="ms-2 badge bg-warning text-dark badge-rect"
                      :title="fuente==='firestore' ? 'También existe en Local (archivo comparación)' : 'También existe en Publicado (Firestore)'"
                    >
                      Repetido
                    </span>
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

        <div v-if="!gruposPorContrato.length" class="alert alert-secondary mt-5">
          No hay pendientes de cambio de aceite con atraso &gt; {{ ACEITE_MIN_ATRASO }} días.
        </div>
      </template>

      <!-- ===== Comparativa ===== -->
      <template v-else>
        <div class="row g-3">
          <!-- Izquierda -->
          <div class="col-12 col-xl-6">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h5 class="mb-0">
                {{ fuente==='firestore' ? 'Pública (Firestore)' : 'Local de trabajo' }}
                <span class="badge text-bg-secondary ms-2 badge-rect">{{ viewAceite.length }}</span>
              </h5>
            </div>

            <div v-for="grupo in gruposPorContrato" :key="'L-'+grupo.key" class="mb-4">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">
                  Contrato: <span class="fw-semibold">{{ grupo.nombre || 'Sin contrato' }}</span>
                  <span class="badge text-bg-light border ms-2 badge-rect">{{ grupo.items.length }}</span>
                </h6>
              </div>

              <div
                class="table-responsive border excel-area box-rect"
                :class="{ dense: ui.density==='compacto', mobile: isMobile }"
                :style="{ '--excel-font-scale': ui.fontScale }"
              >
                <table class="table table-hover align-middle mb-0 table-pro">
                  <thead class="table-light sticky-head">
                    <tr>
                      <th class="text-nowrap">Equipo</th>
                      <th class="text-nowrap">Tipo</th>
                      <th class="text-nowrap">Localización</th>
                      <th class="text-nowrap text-end pe-3">Días atraso</th>
                    </tr>
                  </thead>

                  <tbody v-if="grupo.items.length">
                    <tr v-for="(r, idx) in grupo.items" :key="'LI-'+idx" class="row-click" @click="openDetail(r)">
                      <td class="text-truncate" style="max-width: 380px" :title="r.eq ? equipoTitle(r.eq) : r.equipo">
                        <template v-if="r.eq">{{ equipoLabel(r.eq) }}</template>
                        <template v-else>
                          {{ r.equipo || '—' }}
                          <span class="badge bg-warning text-dark ms-1 badge-rect">Falta agregar equipo</span>
                        </template>
                        <span v-if="isDuplicate(r)" class="ms-2 badge bg-warning text-dark badge-rect">Repetido</span>
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

            <div v-if="!gruposPorContrato.length" class="alert alert-secondary">
              No hay pendientes de cambio de aceite con atraso &gt; {{ ACEITE_MIN_ATRASO }} días.
            </div>
          </div>

          <!-- Derecha -->
          <div class="col-12 col-xl-6">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h5 class="mb-0">
                {{ fuente==='firestore' ? 'Archivo comparación (Local)' : 'Pública (Firestore)' }}
                <span class="badge text-bg-secondary ms-2 badge-rect">{{ compareView.length }}</span>
              </h5>
              <small class="text-muted" v-if="fuente==='firestore'">Cárgalo arriba o desde el panel.</small>
            </div>

            <div v-for="grupo in gruposComparePorContrato" :key="'R-'+grupo.key" class="mb-4">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">
                  Contrato: <span class="fw-semibold">{{ grupo.nombre || 'Sin contrato' }}</span>
                  <span class="badge text-bg-light border ms-2 badge-rect">{{ grupo.items.length }}</span>
                </h6>
              </div>

              <div
                class="table-responsive border excel-area box-rect"
                :class="{ dense: ui.density==='compacto', mobile: isMobile }"
                :style="{ '--excel-font-scale': ui.fontScale }"
              >
                <table class="table table-hover align-middle mb-0 table-pro">
                  <thead class="table-light sticky-head">
                    <tr>
                      <th class="text-nowrap">Equipo</th>
                      <th class="text-nowrap">Tipo</th>
                      <th class="text-nowrap">Localización</th>
                      <th class="text-nowrap text-end pe-3">Días atraso</th>
                    </tr>
                  </thead>

                  <tbody v-if="grupo.items.length">
                    <tr v-for="(r, idx) in grupo.items" :key="'RI-'+idx" class="row-click">
                      <td class="text-truncate" style="max-width: 380px" :title="r.eq ? equipoTitle(r.eq) : r.equipo">
                        <template v-if="r.eq">{{ equipoLabel(r.eq) }}</template>
                        <template v-else>
                          {{ r.equipo || '—' }}
                          <span class="badge bg-warning text-dark ms-1 badge-rect">Falta agregar equipo</span>
                        </template>
                        <span v-if="isDuplicateInverse(r)" class="ms-2 badge bg-warning text-dark badge-rect">Repetido</span>
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
                        Sin equipos para comparar
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="!gruposComparePorContrato.length" class="alert alert-secondary">
              No hay equipos para comparar.
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ===== OVERLAY DE CARGA ===== -->
    <transition name="fade">
      <div v-if="sync.loading" class="loading-overlay d-flex flex-column align-items-center justify-content-center">
        <div class="loading-card text-center">
          <div class="spinner-border mb-3" role="status" aria-label="Cargando"></div>
          <div class="fw-semibold">Cargando datos…</div>
          <div class="small text-muted" v-if="sync.msg">{{ sync.msg }}</div>
        </div>
      </div>
    </transition>

    <!-- ===== FAB & Panel ===== -->
    <button class="btn btn-danger fab" @click="uiPanelAbierto = !uiPanelAbierto" title="Controles y cargas">
      <i class="bi" :class="uiPanelAbierto ? 'bi-x-lg' : 'bi-sliders'"></i>
    </button>

    <div class="panel-flotante box-rect" v-if="uiPanelAbierto">
      <div class="panel-header d-flex align-items-center justify-content-between">
        <strong>Controles y Cargas</strong>
        <button class="btn btn-sm btn-outline-secondary btn-rect" @click="uiPanelAbierto=false">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div class="panel-body">
        <div class="mb-3">
          <label class="form-label mb-1 fw-semibold">Tamaño de tabla</label>
          <div class="d-flex align-items-center gap-2">
            <input type="range" min="0.62" max="1.1" step="0.02" v-model.number="ui.fontScale" class="form-range" />
            <span class="text-muted small">{{ Math.round(ui.fontScale * 100) }}%</span>
          </div>
          <div class="form-text">En móvil se sugiere ≤ 75% para ver más columnas.</div>
        </div>

        <div class="mb-3">
          <label class="form-label mb-1 fw-semibold">Densidad</label>
          <select v-model="ui.density" class="form-select">
            <option value="normal">Normal</option>
            <option value="compacto">Compacto</option>
          </select>
        </div>

        <hr>

        <div class="mb-3">
          <label class="form-label fw-semibold">Subir Aceite (Excel/CSV)</label>
          <label class="btn btn-outline-secondary w-100 mb-2 btn-rect">
            <i class="bi bi-upload me-1"></i> Subir archivo
            <input type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="onFileChangeAceite" />
          </label>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="chkClearOnUpload" v-model="ui.clearOnUpload">
            <label class="form-check-label" for="chkClearOnUpload">Limpiar local al subir</label>
          </div>
        </div>

        <div class="mb-3">
          <div class="form-check form-switch mb-2">
            <input class="form-check-input" type="checkbox" id="chkCompararPanel" v-model="comparar.enabled">
            <label class="form-check-label" for="chkCompararPanel">Activar comparación</label>
          </div>
          <label class="form-label fw-semibold d-flex align-items-center gap-2">
            Archivo de comparación (Local)
            <span class="badge text-bg-light border badge-rect">Solo comparar</span>
          </label>
          <label class="btn btn-outline-secondary w-100 mb-1 btn-rect">
            <i class="bi bi-upload me-1"></i> Subir archivo de comparación
            <input type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="onFileChangeCmp" />
          </label>
        </div>

        <hr>

        <div class="mb-3">
          <label class="form-label fw-semibold">Sincronizar con Firestore</label>
          <div class="d-grid gap-2">
            <button class="btn btn-outline-dark btn-rect" :disabled="sync.loading" @click="pushAceite(false)">
              <i class="bi bi-cloud-upload me-1"></i> Publicar (upsert)
            </button>
            <button class="btn btn-outline-danger btn-rect" :disabled="sync.loading" @click="pushAceite(true)">
              <i class="bi bi-arrow-repeat me-1"></i> Reemplazar todo
            </button>
          </div>

          <div class="small mt-2" :class="sync.error ? 'text-danger' : 'text-muted'">
            <template v-if="sync.loading">Sincronizando… {{ sync.msg }}</template>
            <template v-else-if="sync.msg">{{ sync.msg }}</template>
          </div>
        </div>

        <hr>

        <div class="mb-2">
          <label class="form-label fw-semibold">Limpieza de datos locales</label>
          <div class="d-grid gap-2">
            <button class="btn btn-outline-danger btn-rect" @click="clearAceite">
              <i class="bi bi-trash me-1"></i> Limpiar Aceite
            </button>
          </div>
          <div class="small text-muted mt-2">Borra solo lo guardado en este navegador.</div>
        </div>
      </div>
    </div>

    <!-- ===== MODAL DETALLE ===== -->
    <div v-if="detail.open" class="modal-backdrop-custom" @click.self="closeDetail">
      <div class="modal-card modal-pro box-rect">
        <div class="modal-card-header">
          <div class="d-flex align-items-center gap-2">
            <span class="detail-icon"><i class="bi bi-droplet-half"></i></span>
            <strong>Detalle · Cambio de Aceite</strong>
          </div>
          <button class="btn btn-sm btn-outline-secondary btn-rect" @click="closeDetail">
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
                  <span class="badge bg-warning text-dark ms-1 badge-rect">Falta agregar equipo</span>
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
          <button class="btn btn-secondary btn-rect" @click="closeDetail">
            <i class="bi bi-x-circle me-1"></i> Cerrar
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
const ui = reactive({ fontScale: 0.85, density: "compacto", clearOnUpload: true });
const uiPanelAbierto = ref(false);
const sync = reactive({ loading: false, msg: "", error: false });
const fuente = ref("firestore");

/** Comparación **/
const comparar = reactive({
  enabled: false,
  rows: [],
  keysLocal: new Set(),
  keysRemote: new Set()
});

/** Responsive flag **/
const isMobile = ref(false);
function updateIsMobile() {
  isMobile.value = window.matchMedia("(max-width: 576px)").matches;
  if (isMobile.value && ui.fontScale > 0.75) ui.fontScale = 0.72;
}

/** Catálogos **/
const { equipos, contratos, idxEqByKey, loadCatalogos, equipoLabel, equipoTitle } = useCatalogos();

/** Datos **/
const aceiteLocal = ref([]);
const aceiteRemote = ref([]);

/** Detalle **/
const detail = reactive({ open: false, item: null });

onMounted(async () => {
  updateIsMobile(); window.addEventListener("resize", updateIsMobile);
  try {
    const raw = localStorage.getItem("gestor_aceite_v1");
    if (raw) aceiteLocal.value = JSON.parse(raw);
  } catch(e) { console.error(e); }
  await loadCatalogos();
  await refreshRemote();
  rebuildCompareRemoteKeys();
});
onBeforeUnmount(() => window.removeEventListener("resize", updateIsMobile));

watch(aceiteLocal, v => {
  try { localStorage.setItem("gestor_aceite_v1", JSON.stringify(v||[])); } catch(e) { console.error(e); }
  buildCompareLocalKeys();
}, {deep:true});

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

function clearAceiteSilently(){
  aceiteLocal.value = [];
  try { localStorage.removeItem("gestor_aceite_v1"); } catch(e) { console.error(e); }
}

async function onFileChangeAceite(e) {
  const file = e.target.files?.[0]; e.target.value = "";
  if (!file) return;

  try {
    sync.loading = true; sync.msg = 'Leyendo archivo…'; sync.error = false;

    if (ui.clearOnUpload) clearAceiteSilently();

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });
    const rows = parseAceiteFileToRows(wb);

    aceiteLocal.value = rows.map(r => {
      const eq = matchEquipoPorTexto(r.equipo);
      let contrato = null;
      if (eq?.contratoId) contrato = contratos.value.find(c => c.id === eq.contratoId) || null;
      return { ...r, eq, contratoId: contrato?.id || null, contratoNombre: contrato?.nombre || null };
    });

    fuente.value = 'local';
    sync.loading = false; sync.msg = `OK: ${aceiteLocal.value.length} fila(s) leídas.`;
  } catch (err) {
    console.error(err);
    sync.loading = false; sync.error = true;
    sync.msg = `Error al leer: ${err?.message || err}`;
    alert(sync.msg);
  }
}

async function onFileChangeCmp(e) {
  const file = e.target.files?.[0]; e.target.value = "";
  if (!file) return;

  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });
    const rows = parseAceiteFileToRows(wb);

    comparar.rows = rows.map(r => {
      const eq = matchEquipoPorTexto(r.equipo);
      let contrato = null;
      if (eq?.contratoId) contrato = contratos.value.find(c => c.id === eq.contratoId) || null;
      return { ...r, eq, contratoId: contrato?.id || null, contratoNombre: contrato?.nombre || null };
    });

    buildCompareLocalKeys();
  } catch (err) {
    console.error(err);
    alert(`Error al leer archivo comparación: ${err?.message || err}`);
  }
}

function equipoKeyFromRow(r){
  return r?.eq ? (plateKey(r.eq.patente) || plateKey(r.eq.equipo_text)) : plateKey(r?.equipo || "");
}
function signatureFromAceite(r){
  const ek = equipoKeyFromRow(r) || '';
  const tk = toKeyNoDash(toKey(String(r?.tipo || '')));
  return `E:${ek}|T:${tk}`;
}
function buildCompareLocalKeys() {
  const set = new Set();
  for (const r of aceiteCmpFiltradas.value) set.add(signatureFromAceite(r));
  comparar.keysLocal = set;
}
function rebuildCompareRemoteKeys() {
  const set = new Set();
  for (const r of aceiteRemoteFiltrado.value) set.add(signatureFromAceite(r));
  comparar.keysRemote = set;
}

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
    aceiteRemote.value = rows;
    sync.loading = false; sync.msg = "Firestore cargado.";
    rebuildCompareRemoteKeys();
  } catch (e) {
    sync.loading = false; sync.error = true; sync.msg = `Error: ${e?.message || e}`; console.error(e);
  }
}

const aceiteRemoteFiltrado = computed(() => (aceiteRemote.value || []).filter(x => Number(x.atraso_dias) > ACEITE_MIN_ATRASO));
const aceiteLocalFiltrado  = computed(() => (aceiteLocal.value || []).filter(x => Number(x.atraso_dias) > ACEITE_MIN_ATRASO));

const viewAceite = computed(() => (fuente.value === "firestore" ? aceiteRemoteFiltrado.value : aceiteLocalFiltrado.value));

const gruposPorContrato = computed(() => {
  const map = new Map();
  for (const r of viewAceite.value) {
    const key = r.contratoId || "__sin__";
    if (!map.has(key)) map.set(key, { key, nombre: r.contratoNombre, items: [] });
    map.get(key).items.push(r);
  }
  return Array.from(map.values()).sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
});

const aceiteCmpFiltradas = computed(() => (comparar.rows || []).filter(x => Number(x.atraso_dias) > ACEITE_MIN_ATRASO));

const compareView = computed(() => (fuente.value === 'firestore' ? aceiteCmpFiltradas.value : aceiteRemoteFiltrado.value));

const gruposComparePorContrato = computed(() => {
  const map = new Map();
  for (const r of compareView.value) {
    const key = r.contratoId || "__sin__";
    if (!map.has(key)) map.set(key, { key, nombre: r.contratoNombre || null, items: [] });
    map.get(key).items.push(r);
  }
  return Array.from(map.values()).sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
});

function isDuplicate(r) {
  if (!comparar.enabled) return false;
  const sig = signatureFromAceite(r);
  return fuente.value === 'firestore' ? comparar.keysLocal.has(sig) : comparar.keysRemote.has(sig);
}
function isDuplicateInverse(r) {
  if (!comparar.enabled) return false;
  const sig = signatureFromAceite(r);
  return fuente.value === 'firestore' ? comparar.keysRemote.has(sig) : comparar.keysLocal.has(sig);
}

function openDetail(item) { detail.item = item; detail.open = true; document.body.style.overflow = "hidden"; }
function closeDetail() { detail.open = false; detail.item = null; document.body.style.overflow = ""; }

function confirmAction(msg){ try { return window.confirm(msg); } catch { return true; } }
function clearAceite(){
  if (!confirmAction("¿Borrar datos locales de Aceite?")) return;
  clearAceiteSilently();
}

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

async function pushAceite(replace=false) {
  const source = aceiteLocalFiltrado.value; // publica siempre lo local filtrado
  const docs = source.map(r => {
    const equipoKey = equipoKeyFromRow(r) || 's/eq';
    const tipoKey = toKeyNoDash(toKey(String(r?.tipo || 'tipo')));
    const id = `${equipoKey}_oil_${tipoKey}`;
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
/* ===== Background ===== */
.aceite-page{
  min-height: calc(100vh - 56px);
  background:
    radial-gradient(1200px 650px at 15% 10%, rgba(220, 53, 69, 0.10), transparent 60%),
    radial-gradient(900px 550px at 85% 20%, rgba(13, 110, 253, 0.08), transparent 60%),
    linear-gradient(180deg, #ffffff, #fbfbfc);
}

/* ===== Rect helpers ===== */
.btn-rect{
  border-radius: 10px;
  font-weight: 800;
}
.badge-rect{
  border-radius: 10px;
  font-weight: 800;
}
.box-rect{
  border-radius: 12px !important;
}

/* ===== Hero ===== */
.hero{
  border-radius: 12px;
  position: relative;
}
.hero-bg{
  position:absolute;
  inset:0;
  background: linear-gradient(90deg, rgba(220,53,69,.10), rgba(170,25,40,.05));
}
.fw-black{ font-weight: 900; }
.metrics{ display:flex; flex-wrap:wrap; gap:.45rem; }

/* controls */
.controls{ max-width: 100%; }
.minw-190{ min-width: 190px; }
@media (max-width: 575.98px){
  .minw-190{ min-width: 0 !important; }
}

/* helper */
.helper{
  background: rgba(255,255,255,.78);
  border: 1px solid rgba(0,0,0,.06);
  border-radius: 12px;
  padding: .55rem .75rem;
}

/* ===== Table area ===== */
.excel-area{
  max-height: 70vh;
  font-size: calc(0.96rem * var(--excel-font-scale, 1));
}
.excel-area.dense :is(td, th){
  padding: 0.28rem 0.5rem !important;
  line-height: 1.1;
}
td, th{ white-space: nowrap; }
.sticky-head th{
  position: sticky;
  top: 0;
  background: var(--bs-light);
  z-index: 2;
}
.table-pro thead th{ font-weight: 900; }
.table-hover tbody tr:hover{ background-color: rgba(220,53,69,.04); }

/* mobile */
.excel-area.mobile{ font-size: calc(0.88rem * var(--excel-font-scale, 1)); }
@media (max-width: 576px){
  .excel-area.mobile :is(td, th){
    padding: 0.2rem 0.35rem !important;
    line-height: 1.05;
    font-size: 0.82rem;
  }
  .excel-area.mobile table{ table-layout: fixed; }
}

/* row click */
.row-click{ cursor: pointer; }
.row-click:hover{ background-color: rgba(13,110,253,.06) !important; }

/* ===== FAB & Panel ===== */
.fab{
  position: fixed;
  right: 16px;
  bottom: 16px;
  border-radius: 12px;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  box-shadow: 0 6px 18px rgba(0,0,0,.2);
  z-index: 1040;
}
.panel-flotante{
  position: fixed;
  right: 16px;
  bottom: 84px;
  width: min(420px, 92vw);
  max-height: 80vh;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(0,0,0,.2);
  z-index: 1040;
  display: flex;
  flex-direction: column;
}
.panel-header{
  padding: .75rem .9rem;
  border-bottom: 1px solid #f1f3f5;
}
.panel-body{
  padding: .75rem;
  overflow: auto;
}

/* ===== Modal ===== */
.modal-backdrop-custom{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 2000;
}
.modal-pro{
  border-radius: 12px;
  border: 0;
  box-shadow: 0 20px 60px rgba(0,0,0,.22);
}
.modal-card{
  width: min(720px, 96vw);
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,.35);
}
.modal-card-header, .modal-card-footer{
  padding: .75rem .9rem;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eef0f2;
}
.modal-card-footer{
  border-top: 1px solid #eef0f2;
  border-bottom: none;
}
.modal-card-body{
  padding: .9rem;
  max-height: 70vh;
  overflow: auto;
}
.detail-icon{
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  background: rgba(220,53,69,.12);
  color:#dc3545;
}

/* ===== Loading overlay ===== */
.loading-overlay{
  position: fixed;
  inset: 0;
  background: rgba(255,255,255,.85);
  z-index: 3000;
}
.loading-card{
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 18px 22px;
  box-shadow: 0 10px 30px rgba(0,0,0,.12);
}

/* Fade */
.fade-enter-active, .fade-leave-active{ transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to{ opacity: 0; }
</style>
