<template>
  <div class="container py-4">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-outline-dark" @click="volver">
          <i class="bi bi-arrow-left"></i> Volver
        </button>
        <h3 class="mb-0">
          OTs de
          <small v-if="contratoActivo" class="text-muted">— {{ contratoActivo.nombre }}</small>
        </h3>
      </div>

      <div class="d-flex gap-2">
        <button
          v-if="puedeGestionarOTs"
          class="btn btn-primary"
          @click="abrirMasiva"
          title="Cargar varias OTs (PDF) al mismo tiempo"
        >
          <i class="bi bi-upload"></i> Carga masiva
        </button>
        <button class="btn btn-outline-secondary" @click="refrescar">
          <i class="bi bi-arrow-clockwise"></i> Actualizar
        </button>
      </div>
    </div>

    <!-- ALERTA GLOBAL -->
    <div
      v-if="alerta.show"
      class="alert d-flex align-items-center"
      :class="alerta.variant==='success' ? 'alert-success' : 'alert-danger'"
      role="alert"
    >
      <i class="bi me-2" :class="alerta.variant==='success' ? 'bi-check-circle' : 'bi-exclamation-triangle'"></i>
      <div class="flex-grow-1">
        {{ alerta.msg }}
        <template v-if="alerta.detail">
          <br /><small class="text-muted">{{ alerta.detail }}</small>
        </template>
      </div>
      <button class="btn-close ms-2" @click="alerta.show=false"></button>
    </div>

    <div class="alert alert-info">
      En esta vista verás <strong>solo equipos con estado F o M</strong> en el período visible.
      <template v-if="puedeGestionarOTs">
        Puedes <strong>cargar PDF</strong> como OT (si es grande se optimiza y comprime automáticamente) y abrirlo en una pestaña externa.
      </template>
      <template v-else>
        <strong>No tienes permisos para cargar ni eliminar OTs</strong>. Solo podrás abrir las existentes.
      </template>
    </div>

    <!-- Selector de contrato si no vino en la ruta -->
    <div v-if="!contratoActivoId && contratos.length" class="mb-3">
      <label class="form-label">Selecciona un contrato</label>
      <select class="form-select" v-model="contratoActivoId">
        <option :value="null">— Elegir —</option>
        <option v-for="c in contratos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
      </select>
    </div>


    <!-- Filtros: búsqueda + categoría -->
    <div class="card border-0 mb-3">
      <div class="card-body p-2 p-md-3">
        <div class="row g-3 align-items-end">
          <div class="col-12 col-md-6">
            <label class="form-label mb-0">Buscar equipo (nombre o patente)</label>
            <input
              v-model.trim="searchTerm"
              class="form-control"
              type="text"
              list="equipos-suggestions"
              placeholder="Ej: Mixer 123 · ABCD11"
            />
            <datalist id="equipos-suggestions">
              <option v-for="s in sugerenciasEquipos" :key="s" :value="s" />
            </datalist>
          </div>

          <div class="col-12 col-md-4">
            <label class="form-label mb-0">Categoría</label>
            <select v-model="selectedCategoria" class="form-select">
              <option value="">Todas</option>
              <option v-for="c in categoriasDisponibles" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <div class="col-12 col-md-2 d-grid">
            <button class="btn btn-outline-secondary" @click="limpiarFiltros">
              Limpiar
            </button>
          </div>

          <!-- Nota de ayuda en una fila aparte para no desalinear -->
          <div class="col-12">
            <small class="text-muted">Escribe y elige una sugerencia para filtrar rápido.</small>
          </div>
        </div>
      </div>
    </div>

    <div v-if="cargando" class="text-center py-5">
      <div class="spinner-border text-danger"></div>
    </div>

    <div v-else-if="equiposFiltradosUI.length === 0" class="alert alert-light">
      No hay equipos con Falla/Mantención en el período visible
      <template v-if="searchTerm || selectedCategoria"> para los filtros aplicados</template>.
    </div>

    <div v-else class="row g-3">
      <div class="col-12 col-lg-6" v-for="e in equiposFiltradosUI" :key="e.id">
        <div class="card border shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <h5 class="mb-1">{{ e.nombre_equipo }}</h5>
                <div class="text-muted small">
                  PPU: {{ e.patente || '—' }} · Categoría: {{ e.categoria || '—' }}
                </div>
                <div class="mt-1">
                  <span class="badge text-bg-danger me-1" v-if="e._tieneF">Falla</span>
                  <span class="badge text-bg-warning text-dark" v-if="e._tieneM">Mantención</span>
                </div>
              </div>

              <!-- Botón de carga por equipo (individual) -->
              <div v-if="puedeGestionarOTs">
                <label class="btn btn-sm btn-outline-primary mb-0">
                  Cargar OT (PDF)
                  <input type="file" accept="application/pdf" class="d-none" @change="onPickPDF($event, e)" />
                </label>
              </div>
            </div>

            <!-- Historial de OTs -->
            <div class="mt-3">
              <h6 class="mb-2">OTs cargadas</h6>
              <div v-if="loadingOTs[e.id]" class="small text-muted">cargando…</div>
              <div v-else-if="(otsPorEquipo[e.id] || []).length === 0" class="small text-muted">No hay OTs aún.</div>
              <ul class="list-group" v-else>
                <li
                  class="list-group-item d-flex justify-content-between align-items-center"
                  v-for="ot in otsPorEquipo[e.id]" :key="ot.id">
                  <div>
                    <strong>{{ ot.fileName }}</strong>
                    <div class="small text-muted">
                      {{ formatTS(ot.createdAt) }} · {{ ot.createdByName || ot.createdBy || '—' }}
                      <span v-if="ot.isChunked" class="badge text-bg-secondary ms-2">Cargada</span>
                    </div>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <button
                      class="btn btn-sm btn-outline-dark"
                      :disabled="deletingOT[ot.id]"
                      @click="abrirPDF(ot)"
                    >
                      Abrir
                    </button>
                    <button
                      v-if="puedeGestionarOTs"
                      class="btn btn-sm btn-outline-danger"
                      :disabled="deletingOT[ot.id]"
                      @click="borrarOT(ot, e)"
                      title="Eliminar definitivamente esta OT"
                    >
                      <span v-if="deletingOT[ot.id]" class="spinner-border spinner-border-sm me-1" />
                      Eliminar
                    </button>
                  </div>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Modal de subida / optimización individual -->
    <div v-if="upload.visible" class="upload-backdrop" @click.self="null">
      <div class="upload-modal card shadow-lg">
        <div class="card-body">
          <div class="d-flex align-items-start justify-content-between">
            <div>
              <h5 class="mb-1">Subiendo OT</h5>
              <div class="text-muted small">{{ upload.fileName || '—' }}</div>
            </div>
            <span class="badge text-bg-light">{{ upload.stageLabel }}</span>
          </div>

          <div class="progress mt-3" style="height: 12px;">
            <div class="progress-bar" role="progressbar" :style="{ width: upload.pct + '%' }">
              {{ Math.round(upload.pct) }}%
            </div>
          </div>

          <div class="mt-2 small text-muted">
            {{ upload.detail }}
          </div>

          <div class="mt-3 d-flex justify-content-end">
            <button class="btn btn-sm btn-outline-secondary" :disabled="upload.working" @click="cerrarUpload">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================== MODAL CARGA MASIVA ================== -->
    <div v-if="masiva.visible" class="upload-backdrop" @click.self="masiva.visible && !masiva.working ? (masiva.visible=false) : null">
      <div class="upload-modal card shadow-lg">
        <div class="card-body">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div>
              <h5 class="mb-1">Carga masiva de OTs (PDF)</h5>
              <div class="text-muted small">Contrato: <strong>{{ contratoActivo?.nombre || '—' }}</strong></div>
            </div>
            <button class="btn-close" :disabled="masiva.working" @click="masiva.visible=false"></button>
          </div>

          <!-- Controles por defecto -->
          <div class="row g-2 mb-3">
            <div class="col-12 col-md-3">
              <label class="form-label">Estado por defecto</label>
              <select class="form-select" v-model="masiva.defaultEstado">
                <option value="F">Falla</option>
                <option value="M">Mantención</option>
              </select>
            </div>
            <div class="col-12 col-md-3">
              <label class="form-label">Fecha por defecto</label>
              <input type="date" class="form-control" v-model="masiva.defaultFecha">
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Texto por defecto (opcional)</label>
              <input type="text" class="form-control" v-model.trim="masiva.defaultTexto" placeholder="Se aplicará a filas sin texto propio">
            </div>
          </div>

          <!-- Selector múltiple -->
          <div class="mb-3">
            <label class="btn btn-outline-primary">
              Seleccionar PDFs…
              <input type="file" accept="application/pdf" class="d-none" multiple @change="onPickMasiva">
            </label>
            <small class="text-muted ms-2">Puedes seleccionar varios a la vez.</small>
          </div>

          <div v-if="masiva.rows.length === 0" class="alert alert-light mb-3">
            Aún no hay archivos en la lista. Sube uno o más PDFs.
          </div>

          <div v-else class="table-responsive" style="max-height: 340px; overflow:auto;">
            <table class="table table-sm align-middle">
              <thead class="table-light">
                <tr>
                  <th style="width: 28px;">#</th>
                  <th>Archivo</th>
                  <th style="min-width: 220px;">Equipo</th>
                  <th style="width:120px;">Estado</th>
                  <th style="width:160px;">Fecha</th>
                  <th style="min-width: 200px;">Texto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r,i) in masiva.rows" :key="r.key">
                  <td><span class="badge text-bg-secondary">{{ i+1 }}</span></td>
                  <td>
                    <div class="fw-semibold">{{ r.fileName }}</div>
                    <div class="small text-muted">{{ prettySize(r.size) }}</div>
                  </td>
                  <td>
                    <select class="form-select form-select-sm" v-model="r.equipoId">
                      <option value="">— Seleccionar —</option>
                      <option v-for="e in equiposContrato" :key="e.id" :value="e.id">
                        {{ e.nombre_equipo }} — {{ e.patente }}
                      </option>
                    </select>
                    <small v-if="r.autoguess && !r.equipoId" class="text-warning">Sugerido: {{ r.autoguessTxt }}</small>
                  </td>
                  <td>
                    <select class="form-select form-select-sm" v-model="r.estado">
                      <option value="F">F</option>
                      <option value="M">M</option>
                    </select>
                  </td>
                  <td>
                    <input type="date" class="form-control form-control-sm" v-model="r.fecha">
                  </td>
                  <td>
                    <input type="text" class="form-control form-select-sm" v-model.trim="r.texto" :placeholder="masiva.defaultTexto || '—'">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Progreso y acciones -->
          <div v-if="masiva.working" class="mt-3">
            <div class="progress" style="height: 12px;">
              <div class="progress-bar" role="progressbar" :style="{ width: masiva.progress + '%' }">
                {{ Math.round(masiva.progress) }}%
              </div>
            </div>
            <div class="small text-muted mt-1">{{ masiva.detail }}</div>
          </div>

          <div class="d-flex justify-content-between align-items-center mt-3">
            <small class="text-muted">
              Total: {{ masiva.rows.length }} archivo(s)
              <span v-if="masiva.summary"> · Éxitos: {{ masiva.summary.ok }} · Errores: {{ masiva.summary.err }}</span>
            </small>

            <div class="d-flex gap-2">
              <button class="btn btn-outline-secondary" :disabled="masiva.working" @click="masiva.visible=false">Cerrar</button>
              <button
                class="btn btn-primary"
                :disabled="masiva.working || !puedeSubirMasiva"
                @click="subirMasiva"
                title="Subir todos los PDFs seleccionados"
              >
                <span v-if="!masiva.working"><i class="bi bi-cloud-upload"></i> Cargar {{ masiva.rows.length }}</span>
                <span v-else><span class="spinner-border spinner-border-sm me-2"></span> Subiendo…</span>
              </button>
            </div>
          </div>

          <!-- Mensaje final dentro del modal -->
          <div v-if="masiva.done" class="alert mt-3" :class="masiva.summary?.err ? 'alert-warning' : 'alert-success'">
            <strong>Proceso finalizado.</strong>
            Se cargaron {{ masiva.summary.ok }} de {{ masiva.rows.length }} archivos
            <template v-if="masiva.summary.err">({{ masiva.summary.err }} con error)</template>.
          </div>
        </div>
      </div>
    </div>
    <!-- /MODAL MASIVA -->
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { crearOT, listarOTsPorEquipo, obtenerOTDataUrl, eliminarOT } from '@/services/otsService.ts'

