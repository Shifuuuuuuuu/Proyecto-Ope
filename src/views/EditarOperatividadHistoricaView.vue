<!-- src/views/EditarOperatividadHistoricaView.vue -->
<template>
  <div class="bg-white min-vh-100">
    <div class="container-fluid py-4 px-3">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 class="mb-1">Solicitud de Edición de Operatividad Histórica</h2>
          <p class="text-muted mb-0">
            Edita meses anteriores y envía una solicitud para aprobación antes de aplicar los cambios.
          </p>
        </div>

        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-outline-secondary" @click="$router.back()">
            <i class="bi bi-arrow-left-circle me-1"></i> Volver
          </button>

          <button class="btn btn-outline-primary" @click="resetVista" :disabled="loading">
            <i class="bi bi-arrow-clockwise me-1"></i> Reiniciar
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
            <strong>Solicitud enviada</strong>
            <div class="small mt-1">{{ okMsg }}</div>
          </div>
        </div>
      </div>

      <!-- Panel selección -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-12 col-lg-4">
              <label class="form-label fw-semibold">Contrato</label>
              <select
                class="form-select"
                v-model="contratoSeleccionadoId"
                :disabled="solicitudEnviada || loading"
              >
                <option value="">Selecciona contrato</option>
                <option
                  v-for="c in contratosUsuarioValidos"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.nombre }}
                </option>
              </select>
            </div>

            <div class="col-12 col-lg-3">
              <label class="form-label fw-semibold">Mes a editar</label>
              <input
                type="month"
                class="form-control"
                v-model="mesSeleccionado"
                :max="maxMesEditable"
                :disabled="solicitudEnviada || loading"
              />
            </div>

            <div class="col-12 col-lg-5 d-flex gap-2 flex-wrap">
              <button
                class="btn btn-dark"
                @click="cargarPeriodoHistorico"
                :disabled="!puedeCargarPeriodo || loading || solicitudEnviada"
              >
                <i class="bi bi-search me-1"></i> Cargar mes
              </button>

              <button
                class="btn btn-outline-secondary"
                @click="limpiarCambios"
                :disabled="loadingGrid || cambiosPendientes.length === 0 || solicitudEnviada"
              >
                Limpiar cambios
              </button>
            </div>
          </div>

          <div v-if="contratoSeleccionado" class="mt-3 small text-muted">
            Contrato seleccionado:
            <strong>{{ contratoSeleccionado.nombre }}</strong>
          </div>
        </div>
      </div>

      <!-- Motivo -->
      <div v-if="periodoCargado" class="card border-0 shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-12 col-lg-8">
              <label class="form-label fw-semibold">Motivo de la solicitud</label>
              <textarea
                class="form-control"
                rows="3"
                v-model.trim="motivoSolicitud"
                :disabled="solicitudEnviada"
                placeholder="Ejemplo: corrección de disponibilidad por registro omitido, ajuste por error de digitación, etc."
              ></textarea>
            </div>

            <div class="col-12 col-lg-4">
              <label class="form-label fw-semibold">Resumen</label>
              <div class="border rounded p-3 bg-light h-100">
                <div class="small mb-1"><strong>Período:</strong> {{ etiquetaPeriodo }}</div>
                <div class="small mb-1"><strong>Equipos:</strong> {{ totalEquiposPeriodo }}</div>
                <div class="small mb-1"><strong>Cambios:</strong> {{ cambiosPendientes.length }}</div>
                <div class="small mb-0"><strong>Estado:</strong> {{ solicitudEnviada ? 'Solicitud enviada' : 'Edición local' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading grid -->
      <div v-if="loadingGrid" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <div class="mt-2 text-muted">Cargando operatividad histórica...</div>
      </div>

      <!-- Tabla -->
      <div v-if="periodoCargado && !loadingGrid" class="row g-4">
        <div class="col-12">
          <div class="card border">
            <div class="card-body">
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div>
                  <h5 class="mb-1">Edición histórica</h5>
                  <div class="small text-muted">
                    Modifica las celdas necesarias y luego envía la solicitud.
                  </div>
                </div>

                <div class="d-flex gap-2 flex-wrap align-items-center">
                  <div class="form-check form-switch me-1 mb-0">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      v-model="selectionMode"
                      :disabled="solicitudEnviada"
                      id="swSelHistorico"
                    />
                    <label class="form-check-label" for="swSelHistorico">
                      Selección múltiple
                    </label>
                  </div>

                  <button
                    class="btn btn-outline-dark"
                    @click="zoomTabla = !zoomTabla"
                    :disabled="solicitudEnviada"
                  >
                    <i :class="zoomTabla ? 'bi bi-zoom-in' : 'bi bi-zoom-out'"></i>
                  </button>

                  <button
                    class="btn btn-primary"
                    @click="abrirModalSolicitud"
                    :disabled="cambiosPendientes.length === 0 || solicitudEnviada"
                  >
                    <i class="bi bi-send me-1"></i>
                    Enviar solicitud
                  </button>
                </div>
              </div>

              <!-- Barra selección múltiple -->
              <div
                v-if="selectionMode && selectedCellsCount > 0 && !solicitudEnviada"
                class="alert alert-dark d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3 py-2 px-3"
              >
                <div class="d-flex align-items-center gap-3">
                  <strong class="me-1">Seleccionadas:</strong>
                  <span class="badge text-bg-secondary">{{ selectedCellsCount }}</span>
                  <span class="text-muted small">Puedes arrastrar para seguir marcando.</span>
                </div>

                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <div class="btn-group" role="group" aria-label="Asignar estado rápido">
                    <button class="btn btn-sm btn-outline-success" @click="applySelectionValue('D')">Marcar D</button>
                    <button class="btn btn-sm btn-outline-danger" @click="applySelectionValue('F')">Marcar F</button>
                    <button class="btn btn-sm btn-outline-warning" @click="applySelectionValue('M')">Marcar M</button>
                  </div>

                  <button class="btn btn-sm btn-outline-secondary" @click="clearSelection">
                    Limpiar selección
                  </button>
                </div>
              </div>

              <div v-for="(grupo, categoria) in equiposPorCategoria" :key="categoria" class="card mb-4 border">
                <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                  <span class="text-truncate">{{ categoria }}</span>
                  <small class="text-white-50">Equipos: {{ grupo.length }}</small>
                </div>

                <div class="card-body p-0">
                  <div class="scroll-horizontal">
                    <table
                      class="table table-bordered table-sm text-center align-middle mb-0"
                      :class="{ 'tabla-zoom-out': zoomTabla }"
                    >
                      <thead class="table-light">
                        <tr>
                          <th rowspan="2" class="sticky-col col-interno">Nº INTERNO</th>
                          <th rowspan="2" class="sticky-col-2 col-ppu">PPU</th>
                          <th v-for="dia in diasVisibles" :key="dia" colspan="2">
                            {{ dia }}
                          </th>
                        </tr>
                        <tr>
                          <template v-for="dia in diasVisibles" :key="'sub-' + dia">
                            <th class="th-turno">A</th>
                            <th class="th-turno">B</th>
                          </template>
                        </tr>
                      </thead>

                      <tbody>
                        <tr v-for="(equipo, rowIndex) in grupo" :key="equipo.id">
                          <td class="sticky-col col-interno text-truncate" :title="equipo.nombre_equipo">
                            {{ equipo.nombre_equipo }}
                          </td>
                          <td class="sticky-col-2 col-ppu text-truncate" :title="equipo.patente">
                            {{ equipo.patente }}
                          </td>

                          <template v-for="(dia, diaIndex) in diasVisibles" :key="equipo.id + '-' + dia">
                            <!-- A -->
                            <td
                              class="position-relative p-1"
                              :class="{ 'cell-selected': isSelected(equipo.id, 'A', dia) }"
                              :data-eid="equipo.id"
                              data-turno="A"
                              :data-dia="dia"
                              @mousedown="handleCellMouseDown($event, equipo.id, 'A', dia)"
                              @mouseenter="onCellMouseEnter(equipo.id, 'A', dia)"
                              @click="onCellClickHistorico(equipo.id, 'A', dia, categoria, rowIndex, diaIndex)"
                            >
                              <span class="cell-letter-visible">
                                {{ getValorCelda(buildCellKey(equipo.id, 'A', dia)) }}
                              </span>
                              <input
                                type="text"
                                class="form-control form-control-sm text-center cell-input"
                                :class="[
                                  colorCelda(getValorCelda(buildCellKey(equipo.id, 'A', dia))),
                                  { 'cell-dirty': esCambioPendiente(buildCellKey(equipo.id, 'A', dia)) }
                                ]"
                                :value="getValorCelda(buildCellKey(equipo.id, 'A', dia))"
                                maxlength="1"
                                placeholder="D/F/M"
                                :readonly="solicitudEnviada"
                                @input="onCellInputHistorico($event, equipo, dia, 'A')"
                                @keydown="onCellKeydown($event, categoria, rowIndex, diaIndex, 'A', grupo.length, diasVisibles.length)"
                                :ref="el => setCellRef(categoria, rowIndex, diaIndex, 'A', el)"
                              />
                            </td>

                            <!-- B -->
                            <td
                              class="position-relative p-1"
                              :class="{ 'cell-selected': isSelected(equipo.id, 'B', dia) }"
                              :data-eid="equipo.id"
                              data-turno="B"
                              :data-dia="dia"
                              @mousedown="handleCellMouseDown($event, equipo.id, 'B', dia)"
                              @mouseenter="onCellMouseEnter(equipo.id, 'B', dia)"
                              @click="onCellClickHistorico(equipo.id, 'B', dia, categoria, rowIndex, diaIndex)"
                            >
                              <span class="cell-letter-visible">
                                {{ getValorCelda(buildCellKey(equipo.id, 'B', dia)) }}
                              </span>
                              <input
                                type="text"
                                class="form-control form-control-sm text-center cell-input"
                                :class="[
                                  colorCelda(getValorCelda(buildCellKey(equipo.id, 'B', dia))),
                                  { 'cell-dirty': esCambioPendiente(buildCellKey(equipo.id, 'B', dia)) }
                                ]"
                                :value="getValorCelda(buildCellKey(equipo.id, 'B', dia))"
                                maxlength="1"
                                placeholder="D/F/M"
                                :readonly="solicitudEnviada"
                                @input="onCellInputHistorico($event, equipo, dia, 'B')"
                                @keydown="onCellKeydown($event, categoria, rowIndex, diaIndex, 'B', grupo.length, diasVisibles.length)"
                                :ref="el => setCellRef(categoria, rowIndex, diaIndex, 'B', el)"
                              />
                            </td>
                          </template>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div class="alert alert-info mb-0" v-if="!solicitudEnviada">
                Los cambios aún no están aplicados. Primero debes enviar la solicitud y esperar aprobación.
              </div>

              <div class="alert alert-success mb-0" v-else>
                Ya enviaste esta solicitud. Para editar otro mes, primero reinicia o vuelve a entrar.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal solicitud -->
      <div
        class="modal fade show"
        tabindex="-1"
        style="display:block;"
        v-if="modalSolicitudVisible"
        @click.self="cerrarModalSolicitud"
      >
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Confirmar envío de solicitud</h5>
              <button type="button" class="btn-close" @click="cerrarModalSolicitud"></button>
            </div>

            <div class="modal-body">
              <div class="alert alert-warning">
                Esta acción <strong>no aplicará aún</strong> los cambios en operatividad.
                Solo enviará una solicitud para revisión.
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Motivo</label>
                <textarea class="form-control" rows="3" v-model.trim="motivoSolicitud"></textarea>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Resumen de cambios</label>
                <div v-if="cambiosPendientes.length === 0" class="text-muted small">
                  No hay cambios para enviar.
                </div>

                <ul v-else class="list-group">
                  <li v-for="c in cambiosPendientes" :key="c.cellKey" class="list-group-item">
                    <div class="d-flex justify-content-between gap-3 flex-wrap">
                      <div>
                        <div class="fw-semibold">
                          {{ c.equipoNombre || c.equipoId }} {{ c.patente ? `— ${c.patente}` : '' }}
                        </div>
                        <div class="small text-muted">
                          Día {{ c.dia }} · Jornada {{ c.jornada }}
                        </div>
                      </div>

                      <div class="text-end">
                        <div class="small">
                          <strong>{{ c.anterior || '—' }}</strong>
                          →
                          <strong>{{ c.nuevo || '—' }}</strong>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline-secondary" @click="cerrarModalSolicitud">Cancelar</button>
              <button
                class="btn btn-primary"
                @click="enviarSolicitudEdicion"
                :disabled="enviandoSolicitud || cambiosPendientes.length === 0 || !motivoSolicitud.trim()"
              >
                <span v-if="!enviandoSolicitud">Enviar solicitud</span>
                <span v-else class="d-inline-flex align-items-center gap-2">
                  <span class="spinner-border spinner-border-sm"></span> Enviando...
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
import { ref, computed, onMounted, onUnmounted, defineOptions } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '../firebase/config'
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  doc,
  getDoc
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

