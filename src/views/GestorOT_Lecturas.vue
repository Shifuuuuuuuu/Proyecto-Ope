<template>
  <div class="gestor-lecturas-page container-fluid py-4 position-relative">

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
              <h1 class="h6 fw-black mb-0">Gestor OT · Lecturas de Equipos</h1>
              <div class="text-muted small">
                Lecturas con atraso mínimo, agrupadas por contrato. Comparación opcional con archivo.
              </div>

              <div class="metrics mt-2">
                <span class="badge text-bg-danger badge-rect">
                  <i class="bi bi-exclamation-triangle me-1"></i>
                  Lecturas &gt;{{ LEC_MIN_ATRASO }}: {{ viewLecturas.length }}
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
            Se marcarán como <strong>Repetido</strong> si la lectura existe también en
            <strong>{{ fuente === 'firestore' ? 'Archivo comparación (derecha)' : 'Publicado (izquierda)' }}</strong>.
          </div>
        </div>
      </div>
    </div>

    <!-- CONTENIDO -->
    <div v-if="!sync.loading" class="col-12">

      <!-- ===== Modo normal ===== -->
      <template v-if="!comparar.enabled">
        <div v-for="grupo in gruposLecturasPorContrato" :key="grupo.key" class="mb-4">
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
                  <th>Equipo</th>
                  <th>Última</th>
                  <th>Última fecha</th>
                  <th>Próxima</th>
                  <th class="text-end pe-3">Atraso</th>
                </tr>
              </thead>

              <tbody v-if="grupo.items.length">
                <tr v-for="(l, idx) in grupo.items" :key="idx" class="row-click" @click="openDetail(l)">
                  <td class="text-truncate" style="max-width: 380px" :title="l.eq ? equipoTitle(l.eq) : l.equipo">
                    <template v-if="l.eq">{{ equipoLabel(l.eq) }}</template>
                    <template v-else>
                      {{ l.equipo || '—' }}
                      <span class="badge bg-warning text-dark ms-1 badge-rect">Falta agregar equipo</span>
                    </template>

                    <span
                      v-if="comparar.enabled && isDuplicate(l)"
                      class="ms-2 badge bg-warning text-dark badge-rect"
                      :title="fuente==='firestore' ? 'También existe en Local (archivo comparación)' : 'También existe en Publicado (Firestore)'"
                    >
                      Repetido
                    </span>
                  </td>

                  <td>{{ l.ultima_lectura ?? '—' }}</td>
                  <td>{{ fmtFechaSlash(l.ultima_fecha) }}</td>
                  <td>{{ fmtFechaSlash(l.proxima_toma) }}</td>

                  <td class="text-end pe-3" :class="l.atraso_dias>0 ? 'text-danger fw-bold' : ''">
                    {{ l.atraso_dias }} d
                  </td>
                </tr>
              </tbody>

              <tbody v-else>
                <tr>
                  <td colspan="7" class="text-center text-muted py-4">
                    Sin lecturas con atraso &gt; {{ LEC_MIN_ATRASO }} días
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="!gruposLecturasPorContrato.length" class="alert alert-secondary mt-5">
          No hay lecturas con atraso &gt; {{ LEC_MIN_ATRASO }} días.
        </div>
      </template>

      <!-- ===== Modo comparativa ===== -->
      <template v-else>
        <div class="row g-3">
          <!-- Izquierda -->
          <div class="col-12 col-xl-6">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h5 class="mb-0">
                {{ fuente==='firestore' ? 'Pública (Firestore)' : 'Local de trabajo' }}
                <span class="badge text-bg-secondary ms-2 badge-rect">{{ viewLecturas.length }}</span>
              </h5>
            </div>

            <div v-for="grupo in gruposLecturasPorContrato" :key="'L-'+grupo.key" class="mb-4">
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
                      <th>Equipo</th>
                      <th>Última</th>
                      <th>Última fecha</th>
                      <th>Próxima</th>
                      <th class="text-end pe-3">Atraso</th>
                    </tr>
                  </thead>

                  <tbody v-if="grupo.items.length">
                    <tr v-for="(l, idx) in grupo.items" :key="'LI-'+idx" class="row-click" @click="openDetail(l)">
                      <td class="text-truncate" style="max-width: 380px" :title="l.eq ? equipoTitle(l.eq) : l.equipo">
                        <template v-if="l.eq">{{ equipoLabel(l.eq) }}</template>
                        <template v-else>
                          {{ l.equipo || '—' }}
                          <span class="badge bg-warning text-dark ms-1 badge-rect">Falta agregar equipo</span>
                        </template>
                        <span v-if="isDuplicate(l)" class="ms-2 badge bg-warning text-dark badge-rect">Repetido</span>
                      </td>
                      <td>{{ l.ultima_lectura ?? '—' }}</td>
                      <td>{{ fmtFechaSlash(l.ultima_fecha) }}</td>
                      <td>{{ fmtFechaSlash(l.proxima_toma) }}</td>
                      <td class="text-end pe-3" :class="l.atraso_dias>0 ? 'text-danger fw-bold' : ''">{{ l.atraso_dias }} d</td>
                    </tr>
                  </tbody>

                  <tbody v-else>
                    <tr>
                      <td colspan="7" class="text-center text-muted py-4">
                        Sin lecturas con atraso &gt; {{ LEC_MIN_ATRASO }} días
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="!gruposLecturasPorContrato.length" class="alert alert-secondary">
              No hay lecturas con atraso &gt; {{ LEC_MIN_ATRASO }} días.
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
                      <th>Equipo</th>
                      <th>Última</th>
                      <th>Última fecha</th>
                      <th>Próxima</th>
                      <th class="text-end pe-3">Atraso</th>
                    </tr>
                  </thead>

                  <tbody v-if="grupo.items.length">
                    <tr v-for="(l, idx) in grupo.items" :key="'RI-'+idx" class="row-click">
                      <td class="text-truncate" style="max-width: 380px" :title="l.eq ? equipoTitle(l.eq) : l.equipo">
                        <template v-if="l.eq">{{ equipoLabel(l.eq) }}</template>
                        <template v-else>
                          {{ l.equipo || '—' }}
                          <span class="badge bg-warning text-dark ms-1 badge-rect">Falta agregar equipo</span>
                        </template>
                        <span v-if="isDuplicateInverse(l)" class="ms-2 badge bg-warning text-dark badge-rect">Repetido</span>
                      </td>
                      <td>{{ l.ultima_lectura ?? '—' }}</td>
                      <td>{{ fmtFechaSlash(l.ultima_fecha) }}</td>
                      <td>{{ fmtFechaSlash(l.proxima_toma) }}</td>
                      <td class="text-end pe-3" :class="l.atraso_dias>0 ? 'text-danger fw-bold' : ''">{{ l.atraso_dias }} d</td>
                    </tr>
                  </tbody>

                  <tbody v-else>
                    <tr>
                      <td colspan="7" class="text-center text-muted py-4">Sin lecturas para comparar</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="!gruposComparePorContrato.length" class="alert alert-secondary">
              No hay lecturas para comparar.
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- OVERLAY -->
    <transition name="fade">
      <div v-if="sync.loading" class="loading-overlay d-flex flex-column align-items-center justify-content-center">
        <div class="loading-card text-center box-rect">
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
          <div class="form-text">En móvil se sugiere ≤ 75%.</div>
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
          <label class="form-label fw-semibold">Subir Lecturas (Excel/CSV)</label>
          <label class="btn btn-outline-success w-100 mb-2 btn-rect">
            <i class="bi bi-upload me-1"></i> Subir Lecturas
            <input type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="onFileChangeLecturas" />
          </label>
          <div class="form-text">Estas son las que puedes publicar o sincronizar.</div>
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
            <button class="btn btn-outline-dark btn-rect" :disabled="sync.loading" @click="pushLecturas(false)">
              <i class="bi bi-cloud-upload me-1"></i> Publicar (upsert)
            </button>
            <button class="btn btn-outline-danger btn-rect" :disabled="sync.loading" @click="pushLecturas(true)">
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
            <button class="btn btn-outline-danger btn-rect" @click="clearLecturas">
              <i class="bi bi-trash me-1"></i> Limpiar Lecturas
            </button>
          </div>
          <div class="small text-muted mt-2">Borra solo lo guardado en este navegador.</div>
        </div>
      </div>
    </div>

    <!-- MODAL DETALLE -->
    <div v-if="detail.open" class="modal-backdrop-custom" @click.self="closeDetail">
      <div class="modal-card modal-pro box-rect">
        <div class="modal-card-header">
          <div class="d-flex align-items-center gap-2">
            <span class="detail-icon"><i class="bi bi-speedometer2"></i></span>
            <strong>Detalle Lectura</strong>
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

            <div class="col-4">
              <div class="small text-muted">Última</div>
              <div class="fw-semibold">{{ detail.item.ultima_lectura ?? '—' }}</div>
            </div>

            <div class="col-4">
              <div class="small text-muted">Última fecha</div>
              <div class="fw-semibold">{{ fmtFechaSlash(detail.item.ultima_fecha) || '—' }}</div>
            </div>

            <div class="col-4">
              <div class="small text-muted">Próxima toma</div>
              <div class="fw-semibold">{{ fmtFechaSlash(detail.item.proxima_toma) || '—' }}</div>
            </div>

            <div class="col-12 col-md-6">
              <div class="small text-muted">Atraso</div>
              <div class="fw-bold" :class="detail.item.atraso_dias>0 ? 'text-danger' : 'text-success'">
                {{ Number(detail.item.atraso_dias) || 0 }} día(s)
              </div>
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
  LEC_MIN_ATRASO,
  FIRE_COL_LEC,
  fmtFechaSlash, todayISO,
  useCatalogos, plateKey, toKey, toKeyNoDash
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
const lecturas = ref([]);          // local principal (trabajo)
const remoteLecturas = ref([]);    // publicado (Firestore)
const detail = reactive({ open: false, item: null });

