<!-- src/views/ActividadContratosView.vue -->
<template>
  <div class="bg-white min-vh-100">
    <div class="container-fluid py-4 px-3">
      <!-- Header -->
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 class="mb-1">Actividad e Inactividad de Contratos</h2>
          <p class="text-muted mb-0">
            Consulta la actividad de contratos activos y detecta equipos o meses sin registros.
          </p>
        </div>

        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-outline-secondary" @click="$router.back()">
            <i class="bi bi-arrow-left-circle me-1"></i> Volver
          </button>

          <button class="btn btn-outline-primary" @click="refrescarVista" :disabled="loading">
            <i class="bi bi-arrow-clockwise me-1"></i> Actualizar
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="errorMsg" class="alert alert-danger border-0 shadow-sm mb-4">
        <div class="d-flex align-items-start gap-2">
          <i class="bi bi-exclamation-octagon-fill fs-5"></i>
          <div>
            <strong>Error al cargar datos</strong>
            <div class="small mt-1">{{ errorMsg }}</div>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-12 col-lg-4">
              <label class="form-label fw-semibold">Contrato</label>
              <select class="form-select" v-model="filtroContratoId" @change="onContratoChange">
                <option value="__ALL_ACTIVE__">Todos los contratos activos</option>
                <option
                  v-for="c in contratosVisibles"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.nombre || `Contrato ${c.id}` }}
                </option>
              </select>
              <div class="small text-muted mt-1">
                No se consideran contratos con <code>activo === false</code>.
              </div>
            </div>

            <div class="col-12 col-lg-3">
              <label class="form-label fw-semibold">Vista</label>
              <select class="form-select" v-model="modoVista">
                <option value="contratos">Por contrato</option>
                <option value="equipos">Por equipo</option>
              </select>
            </div>

            <div class="col-12 col-lg-2">
              <label class="form-label fw-semibold">Modo rango</label>
              <select class="form-select" v-model="modoRango">
                <option value="ultimos">Últimos meses</option>
                <option value="manual">Elegir meses</option>
              </select>
            </div>

            <div class="col-12 col-lg-3" v-if="modoRango === 'ultimos'">
              <label class="form-label fw-semibold">Meses hacia atrás</label>
              <select class="form-select" v-model.number="mesesAtras">
                <option :value="1">1 mes</option>
                <option :value="2">2 meses</option>
                <option :value="3">3 meses</option>
                <option :value="4">4 meses</option>
                <option :value="5">5 meses</option>
                <option :value="6">6 meses</option>
                <option :value="9">9 meses</option>
                <option :value="12">12 meses</option>
              </select>
            </div>

            <div class="col-12 col-lg-4" v-if="modoVista === 'equipos'">
              <label class="form-label fw-semibold">Equipo</label>
              <select class="form-select" v-model="filtroEquipoId">
                <option value="">Todos los equipos</option>
                <option
                  v-for="e in equiposFiltrables"
                  :key="e.id"
                  :value="e.id"
                >
                  {{ e.nombre_equipo || 'Sin nombre' }}{{ e.patente ? ` — ${e.patente}` : '' }}
                </option>
              </select>
            </div>

            <div class="col-12 col-lg-4">
              <label class="form-label fw-semibold">Buscar</label>
              <input
                v-model.trim="textoBusqueda"
                type="text"
                class="form-control"
                placeholder="Buscar por contrato, equipo, patente..."
              />
            </div>

            <div class="col-12 col-lg-4">
              <label class="form-label fw-semibold">Mostrar</label>
              <select class="form-select" v-model="filtroEstadoActividad">
                <option value="todos">Todos</option>
                <option value="sin_actividad">Solo sin actividad</option>
                <option value="con_actividad">Solo con actividad</option>
                <option value="inactivos_3m">Sin actividad 3 meses o más</option>
              </select>
            </div>

            <div class="col-12 col-lg-4 d-flex gap-2 flex-wrap">
              <button class="btn btn-dark" @click="limpiarFiltrosParciales">
                <i class="bi bi-funnel me-1"></i> Limpiar filtros
              </button>

              <button
                class="btn btn-outline-success"
                @click="seleccionarUltimos3Meses"
                v-if="modoRango === 'manual'"
              >
                Seleccionar últimos 3 meses
              </button>
            </div>
          </div>

          <!-- Selección manual -->
          <div v-if="modoRango === 'manual'" class="mt-4">
            <label class="form-label fw-semibold d-block">Meses a considerar</label>

            <div class="d-flex flex-wrap gap-2">
              <button
                v-for="m in mesesDisponibles"
                :key="m.key"
                type="button"
                class="btn btn-sm"
                :class="mesesSeleccionados.includes(m.key) ? 'btn-primary' : 'btn-outline-secondary'"
                @click="toggleMesManual(m.key)"
              >
                {{ m.label }}
              </button>
            </div>

            <div class="small text-muted mt-2">
              Se consultarán solo meses seleccionados dentro del rango calculado.
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <div class="mt-2 text-muted">Cargando actividad...</div>
      </div>

      <div v-else>
        <!-- Resumen -->
        <div class="row g-3 mb-4">
          <div class="col-12 col-md-6 col-xl-3">
            <div class="card border-0 shadow-sm h-100 stat-card">
              <div class="card-body">
                <div class="small text-muted">Selección</div>
                <div class="fw-bold fs-5 text-truncate" :title="tituloSeleccion">
                  {{ tituloSeleccion }}
                </div>
                <div class="small text-muted mt-1">
                  {{ contratosSeleccionados.length }} contrato(s) activo(s)
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6 col-xl-3">
            <div class="card border-0 shadow-sm h-100 stat-card">
              <div class="card-body">
                <div class="small text-muted">Período consultado</div>
                <div class="fw-bold fs-5">{{ etiquetaPeriodo }}</div>
                <div class="small text-muted mt-1">{{ mesesConsiderados.length }} mes(es)</div>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6 col-xl-3">
            <div class="card border-0 shadow-sm h-100 stat-card danger-soft">
              <div class="card-body">
                <div class="small text-muted">
                  {{ modoVista === 'contratos' ? 'Contratos sin actividad' : 'Equipos sin actividad' }}
                </div>
                <div class="fw-bold fs-3 text-danger">{{ resumen.sinActividad }}</div>
                <div class="small text-muted mt-1">Sin registros en el período</div>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6 col-xl-3">
            <div class="card border-0 shadow-sm h-100 stat-card warning-soft">
              <div class="card-body">
                <div class="small text-muted">Inactividad 3 meses o más</div>
                <div class="fw-bold fs-3 text-warning-emphasis">{{ resumen.inactivos3m }}</div>
                <div class="small text-muted mt-1">Seguimiento recomendado</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Alerta -->
        <transition name="alert-pop" appear>
          <div
            v-if="resumen.sinActividad > 0"
            class="alert alert-warning border-0 shadow-sm mb-4"
          >
            <div class="d-flex align-items-start gap-3">
              <i class="bi bi-exclamation-triangle-fill fs-4"></i>
              <div>
                <h5 class="mb-1">Se detectó inactividad</h5>
                <p class="mb-0">
                  Hay <strong>{{ resumen.sinActividad }}</strong>
                  {{ modoVista === 'contratos' ? 'contrato(s)' : 'equipo(s)' }}
                  sin registros en el rango seleccionado.
                </p>
              </div>
            </div>
          </div>
        </transition>

        <!-- Tabla -->
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <strong>
                {{ modoVista === 'contratos' ? 'Detalle por contrato' : 'Detalle por equipo' }}
              </strong>
            </div>
            <div class="small text-muted">
              {{ filasMostradas.length }} resultado(s)
            </div>
          </div>

          <div class="card-body p-0">
            <div v-if="filasMostradas.length === 0" class="p-4 text-center text-muted">
              No se encontraron resultados con los filtros actuales.
            </div>

            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr v-if="modoVista === 'contratos'">
                    <th>Contrato</th>
                    <th class="text-center">Equipos</th>
                    <th class="text-center">Registros</th>
                    <th class="text-center">Meses con actividad</th>
                    <th class="text-center">Meses sin actividad</th>
                    <th class="text-center">Último registro</th>
                    <th class="text-center">Estado</th>
                    <th class="text-center">Acción</th>
                  </tr>

                  <tr v-else>
                    <th>Equipo</th>
                    <th>Patente</th>
                    <th>Contrato</th>
                    <th>Categoría</th>
                    <th class="text-center">Registros</th>
                    <th class="text-center">Meses con actividad</th>
                    <th class="text-center">Meses sin actividad</th>
                    <th class="text-center">Último registro</th>
                    <th class="text-center">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  <tr v-for="row in filasMostradas" :key="row.id">
                    <template v-if="modoVista === 'contratos'">
                      <td>
                        <div class="fw-semibold">{{ row.nombre }}</div>
                        <div class="small text-muted">{{ row.id }}</div>
                      </td>

                      <td class="text-center">
                        <span class="badge text-bg-light border">{{ row.totalEquipos }}</span>
                      </td>

                      <td class="text-center">
                        <span class="badge text-bg-primary">{{ row.totalRegistros }}</span>
                      </td>

                      <td class="text-center">
                        <span class="badge text-bg-success">{{ row.mesesConActividad }}</span>
                      </td>

                      <td class="text-center">
                        <span class="badge text-bg-secondary">{{ row.mesesSinActividad }}</span>
                      </td>

                      <td class="text-center">
                        <span v-if="row.ultimoRegistroTexto">{{ row.ultimoRegistroTexto }}</span>
                        <span v-else class="text-muted">Nunca</span>
                      </td>

                      <td class="text-center">
                        <span class="badge" :class="badgeEstadoClase(row)">
                          {{ row.estadoTexto }}
                        </span>
                      </td>

                      <td class="text-center">
                        <router-link
                          class="btn btn-sm btn-outline-dark"
                          :to="{ name: 'ContratoStats', params: { contratoId: row.id } }"
                        >
                          Ver contrato
                        </router-link>
                      </td>
                    </template>

                    <template v-else>
                      <td>
                        <div class="fw-semibold">{{ row.nombre_equipo || 'Sin nombre' }}</div>
                        <div class="small text-muted">{{ row.id }}</div>
                      </td>

                      <td>{{ row.patente || '—' }}</td>

                      <td>
                        <div>{{ row.contratoNombre || 'Sin contrato' }}</div>
                        <div class="small text-muted">{{ row.contratoId || '—' }}</div>
                      </td>

                      <td>{{ row.categoria || '—' }}</td>

                      <td class="text-center">
                        <span class="badge text-bg-primary">{{ row.totalRegistros }}</span>
                      </td>

                      <td class="text-center">
                        <span class="badge text-bg-success">{{ row.mesesConActividad }}</span>
                      </td>

                      <td class="text-center">
                        <span class="badge text-bg-secondary">{{ row.mesesSinActividad }}</span>
                      </td>

                      <td class="text-center">
                        <span v-if="row.ultimoRegistroTexto">{{ row.ultimoRegistroTexto }}</span>
                        <span v-else class="text-muted">Nunca</span>
                      </td>

                      <td class="text-center">
                        <span class="badge" :class="badgeEstadoClase(row)">
                          {{ row.estadoTexto }}
                        </span>
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Meses -->
        <div class="card border-0 shadow-sm mt-4">
          <div class="card-header bg-white">
            <strong>Meses considerados</strong>
          </div>
          <div class="card-body">
            <div class="d-flex flex-wrap gap-2">
              <span
                v-for="m in mesesConsiderados"
                :key="m.key"
                class="badge text-bg-light border"
              >
                {{ m.label }}
              </span>
            </div>
          </div>
        </div>

        <!-- Nota -->
        <div class="alert alert-light border mt-4 small mb-0">
          Se consideran activos los contratos donde el campo <code>activo</code> no existe o es <code>true</code>.
          Solo se excluyen los que tienen <code>activo === false</code>.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, defineOptions } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  orderBy
} from 'firebase/firestore'
import { db } from '../firebase/config'

