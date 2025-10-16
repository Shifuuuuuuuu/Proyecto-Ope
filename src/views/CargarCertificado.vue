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
              <div class="form-text">Se incrustará un QR en la primera página (abajo a la derecha) sin re-comprimir el PDF original.</div>
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
                <input v-model="form.codigo" @input="toUpper('codigo')" class="form-control" placeholder="DAND-CATC-L36"/>
              </div>
              <div class="col-md-6">
                <label class="form-label">Aprobado</label>
                <select v-model="form.aprobado" class="form-select">
                  <option :value="true">Sí</option>
                  <option :value="false">No</option>
                </select>
              </div>
            </template>

            <!-- Tabla de metadatos por archivo en lote -->
            <div v-if="batchMode && batchRows.length" class="col-12">
              <div class="table-responsive">
                <table class="table table-sm align-middle">
                  <thead class="table-light">
                    <tr>
                      <th style="width: 40px;">#</th>
                      <th>Archivo</th>
                      <th style="min-width: 200px;">Categoría</th>
                      <th style="min-width: 180px;">Equipo</th>
                      <th style="min-width: 140px;">Código</th>
                      <th style="min-width: 120px;">Aprobado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r,i) in batchRows" :key="r.key">
                      <td><span class="badge text-bg-secondary">{{ i+1 }}</span></td>
                      <td>
                        <div class="fw-semibold text-break">{{ r.fileName }}</div>
                        <div class="small text-muted">{{ humanSize(r.sizeBytes) }}</div>
                      </td>
                      <td>
                        <select class="form-select form-select-sm" v-model="r.categoria">
                          <option value="" disabled>— Seleccionar —</option>
                          <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
                        </select>
                      </td>
                      <td><input class="form-control form-control-sm" v-model.trim="r.equipo" @input="r.equipo=r.equipo.toUpperCase()" placeholder="MIXER 1234" /></td>
                      <td><input class="form-control form-control-sm" v-model.trim="r.codigo" @input="r.codigo=r.codigo.toUpperCase()" placeholder="XT-0001" /></td>
                      <td>
                        <select class="form-select form-select-sm" v-model="r.aprobado">
                          <option :value="true">Sí</option>
                          <option :value="false">No</option>
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <small class="text-muted">Completa categoría (obligatoria) por cada archivo.</small>
            </div>

            <!-- Botones -->
            <div class="col-12 d-flex gap-2 align-items-center">
              <button class="btn btn-primary" :disabled="btnDisabled">
                <span v-if="!loading">{{ batchMode ? 'Generar, trocear y guardar (lote)' : 'Guardar metadatos / descargar' }}</span>
                <span v-else class="spinner-border spinner-border-sm"></span>
              </button>
              <button type="button" class="btn btn-outline-secondary" @click="limpiar" :disabled="loading">Limpiar</button>

              <div v-if="batchMode && loading" class="ms-auto small text-muted">
                Procesando {{ batchProgress.current }} / {{ batchProgress.total }}
              </div>
            </div>
          </div>
        </form>

        <hr class="my-4" />

        <!-- Vista previa (modo 1 a 1) -->
        <div v-if="!batchMode && previewUrl" class="mt-3">
          <h6 class="text-muted">Vista previa (primera página):</h6>
          <embed :src="previewUrl" type="application/pdf" class="w-100" style="height: 420px;" />
          <div class="small text-muted mt-2">
            Tamaño final aprox.: <strong>{{ humanSize(bytesFinal) }}</strong>
            <span v-if="singlePreUploaded" class="badge bg-info ms-2">Subido al seleccionar (troceado si es grande)</span>
          </div>
        </div>

        <div v-if="!batchMode && qrDataUrl" class="mt-4">
          <h6 class="text-muted">QR generado:</h6>
          <img :src="qrDataUrl" alt="QR" style="width: 160px; height: 160px" />
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
                    <span v-if="r.preUploaded" class="badge bg-info ms-2">Subido al seleccionar</span>
                  </td>
                  <td>{{ humanSize(r.sizeBytes) }}</td>
                  <td>
                    <span class="badge bg-success">Sin recomprimir</span>
                  </td>
                  <td><router-link class="btn btn-success btn-sm" :to="`/verificar?id=${r.id}`">Abrir</router-link></td>
                  <td><button class="btn btn-outline-primary btn-sm" @click="downloadBlob(r.objectUrl, r.downloadName)">Descargar</button></td>
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

    <!-- LISTA DE CERTIFICADOS -->
    <div class="card shadow-sm mt-4">
      <div class="card-body">
        <!-- Controles -->
        <div class="row g-2 align-items-end mb-3">
          <div class="col-12 col-md-4">
            <label class="form-label mb-1">Buscar por equipo</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input v-model.trim="searchEquipo" class="form-control" placeholder="Ej: MIXER 1234" @input="onSearchChanged" />
              <button class="btn btn-outline-secondary" @click="clearSearch" :disabled="!searchEquipo">Limpiar</button>
            </div>
          </div>

          <div class="col-6 col-md-3">
            <label class="form-label mb-1">Categoría</label>
            <select class="form-select" v-model="filtroCategoria">
              <option value="">Todas</option>
              <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <div class="col-6 col-md-2">
            <label class="form-label mb-1">Mostrar</label>
            <select class="form-select" v-model.number="pageSize">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>

          <div class="col-12 col-md-3 d-flex gap-2">
            <button class="btn btn-outline-secondary w-100" @click="cargarCertificados" :disabled="loadingList">
              <span v-if="!loadingList">Actualizar</span>
              <span v-else class="spinner-border spinner-border-sm"></span>
            </button>
            <button class="btn btn-outline-primary w-100" @click="mostrarMas" :disabled="loadingList || pageSize>=100">Mostrar más</button>
          </div>
        </div>

        <!-- Tabla -->
        <div class="table-responsive">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Archivo</th><th>Categoría</th><th>Equipo</th><th>Código</th>
                <th>Creado</th><th>Vence</th><th>Estado</th><th style="width: 280px;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in paginados" :key="row.id">
                <td class="text-break">{{ row.file_name || ('certificado_'+row.id+'.pdf') }}</td>
                <td>{{ row.categoria || '—' }}</td>
                <td><span class="fw-semibold">{{ row.equipo || '—' }}</span></td>
                <td>{{ row.codigo || '—' }}</td>
                <td>{{ fechaLocal(row.creado?.toDate?.() || row.creado) }}</td>
                <td>{{ fechaLocal(row.fecha_vencimiento?.toDate?.() || row.fecha_vencimiento) }}</td>
                <td>
                  <span class="badge" :class="isVigente(row) ? 'bg-success' : 'bg-danger'">
                    {{ isVigente(row) ? 'Vigente' : 'No vigente' }}
                  </span>
                </td>
                <td class="d-flex flex-wrap gap-1">
                  <router-link class="btn btn-success btn-sm me-1" :to="`/verificar?id=${row.id}`">Probar</router-link>
                  <button class="btn btn-outline-primary btn-sm me-1" @click="descargar(row)">Descargar</button>
                  <button class="btn btn-outline-warning btn-sm me-1" @click="editar(row)">Editar</button>
                  <button class="btn btn-outline-danger btn-sm" @click="pedirEliminar(row)" :disabled="deletingId===row.id">
                    <span v-if="deletingId!==row.id">Eliminar</span>
                    <span v-else class="spinner-border spinner-border-sm"></span>
                  </button>
                </td>
              </tr>
              <tr v-if="paginados.length===0">
                <td colspan="8" class="text-center text-muted py-3">No hay certificados para mostrar.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div class="small text-muted">
            Mostrando {{ rangoInicio }}–{{ rangoFin }} de {{ filtrados.length }}
            <span v-if="searchEquipo"> • filtro equipo: <strong>{{ searchEquipo }}</strong></span>
            <span v-if="filtroCategoria"> • categoría: <strong>{{ filtroCategoria }}</strong></span>
          </div>
          <nav aria-label="Paginación" class="d-flex align-items-center gap-1">
            <button class="btn btn-outline-secondary btn-sm" :disabled="page===1" @click="page=1">«</button>
            <button class="btn btn-outline-secondary btn-sm" :disabled="page===1" @click="page--">Anterior</button>
            <span class="mx-2 small">Página <strong>{{ page }}</strong> de <strong>{{ totalPages }}</strong></span>
            <button class="btn btn-outline-secondary btn-sm" :disabled="page===totalPages" @click="page++">Siguiente</button>
            <button class="btn btn-outline-secondary btn-sm" :disabled="page===totalPages" @click="page=totalPages">»</button>
          </nav>
        </div>
      </div>
    </div>

    <!-- MODAL PROGRESO -->
    <div class="modal fade show d-block" tabindex="-1" role="dialog" v-if="showProgress" style="background: rgba(0,0,0,.35);">
      <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-body">
            <div class="d-flex align-items-center gap-2 mb-2">
              <div class="spinner-border" role="status" v-if="progress.pct<100"></div>
              <strong>
                {{ progress.stage === 'uploading' ? 'Subiendo…' :
                   progress.stage === 'optimizing' ? 'Optimizando…' :
                   progress.stage === 'reading' ? 'Leyendo…' : 'Procesando…' }}
              </strong>
            </div>
            <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-bar" :style="{width: progress.pct + '%'}">{{ progress.pct }}%</div>
            </div>
            <div class="small text-muted mt-2" v-if="progress.detail">{{ progress.detail }}</div>
            <div class="small text-danger mt-2" v-if="pdfJsError">⚠️ {{ pdfJsError }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL EDICIÓN -->
    <div class="modal fade show d-block" tabindex="-1" role="dialog" v-if="showEdit" style="background: rgba(0,0,0,.35);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title">Editar certificado</h6>
            <button type="button" class="btn-close" @click="showEdit=false"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Categoría</label>
                <select v-model="editForm.categoria" class="form-select">
                  <option value="" disabled>Selecciona</option>
                  <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Aprobado</label>
                <select v-model="editForm.aprobado" class="form-select">
                  <option :value="true">Sí</option>
                  <option :value="false">No</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Equipo</label>
                <input v-model="editForm.equipo" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Código</label>
                <input v-model="editForm.codigo" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Vence (ISO)</label>
                <input v-model="editForm.fecha_vencimiento" class="form-control" placeholder="YYYY-MM-DD o ISO" />
              </div>
              <div class="col-12">
                <label class="form-label">Reemplazar archivo (opcional)</label>
                <input type="file" class="form-control" accept="application/pdf,image/*" @change="e=>editNewFile=e.target.files?.[0]||null">
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
    <div class="modal fade show d-block" tabindex="-1" role="dialog" v-if="showConfirm" style="background: rgba(0,0,0,.35);">
      <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-body text-center p-4">
            <div class="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width:64px;height:64px;background:#fff0f0;border:1px solid #ffd6d6;">
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
      <div v-for="t in toasts" :key="t.id" class="toast show align-items-center text-white border-0 mb-2"
           :class="toastClass(t.variant)" role="alert">
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
import { doc, setDoc, serverTimestamp, getDocs, collection } from "firebase/firestore"
import logoSrc from "@/img/Logo XT Servicios Transparente.png"

/* Servicio */
import {
  crearCertificado,
  obtenerCertificadoDataUrl,
  listarCertificados,
  eliminarCertificado as eliminarCertificadoSvc,
  actualizarMetadatos,
  reemplazarArchivo
} from "@/services/certificadosService"

/* ===== Config nitidez (sin recomprimir) ===== */
/** No imponemos tope de 800KB. Si pesa, lo subimos en chunks vía Firestore. */
const PREUPLOAD_THRESHOLD_BYTES = 1_200 * 1024; // si pasa ~1.2MB binario, pre-subimos (troceado)

/* ===== Estado ===== */
const batchMode = ref(false)
const files = ref([])
const file = ref(null)
const loading = ref(false)
const previewUrl = ref(null)
const bytesFinal = ref(0)
const qrDataUrl = ref(null)
const verificationUrl = ref("")
const originalFileName = ref("")
const lastId = ref(null)
const lastVerifyUrl = ref("")
const singlePreUploaded = ref(false)
const preSavedId = ref(null)

const batchRows = ref([])
const batchResults = ref([])
const batchProgress = ref({ current: 0, total: 0 })

// progreso modal
const showProgress = ref(false)
const progress = ref({ stage: 'reading', pct: 0, detail: '' })
const pdfJsError = ref("") // mantenido para compat, pero ya no usamos pdf.js

// Modal de edición
const showEdit = ref(false)
const editRow = ref(null)
const editForm = reactive({ categoria:'', equipo:'', codigo:'', aprobado:true, fecha_vencimiento:'' })
let editNewFile = null

// Confirmación eliminar
const showConfirm = ref(false)
const pendingDeleteRow = ref(null)

// Categorías y lista
const categorias = ref([])
const filtroCategoria = ref("")
const lista = ref([])
const loadingList = ref(false)
const deletingId = ref(null)

// Búsqueda por equipo + paginación
const searchEquipo = ref("")
const page = ref(1)
const pageSize = ref(10)

const form = reactive({ categoria: "", equipo: "", codigo: "", aprobado: true })

const btnDisabled = computed(() => {
  if (loading.value) return true
  if (batchMode.value) {
    if (!batchRows.value.length) return true
    return batchRows.value.some(r => !r.categoria)
  }
  return !file.value || !form.categoria
})

watch(batchMode, () => {
  files.value = []
  file.value = null
  previewUrl.value = null
  bytesFinal.value = 0
  qrDataUrl.value = null
  verificationUrl.value = ""
  batchResults.value = []
  batchRows.value = []
  singlePreUploaded.value = false
  preSavedId.value = null
})

watch([filtroCategoria, pageSize, lista], () => { page.value = 1 })

/* ===== Helpers ===== */
function toUpper(field) { form[field] = (form[field] || "").toUpperCase() }
function fechaLocal(d) { try { const dt = d instanceof Date ? d : new Date(d); return dt.toLocaleDateString() + " " + dt.toLocaleTimeString() } catch { return "—" } }
function addMonths(date, months) { const d = new Date(date); d.setMonth(d.getMonth() + months); return d }
function bytesToBase64(bytes) {
  let binary = ""; const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode.apply(null, sub)
  }
  return btoa(binary)
}
function base64ToBlob(b64, type="application/pdf") {
  const binary = atob(b64); const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}
