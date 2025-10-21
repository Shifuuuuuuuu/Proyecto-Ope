<!-- src/views/GestorOT.vue -->
<template>
  <div class="container-fluid py-4">
    <!-- Top bar -->
    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-2">
      <h1 class="h4 fw-semibold mb-0">Gestor OT · Órdenes de Trabajo</h1>
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <div class="d-flex align-items-center gap-2">
          <label class="form-label mb-0 small text-muted">Fuente:</label>
          <select v-model="fuente" class="form-select form-select-sm" style="width: 190px">
            <option value="firestore">Publica</option>
            <option value="local">Local</option>
          </select>
          <button class="btn btn-sm btn-outline-secondary" @click="refreshRemote" :disabled="sync.loading || fuente!=='firestore'">
            <i class="bi bi-arrow-clockwise"></i> Refrescar
          </button>
        </div>
        <span class="badge bg-dark">OTs ≥{{ OTS_MIN_DIAS }}: {{ viewOTs.length }}</span>
        <span class="badge bg-danger">Lecturas &gt;{{ LEC_MIN_ATRASO }}: {{ viewLecturas.length }}</span>
      </div>
    </div>

    <div class="row g-3">
      <!-- IZQUIERDA: OTs por contrato -->
      <div class="col-12 col-xxl-7">
        <div v-for="grupo in gruposOTsPorContrato" :key="grupo.key" class="mb-4">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <h5 class="mb-0">
              Contrato:
              <span class="fw-semibold">{{ grupo.nombre || 'Sin contrato' }}</span>
              <span class="badge ms-2" :class="grupo.key==='__sin__' ? 'bg-warning text-dark' : 'bg-secondary'">
                {{ grupo.items.length }}
              </span>
            </h5>
          </div>

          <!-- Tabla responsive (se mantiene en móvil) -->
          <div
            class="table-responsive border rounded excel-area"
            :class="{
              dense: ui.density==='compacto',
              mobile: isMobile
            }"
            :style="{'--excel-font-scale': ui.fontScale}"
          >
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light sticky-head">
                <tr>
                  <th class="text-nowrap">Folio OT</th>
                  <th class="text-nowrap">Fecha</th>
                  <th class="text-nowrap">Usuario</th>
                  <th class="text-nowrap">Equipo</th>
                  <th class="text-nowrap text-end pe-3">Días</th>
                  <th class="text-nowrap">Responsable</th>
                </tr>
              </thead>
              <tbody v-if="grupo.items.length">
                <tr
                  v-for="(r, idx) in grupo.items"
                  :key="idx"
                  class="row-click"
                  @click="openDetail('ot', r)"
                >
                  <td class="text-nowrap">{{ r.folio_ot || '—' }}</td>
                  <td class="text-nowrap">{{ fmtFechaSlash(r.del) }}</td>
                  <td class="text-truncate" :title="r.usuario_genero" style="max-width: 220px">{{ r.usuario_genero || '—' }}</td>
                  <td class="text-truncate" :title="r.eq ? equipoTitle(r.eq) : r.equipo_inmueble" style="max-width: 320px">
                    <template v-if="r.eq">{{ equipoLabel(r.eq) }}</template>
                    <template v-else>
                      {{ r.equipo_inmueble || '—' }}
                      <span class="badge bg-warning text-dark ms-1">Falta agregar equipo</span>
                    </template>
                  </td>
                  <td class="text-nowrap text-danger fw-bold text-end pe-3">{{ r.dias_abiertas }}</td>
                  <td class="text-truncate" :title="r.responsable" style="max-width: 220px">{{ r.responsable || '—' }}</td>
                </tr>
              </tbody>
              <tbody v-else>
                <tr><td colspan="8" class="text-center text-muted py-4">Sin datos para este contrato</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="!gruposOTsPorContrato.length" class="alert alert-secondary">
          No hay OTs con {{ OTS_MIN_DIAS }} o más días abiertas.
        </div>
      </div>

      <!-- DERECHA: Lecturas por contrato (equipo) -->
      <div class="col-12 col-xxl-5">
        <div v-for="grupo in gruposLecturasPorContrato" :key="grupo.key" class="mb-4">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <h5 class="mb-0">
              Contrato:
              <span class="fw-semibold">{{ grupo.nombre || 'Sin contrato' }}</span>
              <span class="badge ms-2" :class="grupo.key==='__sin__' ? 'bg-warning text-dark' : 'bg-secondary'">
                {{ grupo.items.length }}
              </span>
            </h5>
          </div>

          <!-- Tabla responsive (se mantiene en móvil) -->
          <div
            class="table-responsive border rounded excel-area"
            :class="{
              dense: ui.density==='compacto',
              mobile: isMobile
            }"
            :style="{'--excel-font-scale': ui.fontScale}"
          >
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light sticky-head">
                <tr>
                  <th class="text-nowrap">Equipo</th>
                  <th class="text-nowrap">Última</th>
                  <th class="text-nowrap">Próxima</th>
                  <th class="text-nowrap text-end pe-3">Atraso</th>
                </tr>
              </thead>
              <tbody v-if="grupo.items.length">
                <tr
                  v-for="(l, idx) in grupo.items"
                  :key="idx"
                  class="row-click"
                  @click="openDetail('lec', l)"
                >
                  <td class="text-truncate" :title="l.eq ? equipoTitle(l.eq) : l.equipo" style="max-width: 300px">
                    <template v-if="l.eq">{{ equipoLabel(l.eq) }}</template>
                    <template v-else>
                      {{ l.equipo || '—' }}
                      <span class="badge bg-warning text-dark ms-1">Falta agregar equipo</span>
                    </template>
                  </td>
                  <td class="text-nowrap">{{ l.ultima_lectura ?? '—' }}</td>
                  <td class="text-nowrap">{{ fmtFechaSlash(l.proxima_toma) }}</td>
                  <td class="text-nowrap text-danger fw-bold text-end pe-3">{{ l.atraso_dias }} d</td>
                </tr>
              </tbody>
              <tbody v-else>
                <tr><td colspan="7" class="text-center text-muted py-4">Sin lecturas con atraso &gt; {{ LEC_MIN_ATRASO }} días</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="!gruposLecturasPorContrato.length" class="alert alert-secondary">
          No hay lecturas con atraso &gt; {{ LEC_MIN_ATRASO }} días.
        </div>
      </div>
    </div>

    <!-- FAB & Panel -->
    <button class="btn btn-danger fab" @click="uiPanelAbierto = !uiPanelAbierto" title="Controles y cargas">
      <i class="bi" :class="uiPanelAbierto ? 'bi-x-lg' : 'bi-sliders'"></i>
    </button>

    <!-- Panel flotante -->
    <div class="panel-flotante" v-if="uiPanelAbierto">
      <div class="panel-header d-flex align-items-center justify-content-between">
        <strong>Controles y Cargas</strong>
        <button class="btn btn-sm btn-outline-secondary" @click="uiPanelAbierto=false"><i class="bi bi-x-lg"></i></button>
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
          <label class="form-label fw-semibold">Subir OTs (Excel/CSV)</label>
          <label class="btn btn-outline-secondary w-100 mb-2">
            <i class="bi bi-upload"></i> Subir OTs
            <input type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="onFileChangeOTs" />
          </label>
        </div>
        <div class="mb-3">
          <label class="form-label fw-semibold">Subir Lecturas (Excel/CSV)</label>
          <label class="btn btn-outline-success w-100 mb-2">
            <i class="bi bi-upload"></i> Subir Lecturas
            <input type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="onFileChangeLecturas" />
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
            <button class="btn btn-outline-dark" :disabled="sync.loading" @click="pushLecturas(false)">
              <i class="bi bi-cloud-upload"></i> Publicar Lecturas (upsert)
            </button>
            <button class="btn btn-outline-danger" :disabled="sync.loading" @click="pushOTs(true)">
              <i class="bi bi-arrow-repeat"></i> Sincronizar OTs (reemplazo)
            </button>
            <button class="btn btn-outline-danger" :disabled="sync.loading" @click="pushLecturas(true)">
              <i class="bi bi-arrow-repeat"></i> Sincronizar Lecturas (reemplazo)
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
            <button class="btn btn-outline-danger" @click="clearOTs"><i class="bi bi-trash"></i> Limpiar OTs</button>
            <button class="btn btn-outline-danger" @click="clearLecturas"><i class="bi bi-trash"></i> Limpiar Lecturas</button>
            <button class="btn btn-danger" @click="clearTodo"><i class="bi bi-x-octagon"></i> Limpiar TODO</button>
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
            <i class="bi" :class="detail.type==='ot' ? 'bi-clipboard-check' : 'bi-speedometer2'"></i>
            <strong>
              {{ detail.type==='ot' ? 'Detalle OT' : 'Detalle Lectura' }}
            </strong>
          </div>
          <button class="btn btn-sm btn-outline-secondary" @click="closeDetail"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-card-body">
          <!-- OT -->
          <template v-if="detail.type==='ot'">
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <div class="small text-muted">Folio OT</div>
                <div class="fw-semibold">{{ detail.item.folio_ot || '—' }}</div>
              </div>
              <div class="col-6 col-md-3">
                <div class="small text-muted">Fecha</div>
                <div class="fw-semibold">{{ fmtFechaSlash(detail.item.del) || '—' }}</div>
              </div>
              <div class="col-6 col-md-3">
                <div class="small text-muted">Días abiertas</div>
                <div class="fw-bold text-danger">{{ detail.item.dias_abiertas }}</div>
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

              <!-- Sección Lectura relacionada -->
              <div class="col-12">
                <hr class="my-2">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <i class="bi bi-speedometer2"></i>
                  <strong>Lectura del equipo</strong>
                  <span v-if="detail.lectura"
                        class="badge"
                        :class="detail.lectura.atraso_dias > 0 ? 'bg-danger' : 'bg-success'">
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
          </template>

          <!-- LECTURA -->
          <template v-else>
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
          </template>
        </div>
        <div class="modal-card-footer">
          <button class="btn btn-secondary" @click="closeDetail"><i class="bi bi-x-circle"></i> Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as XLSX from "xlsx";
