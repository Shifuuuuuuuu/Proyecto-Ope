<template>
  <div class="container py-4">
    <!-- Header + Probar -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h2 class="h5 mb-0">Generar certificado con QR (alta nitidez)</h2>

      <div class="d-flex align-items-center gap-2">
        <router-link v-if="lastId" class="btn btn-outline-secondary btn-sm" :to="`/verificar?id=${lastId}`">
          Probar último certificado
        </router-link>
        <button v-else class="btn btn-outline-secondary btn-sm" disabled title="Primero genera un certificado">
          Probar verificación pública
        </button>
        <button v-if="lastVerifyUrl" type="button" class="btn btn-outline-secondary btn-sm" @click="copiar(lastVerifyUrl)">
          Copiar link
        </button>
      </div>
    </div>

    <!-- Formulario -->
    <div class="card shadow-sm">
      <div class="card-body">
        <form @submit.prevent="batchMode ? procesarBatch() : procesar()">
          <div class="row g-3">
            <div class="col-12 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="batchMode" v-model="batchMode" />
                <label class="form-check-label" for="batchMode">Generar varios a la vez (múltiples archivos)</label>
              </div>
            </div>

            <div class="col-12">
              <label class="form-label">
                {{ batchMode ? 'Archivos de certificados (PDF o imagen, múltiples)' : 'Archivo del certificado (PDF o imagen)' }}
              </label>
              <input type="file" :multiple="batchMode" accept="application/pdf,image/*" class="form-control" @change="onFile" />
              <div class="form-text">
                Se incrustará un QR en la primera página.
                En modo simple puedes elegir la esquina (o arrastrarlo en la vista previa).
                En modo lote se usará la esquina seleccionada.
              </div>
            </div>

            <!-- Posición / Tamaño QR -->
            <div class="col-12 col-md-4">
              <label class="form-label">Posición del QR</label>
              <select v-model="qrPreset" class="form-select">
                <option value="bottom-left">Abajo izquierda (por defecto)</option>
                <option value="bottom-right">Abajo derecha</option>
                <option value="top-left">Arriba izquierda</option>
                <option value="top-right">Arriba derecha</option>
                <option value="custom">Personalizado (arrastrar en vista previa)</option>
              </select>
              <div class="form-text">
                En modo lote se aplicará esta posición a todos los archivos.
              </div>
            </div>

            <div class="col-12 col-md-4">
              <label class="form-label">Tamaño del QR</label>
              <input
                type="range"
                class="form-range"
                min="0.08"
                max="0.20"
                step="0.01"
                :value="qrLayout.sizePct"
                @input="qrLayout.sizePct = Number($event.target.value)"
              />
              <div class="small text-muted">
                Actual: <strong>{{ Math.round(qrLayout.sizePct * 100) }}%</strong> del ancho
              </div>
            </div>

            <!-- Campos base para modo simple -->
            <template v-if="!batchMode">
              <div class="col-md-6">
                <label class="form-label">Categoría</label>
                <select v-model="form.categoria" class="form-select">
                  <option value="" disabled>Selecciona categoría</option>
                  <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Equipo (opcional)</label>
                <input v-model="form.equipo" @input="toUpper('equipo')" class="form-control" placeholder="JPWL-36"/>
              </div>
              <div class="col-md-6">
                <label class="form-label">Código interno (opcional)</label>
                <input v-model="form.codigo" @input="toUpper('codigo')" class="form-control" placeholder="ABC-123"/>
              </div>
              <div class="col-md-6 d-flex align-items-end">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="aprobado" v-model="form.aprobado"/>
                  <label class="form-check-label" for="aprobado">Aprobado</label>
                </div>
              </div>
            </template>

            <!-- Tabla modo lote -->
            <div v-else class="col-12">
              <div class="table-responsive">
                <table class="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Archivo</th>
                      <th>Categoría</th>
                      <th>Equipo</th>
                      <th>Código</th>
                      <th>Aprobado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in batchRows" :key="r.key">
                      <td class="text-break">
                        <div class="fw-semibold">{{ r.fileName }}</div>
                        <div class="small text-muted">{{ humanSize(r.sizeBytes) }}</div>
                      </td>
                      <td style="min-width:180px">
                        <select v-model="r.categoria" class="form-select form-select-sm">
                          <option value="" disabled>Selecciona</option>
                          <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
                        </select>
                      </td>
                      <td style="min-width:160px">
                        <input v-model="r.equipo" @input="r.equipo = (r.equipo || '').toUpperCase()" class="form-control form-control-sm" placeholder="JPWL-36"/>
                      </td>
                      <td style="min-width:160px">
                        <input v-model="r.codigo" @input="r.codigo = (r.codigo || '').toUpperCase()" class="form-control form-control-sm" placeholder="ABC-123"/>
                      </td>
                      <td style="min-width:110px">
                        <div class="form-check">
                          <input class="form-check-input" type="checkbox" v-model="r.aprobado"/>
                          <label class="form-check-label">Sí</label>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!batchRows.length">
                      <td colspan="5" class="text-muted small">Selecciona archivos para preparar el lote.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="batchRows.length" class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div class="small text-muted">
                  Total: <strong>{{ batchRows.length }}</strong> archivos
                </div>
                <div class="small text-muted" v-if="batchProgress.total">
                  Progreso: <strong>{{ batchProgress.current }}</strong> / {{ batchProgress.total }}
                </div>
              </div>
            </div>

            <!-- Progreso -->
            <div v-if="showProgress" class="col-12">
              <div class="border rounded p-3 bg-light">
                <div class="d-flex align-items-center justify-content-between">
                  <div class="small text-muted">{{ progress.detail }}</div>
                  <div class="small text-muted">{{ progress.stage }}</div>
                </div>
                <div class="progress mt-2" style="height:10px">
                  <div class="progress-bar" role="progressbar" :style="{width: `${progress.pct}%`}"></div>
                </div>
              </div>
            </div>

            <!-- Acciones -->
            <div class="col-12 d-flex gap-2 flex-wrap">
              <button class="btn btn-primary" type="submit" :disabled="btnDisabled">
                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                {{ batchMode ? 'Generar lote' : 'Generar certificado' }}
              </button>
              <button class="btn btn-outline-secondary" type="button" @click="limpiar" :disabled="loading">
                Limpiar
              </button>
            </div>
          </div>
        </form>

        <!-- Vista previa (solo modo simple) -->
        <div v-if="!batchMode && previewUrl" class="mt-4">
          <h6 class="mb-2">Vista previa (arrastra el QR si quieres posición personalizada)</h6>

          <div
            ref="previewWrapper"
            class="border rounded overflow-hidden position-relative"
            style="height: 520px; background: #f8f9fa; overflow: hidden;"
          >
            <embed
              :src="previewUrl"
              type="application/pdf"
              class="w-100 h-100"
            />

            <!-- QR draggable encima del PDF -->
            <div
              v-if="qrDataUrl"
              :style="qrOverlayStyle"
              @mousedown.prevent="startDragQr"
            >
              <img
                :src="qrDataUrl"
                alt="QR"
                class="w-100 h-100"
                draggable="false"
              />
            </div>
          </div>

          <div class="small text-muted mt-2">
            Tamaño final aprox.: <strong>{{ humanSize(bytesFinal) }}</strong>
          </div>
          <div class="small text-muted mt-2">
            Puedes arrastrar el QR en la vista previa para elegir su posición.
          </div>
        </div>

        <div v-if="!batchMode && qrDataUrl && verificationUrl" class="mt-4">
          <h6 class="text-muted">QR generado (último certificado):</h6>
          <img :src="qrDataUrl" alt="QR" style="width: 130px; height: 130px" />
          <div class="small text-break mt-2">{{ verificationUrl }}</div>
        </div>

        <!-- Resultado en lote -->
        <div v-if="batchMode && batchResults.length" class="mt-4">
          <h6 class="mb-2">Resultados del lote</h6>
          <div class="table-responsive">
            <table class="table table-sm align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Archivo</th>
                  <th>Tamaño</th>
                  <th>Estado</th>
                  <th>Verificar</th>
                  <th>Descargar</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, idx) in batchResults" :key="r.id">
                  <td>{{ idx + 1 }}</td>
                  <td class="text-break">
                    {{ r.name }}
                  </td>
                  <td>{{ humanSize(r.sizeBytes) }}</td>
                  <td>
                    <span class="badge bg-success">Sin recomprimir</span>
                  </td>
                  <td>
                    <router-link class="btn btn-success btn-sm" :to="`/verificar?id=${r.id}`">
                      Abrir
                    </router-link>
                  </td>
                  <td>
                    <button class="btn btn-outline-primary btn-sm" @click="downloadBlob(r.objectUrl, r.downloadName)">
                      Descargar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary btn-sm" @click="copiarTodos()">Copiar todos los links</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Listado de certificados existentes -->
    <div class="card shadow-sm mt-4">
      <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="d-flex align-items-center gap-2">
          <img :src="logoSrc" alt="logo" style="height: 28px" />
          <strong>Certificados guardados</strong>
        </div>

        <div class="d-flex align-items-center gap-2 flex-wrap">
          <select v-model="filtroCategoria" class="form-select form-select-sm" style="width: 220px">
            <option value="">Todas las categorías</option>
            <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
          </select>

          <select v-model.number="pageSize" class="form-select form-select-sm" style="width: 140px">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>

      <div class="card-body">
        <div v-if="loadingList" class="text-muted small">Cargando…</div>

        <div v-else-if="paged.length === 0" class="text-muted small">
          No hay certificados.
        </div>

        <div v-else class="table-responsive">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Categoría</th>
                <th>Equipo</th>
                <th>Código</th>
                <th>Vence</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in paged" :key="c.id">
                <td class="text-break">
                  <div class="fw-semibold">{{ c.file_name || `certificado_${c.id}.pdf` }}</div>
                  <div class="small text-muted">{{ c.id }}</div>
                </td>
                <td>{{ c.categoria || "-" }}</td>
                <td>{{ c.equipo || "-" }}</td>
                <td>{{ c.codigo || "-" }}</td>
                <td>{{ fmtDate(c.fecha_vencimiento) }}</td>
                <td>
                  <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-outline-secondary btn-sm" @click="ver(c)">
                      Ver
                    </button>
                    <router-link class="btn btn-success btn-sm" :to="`/verificar?id=${c.id}`">
                      Verificar
                    </router-link>
                    <button class="btn btn-outline-primary btn-sm" @click="descargar(c)">
                      Descargar
                    </button>
                    <button class="btn btn-outline-warning btn-sm" @click="abrirEditar(c)">
                      Editar
                    </button>
                    <button class="btn btn-outline-danger btn-sm" @click="abrirEliminar(c)">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
          <div class="small text-muted">
            Mostrando {{ paged.length }} de {{ filtered.length }}
          </div>

          <div class="btn-group">
            <button class="btn btn-outline-secondary btn-sm" @click="prevPage" :disabled="page<=1">Anterior</button>
            <button class="btn btn-outline-secondary btn-sm" @click="nextPage" :disabled="page>=maxPage">Siguiente</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL VER PDF -->
    <div class="modal fade show d-block" tabindex="-1" role="dialog" v-if="showViewer" style="background: rgba(0,0,0,0.35);">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header">
            <h5 class="modal-title">Vista del certificado</h5>
            <button type="button" class="btn-close" @click="closeViewer"></button>
          </div>
          <div class="modal-body p-0">
            <div style="height:80vh;">
              <embed :src="viewerUrl" type="application/pdf" class="w-100 h-100"/>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" @click="closeViewer">Cerrar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL EDITAR -->
    <div class="modal fade show d-block" tabindex="-1" role="dialog" v-if="showEdit" style="background: rgba(0,0,0,0.35);">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header">
            <h5 class="modal-title">Editar certificado</h5>
            <button type="button" class="btn-close" @click="showEdit=false"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Categoría</label>
                <select v-model="editForm.categoria" class="form-select">
                  <option value="" disabled>Selecciona categoría</option>
                  <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Equipo</label>
                <input v-model="editForm.equipo" @input="editForm.equipo=(editForm.equipo||'').toUpperCase()" class="form-control"/>
              </div>
              <div class="col-md-6">
                <label class="form-label">Código</label>
                <input v-model="editForm.codigo" @input="editForm.codigo=(editForm.codigo||'').toUpperCase()" class="form-control"/>
              </div>
              <div class="col-md-6 d-flex align-items-end">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" v-model="editForm.aprobado"/>
                  <label class="form-check-label">Aprobado</label>
                </div>
              </div>

              <div class="col-12">
                <label class="form-label">Reemplazar archivo (opcional)</label>
                <input
                  type="file"
                  class="form-control"
                  accept="application/pdf,image/*"
                  @change="e=>editNewFile=e.target.files?.[0]||null"
                >
                <small class="text-muted">Se volverá a incrustar el QR sin recomprimir el PDF.</small>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" @click="showEdit=false">Cancelar</button>
            <button class="btn btn-primary" @click="guardarEdicion" :disabled="loading">Guardar cambios</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL CONFIRMACIÓN ELIMINAR -->
    <div class="modal fade show d-block" tabindex="-1" role="dialog" v-if="showConfirm" style="background: rgba(0,0,0,35);">
      <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-body text-center p-4">
            <div
              class="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
              style="width:64px;height:64px;background:#fff0f0;border:1px solid #ffd6d6;"
            >
              <i class="bi bi-trash3-fill fs-3 text-danger"></i>
            </div>
            <h6 class="mb-1">¿Eliminar certificado?</h6>
            <p class="text-muted small mb-3">Esta acción no se puede deshacer.</p>
            <div class="d-flex gap-2 justify-content-center">
              <button class="btn btn-outline-secondary btn-sm" @click="showConfirm=false">Cancelar</button>
              <button class="btn btn-danger btn-sm" @click="confirmarEliminar">Eliminar</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TOASTS -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1080">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast show align-items-center text-white border-0 mb-2"
        :class="toastClass(t.variant)"
        role="alert"
      >
        <div class="d-flex">
          <div class="toast-body d-flex align-items-center gap-2">
            <i :class="toastIcon(t.variant)"></i>
            <span>{{ t.msg }}</span>
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" @click="closeToast(t.id)"></button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import QRCode from "qrcode"
import { v4 as uuidv4 } from "uuid"
import { PDFDocument, rgb } from "pdf-lib"
import { ref, reactive, computed, onMounted, watch } from "vue"
import { db } from "@/firebase/config"
import { getDocs, collection } from "firebase/firestore"
import logoSrc from "@/img/Logo XT Servicios Transparente.png"