defineOptions({ name: 'ActividadContratosView' })

const ALL_ACTIVE_VALUE = '__ALL_ACTIVE__'

/* ===================== STATE ===================== */
const loading = ref(true)
const errorMsg = ref('')
const rolUsuario = ref('')

const contratos = ref([])
const equipos = ref([])
const operatividad = ref([])

const filtroContratoId = ref(ALL_ACTIVE_VALUE)
const filtroEquipoId = ref('')
const textoBusqueda = ref('')
const modoVista = ref('contratos')
const modoRango = ref('ultimos')
const mesesAtras = ref(3)
const filtroEstadoActividad = ref('todos')
const mesesSeleccionados = ref([])

let bootstrapped = false

/* ===================== AUTH ===================== */
async function obtenerUsuarioYRol(currentUser) {
  if (!currentUser) return null
  const snap = await getDoc(doc(db, 'usuarios', currentUser.uid))
  if (!snap.exists()) return null
  return { uid: currentUser.uid, ...snap.data() }
}

/* ===================== FECHAS ===================== */
function inicioDeMes(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function finDeMes(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0)
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1, 0, 0, 0, 0)
}

function monthKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function monthLabel(date) {
  return date.toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric'
  }).replace(/^./, s => s.toUpperCase())
}

function formatearFecha(ts) {
  if (!ts) return ''
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function normalizaTexto(txt = '') {
  return String(txt)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

/* ===================== MESES ===================== */
const mesesDisponibles = computed(() => {
  const hoy = new Date()
  const base = inicioDeMes(hoy)
  const arr = []

  for (let i = 0; i < 12; i++) {
    const d = addMonths(base, -i)
    arr.push({
      key: monthKey(d),
      label: monthLabel(d),
      date: d
    })
  }

  return arr
})

const mesesConsiderados = computed(() => {
  if (modoRango.value === 'ultimos') {
    return mesesDisponibles.value.slice(0, mesesAtras.value)
  }

  const set = new Set(mesesSeleccionados.value)
  return mesesDisponibles.value.filter(m => set.has(m.key))
})

const etiquetaPeriodo = computed(() => {
  if (!mesesConsiderados.value.length) return 'Sin meses seleccionados'

  const arr = [...mesesConsiderados.value].sort((a, b) => a.date - b.date)
  if (arr.length === 1) return arr[0].label
  return `${arr[0].label} → ${arr[arr.length - 1].label}`
})

function toggleMesManual(key) {
  const existe = mesesSeleccionados.value.includes(key)
  if (existe) {
    mesesSeleccionados.value = mesesSeleccionados.value.filter(x => x !== key)
  } else {
    mesesSeleccionados.value = [...mesesSeleccionados.value, key]
  }
}

function seleccionarUltimos3Meses() {
  mesesSeleccionados.value = mesesDisponibles.value.slice(0, 3).map(m => m.key)
}

/* ===================== CONTRATOS ACTIVOS ===================== */
function esContratoActivo(data = {}) {
  if (!Object.prototype.hasOwnProperty.call(data, 'activo')) return true
  return data.activo === true
}

const contratosVisibles = computed(() => contratos.value)

const contratosSeleccionados = computed(() => {
  if (filtroContratoId.value === ALL_ACTIVE_VALUE) return contratos.value
  return contratos.value.filter(c => String(c.id) === String(filtroContratoId.value))
})

const contratoSeleccionado = computed(() => {
  if (filtroContratoId.value === ALL_ACTIVE_VALUE) return null
  return contratos.value.find(c => String(c.id) === String(filtroContratoId.value)) || null
})

const tituloSeleccion = computed(() => {
  if (filtroContratoId.value === ALL_ACTIVE_VALUE) return 'Todos los contratos activos'
  return contratoSeleccionado.value?.nombre || 'Contrato seleccionado'
})

/* ===================== CARGA ===================== */
async function cargarTodo() {
  loading.value = true
  errorMsg.value = ''

  try {
    const auth = getAuth()
    const currentUser = auth.currentUser

    if (!currentUser) {
      contratos.value = []
      equipos.value = []
      operatividad.value = []
      return
    }

    const usuario = await obtenerUsuarioYRol(currentUser)
    rolUsuario.value = usuario?.rol || ''

    await cargarContratos(usuario)

    if (!contratos.value.length) {
      equipos.value = []
      operatividad.value = []
      return
    }

    // si el contrato seleccionado ya no existe, volver a "todos activos"
    const existeSeleccion = filtroContratoId.value === ALL_ACTIVE_VALUE
      || contratos.value.some(c => String(c.id) === String(filtroContratoId.value))

    if (!existeSeleccion) {
      filtroContratoId.value = ALL_ACTIVE_VALUE
    }

    await cargarEquiposSegunFiltro()
    await cargarOperatividadSegunFiltro()
  } catch (error) {
    console.error('Error cargando vista:', error)
    errorMsg.value = error?.message || 'No se pudieron cargar los datos.'
    equipos.value = []
    operatividad.value = []
  } finally {
    loading.value = false
  }
}

async function refrescarVista() {
  await cargarTodo()
}

async function cargarContratos(usuario) {
  if (!usuario) {
    contratos.value = []
    return
  }

  const rol = (usuario.rol || '').toLowerCase()

  const contratosSnap = await getDocs(collection(db, 'contratos'))
  let lista = contratosSnap.docs.map(d => {
    const data = d.data() || {}
    return {
      id: String(d.id),
      ...data
    }
  })

  // solo activos
  lista = lista.filter(c => esContratoActivo(c))

  if (rol === 'admin' || rol === 'visualizador') {
    contratos.value = lista.sort((a, b) =>
      String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' })
    )
    return
  }

  const asignados = Array.isArray(usuario.contratosAsignados)
    ? usuario.contratosAsignados.map(x => String(x))
    : []

  contratos.value = lista
    .filter(c => asignados.includes(String(c.id)))
    .sort((a, b) =>
      String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' })
    )
}

async function cargarEquiposSegunFiltro() {
  const contratosIds = contratosSeleccionados.value.map(c => String(c.id))
  if (!contratosIds.length) {
    equipos.value = []
    return
  }

  // Firestore no deja where in con muchísimos ids libremente; aquí hacemos estrategia híbrida.
  // Si es un contrato puntual, query directa.
  // Si son todos, leemos equipos y filtramos local por contratos activos permitidos.
  try {
    if (contratosIds.length === 1) {
      try {
        const qe = query(
          collection(db, 'equipos'),
          where('contratoId', '==', contratosIds[0]),
          orderBy('nombre_equipo', 'asc')
        )
        const snap = await getDocs(qe)
        equipos.value = snap.docs
          .map(d => ({ id: String(d.id), ...d.data() }))
          .filter(e =>
            e?.oculto !== true &&
            e?.visible !== false &&
            e?.visible_actual !== false
          )
        return
      } catch {
        const qe = query(
          collection(db, 'equipos'),
          where('contratoId', '==', contratosIds[0])
        )
        const snap = await getDocs(qe)
        equipos.value = snap.docs
          .map(d => ({ id: String(d.id), ...d.data() }))
          .filter(e =>
            e?.oculto !== true &&
            e?.visible !== false &&
            e?.visible_actual !== false
          )
          .sort((a, b) =>
            String(a.nombre_equipo || '').localeCompare(String(b.nombre_equipo || ''), 'es', { sensitivity: 'base' })
          )
        return
      }
    }

    // todos los contratos activos visibles
    const snap = await getDocs(collection(db, 'equipos'))
    const contratosSet = new Set(contratosIds)

    equipos.value = snap.docs
      .map(d => ({ id: String(d.id), ...d.data() }))
      .filter(e =>
        contratosSet.has(String(e.contratoId)) &&
        e?.oculto !== true &&
        e?.visible !== false &&
        e?.visible_actual !== false
      )
      .sort((a, b) =>
        String(a.nombre_equipo || '').localeCompare(String(b.nombre_equipo || ''), 'es', { sensitivity: 'base' })
      )
  } catch (error) {
    console.error('Error cargando equipos:', error)
    errorMsg.value = 'No se pudieron cargar los equipos.'
    equipos.value = []
  }
}

async function cargarOperatividadSegunFiltro() {
  const contratosIds = contratosSeleccionados.value.map(c => String(c.id))
  if (!contratosIds.length || !mesesConsiderados.value.length) {
    operatividad.value = []
    return
  }

  const ordenados = [...mesesConsiderados.value].sort((a, b) => a.date - b.date)
  const fechaInicio = inicioDeMes(ordenados[0].date)
  const fechaFin = finDeMes(ordenados[ordenados.length - 1].date)
  const mesesKeys = new Set(mesesConsiderados.value.map(m => m.key))
  const contratosSet = new Set(contratosIds)

  try {
    // Caso 1: un contrato puntual => query optimizada
    if (contratosIds.length === 1) {
      const qy = query(
        collection(db, 'operatividad'),
        where('contratoId', '==', contratosIds[0]),
        where('fecha', '>=', fechaInicio),
        where('fecha', '<', fechaFin),
        orderBy('fecha', 'asc')
      )

      const snap = await getDocs(qy)
      operatividad.value = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => {
          const f = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha)
          return mesesKeys.has(monthKey(f))
        })
      return
    }

    // Caso 2: todos los contratos activos => rango por fecha + filtro local por contrato activo visible
    // Sigue siendo más pesado que un contrato, pero evita incluir inactivos.
    const qy = query(
      collection(db, 'operatividad'),
      where('fecha', '>=', fechaInicio),
      where('fecha', '<', fechaFin),
      orderBy('fecha', 'asc')
    )

    const snap = await getDocs(qy)
    operatividad.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(r => {
        const contratoId = String(r.contratoId || '')
        if (!contratosSet.has(contratoId)) return false
        const f = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha)
        return mesesKeys.has(monthKey(f))
      })
  } catch (error) {
    console.error('Error cargando operatividad:', error)
    errorMsg.value = 'No se pudo cargar la operatividad. Si Firestore lo pide, crea el índice compuesto correspondiente.'
    operatividad.value = []
  }
}