async function copiar(text) {
  try { await navigator.clipboard.writeText(text); showToast('success','Link copiado al portapapeles') }
  catch(e){ console.error(e); showToast('warning','No se pudo copiar. Copia manualmente el texto.') }
}
function humanSize(n) { if (n===0) return "0 B"; if (!n) return "—"; const u=["B","KB","MB"]; let i=0, x=n; while(x>=1024&&i<u.length-1){x/=1024;i++} return `${x.toFixed(2)} ${u[i]}` }
function downloadBlob(url, filename){ const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),10_000) }

/* ===== Toasts ===== */
const toasts = ref([])
function showToast(variant, msg, timeout=3500){
  const id = Math.random().toString(36).slice(2,9)
  toasts.value.push({ id, variant, msg })
  setTimeout(()=> closeToast(id), timeout)
}
function closeToast(id){
  toasts.value = toasts.value.filter(t => t.id !== id)
}
function toastClass(v){
  return {
    'bg-success': v==='success',
    'bg-danger': v==='danger',
    'bg-warning': v==='warning',
    'bg-info': v==='info',
  }
}
function toastIcon(v){
  switch(v){
    case 'success': return 'bi bi-check-circle-fill'
    case 'danger': return 'bi bi-x-circle-fill'
    case 'warning': return 'bi bi-exclamation-triangle-fill'
    default: return 'bi bi-info-circle-fill'
  }
}