/** ===== Comparación ===== **/
const comparar = reactive({
  enabled: false,
  rows: [],
  keysLocal: new Set(),
  keysRemote: new Set()
});

/* ===== Carga inicial ===== */
onMounted(async () => {
  updateIsMobile(); window.addEventListener("resize", updateIsMobile);
  try {
    const raw = localStorage.getItem("gestor_lecturas_v8");
    if (raw) lecturas.value = JSON.parse(raw);
  } catch(e) { console.error(e); }
  await loadCatalogos();
  await refreshRemote();
  rebuildCompareRemoteKeys();
});
onBeforeUnmount(() => window.removeEventListener("resize", updateIsMobile));

/* ===== Persistencia local ===== */
watch(lecturas, v => {
  try { localStorage.setItem("gestor_lecturas_v8", JSON.stringify(v||[])); } catch(e) { console.error(e); }
  buildCompareLocalKeys();
}, {deep:true});

/* =========================================================
   ===============  PARSER (FILA 1 ENCABEZADO)  =============
   ========================================================= */

// Helpers
function normHeader(s='') {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumberMaybe(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/\./g, '').replace(/\s/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseFechaDMY(v) {
  if (!v && v !== 0) return null;

  // Date real
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0,10);

  const s = String(v).trim();

  // dd/mm/yyyy o dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[/.\\-](\d{1,2})[/.\\-](\d{2,4})$/);
  if (m) {
    const d = String(m[1]).padStart(2,'0');
    const mo = String(m[2]).padStart(2,'0');
    const y = m[3].length === 2 ? ('20'+m[3]) : m[3];
    return `${y}-${mo}-${d}`;
  }

  // Excel serial date
  const n = Number(s);
  if (Number.isFinite(n) && n > 25569) {
    const dt = new Date(Math.round((n - 25569) * 86400 * 1000));
    if (!isNaN(dt)) return dt.toISOString().slice(0,10);
  }
  return null;
}

function diffDiasISO(hoyISO, refISO) {
  if (!hoyISO || !refISO) return 0;
  const a = new Date(hoyISO + 'T00:00:00');
  const b = new Date(refISO + 'T00:00:00');
  return Math.round((a - b) / 86400000);
}

// Aliases de encabezados aceptados
const HEADER_ALIASES = {
  equipo: ['equipo', 'descripcion equipo', 'descripcion', 'nombre equipo'],
  unidad: ['unidad'],
  lectura_acumulada: ['lectura acumulada', 'acumulada', 'acumulado'],
  lectura_base: ['lectura base', 'base'],
  ultima_lectura: [
    'ultima lectura del contador','última lectura del contador',
    'ultima lectura','última lectura','lectura','lectura actual'
  ],
  ultima_fecha: [
    'ultima fecha de actualizacion','última fecha de actualizacion',
    'ultima fecha de actualización','ultima fecha','fecha ultima',
    'fecha de actualizacion','fecha de actualización'
  ],
  proxima_toma: [
    'proxima toma de lectura','próxima toma de lectura','proxima toma',
    'próxima toma','proxima lectura','próxima lectura'
  ],
};

function resolveColumns(headers) {
  const map = {};
  const norm = headers.map(h => normHeader(String(h ?? '')));

  for (const key of Object.keys(HEADER_ALIASES)) {
    const candidates = HEADER_ALIASES[key];
    let idx = -1;

    for (const cand of candidates) {
      const i = norm.findIndex(h => h === cand);
      if (i !== -1) { idx = i; break; }
    }

    // fallback: "equipo..." (por si el encabezado viene con texto extra)
    if (idx === -1 && key === 'equipo') {
      idx = norm.findIndex(h => h.startsWith('equipo'));
    }

    if (idx !== -1) map[key] = idx;
  }

  return map;
}

// ✅ Parser principal: SIEMPRE toma fila 1 como encabezado
function parseLecturasFileToRows(workbook) {
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) throw new Error('No se encontró ninguna hoja en el archivo.');
  const ws = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null });
  if (!rows.length) throw new Error('La hoja está vacía.');

  const headerRow = rows[0];
  if (!Array.isArray(headerRow) || headerRow.every(c => c === null || String(c).trim() === '')) {
    throw new Error('La fila 1 está vacía: no hay encabezados.');
  }

  const dataRows = rows.slice(1).filter(r => Array.isArray(r));
  const col = resolveColumns(headerRow);

  if (col.equipo === undefined) {
    const vistos = headerRow.map(h => String(h ?? '').trim()).join(' | ');
    throw new Error('No se encontró la columna "Equipo". Encabezados leídos: ' + vistos);
  }

  const hoy = todayISO();
  const out = [];

  for (const r of dataRows) {
    if (!r || r.every(c => c === null || String(c).trim() === '')) continue;

    const get = (k) => (k in col) ? r[col[k]] : null;

    const equipo = String(get('equipo') ?? '').trim();
    if (!equipo) continue;

    const ultimaLectura  = parseNumberMaybe(get('ultima_lectura'));
    const ultimaFechaISO = parseFechaDMY(get('ultima_fecha'));
    const proximaISO     = parseFechaDMY(get('proxima_toma'));
    const lecturaAcum    = parseNumberMaybe(get('lectura_acumulada'));
    const lecturaBase    = parseNumberMaybe(get('lectura_base'));

    const ref = proximaISO || ultimaFechaISO || hoy;
    const atraso = diffDiasISO(hoy, ref);

    out.push({
      equipo,
      unidad: get('unidad') || null,
      lectura_acumulada: lecturaAcum,
      lectura_base: lecturaBase,
      ultima_lectura: ultimaLectura,
      ultima_fecha: ultimaFechaISO,
      proxima_toma: proximaISO,
      atraso_dias: atraso,
    });
  }

  if (!out.length) throw new Error('Se leyeron 0 filas de datos bajo la fila de encabezados.');
  return out;
}

