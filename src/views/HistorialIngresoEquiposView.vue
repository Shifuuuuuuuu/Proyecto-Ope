<template>
  <div class="container-fluid py-4">
    <!-- Título y filtros -->
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
      <div>
        <h2 class="mb-0">Historial de ingresos</h2>
        <small class="text-muted">Por taller y por mes</small>
      </div>

      <div class="d-flex flex-wrap gap-2 align-items-center">
        <div class="d-flex align-items-center gap-2">
          <label class="form-label mb-0">Taller:</label>
          <select class="form-select" style="min-width:220px" v-model="filtroTaller" @change="refrescarAnio">
            <option :value="ALL_TALLER">Todos</option>
            <option v-for="t in TALLER_OPTS" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <div class="d-flex align-items-center gap-2">
          <label class="form-label mb-0">Año:</label>
          <select class="form-select" v-model.number="filtroAnio" @change="refrescarAnio">
            <option v-for="y in aniosDisponibles" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <div class="d-flex align-items-center gap-2">
          <label class="form-label mb-0">Mes:</label>
          <select class="form-select" v-model.number="filtroMes">
            <option :value="0">Todos los meses</option>
            <option v-for="m in 12" :key="m" :value="m">{{ mesNombre(m) }}</option>
          </select>
        </div>

        <button class="btn btn-outline-secondary" @click="refrescarAnio" :disabled="loading">
          <i class="bi bi-arrow-clockwise me-1"></i> Actualizar
        </button>
      </div>
    </div>

    <!-- Resumen -->
    <div class="mb-4">
      <span class="badge rounded-pill text-bg-secondary me-2">Total: {{ resumenActual.total }}</span>
      <span class="badge rounded-pill text-bg-dark me-2">Ingreso: {{ resumenActual.ingreso }}</span>
      <span class="badge rounded-pill text-bg-info me-2">En proceso: {{ resumenActual.proceso }}</span>
      <span class="badge rounded-pill text-bg-warning me-2">En espera: {{ resumenActual.espera }}</span>
      <span class="badge rounded-pill text-bg-success me-2">Entregado: {{ resumenActual.entregado }}</span>
    </div>

    <!-- Cargando -->
    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border"></div>
    </div>

    <!-- Sin datos -->
    <div v-else-if="itemsAnio.length === 0" class="alert alert-light border text-center">
      No hay registros para el año seleccionado.
    </div>

    <!-- Vista mensual (12 meses) -->
    <div v-else-if="filtroMes === 0" class="card shadow-sm border-0">
      <div class="card-header bg-body-tertiary d-flex justify-content-between align-items-center">
        <strong>Resumen {{ filtroAnio }} — {{ filtroTaller === ALL_TALLER ? 'Todos los talleres' : filtroTaller }}</strong>
        <small class="text-muted">Haz clic en un mes para ver el detalle</small>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-bordered align-middle table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Mes</th>
                <th class="text-center">Total</th>
                <th class="text-center">Ingreso</th>
                <th class="text-center">En proceso</th>
                <th class="text-center">En espera</th>
                <th class="text-center">Entregado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in 12" :key="'mes-'+m" style="cursor:pointer;" @click="filtroMes = m">
                <td><strong>{{ mesNombre(m) }}</strong></td>
                <td class="text-center">{{ resumenPorMes[m].total }}</td>
                <td class="text-center">{{ resumenPorMes[m].ingreso }}</td>
                <td class="text-center">{{ resumenPorMes[m].proceso }}</td>
                <td class="text-center">{{ resumenPorMes[m].espera }}</td>
                <td class="text-center">{{ resumenPorMes[m].entregado }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Vista detalle de un mes -->
    <div v-else class="card shadow-sm border-0">
      <div class="card-header bg-body-tertiary d-flex justify-content-between align-items-center flex-wrap gap-2">
        <strong>
          Detalle {{ mesNombre(filtroMes) }} {{ filtroAnio }} — {{ filtroTaller === ALL_TALLER ? 'Todos los talleres' : filtroTaller }}
        </strong>
        <div class="d-flex gap-2 align-items-center">
          <input class="form-control form-control-sm" style="min-width:260px;" v-model.trim="qDetalle"
                 placeholder="Buscar patente / trabajos / status / tipo…" />
          <button class="btn btn-outline-secondary btn-sm" @click="qDetalle = ''">Limpiar</button>
        </div>
      </div>

      <div class="card-body p-0">
        <div v-if="itemsMesFiltrados.length === 0" class="p-4 text-center text-muted">
          No hay registros para mostrar.
        </div>

        <div v-else class="table-responsive">
          <table class="table table-bordered align-middle table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th class="text-center">Fecha</th>
                <th class="text-center" v-if="filtroTaller === ALL_TALLER">Taller</th>
                <th class="text-center">Patente</th>
                <th>Tipo de equipo</th>
                <th class="text-center">Medición</th>
                <th class="text-center">Status</th>
                <th style="min-width:320px;">Trabajos</th>
                <th class="text-center" style="min-width:140px;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="it in itemsMesFiltrados" :key="it.id">
                <tr>
                  <td class="text-center">{{ fFecha(it.fechaRecepcionISO) }}</td>
                  <td class="text-center" v-if="filtroTaller === ALL_TALLER">{{ it.taller }}</td>
                  <td class="text-center fw-semibold">{{ it.patente }}</td>
                  <td>{{ it.tipoEquipo }}</td>
                  <td class="text-center">{{ fMedicion(it.medicionValor, it.medicionUnidad) }}</td>
                  <td class="text-center">
                    <span :class="badgeEstado(it.status)">{{ it.status }}</span>
                  </td>
                  <td style="white-space:pre-line;">{{ it.trabajos }}</td>
                  <td class="text-center">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" @click="toggleExpand(it.id)">
                        <i :class="expanded[it.id] ? 'bi bi-caret-up-square' : 'bi bi-caret-down-square'"></i>
                      </button>
                      <button class="btn btn-outline-dark" @click="verHistorial(it)">
                        <i class="bi bi-clock-history"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <!-- Fila de detalles expandible -->
                <tr v-if="expanded[it.id]" class="bg-light-subtle">
                  <td :colspan="numColsDetalle">
                    <div class="row g-3 small">
                      <div class="col-md-6">
                        <div><strong>Recepción:</strong> {{ fFecha(it.fechaRecepcionISO) }} <span v-if="it.horaRecepcion">— {{ it.horaRecepcion }}</span></div>
                        <div><strong>Entrega estimada:</strong>
                          <span v-if="it.fechaEntregaEstimada || it.horaEntregaEstimada">
                            {{ fFecha(it.fechaEntregaEstimada) || '—' }}
                            <span v-if="it.horaEntregaEstimada">— {{ it.horaEntregaEstimada }}</span>
                          </span>
                          <span v-else>—</span>
                        </div>
                        <div><strong>Entrega real:</strong>
                          <span v-if="it.entregaReal">{{ fFechaHora(it.entregaReal) }}</span>
                          <span v-else>—</span>
                        </div>
                        <div><strong>Días en taller:</strong> {{ diasEnTaller(it) }}</div>
                      </div>
                      <div class="col-md-6">
                        <div><strong>Creado por:</strong> {{ it.nombre_completo || it.creadoPor || '—' }}</div>
                        <div><strong>Fecha de creación:</strong>
                          <span v-if="it.createdAtISO">{{ fFechaHora(it.createdAtISO) }}</span>
                          <span v-else>—</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card-footer d-flex justify-content-between align-items-center">
        <small class="text-muted">Registros: {{ itemsMesFiltrados.length }}</small>
        <button class="btn btn-outline-dark btn-sm" @click="filtroMes = 0">← Volver a resumen anual</button>
      </div>
    </div>

    <!-- MODAL: historial del ingreso -->
    <div class="modal fade show" tabindex="-1" style="display:block;" v-if="histVisible" @click.self="cerrarHistorial">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content rounded-4">
          <div class="modal-header">
            <h5 class="modal-title">
              Historial — <small class="text-muted">{{ histFor?.patente }}</small>
            </h5>
            <button class="btn-close" @click="cerrarHistorial"></button>
          </div>
          <div class="modal-body">
            <div v-if="histLoading" class="text-center my-3">
              <div class="spinner-border"></div>
            </div>
            <div v-else-if="histData.length === 0" class="text-center text-muted">
              Sin eventos de historial.
            </div>
            <div v-else>
              <ul class="list-group list-group-flush">
                <li v-for="h in histData" :key="h.id" class="list-group-item">
                  <div class="d-flex justify-content-between">
                    <div>
                      <div class="fw-semibold text-uppercase">{{ h.accion }}</div>
                      <div class="small text-muted">{{ h.detalle || '—' }}</div>
                      <div class="small mt-1">
                        <span class="me-2"><strong>Usuario:</strong> {{ h.nombre_completo || h.usuario || '—' }}</span>
                        <span v-if="h.estadoAnterior || h.estadoNuevo" class="badge rounded-pill text-bg-secondary ms-2">
                          {{ h.estadoAnterior || '—' }} → {{ h.estadoNuevo || '—' }}
                        </span>
                      </div>
                    </div>
                    <div class="text-end small">
                      <div><i class="bi bi-calendar-event me-1"></i>{{ fFechaHora(h.timestamp) }}</div>
                      <div class="text-muted">{{ h.taller }}</div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" @click="cerrarHistorial">Cerrar</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineOptions } from 'vue'
import { db } from '../firebase/config'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'

defineOptions({ name: 'HistorialIngresoEquiposView' })

/* ----------- Catálogos ---------- */
const TALLER_OPTS = ['TALLER CASA MATRIZ', 'TALLER CANECHE', 'TALLER OLIVAR']
const ALL_TALLER = 'TODOS'

/* ----------- Estado ---------- */
const loading = ref(true)
const filtroTaller = ref(ALL_TALLER)
const filtroAnio = ref(new Date().getFullYear())
const filtroMes = ref(0) // 0 = todos los meses

const itemsAnio = ref([]) // registros normalizados del año
const qDetalle = ref('')
const expanded = ref({}) // mapa reactivo id->bool para expandir filas

/* ----------- Modal historial ---------- */
const histVisible = ref(false)
const histLoading = ref(false)
const histFor = ref(null)
const histData = ref([])

/* ----------- Utiles ---------- */
const aniosDisponibles = Array.from({ length: 15 }, (_,i) => new Date().getFullYear() - i)

function mesNombre(m){
  const N = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return N[m] || ''
}
const nf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 })
const fMedicion = (v, u) => (v === null || v === undefined) ? '—' : `${nf.format(Number(v))} ${String(u || 'KM').toUpperCase()}`
function fFecha(iso){
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
  } catch { return '' }
}
function fFechaHora(ts){
  if (!ts) return ''
  let d
  try {
    if (ts?.toDate) d = ts.toDate()
    else if (typeof ts === 'string') d = new Date(ts)
    else d = new Date(ts)
    const dd = String(d.getDate()).padStart(2,'0')
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const yyyy = d.getFullYear()
    const hh = String(d.getHours()).padStart(2,'0')
    const mi = String(d.getMinutes()).padStart(2,'0')
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
  } catch { return '' }
}
const badgeEstado = (s) => {
  const v = String(s || '').toUpperCase()
  if (v === 'ENTREGADO') return 'badge rounded-pill text-bg-success'
  if (v === 'EN ESPERA') return 'badge rounded-pill text-bg-warning text-dark'
  if (v === 'EN PROCESO') return 'badge rounded-pill text-bg-info'
  return 'badge rounded-pill text-bg-dark'
}
function diasEntre(isoA, isoB){
  try {
    const a = new Date(isoA)
    const b = new Date(isoB)
    return Math.max(0, Math.round((b - a) / (1000*60*60*24)))
  } catch { return 0 }
}
function diasEnTaller(it){
  const desde = it.fechaRecepcionISO
  if (!desde) return 0
  const hasta = it.entregaReal ? (it.entregaReal?.toDate ? it.entregaReal.toDate().toISOString() : it.entregaReal) : new Date().toISOString()
  return diasEntre(desde, hasta)
}