/* ===================== HELPERS MAP ===================== */
const equiposFiltrables = computed(() => {
  return equipos.value
})

const contratoMap = computed(() => {
  const map = {}
  for (const c of contratos.value) map[String(c.id)] = c
  return map
})

const equiposPorContratoMap = computed(() => {
  const map = {}
  for (const e of equipos.value) {
    const contratoId = String(e.contratoId || '')
    if (!map[contratoId]) map[contratoId] = []
    map[contratoId].push(e)
  }
  return map
})

const operPorContratoMap = computed(() => {
  const map = {}
  for (const r of operatividad.value) {
    const contratoId = String(r.contratoId || '')
    if (!map[contratoId]) map[contratoId] = []
    map[contratoId].push(r)
  }
  return map
})

const operPorEquipoMap = computed(() => {
  const map = {}
  for (const r of operatividad.value) {
    const equipoId = String(r.equipoId || '')
    if (!map[equipoId]) map[equipoId] = []
    map[equipoId].push(r)
  }
  return map
})

/* ===================== FILAS CONTRATOS ===================== */
const filasContratos = computed(() => {
  const mesesKeys = mesesConsiderados.value.map(m => m.key)

  return contratosSeleccionados.value.map(c => {
    const regs = operPorContratoMap.value[String(c.id)] || []
    const equiposContrato = equiposPorContratoMap.value[String(c.id)] || []

    const mesesActivosSet = new Set()
    let ultimoRegistro = null

    for (const r of regs) {
      const f = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha)
      mesesActivosSet.add(monthKey(f))
      if (!ultimoRegistro || f > ultimoRegistro) ultimoRegistro = f
    }

    const mesesConActividad = mesesActivosSet.size
    const mesesSinActividad = Math.max(0, mesesKeys.length - mesesConActividad)
    const sinActividad = regs.length === 0
    const inactivo3m = mesesSinActividad >= 3 && mesesKeys.length >= 3

    return {
      id: String(c.id),
      nombre: c.nombre || `Contrato ${c.id}`,
      totalEquipos: equiposContrato.length,
      totalRegistros: regs.length,
      mesesConActividad,
      mesesSinActividad,
      ultimoRegistro,
      ultimoRegistroTexto: ultimoRegistro ? formatearFecha(ultimoRegistro) : '',
      sinActividad,
      inactivo3m,
      estadoTexto: sinActividad
        ? (inactivo3m ? 'Sin actividad 3M+' : 'Sin actividad')
        : 'Con actividad'
    }
  })
})

