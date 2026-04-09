<template>
  <div class="historial-wrap">
    <div class="container-fluid py-3 px-2 px-md-3">
      <!-- Encabezado -->
      <div class="page-head d-flex flex-column flex-xl-row align-items-xl-center justify-content-between gap-3 mb-3">
        <div>
          <h1 class="title mb-1">Historial de Operatividad</h1>
          <p class="subtitle mb-0">
            Vista tipo planilla por contrato, mes, categoría y equipo.
          </p>
        </div>

        <div class="legend d-none d-md-flex align-items-center gap-2">
          <span class="chip"><span class="dot dot-d"></span> Disponible (D)</span>
          <span class="chip"><span class="dot dot-f"></span> Falla (F)</span>
          <span class="chip"><span class="dot dot-m"></span> Mantención (M)</span>
        </div>
      </div>

      <!-- Filtros -->
      <div class="glass filters-box mb-3">
        <div class="row g-2">
          <div class="col-12 col-md-3">
            <label class="form-label fw-semibold mb-1">Año</label>
            <select class="form-select form-select-sm" v-model="anioSeleccionado" @change="onPeriodoChange">
              <option v-for="y in aniosDisponiblesGlobal" :key="y" :value="String(y)">
                {{ y }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-3">
            <label class="form-label fw-semibold mb-1">Mes</label>
            <select class="form-select form-select-sm" v-model="mesSeleccionado" @change="onPeriodoChange">
              <option v-for="m in mesesDisponiblesParaAnio" :key="m.value" :value="m.value">
                {{ m.label }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-3">
            <label class="form-label fw-semibold mb-1">Categoría</label>
            <select class="form-select form-select-sm" v-model="categoriaSeleccionada" :disabled="!expandedContratoId">
              <option value="__ALL__">Todas las categorías</option>
              <option v-for="cat in categoriasDisponibles" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-3">
            <label class="form-label fw-semibold mb-1">Buscar equipo / PPU</label>
            <input
              type="text"
              class="form-control form-control-sm"
              v-model.trim="busquedaEquipo"
              :disabled="!expandedContratoId"
              placeholder="Ej: KPXG-14 o XTM-CAPL-G14"
            />
          </div>
        </div>

        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2 pt-2 border-top">
          <div class="small text-muted">
            <template v-if="expandedContrato">
              Contrato abierto:
              <strong>{{ expandedContrato.nombre }}</strong>
            </template>
            <template v-else>
              Selecciona un contrato para ver la planilla histórica.
            </template>
          </div>

          <div class="d-flex flex-wrap align-items-center gap-2">
            <div class="form-check form-switch me-1">
              <input
                class="form-check-input"
                type="checkbox"
                id="swComentarios"
                v-model="mostrarComentarios"
                :disabled="!expandedContratoId"
              />
              <label class="form-check-label small" for="swComentarios">
                Mostrar comentarios
              </label>
            </div>

            <button class="btn btn-outline-secondary btn-sm" @click="limpiarFiltrosVista">
              <i class="bi bi-eraser me-1"></i> Limpiar filtros
            </button>

            <button
              v-if="expandedContrato"
              class="btn btn-outline-secondary btn-sm"
              @click="cerrarContratoExpandido"
            >
              <i class="bi bi-x-circle me-1"></i> Cerrar
            </button>

            <button
              v-if="expandedContrato"
              class="btn btn-success btn-sm"
              @click="descargarExcelActual"
              :disabled="loadingContratoHistorial[expandedContrato.id] || !rowsTablaActual.length"
            >
              <i class="bi bi-file-earmark-excel-fill me-1"></i> Exportar Excel
            </button>
          </div>
        </div>
      </div>

      <!-- Loading general -->
      <div v-if="loading" class="glass card-load text-center">
        <div class="spinner-border" role="status"></div>
        <div class="mt-2 text-muted small">Cargando contratos e historial…</div>
      </div>

      <template v-else>
        <div v-if="contratosUsuario.length === 0" class="glass card-empty text-center">
          <i class="bi bi-inboxes fs-3 text-muted"></i>
          <p class="mt-2 mb-0 text-muted">No tienes contratos activos asignados.</p>
        </div>

        <div v-else class="d-flex flex-column gap-3">
          <div
            v-for="contrato in contratosParaMostrar"
            :key="contrato.id"
            class="glass contract-card"
          >
            <!-- Header contrato -->
            <div class="contract-head d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div class="d-flex align-items-center gap-3 min-w-0">
                <div class="avatar">
                  <i class="bi bi-briefcase"></i>
                </div>

                <div class="min-w-0">
                  <div class="contract-name text-truncate">
                    {{ contrato.nombre }}
                    <span class="badge bg-gradient-success align-middle ms-2">Activo</span>
                  </div>
                  <div class="contract-meta small mt-1">
                    Período: <strong>{{ descripcionPeriodoActual }}</strong>
                  </div>
                </div>
              </div>

              <div class="d-flex flex-wrap align-items-center gap-2">
                <span class="info-pill">
                  <i class="bi bi-grid-3x3-gap me-1"></i>
                  Vista planilla
                </span>

                <button
                  v-if="expandedContratoId !== contrato.id"
                  class="btn btn-primary btn-sm"
                  @click="expandirContrato(contrato)"
                  :disabled="loadingExpandContratoId === contrato.id"
                >
                  <span v-if="loadingExpandContratoId !== contrato.id">
                    <i class="bi bi-eye me-1"></i> Ver historial
                  </span>
                  <span v-else class="d-inline-flex align-items-center gap-2">
                    <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    Cargando…
                  </span>
                </button>

                <button
                  v-else
                  class="btn btn-outline-light btn-sm"
                  @click="cerrarContratoExpandido"
                >
                  <i class="bi bi-eye-slash me-1"></i> Cerrar
                </button>
              </div>
            </div>

            <!-- Body contrato -->
            <div v-if="expandedContratoId === contrato.id" class="contract-body">
              <div v-if="loadingContratoHistorial[contrato.id]" class="table-load text-center">
                <div class="spinner-border text-secondary"></div>
                <div class="small text-muted mt-2">Buscando información del contrato…</div>
              </div>

              <template v-else>
                <!-- Resumen -->
                <div class="row g-2 mb-2">
                  <div class="col-6 col-md-3">
                    <div class="summary-card">
                      <div class="summary-label">Equipos visibles</div>
                      <div class="summary-value">{{ rowsTablaActual.length }}</div>
                    </div>
                  </div>

                  <div class="col-6 col-md-3">
                    <div class="summary-card">
                      <div class="summary-label">Categorías visibles</div>
                      <div class="summary-value">{{ categoriasVisiblesCount }}</div>
                    </div>
                  </div>

                  <div class="col-6 col-md-3">
                    <div class="summary-card">
                      <div class="summary-label">Celdas con registros</div>
                      <div class="summary-value">{{ totalCeldasConDato }}</div>
                    </div>
                  </div>

                  <div class="col-6 col-md-3">
                    <div class="summary-card">
                      <div class="summary-label">Comentarios</div>
                      <div class="summary-value">{{ mostrarComentarios ? 'Sí' : 'No' }}</div>
                    </div>
                  </div>
                </div>

                <div v-if="rowsTablaActual.length === 0" class="table-empty text-center">
                  <i class="bi bi-clipboard-x fs-4 text-muted"></i>
                  <p class="mb-1 text-muted">No hay datos para los filtros seleccionados.</p>
                  <small class="text-muted">Prueba cambiando categoría o la búsqueda de equipo.</small>
                </div>

                <div
                  v-else
                  class="scroll-horizontal"
                  :class="{ 'with-comments': mostrarComentarios }"
                >
                  <table
                    class="table table-bordered table-sm text-center align-middle mb-0 tabla-historial"
                    :class="{ 'tabla-con-comentarios': mostrarComentarios }"
                  >
                    <thead class="table-light">
                      <tr>
                        <th rowspan="2" class="sticky-col col-categoria">Categoría</th>
                        <th rowspan="2" class="sticky-col-2 col-equipo">Equipo</th>
                        <th rowspan="2" class="sticky-col-3 col-ppu">PPU</th>
                        <th
                          v-for="dia in diasDelMesActual"
                          :key="'d-' + dia"
                          colspan="2"
                          class="dia-head"
                        >
                          {{ dia }}
                        </th>
                      </tr>
                      <tr>
                        <template v-for="dia in diasDelMesActual" :key="'sub-' + dia">
                          <th class="th-turno">A</th>
                          <th class="th-turno">B</th>
                        </template>
                      </tr>
                    </thead>

                    <tbody>
                      <template v-for="grupo in rowsAgrupadasPorCategoria" :key="grupo.categoria">
                        <!-- fila separadora de categoría -->
                        <tr class="categoria-divider-row">
                          <td
                            class="categoria-divider-cell"
                            :colspan="3 + (diasDelMesActual.length * 2)"
                          >
                            <div class="categoria-divider-content">
                              <span class="categoria-divider-title">{{ grupo.categoria }}</span>
                              <span class="categoria-divider-badge">
                                Equipos: {{ grupo.rows.length }}
                              </span>
                            </div>
                          </td>
                        </tr>

                        <!-- filas equipos -->
                        <tr v-for="row in grupo.rows" :key="row.id">
                          <td class="sticky-col col-categoria text-start fw-semibold categoria-cell">
                            {{ row.categoria }}
                          </td>

                          <td class="sticky-col-2 col-equipo text-start fw-semibold" :title="row.nombre_equipo">
                            {{ row.nombre_equipo }}
                          </td>

                          <td class="sticky-col-3 col-ppu text-start" :title="row.patente">
                            {{ row.patente || '—' }}
                          </td>

                          <template v-for="dia in diasDelMesActual" :key="row.id + '-' + dia">
                            <td
                              class="hist-cell"
                              :class="cellClass(getCell(row.id, dia, 'A')?.letra)"
                              :title="getCellTooltip(row.id, dia, 'A')"
                            >
                              <div v-if="getCell(row.id, dia, 'A')" class="cell-wrap">
                                <div class="cell-letter">{{ getCell(row.id, dia, 'A')?.letra }}</div>
                                <div v-if="mostrarComentarios" class="cell-comment">
                                  {{ getCell(row.id, dia, 'A')?.observaciones || '—' }}
                                </div>
                              </div>
                            </td>

                            <td
                              class="hist-cell"
                              :class="cellClass(getCell(row.id, dia, 'B')?.letra)"
                              :title="getCellTooltip(row.id, dia, 'B')"
                            >
                              <div v-if="getCell(row.id, dia, 'B')" class="cell-wrap">
                                <div class="cell-letter">{{ getCell(row.id, dia, 'B')?.letra }}</div>
                                <div v-if="mostrarComentarios" class="cell-comment">
                                  {{ getCell(row.id, dia, 'B')?.observaciones || '—' }}
                                </div>
                              </div>
                            </td>
                          </template>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import * as XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'
import { ref, computed, onMounted } from 'vue'
import { db } from '../firebase/config'
import { getAuth } from 'firebase/auth'
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit
} from 'firebase/firestore'

const LOOKBACK_MESES = 12
const CHUNK_IN = 10
const PAR_MESES_CONC = 6

const loading = ref(true)

const contratosUsuario = ref([])
const mesesPorContrato = ref({})
const historialPorContrato = ref({})
const loadingContratoHistorial = ref({})
const equiposPorContrato = ref({})
const equiposCache = ref(new Map())

const anioSeleccionado = ref(String(new Date().getFullYear()))
const mesSeleccionado = ref(String(new Date().getMonth() + 1).padStart(2, '0'))
const aniosDisponiblesGlobal = ref([])

const categoriaSeleccionada = ref('__ALL__')
const busquedaEquipo = ref('')
const mostrarComentarios = ref(false)

const expandedContratoId = ref(null)
const loadingExpandContratoId = ref(null)

function ymKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function rangeMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return {
    start: new Date(y, m - 1, 1, 0, 0, 0, 0),
    end: new Date(y, m, 1, 0, 0, 0, 0)
  }
}

