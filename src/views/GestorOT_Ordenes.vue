<!-- src/views/GestorOT_Ordenes.vue -->
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

      <h1 class="h4 fw-semibold mb-0">Gestor OT · Órdenes de Trabajo</h1>

      <div class="d-flex flex-wrap gap-3 align-items-center">
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

        <!-- Toggle comparar -->
        <div class="form-check form-switch d-flex align-items-center gap-2">
          <input class="form-check-input" type="checkbox" id="chkComparar" v-model="comparar.enabled">
          <label class="form-check-label small text-muted" for="chkComparar">
            Comparar con archivo
          </label>
        </div>

        <span class="badge bg-dark">OTs ≥{{ OTS_MIN_DIAS }}: {{ viewOTs.length }}</span>
      </div>
    </div>

    <!-- Ayuda para comparación -->
    <div v-if="comparar.enabled" class="alert alert-light d-flex align-items-center justify-content-between py-2 px-3 border">
      <div class="small">
        <i class="bi bi-info-circle me-2"></i>
        Vista: <strong>{{ fuente === 'firestore' ? 'Publica' : 'Local' }}</strong>.
        Se marcarán como <strong>Repetido</strong> si la OT existe también en
        <strong>{{ fuente === 'firestore' ? 'Archivo comparación (derecha)' : 'Publicado (izquierda)' }}</strong>.
      </div>
      <label
        class="btn btn-sm btn-outline-secondary mb-0"
        title="Subir archivo para comparar"
      >
        <i class="bi bi-upload"></i> Archivo de comparación
        <input type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="onFileChangeCmp">
      </label>
    </div>

    <!-- CONTENIDO: solo cuando NO está cargando -->
    <div v-if="!sync.loading" class="col-12">
      <!-- Modo normal (una tabla) -->
      <template v-if="!comparar.enabled">
        <div v-for="grupo in gruposOTsPorContrato" :key="grupo.key" class="mb-4">
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
                  <th>Folio OT</th>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Equipo</th>
                  <th class="text-end pe-3">Días</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody v-if="grupo.items.length">
                <tr
                  v-for="(r, idx) in grupo.items"
                  :key="idx"
                  class="row-click"
                  @click="openDetail(r)"
                >
                  <td>
                    {{ r.folio_ot || '—' }}
                    <span
                      v-if="comparar.enabled && isDuplicate(r)"
                      class="ms-2 badge bg-warning text-dark"
                      :title="fuente==='firestore' ? 'También existe en Local (archivo comparación)' : 'También existe en Publicado (Firestore)'"
                    >
                      Repetido
                    </span>
                  </td>
                  <td>{{ fmtFechaSlash(r.del) }}</td>
                  <td class="text-truncate" style="max-width: 220px" :title="r.usuario_genero">
                    {{ r.usuario_genero || '—' }}
                  </td>
                  <td
                    class="text-truncate"
                    style="max-width: 320px"
                    :title="r.eq ? equipoTitle(r.eq) : r.equipo_inmueble"
                  >
                    <template v-if="r.eq">{{ equipoLabel(r.eq) }}</template>
                    <template v-else>
                      {{ r.equipo_inmueble || '—' }}
                      <span class="badge bg-warning text-dark ms-1">Falta agregar equipo</span>
                    </template>
                  </td>
                  <td class="text-end pe-3" :class="r.vencido ? 'text-danger fw-bold' : ''">{{ r.dias_abiertas }}</td>
                  <td class="text-truncate" style="max-width: 220px" :title="r.responsable">
                    {{ r.responsable || '—' }}
                  </td>
                </tr>
              </tbody>
              <tbody v-else>
                <tr>
                  <td colspan="8" class="text-center text-muted py-4">Sin datos para este contrato</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="!gruposOTsPorContrato.length" class="alert alert-secondary mt-5">
          No hay OTs con {{ OTS_MIN_DIAS }} o más días abiertas.
        </div>
      </template>

      <!-- Modo comparativa (dos tablas lado a lado) -->
      <template v-else>
        <div class="row g-3">
          <!-- Izquierda: fuente principal (Publica si fuente==='firestore', si no Local) -->
          <div class="col-12 col-xl-6">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h5 class="mb-0">
                {{ fuente==='firestore' ? 'Publicada (Firestore)' : 'Local de trabajo' }}
                <span class="badge text-bg-secondary ms-2">{{ viewOTs.length }}</span>
              </h5>
            </div>

            <div v-for="grupo in gruposOTsPorContrato" :key="'L-'+grupo.key" class="mb-4">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">
                  Contrato:
                  <span class="fw-semibold">{{ grupo.nombre || 'Sin contrato' }}</span>
                  <span class="badge text-bg-light ms-2">{{ grupo.items.length }}</span>
                </h6>
              </div>

              <div
                class="table-responsive border rounded excel-area"
                :class="{ dense: ui.density==='compacto', mobile: isMobile }"
                :style="{ '--excel-font-scale': ui.fontScale }"
              >
                <table class="table table-hover align-middle mb-0">
                  <thead class="table-light sticky-head">
                    <tr>
                      <th>Folio OT</th>
                      <th>Fecha</th>
                      <th>Usuario</th>
                      <th>Equipo</th>
                      <th class="text-end pe-3">Días</th>
                      <th>Resp.</th>
                    </tr>
                  </thead>
                  <tbody v-if="grupo.items.length">
                    <tr
                      v-for="(r, idx) in grupo.items"
                      :key="'LI-'+idx"
                      class="row-click"
                      @click="openDetail(r)"
                    >
                      <td>
                        {{ r.folio_ot || '—' }}
                        <span v-if="isDuplicate(r)" class="ms-2 badge bg-warning text-dark">Repetido</span>
                      </td>
                      <td>{{ fmtFechaSlash(r.del) }}</td>
                      <td class="text-truncate" style="max-width: 160px" :title="r.usuario_genero">
                        {{ r.usuario_genero || '—' }}
                      </td>
                      <td class="text-truncate" style="max-width: 260px" :title="r.eq ? equipoTitle(r.eq) : r.equipo_inmueble">
                        <template v-if="r.eq">{{ equipoLabel(r.eq) }}</template>
                        <template v-else>
                          {{ r.equipo_inmueble || '—' }}
                          <span class="badge bg-warning text-dark ms-1">Falta agregar</span>
                        </template>
                      </td>
                      <td class="text-end pe-3" :class="r.vencido ? 'text-danger fw-bold' : ''">{{ r.dias_abiertas }}</td>
                      <td class="text-truncate" style="max-width: 160px" :title="r.responsable">
                        {{ r.responsable || '—' }}
                      </td>
                    </tr>
                  </tbody>
                  <tbody v-else>
                    <tr>
                      <td colspan="8" class="text-center text-muted py-4">Sin datos para este contrato</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="!gruposOTsPorContrato.length" class="alert alert-secondary">
              No hay OTs con {{ OTS_MIN_DIAS }} o más días abiertas.
            </div>
          </div>

          <!-- Derecha: “el otro lado” de la comparación -->
          <div class="col-12 col-xl-6">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h5 class="mb-0">
                {{ fuente==='firestore' ? 'Archivo comparación (Local)' : 'Publicada (Firestore)' }}
                <span class="badge text-bg-secondary ms-2">{{ compareView.length }}</span>
              </h5>
              <small class="text-muted" v-if="fuente==='firestore'">
                Cárgalo en panel o arriba (botón “Archivo de comparación”)
              </small>
            </div>

            <div v-for="grupo in gruposComparePorContrato" :key="'R-'+grupo.key" class="mb-4">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">
                  Contrato:
                  <span class="fw-semibold">{{ grupo.nombre || 'Sin contrato' }}</span>
                  <span class="badge text-bg-light ms-2">{{ grupo.items.length }}</span>
                </h6>
              </div>

              <div
                class="table-responsive border rounded excel-area"
                :class="{ dense: ui.density==='compacto', mobile: isMobile }"
                :style="{ '--excel-font-scale': ui.fontScale }"
              >
                <table class="table table-hover align-middle mb-0">
                  <thead class="table-light sticky-head">
                    <tr>
                      <th>Folio OT</th>
                      <th>Fecha</th>
                      <th>Usuario</th>
                      <th>Equipo</th>
                      <th class="text-end pe-3">Días</th>
                      <th>Resp.</th>
                    </tr>
                  </thead>
                  <tbody v-if="grupo.items.length">
                    <tr
                      v-for="(r, idx) in grupo.items"
                      :key="'RI-'+idx"
                      class="row-click"
                    >
                      <td>
                        {{ r.folio_ot || '—' }}
                        <span v-if="isDuplicateInverse(r)" class="ms-2 badge bg-warning text-dark">Repetido</span>
                      </td>
                      <td>{{ fmtFechaSlash(r.del) }}</td>
                      <td class="text-truncate" style="max-width: 160px" :title="r.usuario_genero">
                        {{ r.usuario_genero || '—' }}
                      </td>
                      <td class="text-truncate" style="max-width: 260px" :title="r.eq ? equipoTitle(r.eq) : r.equipo_inmueble">
                        <template v-if="r.eq">{{ equipoLabel(r.eq) }}</template>
                        <template v-else>
                          {{ r.equipo_inmueble || '—' }}
                          <span class="badge bg-warning text-dark ms-1">Falta agregar</span>
                        </template>
                      </td>
                      <td class="text-end pe-3" :class="r.vencido ? 'text-danger fw-bold' : ''">{{ r.dias_abiertas }}</td>
                      <td class="text-truncate" style="max-width: 160px" :title="r.responsable">
                        {{ r.responsable || '—' }}
                      </td>
                    </tr>
                  </tbody>
                  <tbody v-else>
                    <tr>
                      <td colspan="8" class="text-center text-muted py-4">Sin datos para este contrato</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="!gruposComparePorContrato.length" class="alert alert-secondary">
              No hay OTs para comparar.
            </div>
          </div>
        </div>
      </template>
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
    <button
      class="btn btn-danger fab"
      @click="uiPanelAbierto = !uiPanelAbierto"
      title="Controles y cargas"
    >
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

        <!-- Carga OTs (LOCAL principal) -->
        <div class="mb-3">
          <label class="form-label fw-semibold">Subir OTs (Excel/CSV) — Local de trabajo</label>
          <label class="btn btn-outline-secondary w-100 mb-2">
            <i class="bi bi-upload"></i> Subir OTs
            <input type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="onFileChangeOTs" />
          </label>
          <div class="form-text">Estas son las que puedes publicar o sincronizar (reemplazar) en Firestore.</div>
        </div>

        <!-- Carga OTs (archivo de comparación) -->
        <div class="mb-3">
          <div class="form-check form-switch mb-2">
            <input class="form-check-input" type="checkbox" id="chkCompararPanel" v-model="comparar.enabled">
            <label class="form-check-label" for="chkCompararPanel">Activar comparación</label>
          </div>
          <label class="form-label fw-semibold d-flex align-items-center gap-2">
            Archivo de comparación (Local)
            <span class="badge text-bg-light">Solo para comparar; no se publica</span>
          </label>
          <label class="btn btn-outline-secondary w-100 mb-1">
            <i class="bi bi-upload"></i> Subir archivo de comparación
            <input type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="onFileChangeCmp" />
          </label>
        </div>

        <hr>

        <!-- Sincronización Firestore -->
        <div class="mb-3">
          <label class="form-label fw-semibold">Sincronizar con Firestore</label>
          <div class="d-grid gap-2">
            <button class="btn btn-outline-dark" :disabled="sync.loading" @click="pushOTs(false)">
              <i class="bi bi-cloud-upload"></i> Publicar OTs (upsert)
            </button>
            <button class="btn btn-outline-danger" :disabled="sync.loading" @click="pushOTs(true)">
              <i class="bi bi-arrow-repeat"></i> Sincronizar OTs (reemplazo)
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
            <button class="btn btn-outline-danger" @click="clearOTs">
              <i class="bi bi-trash"></i> Limpiar OTs
            </button>
          </div>
          <div class="small text-muted mt-2">Borra solo lo guardado en este navegador.</div>
        </div>
      </div>
    </div>

    <!-- MODAL DETALLE OT -->
    <div v-if="detail.open" class="modal-backdrop-custom" @click.self="closeDetail">
      <div class="modal-card">
        <div class="modal-card-header">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-clipboard-check"></i>
            <strong>Detalle OT</strong>
          </div>
          <button class="btn btn-sm btn-outline-secondary" @click="closeDetail">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-card-body">
          <div class="row g-3" v-if="detail.item">
            <div class="col-12 col-md-6">
              <div class="small text-muted">Folio OT</div>
              <div class="fw-semibold">
                {{ detail.item.folio_ot || '—' }}
                <span
                  v-if="comparar.enabled && isDuplicate(detail.item)"
                  class="ms-2 badge bg-warning text-dark"
                >
                  Repetido
                </span>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="small text-muted">Fecha</div>
              <div class="fw-semibold">{{ fmtFechaSlash(detail.item.del) || '—' }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="small text-muted">Días abiertas</div>
              <div class="fw-bold" :class="detail.item.vencido ? 'text-danger' : ''">
                {{ detail.item.dias_abiertas }}
              </div>
            </div>

            <div class="col-12">
              <div class="small text-muted">Equipo</div>
              <div class="fw-semibold">
                <template v-if="detail.item.eq">{{ equipoTitle(detail.item.eq) }}</template>
                <template v-else>
                  {{ detail.item.equipo_inmueble || '—' }}
                  <span class="badge bg-warning text-dark ms-1">Falta agregar equipo</span>
                </template>
              </div>
            </div>

            <div class="col-12 col-md-6">
              <div class="small text-muted">Contrato</div>
              <div class="fw-semibold">{{ detail.item.contratoNombre || '—' }}</div>
            </div>

            <div class="col-12 col-md-6">
              <div class="small text-muted">Responsable / Usuario</div>
              <div class="fw-semibold text-truncate">
                {{ detail.item.responsable || '—' }} · {{ detail.item.usuario_genero || '—' }}
              </div>
            </div>

            <!-- Lectura relacionada (si existe) -->
            <div class="col-12">
              <hr class="my-2" />
              <div class="d-flex align-items-center gap-2 mb-1">
                <i class="bi bi-speedometer2"></i>
                <strong>Lectura del equipo</strong>
                <span
                  v-if="detail.lectura"
                  class="badge"
                  :class="detail.lectura.atraso_dias > 0 ? 'bg-danger' : 'bg-success'"
                >
                  {{ detail.lectura.atraso_dias > 0 ? ('Atrasada ' + detail.lectura.atraso_dias + ' d') : 'Al día' }}
                </span>
                <span v-else class="badge bg-secondary">Sin lectura publicada</span>
              </div>
              <template v-if="detail.lectura">
                <div class="row g-3">
                  <div class="col-4">
                    <div class="small text-muted">Última lectura</div>
                    <div class="fw-semibold">{{ detail.lectura.ultima_lectura ?? '—' }}</div>
                  </div>
                  <div class="col-4">
                    <div class="small text-muted">Última fecha</div>
                    <div class="fw-semibold">{{ fmtFechaSlash(detail.lectura.ultima_fecha) || '—' }}</div>
                  </div>
                  <div class="col-4">
                    <div class="small text-muted">Próxima toma</div>
                    <div class="fw-semibold">{{ fmtFechaSlash(detail.lectura.proxima_toma) || '—' }}</div>
                  </div>
                </div>
              </template>
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
  OTS_MIN_DIAS, DIAS_VENCIMIENTO,
  FIRE_COL_OTS, FIRE_COL_LEC,
  todayISO, fmtFechaSlash, diffDias,
  useCatalogos, parseOTFileToRows, plateKey, toKey, toKeyNoDash, extractBracketCode
} from "@/services/useGestorShared";