defineOptions({ name: 'EditarOperatividadHistoricaView' })

const route = useRoute()
const auth = getAuth()

const loading = ref(true)
const loadingGrid = ref(false)
const enviandoSolicitud = ref(false)
const errorMsg = ref('')
const okMsg = ref('')

const rolUsuario = ref('')
const contratosUsuario = ref([])
const contratoSeleccionadoId = ref(route.query.contratoId ? String(route.query.contratoId) : '')
const mesSeleccionado = ref('')
const motivoSolicitud = ref('')

const equiposPeriodo = ref([])
const operPeriodo = ref([])
const originalValues = ref({})
const editedValues = ref({})
const cellRefs = ref({})

const periodoCargado = ref(false)
const solicitudEnviada = ref(false)
const modalSolicitudVisible = ref(false)
const zoomTabla = ref(false)

const ALLOWED = ['D', 'F', 'M']

/* ===================== selección múltiple ===================== */
const selectionMode = ref(false)
const selectedCells = ref(new Map())
const isDraggingSelect = ref(false)
const dragAddMode = ref(true)

const selectedCellsCount = computed(() => selectedCells.value.size)

function cellKey(equipoId, jornada, dia) {
  return `${equipoId}-${jornada}-${dia}`
}

function isSelected(equipoId, jornada, dia) {
  return selectedCells.value.has(cellKey(equipoId, jornada, dia))
}