function monthsLookback(n) {
  const out = []
  const base = new Date()
  base.setDate(1)

  for (let i = 0; i < n; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    out.push(ymKey(d))
  }

  return out
}

function chunkArray(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function normJ(j) {
  return String(j || '').trim().toUpperCase() === 'B' ? 'B' : 'A'
}

function nombreToLetra(n) {
  const s = String(n || '').toUpperCase()
  if (s.includes('DISP')) return 'D'
  if (s.includes('FALL') || s.includes('FUERA')) return 'F'
  if (s.includes('MANT')) return 'M'
  if (['D', 'F', 'M'].includes(s)) return s
  return ''
}

function etiquetaEstado(e) {
  const s = String(e || '').toUpperCase()
  if (s.includes('DISP')) return 'Disponible'
  if (s.includes('FALL') || s.includes('FUERA')) return 'Falla'
  if (s.includes('MANT')) return 'Mantención'
  return '—'
}

function formatoFechaCorta(f) {
  try {
    const d = f?.toDate ? f.toDate() : new Date(f)
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d)
  } catch {
    return '—'
  }
}

function formatoHora(f) {
  try {
    const d = f?.toDate ? f.toDate() : new Date(f)
    return new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(d)
  } catch {
    return '—'
  }
}

function capitalizar(txt = '') {
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

function nombreMes(num) {
  return capitalizar(
    new Date(2000, Number(num) - 1, 1).toLocaleString('es-CL', { month: 'long' })
  )
}

const expandedContrato = computed(() =>
  contratosUsuario.value.find(c => c.id === expandedContratoId.value) || null
)

const contratosParaMostrar = computed(() => {
  if (!expandedContratoId.value) return contratosUsuario.value
  return contratosUsuario.value.filter(c => c.id === expandedContratoId.value)
})

const mesesDisponiblesParaAnio = computed(() => {
  const set = new Set()

  Object.values(mesesPorContrato.value).forEach(arr => {
    (arr || []).forEach(ym => {
      const [y, m] = ym.split('-')
      if (y === anioSeleccionado.value) set.add(m)
    })
  })

  const sorted = Array.from(set).sort((a, b) => Number(a) - Number(b))

  return sorted.map(m => ({
    value: m,
    label: nombreMes(m)
  }))
})

const descripcionPeriodoActual = computed(() => {
  return `${nombreMes(mesSeleccionado.value)} ${anioSeleccionado.value}`
})

const diasDelMesActual = computed(() => {
  const y = Number(anioSeleccionado.value)
  const m = Number(mesSeleccionado.value)
  const total = new Date(y, m, 0).getDate()
  return Array.from({ length: total }, (_, i) => String(i + 1).padStart(2, '0'))
})

const registrosActualesContrato = computed(() => {
  if (!expandedContratoId.value) return []
  return historialPorContrato.value[expandedContratoId.value] || []
})

const categoriasDisponibles = computed(() => {
  if (!expandedContratoId.value) return []
  const set = new Set()

  rowsBaseActual.value.forEach(r => {
    if (r.categoria) set.add(r.categoria)
  })

  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
})

const rowsBaseActual = computed(() => {
  if (!expandedContratoId.value) return []
  const equipos = equiposPorContrato.value[expandedContratoId.value] || []

  return equipos
    .map(eq => ({
      id: String(eq.id),
      nombre_equipo: eq.nombre_equipo || `Equipo ${eq.id}`,
      patente: eq.patente || '—',
      categoria: eq.categoria || 'SIN CATEGORÍA'
    }))
    .sort((a, b) => {
      if (a.categoria !== b.categoria) {
        return a.categoria.localeCompare(b.categoria, 'es', { sensitivity: 'base' })
      }
      return a.nombre_equipo.localeCompare(b.nombre_equipo, 'es', { sensitivity: 'base' })
    })
})

const rowsTablaActual = computed(() => {
  let rows = [...rowsBaseActual.value]

  if (categoriaSeleccionada.value !== '__ALL__') {
    rows = rows.filter(r => r.categoria === categoriaSeleccionada.value)
  }

  if (busquedaEquipo.value) {
    const q = busquedaEquipo.value.toLowerCase().trim()
    rows = rows.filter(r => {
      const nom = String(r.nombre_equipo || '').toLowerCase()
      const ppu = String(r.patente || '').toLowerCase()
      return nom.includes(q) || ppu.includes(q)
    })
  }

  return rows
})

const rowsAgrupadasPorCategoria = computed(() => {
  const grupos = []
  const mapa = new Map()

  rowsTablaActual.value.forEach(row => {
    const cat = row.categoria || 'SIN CATEGORÍA'
    if (!mapa.has(cat)) {
      mapa.set(cat, { categoria: cat, rows: [] })
      grupos.push(mapa.get(cat))
    }
    mapa.get(cat).rows.push(row)
  })

  return grupos
})

const cellMapActual = computed(() => {
  const mapa = new Map()

  registrosActualesContrato.value.forEach(r => {
    const fecha = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha)
    const dia = String(fecha.getDate()).padStart(2, '0')
    const jornada = normJ(r.jornada)
    const key = `${String(r.equipoId)}|${dia}|${jornada}`

    mapa.set(key, {
      ...r,
      letra: nombreToLetra(r.estado),
      observaciones: String(r.observaciones || '').trim(),
      fechaFormateada: formatoFechaCorta(r.fecha),
      horaFormateada: formatoHora(r.timestamp || r.fecha)
    })
  })

  return mapa
})