/* Servicio */
import {
  crearCertificado,
  obtenerCertificadoDataUrl,
  listarCertificados,
  eliminarCertificado as eliminarCertificadoSvc,
  actualizarMetadatos,
} from "@/services/certificadosService"

/* ===== Estado UI ===== */
const categorias = ref([])
const loading = ref(false)
const loadingList = ref(false)

const file = ref(null)
const files = ref([]) // (no usado, pero mantenido)
const previewUrl = ref(null)
const originalFileName = ref("")

const lastId = ref("")
const lastVerifyUrl = ref("")
const verificationUrl = ref("")

const bytesFinal = ref(0)

const form = reactive({
  categoria: "",
  equipo: "",
  codigo: "",
  aprobado: true,
})

/* ===== Modo lote ===== */
const batchMode = ref(false)
const batchRows = ref([])
const batchResults = ref([])
const batchProgress = ref({ current: 0, total: 0 })

/* ===== Progreso ===== */
const showProgress = ref(false)
const progress = ref({ stage: "idle", pct: 0, detail: "" })

/* ===== Vista previa QR draggable ===== */
const qrDataUrl = ref(null)
const previewWrapper = ref(null)

const draggingQr = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const DEFAULT_QR_PRESET = 'bottom-left'
const DEFAULT_QR_SIZE_PCT = 0.12