import { computed, onMounted, reactive, ref, watch, onBeforeUnmount } from "vue";

/* ===== Firestore ===== */
import {
  getDocs, collection, doc, writeBatch, serverTimestamp
} from "firebase/firestore";
import { db } from "@/firebase/config";

/** ===== Config ===== **/
const OTS_MIN_DIAS          = 8;
const LEC_MIN_ATRASO        = 30;
const DIAS_VENCIMIENTO      = 7;
const LECTURA_INTERVAL_DIAS = 7;
const FIRE_COL_OTS = "gestor_ot_public";
const FIRE_COL_LEC = "gestor_lecturas_public";

/** ===== Storage Keys ===== **/
const STORAGE_OTS_KEY = "gestor_ot_rows_v9";
const STORAGE_LEC_KEY = "gestor_lecturas_v8";

/** ===== UI & estado ===== **/
const ui = reactive({ fontScale: 0.85, density: "compacto" });
const uiPanelAbierto = ref(false);
const sync = reactive({ loading: false, msg: "", error: false });
const fuente = ref("firestore"); // 'firestore' | 'local'

/** Responsive flag */
const isMobile = ref(false);
function updateIsMobile() {
  isMobile.value = window.matchMedia("(max-width: 576px)").matches;
  // tipografía más comprimida por defecto en móvil para ver más columnas
  if (isMobile.value && ui.fontScale > 0.75) ui.fontScale = 0.72;
}