const route = useRoute()
const contratoActivoId = ref(route.params.contratoId || null)
const router = useRouter()
const cargando = ref(true)
const usuario = ref(null)
const contratos = ref([])
const equiposByContrato = ref({})
const operByContrato = ref({})

const otsPorEquipo = ref({})
const loadingOTs = ref({})
const deletingOT = ref({})
function volver(){ router.back() } 
// ====== ALERTAS ======
const alerta = ref({ show:false, variant:'success', msg:'', detail:'' })
function showOk(msg, detail=''){ alerta.value = { show:true, variant:'success', msg, detail }; setTimeout(()=> alerta.value.show=false, 4500) }
function showErr(msg, detail=''){ alerta.value = { show:true, variant:'danger', msg, detail } }

// ====== permisos por rol ======
const ROLES_GESTION = ['admin','editor','mecanico','supervisor','operador']
const puedeGestionarOTs = computed(() => {
  const rol = String(usuario.value?.rol || usuario.value?.role || 'viewer').toLowerCase()
  return ROLES_GESTION.includes(rol)
})

// ====== Upload individual (ya lo tenías) ======
const upload = ref({ visible:false, working:false, pct:0, stage:'idle', stageLabel:'', detail:'', fileName:'' })
function abrirUpload(nombre) {
  upload.value = { visible:true, working:true, pct:0, stage:'reading', stageLabel:'Leyendo archivo', detail:'Preparando archivo…', fileName: nombre || '' }
}
function updateUpload({ stage, pct, detail }) {
  const map = { reading:'Leyendo archivo', optimizing:'Optimizando', uploading:'Subiendo', done:'Completado' }
  upload.value.stage = stage
  upload.value.stageLabel = map[stage] || ''
  if (typeof pct === 'number') upload.value.pct = Math.max(0, Math.min(100, pct))
  if (detail) upload.value.detail = detail
}
function cerrarUpload() { if (!upload.value.working) upload.value.visible = false }