function clearSelection() {
  selectedCells.value.clear()
}

function addToSelection(equipoId, jornada, dia) {
  const key = cellKey(equipoId, jornada, dia)
  if (dragAddMode.value) {
    selectedCells.value.set(key, { equipoId, jornada, dia })
  } else {
    selectedCells.value.delete(key)
  }
}

function onCellClickSelect(equipoId, jornada, dia) {
  const key = cellKey(equipoId, jornada, dia)
  if (selectedCells.value.has(key)) selectedCells.value.delete(key)
  else selectedCells.value.set(key, { equipoId, jornada, dia })
}

function handleCellMouseDown(evt, equipoId, jornada, dia) {
  if (!selectionMode.value || solicitudEnviada.value) return
  evt.preventDefault()
  evt.stopPropagation()
  isDraggingSelect.value = true
  dragAddMode.value = !evt.altKey
  addToSelection(equipoId, jornada, dia)
}

function onCellMouseEnter(equipoId, jornada, dia) {
  if (!selectionMode.value || !isDraggingSelect.value || solicitudEnviada.value) return
  addToSelection(equipoId, jornada, dia)
}

function onMouseUpGlobal() {
  isDraggingSelect.value = false
}

function onKeyDownGlobal(e) {
  if (e.key === 'Alt') dragAddMode.value = false
}