const totalCeldasConDato = computed(() => {
  let total = 0

  rowsTablaActual.value.forEach(row => {
    diasDelMesActual.value.forEach(dia => {
      if (cellMapActual.value.has(`${row.id}|${dia}|A`)) total++
      if (cellMapActual.value.has(`${row.id}|${dia}|B`)) total++
    })
  })

  return total
})

const categoriasVisiblesCount = computed(() => {
  return new Set(rowsTablaActual.value.map(r => r.categoria)).size
})

function getCell(equipoId, dia, jornada) {
  return cellMapActual.value.get(`${String(equipoId)}|${dia}|${jornada}`) || null
}

function cellClass(letra) {
  if (letra === 'D') return 'bg-success text-white'
  if (letra === 'F') return 'bg-danger text-white'
  if (letra === 'M') return 'bg-warning text-dark'
  return ''
}

function getCellTooltip(equipoId, dia, jornada) {
  const c = getCell(equipoId, dia, jornada)
  if (!c) return ''

  return `Estado: ${etiquetaEstado(c.estado)}
Turno: ${jornada}
Fecha: ${c.fechaFormateada}
Hora: ${c.horaFormateada}
Observación: ${c.observaciones || '—'}
Registrado por: ${c.nombre_completo || '—'} ${c.registradoPor ? `(${c.registradoPor})` : ''}`
}