// ====== Fechas & helpers ======
const hoy = new Date()
const year = hoy.getFullYear()
const mes = hoy.getMonth()
const inicioMes = new Date(year, mes, 1, 0, 0, 0, 0)
const finMes = new Date(year, mes + 1, 1, 0, 0, 0, 0)
function formatTS(ts) {
  if (!ts) return '—'
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  const dd = String(d.getDate()).padStart(2,'0')
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2,'0')
  const mi = String(d.getMinutes()).padStart(2,'0')
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`
}
function toInputDate(d){
  const date = d?.toDate ? d.toDate() : new Date(d)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth()+1).padStart(2,'0')
  const dd = String(date.getDate()).padStart(2,'0')
  return `${yyyy}-${mm}-${dd}`
}
const contratoActivo = computed(() => contratoActivoId.value ? contratos.value.find(c => c.id === contratoActivoId.value) : null)

// ====== Datos visibles (equipos con F/M en el mes) ======
const equiposFiltrados = computed(() => {
  const arr = []
  const keys = contratoActivoId.value ? [contratoActivoId.value] : Object.keys(equiposByContrato.value)
  for (const cId of keys) {
    const lista = equiposByContrato.value[cId] || []
    const oper = operByContrato.value[cId] || []
    const flags = {}
    for (const o of oper) {
      const s = String(o.estado || '').toUpperCase()
      const letra = s.startsWith('FUERA') || s === 'F' ? 'F' : (s.startsWith('MANT') || s === 'M' ? 'M' : '')
      const eid = o.equipoId
      if (!letra) continue
      if (!flags[eid]) flags[eid] = { F:false, M:false }
      if (letra === 'F') flags[eid].F = true
      if (letra === 'M') flags[eid].M = true
    }
    for (const e of lista) {
      const fm = flags[e.id]
      if (fm && (fm.F || fm.M)) arr.push({ ...e, _tieneF: !!fm.F, _tieneM: !!fm.M })
    }
  }
  return arr.sort((a,b) => {
    const af = a._tieneF ? 1 : 0, bf = b._tieneF ? 1 : 0
    if (bf !== af) return bf - af
    const am = a._tieneM ? 1 : 0, bm = b._tieneM ? 1 : 0
    if (bm !== am) return bm - am
    return String(a.nombre_equipo || '').localeCompare(String(b.nombre_equipo || ''), 'es', { sensitivity: 'base' })
  })
})

// ====== Filtros UI ======
const searchTerm = ref('')
const selectedCategoria = ref('')

function normalizaSimple(s=''){
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[^a-z0-9]/g,'')
}

const categoriasDisponibles = computed(() => {
  const listas = contratoActivoId.value
    ? [equiposByContrato.value[contratoActivoId.value] || []]
    : Object.values(equiposByContrato.value)

  const set = new Set()
  for (const lista of listas){
    for (const e of (lista || [])){
      if (e?.categoria) set.add(String(e.categoria))
    }
  }
  return Array.from(set).sort((a,b)=> String(a).localeCompare(String(b),'es',{sensitivity:'base'}))
})

// Sugerencias para el datalist (nombre — patente).
const sugerenciasEquipos = computed(() => {
  const listas = contratoActivoId.value
    ? [equiposByContrato.value[contratoActivoId.value] || []]
    : Object.values(equiposByContrato.value)

  const set = new Set()
  for (const lista of listas){
    for (const e of (lista || [])){
      const nombre = String(e.nombre_equipo || '').trim()
      const pat    = String(e.patente || '').trim()
      const txt = pat ? `${nombre} — ${pat}` : nombre
      if (txt) set.add(txt)
    }
  }
  return Array.from(set).sort((a,b)=> a.localeCompare(b,'es',{sensitivity:'base'}))
})

// Aplica búsqueda + categoría sobre los equipos con F/M (equiposFiltrados)
const equiposFiltradosUI = computed(() => {
  const term = normalizaSimple(searchTerm.value)
  const cat  = String(selectedCategoria.value || '')
  return equiposFiltrados.value.filter(e => {
    if (cat && String(e.categoria || '') !== cat) return false
    if (!term) return true
    const n = normalizaSimple(e.nombre_equipo || '')
    const p = normalizaSimple(e.patente || '')
    return n.includes(term) || p.includes(term)
  })
})

function limpiarFiltros(){
  searchTerm.value = ''
  selectedCategoria.value = ''
}

// ====== Carga de datos ======
async function cargarContratosDelUsuario(uid) {
  const usuariosRef = collection(db, 'usuarios')
  const usuariosSnap = await getDocs(query(usuariosRef, where('__name__','==', uid)))
  let perfil = null
  usuariosSnap.forEach(d => (perfil = d.data()))

  const contratosIds = perfil?.contratosAsignados || []
  const nombre = perfil?.nombre_completo || ''
  const correo = usuario.value?.email || ''
  const rolPerfil = (perfil?.rol || perfil?.role || 'viewer')
  usuario.value = { ...usuario.value, nombre_completo: nombre, email: correo, rol: rolPerfil }

  if (contratoActivoId.value) {
    const slice = [contratoActivoId.value]
    const snap = await getDocs(query(collection(db, 'contratos'), where('__name__','in', slice)))
    contratos.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    await Promise.all([ cargarEquiposContrato(contratoActivoId.value), cargarOperatividadContrato(contratoActivoId.value) ])
    return
  }

  const results = []
  for (let i=0; i<contratosIds.length; i+=10) {
    const slice = contratosIds.slice(i, i+10)
    const snap = await getDocs(query(collection(db, 'contratos'), where('__name__','in', slice)))
    snap.docs.forEach(d => results.push({ id: d.id, ...d.data() }))
  }
  contratos.value = results
}
async function cargarEquiposContrato(contratoId) {
  try {
    const qe = query(collection(db,'equipos'), where('contratoId','==', contratoId), orderBy('nombre_equipo'))
    const se = await getDocs(qe)
    equiposByContrato.value[contratoId] = se.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch {
    const qe = query(collection(db,'equipos'), where('contratoId','==', contratoId))
    const se = await getDocs(qe)
    equiposByContrato.value[contratoId] = se.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => String(a.nombre_equipo||'').localeCompare(String(b.nombre_equipo||''),'es',{sensitivity:'base'}))
  }
}
async function cargarOperatividadContrato(contratoId) {
  try {
    const qo = query(
      collection(db,'operatividad'),
      where('contratoId','==', contratoId),
      where('fecha','>=', inicioMes),
      where('fecha','<', finMes),
      orderBy('fecha','asc')
    )
    const so = await getDocs(qo)
    operByContrato.value[contratoId] = so.docs.map(d => ({ id:d.id, ...d.data() }))
  } catch {
    const qo = query(
      collection(db,'operatividad'),
      where('contratoId','==', contratoId),
      where('fecha','>=', inicioMes),
      where('fecha','<', finMes)
    )
    const so = await getDocs(qo)
    operByContrato.value[contratoId] = so.docs.map(d => ({ id:d.id, ...d.data() }))
  }
}

async function cargarOTsDeEquipo(equipoId) {
  loadingOTs.value[equipoId] = true
  try {
    const lista = await listarOTsPorEquipo(equipoId)
    otsPorEquipo.value[equipoId] = lista
  } finally {
    loadingOTs.value[equipoId] = false
  }
}

// ====== Upload individual ======
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadstart = () => {
      abrirUpload(file.name)
      updateUpload({ stage: 'reading', pct: 5, detail: 'Leyendo archivo del disco…' })
    }
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const p = Math.max(5, Math.min(90, (e.loaded / e.total) * 90))
        updateUpload({ stage: 'reading', pct: p, detail: `Leyendo… ${Math.round(p)}%` })
      }
    }
    reader.onload = () => { updateUpload({ stage: 'reading', pct: 95, detail: 'Archivo leído. Preparando optimización…' }); resolve(String(reader.result)) }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
async function onPickPDF(evt, equipo) {
  if (!puedeGestionarOTs.value) return alert('Tu perfil no tiene permiso para cargar OTs.')
  const input = evt.target
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    const dataUrl = await fileToBase64(file)
    const auth = getAuth()
    const user = auth.currentUser
    const createdBy = user?.email || 'desconocido'
    const createdByName = (usuario.value?.nombre_completo || '').trim()

    upload.value.working = true
    await crearOT(
      {
        equipoId: equipo.id,
        contratoId: equipo.contratoId,
        nombre_equipo: equipo.nombre_equipo || '',
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        base64: dataUrl,
        sizeBytes: file.size,
        // extras opcionales:
        estado: 'F',
        fecha: new Date(),
        texto: '',
        createdBy,
        createdByName,
      },
      ({ stage, pct, detail }) => updateUpload({ stage, pct, detail })
    )

    updateUpload({ stage: 'done', pct: 100, detail: '¡Listo! La OT fue guardada.' })
    upload.value.working = false
    await cargarOTsDeEquipo(equipo.id)
    showOk('OT subida correctamente.')
  } catch (e) {
    console.error(e)
    upload.value.detail = 'Hubo un problema al subir la OT.'
    upload.value.working = false
    showErr('Error al subir la OT.')
  }
}

// ====== CARGA MASIVA ======
const masiva = ref({
  visible:false,
  rows: [], // { key, file, fileName, size, equipoId, autoguess, autoguessTxt, estado, fecha, texto }
  defaultEstado: 'F',
  defaultFecha: toInputDate(new Date()),
  defaultTexto: '',
  working:false,
  progress:0,
  detail:'',
  done:false,
  summary:null // {ok, err}
})
const equiposContrato = computed(() => contratoActivoId.value ? (equiposByContrato.value[contratoActivoId.value] || []) : [])
const puedeSubirMasiva = computed(() => masiva.value.rows.length > 0 && masiva.value.rows.every(r => r.equipoId))

function abrirMasiva(){
  if (!puedeGestionarOTs.value) return alert('Tu perfil no tiene permiso para cargar OTs.')
  masiva.value = {
    visible:true, rows:[], defaultEstado:'F', defaultFecha: toInputDate(new Date()), defaultTexto:'',
    working:false, progress:0, detail:'', done:false, summary:null
  }
}
function prettySize(bytes){
  if (!bytes && bytes !== 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/(1024*1024)).toFixed(1)} MB`
}
function norm(s){ return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'') }
function guessEquipoIdFromFilename(name){
  const NN = norm(name)
  // 1) por PPU
  for (const e of equiposContrato.value){
    if (e.patente && NN.includes(norm(e.patente))) return { id:e.id, txt:`${e.nombre_equipo} — ${e.patente}` }
  }
  // 2) por interno
  for (const e of equiposContrato.value){
    if (e.nombre_equipo && NN.includes(norm(e.nombre_equipo))) return { id:e.id, txt:`${e.nombre_equipo} — ${e.patente||'s/p'}` }
  }
  return null
}
function onPickMasiva(evt){
  const files = Array.from(evt.target.files || [])
  evt.target.value = ''
  if (!files.length) return

  const rows = []
  for (const f of files){
    const guess = guessEquipoIdFromFilename(f.name)
    rows.push({
      key: `${Date.now()}_${f.name}_${Math.random().toString(36).slice(2,8)}`,
      file: f,
      fileName: f.name,
      size: f.size,
      equipoId: guess?.id || '',
      autoguess: !!guess,
      autoguessTxt: guess?.txt || '',
      estado: masiva.value.defaultEstado,
      fecha: masiva.value.defaultFecha,
      texto: ''
    })
  }
  masiva.value.rows.push(...rows)
}