/* ===================== FILAS EQUIPOS ===================== */
const filasEquipos = computed(() => {
  const mesesKeys = mesesConsiderados.value.map(m => m.key)

  return equipos.value.map(e => {
    const regs = operPorEquipoMap.value[String(e.id)] || []
    const mesesActivosSet = new Set()
    let ultimoRegistro = null

    for (const r of regs) {
      const f = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha)
      mesesActivosSet.add(monthKey(f))
      if (!ultimoRegistro || f > ultimoRegistro) ultimoRegistro = f
    }

    const mesesConActividad = mesesActivosSet.size
    const mesesSinActividad = Math.max(0, mesesKeys.length - mesesConActividad)
    const sinActividad = regs.length === 0
    const inactivo3m = mesesSinActividad >= 3 && mesesKeys.length >= 3
    const contrato = contratoMap.value[String(e.contratoId)] || null

    return {
      id: String(e.id),
      nombre_equipo: e.nombre_equipo || '',
      patente: e.patente || '',
      categoria: e.categoria || '',
      contratoId: String(e.contratoId || ''),
      contratoNombre: contrato?.nombre || '',
      totalRegistros: regs.length,
      mesesConActividad,
      mesesSinActividad,
      ultimoRegistro,
      ultimoRegistroTexto: ultimoRegistro ? formatearFecha(ultimoRegistro) : '',
      sinActividad,
      inactivo3m,
      estadoTexto: sinActividad
        ? (inactivo3m ? 'Sin actividad 3M+' : 'Sin actividad')
        : 'Con actividad'
    }
  })
})