function onKeyUpGlobal(e) {
  if (e.key === 'Alt') dragAddMode.value = true
}

function applySelectionValue(value) {
  const upper = String(value || '').toUpperCase()
  if (!ALLOWED.includes(upper)) return
  if (!selectedCells.value.size) return

  for (const [key] of selectedCells.value.entries()) {
    editedValues.value[key] = upper
  }
}

function onCellClickHistorico(equipoId, jornada, dia, categoria, rowIndex, diaIndex) {
  if (selectionMode.value) {
    onCellClickSelect(equipoId, jornada, dia)
    return
  }
  focusCell(categoria, rowIndex, diaIndex, jornada)
}

/* ===================== fechas ===================== */
const maxMesEditable = computed(() => {
  const hoy = new Date()
  const prev = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  const yyyy = prev.getFullYear()
  const mm = String(prev.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
})

const contratosUsuarioValidos = computed(() =>
  (contratosUsuario.value || []).filter(c => c && c.id && c.activo !== false)
)

const contratoSeleccionado = computed(() =>
  contratosUsuarioValidos.value.find(c => String(c.id) === String(contratoSeleccionadoId.value)) || null
)

const periodoDate = computed(() => {
  if (!mesSeleccionado.value) return null
  const [y, m] = mesSeleccionado.value.split('-').map(Number)
  return new Date(y, m - 1, 1, 0, 0, 0, 0)
})

const etiquetaPeriodo = computed(() => {
  if (!periodoDate.value) return '—'
  const txt = periodoDate.value.toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric'
  })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
})