/** ===== UI ===== **/
const ui = reactive({ fontScale: 0.85, density: "compacto" });
const uiPanelAbierto = ref(false);
const sync = reactive({ loading: false, msg: "", error: false });
const fuente = ref("firestore");
const isMobile = ref(false);
function updateIsMobile() {
  isMobile.value = window.matchMedia("(max-width: 576px)").matches;
  if (isMobile.value && ui.fontScale > 0.75) ui.fontScale = 0.72;
}

/** ===== Catálogos ===== **/
const { equipos, contratos, idxEqByKey, loadCatalogos, matchEquipoPorTexto, equipoLabel, equipoTitle } = useCatalogos();

/** ===== Local & Remote ===== **/
const otRows = ref([]);            // local principal (trabajo)
const remoteOTs = ref([]);         // publicado (Firestore)
const remoteLecturasAll = ref([]); // lecturas para modal
const detail = reactive({ open: false, item: null, lectura: null });

/** ===== Comparación ===== **/
const comparar = reactive({
  enabled: false,
  rows: [],             // archivo de comparación (local aparte)
  keysLocal: new Set(), // firmas del archivo comparación
  keysRemote: new Set() // firmas construidas desde remoteOTs
});

/* ===== Carga inicial ===== */
onMounted(async () => {
  updateIsMobile(); window.addEventListener("resize", updateIsMobile);
  try {
    const raw = localStorage.getItem("gestor_ot_rows_v9");
    if (raw) otRows.value = JSON.parse(raw);
  } catch(e) { console.error(e); }
  await loadCatalogos();
  await refreshRemote();
  rebuildCompareRemoteKeys();
});
onBeforeUnmount(() => window.removeEventListener("resize", updateIsMobile));

