<template>
  <div class="ingreso-page container-fluid py-4">

    <!-- ===== HERO HEADER (RECTANGULAR + COMPACTO) ===== -->
    <div class="hero card border-0 shadow-sm overflow-hidden mb-3">
      <div class="hero-bg"></div>

      <div class="card-body position-relative py-3 px-3 px-sm-4">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <!-- Left -->
          <div class="d-flex align-items-start gap-2 minw-0">
            <button class="btn btn-outline-secondary btn-sm btn-rect" @click="volver">
              <i class="bi bi-arrow-left"></i>
              <span class="d-none d-sm-inline ms-1">Volver</span>
            </button>

            <div class="minw-0">
              <h1 class="h6 fw-black mb-0">Ingreso de equipos</h1>
              <div class="text-muted small">Registro y seguimiento de equipos por taller.</div>

              <div class="metrics mt-2">
                <span class="badge text-bg-secondary badge-rect">
                  Total: {{ itemsFiltrados.length }}
                </span>
                <span class="badge text-bg-dark badge-rect">
                  Ingreso: {{ conteoPorEstado('INGRESO') }}
                </span>
                <span class="badge text-bg-info badge-rect">
                  En proceso: {{ conteoPorEstado('EN PROCESO') }}
                </span>
                <span class="badge text-bg-warning text-dark badge-rect">
                  En espera: {{ conteoPorEstado('EN ESPERA') }}
                </span>
                <span class="badge text-bg-success badge-rect">
                  Entregado: {{ conteoPorEstado('ENTREGADO') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right -->
          <div class="controls d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2 w-100 w-lg-auto">
            <div class="d-flex align-items-center gap-2 w-100">
              <label class="small text-secondary mb-0 d-none d-sm-inline">Taller</label>
              <select
                class="form-select form-select-sm minw-260 flex-grow-1"
                v-model="tallerActivo"
                @change="recargar()"
              >
                <option v-for="t in TALLER_OPTS" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>

            <div class="d-flex gap-2 flex-wrap justify-content-sm-end">
              <button
                v-if="!isVisualizador"
                class="btn btn-success btn-sm btn-rect"
                @click="exportarExcel"
                :disabled="exportLoading || loading || itemsFiltrados.length===0"
              >
                <span v-if="exportLoading" class="spinner-border spinner-border-sm me-2" />
                <i class="bi bi-file-earmark-excel me-1"></i> Exportar
              </button>

              <button class="btn btn-outline-secondary btn-sm btn-rect" @click="recargar()" :disabled="loading">
                <i class="bi bi-arrow-clockwise me-1"></i> Actualizar
              </button>

              <button class="btn btn-outline-primary btn-sm btn-rect" @click="irHistorial" :disabled="loading">
                <i class="bi bi-clock-history me-1"></i> Historial
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== FORMULARIO (oculto a visualizador) ===== -->
    <div class="card border-0 shadow-sm mb-4 box-rect" v-if="!isVisualizador">
      <div class="card-header form-header header-rect">
        <div class="d-flex justify-content-between align-items-center">
          <strong class="d-flex align-items-center gap-2">
            <span class="header-icon"><i class="bi bi-plus-circle"></i></span>
            {{ editMode ? 'Editar ingreso' : 'Ingresar equipo' }}
          </strong>
          <small class="text-white-50">Taller activo: {{ tallerActivo }}</small>
        </div>
      </div>

      <div class="card-body p-3 p-sm-4 position-relative">
        <form @submit.prevent="onSubmit" novalidate>
          <div class="row g-3">

            <!-- Patente -->
            <div class="col-12 col-md-4">
              <label class="form-label">Patente *</label>
              <input
                type="text"
                class="form-control"
                v-model.trim="form.patente"
                list="equipos-list"
                placeholder="KSRG-57 o KSRG57"
                maxlength="30"
                @change="normalizarPatente"
                @blur="normalizarPatente"
              >
              <datalist id="equipos-list">
                <option v-for="e in equiposIndex" :key="e.id + '-p'" :value="e.patente">
                  {{ e.nombre_equipo || '' }}
                </option>
                <option v-for="e in equiposIndex" :key="e.id + '-n'" :value="e.nombre_equipo">
                  {{ e.patente || '' }}
                </option>
              </datalist>
              <div v-if="errors.patente" class="invalid-feedback d-block">{{ errors.patente }}</div>
              <small class="form-text text-muted" v-if="equipoReferencia">
                <i class="bi bi-info-circle me-1"></i>{{ equipoReferencia }}
              </small>
            </div>

            <!-- Tipo de equipo -->
            <div class="col-12 col-sm-6 col-md-3">
              <label class="form-label">Tipo de equipo *</label>
              <select class="form-select" v-model="form.tipoEquipo">
                <option value="">Seleccione…</option>
                <option v-for="t in tipoEquipoOpts" :key="t" :value="t">{{ t }}</option>
              </select>
              <div v-if="errors.tipoEquipo" class="invalid-feedback d-block">{{ errors.tipoEquipo }}</div>
              <small v-if="tipoEquipoCargando" class="text-muted">Cargando categorías…</small>
            </div>

            <div class="col-6 col-md-3">
              <label class="form-label">Fecha recepción *</label>
              <input type="date" class="form-control" v-model="form.fechaRecepcion">
              <div v-if="errors.fechaRecepcion" class="invalid-feedback d-block">{{ errors.fechaRecepcion }}</div>
            </div>

            <div class="col-6 col-md-2">
              <label class="form-label">Hora recepción *</label>
              <input type="time" class="form-control" v-model="form.horaRecepcion">
              <div v-if="errors.horaRecepcion" class="invalid-feedback d-block">{{ errors.horaRecepcion }}</div>
            </div>

            <!-- Medición -->
            <div class="col-12 col-sm-6 col-md-3">
              <label class="form-label">Medición (Ingreso) *</label>
              <div class="input-group">
                <input type="number" min="0" step="0.01" class="form-control" v-model.number="form.medicionValor" placeholder="702333">
                <select class="form-select" style="max-width:110px" v-model="form.medicionUnidad">
                  <option value="KM">Km</option>
                  <option value="HRS">Hrs</option>
                </select>
              </div>
              <div v-if="errors.medicion" class="invalid-feedback d-block">{{ errors.medicion }}</div>
            </div>

            <div class="col-12 col-md-5">
              <label class="form-label">Trabajos a realizar *</label>
              <textarea class="form-control" rows="2" v-model.trim="form.trabajos" placeholder="Mantención semanal / neumáticos…"></textarea>
              <div v-if="errors.trabajos" class="invalid-feedback d-block">{{ errors.trabajos }}</div>
            </div>

            <!-- Status -->
            <div class="col-12 col-sm-6 col-md-4">
              <label class="form-label">Status *</label>
              <select class="form-select" v-model="form.status" :disabled="!editMode">
                <option value="INGRESO">Ingreso</option>
                <option value="EN PROCESO">En proceso</option>
                <option value="EN ESPERA">En espera</option>
                <option value="ENTREGADO">Entregado</option>
              </select>
              <div class="form-text" v-if="!editMode">Se crea como <strong>INGRESO</strong>.</div>
              <div v-if="errors.status" class="invalid-feedback d-block">{{ errors.status }}</div>
            </div>

            <div class="col-6 col-md-3">
              <label class="form-label">Fecha aprox. entrega</label>
              <input type="date" class="form-control" v-model="form.fechaEntregaEstimada">
            </div>

            <div class="col-6 col-md-3">
              <label class="form-label">Hora aprox. entrega</label>
              <input type="time" class="form-control" v-model="form.horaEntregaEstimada">
            </div>

            <div class="col-12 d-flex flex-column flex-sm-row justify-content-end gap-2 mt-2">
              <button type="button" class="btn btn-outline-secondary btn-rect" @click="limpiarFormulario" :disabled="saving">
                <i class="bi bi-eraser me-1"></i> Limpiar
              </button>
              <button type="submit" class="btn btn-primary btn-rect" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                {{ editMode ? 'Actualizar' : 'Guardar' }}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>

    <!-- ===== FILTROS ===== -->
    <div class="card border-0 shadow-sm mb-3 box-rect">
      <div class="card-body p-3 p-sm-4">
        <div class="row g-3 align-items-end">
          <div class="col-12 col-md-4">
            <label class="form-label">Buscar por patente / trabajos / status</label>
            <input type="text" class="form-control" v-model.trim="q" placeholder="Ej: KSRG / semanal / proceso…">
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label">Estado</label>
            <select class="form-select" v-model="filtroEstado">
              <option value="">Todos</option>
              <option value="INGRESO">Ingreso</option>
              <option value="EN PROCESO">En proceso</option>
              <option value="EN ESPERA">En espera</option>
              <option value="ENTREGADO">Entregado</option>
            </select>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label">Orden</label>
            <select class="form-select" v-model="orden">
              <option value="reciente">Más recientes</option>
              <option value="antiguo">Más antiguos</option>
              <option value="patente">Patente (A-Z)</option>
            </select>
          </div>
          <div class="col-12 col-md-2">
            <button class="btn btn-outline-dark w-100 btn-rect" @click="limpiarFiltros">
              <i class="bi bi-x-circle me-1"></i>Limpiar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== TABLA ===== -->
    <div class="card border-0 shadow-sm box-rect">
      <div class="card-header bg-body-tertiary d-flex justify-content-between align-items-center header-rect">
        <strong class="d-flex align-items-center gap-2">
          <span class="header-icon soft"><i class="bi bi-table"></i></span>
          Equipos ingresados
        </strong>
        <small class="text-muted">Taller: {{ tallerActivo }}</small>
      </div>

      <div class="card-body p-0">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border"></div>
        </div>

        <div v-else>
          <div v-if="itemsFiltrados.length === 0" class="p-4 text-center text-muted">
            No hay equipos para mostrar.
          </div>

          <div v-else class="table-responsive">
            <table class="table table-bordered align-middle table-hover mb-0 table-pro">
              <thead class="table-light sticky-head">
                <tr>
                  <th class="text-center">Patente</th>
                  <th>Tipo de equipo</th>
                  <th class="text-center">Fecha recepción</th>
                  <th class="text-center d-none d-md-table-cell">Hora recepción</th>
                  <th class="text-center d-none d-sm-table-cell">Medición</th>
                  <th class="d-none d-lg-table-cell" style="min-width: 360px;">Trabajos a realizar</th>
                  <th class="text-center">Status</th>
                  <th class="text-center d-none d-md-table-cell" style="min-width: 220px;">Tiempo aprox. entrega</th>
                  <th v-if="!isVisualizador" class="text-center" style="min-width: 140px;">Acciones</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="it in itemsFiltrados" :key="it.id">
                  <td class="text-center fw-semibold">
                    <span class="badge text-bg-dark badge-rect">{{ it.patente }}</span>
                  </td>
                  <td>{{ it.tipoEquipo }}</td>
                  <td class="text-center">{{ fFecha(it.fechaRecepcion) }}</td>
                  <td class="text-center d-none d-md-table-cell">{{ it.horaRecepcion || '—' }}</td>
                  <td class="text-center d-none d-sm-table-cell">{{ fMedicion(it.medicionValor, it.medicionUnidad) }}</td>

                  <td class="d-none d-lg-table-cell">
                    <div class="text-wrap clamp-2" style="white-space:pre-line;">{{ it.trabajos }}</div>
                  </td>

                  <td class="text-center">
                    <!-- si tu badgeEstado trae rounded-pill, lo “cuadramos” con CSS abajo -->
                    <span :class="badgeEstado(it.status)">{{ it.status }}</span>
                  </td>

                  <td class="text-center d-none d-md-table-cell">
                    <div v-if="it.fechaEntregaEstimada || it.horaEntregaEstimada">
                      {{ fFecha(it.fechaEntregaEstimada) }}
                      <span v-if="it.horaEntregaEstimada">- {{ it.horaEntregaEstimada }}</span>
                    </div>
                    <small v-else class="text-muted">—</small>
                  </td>

                  <td v-if="!isVisualizador" class="text-center">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary btn-rect" @click="editar(it)" title="Editar">
                        <i class="bi bi-pencil-square"></i>
                      </button>
                      <button class="btn btn-outline-success btn-rect" @click="marcarEntregado(it)" :disabled="it.status==='ENTREGADO'" title="Marcar entregado">
                        <i class="bi bi-check2-circle"></i>
                      </button>
                      <button class="btn btn-outline-danger btn-rect" @click="eliminar(it)" title="Eliminar">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>

    <!-- ===== MODAL CONFIRMACIÓN (entregado) ===== -->
    <div class="modal fade show" tabindex="-1" style="display:block;" v-if="entregaConfirm.visible" @click.self="entregaConfirm.visible=false">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content modal-pro box-rect">
          <div class="modal-header header-rect">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-check2-circle me-2 text-success"></i>Confirmar entrega
            </h5>
            <button class="btn-close" @click="entregaConfirm.visible=false"></button>
          </div>
          <div class="modal-body">
            ¿Marcar el equipo <strong>{{ entregaConfirm.item?.patente }}</strong> como <strong>ENTREGADO</strong>?
            <div class="form-text mt-2">Se registrará la fecha/hora actual como entrega real.</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-rect" @click="entregaConfirm.visible=false">Cancelar</button>
            <button class="btn btn-success btn-rect" @click="aceptarEntrega" :disabled="entregaConfirm.saving">
              <span v-if="entregaConfirm.saving" class="spinner-border spinner-border-sm me-2" />
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>


<script setup>
import { ref, computed, onMounted, defineOptions } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../firebase/config'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  query, where, orderBy, serverTimestamp, getDoc
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import * as XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'

defineOptions({ name: 'IngresoEquiposView' })

/** Volver */
const router = useRouter()
const volver = () => router.back()

/* ----------- ROLES ----------- */
const rolUsuario = ref('')
const isVisualizador = computed(() => (rolUsuario.value || '').toLowerCase() === 'visualizador')

/* --------------------------
   CATÁLOGOS (TALLERES en MAYÚSCULA)
--------------------------- */
const TALLER_OPTS = ['TALLER CASA MATRIZ', 'TALLER CANECHE', 'TALLER OLIVAR']
const LEGACY_TALLER_MAP = {
  'TALLER CASA MATRIZ': 'Taller Casa Matriz',
  'TALLER CANECHE': 'Taller Caneche',
  'TALLER OLIVAR': 'Taller Olivar'
}

/* --------------------------
   STATE
--------------------------- */
const loading = ref(true)
const saving = ref(false)
const exportLoading = ref(false)

const tallerActivo = ref(TALLER_OPTS[0])
const items = ref([])

const q = ref('')
const filtroEstado = ref('')
const orden = ref('reciente')

const editMode = ref(false)
const editingId = ref(null)
const form = ref({
  patente: '',
  tipoEquipo: '',
  fechaRecepcion: '',
  horaRecepcion: '',
  medicionValor: null,
  medicionUnidad: 'KM',
  trabajos: '',
  status: 'INGRESO',
  fechaEntregaEstimada: '',
  horaEntregaEstimada: ''
})
const errors = ref({})

/* ---- categorías dinámicas (tipo de equipo) ---- */
const tipoEquipoOpts = ref([])
const tipoEquipoCargando = ref(false)

/* ---- índice de equipos para autocompletado ---- */
const equiposIndex = ref([])
const equipoReferencia = computed(() => {
  const v = (form.value.patente || '').trim()
  if (!v) return ''
  const u = v.toUpperCase()
  const e = equiposIndex.value.find(x => x.patenteUpper === u || x.nombreUpper === u)
  if (!e) return ''
  const partes = []
  if (e.nombre_equipo) partes.push(`Nombre: ${e.nombre_equipo}`)
  if (e.patente) partes.push(`Patente: ${e.patente}`)
  if (e.categoriaUpper) partes.push(`Categoría: ${e.categoriaUpper}`)
  return partes.join(' · ')
})

/* --------------------------
   HELPERS
--------------------------- */
function todayISO () {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function nowHM () {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
const nf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 })
const fMedicion = (v, u) => (v === null || v === undefined) ? '—' : `${nf.format(Number(v))} ${String(u || 'KM').toUpperCase()}`
const fFecha = (iso) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2,'0')
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch { return '' }
}
const badgeEstado = (s) => {
  const v = String(s || '').toUpperCase()
  if (v === 'ENTREGADO') return 'badge rounded-pill text-bg-success'
  if (v === 'EN ESPERA') return 'badge rounded-pill text-bg-warning text-dark'
  if (v === 'EN PROCESO') return 'badge rounded-pill text-bg-info'
  return 'badge rounded-pill text-bg-dark'
}
const conteoPorEstado = (s) => itemsFiltrados.value.filter(i => i.status === s).length

