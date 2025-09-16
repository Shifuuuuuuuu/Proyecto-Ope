<template>
  <div class="container py-4">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h3 class="mb-0">Reportes de Fallas de Equipos</h3>
      <router-link to="/menu" class="btn btn-outline-secondary">
        <i class="bi bi-arrow-left"></i> Volver al menú
      </router-link>
    </div>

    <div class="row g-4">
      <!-- Formulario -->
      <div class="col-12 col-lg-5">
        <div class="card shadow-sm">
          <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">
            <strong>Nuevo reporte de falla</strong>
            <span v-if="isVisualizador" class="badge text-bg-warning">Modo visualizador</span>
          </div>
          <div class="card-body">
            <!-- Contrato -->
            <div class="mb-3">
              <label class="form-label">Contrato</label>
              <select class="form-select" v-model="form.contratoId" @change="onChangeContrato" :disabled="cargando.contratos">
                <option value="" disabled>Seleccione contrato…</option>
                <option v-for="c in contratosUsuario" :key="c.id" :value="c.id">
                  {{ c.nombre }}
                </option>
              </select>
              <div v-if="cargando.contratos" class="form-text">Cargando contratos…</div>
            </div>

            <!-- Equipo por contrato -->
            <div class="mb-3">
              <label class="form-label">Equipo</label>
              <select class="form-select" v-model="form.equipoId" :disabled="isVisualizador || !form.contratoId || cargando.equipos">
                <option value="" disabled>Seleccione equipo…</option>
                <option v-for="e in equiposContrato" :key="e.id" :value="e.id">
                  {{ e.nombre_equipo }} <span v-if="e.patente">— {{ e.patente }}</span>
                </option>
              </select>
              <div v-if="form.contratoId && cargando.equipos" class="form-text">Cargando equipos…</div>
            </div>

            <div class="row">
              <div class="col-12 col-sm-6 mb-3">
                <label class="form-label">Fecha</label>
                <input type="date" class="form-control" v-model="form.fechaStr" :disabled="isVisualizador">
              </div>
              <div class="col-12 col-sm-6 mb-3">
                <label class="form-label">Hora</label>
                <input type="time" class="form-control" v-model="form.horaStr" :disabled="isVisualizador">
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Descripción de la falla</label>
              <textarea class="form-control" rows="3" v-model="form.descripcion" :disabled="isVisualizador" placeholder="Describe la falla…"></textarea>
            </div>

            <div class="d-grid gap-2">
              <button class="btn btn-danger" @click="guardar" :disabled="isVisualizador || !puedeGuardar || guardando">
                <i class="bi bi-bug"></i>
                <span class="ms-1">Guardar reporte</span>
              </button>
              <button class="btn btn-outline-secondary" @click="limpiar" :disabled="isVisualizador || guardando">
                Limpiar
              </button>
            </div>
            <div v-if="errorMsg" class="alert alert-warning mt-3 mb-0">
              {{ errorMsg }}
            </div>
          </div>
        </div>
      </div>

      <!-- Listado -->
      <div class="col-12 col-lg-7">
        <div class="card shadow-sm">
          <div class="card-header bg-light d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div class="d-flex flex-wrap align-items-center gap-2">
              <strong>Fallas</strong>
              <span v-if="form.contratoId" class="badge text-bg-danger">
                Contrato: {{ contratoNombre }}
              </span>
            </div>

            <!-- Buscador + Actualizar -->
            <div class="input-group input-group-sm buscador-grupo flex-nowrap w-100 w-sm-auto">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input
                type="text"
                class="form-control"
                placeholder="Buscar por equipo o descripción…"
                v-model="busqueda"
              >
              <button
                class="btn btn-outline-primary d-flex align-items-center"
                :disabled="cargando.fallas || !form.contratoId || refrescando"
                @click="refrescarFallas"
                title="Volver a cargar la lista"
              >
                <i class="bi" :class="refrescando ? 'bi-arrow-repeat spin' : 'bi-arrow-clockwise'"></i>
                <span class="ms-1 d-none d-sm-inline">Actualizar</span>
              </button>
            </div>
          </div>

          <div class="card-body p-0">
            <div v-if="!form.contratoId" class="p-3 text-muted">
              Selecciona un contrato para ver sus fallas.
            </div>

            <div v-else>
              <div v-if="cargando.fallas" class="p-3">
                <div class="text-muted">Cargando fallas…</div>
              </div>

              <div v-else-if="fallasFiltradas.length === 0" class="p-3">
                <div class="text-muted">Sin reportes para este contrato.</div>
              </div>

              <div v-else class="table-responsive">
                <table class="table table-sm table-hover align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th style="min-width: 140px;">Fecha/Hora</th>
                      <th>Equipo</th>
                      <th class="d-none d-md-table-cell">Descripción</th>
                      <th>Estatus</th>
                      <th class="d-none d-md-table-cell" style="min-width: 120px;">Usuario</th>
                      <th style="min-width: 160px;" class="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="f in fallasFiltradas" :key="f.id">
                      <td>
                        <div>{{ formatearFechaHora(f.fecha) }}</div>
                        <small class="text-muted">Creado: {{ formatearFechaHora(f.createdAt) }}</small>
                      </td>
                      <td>
                        <div class="fw-semibold text-wrap">
                          {{ f.equipoNombre || '—' }}
                        </div>
                        <small class="text-muted d-block">
                          <span v-if="f.equipoPatente">{{ f.equipoPatente }}</span>
                          <span v-if="f.equipoPatente && f.equipoInterno"> — </span>
                          <span v-if="f.equipoInterno">{{ f.equipoInterno }}</span>
                        </small>
                      </td>
                      <td class="d-none d-md-table-cell">
                        <div class="text-wrap clamp-2">{{ f.descripcion || '—' }}</div>
                      </td>
                      <td>
                        <span class="badge" :class="badgeClass(f.estatus)">{{ f.estatus || 'Reportado' }}</span>
                        <div class="small text-muted" v-if="f.updatedBy">por {{ f.updatedBy }}</div>
                      </td>
                      <td class="d-none d-md-table-cell">
                        <div class="small">{{ f.nombreUsuario || '—' }}</div>
                        <small class="text-muted">{{ f.emailUsuario || '' }}</small>
                      </td>

                      <!-- Acciones -->
                      <td class="text-end">
                        <!-- Desktop / md+ -->
                        <div class="btn-group btn-group-sm flex-wrap justify-content-end gap-1 d-none d-md-inline-flex">
                          <button
                            class="btn btn-outline-success"
                            :disabled="!isAdmin"
                            @click="abrirCambioEstatus(f)"
                            title="Cambiar estatus"
                          >
                            <i class="bi bi-arrow-repeat"></i>
                          </button>
                          <button class="btn btn-outline-primary" :disabled="isVisualizador || !canEditOrDelete(f)" @click="abrirEditar(f)" title="Editar">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button class="btn btn-outline-danger" :disabled="isVisualizador || !canEditOrDelete(f)" @click="confirmarBorrar(f)" title="Eliminar">
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>

                        <!-- Móvil / < md : Dropdown -->
                        <div class="dropdown d-inline d-md-none">
                          <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            Acciones
                          </button>
                          <ul class="dropdown-menu dropdown-menu-end">
                            <li>
                              <button class="dropdown-item"
                                :disabled="!isAdmin"
                                @click="abrirCambioEstatus(f)">
                                <i class="bi bi-arrow-repeat me-2"></i> Cambiar estatus
                              </button>
                            </li>
                            <li>
                              <button class="dropdown-item"
                                :disabled="isVisualizador || !canEditOrDelete(f)"
                                @click="abrirEditar(f)">
                                <i class="bi bi-pencil me-2"></i> Editar
                              </button>
                            </li>
                            <li>
                              <button class="dropdown-item text-danger"
                                :disabled="isVisualizador || !canEditOrDelete(f)"
                                @click="confirmarBorrar(f)">
                                <i class="bi bi-trash me-2"></i> Eliminar
                              </button>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </div>
          <div v-if="form.contratoId" class="card-footer small text-muted">
            {{ fallas.length }} registro(s) totales • Mostrando {{ fallasFiltradas.length }}
          </div>
        </div>
      </div>
    </div>

    <!-- Toast éxito -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1080;">
      <div class="toast align-items-center text-bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true" ref="toastRef">
        <div class="d-flex">
          <div class="toast-body">{{ toastMsg }}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" @click="hideToast"></button>
        </div>
      </div>
    </div>

    <!-- Modal Editar -->
    <div class="modal fade show" v-if="modalEdit.visible" style="display:block;" @click.self="cerrarEditar">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar reporte de falla</h5>
            <button class="btn-close" @click="cerrarEditar"></button>
          </div>
          <div class="modal-body">
            <!-- Equipo (del contrato actual) -->
            <div class="mb-3">
              <label class="form-label">Equipo</label>
              <select class="form-select" v-model="modalEdit.form.equipoId">
                <option value="" disabled>Seleccione equipo…</option>
                <option v-for="e in equiposContrato" :key="e.id" :value="e.id">
                  {{ e.nombre_equipo }} <span v-if="e.patente">— {{ e.patente }}</span>
                </option>
              </select>
            </div>
            <div class="row">
              <div class="col-12 col-sm-6 mb-3">
                <label class="form-label">Fecha</label>
                <input type="date" class="form-control" v-model="modalEdit.form.fechaStr">
              </div>
              <div class="col-12 col-sm-6 mb-3">
                <label class="form-label">Hora</label>
                <input type="time" class="form-control" v-model="modalEdit.form.horaStr">
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">Descripción</label>
              <textarea class="form-control" rows="3" v-model="modalEdit.form.descripcion"></textarea>
            </div>
            <div v-if="modalEdit.error" class="alert alert-warning py-2">
              {{ modalEdit.error }}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary w-100 w-sm-auto" @click="cerrarEditar">Cancelar</button>
            <button class="btn btn-primary w-100 w-sm-auto" :disabled="modalEdit.saving" @click="guardarEdicion">
              <i class="bi bi-save"></i> Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Borrar -->
    <div class="modal fade show" v-if="modalDelete.visible" style="display:block;" @click.self="cerrarBorrar">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title text-danger">Eliminar reporte</h5>
            <button class="btn-close" @click="cerrarBorrar"></button>
          </div>
          <div class="modal-body">
            <p class="mb-1">¿Seguro que deseas eliminar este reporte?</p>
            <ul class="small text-muted mb-0">
              <li><strong>Fecha:</strong> {{ formatearFechaHora(modalDelete.item?.fecha) }}</li>
              <li><strong>Equipo:</strong>
                <template v-if="modalDelete.item">
                  {{ modalDelete.item.equipoNombre || '—' }}
                  <small class="text-muted">
                    <span v-if="modalDelete.item.equipoPatente"> — {{ modalDelete.item.equipoPatente }}</span>
                    <span v-if="modalDelete.item.equipoInterno"> — {{ modalDelete.item.equipoInterno }}</span>
                  </small>
                </template>
              </li>
              <li><strong>Descripción:</strong> {{ modalDelete.item?.descripcion || '—' }}</li>
            </ul>
            <div v-if="modalDelete.error" class="alert alert-warning py-2 mt-2">{{ modalDelete.error }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary w-100 w-sm-auto" @click="cerrarBorrar">Cancelar</button>
            <button class="btn btn-danger w-100 w-sm-auto" :disabled="modalDelete.deleting" @click="borrarConfirmado">
              <i class="bi bi-trash"></i> Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Cambiar Estatus (solo Admin) -->
    <div class="modal fade show" v-if="modalStatus.visible" style="display:block;" @click.self="cerrarCambioEstatus">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Cambiar estatus</h5>
            <button class="btn-close" @click="cerrarCambioEstatus"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Estatus actual</label>
              <input type="text" class="form-control" :value="modalStatus.item?.estatus || 'Reportado'" disabled>
            </div>
            <div class="mb-3">
              <label class="form-label">Nuevo estatus</label>
              <select class="form-select" v-model="modalStatus.nuevo">
                <option value="Reportado">Reportado</option>
                <option value="En revisión">En revisión</option>
                <option value="Resuelto">Resuelto</option>
              </select>
              <div class="form-text">
                Solo los administradores pueden cambiar el estatus (por ejemplo a <strong>En revisión</strong>).
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">Observación</label>
              <input type="text" class="form-control" v-model="modalStatus.observacion" placeholder="Motivo del cambio (opcional)">
            </div>
            <div v-if="modalStatus.error" class="alert alert-warning py-2">{{ modalStatus.error }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary w-100 w-sm-auto" @click="cerrarCambioEstatus">Cancelar</button>
            <button class="btn btn-success w-100 w-sm-auto" :disabled="modalStatus.saving" @click="guardarCambioEstatus">
              <i class="bi bi-check2-circle"></i> Guardar estatus
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { db } from '@/firebase/config'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  addDoc,
  doc,
  getDocFromServer,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  updateDoc,
  deleteDoc
} from 'firebase/firestore'

/**
 * Colección usada: "reportes_fallas"
 * Doc:
 *   contratoId, contratoNombre,
 *   equipoId, equipoNombre, equipoPatente, equipoInterno,
 *   fecha (Date/Timestamp),
 *   descripcion,
 *   estatus: "Reportado" | "En revisión" | "Resuelto"
 *   uidUsuario, nombreUsuario, emailUsuario,
 *   createdAt, updatedAt, updatedBy
 */

/* ========== STATE ========== */
const cargando = reactive({ contratos: true, equipos: false, fallas: false })
const guardando = ref(false)
const refrescando = ref(false)
const errorMsg = ref('')
const toastMsg = ref('Acción realizada correctamente.')

const usuario = ref(null)
const perfilUsuario = ref(null)

const contratosUsuario = ref([])
const equiposContrato = ref([])

const fallas = ref([])
const unsubFallas = ref(null)

const busqueda = ref('')

const form = reactive({
  contratoId: '',
  equipoId: '',
  fechaStr: hoyISO(),
  horaStr: horaISO(),
  descripcion: ''
})

/* ====== Modales ====== */
const modalEdit = reactive({
  visible: false,
  saving: false,
  error: '',
  item: null,
  form: { equipoId:'', fechaStr:'', horaStr:'', descripcion:'' }
})
const modalDelete = reactive({
  visible: false,
  deleting: false,
  error: '',
  item: null
})
const modalStatus = reactive({
  visible: false,
  saving: false,
  error: '',
  item: null,
  nuevo: 'Reportado',
  observacion: ''
})

/* ========== HELPERS FECHA/HORA ========== */
function hoyISO () {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function horaISO () {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function combinarFechaHora(fechaStr, horaStr) {
  try {
    const [y,m,d] = fechaStr.split('-').map(n => parseInt(n))
    const [hh,mi] = horaStr.split(':').map(n => parseInt(n))
    return new Date(y, m - 1, d, hh, mi, 0, 0)
  } catch {
    return new Date()
  }
}
function formatearFechaHora(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`
}

/* ========== ROLES ========== */
const rol = computed(() => (perfilUsuario.value?.rol || '').toLowerCase())
const isAdmin = computed(() => rol.value === 'admin')
const isVisualizador = computed(() =>
  rol.value === 'visualizador' || rol.value === 'viewer' || rol.value === 'visualizer'
)

/* ========== CARGA USUARIO + CONTRATOS ========== */
async function cargarContratosAsignados(uid) {
  cargando.contratos = true
  try {
    const snap = await getDocFromServer(doc(db, 'usuarios', uid))
    if (!snap.exists()) return
    perfilUsuario.value = snap.data()

    const ids = perfilUsuario.value.contratosAsignados || []
    if (!ids.length) { contratosUsuario.value = []; return }

    const qs = await getDocs(collection(db, 'contratos'))
    contratosUsuario.value = qs.docs
      .map(d => ({ id: d.id, ...(d.data()) }))
      .filter(c => ids.includes(c.id))
      .map(c => ({ id: c.id, nombre: c.nombre || c.id }))
      .sort((a,b) => String(a.nombre).localeCompare(String(b.nombre), 'es', { sensitivity:'base' }))

    if (contratosUsuario.value.length === 1) {
      form.contratoId = contratosUsuario.value[0].id
      await onChangeContrato()
    }
  } finally {
    cargando.contratos = false
  }
}

/* ========== CAMBIO DE CONTRATO ========== */
async function onChangeContrato() {
  if (unsubFallas.value) { unsubFallas.value(); unsubFallas.value = null }
  fallas.value = []
  equiposContrato.value = []

  if (!form.contratoId) return
  await cargarEquiposDelContrato(form.contratoId)
  await escucharFallasContrato(form.contratoId)
}

async function cargarEquiposDelContrato(contratoId) {
  cargando.equipos = true
  try {
    const qs = await getDocs(query(collection(db, 'equipos'), where('contratoId', '==', contratoId)))
    const lista = qs.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => String(a.nombre_equipo||'').localeCompare(String(b.nombre_equipo||''), 'es', { sensitivity:'base' }))
    equiposContrato.value = lista
  } finally {
    cargando.equipos = false
  }
}

/* ========== LISTENER FALLAS (real-time con fallback) ========== */
async function escucharFallasContrato(contratoId) {
  cargando.fallas = true
  try {
    const qF = query(
      collection(db, 'reportes_fallas'),
      where('contratoId', '==', contratoId),
      orderBy('fecha', 'desc'),
      limit(200)
    )
    unsubFallas.value = onSnapshot(qF, (snap) => {
      fallas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      cargando.fallas = false
    }, (err) => {
      console.warn('onSnapshot orderBy(fecha) falló, fallback:', err?.code || err)
      fallbackEscucharSinOrden(contratoId)
    })
  } catch (e) {
    console.warn('Error query con orderBy(fecha). Fallback sin orden.', e)
    await fallbackEscucharSinOrden(contratoId)
  }
}
async function fallbackEscucharSinOrden(contratoId) {
  try {
    if (unsubFallas.value) { unsubFallas.value(); unsubFallas.value = null }
    const qF = query(collection(db, 'reportes_fallas'), where('contratoId', '==', contratoId), limit(200))
    unsubFallas.value = onSnapshot(qF, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      rows.sort((a,b) => {
        const da = a.fecha?.toDate ? a.fecha.toDate() : (a.fecha ? new Date(a.fecha) : new Date(0))
        const dbb = b.fecha?.toDate ? b.fecha.toDate() : (b.fecha ? new Date(b.fecha) : new Date(0))
        return dbb - da
      })
      fallas.value = rows
      cargando.fallas = false
    }, () => { cargando.fallas = false })
  } catch {
    cargando.fallas = false
  }
}

/* ========== REFRESCAR MANUAL ========== */
async function refrescarFallas() {
  if (!form.contratoId) return
  try {
    refrescando.value = true
    if (unsubFallas.value) { unsubFallas.value(); unsubFallas.value = null }
    await escucharFallasContrato(form.contratoId)
    showToast('Lista actualizada')
  } catch (e) {
    console.warn('Error al refrescar:', e)
  } finally {
    refrescando.value = false
  }
}

/* ========== GUARDAR NUEVO ========== */
const puedeGuardar = computed(() =>
  !!form.contratoId && !!form.equipoId && !!form.fechaStr && !!form.horaStr && (form.descripcion || '').trim().length > 0
)

async function guardar() {
  errorMsg.value = ''
  if (!puedeGuardar.value) {
    errorMsg.value = 'Completa contrato, equipo, fecha/hora y descripción.'
    return
  }
  guardando.value = true
  try {
    const fecha = combinarFechaHora(form.fechaStr, form.horaStr)
    const contrato = contratosUsuario.value.find(c => c.id === form.contratoId)
    const equipo = equiposContrato.value.find(e => e.id === form.equipoId)

    await addDoc(collection(db, 'reportes_fallas'), {
      contratoId: form.contratoId,
      contratoNombre: contrato?.nombre || '',
      equipoId: form.equipoId,
      equipoNombre: equipo?.nombre_equipo || '',
      equipoPatente: equipo?.patente || '',
      equipoInterno: equipo?.nombre_equipo || '', // cambia a tu campo "interno" real si existe
      fecha,
      descripcion: (form.descripcion || '').trim(),
      estatus: 'Reportado',
      uidUsuario: usuario.value?.uid || '',
      nombreUsuario: perfilUsuario.value?.nombre_completo || '',
      emailUsuario: usuario.value?.email || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: usuario.value?.email || ''
    })

    showToast('Reporte guardado')
    limpiar(false)
  } catch (e) {
    errorMsg.value = 'No se pudo guardar. Intenta nuevamente.'
    console.error(e)
  } finally {
    guardando.value = false
  }
}

function limpiar(resetContrato = false) {
  if (resetContrato) {
    form.contratoId = ''
    equiposContrato.value = []
  }
  form.equipoId = ''
  form.fechaStr = hoyISO()
  form.horaStr = horaISO()
  form.descripcion = ''
}

/* ========== EDITAR / BORRAR ========== */
function canEditOrDelete(f) {
  if (!usuario.value) return false
  if (isAdmin.value) return true
  return (f.uidUsuario && f.uidUsuario === usuario.value.uid)
}

function abrirEditar(f) {
  if (!canEditOrDelete(f)) return
  modalEdit.item = f
  modalEdit.form.equipoId = f.equipoId || ''
  const d = f.fecha?.toDate ? f.fecha.toDate() : new Date(f.fecha)
  modalEdit.form.fechaStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  modalEdit.form.horaStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  modalEdit.form.descripcion = f.descripcion || ''
  modalEdit.error = ''
  modalEdit.visible = true
}
function cerrarEditar() {
  modalEdit.visible = false
  modalEdit.item = null
  modalEdit.error = ''
}
async function guardarEdicion() {
  modalEdit.error = ''
  if (!modalEdit.item) return
  if (!modalEdit.form.equipoId || !modalEdit.form.fechaStr || !modalEdit.form.horaStr || !(modalEdit.form.descripcion||'').trim()) {
    modalEdit.error = 'Completa equipo, fecha/hora y descripción.'
    return
  }
  modalEdit.saving = true
  try {
    const fecha = combinarFechaHora(modalEdit.form.fechaStr, modalEdit.form.horaStr)
    const equipo = equiposContrato.value.find(e => e.id === modalEdit.form.equipoId)
    await updateDoc(doc(db, 'reportes_fallas', modalEdit.item.id), {
      equipoId: modalEdit.form.equipoId,
      equipoNombre: equipo?.nombre_equipo || '',
      equipoPatente: equipo?.patente || '',
      equipoInterno: equipo?.nombre_equipo || '',
      fecha,
      descripcion: (modalEdit.form.descripcion || '').trim(),
      updatedAt: new Date(),
      updatedBy: usuario.value?.email || ''
    })
    cerrarEditar()
    showToast('Cambios guardados')
  } catch (e) {
    modalEdit.error = 'No se pudo guardar los cambios.'
    console.error(e)
  } finally {
    modalEdit.saving = false
  }
}

function confirmarBorrar(f) {
  if (!canEditOrDelete(f)) return
  modalDelete.item = f
  modalDelete.error = ''
  modalDelete.visible = true
}
function cerrarBorrar() {
  modalDelete.visible = false
  modalDelete.item = null
  modalDelete.error = ''
}
async function borrarConfirmado() {
  if (!modalDelete.item) return
  modalDelete.deleting = true
  try {
    await deleteDoc(doc(db, 'reportes_fallas', modalDelete.item.id))
    cerrarBorrar()
    showToast('Reporte eliminado')
  } catch (e) {
    modalDelete.error = 'No se pudo eliminar el reporte.'
    console.error(e)
  } finally {
    modalDelete.deleting = false
  }
}

/* ========== CAMBIO DE ESTATUS (solo Admin) ========== */
function badgeClass(status) {
  const s = (status || 'Reportado').toLowerCase()
  if (s === 'reportado') return 'text-bg-secondary'
  if (s === 'en revisión' || s === 'en revision') return 'text-bg-warning'
  if (s === 'resuelto') return 'text-bg-success'
  return 'text-bg-light'
}
function abrirCambioEstatus(f) {
  if (!isAdmin.value) return
  modalStatus.item = f
  modalStatus.nuevo = f.estatus || 'Reportado'
  modalStatus.observacion = ''
  modalStatus.error = ''
  modalStatus.visible = true
}
function cerrarCambioEstatus() {
  modalStatus.visible = false
  modalStatus.item = null
  modalStatus.nuevo = 'Reportado'
  modalStatus.observacion = ''
  modalStatus.error = ''
}
async function guardarCambioEstatus() {
  modalStatus.error = ''
  if (!modalStatus.item) return
  modalStatus.saving = true
  try {
    await updateDoc(doc(db, 'reportes_fallas', modalStatus.item.id), {
      estatus: modalStatus.nuevo,
      updatedAt: new Date(),
      updatedBy: usuario.value?.email || ''
    })
    cerrarCambioEstatus()
    showToast('Estatus actualizado')
  } catch (e) {
    modalStatus.error = 'No se pudo cambiar el estatus.'
    console.error(e)
  } finally {
    modalStatus.saving = false
  }
}

/* ========== BUSCADOR ========== */
const fallasFiltradas = computed(() => {
  const t = (busqueda.value || '').toLowerCase().trim()
  if (!t) return fallas.value
  return fallas.value.filter(f => {
    const equipo = `${f.equipoNombre || ''} ${f.equipoPatente || ''} ${f.equipoInterno || ''}`.toLowerCase()
    const desc = String(f.descripcion || '').toLowerCase()
    const est = String(f.estatus || '').toLowerCase()
    return equipo.includes(t) || desc.includes(t) || est.includes(t)
  })
})

/* ========== PILL CONTRATO ========== */
const contratoSeleccionado = computed(() => contratosUsuario.value.find(c => c.id === form.contratoId) || null)
const contratoNombre = computed(() => contratoSeleccionado.value?.nombre || '')

/* ========== TOAST ========== */
const toastRef = ref(null)
function showToast(msg = 'Acción realizada correctamente.') {
  toastMsg.value = msg
  try {
    const Toast = window?.bootstrap?.Toast
    if (Toast && toastRef.value) {
      new Toast(toastRef.value).show()
    } else {
      toastRef.value?.classList?.add('show')
      setTimeout(() => hideToast(), 1800)
    }
  } catch {
    toastRef.value?.classList?.add('show')
    setTimeout(() => hideToast(), 1800)
  }
}
function hideToast() { toastRef.value?.classList?.remove('show') }

/* ========== MONTAJE / LIMPIEZA ========== */
onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, async (u) => {
    usuario.value = u
    if (u) await cargarContratosAsignados(u.uid)
  })
})
onBeforeUnmount(() => {
  if (unsubFallas.value) { unsubFallas.value(); unsubFallas.value = null }
})
watch(() => form.contratoId, async (n, o) => { if (n !== o && n) await onChangeContrato() })
</script>

<style scoped>
.card { border-radius: 14px; }
.card-header { font-weight: 700; }
.table td, .table th { vertical-align: middle; }
.text-wrap { white-space: normal; }

/* Limita texto a 2 líneas con ellipsis */
.clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Modal */
.modal { background: rgba(0,0,0,.4); }
.modal .modal-content { border-radius: 12px; }

/* Input group del buscador */
.buscador-grupo { max-width: 100%; }
@media (min-width: 576px) {
  .buscador-grupo { max-width: 520px; }
}

/* Spinner refrescar */
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