async function onFileChangeLecturas(e) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;

  try {
    sync.loading = true; sync.msg = 'Leyendo archivo…'; sync.error = false;

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });

    // ✅ usa tu parser actual
    lecturas.value = parseLecturasFileToRows(wb);
    fuente.value = 'local';
    sync.loading = false;
    sync.msg = `OK: ${lecturas.value.length} fila(s) leídas.`;
  } catch (err) {
    console.error(err);
    sync.loading = false; sync.error = true;
    sync.msg = `Error al leer: ${err?.message || err}`;
    alert(sync.msg);
  }
}

/* ===== Archivo de comparación ===== */
async function onFileChangeCmp(e) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;

  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });
    comparar.rows = parseLecturasFileToRows(wb);
    buildCompareLocalKeys();
  } catch (err) {
    console.error(err);
    alert(`Error al leer archivo comparación: ${err?.message || err}`);
  }
}

/* ===== Enriquecimiento ===== */
const lecturasLocalEnriquecidas = computed(() => {
  return lecturas.value.map(l => {
    const eq = matchEquipoPorTexto(l.equipo);
    let contrato = null;
    if (eq?.contratoId) contrato = contratos.value.find(c => c.id === eq.contratoId) || null;
    return { ...l, eq, contratoId: contrato?.id || null, contratoNombre: contrato?.nombre || null };
  });
});
const lecturasFiltradasLocal = computed(() => lecturasLocalEnriquecidas.value.filter(l => Number(l.atraso_dias) > LEC_MIN_ATRASO));