const year = computed(() => periodoDate.value?.getFullYear?.() || 0)
const mes = computed(() => periodoDate.value?.getMonth?.() || 0)

const diasEnMes = computed(() => {
  if (!periodoDate.value) return 0
  return new Date(year.value, mes.value + 1, 0).getDate()
})

const nombreMesCorto = computed(() => {
  if (!periodoDate.value) return ''
  return periodoDate.value.toLocaleString('default', { month: 'short' }).toLowerCase()
})

const diasVisibles = computed(() =>
  Array.from({ length: diasEnMes.value }, (_, i) => `${String(i + 1).padStart(2, '0')}-${nombreMesCorto.value}`)
)

const totalEquiposPeriodo = computed(() => equiposPeriodo.value.length)

const puedeCargarPeriodo = computed(() => {
  if (!contratoSeleccionadoId.value) return false
  if (!mesSeleccionado.value) return false
  return true
})

/* ===================== helpers ===================== */
function buildCellKey(equipoId, jornada, dia) {
  return `${equipoId}-${jornada}-${dia}`
}

function nombreToLetra(n) {
  const s = String(n || '').toUpperCase()
  if (s.includes('DISP')) return 'D'
  if (s.includes('FUERA')) return 'F'
  if (s.includes('MANT')) return 'M'
  if (ALLOWED.includes(s)) return s
  return ''
}

function colorCelda(valor) {
  if (valor === 'D') return 'bg-success text-white'
  if (valor === 'F') return 'bg-danger text-white'
  if (valor === 'M') return 'bg-warning text-dark'
  return ''
}

function getValorCelda(cellKey) {
  return editedValues.value[cellKey] ?? ''
}

function setCellRef(categoria, row, dia, turno, el) {
  if (!el) return
  const key = `${categoria}|${row}|${dia}|${turno}`
  cellRefs.value[key] = el
}

function focusCell(categoria, row, dia, turno) {
  const key = `${categoria}|${row}|${dia}|${turno}`
  const el = cellRefs.value[key]
  el?.focus?.()
  el?.select?.()
}

function onCellKeydown(e, categoria, rowIdx, diaIdx, turno, totalRows, totalDias) {
  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    focusCell(categoria, rowIdx, diaIdx, turno)
    return
  }

  const k = e.key
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) return

  e.preventDefault()
  const perDay = 2
  let col = diaIdx * perDay + (turno === 'A' ? 0 : 1)
  const maxCol = totalDias * perDay - 1
  let r = rowIdx

  if (k === 'ArrowRight' && col < maxCol) col++
  if (k === 'ArrowLeft' && col > 0) col--
  if (k === 'ArrowDown' && r < totalRows - 1) r++
  if (k === 'ArrowUp' && r > 0) r--

  const newDia = Math.floor(col / perDay)
  const newTurno = (col % 2 === 0) ? 'A' : 'B'
  focusCell(categoria, r, newDia, newTurno)
}

