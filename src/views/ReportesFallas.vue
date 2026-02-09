<!-- src/views/ReportesFallas.vue -->
<template>
  <div class="fallas-page">
    <div class="container py-4 py-lg-5">
      <!-- ===== Header / Hero ===== -->
      <div class="hero card border-0 shadow-sm overflow-hidden mb-4">
        <div class="hero-bg"></div>

        <div class="card-body position-relative p-4 p-lg-5">
          <div class="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3">
            <div class="minw-0">
              <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span class="badge hero-badge">
                  <i class="bi bi-exclamation-triangle me-1"></i> Fallas
                </span>

                <span v-if="form.contratoId" class="badge contract-badge">
                  <i class="bi bi-briefcase me-1"></i> {{ contratoNombre || "Contrato" }}
                </span>

                <span v-if="isVisualizador" class="badge mode-badge">
                  <i class="bi bi-eye me-1"></i> Modo visualizador
                </span>
              </div>

              <h1 class="h3 fw-black mb-1">Reportes de Fallas de Equipos</h1>
              <p class="text-muted mb-0">
                Registra fallas por contrato y controla su estatus (Reportado / En revisión / Resuelto).
              </p>

              <div class="stats mt-3">
                <div class="stat">
                  <div class="num">{{ fallas.length }}</div>
                  <div class="label">Totales</div>
                </div>
                <div class="stat">
                  <div class="num">{{ fallasFiltradas.length }}</div>
                  <div class="label">Mostrando</div>
                </div>
                <div class="stat" v-if="form.contratoId">
                  <div class="num"><i class="bi bi-briefcase"></i></div>
                  <div class="label">Contrato</div>
                </div>
              </div>
            </div>

            <div class="d-flex gap-2 flex-wrap justify-content-lg-end">
              <router-link to="/menu" class="btn btn-outline-secondary btn-pill">
                <i class="bi bi-arrow-left"></i>
                <span class="ms-1">Volver al menú</span>
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Content ===== -->
      <div class="row g-4">
        <!-- ===== Formulario ===== -->
        <div class="col-12 col-lg-5">
          <div class="card border-0 shadow-sm form-card">
            <div class="card-header form-header d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center gap-2">
                <span class="header-icon">
                  <i class="bi bi-bug"></i>
                </span>
                <strong>Nuevo reporte de falla</strong>
              </div>

              <span v-if="isVisualizador" class="badge text-bg-warning">
                <i class="bi bi-eye me-1"></i> Visualizador
              </span>
            </div>

            <div class="card-body p-4 position-relative">
              <!-- Overlay visualizador -->
              <div v-if="isVisualizador" class="readonly-overlay">
                <div class="readonly-card">
                  <i class="bi bi-lock-fill me-2"></i>
                  Solo lectura (visualizador)
                </div>
              </div>

              <!-- Contrato -->
              <div class="mb-3">
                <label class="form-label fw-semibold">Contrato</label>
                <select
                  class="form-select"
                  v-model="form.contratoId"
                  @change="onChangeContrato"
                  :disabled="cargando.contratos"
                >
                  <option value="" disabled>Seleccione contrato…</option>
                  <option v-for="c in contratosUsuario" :key="c.id" :value="c.id">
                    {{ c.nombre }}
                  </option>
                </select>
                <div v-if="cargando.contratos" class="form-text">Cargando contratos…</div>
              </div>

              <!-- Equipo -->
              <div class="mb-3">
                <label class="form-label fw-semibold">Equipo</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-truck-front"></i></span>
                  <select
                    class="form-select"
                    v-model="form.equipoId"
                    :disabled="isVisualizador || !form.contratoId || cargando.equipos"
                  >
                    <option value="" disabled>Seleccione equipo…</option>
                    <option v-for="e in equiposContrato" :key="e.id" :value="e.id">
                      {{ e.nombre_equipo }} <span v-if="e.patente">— {{ e.patente }}</span>
                    </option>
                  </select>
                </div>
                <div v-if="form.contratoId && cargando.equipos" class="form-text">Cargando equipos…</div>
                <div v-if="form.contratoId && !cargando.equipos && equiposContrato.length === 0" class="form-text text-muted">
                  No hay equipos asociados a este contrato.
                </div>
              </div>

              <!-- Fecha/Hora -->
              <div class="row">
                <div class="col-12 col-sm-6 mb-3">
                  <label class="form-label fw-semibold">Fecha</label>
                  <input type="date" class="form-control" v-model="form.fechaStr" :disabled="isVisualizador" />
                </div>
                <div class="col-12 col-sm-6 mb-3">
                  <label class="form-label fw-semibold">Hora</label>
                  <input type="time" class="form-control" v-model="form.horaStr" :disabled="isVisualizador" />
                </div>
              </div>

              <!-- Descripción -->
              <div class="mb-3">
                <label class="form-label fw-semibold">Descripción de la falla</label>
                <textarea
                  class="form-control"
                  rows="3"
                  v-model="form.descripcion"
                  :disabled="isVisualizador"
                  placeholder="Describe la falla…"
                ></textarea>
              </div>

              <div class="hint mb-3">
                <i class="bi bi-info-circle me-1"></i>
                El reporte queda como <strong>Reportado</strong> al crear. Admin puede cambiarlo a <strong>En revisión</strong> o <strong>Resuelto</strong>.
              </div>

              <div class="d-grid gap-2">
                <button
                  class="btn btn-danger btn-pill"
                  @click="guardar"
                  :disabled="isVisualizador || !puedeGuardar || guardando"
                >
                  <i class="bi bi-bug"></i>
                  <span class="ms-1">Guardar reporte</span>
                </button>
                <button class="btn btn-outline-secondary btn-pill" @click="limpiar" :disabled="isVisualizador || guardando">
                  <i class="bi bi-eraser me-1"></i> Limpiar
                </button>
              </div>

              <div v-if="errorMsg" class="alert alert-warning mt-3 mb-0">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMsg }}
              </div>
            </div>
          </div>
        </div>

        <!-- ===== Listado ===== -->
        <div class="col-12 col-lg-7">
          <div class="card border-0 shadow-sm">
            <div class="card-header list-header bg-white d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div class="d-flex flex-wrap align-items-center gap-2">
                <strong class="d-flex align-items-center gap-2">
                  <span class="header-icon soft">
                    <i class="bi bi-table"></i>
                  </span>
                  Fallas
                </strong>

                <span v-if="form.contratoId" class="badge text-bg-danger">
                  <i class="bi bi-briefcase me-1"></i> {{ contratoNombre }}
                </span>
              </div>

              <div class="input-group input-group-sm buscador-grupo flex-nowrap w-100 w-sm-auto">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input
                  type="text"
                  class="form-control"
                  placeholder="Buscar por equipo, estatus o descripción…"
                  v-model="busqueda"
                  :disabled="!form.contratoId"
                />
                <button class="btn btn-outline-secondary" type="button" @click="busqueda = ''" :disabled="!busqueda">
                  <i class="bi bi-x-lg"></i>
                </button>
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
              <div v-if="!form.contratoId" class="p-4 empty">
                <div class="empty-icon mb-2"><i class="bi bi-briefcase"></i></div>
                <div class="fw-bold mb-1">Selecciona un contrato</div>
                <div class="text-muted">Para ver reportes, elige un contrato en el formulario.</div>
              </div>

              <div v-else>
                <div v-if="cargando.fallas" class="p-4">
                  <div class="d-flex align-items-center gap-2 text-muted">
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Cargando fallas…
                  </div>
                </div>

                <div v-else-if="fallasFiltradas.length === 0" class="p-4 empty">
                  <div class="empty-icon mb-2"><i class="bi bi-inbox"></i></div>
                  <div class="fw-bold mb-1">Sin reportes</div>
                  <div class="text-muted">No hay reportes para este contrato (o tu búsqueda no encontró resultados).</div>
                </div>

                <div v-else class="table-responsive">
                  <table class="table table-sm table-hover align-middle mb-0 table-pro">
                    <thead class="table-light sticky-head">
                      <tr>
                        <th style="min-width: 150px;">Fecha/Hora</th>
                        <th>Equipo</th>
                        <th class="d-none d-md-table-cell">Descripción</th>
                        <th>Estatus</th>
                        <th class="d-none d-md-table-cell" style="min-width: 140px;">Usuario</th>
                        <th style="min-width: 170px;" class="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="f in fallasFiltradas" :key="f.id">
                        <td>
                          <div class="fw-semibold">{{ formatearFechaHora(f.fecha) }}</div>
                          <small class="text-muted">Creado: {{ formatearFechaHora(f.createdAt) }}</small>
                        </td>

                        <td>
                          <div class="fw-semibold text-wrap">{{ f.equipoNombre || '—' }}</div>
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
                          <span class="badge" :class="badgeClass(f.estatus)">
                            {{ f.estatus || 'Reportado' }}
                          </span>
                          <div class="small text-muted" v-if="f.updatedBy">por {{ f.updatedBy }}</div>
                        </td>

                        <td class="d-none d-md-table-cell">
                          <div class="small">{{ f.nombreUsuario || '—' }}</div>
                          <small class="text-muted">{{ f.emailUsuario || '' }}</small>
                        </td>

                        <!-- Acciones -->
                        <td class="text-end">
                          <!-- Desktop -->
                          <div class="btn-group btn-group-sm flex-wrap justify-content-end gap-1 d-none d-md-inline-flex">
                            <button
                              class="btn btn-outline-success"
                              :disabled="!isAdmin"
                              @click="abrirCambioEstatus(f)"
                              title="Cambiar estatus"
                            >
                              <i class="bi bi-arrow-repeat"></i>
                            </button>
                            <button
                              class="btn btn-outline-primary"
                              :disabled="isVisualizador || !canEditOrDelete(f)"
                              @click="abrirEditar(f)"
                              title="Editar"
                            >
                              <i class="bi bi-pencil"></i>
                            </button>
                            <button
                              class="btn btn-outline-danger"
                              :disabled="isVisualizador || !canEditOrDelete(f)"
                              @click="confirmarBorrar(f)"
                              title="Eliminar"
                            >
                              <i class="bi bi-trash"></i>
                            </button>
                          </div>

                          <!-- Móvil -->
                          <div class="dropdown d-inline d-md-none">
                            <button class="btn btn-outline-secondary btn-sm dropdown-toggle btn-pill" type="button" data-bs-toggle="dropdown">
                              Acciones
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                              <li>
                                <button class="dropdown-item" :disabled="!isAdmin" @click="abrirCambioEstatus(f)">
                                  <i class="bi bi-arrow-repeat me-2"></i> Cambiar estatus
                                </button>
                              </li>
                              <li>
                                <button
                                  class="dropdown-item"
                                  :disabled="isVisualizador || !canEditOrDelete(f)"
                                  @click="abrirEditar(f)"
                                >
                                  <i class="bi bi-pencil me-2"></i> Editar
                                </button>
                              </li>
                              <li>
                                <button
                                  class="dropdown-item text-danger"
                                  :disabled="isVisualizador || !canEditOrDelete(f)"
                                  @click="confirmarBorrar(f)"
                                >
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
              <i class="bi bi-info-circle me-1"></i>
              {{ fallas.length }} registro(s) totales • Mostrando {{ fallasFiltradas.length }}
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Toast ===== -->
      <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1080;">
        <div class="toast align-items-center text-bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true" ref="toastRef">
          <div class="d-flex">
            <div class="toast-body">{{ toastMsg }}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" @click="hideToast"></button>
          </div>
        </div>
      </div>

      <!-- ===== Modal Editar ===== -->
      <div class="modal fade show" v-if="modalEdit.visible" style="display:block;" @click.self="cerrarEditar">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content modal-pro">
            <div class="modal-header">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-pencil-square me-2"></i>Editar reporte de falla
              </h5>
              <button class="btn-close" @click="cerrarEditar"></button>
            </div>

            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label fw-semibold">Equipo</label>
                <select class="form-select" v-model="modalEdit.form.equipoId">
                  <option value="" disabled>Seleccione equipo…</option>
                  <option v-for="e in equiposContrato" :key="e.id" :value="e.id">
                    {{ e.nombre_equipo }} <span v-if="e.patente">— {{ e.patente }}</span>
                  </option>
                </select>
              </div>

              <div class="row">
                <div class="col-12 col-sm-6 mb-3">
                  <label class="form-label fw-semibold">Fecha</label>
                  <input type="date" class="form-control" v-model="modalEdit.form.fechaStr" />
                </div>
                <div class="col-12 col-sm-6 mb-3">
                  <label class="form-label fw-semibold">Hora</label>
                  <input type="time" class="form-control" v-model="modalEdit.form.horaStr" />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Descripción</label>
                <textarea class="form-control" rows="3" v-model="modalEdit.form.descripcion"></textarea>
              </div>

              <div v-if="modalEdit.error" class="alert alert-warning py-2 mb-0">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ modalEdit.error }}
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline-secondary btn-pill w-100 w-sm-auto" @click="cerrarEditar">Cancelar</button>
              <button class="btn btn-primary btn-pill w-100 w-sm-auto" :disabled="modalEdit.saving" @click="guardarEdicion">
                <i class="bi bi-save"></i> Guardar cambios
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Modal Borrar ===== -->
      <div class="modal fade show" v-if="modalDelete.visible" style="display:block;" @click.self="cerrarBorrar">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content modal-pro">
            <div class="modal-header">
              <h5 class="modal-title fw-bold text-danger">
                <i class="bi bi-trash3 me-2"></i>Eliminar reporte
              </h5>
              <button class="btn-close" @click="cerrarBorrar"></button>
            </div>

            <div class="modal-body">
              <p class="mb-2">¿Seguro que deseas eliminar este reporte?</p>
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

              <div v-if="modalDelete.error" class="alert alert-warning py-2 mt-2 mb-0">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ modalDelete.error }}
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline-secondary btn-pill w-100 w-sm-auto" @click="cerrarBorrar">Cancelar</button>
              <button class="btn btn-danger btn-pill w-100 w-sm-auto" :disabled="modalDelete.deleting" @click="borrarConfirmado">
                <i class="bi bi-trash"></i> Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Modal Cambiar Estatus ===== -->
      <div class="modal fade show" v-if="modalStatus.visible" style="display:block;" @click.self="cerrarCambioEstatus">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content modal-pro">
            <div class="modal-header">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-arrow-repeat me-2"></i>Cambiar estatus
              </h5>
              <button class="btn-close" @click="cerrarCambioEstatus"></button>
            </div>

            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label fw-semibold">Estatus actual</label>
                <input type="text" class="form-control" :value="modalStatus.item?.estatus || 'Reportado'" disabled />
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Nuevo estatus</label>
                <select class="form-select" v-model="modalStatus.nuevo">
                  <option value="Reportado">Reportado</option>
                  <option value="En revisión">En revisión</option>
                  <option value="Resuelto">Resuelto</option>
                </select>
                <div class="form-text">
                  Solo administradores pueden cambiar el estatus.
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Observación</label>
                <input type="text" class="form-control" v-model="modalStatus.observacion" placeholder="Motivo del cambio (opcional)" />
              </div>

              <div v-if="modalStatus.error" class="alert alert-warning py-2 mb-0">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ modalStatus.error }}
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline-secondary btn-pill w-100 w-sm-auto" @click="cerrarCambioEstatus">Cancelar</button>
              <button class="btn btn-success btn-pill w-100 w-sm-auto" :disabled="modalStatus.saving" @click="guardarCambioEstatus">
                <i class="bi bi-check2-circle"></i> Guardar estatus
              </button>
            </div>
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
 */

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