const qrPreset = ref(DEFAULT_QR_PRESET)

// layout del QR en porcentajes (0–1). xPct/yPct representan el CENTRO del QR en la vista previa
const qrLayout = reactive({
  xPct: 0.12,   // 0 = izquierda, 1 = derecha
  yPct: 0.88,   // 0 = arriba, 1 = abajo
  sizePct: DEFAULT_QR_SIZE_PCT // ancho del QR como % del ancho de la página
})

const QR_PRESETS = {
  'top-left':     { xPct: 0.12, yPct: 0.12 },
  'top-right':    { xPct: 0.88, yPct: 0.12 },
  'bottom-left':  { xPct: 0.12, yPct: 0.88 },
  'bottom-right': { xPct: 0.88, yPct: 0.88 },
}

function applyQrPreset(preset) {
  if (preset === 'custom') return
  const p = QR_PRESETS[preset] || QR_PRESETS[DEFAULT_QR_PRESET]
  qrLayout.xPct = p.xPct
  qrLayout.yPct = p.yPct
}

function resetQrLayout() {
  qrPreset.value = DEFAULT_QR_PRESET
  qrLayout.sizePct = DEFAULT_QR_SIZE_PCT
  applyQrPreset(DEFAULT_QR_PRESET)
}

// cuando el usuario cambia el selector, aplicamos la esquina
watch(qrPreset, (p) => applyQrPreset(p))