function onCellInputHistorico(e, equipo, dia, jornada) {
  if (solicitudEnviada.value) return

  let val = (e.target.value || '').toUpperCase().slice(0, 1)
  if (!ALLOWED.includes(val)) val = ''
  e.target.value = val

  const key = buildCellKey(equipo.id, jornada, dia)

  // si la celda actual está seleccionada y hay varias seleccionadas, aplica a todas
  if (selectionMode.value && selectedCells.value.size > 1 && selectedCells.value.has(key) && ALLOWED.includes(val)) {
    applySelectionValue(val)
    return
  }

  editedValues.value[key] = val
}

function esCambioPendiente(cellKey) {
  return (originalValues.value[cellKey] || '') !== (editedValues.value[cellKey] || '')
}

const cambiosPendientes = computed(() => {
  const arr = []

  for (const equipo of equiposPeriodo.value) {
    for (const dia of diasVisibles.value) {
      for (const jornada of ['A', 'B']) {
        const key = buildCellKey(equipo.id, jornada, dia)
        const anterior = originalValues.value[key] || ''
        const nuevo = editedValues.value[key] || ''

        if (anterior !== nuevo) {
          arr.push({
            cellKey: key,
            equipoId: equipo.id,
            equipoNombre: equipo.nombre_equipo || '',
            patente: equipo.patente || '',
            categoria: equipo.categoria || '',
            dia,
            jornada,
            anterior,
            nuevo
          })
        }
      }
    }
  }

  return arr
})

const equiposPorCategoria = computed(() => {
  const grupo = {}
  for (const e of equiposPeriodo.value) {
    const cat = e.categoria || 'SIN CATEGORÍA'
    if (!grupo[cat]) grupo[cat] = []
    grupo[cat].push(e)
  }
  return grupo
})

/* ===================== data ===================== */
async function obtenerContratosDelUsuario() {
  const currentUser = auth.currentUser
  if (!currentUser) return

  const userDoc = await getDoc(doc(db, 'usuarios', currentUser.uid))
  if (!userDoc.exists()) return

  const userData = userDoc.data() || {}
  rolUsuario.value = userData.rol || ''

  const contratosIds = Array.isArray(userData.contratosAsignados) ? userData.contratosAsignados : []
  if (!contratosIds.length) {
    contratosUsuario.value = []
    return
  }

  const chunks = []
  for (let i = 0; i < contratosIds.length; i += 10) {
    chunks.push(contratosIds.slice(i, i + 10))
  }

  const results = []
  for (const ids of chunks) {
    const qy = query(collection(db, 'contratos'), where('__name__', 'in', ids))
    const snap = await getDocs(qy)
    results.push(
      ...snap.docs.map(d => {
        const data = d.data() || {}
        return {
          id: d.id,
          ...data,
          activo: data.activo !== false
        }
      })
    )
  }

  contratosUsuario.value = results.filter(c => c.activo !== false)
}