/* ===== Persistencia local ===== */
watch(otRows, v => {
  try { localStorage.setItem("gestor_ot_rows_v9", JSON.stringify(v||[])); } catch(e) { console.error(e); }
}, {deep:true});

/* =========================
   Subida local OTs (trabajo)
========================= */
async function onFileChangeOTs(e) {
  const file = e.target.files?.[0]; if (!file) return;
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array" });
  otRows.value = parseOTFileToRows(wb);
  e.target.value = "";
}

/* =========================
   Subida archivo de comparación
========================= */
async function onFileChangeCmp(e) {
  const file = e.target.files?.[0]; if (!file) return;
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array" });
  comparar.rows = parseOTFileToRows(wb);
  buildCompareLocalKeys();
  e.target.value = "";
}

/* ===== Enriquecimiento LOCAL (trabajo) ===== */
const enrichedOTsLocal = computed(() => {
  const hoyISO = todayISO();
  return otRows.value.map(r => {
    const eq = matchEquipoPorTexto(r.equipo_inmueble);
    let contrato = null;
    if (eq?.contratoId) contrato = contratos.value.find(c => c.id === eq.contratoId) || null;

    const diasCalc = r.del ? diffDias(r.del, hoyISO) : 0;
    const dias_abiertas = Number.isFinite(r.dias_abiertas_origen) && r.dias_abiertas_origen > 0
      ? r.dias_abiertas_origen : diasCalc;
    const estadoBase = r.estado || "Abierta";
    const vencido = estadoBase.toLowerCase() !== "cerrada" && dias_abiertas > DIAS_VENCIMIENTO;

    return { ...r, eq, contratoId: contrato?.id || null, contratoNombre: contrato?.nombre || null, dias_abiertas, vencido };
  });
});
const filteredOTsLocal = computed(() => enrichedOTsLocal.value.filter(r => r.dias_abiertas >= OTS_MIN_DIAS));