/* ===== Categorías / Lista ===== */
async function cargarCategorias(){
  try{
    const snap=await getDocs(collection(db,"categorias"))
    categorias.value = snap.docs.map(d => (d.data()?.nombre || "").toString()).filter(Boolean).sort()
  }catch{
    categorias.value=[]
  }
}
async function cargarCertificados(){
  loadingList.value=true
  try{
    lista.value = await listarCertificados(1000)
  }catch(e){ console.error(e) }
  finally{ loadingList.value=false }
}
const filtrados = computed(()=>{
  const term = (searchEquipo.value || "").trim().toUpperCase()
  return lista.value.filter(r => {
    const byCat = (filtroCategoria.value ? r.categoria===filtroCategoria.value : true)
    const byEquipo = term ? (r.equipo || '').toUpperCase().includes(term) : true
    return byCat && byEquipo
  })
})
const totalPages = computed(()=> Math.max(1, Math.ceil(filtrados.value.length / pageSize.value)))
const paginados = computed(()=>{
  const start = (page.value - 1) * pageSize.value
  return filtrados.value.slice(start, start + pageSize.value)
})
const rangoInicio = computed(()=> filtrados.value.length ? ( (page.value-1)*pageSize.value + 1 ) : 0)
const rangoFin = computed(()=> Math.min(page.value*pageSize.value, filtrados.value.length))

