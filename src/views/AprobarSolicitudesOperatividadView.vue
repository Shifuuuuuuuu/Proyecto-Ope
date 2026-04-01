<!-- src/views/AprobarSolicitudesOperatividadView.vue -->
<template>
  <div class="bg-white min-vh-100">
    <div class="container-fluid py-4 px-3">
      <!-- Overlay aplicando -->
      <transition name="fade">
        <div v-if="overlayAplicando" class="loading-overlay">
          <div class="loading-box text-center text-white">
            <div class="spinner-border text-light" role="status" aria-hidden="true"></div>
            <div class="mt-3 fw-bold">Aplicando cambios...</div>
            <div class="small text-white-50 mt-1">
              Esto puede tardar un poco si la solicitud tiene muchas celdas.
            </div>
            <div class="small text-white-50">
              Puedes esperar tranquilo mientras termina el proceso.
            </div>

            <div class="mt-3 w-100" v-if="progresoAplicacion.total > 0">
              <div class="small mb-1">
                {{ progresoAplicacion.actual }}/{{ progresoAplicacion.total }} cambios aplicados
              </div>
              <div class="progress" style="height: 10px;">
                <div
                  class="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  :style="{ width: progresoPct + '%' }"
                  :aria-valuenow="progresoPct"
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 class="mb-1">Aprobación de Solicitudes de Operatividad</h2>
          <p class="text-muted mb-0">
            Revisa solicitudes pendientes de edición histórica y aprueba o rechaza los cambios.
          </p>
        </div>

        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-outline-secondary" @click="$router.back()">
            <i class="bi bi-arrow-left-circle me-1"></i> Volver
          </button>

          <button class="btn btn-outline-primary" @click="cargarTodo" :disabled="loading || overlayAplicando">
            <i class="bi bi-arrow-clockwise me-1"></i> Actualizar
          </button>
        </div>
      </div>

      <div v-if="errorMsg" class="alert alert-danger border-0 shadow-sm mb-4">
        <div class="d-flex align-items-start gap-2">
          <i class="bi bi-exclamation-octagon-fill fs-5"></i>
          <div>
            <strong>Error</strong>
            <div class="small mt-1">{{ errorMsg }}</div>
          </div>
        </div>
      </div>

      <div v-if="okMsg" class="alert alert-success border-0 shadow-sm mb-4">
        <div class="d-flex align-items-start gap-2">
          <i class="bi bi-check-circle-fill fs-5"></i>
          <div>
            <strong>Operación realizada</strong>
            <div class="small mt-1">{{ okMsg }}</div>
          </div>
        </div>
      </div>

      <!-- filtros -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-3 align-items-start">
            <div class="col-12 col-lg-3">
              <label class="form-label fw-semibold">Estado</label>
              <select class="form-select" v-model="filtroEstado">
                <option value="pendiente">Pendientes</option>
                <option value="aprobada">Aprobadas</option>
                <option value="rechazada">Rechazadas</option>
                <option value="aplicada">Aplicadas</option>
                <option value="todos">Todas</option>
              </select>
            </div>

            <div class="col-12 col-lg-3">
              <label class="form-label fw-semibold">Contrato</label>
              <select class="form-select" v-model="filtroContratoId">
                <option value="">Todos los contratos</option>
                <option v-for="c in contratosActivos" :key="c.id" :value="c.id">
                  {{ c.nombre || `Contrato ${c.id}` }}
                </option>
              </select>
            </div>

            <div class="col-12 col-lg-3">
              <label class="form-label fw-semibold">Solicitante / Operador</label>
              <select class="form-select" v-model="filtroSolicitanteEmail">
                <option value="">Todos los usuarios</option>
                <option v-for="u in operadoresYAdmins" :key="u.uid" :value="(u.email || '').toLowerCase()">
                  {{ u.nombre_completo || 'Sin nombre' }}{{ u.email ? ` — ${u.email}` : '' }}
                </option>
              </select>
            </div>

            <div class="col-12 col-lg-3">
              <label class="form-label fw-semibold">Texto libre</label>
              <input
                v-model.trim="filtroTexto"
                type="text"
                class="form-control"
                placeholder="Buscar motivo, período..."
              />

              <label class="form-label fw-semibold mt-3">Búsqueda rápida</label>
              <input
                v-model.trim="filtroBusquedaGlobal"
                type="text"
                class="form-control"
                placeholder="Contrato, solicitante, correo..."
              />
            </div>
          </div>
        </div>
      </div>

      <!-- resumen -->
      <div class="row g-3 mb-4">
        <div class="col-12 col-md-6 col-xl-3">
          <div class="card border-0 shadow-sm h-100 stat-card">
            <div class="card-body">
              <div class="small text-muted">Solicitudes visibles</div>
              <div class="fw-bold fs-3">{{ solicitudesFiltradas.length }}</div>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-6 col-xl-3">
          <div class="card border-0 shadow-sm h-100 stat-card warning-soft">
            <div class="card-body">
              <div class="small text-muted">Pendientes</div>
              <div class="fw-bold fs-3 text-warning-emphasis">{{ resumen.pendientes }}</div>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-6 col-xl-3">
          <div class="card border-0 shadow-sm h-100 stat-card success-soft">
            <div class="card-body">
              <div class="small text-muted">Aplicadas</div>
              <div class="fw-bold fs-3 text-success">{{ resumen.aplicadas }}</div>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-6 col-xl-3">
          <div class="card border-0 shadow-sm h-100 stat-card danger-soft">
            <div class="card-body">
              <div class="small text-muted">Rechazadas</div>
              <div class="fw-bold fs-3 text-danger">{{ resumen.rechazadas }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <div class="mt-2 text-muted">Cargando solicitudes...</div>
      </div>

      <div v-else>
        <div v-if="solicitudesFiltradas.length === 0" class="alert alert-light border shadow-sm">
          No se encontraron solicitudes con los filtros actuales.
        </div>

        <div v-else class="row g-4">
          <div class="col-12" v-for="sol in solicitudesFiltradas" :key="sol.id">
            <div class="card border shadow-sm solicitud-card">
              <div class="card-body">
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                  <div class="min-w-0">
                    <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                      <h5 class="mb-0 text-truncate">{{ sol.contratoNombre || contratoNombrePorId(sol.contratoId) || 'Sin contrato' }}</h5>
                      <span class="badge" :class="badgeEstadoClase(sol.estado)">
                        {{ sol.estado }}
                      </span>
                    </div>

                    <div class="small text-muted">
                      <div><strong>Período:</strong> {{ sol.periodoLabel || '—' }}</div>
                      <div><strong>Solicitante:</strong> {{ sol.solicitadoPorNombre || '—' }}</div>
                      <div><strong>Correo:</strong> {{ sol.solicitadoPorEmail || '—' }}</div>
                      <div><strong>Creada:</strong> {{ formatearFechaHora(sol.createdAt) }}</div>
                    </div>
                  </div>

                  <div class="text-end">
                    <div class="small text-muted mb-1">Cambios</div>
                    <div class="fw-bold fs-4">{{ Array.isArray(sol.cambios) ? sol.cambios.length : 0 }}</div>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold mb-1">Motivo</label>
                  <div class="border rounded p-3 bg-light small">
                    {{ sol.motivo || 'Sin motivo.' }}
                  </div>
                </div>

                <div class="mb-3">
                  <button
                    class="btn btn-sm btn-outline-dark"
                    @click="toggleDetalle(sol.id)"
                  >
                    <i class="bi" :class="detalleAbiertoId === sol.id ? 'bi-eye-slash' : 'bi-eye'"></i>
                    {{ detalleAbiertoId === sol.id ? 'Ocultar detalle' : 'Ver detalle' }}
                  </button>
                </div>

                <div v-if="detalleAbiertoId === sol.id" class="mb-3">
                  <div class="table-responsive border rounded detalle-scroll">
                    <table class="table table-sm table-hover align-middle mb-0">
                      <thead class="table-light sticky-head">
                        <tr>
                          <th>Equipo</th>
                          <th>Patente</th>
                          <th>Categoría</th>
                          <th>Día</th>
                          <th>Jornada</th>
                          <th class="text-center">Anterior</th>
                          <th class="text-center">Nuevo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(cambio, idx) in (sol.cambios || [])" :key="sol.id + '-' + idx">
                          <td>{{ cambio.equipoNombre || cambio.equipoId || '—' }}</td>
                          <td>{{ cambio.patente || '—' }}</td>
                          <td>{{ cambio.categoria || '—' }}</td>
                          <td>{{ cambio.dia || '—' }}</td>
                          <td>{{ cambio.jornada || '—' }}</td>
                          <td class="text-center">
                            <span class="badge text-bg-light border">{{ cambio.anterior || '—' }}</span>
                          </td>
                          <td class="text-center">
                            <span class="badge text-bg-primary">{{ cambio.nuevo || '—' }}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div v-if="sol.estado === 'rechazada' && sol.comentarioRevision" class="alert alert-danger mt-3 mb-0">
                    <strong>Motivo del rechazo:</strong> {{ sol.comentarioRevision }}
                  </div>

                  <div v-if="(sol.estado === 'aprobada' || sol.estado === 'aplicada') && sol.comentarioRevision" class="alert alert-success mt-3 mb-0">
                    <strong>Comentario de aprobación:</strong> {{ sol.comentarioRevision }}
                  </div>
                </div>

                <div class="d-flex flex-wrap gap-2 justify-content-end" v-if="sol.estado === 'pendiente'">
                  <button
                    class="btn btn-outline-danger"
                    @click="abrirModalRechazo(sol)"
                    :disabled="accionandoId === sol.id || overlayAplicando"
                  >
                    <i class="bi bi-x-circle me-1"></i> Rechazar
                  </button>

                  <button
                    class="btn btn-success"
                    @click="abrirModalAprobacion(sol)"
                    :disabled="accionandoId === sol.id || overlayAplicando"
                  >
                    <i class="bi bi-check-circle me-1"></i> Aprobar y aplicar
                  </button>
                </div>

                <div v-else class="small text-muted">
                  Solicitud finalizada.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal aprobación -->
      <div
        class="modal fade show"
        tabindex="-1"
        style="display:block;"
        v-if="modalAprobacionVisible"
        @click.self="cerrarModalAprobacion"
      >
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Aprobar y aplicar cambios</h5>
              <button type="button" class="btn-close" @click="cerrarModalAprobacion"></button>
            </div>

            <div class="modal-body">
              <div class="alert alert-warning">
                Esta acción aplicará los cambios en <strong>operatividad</strong> y registrará trazabilidad en
                <strong>historial_operatividad</strong>.
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Comentario de aprobación</label>
                <textarea
                  class="form-control"
                  rows="3"
                  v-model.trim="comentarioRevision"
                  placeholder="Comentario opcional para dejar trazabilidad"
                ></textarea>
              </div>

              <div class="small text-muted">
                Solicitud:
                <strong>{{ solicitudActiva?.contratoNombre || contratoNombrePorId(solicitudActiva?.contratoId) || '—' }}</strong> —
                {{ solicitudActiva?.periodoLabel || '—' }}
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline-secondary" @click="cerrarModalAprobacion">Cancelar</button>
              <button class="btn btn-success" @click="aprobarSolicitud" :disabled="accionandoId === solicitudActiva?.id || overlayAplicando">
                <span v-if="accionandoId !== solicitudActiva?.id">Confirmar aprobación</span>
                <span v-else class="d-inline-flex align-items-center gap-2">
                  <span class="spinner-border spinner-border-sm"></span> Preparando...
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal rechazo -->
      <div
        class="modal fade show"
        tabindex="-1"
        style="display:block;"
        v-if="modalRechazoVisible"
        @click.self="cerrarModalRechazo"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Rechazar solicitud</h5>
              <button type="button" class="btn-close" @click="cerrarModalRechazo"></button>
            </div>

            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label fw-semibold">Motivo del rechazo</label>
                <textarea
                  class="form-control"
                  rows="4"
                  v-model.trim="comentarioRevision"
                  placeholder="Explica por qué se rechaza la solicitud"
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline-secondary" @click="cerrarModalRechazo">Cancelar</button>
              <button class="btn btn-danger" @click="rechazarSolicitud" :disabled="!comentarioRevision.trim() || accionandoId === solicitudActiva?.id || overlayAplicando">
                <span v-if="accionandoId !== solicitudActiva?.id">Confirmar rechazo</span>
                <span v-else class="d-inline-flex align-items-center gap-2">
                  <span class="spinner-border spinner-border-sm"></span> Rechazando...
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineOptions } from 'vue'
import { db } from '../firebase/config'
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  setDoc
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