/** ===== Datos locales ===== **/
const otRows = ref([]);
const lecturas = ref([]);

/** ===== Datos remotos (Firestore) ===== **/
const remoteOTs = ref([]);           // filtradas para vista
const remoteLecturas = ref([]);      // filtradas para vista
const remoteLecturasAll = ref([]);   // TODAS las lecturas publicadas (para modal)

/** ===== Catálogos ===== **/
const equipos = ref([]);     // {id, equipo_text, patente, contratoId?}
const contratos = ref([]);   // {id, nombre}

/** ===== Índices ===== **/
const idxEqByKey = ref(new Map());
const idxCtByNombre = ref(new Map());

/** ===== Modal Detalle ===== **/
const detail = reactive({ open: false, type: "ot", item: null, lectura: null });
function openDetail(type, item) {
  detail.type = type;
  detail.item = item;
  // si es OT, preparamos la lectura asociada
  if (type === "ot") detail.lectura = findLecturaForOT(item);
  else detail.lectura = null;
  detail.open = true; document.body.style.overflow = "hidden";
}
function closeDetail() { detail.open = false; detail.item = null; detail.lectura = null; document.body.style.overflow = ""; }

/* ==================== Utils ==================== */
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtFechaSlash(v) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-");
    return `${d}/${m}/${y}`;
  }
  return v;
}
function todayISO(){ return toISODate(new Date()); }
function normStr(s) {
  return String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\\/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function toKey(x) {
  return String(x ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[[\]{}()]/g, "")
    .replace(/\s+/g, "")
    .replace(/_{1,}/g, "-")
    .replace(/-+/g, "-");
}
function toKeyNoDash(x) { return toKey(x).replace(/-/g, ""); }
function plateKey(x) {
  return String(x ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
function tokens(s) { return normStr(s).replace(/[[\](){}]/g, "").split(" ").filter(Boolean); }
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / Math.max(1, A.size + B.size - inter);
}
function extractBracketCode(text) {
  const s = String(text ?? "");
  const matches = [...s.matchAll(/\[([^\]]{2,})\]/g)];
  if (!matches.length) return "";
  return matches[matches.length - 1][1];
}

function parseNumLocale(s) {
  if (s == null || s === "") return "";
  const txt = String(s).trim();
  const clean = txt.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : txt;
}
function parseFechaFlexible(v) {
  if (!v && v !== 0) return "";
  const s = String(v).trim();
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.includes("/") ? s.split("/") : s.split("-");
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d) ? "" : toISODate(d);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const n = Number(s);
  if (Number.isFinite(n) && s.length <= 6) {
    const d = XLSX.SSF.parse_date_code(n);
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d)).toISOString().slice(0, 10);
  }
  const d = new Date(s);
  return isNaN(d) ? "" : toISODate(d);
}
function addDaysISO(iso, days) {
  if (!iso) return "";
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}
function diffDias(aISO, bISO) {
  if (!aISO || !bISO) return 0;
  const a = new Date(aISO); a.setHours(0,0,0,0);
  const b = new Date(bISO); b.setHours(0,0,0,0);
  return Math.max(0, Math.floor((b - a) / (1000*60*60*24)));
}