/* ===== Enriquecimiento COMPARACIÓN (archivo aparte) ===== */
const enrichedOTsCmp = computed(() => {
  const hoyISO = todayISO();
  return comparar.rows.map(r => {
    const eq = matchEquipoPorTexto(r.equipo_inmueble);
    const diasCalc = r.del ? diffDias(r.del, hoyISO) : 0;
    const dias_abiertas = Number.isFinite(r.dias_abiertas_origen) && r.dias_abiertas_origen > 0
      ? r.dias_abiertas_origen : diasCalc;
    const vencido = (r.estado || 'Abierta').toLowerCase() !== 'cerrada' && dias_abiertas > DIAS_VENCIMIENTO;
    return { ...r, eq, dias_abiertas, vencido };
  });
});
const filteredOTsCmp = computed(() => enrichedOTsCmp.value.filter(r => r.dias_abiertas >= OTS_MIN_DIAS));

/* ===== Firmas ===== */
function signatureFromRow(r) {
  if (r?.folio_ot) return `F:${toKeyNoDash(r.folio_ot)}`;
  const eqKey = equipoKeyFromRow(r) || '';
  const fecha = r?.del || '';
  return `E:${eqKey}|D:${fecha}`;
}
function buildCompareLocalKeys() {
  const set = new Set();
  for (const r of filteredOTsCmp.value) set.add(signatureFromRow(r));
  comparar.keysLocal = set;
}
function rebuildCompareRemoteKeys() {
  const set = new Set();
  for (const r of remoteOTs.value) set.add(signatureFromRow(r));
  comparar.keysRemote = set;
}