defineOptions({ name: 'AprobarSolicitudesOperatividadView' })

const auth = getAuth()

const loading = ref(true)
const errorMsg = ref('')
const okMsg = ref('')

const solicitudes = ref([])
const contratos = ref([])
const usuarios = ref([])
const detalleAbiertoId = ref(null)

const filtroEstado = ref('pendiente')
const filtroContratoId = ref('')
const filtroSolicitanteEmail = ref('')
const filtroTexto = ref('')
const filtroBusquedaGlobal = ref('')

const modalAprobacionVisible = ref(false)
const modalRechazoVisible = ref(false)
const solicitudActiva = ref(null)
const comentarioRevision = ref('')
const accionandoId = ref(null)

const overlayAplicando = ref(false)
const progresoAplicacion = ref({ actual: 0, total: 0 })

const progresoPct = computed(() => {
  const { actual, total } = progresoAplicacion.value
  if (!total) return 0
  return Math.min(100, Math.round((actual / total) * 100))
})

function normalizaTexto(txt = '') {
  return String(txt)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

function letraToNombre(l) {
  return ({ D: 'DISPONIBLE', F: 'FUERA DE SERVICIO', M: 'MANTENCIÓN' }[l] || '')
}

function formatearFechaHora(ts) {
  if (!ts) return '—'
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`
}

function badgeEstadoClase(estado) {
  if (estado === 'pendiente') return 'text-bg-warning'
  if (estado === 'rechazada') return 'text-bg-danger'
  if (estado === 'aprobada') return 'text-bg-success'
  if (estado === 'aplicada') return 'text-bg-success'
  return 'text-bg-secondary'
}

function contratoNombrePorId(id) {
  return contratos.value.find(c => String(c.id) === String(id))?.nombre || ''
}

async function cargarContratos() {
  try {
    const snap = await getDocs(collection(db, 'contratos'))
    contratos.value = snap.docs
      .map(d => ({
        id: d.id,
        ...d.data(),
        activo: d.data()?.activo !== false
      }))
      .filter(c => c.activo !== false)
      .sort((a, b) =>
        String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' })
      )
  } catch (e) {
    console.error('Error cargando contratos:', e)
    contratos.value = []
  }
}

async function cargarUsuarios() {
  try {
    const snap = await getDocs(collection(db, 'usuarios'))
    usuarios.value = snap.docs
      .map(d => ({
        uid: d.id,
        ...d.data()
      }))
      .filter(u => ['operador', 'admin'].includes(String(u.rol || '').toLowerCase()))
      .sort((a, b) =>
        String(a.nombre_completo || '').localeCompare(String(b.nombre_completo || ''), 'es', { sensitivity: 'base' })
      )
  } catch (e) {
    console.error('Error cargando usuarios:', e)
    usuarios.value = []
  }
}

async function cargarSolicitudes() {
  try {
    let snap
    try {
      const qy = query(
        collection(db, 'solicitudes_edicion_operatividad'),
        orderBy('createdAt', 'desc')
      )
      snap = await getDocs(qy)
    } catch {
      snap = await getDocs(collection(db, 'solicitudes_edicion_operatividad'))
    }

    solicitudes.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
        const dbb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
        return dbb - da
      })
  } catch (e) {
    console.error('Error cargando solicitudes:', e)
    throw e
  }
}

async function cargarTodo() {
  loading.value = true
  errorMsg.value = ''
  okMsg.value = ''

  try {
    await Promise.all([
      cargarSolicitudes(),
      cargarContratos(),
      cargarUsuarios()
    ])
  } catch (e) {
    errorMsg.value = 'No se pudieron cargar las solicitudes.'
  } finally {
    loading.value = false
  }
}

const contratosActivos = computed(() => contratos.value)

const operadoresYAdmins = computed(() => usuarios.value)

const solicitudesFiltradas = computed(() => {
  let rows = [...solicitudes.value]

  if (filtroEstado.value !== 'todos') {
    rows = rows.filter(r => String(r.estado || '') === filtroEstado.value)
  }

  if (filtroContratoId.value) {
    rows = rows.filter(r => String(r.contratoId || '') === String(filtroContratoId.value))
  }

  if (filtroSolicitanteEmail.value) {
    rows = rows.filter(r => String(r.solicitadoPorEmail || '').toLowerCase() === String(filtroSolicitanteEmail.value).toLowerCase())
  }

  const qTexto = normalizaTexto(filtroTexto.value)
  if (qTexto) {
    rows = rows.filter(r =>
      normalizaTexto(`${r.motivo || ''} ${r.periodoLabel || ''}`).includes(qTexto)
    )
  }

  const qGlobal = normalizaTexto(filtroBusquedaGlobal.value)
  if (qGlobal) {
    rows = rows.filter(r => {
      const contratoNombre = r.contratoNombre || contratoNombrePorId(r.contratoId) || ''
      return normalizaTexto(`
        ${contratoNombre}
        ${r.contratoId || ''}
        ${r.solicitadoPorNombre || ''}
        ${r.solicitadoPorEmail || ''}
        ${r.periodoLabel || ''}
        ${r.motivo || ''}
      `).includes(qGlobal)
    })
  }

  return rows
})

const resumen = computed(() => ({
  pendientes: solicitudes.value.filter(x => x.estado === 'pendiente').length,
  aplicadas: solicitudes.value.filter(x => x.estado === 'aplicada' || x.estado === 'aprobada').length,
  rechazadas: solicitudes.value.filter(x => x.estado === 'rechazada').length
}))

function toggleDetalle(id) {
  detalleAbiertoId.value = detalleAbiertoId.value === id ? null : id
}

function abrirModalAprobacion(sol) {
  solicitudActiva.value = sol
  comentarioRevision.value = ''
  modalAprobacionVisible.value = true
}

function cerrarModalAprobacion() {
  modalAprobacionVisible.value = false
  solicitudActiva.value = null
  comentarioRevision.value = ''
}

function abrirModalRechazo(sol) {
  solicitudActiva.value = sol
  comentarioRevision.value = ''
  modalRechazoVisible.value = true
}

function cerrarModalRechazo() {
  modalRechazoVisible.value = false
  solicitudActiva.value = null
  comentarioRevision.value = ''
}

function parseDiaLabel(diaLabel, mes, anio) {
  const dd = parseInt(String(diaLabel || '').slice(0, 2), 10)
  return new Date(anio, mes - 1, dd, 0, 0, 0, 0)
}

async function aprobarSolicitud() {
  if (!solicitudActiva.value) return

  const sol = solicitudActiva.value
  accionandoId.value = sol.id
  errorMsg.value = ''
  okMsg.value = ''
  overlayAplicando.value = true

  try {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('No hay usuario autenticado.')

    const userSnap = await getDoc(doc(db, 'usuarios', currentUser.uid))
    const userData = userSnap.exists() ? (userSnap.data() || {}) : {}
    const aprobadorNombre = userData.nombre_completo || ''
    const aprobadorEmail = currentUser.email || ''

    const cambios = Array.isArray(sol.cambios) ? sol.cambios : []
    progresoAplicacion.value = { actual: 0, total: cambios.length }

    for (let i = 0; i < cambios.length; i++) {
      const cambio = cambios[i]

      const fecha = parseDiaLabel(cambio.dia, sol.mes, sol.anio)
      const equipoId = String(cambio.equipoId || '')
      const jornada = String(cambio.jornada || '')
      const nuevo = String(cambio.nuevo || '')
      const estadoTexto = letraToNombre(nuevo)
      const contratoId = String(sol.contratoId || '')

      if (!equipoId || !jornada || !estadoTexto) {
        progresoAplicacion.value.actual = i + 1
        continue
      }

      const diaLabel = cambio.dia || ''
      const docIdOper = `${equipoId}_${jornada}_${diaLabel}`

      await setDoc(doc(db, 'operatividad', docIdOper), {
        equipoId,
        contratoId,
        estado: estadoTexto,
        fecha,
        jornada,
        nombre_completo: cambio.solicitadoPorNombre || sol.solicitadoPorNombre || '',
        observaciones: cambio.observacionNueva || sol.motivo || '',
        registradoPor: sol.solicitadoPorEmail || '',
        timestamp: new Date()
      })

      const historialId = `${docIdOper}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      await setDoc(doc(db, 'historial_operatividad', historialId), {
        equipoId,
        contratoId,
        estado: estadoTexto,
        fecha,
        jornada,
        nombre_completo: cambio.solicitadoPorNombre || sol.solicitadoPorNombre || '',
        observaciones: cambio.observacionNueva || sol.motivo || '',
        registradoPor: sol.solicitadoPorEmail || '',
        accion: 'aprobacion_solicitud_edicion',
        timestamp: new Date(),

        solicitudId: sol.id,
        aprobadoPorUid: currentUser.uid,
        aprobadoPorNombre: aprobadorNombre,
        aprobadoPorEmail: aprobadorEmail,
        valorAnterior: cambio.anterior || '',
        valorNuevo: cambio.nuevo || '',
        comentarioRevision: comentarioRevision.value.trim() || ''
      })

      progresoAplicacion.value.actual = i + 1
    }

    await updateDoc(doc(db, 'solicitudes_edicion_operatividad', sol.id), {
      estado: 'aplicada',
      updatedAt: new Date(),
      comentarioRevision: comentarioRevision.value.trim() || '',
      aprobadoPorUid: currentUser.uid,
      aprobadoPorNombre: aprobadorNombre,
      aprobadoPorEmail: aprobadorEmail,
      aprobadoAt: new Date()
    })

    okMsg.value = 'La solicitud fue aprobada y los cambios se aplicaron correctamente.'
    cerrarModalAprobacion()
    await cargarTodo()
  } catch (e) {
    console.error('Error aprobando solicitud:', e)
    errorMsg.value = 'No se pudo aprobar y aplicar la solicitud.'
  } finally {
    accionandoId.value = null
    overlayAplicando.value = false
    progresoAplicacion.value = { actual: 0, total: 0 }
  }
}