/* ==================== Índices ==================== */
function indexEqAdd(byKey, key, eq) { if (key && !byKey.has(key)) byKey.set(key, eq); }
function buildEquipoIndex() {
  const byKey = new Map();
  for (const e of equipos.value) {
    const p = e.patente ? toKey(e.patente) : "";
    if (p) {
      indexEqAdd(byKey, p, e);
      indexEqAdd(byKey, toKeyNoDash(p), e);
      indexEqAdd(byKey, plateKey(e.patente), e);
    }
    const n = toKey(e.equipo_text);
    if (n) {
      indexEqAdd(byKey, n, e);
      indexEqAdd(byKey, toKeyNoDash(n), e);
      const extra = [...n.matchAll(/[A-Z0-9-]{3,}/g)].map(m => m[0]);
      for (const k of extra) {
        indexEqAdd(byKey, k, e);
        indexEqAdd(byKey, toKeyNoDash(k), e);
        indexEqAdd(byKey, plateKey(k), e);
      }
    }
  }
  idxEqByKey.value = byKey;
}
function buildContratoIndex() {
  const byNom = new Map();
  for (const c of contratos.value) {
    const n = normStr(c.nombre || "");
    if (n) byNom.set(n, c);
  }
  idxCtByNombre.value = byNom;
}

/* ==================== Match equipo ==================== */
function matchEquipoPorTexto(textoEquipo) {
  const txt = String(textoEquipo ?? "");

  // 1) prioriza el último código entre corchetes
  const bracketRaw = extractBracketCode(txt);
  if (bracketRaw) {
    const keys = new Set([toKey(bracketRaw), toKeyNoDash(bracketRaw), plateKey(bracketRaw)]);
    for (const k of keys) if (idxEqByKey.value.has(k)) return idxEqByKey.value.get(k);
  }

  // 2) candidatos desde todo el texto
  const normAll = toKey(txt);
  const candidates = new Set();
  for (const m of normAll.matchAll(/[A-Z0-9-]{3,}/g)) {
    const k = m[0];
    candidates.add(k);
    candidates.add(toKeyNoDash(k));
    candidates.add(plateKey(k));
  }
  for (const k of candidates) if (idxEqByKey.value.has(k)) return idxEqByKey.value.get(k);

  // 3) fuzzy por nombre_equipo
  let mejor = null, mejorScore = 0;
  const tTok = tokens(txt);
  for (const e of equipos.value) {
    const n = normStr(e.equipo_text);
    if (!n) continue;
    if (n.includes(normStr(txt)) || normStr(txt).includes(n)) {
      const s = Math.min(n.length, normStr(txt).length) / Math.max(n.length, normStr(txt).length);
      if (s > mejorScore) { mejor = e; mejorScore = s; }
      continue;
    }
    const s = jaccard(tTok, tokens(e.equipo_text));
    if (s >= 0.6 && s > mejorScore) { mejor = e; mejorScore = s; }
  }
  return mejor;
}