/* ===== Carga Firestore (ver publicado) ===== */
async function refreshRemote() {
  try {
    sync.loading = true; sync.msg = "Cargando Firestore…"; sync.error = false;

    const [snapOT, snapLEC] = await Promise.all([
      getDocs(collection(db, FIRE_COL_OTS)),
      getDocs(collection(db, FIRE_COL_LEC)),
    ]);

    // OTs publicadas
    const mappedOTs = [];
    snapOT.forEach(d => {
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
      mappedOTs.push({
        folio_ot: r.folio_ot || null,
        del: r.fecha || null,
        usuario_genero: r.usuario_genero || null,
        responsable: r.responsable || null,
        localizacion: r.localizacion || null,
        estado: r.estado || null,
        equipo_inmueble: r.equipoLabel || r.equipoNombre || r.equipoPatente || "",
        dias_abiertas: Number(r.dias_abiertas) || (r.fecha ? diffDias(r.fecha, todayISO()) : 0),
        vencido: !!r.vencido,
        eq,
        contratoId: r.contratoId || null,
        contratoNombre: r.contratoNombre || null,
      });
    });
    remoteOTs.value = mappedOTs.filter(r => r.dias_abiertas >= OTS_MIN_DIAS);

    // Lecturas (modal)
    const allLEC = [];
    snapLEC.forEach(d => {
      const l = d.data() || {};
      allLEC.push({
        equipo: l.equipoLabel || l.equipoNombre || l.equipoPatente || "",
        ultima_lectura: l.ultima_lectura ?? null,
        ultima_fecha: l.fecha_ultima || null,
        proxima_toma: l.fecha_proxima || null,
        atraso_dias: Number(l.atraso_dias) || 0,
        eq: l.equipoId ? (equipos.value.find(e => e.id === l.equipoId) || null) : null,
      });
    });
    remoteLecturasAll.value = allLEC;

    sync.loading = false; sync.msg = "Firestore cargado.";
    rebuildCompareRemoteKeys();
  } catch (e) {
    sync.loading = false; sync.error = true; sync.msg = `Error: ${e?.message || e}`;
    console.error(e);
  }
}