/* ----------- Carga Firestore (por año completo) ---------- */
function rangoAnualISO(year){
  const y = Number(year)
  return { start: `${y}-01-01`, end: `${y}-12-31` }
}

function normalizaDoc(id, data){
  // fechaRecepcion ISO (YYYY-MM-DD). Si falta, intenta desde createdAt.
  let fechaRecepcionISO = (data.fechaRecepcion || '').toString()
  if (!fechaRecepcionISO) {
    const ts = data.createdAt?.toDate ? data.createdAt.toDate() : null
    if (ts) fechaRecepcionISO = ts.toISOString().slice(0,10)
  }
  // createdAt ISO (solo para mostrar)
  let createdAtISO = ''
  if (data.createdAt?.toDate) createdAtISO = data.createdAt.toDate().toISOString()

  return {
    id,
    taller: String(data.taller || '').toUpperCase(),
    patente: (data.patente || '').toUpperCase(),
    tipoEquipo: (data.tipoEquipo || '').toUpperCase(),
    fechaRecepcionISO,
    horaRecepcion: data.horaRecepcion || '',
    fechaEntregaEstimada: data.fechaEntregaEstimada || '',
    horaEntregaEstimada: data.horaEntregaEstimada || '',
    entregaReal: data.entregaReal || null,
    medicionValor: Number(data.medicionValor ?? 0),
    medicionUnidad: (data.medicionUnidad || 'KM').toUpperCase(),
    trabajos: data.trabajos || '',
    status: (data.status || 'INGRESO').toUpperCase(),
    creadoPor: data.creadoPor || '',
    nombre_completo: data.nombre_completo || '',
    createdAtISO
  }
}