/* ==================== UI helpers ==================== */
function equipoLabel(eq) { return (eq?.equipo_text || eq?.patente || ""); }
function equipoTitle(eq) {
  if (!eq) return "";
  const name = eq.equipo_text || "";
  const plate = eq.patente || "";
  return name && plate ? `${name} · ${plate}` : (name || plate);
}

/* ==================== Carga inicial ==================== */
onMounted(async () => {
  updateIsMobile();
  window.addEventListener("resize", updateIsMobile);

  try { const raw = localStorage.getItem(STORAGE_OTS_KEY); if (raw) otRows.value = JSON.parse(raw); } catch(e) {console.error(e);}
  try { const raw = localStorage.getItem(STORAGE_LEC_KEY); if (raw) lecturas.value = JSON.parse(raw); } catch(e) {console.error(e);}

  try {
    const [snapEq, snapCt] = await Promise.all([
      getDocs(collection(db, "equipos")),
      getDocs(collection(db, "contratos")),
    ]);
    equipos.value = snapEq.docs.map(d => {
      const raw = d.data();
      return {
        id: d.id,
        equipo_text: String(raw.equipo ?? raw.nombre_equipo ?? "").trim(),
        patente: String(raw.patente ?? "").toUpperCase(),
        contratoId: raw.contratoId ?? null,
      };
    });
    contratos.value = snapCt.docs.map(d => ({ id: d.id, ...d.data() }));
    buildEquipoIndex();
    buildContratoIndex();
  } catch (e) {
    console.error("Firestore catálogos:", e);
  }

  await refreshRemote();
});
onBeforeUnmount(() => { window.removeEventListener("resize", updateIsMobile); });

/* ==================== Persistencia local ==================== */
watch(otRows,   v => { try { localStorage.setItem(STORAGE_OTS_KEY, JSON.stringify(v||[])); } catch(e) {console.error(e);} }, {deep:true});
watch(lecturas, v => { try { localStorage.setItem(STORAGE_LEC_KEY, JSON.stringify(v||[])); } catch(e) {console.error(e);} }, {deep:true});

/* ==================== Subidas (LOCAL) ==================== */
async function onFileChangeOTs(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

  const hasNew = raw[0] && Object.keys(raw[0]).some(k => k.toLowerCase().includes("folio ot"));
  if (hasNew) {
    otRows.value = raw.map(r => ({
      folio_ot: String(r["Folio OT"] ?? "").trim(),
      del:  parseFechaFlexible(r["Del"]),
      al:   parseFechaFlexible(r["Al"]),
      usuario_genero: String(r["Usuario que generó la OT"] ?? "").trim(),
      duracion_estimada: String(r["Duración estimada"] ?? "").trim(),
      responsable: String(r["Responsable"] ?? "").trim(),
      localizacion: String(r["Localización (al momento de generarse la OT)"] ?? "").trim(),
      estado: String(r["Estado"] ?? "").trim(),
      tipo_ot: String(r["Tipo OT"] ?? "").trim(),
      equipo_inmueble: String(r["Equipo / Inmueble"] ?? "").trim(),
    }));
  } else {
    const hoyISO = todayISO();
    otRows.value = raw.map(r => {
      const del = parseFechaFlexible(r["Desde"]);
      const al  = parseFechaFlexible(r["Hasta"]);
      const dias = r["Días Abierta"] ? Number(String(r["Días Abierta"]).replace(/\D+/g, "")) : diffDias(del, hoyISO);
      return {
        folio_ot: String(r["OT"] ?? "").trim(),
        del,
        al,
        usuario_genero: String(r["Usuario que generó la OT"] ?? "").trim(),
        duracion_estimada: "",
        responsable: String(r["Responsable"] ?? "").trim(),
        localizacion: String(r["Localización"] ?? "").trim(),
        estado: String(r["Estado"] ?? "").trim(),
        tipo_ot: String(r["Tipo OT"] ?? "").trim(),
        equipo_inmueble: String(r["Equipo"] ?? "").trim(),
        dias_abiertas_origen: isNaN(dias) ? 0 : dias,
      };
    });
  }
  e.target.value = "";
}