/* ===================== FILTRADO ===================== */
const filasBase = computed(() => (
  modoVista.value === 'contratos' ? filasContratos.value : filasEquipos.value
))

const filasMostradas = computed(() => {
  let rows = [...filasBase.value]

  if (modoVista.value === 'equipos' && filtroEquipoId.value) {
    rows = rows.filter(r => String(r.id) === String(filtroEquipoId.value))
  }

  const q = normalizaTexto(textoBusqueda.value)
  if (q) {
    rows = rows.filter(r => {
      if (modoVista.value === 'contratos') {
        return normalizaTexto(`${r.nombre} ${r.id}`).includes(q)
      }

      return normalizaTexto(
        `${r.nombre_equipo} ${r.patente} ${r.categoria} ${r.contratoNombre} ${r.contratoId} ${r.id}`
      ).includes(q)
    })
  }

  if (filtroEstadoActividad.value === 'sin_actividad') {
    rows = rows.filter(r => r.sinActividad)
  } else if (filtroEstadoActividad.value === 'con_actividad') {
    rows = rows.filter(r => !r.sinActividad)
  } else if (filtroEstadoActividad.value === 'inactivos_3m') {
    rows = rows.filter(r => r.inactivo3m)
  }

  rows.sort((a, b) => {
    if (a.sinActividad !== b.sinActividad) return a.sinActividad ? -1 : 1

    const nameA = modoVista.value === 'contratos'
      ? String(a.nombre || '')
      : String(a.nombre_equipo || '')
    const nameB = modoVista.value === 'contratos'
      ? String(b.nombre || '')
      : String(b.nombre_equipo || '')

    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
  })

  return rows
})