const lecturasCmpEnriquecidas = computed(() => {
  return comparar.rows.map(l => {
    const eq = matchEquipoPorTexto(l.equipo);
    return { ...l, eq };
  });
});
const lecturasCmpFiltradas = computed(() => lecturasCmpEnriquecidas.value.filter(l => Number(l.atraso_dias) > LEC_MIN_ATRASO));

function equipoKeyFromRow(l){
  return l.eq ? (plateKey(l.eq.patente) || plateKey(l.eq.equipo_text)) : plateKey(l.equipo || "");
}
function signatureFromLectura(l) {
  const equipoKey = equipoKeyFromRow(l) || '';
  const fechaRef = l.ultima_fecha || l.proxima_toma || '';
  return `E:${equipoKey}|F:${fechaRef}`;
}
function buildCompareLocalKeys() {
  const set = new Set();
  for (const r of lecturasCmpFiltradas.value) set.add(signatureFromLectura(r));
  comparar.keysLocal = set;
}
function rebuildCompareRemoteKeys() {
  const set = new Set();
  for (const r of remoteLecturas.value) set.add(signatureFromLectura(r));
  comparar.keysRemote = set;
}

/* ===== Firestore ===== */
async function refreshRemote() {
  try {
    sync.loading = true; sync.msg = "Cargando Firestore…"; sync.error = false;

    const snapLEC = await getDocs(collection(db, FIRE_COL_LEC));
    const allLEC = [];
    snapLEC.forEach(d => {
      const l = d.data() || {};
      let eq = null;
      if (l.equipoId) eq = equipos.value.find(e => e.id === l.equipoId) || null;
      if (!eq && l.equipoPatente) {
        const pk = plateKey(l.equipoPatente);
        eq = idxEqByKey.value.get(pk) || idxEqByKey.value.get(toKey(l.equipoPatente)) || null;
      }
      if (!eq && l.equipoNombre) {
        const nk = toKey(l.equipoNombre);
        eq = idxEqByKey.value.get(nk) || idxEqByKey.value.get(toKeyNoDash(nk)) || null;
      }
      allLEC.push({
        equipo: l.equipoLabel || l.equipoNombre || l.equipoPatente || "",
        ultima_lectura: l.ultima_lectura ?? null,
        ultima_fecha: l.fecha_ultima || null,
        proxima_toma: l.fecha_proxima || null,
        atraso_dias: Number(l.atraso_dias) || 0,
        eq,
        contratoId: l.contratoId || null,
        contratoNombre: l.contratoNombre || null,
      });
    });
    remoteLecturas.value = allLEC.filter(l => Number(l.atraso_dias) > LEC_MIN_ATRASO);

    sync.loading = false; sync.msg = "Firestore cargado.";
    rebuildCompareRemoteKeys();
  } catch (e) {
    sync.loading = false; sync.error = true; sync.msg = `Error: ${e?.message || e}`;
    console.error(e);
  }
}