async function onFileChangeLecturas(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

  const hoyISO = todayISO();

  function pick(row, ...aliases) {
    const keys = Object.keys(row);
    for (const k of keys) {
      const nk = normStr(k);
      for (const a of aliases) if (nk === normStr(a)) return row[k];
    }
    return "";
  }

  lecturas.value = raw.map(row => {
    const equipoTxt   = pick(row, "Equipo");
    const ultLectRaw  = pick(row, "Última lectura del contador", "Ultima lectura del contador");
    const ultFechaRaw = pick(row, "Última fecha de actualización", "Ultima fecha de actualizacion");
    const proxRaw     = pick(row, "Próxima toma de lectura", "Proxima toma de lectura");
    const atrasoRaw   = pick(row, "Atraso");

    const ultima_fecha  = parseFechaFlexible(ultFechaRaw);
    const proxima_toma0 = parseFechaFlexible(proxRaw);
    const proxima_toma  = proxima_toma0 || (ultima_fecha ? addDaysISO(ultima_fecha, LECTURA_INTERVAL_DIAS) : "");

    let atraso_dias = 0;
    if (String(atrasoRaw || "").trim() !== "") {
      const m = String(atrasoRaw).match(/(\d+)/);
      atraso_dias = m ? Number(m[1]) : 0;
    } else if (proxima_toma) {
      atraso_dias = Math.max(0, diffDias(proxima_toma, hoyISO));
    }

    return {
      equipo: String(equipoTxt).trim(),
      ultima_lectura: parseNumLocale(ultLectRaw),
      ultima_fecha,
      proxima_toma,
      atraso_dias,
    };
  });

  e.target.value = "";
}

/* ==================== Limpieza local ==================== */
function confirmAction(msg) { try { return window.confirm(msg); } catch { return true; } }
function clearOTs() { if (!confirmAction("¿Borrar OTs cargadas localmente?")) return; otRows.value = []; try { localStorage.removeItem(STORAGE_OTS_KEY); } catch(e) {console.error(e);} }
function clearLecturas() { if (!confirmAction("¿Borrar Lecturas cargadas localmente?")) return; lecturas.value = []; try { localStorage.removeItem(STORAGE_LEC_KEY); } catch(e) {console.error(e);} }
function clearTodo() { if (!confirmAction("¿Borrar TODO local (OTs + Lecturas)?")) return; clearOTs(); clearLecturas(); }

/* ==================== Enriquecimiento LOCAL ==================== */
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

const lecturasLocalEnriquecidas = computed(() => {
  return lecturas.value.map(l => {
    const eq = matchEquipoPorTexto(l.equipo);
    let contrato = null;
    if (eq?.contratoId) contrato = contratos.value.find(c => c.id === eq.contratoId) || null;
    return { ...l, eq, contratoId: contrato?.id || null, contratoNombre: contrato?.nombre || null };
  });
});
const lecturasFiltradasLocal = computed(() => lecturasLocalEnriquecidas.value.filter(l => Number(l.atraso_dias) > LEC_MIN_ATRASO));

/* ==================== Carga Firestore (ver lo publicado) ==================== */
async function refreshRemote() {
  try {
    sync.loading = true; sync.msg = "Cargando Firestore…"; sync.error = false;

    const [snapOT, snapLEC] = await Promise.all([
      getDocs(collection(db, FIRE_COL_OTS)),
      getDocs(collection(db, FIRE_COL_LEC)),
    ]);

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
      const row = {
        folio_ot: r.folio_ot || null,
        del: r.fecha || null,
        al: null,
        usuario_genero: r.usuario_genero || null,
        responsable: r.responsable || null,
        localizacion: r.localizacion || null,
        estado: r.estado || null,
        tipo_ot: null,
        equipo_inmueble: r.equipoLabel || r.equipoNombre || r.equipoPatente || "",
        dias_abiertas: Number(r.dias_abiertas) || (r.fecha ? diffDias(r.fecha, todayISO()) : 0),
        vencido: !!r.vencido,
        eq,
        contratoId: r.contratoId || null,
        contratoNombre: r.contratoNombre || null,
      };
      mappedOTs.push(row);
    });
    remoteOTs.value = mappedOTs.filter(r => r.dias_abiertas >= OTS_MIN_DIAS);

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
      const row = {
        equipo: l.equipoLabel || l.equipoNombre || l.equipoPatente || "",
        ultima_lectura: l.ultima_lectura ?? null,
        ultima_fecha: l.fecha_ultima || null,
        proxima_toma: l.fecha_proxima || null,
        atraso_dias: Number(l.atraso_dias) || 0,
        eq,
        contratoId: l.contratoId || null,
        contratoNombre: l.contratoNombre || null,
      };
      allLEC.push(row);
    });
    // para la vista (filtrado > 30) y para el modal (todas)
    remoteLecturasAll.value = allLEC;
    remoteLecturas.value = allLEC.filter(l => Number(l.atraso_dias) > LEC_MIN_ATRASO);

    sync.loading = false; sync.msg = "Firestore cargado.";
  } catch (e) {
    sync.loading = false; sync.error = true;
    sync.msg = `Error al cargar desde Firestore: ${e?.message || e}`;
    console.error(e);
  }
}