async function cargarPorAnio(){
  itemsAnio.value = []
  const { start, end } = rangoAnualISO(filtroAnio.value)

  try {
    // Traer por fechaRecepcion para evitar índices compuestos
    const qy = query(
      collection(db, 'ingreso_equipos'),
      where('fechaRecepcion', '>=', start),
      where('fechaRecepcion', '<=', end),
      orderBy('fechaRecepcion', 'asc')
    )
    const snap = await getDocs(qy)
    const arr = []
    snap.forEach(d => {
      const n = normalizaDoc(d.id, d.data() || {})
      if (n.fechaRecepcionISO) arr.push(n)
    })
    itemsAnio.value = arr
  } catch (err) {
    const m = (err?.message || '').match(/https:\/\/console\.firebase\.google\.com\/[^\s)]+/i)
    if (m) window.open(m[0], '_blank') // crear índice si Firestore lo pide
    console.error('Error Firestore:', err)
    itemsAnio.value = []
  }
}

async function refrescarAnio(){
  loading.value = true
  try {
    expanded.value = {}
    await cargarPorAnio()
  } finally {
    loading.value = false
  }
}

/* ----------- Agrupaciones y filtros ---------- */
function monthOf(iso){
  if (!iso || iso.length < 7) return 0
  return Number(iso.slice(5,7))
}