function limpiarFormulario () {
  form.value = {
    patente: '',
    tipoEquipo: '',
    fechaRecepcion: todayISO(),
    horaRecepcion: nowHM(),
    medicionValor: null,
    medicionUnidad: 'KM',
    trabajos: '',
    status: 'INGRESO',
    fechaEntregaEstimada: '',
    horaEntregaEstimada: ''
  }
  errors.value = {}
  editMode.value = false
  editingId.value = null
}

/* --------------------------
   VALIDACIÓN
--------------------------- */
function validar() {
  const e = {}
  if (!tallerActivo.value) e.taller = 'Selecciona un taller'
  if (!form.value.patente) e.patente = 'Ingresa una patente'
  if (!form.value.tipoEquipo) e.tipoEquipo = 'Selecciona el tipo'
  if (!form.value.fechaRecepcion) e.fechaRecepcion = 'Ingresa la fecha de recepción'
  if (!form.value.horaRecepcion) e.horaRecepcion = 'Ingresa la hora de recepción'
  if (form.value.medicionValor === null || form.value.medicionValor < 0) e.medicion = 'Ingresa una medición válida'
  if (!form.value.trabajos) e.trabajos = 'Describe los trabajos'
  if (!form.value.status) e.status = 'Selecciona el status'
  errors.value = e
  return Object.keys(e).length === 0
}