/* ===================== RESUMEN ===================== */
const resumen = computed(() => {
  const total = filasMostradas.value.length
  const sinActividad = filasMostradas.value.filter(x => x.sinActividad).length
  const inactivos3m = filasMostradas.value.filter(x => x.inactivo3m).length

  return {
    total,
    sinActividad,
    inactivos3m
  }
})

/* ===================== UI HELPERS ===================== */
function badgeEstadoClase(row) {
  if (row.sinActividad && row.inactivo3m) return 'text-bg-danger'
  if (row.sinActividad) return 'text-bg-warning'
  return 'text-bg-success'
}

function limpiarFiltrosParciales() {
  filtroEquipoId.value = ''
  textoBusqueda.value = ''
  filtroEstadoActividad.value = 'todos'
  modoVista.value = 'contratos'
  modoRango.value = 'ultimos'
  mesesAtras.value = 3
  mesesSeleccionados.value = mesesDisponibles.value.slice(0, 3).map(m => m.key)
}

async function onContratoChange() {
  filtroEquipoId.value = ''
  textoBusqueda.value = ''
  await cargarEquiposSegunFiltro()
  await cargarOperatividadSegunFiltro()
}

/* ===================== WATCHERS CONTROLADOS ===================== */
watch([modoRango, mesesAtras], async () => {
  if (!bootstrapped) return
  await cargarOperatividadSegunFiltro()
})