/* ==================== VISTA unificada ==================== */
const viewOTs = computed(() => fuente.value === "firestore" ? remoteOTs.value : filteredOTsLocal.value);
const viewLecturas = computed(() => fuente.value === "firestore" ? remoteLecturas.value : lecturasFiltradasLocal.value);
const viewLecturasAll = computed(() => fuente.value === "firestore" ? remoteLecturasAll.value : lecturasLocalEnriquecidas.value);

const gruposOTsPorContrato = computed(() => {
  const map = new Map();
  for (const r of viewOTs.value) {
    const key = r.contratoId || "__sin__";
    if (!map.has(key)) map.set(key, { key, nombre: r.contratoNombre, items: [] });
    map.get(key).items.push(r);
  }
  return Array.from(map.values()).sort((a,b) => String(a.nombre||"").localeCompare(String(b.nombre||"")));
});

const gruposLecturasPorContrato = computed(() => {
  const map = new Map();
  for (const r of viewLecturas.value) {
    const key = r.contratoId || "__sin__";
    if (!map.has(key)) map.set(key, { key, nombre: r.contratoNombre, items: [] });
    map.get(key).items.push(r);
  }
  return Array.from(map.values()).sort((a,b) => String(a.nombre||"").localeCompare(String(b.nombre||"")));
});

/* ==================== Buscador de lectura para OT (modal) ==================== */
function keyFromEq(eq) {
  if (!eq) return "";
  return plateKey(eq.patente || eq.equipo_text || "");
}
function equipoStrongKeyFromRowText(texto) {
  const br = extractBracketCode(texto);
  if (br) return plateKey(br) || toKeyNoDash(br) || toKey(br);
  const all = toKey(texto);
  const m = all.match(/[A-Z0-9-]{3,}/g);
  if (m && m.length) return plateKey(m[m.length - 1]);
  return plateKey(all);
}

function findLecturaForOT(otRow) {
  // obtenemos una "clave fuerte" del equipo de la OT
  let eqKey = "";
  if (otRow.eq) eqKey = keyFromEq(otRow.eq);
  if (!eqKey) eqKey = equipoStrongKeyFromRowText(otRow.equipo_inmueble);

  if (!eqKey) return null;

  // buscamos en todas las lecturas visibles (según fuente)
  // preferimos match por eq.id y luego por clave
  const all = viewLecturasAll.value;

  // 1) si la OT tiene eq.id, intentamos por ese id
  if (otRow.eq?.id) {
    const byId = all.find(l => l.eq?.id && l.eq.id === otRow.eq.id);
    if (byId) return byId;
  }

  // 2) por clave fuerte en equipo/patente/nombre
  const candid = all.find(l => {
    const a = plateKey(l.eq?.patente || l.eq?.equipo_text || l.equipo || "");
    return a && a === eqKey;
  });
  if (candid) return candid;

  // 3) más laxo: contiene la clave
  const lax = all.find(l => {
    const a = plateKey(l.eq?.patente || l.eq?.equipo_text || l.equipo || "");
    return a && (a.includes(eqKey) || eqKey.includes(a));
  });
  return lax || null;
}

/* ==================== Firestore sync (publicar) ==================== */
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
      sync.msg = `Eliminando ${Math.min(i+450, ids.length)} / ${ids.length} obsoletos…`;
      await batch.commit();
    }
  }

  sync.loading = false;
  sync.msg = `OK: ${docs.length} documento(s) ${replace ? 'sincronizados (reemplazo)' : 'actualizados'} en ${colName}.`;
  if (fuente.value === "firestore") await refreshRemote();
}