/* ===== Vista principal ===== */
const viewOTs = computed(() => (fuente.value === "firestore" ? remoteOTs.value : filteredOTsLocal.value));
const gruposOTsPorContrato = computed(() => {
  const map = new Map();
  for (const r of viewOTs.value) {
    const key = r.contratoId || "__sin__";
    if (!map.has(key)) map.set(key, { key, nombre: r.contratoNombre, items: [] });
    map.get(key).items.push(r);
  }
  return Array.from(map.values()).sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
});

/* ===== Vista comparativa (lado derecho) ===== */
const compareView = computed(() => {
  // Si estoy viendo Publica, comparo con archivo de comparación (local aparte).
  // Si estoy viendo Local, comparo con Publicada (remoteOTs).
  return fuente.value === 'firestore' ? filteredOTsCmp.value : remoteOTs.value;
});
const gruposComparePorContrato = computed(() => {
  const map = new Map();
  for (const r of compareView.value) {
    const key = r.contratoId || "__sin__";
    const nombre = r.contratoNombre || null;
    if (!map.has(key)) map.set(key, { key, nombre, items: [] });
    map.get(key).items.push(r);
  }
  return Array.from(map.values()).sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
});

/* ===== Duplicados (badges) ===== */
function isDuplicate(r) {
  if (!comparar.enabled) return false;
  const sig = signatureFromRow(r);
  return fuente.value === 'firestore' ? comparar.keysLocal.has(sig) : comparar.keysRemote.has(sig);
}
function isDuplicateInverse(r) {
  if (!comparar.enabled) return false;
  const sig = signatureFromRow(r);
  return fuente.value === 'firestore' ? comparar.keysRemote.has(sig) : comparar.keysLocal.has(sig);
}

/* ===== Modal ===== */
function equipoStrongKeyFromRowText(texto) {
  const br = extractBracketCode(texto);
  if (br) return plateKey(br) || toKeyNoDash(br) || toKey(br);
  const all = toKey(texto);
  const m = all.match(/[A-Z0-9-]{3,}/g);
  if (m && m.length) return plateKey(m[m.length - 1]);
  return plateKey(all);
}
function findLecturaForOT(otRow) {
  if (otRow.eq?.id) {
    const byId = remoteLecturasAll.value.find(l => l.eq?.id === otRow.eq.id);
    if (byId) return byId;
  }
  const eqKey = otRow.eq
    ? plateKey(otRow.eq.patente || otRow.eq.equipo_text)
    : equipoStrongKeyFromRowText(otRow.equipo_inmueble);
  if (!eqKey) return null;
  return (
    remoteLecturasAll.value.find(l => {
      const k = plateKey(l.eq?.patente || l.eq?.equipo_text || l.equipo || "");
      return k && (k === eqKey || k.includes(eqKey) || eqKey.includes(k));
    }) || null
  );
}
function openDetail(item) {
  detail.item = item;
  detail.lectura = findLecturaForOT(item);
  detail.open = true;
  document.body.style.overflow = "hidden";
}
function closeDetail() {
  detail.open = false;
  detail.item = null;
  detail.lectura = null;
  document.body.style.overflow = "";
}