/* ===== Vista ===== */
const viewLecturas = computed(() => (fuente.value === "firestore" ? remoteLecturas.value : lecturasFiltradasLocal.value));
const gruposLecturasPorContrato = computed(() => {
  const map = new Map();
  for (const r of viewLecturas.value) {
    const key = r.contratoId || "__sin__";
    if (!map.has(key)) map.set(key, { key, nombre: r.contratoNombre, items: [] });
    map.get(key).items.push(r);
  }
  return Array.from(map.values()).sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
});

const compareView = computed(() => (fuente.value === 'firestore' ? lecturasCmpFiltradas.value : remoteLecturas.value));
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

function isDuplicate(r) {
  if (!comparar.enabled) return false;
  const sig = signatureFromLectura(r);
  return fuente.value === 'firestore' ? comparar.keysLocal.has(sig) : comparar.keysRemote.has(sig);
}
function isDuplicateInverse(r) {
  if (!comparar.enabled) return false;
  const sig = signatureFromLectura(r);
  return fuente.value === 'firestore' ? comparar.keysRemote.has(sig) : comparar.keysLocal.has(sig);
}

/* ===== Modal ===== */
function openDetail(item) { detail.item = item; detail.open = true; document.body.style.overflow = "hidden"; }
function closeDetail() { detail.open = false; detail.item = null; document.body.style.overflow = ""; }