const itemsAnioFiltradosPorTaller = computed(()=>{
  if (filtroTaller.value === ALL_TALLER) return itemsAnio.value
  return itemsAnio.value.filter(it => it.taller === filtroTaller.value)
})

const resumenPorMes = computed(()=>{
  const base = {}
  for (let m=1; m<=12; m++){
    base[m] = { total:0, ingreso:0, proceso:0, espera:0, entregado:0 }
  }
  for (const it of itemsAnioFiltradosPorTaller.value){
    const m = monthOf(it.fechaRecepcionISO)
    if (!m) continue
    base[m].total++
    const s = it.status
    if (s === 'INGRESO') base[m].ingreso++
    else if (s === 'EN PROCESO') base[m].proceso++
    else if (s === 'EN ESPERA') base[m].espera++
    else if (s === 'ENTREGADO') base[m].entregado++
  }
  return base
})

const itemsMes = computed(()=>{
  if (filtroMes.value === 0) return []
  return itemsAnioFiltradosPorTaller.value.filter(it => monthOf(it.fechaRecepcionISO) === filtroMes.value)
})

const itemsMesFiltrados = computed(()=>{
  const q = qDetalle.value.trim().toLowerCase()
  if (!q) return itemsMes.value
  return itemsMes.value.filter(it =>
    (it.patente || '').toLowerCase().includes(q) ||
    (it.trabajos || '').toLowerCase().includes(q) ||
    (it.status || '').toLowerCase().includes(q) ||
    (it.tipoEquipo || '').toLowerCase().includes(q)
  )
})

const resumenActual = computed(()=>{
  if (filtroMes.value === 0){
    const acc = { total:0, ingreso:0, proceso:0, espera:0, entregado:0 }
    const r = resumenPorMes.value
    for (let m=1;m<=12;m++){
      acc.total += r[m].total
      acc.ingreso += r[m].ingreso
      acc.proceso += r[m].proceso
      acc.espera += r[m].espera
      acc.entregado += r[m].entregado
    }
    return acc
  }
  return resumenPorMes.value[filtroMes.value] || { total:0, ingreso:0, proceso:0, espera:0, entregado:0 }
})

/* ----------- UI helpers ---------- */
const numColsDetalle = computed(() => filtroTaller.value === ALL_TALLER ? 8 : 7)
function toggleExpand(id){
  expanded.value[id] = !expanded.value[id]
}

/* ----------- Historial (timeline por ingreso) ---------- */
async function verHistorial(it){
  histVisible.value = true
  histLoading.value = true
  histFor.value = it
  histData.value = []
  try {
    const qy = query(
      collection(db, 'ingreso_equipos_historial'),
      where('ingresoId', '==', it.id),
      orderBy('timestamp', 'desc')
    )
    const snap = await getDocs(qy)
    histData.value = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }))
  } catch (err) {
    // Si falta índice compuesto (ingresoId + timestamp), abre el enlace de creación
    const m = (err?.message || '').match(/https:\/\/console\.firebase\.google\.com\/[^\s)]+/i)
    if (m) window.open(m[0], '_blank')
    console.error('Error historial:', err)
    histData.value = []
  } finally {
    histLoading.value = false
  }
}
function cerrarHistorial(){
  histVisible.value = false
  histFor.value = null
  histData.value = []
}

/* ----------- Montaje ---------- */
onMounted(async () => {
  loading.value = true
  try {
    await refrescarAnio()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.table td, .table th { vertical-align: middle; }
.card-header { font-weight: 700; }
.form-label { font-weight: 600; }
/* helpers bootstrap-icons opcionales */
</style>