async function subirMasiva(){
  if (!puedeGestionarOTs.value) return
  const filas = masiva.value.rows
  if (!filas.length) return
  if (!contratoActivoId.value) return alert('Selecciona un contrato primero.')
  if (filas.some(r => !r.equipoId)) return alert('Asegúrate de asignar equipo a todas las filas.')

  masiva.value.working = true
  masiva.value.progress = 0
  masiva.value.detail = 'Preparando carga…'
  masiva.value.done = false
  masiva.value.summary = null

  let ok = 0, err = 0
  const afectados = new Set()

  const auth = getAuth()
  const user = auth.currentUser
  const createdBy = user?.email || 'desconocido'
  const createdByName = (usuario.value?.nombre_completo || '').trim()

  for (let i=0;i<filas.length;i++){
    const r = filas[i]
    masiva.value.detail = `Leyendo ${r.fileName} (${i+1}/${filas.length})…`

    try {
      // Base64 (lectura rápida)
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(r.file)
      })

      masiva.value.detail = `Subiendo ${r.fileName} (${i+1}/${filas.length})…`

      await crearOT({
        equipoId: r.equipoId,
        contratoId: contratoActivoId.value,
        fileName: r.fileName,
        mimeType: r.file.type || 'application/pdf',
        base64,
        sizeBytes: r.size,
        estado: r.estado || masiva.value.defaultEstado,
        fecha: new Date(r.fecha || masiva.value.defaultFecha),
        texto: r.texto || masiva.value.defaultTexto || '',
        createdBy,
        createdByName,
      })

      ok++
      afectados.add(r.equipoId)
    } catch(e) {
      console.error('Error subiendo', r.fileName, e)
      err++
    }

    masiva.value.progress = Math.round(((i+1) / filas.length) * 100)
  }

  // refrescar OTs de equipos afectados
  await Promise.all(Array.from(afectados).map(id => cargarOTsDeEquipo(id)))

  masiva.value.working = false
  masiva.value.done = true
  masiva.value.summary = { ok, err }
  masiva.value.detail = 'Proceso finalizado.'
  showOk('Carga masiva completada', `Éxitos: ${ok} · Errores: ${err}`)
}