const rol = computed(() => (perfilUsuario.value?.rol || '').toLowerCase())
const isAdmin = computed(() => rol.value === 'admin')
const isVisualizador = computed(() =>
  rol.value === 'visualizador' || rol.value === 'viewer' || rol.value === 'visualizer'
)

async function cargarContratosAsignados(uid) {
  cargando.contratos = true
  try {
    const snapUser = await getDocFromServer(doc(db, 'usuarios', uid))
    if (!snapUser.exists()) { contratosUsuario.value = []; return }

    perfilUsuario.value = snapUser.data()
    const ids = (perfilUsuario.value.contratosAsignados || []).filter(Boolean)
    if (!ids.length) { contratosUsuario.value = []; return }

    const activos = []
    for (let i = 0; i < ids.length; i += 10) {
      const slice = ids.slice(i, i + 10)
      const qs = await getDocs(query(collection(db, 'contratos'), where('__name__', 'in', slice)))
      qs.docs.forEach(d => {
        const data = d.data() || {}
        const isActivo = data.activo !== false
        if (isActivo) activos.push({ id: d.id, nombre: data.nombre || d.id })
      })
    }

    contratosUsuario.value = activos.sort((a, b) =>
      String(a.nombre).localeCompare(String(b.nombre), 'es', { sensitivity: 'base' })
    )

    if (contratosUsuario.value.length === 1) {
      form.contratoId = contratosUsuario.value[0].id
      await onChangeContrato()
    } else {
      if (form.contratoId && !contratosUsuario.value.some(c => c.id === form.contratoId)) {
        form.contratoId = ''
        fallas.value = []
        equiposContrato.value = []
      }
    }
  } finally {
    cargando.contratos = false
  }
}