async function cargarPeriodoHistorico() {
  if (!puedeCargarPeriodo.value) return

  errorMsg.value = ''
  okMsg.value = ''
  loadingGrid.value = true
  periodoCargado.value = false
  solicitudEnviada.value = false
  modalSolicitudVisible.value = false
  originalValues.value = {}
  editedValues.value = {}
  clearSelection()

  try {
    const fechaInicio = new Date(year.value, mes.value, 1, 0, 0, 0, 0)
    const fechaFin = new Date(year.value, mes.value + 1, 1, 0, 0, 0, 0)

    let equipos = []
    try {
      const qeOrdered = query(
        collection(db, 'equipos'),
        where('contratoId', '==', String(contratoSeleccionadoId.value)),
        orderBy('nombre_equipo')
      )
      const se = await getDocs(qeOrdered)
      equipos = se.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch {
      const qe = query(
        collection(db, 'equipos'),
        where('contratoId', '==', String(contratoSeleccionadoId.value))
      )
      const se = await getDocs(qe)
      equipos = se.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) =>
          String(a.nombre_equipo || '').localeCompare(String(b.nombre_equipo || ''), 'es', { sensitivity: 'base' })
        )
    }

    equipos = equipos.filter(e =>
      e?.oculto !== true &&
      e?.visible !== false &&
      e?.visible_actual !== false
    )

    equiposPeriodo.value = equipos

    const qo = query(
      collection(db, 'operatividad'),
      where('contratoId', '==', String(contratoSeleccionadoId.value)),
      where('fecha', '>=', fechaInicio),
      where('fecha', '<', fechaFin)
    )
    const so = await getDocs(qo)
    operPeriodo.value = so.docs.map(d => ({ id: d.id, ...d.data() }))

    for (const eq of equiposPeriodo.value) {
      for (const dia of diasVisibles.value) {
        for (const jornada of ['A', 'B']) {
          const key = buildCellKey(eq.id, jornada, dia)
          originalValues.value[key] = ''
          editedValues.value[key] = ''
        }
      }
    }

    for (const item of operPeriodo.value) {
      const date = item.fecha?.toDate ? item.fecha.toDate() : new Date(item.fecha)
      const dia = `${String(date.getDate()).padStart(2, '0')}-${nombreMesCorto.value}`
      const key = buildCellKey(item.equipoId, item.jornada, dia)
      const letra = nombreToLetra(item.estado)
      originalValues.value[key] = letra
      editedValues.value[key] = letra
    }

    periodoCargado.value = true
  } catch (e) {
    console.error('Error cargando período histórico:', e)
    errorMsg.value = 'No se pudo cargar la operatividad histórica del mes seleccionado.'
  } finally {
    loadingGrid.value = false
  }
}

function limpiarCambios() {
  editedValues.value = { ...originalValues.value }
  clearSelection()
}

function abrirModalSolicitud() {
  if (cambiosPendientes.value.length === 0) return
  modalSolicitudVisible.value = true
}

function cerrarModalSolicitud() {
  modalSolicitudVisible.value = false
}

async function enviarSolicitudEdicion() {
  if (!contratoSeleccionado.value) return
  if (!motivoSolicitud.value.trim()) {
    errorMsg.value = 'Debes ingresar un motivo para la solicitud.'
    return
  }
  if (cambiosPendientes.value.length === 0) {
    errorMsg.value = 'No hay cambios para enviar.'
    return
  }

  enviandoSolicitud.value = true
  errorMsg.value = ''
  okMsg.value = ''

  try {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('No hay usuario autenticado.')

    const userSnap = await getDoc(doc(db, 'usuarios', currentUser.uid))
    const userData = userSnap.exists() ? (userSnap.data() || {}) : {}

    const payload = {
      contratoId: String(contratoSeleccionado.value.id),
      contratoNombre: contratoSeleccionado.value.nombre || '',
      mes: mes.value + 1,
      anio: year.value,
      periodoLabel: etiquetaPeriodo.value,

      solicitadoPorUid: currentUser.uid,
      solicitadoPorEmail: currentUser.email || '',
      solicitadoPorNombre: userData.nombre_completo || '',

      estado: 'pendiente',
      motivo: motivoSolicitud.value.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),

      cambios: cambiosPendientes.value.map(c => ({
        equipoId: String(c.equipoId),
        equipoNombre: c.equipoNombre || '',
        patente: c.patente || '',
        categoria: c.categoria || '',
        dia: c.dia,
        jornada: c.jornada,
        anterior: c.anterior || '',
        nuevo: c.nuevo || '',
        observacionAnterior: '',
        observacionNueva: motivoSolicitud.value.trim()
      }))
    }

    await addDoc(collection(db, 'solicitudes_edicion_operatividad'), payload)

    solicitudEnviada.value = true
    modalSolicitudVisible.value = false
    clearSelection()
    okMsg.value = 'La solicitud quedó registrada correctamente y está pendiente de aprobación.'
  } catch (e) {
    console.error('Error enviando solicitud:', e)
    errorMsg.value = 'No se pudo enviar la solicitud.'
  } finally {
    enviandoSolicitud.value = false
  }
}