watch(mesesSeleccionados, async () => {
  if (!bootstrapped) return
  if (modoRango.value !== 'manual') return
  if (!mesesSeleccionados.value.length) {
    operatividad.value = []
    return
  }
  await cargarOperatividadSegunFiltro()
}, { deep: true })

/* ===================== INIT ===================== */
onMounted(async () => {
  if (mesesSeleccionados.value.length === 0) {
    mesesSeleccionados.value = mesesDisponibles.value.slice(0, 3).map(m => m.key)
  }

  const auth = getAuth()

  await new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, async () => {
      unsub()
      await cargarTodo()
      bootstrapped = true
      resolve()
    })
  })
})
</script>

<style scoped>
.stat-card {
  border-radius: 16px;
}

.danger-soft {
  background: linear-gradient(180deg, #fff, #fff5f5);
}

.warning-soft {
  background: linear-gradient(180deg, #fff, #fffaf0);
}

.card {
  border-radius: 16px;
}

.table > :not(caption) > * > * {
  padding: 0.8rem 0.75rem;
}

.alert-pop-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(.98);
  filter: blur(1px);
}
.alert-pop-enter-active {
  transition: all .35s cubic-bezier(.2,.8,.2,1);
}
.alert-pop-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}
.alert-pop-leave-from {
  opacity: 1;
}
.alert-pop-leave-active {
  transition: all .2s ease;
}
.alert-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>