/* ===== Local clear ===== */
function confirmAction(msg) { try { return window.confirm(msg); } catch { return true; } }
function clearOTs() {
  if (!confirmAction("¿Borrar OTs cargadas localmente?")) return;
  otRows.value = [];
  try { localStorage.removeItem("gestor_ot_rows_v9"); } catch (e) { console.error(e); }
}

/* ===== Utilidades de claves ===== */
function equipoKeyFromRow(r) {
  return r?.eq ? (plateKey(r.eq.patente) || plateKey(r.eq.equipo_text)) : equipoStrongKeyFromRowText(r?.equipo_inmueble || '');
}

/* ===== Publicación Firestore (usa batchedUpsert) ===== */
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
    sync.msg = `Escribiendo ${Math.min(i + CHUNK, docs.length)} / ${docs.length}…`;
    await batch.commit();
  }
  if (replace && currentIds.size) {
    const ids = Array.from(currentIds);
    for (let i = 0; i < ids.length; i += 450) {
      const batch = writeBatch(db);
      const chunk = ids.slice(i, i + 450);
      chunk.forEach(id => batch.delete(doc(db, colName, id)));
      sync.msg = `Eliminando restos ${Math.min(i + 450, ids.length)} / ${ids.length}…`;
      await batch.commit();
    }
  }
  sync.loading = false; sync.msg = `OK: ${docs.length} documento(s) ${replace ? "reemplazados" : "actualizados"}.`;
  if (fuente.value === "firestore") await refreshRemote();
}

async function pushOTs(replace=false) {
  // SIEMPRE publica lo que tienes en "Local de trabajo" (filteredOTsLocal)
  // (Así puedes subir otro documento y reemplazar lo publicado con replace=true)
  const docs = filteredOTsLocal.value.map(r => {
    const equipoKey = equipoKeyFromRow(r);
    const id = (r.folio_ot && r.folio_ot.length >= 1)
      ? toKeyNoDash(r.folio_ot)
      : `${r.del || "s/fecha"}_${equipoKey || "s/eq"}`;
    return {
      id,
      data: {
        folio_ot: r.folio_ot || null,
        fecha: r.del || null,
        estado: r.estado || null,
        responsable: r.responsable || null,
        usuario_genero: r.usuario_genero || null,
        localizacion: r.localizacion || null,
        equipoId: r.eq?.id || null,
        equipoLabel: r.eq ? (r.eq.equipo_text || r.eq.patente) : (r.equipo_inmueble || null),
        equipoPatente: r.eq?.patente || null,
        equipoNombre: r.eq?.equipo_text || null,
        equipoKey: equipoKey || null,
        contratoId: r.contratoId || null,
        contratoNombre: r.contratoNombre || null,
        dias_abiertas: r.dias_abiertas,
        vencido: r.vencido ?? (r.dias_abiertas > DIAS_VENCIMIENTO),
        raw: { equipo_inmueble: r.equipo_inmueble ?? null }
      }
    };
  });

  await batchedUpsert(FIRE_COL_OTS, docs, replace);
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

/* FAB y panel flotante */
.fab {
  position: fixed; right: 16px; bottom: 16px;
  border-radius: 999px; width: 52px; height: 52px;
  display: grid; place-items: center;
  box-shadow: 0 6px 18px rgba(0,0,0,.2);
  z-index: 1040;
}
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
.modal-backdrop-custom {
  position: fixed; inset: 0; background: rgba(0,0,0,.4);
  display: grid; place-items: center; padding: 16px; z-index: 2000;
}
.modal-card {
  width: min(640px, 96vw);
  background: #fff; border-radius: 14px; overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,.35);
}
.modal-card-header, .modal-card-footer {
  padding: .75rem .9rem; background: #f8f9fa;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid #eef0f2;
}
.modal-card-footer { border-top: 1px solid #eef0f2; border-bottom: none; }
.modal-card-body { padding: .9rem; max-height: 70vh; overflow: auto; }

/* Overlay de carga */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255,255,255,.85);
  z-index: 3000;
}
.loading-card {
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 18px 22px;
  box-shadow: 0 10px 30px rgba(0,0,0,.12);
}

/* Fade del overlay */
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