async function pushOTs(replace=false) {
  try {
    const docs = filteredOTsLocal.value.map(r => {
      const equipoKey = r.eq
        ? (plateKey(r.eq.patente) || plateKey(r.eq.equipo_text))
        : equipoStrongKeyFromRowText(r.equipo_inmueble);

      const id = (r.folio_ot && r.folio_ot.length >= 1)
        ? toKeyNoDash(r.folio_ot)
        : `${r.del || 's/fecha'}_${equipoKey || 's/eq'}`;

      const data = {
        folio_ot: r.folio_ot || null,
        fecha: r.del || null,
        estado: r.estado || null,
        responsable: r.responsable || null,
        usuario_genero: r.usuario_genero || null,
        localizacion: r.localizacion || null,

        equipoId: r.eq?.id || null,
        equipoLabel: r.eq ? equipoLabel(r.eq) : r.equipo_inmueble || null,
        equipoPatente: r.eq?.patente || null,
        equipoNombre: r.eq?.equipo_text || null,
        equipoKey: equipoKey || null,

        contratoId: r.contratoId || null,
        contratoNombre: r.contratoNombre || null,

        dias_abiertas: r.dias_abiertas,
        vencido: r.vencido,

        raw: { equipo_inmueble: r.equipo_inmueble ?? null },
      };

      return { id, data };
    });

    await batchedUpsert(FIRE_COL_OTS, docs, replace);
  } catch (e) {
    sync.loading = false; sync.error = true;
    sync.msg = `Error al publicar OTs: ${e?.message || e}`;
    console.error(e);
  }
}

async function pushLecturas(replace=false) {
  try {
    const docs = lecturasFiltradasLocal.value.map(l => {
      const equipoKey = l.eq
        ? (plateKey(l.eq.patente) || plateKey(l.eq.equipo_text))
        : equipoStrongKeyFromRowText(l.equipo);

      const fechaRef = l.ultima_fecha || l.proxima_toma || todayISO();
      const id = `${equipoKey || 's/eq'}_${fechaRef}`;

      const data = {
        fecha_ultima: l.ultima_fecha || null,
        fecha_proxima: l.proxima_toma || null,
        ultima_lectura: l.ultima_lectura ?? null,
        atraso_dias: Number(l.atraso_dias) || 0,

        equipoId: l.eq?.id || null,
        equipoLabel: l.eq ? equipoLabel(l.eq) : l.equipo || null,
        equipoPatente: l.eq?.patente || null,
        equipoNombre: l.eq?.equipo_text || null,
        equipoKey: equipoKey || null,

        contratoId: l.contratoId || null,
        contratoNombre: l.contratoNombre || null,

        raw: { equipo: l.equipo ?? null },
      };

      return { id, data };
    });

    await batchedUpsert(FIRE_COL_LEC, docs, replace);
  } catch (e) {
    sync.loading = false; sync.error = true;
    sync.msg = `Error al publicar Lecturas: ${e?.message || e}`;
    console.error(e);
  }
}
</script>

<style scoped>
/* Área de tabla + control de escala */
.excel-area { max-height: 70vh; font-size: calc(0.96rem * var(--excel-font-scale, 1)); }
.excel-area.dense :is(td, th) { padding: 0.28rem 0.5rem !important; line-height: 1.1; }
.sticky-head th { position: sticky; top: 0; background: var(--bs-light); z-index: 2; }
.table-hover tbody tr:hover { background-color: rgba(0,0,0,0.025); }
td, th { white-space: nowrap; }

/* Móvil: mantener tabla, comprimir fuente y paddings */
.excel-area.mobile { font-size: calc(0.88rem * var(--excel-font-scale, 1)); }
@media (max-width: 576px) {
  .excel-area.mobile :is(td, th) {
    padding: 0.2rem 0.35rem !important;
    line-height: 1.05;
    font-size: 0.82rem;
  }
  /* Permite un pelín más de columnas visibles */
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
.panel-header { padding: .75rem .75rem; border-bottom: 1px solid #f1f3f5; }
.panel-body   { padding: .75rem; overflow: auto; }

/* Modal liviano controlado por Vue (sin JS de Bootstrap) */
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
  padding: .75rem .9rem; background: #f8f9fa; display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid #eef0f2;
}
.modal-card-footer { border-top: 1px solid #eef0f2; border-bottom: none; }
.modal-card-body { padding: .9rem; max-height: 70vh; overflow: auto; }
</style>