async function obtenerContratosDelUsuario() {
  const auth = getAuth()
  const u = auth.currentUser
  if (!u) return

  const udoc = await getDoc(doc(db, 'usuarios', u.uid))
  if (!udoc.exists()) return

  const ids = (udoc.data().contratosAsignados || []).filter(Boolean)
  if (!ids.length) {
    contratosUsuario.value = []
    return
  }

  const res = []

  for (const slice of chunkArray(ids, CHUNK_IN)) {
    const snap = await getDocs(
      query(collection(db, 'contratos'), where('__name__', 'in', slice))
    )

    snap.docs.forEach(d => {
      const data = d.data() || {}
      if (data.activo !== false) {
        res.push({
          id: d.id,
          ...data
        })
      }
    })
  }

  contratosUsuario.value = res.sort((a, b) =>
    String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' })
  )
}

async function existeDatoEnColeccion(nombreCol, contratoId, ym) {
  try {
    const { start, end } = rangeMonth(ym)

    const qref = query(
      collection(db, nombreCol),
      where('contratoId', '==', contratoId),
      where('fecha', '>=', start),
      where('fecha', '<', end),
      limit(1)
    )

    const s = await getDocs(qref)
    return !s.empty
  } catch {
    return false
  }
}

async function hayRegistrosMes(contratoId, ym) {
  const [a, b] = await Promise.all([
    existeDatoEnColeccion('operatividad', contratoId, ym),
    existeDatoEnColeccion('historial_operatividad', contratoId, ym)
  ])

  return a || b
}

async function detectarMesesContrato(contratoId) {
  const candidatos = monthsLookback(LOOKBACK_MESES)
  const detectados = []

  for (let i = 0; i < candidatos.length; i += PAR_MESES_CONC) {
    const batch = candidatos.slice(i, i + PAR_MESES_CONC)
    const flags = await Promise.all(batch.map(ym => hayRegistrosMes(contratoId, ym)))
    flags.forEach((ok, idx) => {
      if (ok) detectados.push(batch[idx])
    })
  }

  mesesPorContrato.value[contratoId] = detectados
}