/* --------------------------
   FIRESTORE: categorías (tipoEquipo)
--------------------------- */
async function cargarCategorias() {
  tipoEquipoCargando.value = true
  const set = new Set()

  try {
    const snap = await getDocs(collection(db, 'categorias_equipos'))
    snap.forEach(d => {
      const data = d.data() || {}
      const n = data.nombre || data.label || d.id
      if (n) set.add(String(n).toUpperCase())
    })
  } catch { /* noop */ }

  if (set.size === 0) {
    try {
      const snap = await getDocs(collection(db, 'categorias'))
      snap.forEach(d => {
        const data = d.data() || {}
        const kind = String(data.tipo || data.type || '').toLowerCase()
        if (!data.tipo || kind === 'equipo' || kind === 'equipos') {
          const n = data.nombre || data.name || d.id
          if (n) set.add(String(n).toUpperCase())
        }
      })
    } catch { /* noop */ }
  }

  if (set.size === 0) {
    try {
      const snap = await getDocs(collection(db, 'equipos'))
      snap.forEach(d => {
        const cat = (d.data() || {}).categoria
        if (cat) set.add(String(cat).toUpperCase())
      })
    } catch { /* noop */ }
  }

  tipoEquipoOpts.value = Array.from(set).sort((a,b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
  tipoEquipoCargando.value = false
}

/* --------------------------
   FIRESTORE: índice de equipos (autocompletar)
--------------------------- */
async function cargarEquiposIndex() {
  const arr = []
  try {
    const snap = await getDocs(collection(db, 'equipos'))
    snap.forEach(d => {
      const data = d.data() || {}
      const patente = (data.patente || '').toString().trim()
      const nombre_equipo = (data.nombre_equipo || '').toString().trim()
      const categoria = (data.categoria || '').toString().trim()
      if (!patente && !nombre_equipo) return
      arr.push({
        id: d.id,
        patente,
        nombre_equipo,
        categoriaUpper: categoria ? categoria.toUpperCase() : '',
        patenteUpper: patente ? patente.toUpperCase() : '',
        nombreUpper: nombre_equipo ? nombre_equipo.toUpperCase() : ''
      })
    })
  } catch (e) {
    console.error('cargarEquiposIndex error:', e)
  }
  equiposIndex.value = arr
}

function normalizarPatente() {
  const v = (form.value.patente || '').trim()
  if (!v) return
  const u = v.toUpperCase()
  const eq = equiposIndex.value.find(e => e.patenteUpper === u || e.nombreUpper === u)
  if (eq) {
    form.value.patente = (eq.patente || u).toUpperCase()
    if (eq.categoriaUpper) {
      if (!tipoEquipoOpts.value.includes(eq.categoriaUpper)) {
        tipoEquipoOpts.value.push(eq.categoriaUpper)
        tipoEquipoOpts.value.sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}))
      }
      form.value.tipoEquipo = eq.categoriaUpper
    }
  } else {
    form.value.patente = u
  }
}