async function onChangeContrato() {
  if (unsubFallas.value) { unsubFallas.value(); unsubFallas.value = null }
  fallas.value = []
  equiposContrato.value = []
  form.equipoId = ''

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

async function refrescarFallas() {
  if (!form.contratoId) return
  try {
    refrescando.value = true
    if (unsubFallas.value) { unsubFallas.value(); unsubFallas.value = null }
    await escucharFallasContrato(form.contratoId)
    showToast('Lista actualizada')
  } finally {
    refrescando.value = false
  }
}

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
      equipoInterno: equipo?.interno || equipo?.codigo || '', // ajusta según tu esquema
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
      equipoInterno: equipo?.interno || equipo?.codigo || '',
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

const contratoSeleccionado = computed(() => contratosUsuario.value.find(c => c.id === form.contratoId) || null)
const contratoNombre = computed(() => contratoSeleccionado.value?.nombre || '')

const toastRef = ref(null)
function showToast(msg = 'Acción realizada correctamente.') {
  toastMsg.value = msg
  try {
    const Toast = window?.bootstrap?.Toast
    if (Toast && toastRef.value) new Toast(toastRef.value).show()
    else {
      toastRef.value?.classList?.add('show')
      setTimeout(() => hideToast(), 1800)
    }
  } catch {
    toastRef.value?.classList?.add('show')
    setTimeout(() => hideToast(), 1800)
  }
}
function hideToast() { toastRef.value?.classList?.remove('show') }

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
/* ===== Page background ===== */
.fallas-page{
  min-height: calc(100vh - 56px);
  background:
    radial-gradient(1200px 700px at 15% 10%, rgba(220, 53, 69, 0.12), transparent 60%),
    radial-gradient(900px 600px at 85% 20%, rgba(13, 110, 253, 0.10), transparent 60%),
    linear-gradient(180deg, #ffffff, #fbfbfc);
}

/* ===== Hero ===== */
.hero{ border-radius: 22px; position: relative; }
.hero-bg{
  position:absolute; inset:0;
  background: linear-gradient(90deg, rgba(220,53,69,.14), rgba(170,25,40,.08));
}
.fw-black{ font-weight: 900; }

.hero-badge{
  background: rgba(220,53,69,.16);
  color:#b21f2d;
  border:1px solid rgba(220,53,69,.22);
  border-radius:999px;
  padding:.45rem .65rem;
  font-weight: 900;
}
.contract-badge{
  background: rgba(13,110,253,.12);
  color:#0b5ed7;
  border:1px solid rgba(13,110,253,.20);
  border-radius:999px;
  padding:.45rem .65rem;
  font-weight: 900;
}
.mode-badge{
  background: rgba(255,193,7,.16);
  color:#9a6b00;
  border:1px solid rgba(255,193,7,.26);
  border-radius:999px;
  padding:.45rem .65rem;
  font-weight: 900;
}

/* Stats */
.stats{
  display:flex; gap:.75rem; flex-wrap:wrap;
}
.stat{
  background: rgba(255,255,255,.85);
  border: 1px solid rgba(0,0,0,.06);
  border-radius: 16px;
  padding: .55rem .8rem;
  min-width: 120px;
  box-shadow: 0 12px 28px rgba(0,0,0,.06);
}
.stat .num{ font-weight: 950; font-size: 1.05rem; }
.stat .label{ color:#6c757d; font-size:.8rem; font-weight: 800; }

/* Buttons */
.btn-pill{ border-radius: 999px; font-weight: 900; }

/* Cards */
.card{ border-radius: 18px; }
.form-card{ position: relative; }
.form-header{
  background: linear-gradient(90deg, rgba(220,53,69,1), rgba(170,25,40,1));
  color:#fff;
  border:0;
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
}
.list-header{
  border-bottom: 1px solid rgba(0,0,0,.06);
}

/* Header icons */
.header-icon{
  width: 36px; height: 36px;
  display:inline-flex; align-items:center; justify-content:center;
  border-radius: 12px;
  background: rgba(255,255,255,.18);
  color:#fff;
}
.header-icon.soft{
  background: rgba(220,53,69,.12);
  color:#dc3545;
}

/* Hint */
.hint{
  background: rgba(255,193,7,.10);
  border:1px solid rgba(255,193,7,.18);
  color:#7a5600;
  padding:.6rem .75rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: .9rem;
}

/* Visualizador overlay */
.readonly-overlay{
  position:absolute; inset:0;
  background: rgba(255,255,255,.55);
  backdrop-filter: blur(2px);
  z-index: 10;
  border-radius: 18px;
  display:flex;
  align-items:flex-start;
  justify-content:flex-end;
  padding: 14px;
  pointer-events:none;
}
.readonly-card{
  pointer-events:none;
  background: rgba(33,37,41,.92);
  color:#fff;
  border-radius: 999px;
  padding: .45rem .75rem;
  font-weight: 900;
  box-shadow: 0 12px 26px rgba(0,0,0,.18);
}

/* Search group sizing */
.buscador-grupo{ max-width: 100%; }
@media (min-width: 576px){
  .buscador-grupo{ max-width: 560px; }
}

/* Table */
.table-pro thead th{ font-weight: 900; }
.table-pro tbody tr:hover{ background: rgba(220,53,69,.04); }
.sticky-head{ position: sticky; top: 0; z-index: 2; }
.text-wrap{ white-space: normal; }

/* Clamp 2 lines */
.clamp-2{
  display:-webkit-box;
  -webkit-box-orient: vertical;
  overflow:hidden;
}

/* Empty */
.empty{ text-align:center; }
.empty-icon{
  width: 58px; height: 58px;
  border-radius: 18px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-size: 1.5rem;
  background: rgba(220,53,69,.10);
  color:#b21f2d;
  margin: 0 auto;
}

/* Modals */
.modal{ background: rgba(0,0,0,.45); }
.modal-pro{
  border-radius: 16px;
  border: 0;
  box-shadow: 0 20px 60px rgba(0,0,0,.22);
}

/* Spin refresh */
.spin{ animation: spin .9s linear infinite; }
@keyframes spin{
  from{ transform: rotate(0deg); }
  to{ transform: rotate(360deg); }
}
</style>