function buildAniosDisponiblesGlobal() {
  const ys = new Set()

  Object.values(mesesPorContrato.value).forEach(arr => {
    (arr || []).forEach(ym => ys.add(Number(ym.slice(0, 4))))
  })

  const lista = Array.from(ys).sort((a, b) => b - a)
  aniosDisponiblesGlobal.value = lista

  const yNow = String(new Date().getFullYear())
  if (!lista.map(String).includes(yNow) && lista.length) {
    anioSeleccionado.value = String(lista[0])
  }
}

async function asegurarEquiposContrato(contratoId) {
  if (equiposPorContrato.value[contratoId]) return

  const snap = await getDocs(
    query(collection(db, 'equipos'), where('contratoId', '==', contratoId))
  )

  const list = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }))

  equiposPorContrato.value[contratoId] = list

  list.forEach(eq => {
    equiposCache.value.set(String(eq.id), eq)
  })
}

async function asegurarEquipoPorId(equipoId) {
  const k = String(equipoId)
  if (equiposCache.value.has(k)) return equiposCache.value.get(k)

  try {
    const s = await getDoc(doc(db, 'equipos', k))
    if (s.exists()) {
      const eq = { id: s.id, ...s.data() }
      equiposCache.value.set(k, eq)
      return eq
    }
  } catch {
    // noop
  }

  return null
}

async function cargarHistorialContrato(contratoId) {
  loadingContratoHistorial.value[contratoId] = true

  try {
    await asegurarEquiposContrato(contratoId)

    const ym = `${anioSeleccionado.value}-${mesSeleccionado.value}`
    const { start, end } = rangeMonth(ym)

    let registros = []

    try {
      const q1 = query(
        collection(db, 'operatividad'),
        where('contratoId', '==', contratoId),
        where('fecha', '>=', start),
        where('fecha', '<', end)
      )

      const s1 = await getDocs(q1)

      if (!s1.empty) {
        registros = s1.docs.map(d => {
          const x = d.data()
          const fecha = x.fecha?.toDate?.() || new Date(x.fecha)

          return {
            id: d.id,
            ...x,
            fecha,
            jornada: normJ(x.jornada)
          }
        })
      }
    } catch {
      // seguimos fallback
    }

    if (!registros.length) {
      try {
        const q2 = query(
          collection(db, 'historial_operatividad'),
          where('contratoId', '==', contratoId),
          where('fecha', '>=', start),
          where('fecha', '<', end)
        )

        const s2 = await getDocs(q2)
        const mapa = new Map()

        s2.docs.forEach(d => {
          const x = d.data()
          const fecha = x.fecha?.toDate?.() || new Date(x.fecha)
          const dia = String(fecha.getDate()).padStart(2, '0')
          const j = normJ(x.jornada)

          const key = `${x.equipoId}|${dia}|${j}`
          const prev = mapa.get(key)

          const tsNew = x.timestamp?.toMillis?.() || new Date(x.timestamp || x.fecha).getTime()
          const tsOld = prev?.timestamp?.toMillis?.() || new Date(prev?.timestamp || prev?.fecha || 0).getTime()

          if (!prev || tsNew > tsOld) {
            mapa.set(key, {
              id: d.id,
              ...x,
              fecha,
              jornada: j
            })
          }
        })

        registros = Array.from(mapa.values())
      } catch {
        registros = []
      }
    }

    const ids = Array.from(new Set(registros.map(r => String(r.equipoId)).filter(Boolean)))
    for (const slice of chunkArray(ids, 25)) {
      await Promise.all(slice.map(id => asegurarEquipoPorId(id)))
    }

    historialPorContrato.value[contratoId] = registros
  } finally {
    loadingContratoHistorial.value[contratoId] = false
  }
}

async function expandirContrato(contrato) {
  loadingExpandContratoId.value = contrato.id
  categoriaSeleccionada.value = '__ALL__'
  busquedaEquipo.value = ''

  try {
    expandedContratoId.value = contrato.id
    await cargarHistorialContrato(contrato.id)
  } finally {
    loadingExpandContratoId.value = null
  }
}

function cerrarContratoExpandido() {
  expandedContratoId.value = null
  categoriaSeleccionada.value = '__ALL__'
  busquedaEquipo.value = ''
  mostrarComentarios.value = false
}

async function onPeriodoChange() {
  if (!expandedContratoId.value) return
  categoriaSeleccionada.value = '__ALL__'
  busquedaEquipo.value = ''
  await cargarHistorialContrato(expandedContratoId.value)
}

function limpiarFiltrosVista() {
  categoriaSeleccionada.value = '__ALL__'
  busquedaEquipo.value = ''
  mostrarComentarios.value = false
}

async function descargarExcelActual() {
  if (!expandedContrato.value) return
  await descargarExcelContrato(expandedContrato.value)
}