function onSearchChanged(){ page.value = 1 }
function clearSearch(){ searchEquipo.value = ""; page.value = 1 }
function mostrarMas(){
  pageSize.value = Math.min( (pageSize.value + 10), 100 )
  page.value = 1
}

/* ===== Input file ===== */
async function onFile(e){
  if (batchMode.value){
    const arr = Array.from(e.target.files || [])
    batchRows.value = arr.map(f => ({
      key: `${Date.now()}_${f.name}_${Math.random().toString(36).slice(2,8)}`,
      file: f, fileName: f.name, sizeBytes: f.size,
      categoria: "", equipo: "", codigo: "", aprobado: true,
      id: null, preUploaded: false
    }))
  } else {
    file.value = e.target.files?.[0] || null
    originalFileName.value = file.value?.name || ""
    previewUrl.value=null; qrDataUrl.value=null; verificationUrl.value=""; bytesFinal.value=0
    singlePreUploaded.value = false; preSavedId.value = null

    if (file.value && file.value.size > PREUPLOAD_THRESHOLD_BYTES){
      await preUploadSingle(file.value)
    }
  }
}

/** Pre-subida inmediata (si excede ~1.2MB) usando troceo, sin recomprimir */
async function preUploadSingle(f){
  try{
    showProgress.value = true
    progress.value = { stage:'reading', pct: 0, detail:'Preparando borrador…' }

    const tempId = uuidv4()
    const creadoLocal = new Date()
    await setDoc(doc(db,"certificados", tempId), {
      creado: serverTimestamp(),
      creado_iso: creadoLocal.toISOString(),
      file_name: f.name || `certificado_${tempId}.pdf`,
      isDraft: true
    })

    const verifyUrl = `${location.origin}/verificar?id=${tempId}`
    await setDoc(doc(db,"certificados", tempId), { verificar_url: verifyUrl }, { merge: true })
    const qrUrl = await QRCode.toDataURL(verifyUrl, { margin:1, width:300 })
    verificationUrl.value = verifyUrl
    qrDataUrl.value = qrUrl

    progress.value = { stage:'optimizing', pct: 10, detail:'Incrustando QR (sin perder calidad)…' }
    const finalBytes = await buildPdfWithQr(f, qrUrl) // sin rasterizar

    const blob = new Blob([finalBytes], { type:"application/pdf" })
    const url = URL.createObjectURL(blob)
    previewUrl.value = url
    bytesFinal.value = finalBytes.byteLength

    const b64 = bytesToBase64(new Uint8Array(finalBytes))
    const dataUrl = `data:application/pdf;base64,${b64}`

    progress.value = { stage:'uploading', pct: 0, detail:'Subiendo (en partes si hace falta)…' }
    await reemplazarArchivo(
      tempId,
      { base64: dataUrl, mimeType: 'application/pdf', sizeBytes: finalBytes.byteLength, preferirChunks: true },
      (e)=>{ progress.value = e }
    )

    showProgress.value = false
    singlePreUploaded.value = true
    preSavedId.value = tempId
    lastId.value = tempId
    lastVerifyUrl.value = verifyUrl
    showToast('success','Archivo grande pre-subido sin recomprimir; listo para guardar metadatos')
  }catch(e){
    console.error(e)
    showProgress.value = false
    showToast('danger','No se pudo subir el archivo al seleccionar')
  }
}