const qrOverlayStyle = computed(() => {
  return {
    position: "absolute",
    left: `${qrLayout.xPct * 100}%`,
    top: `${qrLayout.yPct * 100}%`,
    width: `${qrLayout.sizePct * 100}%`,
    height: `${qrLayout.sizePct * 100}%`,
    transform: "translate(-50%, -50%)",
    cursor: "move",
    border: "2px dashed rgba(220,53,69,0.7)",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.35)",
    padding: "4px",
    userSelect: "none",
    boxSizing: "border-box",
    zIndex: 5
  }
})

function startDragQr(event) {
  if (!previewWrapper.value) return
  // si lo mueves manualmente, queda como personalizado
  qrPreset.value = 'custom'
  draggingQr.value = true

  const wrapperRect = previewWrapper.value.getBoundingClientRect()
  const qrCenterX = wrapperRect.left + wrapperRect.width * qrLayout.xPct
  const qrCenterY = wrapperRect.top + wrapperRect.height * qrLayout.yPct

  dragOffset.value = {
    x: event.clientX - qrCenterX,
    y: event.clientY - qrCenterY,
  }

  window.addEventListener("mousemove", onDragQr)
  window.addEventListener("mouseup", stopDragQr)
}

function onDragQr(event) {
  if (!draggingQr.value || !previewWrapper.value) return

  const rect = previewWrapper.value.getBoundingClientRect()
  const x = event.clientX - rect.left - dragOffset.value.x
  const y = event.clientY - rect.top - dragOffset.value.y

  const xPct = x / rect.width
  const yPct = y / rect.height

  // clamp
  const margin = 0.05
  qrLayout.xPct = Math.min(1 - margin, Math.max(margin, xPct))
  qrLayout.yPct = Math.min(1 - margin, Math.max(margin, yPct))
}

