<template>
  <div class="container py-4">
    <!-- Header con Volver + selector contrato (responsive) -->
    <div class="d-flex align-items-start align-items-sm-center justify-content-between gap-2 flex-wrap mb-3">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-outline-dark btn-sm btn-w-xs" @click="volver">
          <i class="bi bi-arrow-left"></i>
          <span class="d-none d-sm-inline">Volver</span>
        </button>
        <h3 class="mb-0 fs-5 fs-sm-4">Panel Admin — Ingresos de Equipos & OTs</h3>
      </div>

      <div class="d-flex align-items-stretch align-items-sm-center gap-2 flex-column flex-sm-row w-100 w-sm-auto">
        <div class="d-flex align-items-center gap-2 w-100 w-sm-auto">
          <label class="form-label mb-0 d-none d-sm-inline">Contrato activo</label>
          <select
            v-model="contratoSel"
            class="form-select form-select-sm minw-220 w-100 w-sm-auto"
            @change="recargarPorContrato"
          >
            <option v-for="c in contratos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </div>
        <button
          class="btn btn-outline-secondary btn-sm btn-w-xs"
          @click="recargarPorContrato"
          :disabled="loadingRecarga"
        >
          <i class="bi bi-arrow-clockwise"></i>
          {{ loadingRecarga ? 'Actualizando…' : 'Actualizar' }}
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-pills mb-3" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link" :class="{ active: tabActiva==='equipos' }" @click="tabActiva='equipos'" type="button" role="tab">
          <i class="bi bi-list-check me-1"></i> Ingresos de Equipos
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" :class="{ active: tabActiva==='ots' }" @click="tabActiva='ots'" type="button" role="tab">
          <i class="bi bi-receipt me-1"></i> OTs cargadas
        </button>
      </li>
    </ul>

    <!-- ========================= TAB EQUIPOS ========================= -->
    <div v-show="tabActiva==='equipos'">
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-12 col-md-4">
              <label class="form-label">Buscar (interno/PPU)</label>
              <input
                v-model.trim="filtroEquipos.texto"
                type="text"
                class="form-control"
                placeholder="Ej: MIXER 12 o AB-CD-12"
                @input="aplicarFiltroEquipos"
              />
            </div>
            <!-- SIN selector de contrato (se usa contratoSel global) -->
            <div class="col-6 col-md-4">
              <label class="form-label">Categoría</label>
              <select v-model="filtroEquipos.categoria" class="form-select" @change="aplicarFiltroEquipos">
                <option value="">Todas</option>
                <option v-for="cat in categoriasEquipos" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="col-12 col-md-4 text-md-end">
              <div class="d-flex gap-2 justify-content-md-end flex-wrap">
                <span class="badge text-bg-light border align-self-center">
                  Contrato activo: {{ contratoNombre(contratoSel) }}
                </span>
                <button class="btn btn-primary btn-w-xs" @click="abrirModalEquipo()">
                  <i class="bi bi-plus-lg"></i> Nuevo equipo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 32px"></th>
                  <!-- Ocultamos 'Contrato' en XS para dar espacio -->
                  <th class="d-none d-md-table-cell">Contrato</th>
                  <th>N° Interno</th>
                  <th>PPU</th>
                  <th class="d-none d-sm-table-cell">Categoría</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingEquipos">
                  <td colspan="6" class="text-center py-4">
                    <div class="spinner-border"></div>
                  </td>
                </tr>
                <tr v-for="e in equiposFiltrados" :key="e.id">
                  <td><span class="badge text-bg-secondary">{{ e._idx }}</span></td>
                  <td class="d-none d-md-table-cell"><span class="fw-semibold">{{ contratoNombre(e.contratoId) }}</span></td>
                  <td class="fw-semibold">{{ e.nombre_equipo || '—' }}</td>
                  <td><code>{{ e.patente || '—' }}</code></td>
                  <td class="d-none d-sm-table-cell">
                    <span class="badge text-bg-light border">{{ e.categoria || '—' }}</span>
                  </td>
                  <td class="text-end">
                    <div class="btn-group btn-group-sm flex-wrap">
                      <button class="btn btn-outline-secondary" @click="abrirModalEquipo(e)">
                        <i class="bi bi-pencil-square"></i>
                      </button>
                      <button class="btn btn-outline-danger" @click="confirmarEliminarEquipo(e)">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!loadingEquipos && equiposFiltrados.length===0">
                  <td colspan="6" class="text-center py-4 text-muted">Sin resultados…</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================= TAB OTs ========================= -->
    <div v-show="tabActiva==='ots'">
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-12 col-md-4">
              <label class="form-label">Buscar por texto de OT</label>
              <input
                v-model.trim="filtroOts.texto"
                type="text"
                class="form-control"
                placeholder="palabras del texto de la OT"
                @input="aplicarFiltroOts"
              />
            </div>
            <!-- SIN selector de contrato (se usa contratoSel global) -->
            <div class="col-6 col-md-4">
              <label class="form-label">Estado</label>
              <select v-model="filtroOts.estado" class="form-select" @change="aplicarFiltroOts">
                <option value="">Todos</option>
                <option value="F">Falla</option>
                <option value="M">Mantención</option>
              </select>
            </div>
            <div class="col-12 col-md-4 text-md-end">
              <div class="d-flex gap-2 justify-content-md-end flex-wrap">
                <span class="badge text-bg-light border align-self-center">
                  Contrato activo: {{ contratoNombre(contratoSel) }}
                </span>
                <button class="btn btn-primary btn-w-xs" @click="abrirModalOT()">
                  <i class="bi bi-upload"></i> Nueva OT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 36px"></th>
                  <th class="d-none d-lg-table-cell">Contrato</th>
                  <th>Equipo</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <!-- Ocultamos texto largo en XS/SM -->
                  <th class="d-none d-md-table-cell">Texto (extracto)</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingOts">
                  <td colspan="7" class="text-center py-4">
                    <div class="spinner-border"></div>
                  </td>
                </tr>
                <tr v-for="(ot,idx) in otsFiltradas" :key="ot.id">
                  <td><span class="badge text-bg-secondary">{{ idx+1 }}</span></td>
                  <td class="fw-semibold d-none d-lg-table-cell">{{ contratoNombre(ot.contratoId) }}</td>
                  <td>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                      <span class="fw-semibold">{{ equipoNombre(ot.equipoId) }}</span>
                      <small class="text-muted">({{ equipoPatente(ot.equipoId) }})</small>
                    </div>
                  </td>
                  <td>
                    <span :class="ot.estado==='F' ? 'badge text-bg-danger' : 'badge text-bg-warning text-dark'">
                      {{ ot.estado==='F' ? 'Falla' : 'Mantención' }}
                    </span>
                  </td>
                  <td><span class="small text-muted">{{ formatearFecha(ot.fecha) }}</span></td>
                  <td class="d-none d-md-table-cell">
                    <div class="text-truncate" style="max-width: 440px" :title="ot.texto || '—'">
                      {{ ot.texto || '—' }}
                    </div>
                  </td>
                  <td class="text-end">
                    <div class="btn-group btn-group-sm flex-wrap">
                      <a class="btn btn-outline-dark" v-if="ot.urlPdf" :href="ot.urlPdf" target="_blank" title="Ver PDF">
                        Ver
                      </a>
                      <button class="btn btn-outline-secondary" @click="abrirModalOT(ot)">
                        <i class="bi bi-pencil-square"></i>
                      </button>
                      <button class="btn btn-outline-danger" @click="confirmarEliminarOT(ot)">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!loadingOts && otsFiltradas.length===0">
                  <td colspan="7" class="text-center py-4 text-muted">Sin resultados…</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================= MODAL EQUIPO ========================= -->
    <div class="modal fade show" tabindex="-1" style="display:block;" v-if="modalEquipo.visible" @click.self="cerrarModalEquipo">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content rounded-4">
          <div class="modal-header">
            <h5 class="modal-title">{{ modalEquipo.editando ? 'Editar equipo' : 'Nuevo equipo' }}</h5>
            <button class="btn-close" @click="cerrarModalEquipo"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Contrato</label>
                <input class="form-control" :value="contratoNombre(contratoSel)" disabled />
              </div>
              <div class="col-md-6">
                <label class="form-label">Categoría</label>
                <input v-model.trim="formEquipo.categoria" type="text" class="form-control" placeholder="Ej: Mixer, Camión tolva…" />
              </div>
              <div class="col-md-6">
                <label class="form-label">N° interno</label>
                <input v-model.trim="formEquipo.nombre_equipo" type="text" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label">PPU</label>
                <input v-model.trim="formEquipo.patente" type="text" class="form-control" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-w-xs" @click="cerrarModalEquipo">Cancelar</button>
            <button class="btn btn-primary btn-w-xs" :disabled="guardandoEquipo" @click="guardarEquipo">
              {{ guardandoEquipo ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================= MODAL OT ========================= -->
    <div class="modal fade show" tabindex="-1" style="display:block;" v-if="modalOT.visible" @click.self="cerrarModalOT">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content rounded-4">
          <div class="modal-header">
            <h5 class="modal-title">{{ modalOT.editando ? 'Editar OT' : 'Nueva OT' }}</h5>
            <button class="btn-close" @click="cerrarModalOT"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Contrato</label>
                <input class="form-control" :value="contratoNombre(contratoSel)" disabled />
              </div>
              <div class="col-md-6">
                <label class="form-label">Equipo</label>
                <select v-model="formOT.equipoId" class="form-select">
                  <option value="" disabled>Seleccione…</option>
                  <option v-for="e in equiposContratoSeleccionado" :key="e.id" :value="e.id">
                    {{ e.nombre_equipo }} — {{ e.patente }}
                  </option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Estado</label>
                <select v-model="formOT.estado" class="form-select">
                  <option value="F">Falla</option>
                  <option value="M">Mantención</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Fecha</label>
                <input v-model="formOT.fecha" type="date" class="form-control" />
              </div>
              <div class="col-md-4">
                <label class="form-label">Archivo PDF (opcional)</label>
                <input ref="inputPdf" type="file" accept="application/pdf" class="form-control" />
              </div>
              <div class="col-12">
                <label class="form-label">Texto de la OT</label>
                <textarea
                  v-model.trim="formOT.texto"
                  rows="4"
                  class="form-control"
                  placeholder="Describe brevemente la OT o pega el texto extraído"
                ></textarea>
                <div class="form-text">Este texto se muestra en la lista. Para ver el PDF completo, usa el botón <em>Ver</em>.</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-w-xs" @click="cerrarModalOT">Cancelar</button>
            <button class="btn btn-primary btn-w-xs" :disabled="guardandoOT" @click="guardarOT">
              {{ guardandoOT ? 'Guardando…' : (modalOT.editando ? 'Guardar cambios' : 'Crear OT') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================= CONFIRMACIONES ========================= -->
    <div class="modal fade show" tabindex="-1" style="display:block;" v-if="confirm.visible" @click.self="confirm.visible=false">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4">
          <div class="modal-header">
            <h5 class="modal-title">Confirmar</h5>
            <button class="btn-close" @click="confirm.visible=false"></button>
          </div>
          <div class="modal-body">
            {{ confirm.texto }}
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-w-xs" @click="confirm.visible=false">Cancelar</button>
            <button class="btn btn-danger btn-w-xs" @click="confirm.accion && confirm.accion()">Sí, continuar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore'
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage'

/** Volver */
const router = useRouter()
const volver = () => router.back()

/**
 * Colecciones utilizadas:
 *  - contratos
 *  - equipos { contratoId, categoria, nombre_equipo, patente }
 *  - ots { contratoId, equipoId, estado: 'F'|'M', fecha, texto, urlPdf, creado, actualizado }
 */

// =================== TABS & RECARGA ===================
const tabActiva = ref('equipos')
const loadingRecarga = ref(false)

// =================== CONTRATOS ===================
const contratos = ref([])
const contratoSel = ref('')

async function cargarContratos() {
  const snap = await getDocs(query(collection(db, 'contratos'), orderBy('nombre')))
  contratos.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  if (!contratoSel.value && contratos.value.length) {
    contratoSel.value = contratos.value[0].id
  }
}
function contratoNombre(id) {
  return contratos.value.find(c => c.id === id)?.nombre || '—'
}

// =================== EQUIPOS ===================
const equipos = ref([])
const loadingEquipos = ref(true)
const filtroEquipos = reactive({ texto: '', categoria: '' })

const equiposFiltrados = computed(() => {
  const t = filtroEquipos.texto.toLowerCase()
  return equipos.value
    .filter(e => !filtroEquipos.categoria || (e.categoria || '') === filtroEquipos.categoria)
    .filter(e => !t ||
      (String(e.nombre_equipo || '').toLowerCase().includes(t) ||
       String(e.patente || '').toLowerCase().includes(t))
    )
})
const categoriasEquipos = computed(() => {
  const set = new Set(equipos.value.map(e => e.categoria).filter(Boolean))
  return Array.from(set).sort()
})

async function cargarEquipos() {
  if (!contratoSel.value) { equipos.value = []; return }
  loadingEquipos.value = true
  try {
    const qRef = query(
      collection(db, 'equipos'),
      where('contratoId', '==', contratoSel.value),
      orderBy('nombre_equipo')
    )
    const snap = await getDocs(qRef)
    let idx = 1
    equipos.value = snap.docs.map(d => ({ id: d.id, _idx: idx++, ...d.data() }))
  } finally {
    loadingEquipos.value = false
  }
}
function aplicarFiltroEquipos() { /* computado reacciona solo */ }

// Modal Equipo
const modalEquipo = reactive({ visible: false, editando: false })
const formEquipo = reactive({ id: null, contratoId: '', categoria: '', nombre_equipo: '', patente: '' })
const guardandoEquipo = ref(false)

function abrirModalEquipo(e = null) {
  modalEquipo.visible = true
  modalEquipo.editando = !!e
  if (e) {
    formEquipo.id = e.id
    formEquipo.contratoId = contratoSel.value
    formEquipo.categoria = e.categoria || ''
    formEquipo.nombre_equipo = e.nombre_equipo || ''
    formEquipo.patente = e.patente || ''
  } else {
    formEquipo.id = null
    formEquipo.contratoId = contratoSel.value
    formEquipo.categoria = ''
    formEquipo.nombre_equipo = ''
    formEquipo.patente = ''
  }
}
function cerrarModalEquipo(){ modalEquipo.visible = false }

async function guardarEquipo() {
  if (!formEquipo.contratoId || !formEquipo.nombre_equipo) return alert('Contrato y N° interno son obligatorios.')
  guardandoEquipo.value = true
  try {
    if (modalEquipo.editando && formEquipo.id) {
      await updateDoc(doc(db, 'equipos', formEquipo.id), {
        contratoId: formEquipo.contratoId,
        categoria: formEquipo.categoria || null,
        nombre_equipo: formEquipo.nombre_equipo,
        patente: formEquipo.patente || null
      })
    } else {
      await addDoc(collection(db, 'equipos'), {
        contratoId: formEquipo.contratoId,
        categoria: formEquipo.categoria || null,
        nombre_equipo: formEquipo.nombre_equipo,
        patente: formEquipo.patente || null,
        creado: serverTimestamp()
      })
    }
    cerrarModalEquipo()
    await cargarEquipos()
  } finally {
    guardandoEquipo.value = false
  }
}

// Confirmaciones genéricas
const confirm = reactive({ visible: false, texto: '', accion: null })
function confirmarEliminarEquipo(e) {
  confirm.visible = true
  confirm.texto = `¿Eliminar equipo "${e.nombre_equipo}"? Esta acción no se puede deshacer.`
  confirm.accion = async () => {
    confirm.visible = false
    await deleteDoc(doc(db, 'equipos', e.id))
    await cargarEquipos()
  }
}

// =================== OTs ===================
const ots = ref([])
const loadingOts = ref(true)
const filtroOts = reactive({ texto: '', estado: '' })

const otsFiltradas = computed(() => {
  const t = filtroOts.texto.toLowerCase()
  return ots.value
    .filter(o => !filtroOts.estado || o.estado === filtroOts.estado)
    .filter(o => !t || String(o.texto || '').toLowerCase().includes(t))
})

async function cargarOts() {
  if (!contratoSel.value) { ots.value = []; return }
  loadingOts.value = true
  try {
    const qRef = query(
      collection(db, 'ots'),
      where('contratoId', '==', contratoSel.value),
      where('estado', 'in', ['F','M']),
      orderBy('fecha', 'desc')
    )
    const snap = await getDocs(qRef)
    ots.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } finally {
    loadingOts.value = false
  }
}
function aplicarFiltroOts() { /* computado reacciona solo */ }

// Modal OT
const modalOT = reactive({ visible: false, editando: false })
const formOT = reactive({ id: null, contratoId: '', equipoId: '', estado: 'F', fecha: '', texto: '', urlPdf: '' })
const guardandoOT = ref(false)
const inputPdf = ref(null)

const equiposContratoSeleccionado = computed(() => equipos.value)

function abrirModalOT(o = null) {
  modalOT.visible = true
  modalOT.editando = !!o
  if (o) {
    formOT.id = o.id
    formOT.contratoId = contratoSel.value
    formOT.equipoId = o.equipoId || ''
    formOT.estado = o.estado || 'F'
    formOT.fecha = o.fecha ? toInputDate(o.fecha) : toInputDate(new Date())
    formOT.texto = o.texto || ''
    formOT.urlPdf = o.urlPdf || ''
  } else {
    formOT.id = null
    formOT.contratoId = contratoSel.value
    formOT.equipoId = ''
    formOT.estado = 'F'
    formOT.fecha = toInputDate(new Date())
    formOT.texto = ''
    formOT.urlPdf = ''
  }
  if (inputPdf.value) inputPdf.value.value = ''
}
function cerrarModalOT(){ modalOT.visible = false }

function toInputDate(d){
  const date = d?.toDate ? d.toDate() : new Date(d)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth()+1).padStart(2,'0')
  const dd = String(date.getDate()).padStart(2,'0')
  return `${yyyy}-${mm}-${dd}`
}
function formatearFecha(d){
  if (!d) return '—'
  const date = d?.toDate ? d.toDate() : new Date(d)
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(date)
}
function equipoNombre(id){
  return equipos.value.find(e => e.id === id)?.nombre_equipo || '—'
}
function equipoPatente(id){
  return equipos.value.find(e => e.id === id)?.patente || '—'
}

async function guardarOT(){
  if (!formOT.contratoId || !formOT.equipoId || !formOT.fecha) return alert('Contrato, equipo y fecha son obligatorios.')
  guardandoOT.value = true
  try {
    // Subida opcional de PDF
    let url = formOT.urlPdf || ''
    const file = inputPdf.value?.files?.[0]
    if (file) {
      const storage = getStorage()
      const path = `ots/${formOT.contratoId}/${Date.now()}_${file.name}`
      const r = sRef(storage, path)
      await uploadBytes(r, file)
      url = await getDownloadURL(r)
    }

    const payload = {
      contratoId: formOT.contratoId,
      equipoId: formOT.equipoId,
      estado: formOT.estado,
      fecha: new Date(formOT.fecha),
      texto: formOT.texto || '',
      urlPdf: url || null,
      actualizado: serverTimestamp()
    }

    if (modalOT.editando && formOT.id) {
      await updateDoc(doc(db, 'ots', formOT.id), payload)
    } else {
      await addDoc(collection(db, 'ots'), { ...payload, creado: serverTimestamp() })
    }

    cerrarModalOT()
    await cargarOts()
  } finally {
    guardandoOT.value = false
  }
}

function confirmarEliminarOT(o){
  confirm.visible = true
  confirm.texto = '¿Eliminar esta OT? Esta acción no se puede deshacer.'
  confirm.accion = async () => {
    confirm.visible = false
    await deleteDoc(doc(db, 'ots', o.id))
    await cargarOts()
  }
}

// =================== RECARGA GLOBAL POR CONTRATO ===================
async function recargarPorContrato() {
  loadingRecarga.value = true
  try {
    await Promise.all([cargarEquipos(), cargarOts()])
  } finally {
    loadingRecarga.value = false
  }
}

// =================== INIT ===================
onMounted(async () => {
  await cargarContratos()
  await recargarPorContrato()
})
</script>

<style scoped>
.table-hover tbody tr:hover { background: #fafafa; }
.modal-backdrop { display: none; }

.card { border-radius: 16px; }
.form-label { font-weight: 600; }
.nav-pills .nav-link { border-radius: 999px; }
.nav-pills .nav-link.active { background-color: #1f4e78; }
.btn-group .btn + .btn { margin-left: 4px; }

/* ====== Utilidades responsivas ====== */
/* Botón 100% ancho en XS; auto desde SM */
.btn-w-xs { width: 100%; }
@media (min-width: 576px) {
  .btn-w-xs { width: auto; }
}

/* Min width del select solo desde SM */
.minw-220 { min-width: 220px; }
@media (max-width: 575.98px) {
  .minw-220 { min-width: 0 !important; }
}

/* Ajustes tipográficos en móviles */
@media (max-width: 575.98px) {
  h3 { font-size: 1.1rem; }
}
</style>