async function rechazarSolicitud() {
  if (!solicitudActiva.value) return
  if (!comentarioRevision.value.trim()) return

  const sol = solicitudActiva.value
  accionandoId.value = sol.id
  errorMsg.value = ''
  okMsg.value = ''

  try {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('No hay usuario autenticado.')

    const userSnap = await getDoc(doc(db, 'usuarios', currentUser.uid))
    const userData = userSnap.exists() ? (userSnap.data() || {}) : {}

    await updateDoc(doc(db, 'solicitudes_edicion_operatividad', sol.id), {
      estado: 'rechazada',
      updatedAt: new Date(),
      comentarioRevision: comentarioRevision.value.trim(),
      revisadoPorUid: currentUser.uid,
      revisadoPorNombre: userData.nombre_completo || '',
      revisadoPorEmail: currentUser.email || '',
      revisadoAt: new Date()
    })

    okMsg.value = 'La solicitud fue rechazada.'
    cerrarModalRechazo()
    await cargarTodo()
  } catch (e) {
    console.error('Error rechazando solicitud:', e)
    errorMsg.value = 'No se pudo rechazar la solicitud.'
  } finally {
    accionandoId.value = null
  }
}

onMounted(() => {
  onAuthStateChanged(auth, async () => {
    await cargarTodo()
  })
})
</script>

<style scoped>
.card {
  border-radius: 16px;
}

.stat-card {
  border-radius: 16px;
}

.warning-soft {
  background: linear-gradient(180deg, #fff, #fffaf0);
}

.success-soft {
  background: linear-gradient(180deg, #fff, #f3fff7);
}

.danger-soft {
  background: linear-gradient(180deg, #fff, #fff5f5);
}

.solicitud-card {
  transition: transform .15s ease, box-shadow .15s ease;
}
.solicitud-card:hover {
  transform: translateY(-1px);
}

.selector-scroll {
  background: #fff;
  max-height: 220px;
  overflow: hidden;
}

.selector-scroll__inner {
  height: 220px;
  overflow-y: auto;
}

.detalle-scroll {
  max-height: 320px;
  overflow: auto;
}

.sticky-head th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8f9fa;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  display: grid;
  place-items: center;
  z-index: 3000;
  backdrop-filter: blur(1px);
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}

.loading-box {
  background: rgba(0,0,0,.35);
  padding: 24px 28px;
  border-radius: 16px;
  box-shadow: 0 6px 24px rgba(0,0,0,.28);
  min-width: 320px;
  max-width: 92vw;
}

.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
</style>