/* ===== Flujo simple ===== */
function limpiar(){
  files.value=[]; file.value=null; originalFileName.value="";
  previewUrl.value=null; qrDataUrl.value=null; verificationUrl.value="";
  bytesFinal.value=0; form.categoria=""; form.equipo=""; form.codigo=""; form.aprobado=true;
  batchResults.value=[]; batchRows.value=[];
  singlePreUploaded.value=false; preSavedId.value=null
}

async function procesar(){
  if (!file.value) return
  if (!form.categoria) { showToast('warning',"Selecciona una categoría"); return }

  loading.value = true
  try{
    const creadoLocal = new Date()
    const venceLocal = addMonths(creadoLocal, 3)

    if (singlePreUploaded.value && preSavedId.value){
      await actualizarMetadatos(preSavedId.value, {
        categoria: form.categoria || null,
        equipo: form.equipo || null,
        codigo: form.codigo || null,
        aprobado: !!form.aprobado,
        fecha_vencimiento: venceLocal.toISOString(),
        isDraft: false
      })
      await cargarCertificados()
      showToast('success','Metadatos guardados correctamente')
      if (previewUrl.value){
        downloadBlob(previewUrl.value, originalFileName.value || `certificado_${preSavedId.value}.pdf`)
      }
      return
    }

    const id = uuidv4()
    const verifyUrl = `${location.origin}/verificar?id=${id}`
    verificationUrl.value = verifyUrl
    qrDataUrl.value = await QRCode.toDataURL(verifyUrl, { margin:1, width:300 })

    const finalBytes = await buildPdfWithQr(file.value, qrDataUrl.value) // sin rasterizar
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
  }catch(err){ console.error(err); showToast('danger','Error generando/guardando el PDF') }
  finally{ loading.value=false }
}