async function descargarExcelContrato(contrato) {
  const rows = rowsTablaActual.value
  if (!rows.length) return

  const dias = diasDelMesActual.value
  const wb = XLSX.utils.book_new()
  const data = []

  const titulo = `Historial — ${contrato.nombre} — ${descripcionPeriodoActual.value}`
  data.push([titulo])

  const row1 = ['CATEGORÍA', 'N° INTERNO', 'PPU']
  const row2 = ['', '', '']
  dias.forEach(d => {
    row1.push(String(parseInt(d, 10)))
    row1.push('')
    row2.push('A', 'B')
  })
  row1.push('D (Disponible)', 'F (Falla)', '%')
  row2.push('', '', '')
  data.push(row1, row2)

  const merges = []
  let currentRow = 3

  const agrupadas = {}
  rows.forEach(r => {
    (agrupadas[r.categoria] ||= []).push(r)
  })

  for (const [cat, grupo] of Object.entries(agrupadas)) {
    const r = [cat]
    for (let i = 1; i < row1.length; i++) r.push('')
    data.push(r)
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: row1.length - 1 } })
    currentRow++

    for (const eq of grupo) {
      const fila = ['', eq.nombre_equipo || '', eq.patente || '']

      for (const d of dias) {
        fila.push(getCell(eq.id, d, 'A')?.letra || '')
        fila.push(getCell(eq.id, d, 'B')?.letra || '')
      }

      fila.push('', '', '')
      data.push(fila)
      currentRow++
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(data)
  const totalCols = 3 + (dias.length * 2) + 3
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } })
  ws['!merges'] = merges

  const BORDER_THIN = { style: 'thin', color: { rgb: 'FF999999' } }
  const allBorders = { top: BORDER_THIN, right: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN }

  const titleStyle = {
    font: { bold: true, sz: 16, color: { rgb: 'FFFFFFFF' } },
    fill: { fgColor: { rgb: 'FF3B3F5C' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: allBorders
  }

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFFFF' } },
    fill: { fgColor: { rgb: 'FF1F4E78' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: allBorders
  }

  const subHeaderStyle = {
    font: { bold: true, color: { rgb: 'FF1F4E78' } },
    fill: { fgColor: { rgb: 'FFD9E1F2' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: allBorders
  }

  const categoriaStyle = {
    font: { bold: true, color: { rgb: 'FF333333' } },
    fill: { fgColor: { rgb: 'FFF2F2F2' } },
    alignment: { vertical: 'center', horizontal: 'left' },
    border: allBorders
  }

  const bodyStyle = {
    alignment: { vertical: 'center', horizontal: 'center' },
    border: allBorders
  }

  const bodyLeftStyle = {
    alignment: { vertical: 'center', horizontal: 'left' },
    border: allBorders
  }

  const styleD = {
    font: { bold: true, color: { rgb: 'FF0E6027' } },
    fill: { fgColor: { rgb: 'FFC6EFCE' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: allBorders
  }

  const styleF = {
    font: { bold: true, color: { rgb: 'FF9C0006' } },
    fill: { fgColor: { rgb: 'FFFFC7CE' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: allBorders
  }

  const styleM = {
    font: { bold: true, color: { rgb: 'FF7F6000' } },
    fill: { fgColor: { rgb: 'FFFFEB9C' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: allBorders
  }

  const range = XLSX.utils.decode_range(ws['!ref'])
  const colsCount = range.e.c - range.s.c + 1

  for (let c = 0; c < colsCount; c++) {
    const r0 = XLSX.utils.encode_cell({ r: 0, c })
    const r1 = XLSX.utils.encode_cell({ r: 1, c })
    const r2 = XLSX.utils.encode_cell({ r: 2, c })
    ws[r0] = ws[r0] || {}
    ws[r1] = ws[r1] || {}
    ws[r2] = ws[r2] || {}
    ws[r0].s = titleStyle
    ws[r1].s = headerStyle
    ws[r2].s = subHeaderStyle
  }

  for (let r = 3; r <= range.e.r; r++) {
    const c0 = XLSX.utils.encode_cell({ r, c: 0 })
    const isCat = ws[c0] && ws[c0].v && ws[c0].v !== ''

    for (let c = 0; c < colsCount; c++) {
      const ref = XLSX.utils.encode_cell({ r, c })
      ws[ref] = ws[ref] || {}
      ws[ref].s = isCat ? categoriaStyle : (c <= 2 ? bodyLeftStyle : bodyStyle)
    }
  }

  const estadosStart = 3
  const estadosEnd = 3 + (dias.length * 2) - 1
  let fila = 3

  for (const grupo of Object.values(agrupadas)) {
    fila++
    for (const _eq of grupo) {
      let c = estadosStart
      for (const _d of dias) {
        for (const _t of ['A', 'B']) {
          const ref = XLSX.utils.encode_cell({ r: fila, c })
          const v = ws[ref]?.v || ''
          if (v === 'D') ws[ref].s = styleD
          else if (v === 'F') ws[ref].s = styleF
          else if (v === 'M') ws[ref].s = styleM
          c++
        }
      }

      const rangoAB = XLSX.utils.encode_range({ r: fila, c: estadosStart }, { r: fila, c: estadosEnd })
      const colD = estadosEnd + 1
      const colF = estadosEnd + 2
      const colPct = estadosEnd + 3

      ws[XLSX.utils.encode_cell({ r: fila, c: colD })] = {
        t: 'n',
        f: `COUNTIF(${rangoAB},"D")+MIN(2,COUNTIF(${rangoAB},"M"))`
      }

      ws[XLSX.utils.encode_cell({ r: fila, c: colF })] = {
        t: 'n',
        f: `COUNTIF(${rangoAB},"F")+MAX(0,COUNTIF(${rangoAB},"M")-2)`
      }

      const refD = XLSX.utils.encode_cell({ r: fila, c: colD })
      ws[XLSX.utils.encode_cell({ r: fila, c: colPct })] = {
        t: 'n',
        f: `${refD}/${dias.length * 2}`,
        z: '0.00%'
      }

      fila++
    }
  }

  ws['!cols'] = [
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    ...Array.from({ length: dias.length * 2 }, () => ({ wch: 3.2 })),
    { wch: 14 },
    { wch: 12 },
    { wch: 10 }
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Historial')
  const nombreArchivo = `historial_${contrato.nombre.replace(/\s+/g, '_')}_${anioSeleccionado.value}-${mesSeleccionado.value}.xlsx`
  const blob = new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], {
    type: 'application/octet-stream'
  })
  saveAs(blob, nombreArchivo)
}

onMounted(async () => {
  try {
    await obtenerContratosDelUsuario()

    for (let i = 0; i < contratosUsuario.value.length; i += 2) {
      await Promise.all(
        contratosUsuario.value.slice(i, i + 2).map(c => detectarMesesContrato(c.id))
      )
    }

    buildAniosDisponiblesGlobal()

    const añoActual = String(new Date().getFullYear())
    if (!aniosDisponiblesGlobal.value.map(String).includes(añoActual) && aniosDisponiblesGlobal.value.length) {
      anioSeleccionado.value = String(aniosDisponiblesGlobal.value[0])
    }

    const mesesAnio = mesesDisponiblesParaAnio.value.map(x => x.value)
    const mesActual = String(new Date().getMonth() + 1).padStart(2, '0')
    if (!mesesAnio.includes(mesActual) && mesesAnio.length) {
      mesSeleccionado.value = mesesAnio[mesesAnio.length - 1]
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.historial-wrap{
  min-height: 100vh;
  background:
    radial-gradient(1000px 360px at 100% -80%, rgba(70,95,250,.06), transparent 70%),
    radial-gradient(800px 260px at -10% 0%, rgba(20,160,120,.05), transparent 60%),
    linear-gradient(180deg, #f9fafb 0%, #f3f5f7 100%);
}

.page-head .title{
  font-size: clamp(1.35rem, 2.2vw, 1.8rem);
  font-weight: 800;
  color: #111827;
}

.page-head .subtitle{
  color: #6b7280;
  font-size: .94rem;
}

.glass{
  background: rgba(255,255,255,.84);
  border: 1px solid rgba(0,0,0,.06);
  border-radius: 16px;
  box-shadow:
    0 8px 24px rgba(0,0,0,.05),
    inset 0 1px 0 rgba(255,255,255,.4);
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.filters-box{
  padding: .85rem;
}

.card-load,
.card-empty{
  padding: 2rem 1rem;
}

.contract-card{
  transition: transform .18s ease, box-shadow .18s ease;
}

.contract-head{
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(17,24,39,.94) 0%, rgba(17,24,39,.88) 100%);
  color: #fff;
}

.contract-body{
  padding: .75rem;
}

.contract-name{
  font-size: 1rem;
  font-weight: 800;
}

.contract-meta{
  color: rgba(255,255,255,.78);
  font-size: .78rem;
}

.avatar{
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #334155, #1f2937);
  color: #fff;
  flex: 0 0 auto;
}

.bg-gradient-success{
  background: linear-gradient(180deg,#22c55e,#16a34a)!important;
}

.chip{
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  padding: .3rem .55rem;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 1px 2px rgba(0,0,0,.04);
  font-size: .8rem;
  color: #374151;
}

.dot{
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,.18);
  display: inline-block;
}

.dot-d{ background:#c6efce; }
.dot-f{ background:#ffc7ce; }
.dot-m{ background:#ffeb9c; }

.info-pill{
  display: inline-flex;
  align-items: center;
  padding: .35rem .6rem;
  border-radius: 999px;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.12);
  color: #fff;
  font-size: .78rem;
  font-weight: 600;
}

.summary-card{
  border: 1px solid rgba(0,0,0,.06);
  background: #fff;
  border-radius: 12px;
  padding: .65rem .8rem;
  height: 100%;
}

.summary-label{
  font-size: .74rem;
  color: #6b7280;
  margin-bottom: .15rem;
}

.summary-value{
  font-size: 1.1rem;
  font-weight: 800;
  color: #111827;
  line-height: 1.1;
}

.table-empty,
.table-load{
  padding: 1.4rem 1rem;
}

.scroll-horizontal{
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: #9ca3af transparent;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
}

.scroll-horizontal::-webkit-scrollbar{
  height: 8px;
}

.scroll-horizontal::-webkit-scrollbar-thumb{
  background: #9ca3af;
  border-radius: 4px;
}

.tabla-historial{
  width: max-content;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: .74rem;
}

.tabla-historial td,
.tabla-historial th{
  vertical-align: middle;
  padding: .1rem .14rem;
}

.tabla-historial thead th{
  font-size: .68rem;
  font-weight: 800;
  line-height: 1;
}

.dia-head{
  min-width: 42px;
}

.th-turno{
  width: 21px;
  min-width: 21px;
  max-width: 21px;
  font-size: .64rem !important;
  line-height: 1;
  padding: .1rem .08rem !important;
}

.col-categoria{
  width: 100px;
  min-width: 100px;
  max-width: 100px;
}

.col-equipo{
  width: 130px;
  min-width: 130px;
  max-width: 130px;
}

.col-ppu{
  width: 84px;
  min-width: 84px;
  max-width: 84px;
}

.sticky-col,
.sticky-col-2,
.sticky-col-3{
  position: sticky;
  background: #fff;
  z-index: 3;
}

.sticky-col{
  left: 0;
  box-shadow: 1px 0 0 rgba(0,0,0,.05);
}

.sticky-col-2{
  left: 100px;
  box-shadow: 1px 0 0 rgba(0,0,0,.05);
}

.sticky-col-3{
  left: 230px;
  box-shadow: 1px 0 0 rgba(0,0,0,.05);
}

.table thead th.sticky-col,
.table thead th.sticky-col-2,
.table thead th.sticky-col-3{
  z-index: 4;
}

.hist-cell{
  width: 21px;
  min-width: 35px;
  max-width: 30px;
  height: 24px;
  font-weight: 800;
  line-height: 1;
}

.cell-wrap{
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.cell-letter{
  font-weight: 900;
  font-size: .78rem;
  line-height: 1;
}

.tabla-con-comentarios .hist-cell{
  min-width: 66px;
  width: 66px;
  max-width: 66px;
  height: 50px;
}

.tabla-con-comentarios .cell-letter{
  font-size: .74rem;
  margin-bottom: 2px;
}

.cell-comment{
  font-size: .54rem;
  line-height: 1.08;
  max-width: 58px;
  white-space: normal;
  word-break: break-word;
  opacity: .96;
  text-align: center;
}

.categoria-divider-row td{
  padding: 0 !important;
  border-top: 2px solid #cbd5e1 !important;
  border-bottom: 1px solid #cbd5e1 !important;
}

.categoria-divider-cell{
  background: linear-gradient(90deg, #e5e7eb 0%, #f8fafc 100%);
}

.categoria-divider-content{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: .38rem .7rem;
}

.categoria-divider-title{
  font-weight: 800;
  font-size: .76rem;
  color: #111827;
  letter-spacing: .02em;
  text-transform: uppercase;
}

.categoria-divider-badge{
  font-size: .68rem;
  font-weight: 700;
  color: #475569;
  background: #fff;
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 999px;
  padding: .18rem .45rem;
}

.categoria-cell{
  background: #f8fafc !important;
}

.bg-success.text-white{ color: #fff !important; }
.bg-danger.text-white{ color: #fff !important; }
.bg-warning.text-dark{ color: #111 !important; }

.min-w-0{
  min-width: 0;
}

@media (max-width: 991px){
  .col-categoria{
    width: 88px;
    min-width: 88px;
    max-width: 88px;
  }

  .col-equipo{
    width: 112px;
    min-width: 112px;
    max-width: 112px;
  }

  .col-ppu{
    width: 76px;
    min-width: 76px;
    max-width: 76px;
  }

  .sticky-col-2{
    left: 88px;
  }

  .sticky-col-3{
    left: 200px;
  }

  .hist-cell{
    min-width: 19px;
    width: 19px;
    max-width: 19px;
  }

  .th-turno{
    width: 19px;
    min-width: 19px;
    max-width: 19px;
  }
}

@media (max-width: 767px){
  .filters-box{
    padding: .75rem;
  }

  .contract-head{
    padding: 10px 12px;
  }

  .contract-body{
    padding: .55rem;
  }

  .summary-value{
    font-size: 1rem;
  }

  .page-head .subtitle{
    font-size: .88rem;
  }

  .col-categoria{
    width: 80px;
    min-width: 80px;
    max-width: 80px;
  }

  .col-equipo{
    width: 98px;
    min-width: 98px;
    max-width: 98px;
  }

  .col-ppu{
    width: 68px;
    min-width: 68px;
    max-width: 68px;
  }

  .sticky-col-2{
    left: 80px;
  }

  .sticky-col-3{
    left: 178px;
  }

  .tabla-historial{
    font-size: .7rem;
  }

  .hist-cell{
    min-width: 18px;
    width: 18px;
    max-width: 18px;
    height: 20px;
  }

  .cell-letter{
    font-size: .7rem;
  }

  .th-turno{
    width: 18px;
    min-width: 18px;
    max-width: 18px;
    font-size: .6rem !important;
  }

  .tabla-con-comentarios .hist-cell{
    min-width: 56px;
    width: 56px;
    max-width: 56px;
    height: 44px;
  }

  .cell-comment{
    max-width: 50px;
  }

  .categoria-divider-content{
    padding: .32rem .5rem;
  }

  .categoria-divider-title{
    font-size: .7rem;
  }
}
</style>

<script>
export default { name: 'HistorialOperatividadView' }
</script>