function resetVista() {
  errorMsg.value = ''
  okMsg.value = ''
  loadingGrid.value = false
  periodoCargado.value = false
  solicitudEnviada.value = false
  modalSolicitudVisible.value = false
  motivoSolicitud.value = ''
  equiposPeriodo.value = []
  operPeriodo.value = []
  originalValues.value = {}
  editedValues.value = {}
  clearSelection()
  selectionMode.value = false
  if (!route.query.contratoId) contratoSeleccionadoId.value = ''
  mesSeleccionado.value = ''
}

/* ===================== lifecycle ===================== */
onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      loading.value = false
      return
    }

    try {
      await obtenerContratosDelUsuario()
    } catch (e) {
      console.error(e)
      errorMsg.value = 'No se pudieron cargar los contratos del usuario.'
    } finally {
      loading.value = false
    }
  })

  window.addEventListener('mouseup', onMouseUpGlobal)
  window.addEventListener('keydown', onKeyDownGlobal)
  window.addEventListener('keyup', onKeyUpGlobal)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', onMouseUpGlobal)
  window.removeEventListener('keydown', onKeyDownGlobal)
  window.removeEventListener('keyup', onKeyUpGlobal)
})
</script>

<style scoped>
:root, :host {
  --col-interno: 160px;
  --col-ppu: 140px;
}

@media (max-width: 992px){
  :root, :host { --col-interno: 120px; --col-ppu: 100px; }
}

@media (max-width: 576px){
  :root, :host { --col-interno: 100px; --col-ppu: 88px; }
}

.card {
  border-radius: 16px;
  background-color: #fff;
  border: 1px solid #dee2e6;
}

.scroll-horizontal {
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: #aaa transparent;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
}
.scroll-horizontal::-webkit-scrollbar { height: 8px; }
.scroll-horizontal::-webkit-scrollbar-thumb { background: #aaa; border-radius: 4px; }
.scroll-horizontal::-webkit-scrollbar-thumb:hover { background: #666; }

.col-interno { width: var(--col-interno); min-width: var(--col-interno); }
.col-ppu     { width: var(--col-ppu); min-width: var(--col-ppu); }

.sticky-col, .sticky-col-2 {
  position: sticky;
  background: #fff;
  z-index: 3;
}
.sticky-col { left: 0; box-shadow: 2px 0 0 rgba(0,0,0,0.06); }
.sticky-col-2 { left: var(--col-interno); box-shadow: 2px 0 0 rgba(0,0,0,0.06); }

.table thead th.sticky-col,
.table thead th.sticky-col-2 {
  z-index: 4;
}

.table td, .table th {
  vertical-align: middle;
  padding: 0.25rem;
}

.th-turno {
  font-size: 0.8rem;
  line-height: 1;
}

.cell-letter-visible {
  position: absolute;
  inset: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1rem;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: .5px;
  pointer-events: none;
  user-select: none;
  z-index: 2;
  color: white !important;
}

.cell-input {
  min-height: 30px;
  font-weight: 900;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: .5px;
  text-align: center;
  line-height: 1.1;
  z-index: 1;
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  caret-color: #111;
  background-clip: padding-box;
}
.cell-input:focus {
  color: #111 !important;
  -webkit-text-fill-color: #111 !important;
}

.bg-success.text-white { color: #fff !important; }
.bg-danger.text-white  { color: #fff !important; }
.bg-warning.text-dark  { color: #000 !important; }

.cell-dirty {
  outline: 2px solid #0d6efd;
  outline-offset: -2px;
  box-shadow: inset 0 0 0 2px rgba(13,110,253,.18);
}

.cell-selected {
  outline: 2px solid #198754;
  outline-offset: -2px;
  box-shadow: inset 0 0 0 2px rgba(25,135,84,.25);
  position: relative;
}
.cell-selected::after {
  content: "";
  position: absolute;
  inset: 2px;
  background: rgba(25,135,84,.10);
  pointer-events: none;
  border-radius: 2px;
}

.tabla-zoom-out td,
.tabla-zoom-out th {
  font-size: 0.52rem;
  padding: 0.15rem;
}
.tabla-zoom-out .cell-input {
  font-size: 0.55rem !important;
  min-height: 22px !important;
}
</style>