/* ===== Flujo lote ===== */
async function procesarBatch(){
  if (!batchRows.value.length) return
  if (batchRows.value.some(r => !r.categoria)) { showToast('warning','Completa categoría en todas las filas'); return }

  loading.value = true
  batchResults.value = []
  batchProgress.value = { current:0, total: batchRows.value.length }

  try{
    for (let i=0;i<batchRows.value.length;i++){
      const r = batchRows.value[i]
      const id = uuidv4()
      const verifyUrl = `${location.origin}/verificar?id=${id}`
      const qrUrl = await QRCode.toDataURL(verifyUrl, { margin:1, width:300 })

      const finalBytes = await buildPdfWithQr(r.file, qrUrl) // sin rasterizar

      const creadoLocal = new Date(); const venceLocal = addMonths(creadoLocal, 3)
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
        objectUrl, sizeBytes: finalBytes.byteLength, ok: true, preUploaded: false
      })

      batchProgress.value.current = i+1
      lastId.value = savedId; lastVerifyUrl.value = verifyUrl
    }
    await cargarCertificados()
    showToast('success','Listo: certificados generados y guardados sin recomprimir')
  }catch(e){ console.error(e); showToast('danger','Error procesando el lote') }
  finally{ loading.value=false; showProgress.value=false }
}

async function copiarTodos(){
  const links = batchResults.value.map(r => `${location.origin}/verificar?id=${r.id}`).join("\n")
  await copiar(links)
}

/* ===== Construcción PDF + QR (sin rasterizar) ===== */
async function buildPdfWithQr(fileObj, qrPngDataUrl){
  const arrayBuf = await fileObj.arrayBuffer()
  const isPdf = fileObj.type === "application/pdf" || fileObj.name?.toLowerCase().endsWith(".pdf")
  let pdfDoc, pages

  if (isPdf){
    // Carga el PDF tal cual (no convierte a imagen)
    pdfDoc = await PDFDocument.load(arrayBuf, { updateMetadata: false })
    pages = pdfDoc.getPages()
  } else {
    // Archivo de imagen -> crear PDF con la imagen a resolución nativa
    pdfDoc = await PDFDocument.create()
    const ext = (fileObj.name || "").toLowerCase()
    const isPng = ext.endsWith(".png") || fileObj.type === "image/png"
    const img = isPng ? await pdfDoc.embedPng(arrayBuf) : await pdfDoc.embedJpg(arrayBuf) // PNG sin pérdida, JPG se incrusta
    const page = pdfDoc.addPage([img.width, img.height])
    page.drawImage(img, { x:0, y:0, width:img.width, height:img.height })
    pages = pdfDoc.getPages()
  }

  // Embed QR y logo en PNG (vector en PDF-lib como objeto imagen)
  const qrBytes = await (await fetch(qrPngDataUrl)).arrayBuffer()
  const qrImg = await pdfDoc.embedPng(qrBytes)

  const logoBytes = await fetch(logoSrc).then(res => res.arrayBuffer())
  const logoImg = await pdfDoc.embedPng(logoBytes)

  const first = pages[0]
  const qrSize = 120, margin = 24
  const { width } = first.getSize()
  const x = width - qrSize - margin
  const y = margin

  // Caja blanca detrás (para legibilidad), no afecta nitidez del contenido original
  const pad = 12, boxW = qrSize + pad*2, boxH = qrSize + pad*2 + 50
  first.drawRectangle({ x: x - pad, y, width: boxW, height: boxH, color: rgb(1,1,1) })
  first.drawImage(logoImg, { x, y: y + qrSize + pad + 10, width: qrSize, height: qrSize*0.25 })
  first.drawImage(qrImg,   { x, y: y + pad, width: qrSize, height: qrSize })

  // Guardar sin object streams para compat; no recomprime contenido existente
  return await pdfDoc.save({ useObjectStreams:false })
}