/* ===== Clear ===== */
function confirmAction(msg){ try { return window.confirm(msg); } catch { return true; } }
function clearLecturas(){
  if (!confirmAction("¿Borrar Lecturas cargadas localmente?")) return;
  lecturas.value = [];
  try { localStorage.removeItem("gestor_lecturas_v8"); } catch(e) { console.error(e); }
}

/* ===== Push ===== */
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
  sync.loading = false; sync.msg = `OK: ${docs.length} documento(s) ${replace ? 'reemplazados' : 'actualizados'}.`;
  if (fuente.value === "firestore") await refreshRemote();
}

async function pushLecturas(replace=false) {
  const source = lecturasFiltradasLocal.value;
  const docs = source.map(l => {
    const equipoKey = equipoKeyFromRow(l);
    const fechaRef = l.ultima_fecha || l.proxima_toma || todayISO();
    const id = `${equipoKey || 's/eq'}_${fechaRef}`;
    return {
      id,
      data: {
        fecha_ultima: l.ultima_fecha || null,
        fecha_proxima: l.proxima_toma || null,
        ultima_lectura: l.ultima_lectura ?? null,
        atraso_dias: Number(l.atraso_dias) || 0,
        equipoId: l.eq?.id || null,
        equipoLabel: l.eq ? (l.eq.equipo_text || l.eq.patente) : (l.equipo || null),
        equipoPatente: l.eq?.patente || null,
        equipoNombre: l.eq?.equipo_text || null,
        equipoKey: equipoKey || null,
        contratoId: l.contratoId || null,
        contratoNombre: l.contratoNombre || null,
        raw: { equipo: l.equipo ?? null },
      }
    };
  });
  await batchedUpsert(FIRE_COL_LEC, docs, replace);
}
</script>

<style scoped>
/* ===== Background ===== */
.gestor-lecturas-page{
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