function stopDragQr() {
  draggingQr.value = false
  window.removeEventListener("mousemove", onDragQr)
  window.removeEventListener("mouseup", stopDragQr)
}

/* ===== Toasts ===== */
const toasts = ref([])
function showToast(variant, msg){
  const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`
  toasts.value.push({ id, variant, msg })
  setTimeout(()=> closeToast(id), 3800)
}
function closeToast(id){
  toasts.value = toasts.value.filter(t => t.id !== id)
}
function toastClass(v){
  if (v === "success") return "bg-success"
  if (v === "danger") return "bg-danger"
  if (v === "warning") return "bg-warning text-dark"
  return "bg-secondary"
}
function toastIcon(v){
  if (v === "success") return "bi bi-check-circle-fill"
  if (v === "danger") return "bi bi-x-circle-fill"
  if (v === "warning") return "bi bi-exclamation-triangle-fill"
  return "bi bi-info-circle-fill"
}

/* ===== Listado certificados ===== */
const lista = ref([])
const filtroCategoria = ref("")
const page = ref(1)
const pageSize = ref(10)

const filtered = computed(() => {
  if (!filtroCategoria.value) return lista.value
  return lista.value.filter(c => (c.categoria || "") === filtroCategoria.value)
})
const maxPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

function prevPage(){
  page.value = Math.max(1, page.value - 1)
}
function nextPage(){
  page.value = Math.min(maxPage.value, page.value + 1)
}

watch(batchMode, () => {
  files.value = []
  file.value = null
  previewUrl.value = null
  bytesFinal.value = 0
  qrDataUrl.value = null
  verificationUrl.value = ""
  batchResults.value = []
  batchRows.value = []

  // mantenemos el tamaño/posición seleccionados; si es un preset, lo re-aplicamos
  if (qrPreset.value !== 'custom') applyQrPreset(qrPreset.value)
})

watch([filtroCategoria, pageSize, lista], () => { page.value = 1 })

/* ===== Helpers ===== */
function toUpper(field) { form[field] = (form[field] || "").toUpperCase() }
function humanSize(n){
  if (!n && n !== 0) return "-"
  if (n < 1024) return `${n} B`
  if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`
  return `${(n/(1024*1024)).toFixed(2)} MB`
}
function fmtDate(iso){
  if (!iso) return "-"
  try{
    const d = new Date(iso)
    return d.toLocaleDateString("es-CL", { year:"numeric", month:"2-digit", day:"2-digit" })
  }catch{
    return "-"
  }
}
function downloadBlob(url, filename){
  const a = document.createElement("a")
  a.href = url
  a.download = filename || "archivo.pdf"
  a.click()
}
async function copiar(text){
  try{
    await navigator.clipboard.writeText(text)
    showToast("success","Copiado")
  }catch{
    showToast("warning","No se pudo copiar")
  }
}
function bytesToBase64(bytes) {
  let binary = ""
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
function addMonths(date, months){
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

/* ===== Load categorías ===== */
async function cargarCategorias(){
  try{
    const snap = await getDocs(collection(db, "categorias"))
    const arr = []
    snap.forEach(doc => {
      const data = doc.data()
      if (data?.nombre) arr.push(data.nombre)
      else if (doc.id) arr.push(doc.id)
    })
    categorias.value = arr.sort((a,b)=>a.localeCompare(b))
  }catch(e){
    console.error(e)
    categorias.value = []
  }
}

/* ===== Load certificados ===== */
async function cargarCertificados(){
  loadingList.value = true
  try{
    lista.value = await listarCertificados()
  }catch(e){
    console.error(e)
    lista.value = []
  }finally{
    loadingList.value = false
  }
}

/* ===== Input file ===== */
async function onFile(e){
  if (batchMode.value){
    const arr = Array.from(e.target.files || [])
    batchRows.value = arr.map(f => ({
      key: `${Date.now()}_${f.name}_${Math.random().toString(36).slice(2,8)}`,
      file: f,
      fileName: f.name,
      sizeBytes: f.size,
      categoria: "",
      equipo: "",
      codigo: "",
      aprobado: true,
      id: null
    }))
  } else {
    file.value = e.target.files?.[0] || null
    originalFileName.value = file.value?.name || ""
    bytesFinal.value = 0
    verificationUrl.value = ""

    // reset layout
    // volvemos al preset seleccionado (por defecto abajo-izquierda)
    if (qrPreset.value !== 'custom') applyQrPreset(qrPreset.value)
    qrLayout.sizePct = qrLayout.sizePct ?? DEFAULT_QR_SIZE_PCT

    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
    previewUrl.value = file.value ? URL.createObjectURL(file.value) : null

    // QR temporal para poder moverlo en la vista previa
    if (file.value) {
      qrDataUrl.value = await QRCode.toDataURL("PREVIEW", { margin: 1, width: 300 })
    } else {
      qrDataUrl.value = null
    }
  }
}

/* ===== Flujo simple ===== */
function limpiar(){
  files.value=[]
  file.value=null
  originalFileName.value=""
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value=null
  qrDataUrl.value=null
  verificationUrl.value=""
  bytesFinal.value=0
  form.categoria=""
  form.equipo=""
  form.codigo=""
  form.aprobado=true
  batchResults.value=[]
  batchRows.value=[]
  resetQrLayout()
}

async function procesar(){
  if (!file.value) return
  if (!form.categoria) { showToast('warning',"Selecciona una categoría"); return }

  loading.value = true
  try{
    const creadoLocal = new Date()
    const venceLocal = addMonths(creadoLocal, 3)

    const id = uuidv4()
    const verifyUrl = `${location.origin}/verificar?id=${id}`
    verificationUrl.value = verifyUrl
    // QR definitivo (reemplaza al temporal)
    qrDataUrl.value = await QRCode.toDataURL(verifyUrl, { margin:1, width:300 })

    const finalBytes = await buildPdfWithQr(file.value, qrDataUrl.value, qrLayout, qrPreset.value)
    const blob = new Blob([finalBytes], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    previewUrl.value = url
    bytesFinal.value = finalBytes.byteLength

    const b64 = bytesToBase64(new Uint8Array(finalBytes))
    const dataUrl = `data:application/pdf;base64,${b64}`

    showProgress.value = true
    progress.value = { stage: 'uploading', pct: 0, detail: 'Subiendo (en partes si hace falta)…' }
    const { id: savedId } = await crearCertificado(
      { base64: dataUrl, mimeType: "application/pdf", sizeBytes: finalBytes.byteLength, preferirChunks: true },
      {
        categoria: form.categoria || null,
        equipo: form.equipo || null,
        codigo: form.codigo || null,
        aprobado: !!form.aprobado,
        verificar_url: verifyUrl,
        creado_iso: creadoLocal.toISOString(),
        fecha_vencimiento: venceLocal.toISOString(),
        file_name: originalFileName.value || `certificado_${id}.pdf`,
      },
      (e)=> { progress.value = e }
    )
    showProgress.value = false

    downloadBlob(url, originalFileName.value || `certificado_${savedId}.pdf`)
    lastId.value = savedId
    lastVerifyUrl.value = verifyUrl
    await cargarCertificados()
    showToast('success','Certificado generado y subido sin pérdida de calidad')
  }catch(err){
    console.error(err)
    showToast('danger','Error generando/guardando el PDF')
  }finally{
    loading.value=false
  }
}

/* ===== Flujo lote ===== */
async function procesarBatch(){
  if (!batchRows.value.length) return
  if (batchRows.value.some(r => !r.categoria)) {
    showToast('warning','Completa categoría para todos los archivos del lote')
    return
  }

  loading.value = true
  batchProgress.value = { current:0, total: batchRows.value.length }
  batchResults.value = []

  try{
    for (let i=0;i<batchRows.value.length;i++){
      const r = batchRows.value[i]
      const id = uuidv4()
      const verifyUrl = `${location.origin}/verificar?id=${id}`
      const qrUrl = await QRCode.toDataURL(verifyUrl, { margin:1, width:300 })

      const finalBytes = await buildPdfWithQr(r.file, qrUrl, qrLayout, qrPreset.value)

      const creadoLocal = new Date()
      const venceLocal = addMonths(creadoLocal, 3)
      const b64 = bytesToBase64(new Uint8Array(finalBytes))
      const dataUrl = `data:application/pdf;base64,${b64}`

      showProgress.value = true
      progress.value = { stage: 'uploading', pct: 0, detail: `Subiendo ${r.fileName}…` }

      const { id: savedId } = await crearCertificado(
        { base64: dataUrl, mimeType: "application/pdf", sizeBytes: finalBytes.byteLength, preferirChunks: true },
        {
          categoria: r.categoria || null,
          equipo: r.equipo || null,
          codigo: r.codigo || null,
          aprobado: !!r.aprobado,
          verificar_url: verifyUrl,
          creado_iso: creadoLocal.toISOString(),
          fecha_vencimiento: venceLocal.toISOString(),
          file_name: r.fileName || `certificado_${id}.pdf`,
        },
        (e)=> { progress.value = e }
      )

      showProgress.value = false

      const blob = new Blob([finalBytes], { type:"application/pdf" })
      const objectUrl = URL.createObjectURL(blob)
      batchResults.value.push({
        id: savedId,
        name: r.fileName || `certificado_${savedId}.pdf`,
        downloadName: r.fileName || `certificado_${savedId}.pdf`,
        objectUrl,
        sizeBytes: finalBytes.byteLength,
        ok: true
      })

      batchProgress.value.current = i+1
      lastId.value = savedId
      lastVerifyUrl.value = verifyUrl
    }
    await cargarCertificados()
    showToast('success','Listo: certificados generados y guardados sin recomprimir')
  }catch(e){
    console.error(e)
    showToast('danger','Error procesando el lote')
  }finally{
    loading.value=false
    showProgress.value=false
  }
}

async function copiarTodos(){
  const links = batchResults.value.map(r => `${location.origin}/verificar?id=${r.id}`).join("\n")
  await copiar(links)
}

// layout = { xPct, yPct, sizePct } en coordenadas de la vista previa
// layout = { xPct, yPct, sizePct } en coordenadas de la vista previa
// fallbackPosition se usa SOLO si no pasas layout
async function buildPdfWithQr(fileObj, qrPngDataUrl, layout = null, fallbackPosition = DEFAULT_QR_PRESET) {
  const arrayBuffer = await fileObj.arrayBuffer()
  const isPdf =
    fileObj.type === "application/pdf" ||
    fileObj.name?.toLowerCase().endsWith(".pdf")

  // Si es imagen, la convertimos a PDF 1 página
  let pdfDoc
  if (isPdf) {
    pdfDoc = await PDFDocument.load(arrayBuffer)
  } else {
    pdfDoc = await PDFDocument.create()
    const imgBytes = new Uint8Array(arrayBuffer)
    const ext = (fileObj.type || "").toLowerCase()
    let img
    if (ext.includes("png")) img = await pdfDoc.embedPng(imgBytes)
    else img = await pdfDoc.embedJpg(imgBytes)

    const { width, height } = img.scale(1)
    const page = pdfDoc.addPage([width, height])
    page.drawImage(img, { x: 0, y: 0, width, height })
  }

  const pages = pdfDoc.getPages()
  if (!pages.length) throw new Error("PDF sin páginas")
  const page = pages[0]
  const { width, height } = page.getSize()

  // Embed QR PNG
  const qrBytes = await fetch(qrPngDataUrl).then(r => r.arrayBuffer())
  const qrImg = await pdfDoc.embedPng(qrBytes)

  // ✅ Embed Logo PNG (arriba del QR)
  const logoBytes = await fetch(logoSrc).then(r => r.arrayBuffer())
  const logoImg = await pdfDoc.embedPng(logoBytes)

  // Escalado del QR respecto al ancho de la página
  let qrSize, x, y

  if (layout) {
    const sizePct = layout.sizePct ?? DEFAULT_QR_SIZE_PCT
    qrSize = width * sizePct

    const centerX = width * (layout.xPct ?? 0.12)
    const centerYFromTop = height * (layout.yPct ?? 0.88)
    const centerY = height - centerYFromTop

    x = centerX - qrSize / 2
    y = centerY - qrSize / 2
  } else {
    const baseSizePct = 0.10
    qrSize = width * baseSizePct

    const margin = width * 0.03
    switch (fallbackPosition) {
      case "top-left":
        x = margin
        y = height - margin - qrSize
        break
      case "top-right":
        x = width - margin - qrSize
        y = height - margin - qrSize
        break
      case "bottom-left":
        x = margin
        y = margin
        break
      case "bottom-right":
      default:
        x = width - margin - qrSize
        y = margin
        break
    }
  }

  // ✅ Tamaño del logo (mismo ancho que el QR)
  const LOGO_H_RATIO = 0.30      // alto del logo relativo al QR (ajústalo si quieres)
  const GAP = 4                  // separación logo-QR
  const logoW = qrSize
  const logoH = qrSize * LOGO_H_RATIO
  const groupH = qrSize + GAP + logoH  // alto total (QR + gap + logo)

  // ✅ Clamp considerando el grupo completo (para que el logo no se corte arriba)
  const clampMargin = width * 0.01
  x = Math.min(width - clampMargin - qrSize, Math.max(clampMargin, x))
  y = Math.min(height - clampMargin - groupH, Math.max(clampMargin, y))

  // ✅ Fondo blanco detrás de todo (QR + logo)
  page.drawRectangle({
    x: x - 2,
    y: y - 2,
    width: qrSize + 4,
    height: groupH + 4,
    color: rgb(1, 1, 1),
    opacity: 0.90,
  })

  // QR (abajo)
  page.drawImage(qrImg, {
    x,
    y,
    width: qrSize,
    height: qrSize,
  })

  // ✅ Logo (arriba del QR)
  page.drawImage(logoImg, {
    x,
    y: y + qrSize + GAP,
    width: logoW,
    height: logoH,
  })

  // Guardamos sin recomprimir el original
  return await pdfDoc.save({ useObjectStreams: false })
}


/* ===== Ver / Descargar / Editar / Eliminar ===== */
const showViewer = ref(false)
const viewerUrl = ref("")
let viewerRevoke = null

async function ver(cert){
  try{
    const dataUrl = await obtenerCertificadoDataUrl(cert.id)
    viewerUrl.value = dataUrl
    showViewer.value = true
    viewerRevoke = null
  }catch(e){
    console.error(e)
    showToast("danger","No se pudo abrir el certificado")
  }
}
function closeViewer(){
  showViewer.value = false
  if (viewerRevoke) {
    URL.revokeObjectURL(viewerRevoke)
    viewerRevoke = null
  }
  viewerUrl.value = ""
}

async function descargar(cert){
  try{
    const dataUrl = await obtenerCertificadoDataUrl(cert.id)
    // convertir dataUrl a blob para descargar
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    downloadBlob(url, cert.file_name || `certificado_${cert.id}.pdf`)
    setTimeout(()=>URL.revokeObjectURL(url), 1500)
  }catch(e){
    console.error(e)
    showToast("danger","No se pudo descargar")
  }
}

/* ===== Editar ===== */
const showEdit = ref(false)
const editForm = reactive({
  id: "",
  categoria: "",
  equipo: "",
  codigo: "",
  aprobado: true,
})
const editNewFile = ref(null)

function abrirEditar(cert){
  editForm.id = cert.id
  editForm.categoria = cert.categoria || ""
  editForm.equipo = cert.equipo || ""
  editForm.codigo = cert.codigo || ""
  editForm.aprobado = !!cert.aprobado
  editNewFile.value = null
  showEdit.value = true
}

async function guardarEdicion(){
  if (!editForm.id) return
  if (!editForm.categoria) { showToast("warning","Selecciona categoría"); return }

  loading.value = true
  try{
    // update metadatos
    await actualizarMetadatos(editForm.id, {
      categoria: editForm.categoria || null,
      equipo: editForm.equipo || null,
      codigo: editForm.codigo || null,
      aprobado: !!editForm.aprobado,
    })

    // si hay archivo nuevo, reinyectar QR
    if (editNewFile.value) {
      const verifyUrl = `${location.origin}/verificar?id=${editForm.id}`
      const qrUrl = await QRCode.toDataURL(verifyUrl, { margin:1, width:300 })
      const newBytes = await buildPdfWithQr(editNewFile.value, qrUrl, qrLayout)

      const b64 = bytesToBase64(new Uint8Array(newBytes))
      const dataUrl = `data:application/pdf;base64,${b64}`

      showProgress.value = true
      progress.value = { stage: 'uploading', pct: 0, detail: 'Subiendo archivo actualizado…' }

      // Re-crear certificado en mismo id (tu servicio debe soportarlo) o usa actualizar archivo
      await crearCertificado(
        { base64: dataUrl, mimeType: "application/pdf", sizeBytes: newBytes.byteLength, preferirChunks: true, idForzar: editForm.id },
        {
          categoria: editForm.categoria || null,
          equipo: editForm.equipo || null,
          codigo: editForm.codigo || null,
          aprobado: !!editForm.aprobado,
          verificar_url: verifyUrl,
          creado_iso: new Date().toISOString(),
          fecha_vencimiento: addMonths(new Date(), 3).toISOString(),
          file_name: editNewFile.value?.name || `certificado_${editForm.id}.pdf`,
        },
        (e)=> { progress.value = e }
      )
      showProgress.value = false
    }

    await cargarCertificados()
    showToast("success","Cambios guardados")
    showEdit.value = false
  }catch(e){
    console.error(e)
    showToast("danger","Error guardando cambios")
  }finally{
    loading.value = false
    showProgress.value = false
  }
}

/* ===== Eliminar ===== */
const showConfirm = ref(false)
const confirmId = ref("")
function abrirEliminar(cert){
  confirmId.value = cert.id
  showConfirm.value = true
}
async function confirmarEliminar(){
  if (!confirmId.value) return
  try{
    await eliminarCertificadoSvc(confirmId.value)
    showToast("success","Eliminado")
    showConfirm.value = false
    confirmId.value = ""
    await cargarCertificados()
  }catch(e){
    console.error(e)
    showToast("danger","No se pudo eliminar")
  }
}

/* ===== Btn disable ===== */
const btnDisabled = computed(() => {
  if (loading.value) return true
  if (batchMode.value) {
    return !batchRows.value.length
  } else {
    return !file.value || !form.categoria
  }
})

/* ===== Mounted ===== */
onMounted(async () => {
  await cargarCategorias()
  await cargarCertificados()

  // default QR preview
  resetQrLayout()
})
</script>

<style scoped>
.table td, .table th { vertical-align: middle; }
</style>