/* ===== Acciones lista ===== */
function isVigente(row){
  const vence = row.fecha_vencimiento?.toDate?.() || new Date(row.fecha_vencimiento)
  if(!vence) return false
  return new Date() <= vence && !!row.aprobado
}

async function descargar(row){
  try{
    const dataUrl = await obtenerCertificadoDataUrl(row.id)
    if (!dataUrl) { showToast('warning',"No se encontró archivo"); return }
    const b64 = dataUrl.replace(/^data:.*?;base64,/, '')
    const blob = base64ToBlob(b64, row.mimeType || "application/pdf")
    const url = URL.createObjectURL(blob)
    downloadBlob(url, row.file_name || `certificado_${row.id}.pdf`)
  }catch(e){ console.error(e); showToast('danger','No se pudo descargar') }
}

function pedirEliminar(row){
  pendingDeleteRow.value = row
  showConfirm.value = true
}
async function confirmarEliminar(){
  const row = pendingDeleteRow.value
  if (!row) { showConfirm.value=false; return }
  showConfirm.value = false
  deletingId.value = row.id
  try{
    await eliminarCertificadoSvc(row.id)
    lista.value = lista.value.filter(r => r.id !== row.id)
    showToast('success','Certificado eliminado correctamente')
  }catch(e){ console.error(e); showToast('danger','No se pudo eliminar') }
  finally{ deletingId.value=null }
}

function editar(row){
  editRow.value = row
  editForm.categoria = row.categoria || ''
  editForm.equipo = row.equipo || ''
  editForm.codigo = row.codigo || ''
  editForm.aprobado = !!row.aprobado
  const v = row.fecha_vencimiento?.toDate?.() || row.fecha_vencimiento || ''
  editForm.fecha_vencimiento = (v && typeof v === 'string') ? v : (v ? new Date(v).toISOString().slice(0,19) : '')
  editNewFile = null
  showEdit.value = true
}

async function guardarEdicion(){
  if (!editRow.value) return
  loading.value = true
  try{
    await actualizarMetadatos(editRow.value.id, {
      categoria: editForm.categoria || null,
      equipo: editForm.equipo || null,
      codigo: editForm.codigo || null,
      aprobado: !!editForm.aprobado,
      fecha_vencimiento: editForm.fecha_vencimiento || editRow.value.fecha_vencimiento || null,
    })

    if (editNewFile){
      let verifyUrl = editRow.value.verificar_url
      if (!verifyUrl){
        verifyUrl = `${location.origin}/verificar?id=${editRow.value.id}`
        await actualizarMetadatos(editRow.value.id, { verificar_url: verifyUrl })
      }
      const qrUrl = await QRCode.toDataURL(verifyUrl, { margin:1, width:300 })
      const newBytes = await buildPdfWithQr(editNewFile, qrUrl) // sin rasterizar

      const b64 = bytesToBase64(new Uint8Array(newBytes))
      const dataUrl = `data:application/pdf;base64,${b64}`

      showProgress.value = true
      progress.value = { stage:'uploading', pct:0, detail:'Reemplazando archivo…' }
      await reemplazarArchivo(
        editRow.value.id,
        { base64: dataUrl, mimeType: 'application/pdf', sizeBytes: newBytes.byteLength, preferirChunks: true },
        (e)=>{ progress.value = e }
      )
      showProgress.value = false
    }

    await cargarCertificados()
    showEdit.value = false
    showToast('success','Cambios guardados (sin pérdida de nitidez)')
  }catch(e){
    console.error(e)
    showToast('danger','No se pudo guardar la edición')
  }finally{
    loading.value = false
  }
}

onMounted(async () => { await cargarCategorias(); await cargarCertificados() })
</script>

<style scoped>
.table td, .table th { vertical-align: middle; }
.modal { backdrop-filter: blur(1px); }

/* Mejora visual toasts */
.toast .toast-body { font-weight: 500; }
</style>