/* --------------------------
   FIRESTORE: cargar/guardar por taller
--------------------------- */
async function cargarItems() {
  items.value = []
  if (!tallerActivo.value) return

  const variantes = Array.from(new Set([
    tallerActivo.value,
    LEGACY_TALLER_MAP[tallerActivo.value] || ''
  ].filter(Boolean)))

  const list = []
  for (const nombre of variantes) {
    try {
      const qy = query(
        collection(db, 'ingreso_equipos'),
        where('taller', '==', nombre),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(qy)
      list.push(...snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) })))
    } catch (err) {
      if (err?.code === 'failed-precondition') {
        const qy2 = query(collection(db, 'ingreso_equipos'), where('taller', '==', nombre))
        const snap2 = await getDocs(qy2)
        list.push(...snap2.docs.map(d => ({ id: d.id, ...(d.data() || {}) })))
      } else {
        console.error('cargarItems error:', err)
      }
    }
  }

  const uniq = new Map()
  for (const it of list) {
    uniq.set(it.id, { ...it, taller: String(it.taller || '').toUpperCase() })
  }
  items.value = Array.from(uniq.values()).sort(
    (a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  )
}

async function recargar() {
  loading.value = true
  try {
    await cargarItems()
  } finally {
    loading.value = false
  }
}