// ====== Abrir / borrar OT ======
async function abrirPDF(ot) {
  try {
    let dataUrl = ot.base64 || null
    if (!dataUrl) dataUrl = await obtenerOTDataUrl(ot.id)
    if (!dataUrl) return alert('No se encontró el contenido del PDF.')

    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
    const win = window.open(url, '_blank')
    if (!win) alert('Bloqueado por el navegador. Permite ventanas emergentes.')
  } catch (e) {
    console.error(e)
    alert('No se pudo abrir el PDF.')
  }
}
async function borrarOT(ot, equipo) {
  if (!puedeGestionarOTs.value) return alert('Tu perfil no tiene permiso para eliminar OTs.')
  if (!confirm(`¿Eliminar la OT "${ot.fileName}"? Esta acción no se puede deshacer.`)) return
  try {
    deletingOT.value = { ...deletingOT.value, [ot.id]: true }
    await eliminarOT(ot.id)
    await cargarOTsDeEquipo(equipo.id)
    showOk('OT eliminada correctamente.')
  } catch (e) {
    console.error(e)
    showErr('No se pudo eliminar la OT.')
  } finally {
    const map = { ...deletingOT.value }; delete map[ot.id]; deletingOT.value = map
  }
}

// ====== Refrescar ======
async function refrescar() {
  cargando.value = true
  try {
    if (usuario.value?.uid) {
      if (contratoActivoId.value) {
        equiposByContrato.value[contratoActivoId.value] = []
        operByContrato.value[contratoActivoId.value] = []
        await Promise.all([ cargarEquiposContrato(contratoActivoId.value), cargarOperatividadContrato(contratoActivoId.value) ])
      } else {
        await cargarContratosDelUsuario(usuario.value.uid)
      }
      await Promise.all(equiposFiltrados.value.map((e) => cargarOTsDeEquipo(e.id)))
    }
  } finally {
    cargando.value = false
  }
}
watch(contratoActivoId, async (nuevo) => {
  if (!nuevo) return
  cargando.value = true
  try {
    equiposByContrato.value = {}
    operByContrato.value = {}
    await Promise.all([cargarEquiposContrato(nuevo), cargarOperatividadContrato(nuevo)])
    await Promise.all(equiposFiltrados.value.map((e) => cargarOTsDeEquipo(e.id)))
  } finally {
    cargando.value = false
  }
})

// ====== Init ======
onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, async (u) => {
    if (!u) { cargando.value = false; return }
    usuario.value = u
    cargando.value = true
    try {
      await cargarContratosDelUsuario(u.uid)
      await Promise.all(equiposFiltrados.value.map((e) => cargarOTsDeEquipo(e.id)))
    } finally {
      cargando.value = false
    }
  })
})
</script>

<style scoped>
.list-group-item { font-size: 0.95rem; }

/* Modal de subida */
.upload-backdrop{
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000;
}
.upload-modal{
  width: min(820px, 96vw);
  border-radius: 16px;
}
.progress{ background-color: #e9ecef; }
.progress-bar{ font-weight: 700; }

/* opcional: compactar espacio del card de filtros */
.card-body .form-label { font-weight: 600; }
</style>