async function logHistorial(ingresoId, taller, accion, detalle = '', extra = {}) {
  const auth = getAuth()
  const user = auth.currentUser
  let nombre_completo = ''
  let correo = ''
  if (user) {
    correo = user.email || ''
    const u = await getDoc(doc(db, 'usuarios', user.uid)).catch(()=>null)
    if (u?.exists()) nombre_completo = u.data().nombre_completo || ''
  }
  await addDoc(collection(db, 'ingreso_equipos_historial'), {
    ingresoId, taller, accion, detalle,
    usuario: correo, nombre_completo,
    timestamp: serverTimestamp(),
    ...extra
  })
}

/* ---- submit (protegido) ---- */
async function onSubmit() {
  if (isVisualizador.value) { alert('Tu rol es visualizador. Solo lectura.'); return }
  if (!validar()) return
  saving.value = true
  try {
    const auth = getAuth()
    const user = auth.currentUser
    const uSnap = user ? await getDoc(doc(db, 'usuarios', user.uid)).catch(()=>null) : null
    const nombre_completo = uSnap?.exists() ? (uSnap.data().nombre_completo || '') : ''

    const payload = {
      taller: (tallerActivo.value || '').toUpperCase(),
      patente: (form.value.patente || '').toUpperCase(),
      tipoEquipo: (form.value.tipoEquipo || '').toUpperCase(),
      fechaRecepcion: form.value.fechaRecepcion,
      horaRecepcion: form.value.horaRecepcion,
      medicionValor: Number(form.value.medicionValor ?? 0),
      medicionUnidad: String(form.value.medicionUnidad || 'KM').toUpperCase(),
      trabajos: form.value.trabajos,
      status: (form.value.status || 'INGRESO').toUpperCase(),
      fechaEntregaEstimada: form.value.fechaEntregaEstimada || '',
      horaEntregaEstimada: form.value.horaEntregaEstimada || '',
      createdAt: editMode.value ? undefined : serverTimestamp(),
      updatedAt: serverTimestamp(),
      creadoPor: user?.email || '',
      nombre_completo
    }

    if (editMode.value && editingId.value) {
      const prev = items.value.find(x => x.id === editingId.value)
      await updateDoc(doc(db, 'ingreso_equipos', editingId.value), payload)
      await logHistorial(editingId.value, payload.taller, 'actualizacion', `Actualización de ingreso ${form.value.patente}`)
      if (prev && prev.status !== payload.status) {
        await logHistorial(
          editingId.value,
          payload.taller,
          'cambio_estado',
          `Estado: ${prev.status} → ${payload.status}`,
          { estadoAnterior: prev.status, estadoNuevo: payload.status }
        )
      }
    } else {
      const ref = await addDoc(collection(db, 'ingreso_equipos'), payload)
      await logHistorial(ref.id, payload.taller, 'creacion', `Ingreso creado (status: ${payload.status})`)
    }

    await recargar()
    limpiarFormulario()
  } finally {
    saving.value = false
  }
}

function editar(item) {
  if (isVisualizador.value) { alert('Solo lectura.'); return }
  editMode.value = true
  editingId.value = item.id
  if (item.taller && item.taller.toUpperCase() !== tallerActivo.value) tallerActivo.value = item.taller.toUpperCase()
  form.value = {
    patente: item.patente || '',
    tipoEquipo: (item.tipoEquipo || '').toUpperCase(),
    fechaRecepcion: item.fechaRecepcion || todayISO(),
    horaRecepcion: item.horaRecepcion || nowHM(),
    medicionValor: item.medicionValor ?? null,
    medicionUnidad: (item.medicionUnidad || 'KM').toUpperCase(),
    trabajos: item.trabajos || '',
    status: (item.status || 'INGRESO').toUpperCase(),
    fechaEntregaEstimada: item.fechaEntregaEstimada || '',
    horaEntregaEstimada: item.horaEntregaEstimada || ''
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function eliminar(item) {
  if (isVisualizador.value) { alert('Solo lectura.'); return }
  if (!window.confirm(`¿Eliminar el registro de ${item.patente}?`)) return
  await deleteDoc(doc(db, 'ingreso_equipos', item.id))
  await logHistorial(item.id, (item.taller || tallerActivo.value).toUpperCase(), 'eliminacion', 'Registro eliminado')
  await recargar()
}

/* --------------------------
   ENTREGADO
--------------------------- */
const entregaConfirm = ref({ visible: false, item: null, saving: false })
function marcarEntregado(it) {
  if (isVisualizador.value) { alert('Solo lectura.'); return }
  entregaConfirm.value = { visible: true, item: it, saving: false }
}
async function aceptarEntrega() {
  if (isVisualizador.value) { alert('Solo lectura.'); return }
  if (!entregaConfirm.value.item) return
  entregaConfirm.value.saving = true
  try {
    const id = entregaConfirm.value.item.id
    await updateDoc(doc(db, 'ingreso_equipos', id), {
      status: 'ENTREGADO',
      entregaReal: new Date().toISOString(),
      updatedAt: serverTimestamp()
    })
    await logHistorial(
      id,
      (entregaConfirm.value.item.taller || tallerActivo.value).toUpperCase(),
      'cambio_estado',
      'Estado: (cualquiera) → ENTREGADO',
      { estadoAnterior: entregaConfirm.value.item.status, estadoNuevo: 'ENTREGADO' }
    )
    await recargar()
    entregaConfirm.value.visible = false
  } finally {
    entregaConfirm.value.saving = false
  }
}

/* --------------------------
   LISTA (filtros)
--------------------------- */
const itemsFiltrados = computed(() => {
  let arr = [...items.value]
  const text = q.value.trim().toLowerCase()
  if (text) {
    arr = arr.filter(i =>
      (i.patente || '').toLowerCase().includes(text) ||
      (i.trabajos || '').toLowerCase().includes(text) ||
      (i.status || '').toLowerCase().includes(text)
    )
  }
  if (filtroEstado.value) {
    arr = arr.filter(i => String(i.status || '') === filtroEstado.value)
  }
  if (orden.value === 'reciente') {
    arr.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
  } else if (orden.value === 'antiguo') {
    arr.sort((a) => (a.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
  } else if (orden.value === 'patente') {
    arr.sort((a,b) => String(a.patente||'').localeCompare(String(b.patente||''), 'es', { sensitivity: 'base' }))
  }
  return arr
})
function limpiarFiltros() {
  q.value = ''
  filtroEstado.value = ''
  orden.value = 'reciente'
}

function irHistorial () {
  router.push({
    name: 'HistorialIngresoEquipos',
    query: {
      taller: tallerActivo.value,
      anio: new Date().getFullYear(),
      mes: 0
    }
  })
}

/* --------------------------
   EXCEL (sin cambios)
--------------------------- */
async function exportarExcel() {
  if (isVisualizador.value) { alert('No disponible para visualizador.'); return }
  exportLoading.value = true
  try {
    const wb = XLSX.utils.book_new()
    const data = []

    const titulo = `INGRESO DE EQUIPOS — ${tallerActivo.value}`
    data.push([titulo])

    const headers = [
      'Patente','Tipo de equipo','Fecha de recepción','Hora de recepción',
      'Medición','Trabajos a realizar','Status de trabajos','Tiempo aproximado de entrega'
    ]
    data.push(headers)

    itemsFiltrados.value.forEach(it => {
      const entregaTxt = (it.fechaEntregaEstimada || it.horaEntregaEstimada)
        ? `Fecha: ${fFecha(it.fechaEntregaEstimada) || '-'}${it.horaEntregaEstimada ? ' - ' + it.horaEntregaEstimada : ''}`
        : ''
      data.push([
        it.patente || '',
        it.tipoEquipo || '',
        fFecha(it.fechaRecepcion),
        it.horaRecepcion || '',
        fMedicion(it.medicionValor, it.medicionUnidad),
        it.trabajos || '',
        it.status || '',
        entregaTxt || ''
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!merges'] = [{ s: { r:0, c:0 }, e: { r:0, c: headers.length-1 } }]

    const BORDER = { style: 'thin', color: { rgb: 'FF7F7F7F' } }
    const all = { top: BORDER, right: BORDER, bottom: BORDER, left: BORDER }

    const titleStyle = {
      font: { bold: true, sz: 16, color: { rgb: 'FF000000' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      fill: { fgColor: { rgb: 'FFE2F0F9' } },
      border: all
    }
    const headerStyle = {
      font: { bold: true },
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'FFD9EEF7' } },
      border: all
    }
    const bodyStyle = { alignment: { vertical: 'top' }, border: all }
    const infoStyle = { alignment: { vertical: 'top', horizontal: 'center' }, border: all }

    const range = XLSX.utils.decode_range(ws['!ref'])
    for (let c = 0; c <= range.e.c; c++) {
      const ref = XLSX.utils.encode_cell({ r:0, c })
      ws[ref] = ws[ref] || {}
      ws[ref].s = titleStyle
    }
    for (let c = 0; c <= range.e.c; c++) {
      const ref = XLSX.utils.encode_cell({ r:1, c })
      ws[ref] = ws[ref] || {}
      ws[ref].s = headerStyle
    }
    for (let r = 2; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const ref = XLSX.utils.encode_cell({ r, c })
        ws[ref] = ws[ref] || {}
        ws[ref].s = (c === 0 || c === 2 || c === 3 || c === 4 || c === 6 || c === 7) ? infoStyle : bodyStyle
      }
    }

    ws['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 60 }, { wch: 20 }, { wch: 34 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Ingreso')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `ingreso_equipos_${new Date().toISOString().slice(0,10)}.xlsx`)
  } finally {
    exportLoading.value = false
  }
}

/* --------------------------
   MONTAJE
--------------------------- */
onMounted(async () => {
  try {
    form.value.fechaRecepcion = todayISO()
    form.value.horaRecepcion = nowHM()

    const auth = getAuth()
    onAuthStateChanged(auth, async (user) => {
      if (user?.uid) {
        try {
          const u = await getDoc(doc(db, 'usuarios', user.uid))
          if (u.exists()) rolUsuario.value = u.data().rol || ''
        } catch { /* noop */ }
      }
      await Promise.all([
        cargarCategorias(),
        cargarEquiposIndex(),
        cargarItems()
      ])
      loading.value = false
    })
  } catch {
    loading.value = false
  }
})
</script>

<style scoped>
/* ===== Background ===== */
.ingreso-page{
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
.header-rect{
  border-top-left-radius: 12px !important;
  border-top-right-radius: 12px !important;
}

/* For badges that still come with rounded-pill from badgeEstado() */
:deep(.badge.rounded-pill){
  border-radius: 10px !important;
  font-weight: 800;
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

/* Métricas */
.metrics{
  display:flex;
  flex-wrap:wrap;
  gap:.45rem;
}

/* Controls */
.controls{ max-width: 100%; }
.minw-260{ min-width: 260px; }
@media (max-width: 575.98px){
  .minw-260{ min-width: 0 !important; }
}

/* Cards */
.card{ border-radius: 12px; }

/* Header form */
.form-header{
  background: linear-gradient(90deg, rgba(33,37,41,1), rgba(20,20,20,1));
  color:#fff;
  border:0;
}

/* Header icon */
.header-icon{
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  background: rgba(255,255,255,.18);
  color:#fff;
}
.header-icon.soft{
  background: rgba(220,53,69,.12);
  color:#dc3545;
}

/* Table */
.table td, .table th { vertical-align: middle; }
.table-pro thead th{ font-weight: 900; }
.table-pro tbody tr:hover{ background: rgba(220,53,69,.04); }

.sticky-head{
  position: sticky;
  top: 0;
  z-index: 2;
}

.clamp-2{
  display:-webkit-box;
  -webkit-box-orient: vertical;
  overflow:hidden;
}

/* Modal */
.modal{ background: rgba(0,0,0,.45); }
.modal-pro{
  border-radius: 12px;
  border: 0;
  box-shadow: 0 20px 60px rgba(0,0,0,.22);
}
</style>

