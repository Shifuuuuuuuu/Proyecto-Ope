<template>
  <div class="container py-4">
    <!-- Overlay de exportación -->
    <div v-if="exportandoXLSX" class="export-overlay">
      <div class="export-box text-center">
        <div class="spinner-border text-light" role="status"></div>
        <div class="mt-3 fw-semibold text-white">Generando Excel…</div>
        <div class="small text-white-50">Esto puede tardar según la cantidad de meses.</div>
      </div>
    </div>

    <div class="d-flex align-items-center justify-content-between mb-3">
      <h3 class="mb-0">Estadísticas del Contrato</h3>
      <div class="d-flex flex-wrap align-items-center gap-2">
        <button class="btn btn-outline-secondary" @click="$router.back()">← Volver</button>
        <button class="btn btn-outline-secondary" @click="toggleKpis">
          {{ showKpis ? 'Ocultar KPIs' : 'Mostrar KPIs' }}
        </button>
      </div>
    </div>

    <!-- Header / Nombre contrato -->
    <div class="card mb-3">
      <div class="card-body d-flex flex-wrap align-items-center gap-3 w-100">
        <div class="me-auto">
          <div class="text-muted small">Contrato</div>
          <div class="fw-semibold">{{ contratoNombre || '—' }}</div>
          <div class="small text-muted mt-1">
            Período: <strong>{{ etiquetaPeriodo }}</strong> · {{ rangoTexto }}
          </div>
        </div>

        <div class="d-flex flex-wrap align-items-center gap-2">
          <select class="form-select" style="width:auto" v-model.number="filtroMes">
            <option v-for="m in 12" :key="m" :value="m-1">{{ mesesCorto[m-1] }}</option>
          </select>
          <select class="form-select" style="width:auto" v-model.number="filtroAnio">
            <option v-for="y in aniosDisponibles" :key="y" :value="y">{{ y }}</option>
          </select>
          <button class="btn btn-primary" @click="refrescar">Actualizar</button>
          <button
            class="btn btn-outline-primary"
            @click="exportarXLSXHistorico"
            :disabled="exportandoXLSX"
            title="Exporta un resumen por meses y una hoja diaria por cada mes"
          >
            <span v-if="exportandoXLSX" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            <span>{{ exportandoXLSX ? 'Generando…' : 'Excel (histórico)' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- KPIs básicos -->
    <div class="row g-3 mb-3">
      <div class="col-12 col-md-2">
        <div class="card h-100"><div class="card-body">
          <div class="text-muted small">Días del mes</div>
          <div class="display-6">{{ diasDelMes }}</div>
        </div></div>
      </div>
      <div class="col-12 col-md-3">
        <div class="card h-100"><div class="card-body">
          <div class="text-muted small">Días considerados</div>
          <div class="display-6">{{ diasConsideradosEnMes }}</div>
          <div class="text-muted small">{{ soloHabiles ? 'lun–vie' : 'lun–dom' }}</div>
        </div></div>
      </div>
      <div class="col-12 col-md-3">
        <div class="card h-100"><div class="card-body">
          <div class="text-muted small">Día considerado actual</div>
          <div class="display-6">{{ diaHabilActual ?? '—' }}</div>
          <div class="text-muted small">en {{ mesesCorto[filtroMes] }}</div>
        </div></div>
      </div>
      <div class="col-12 col-md-2">
        <div class="card h-100"><div class="card-body">
          <div class="text-muted small">Equipos</div>
          <div class="display-6">{{ equiposTotales }}</div>
        </div></div>
      </div>
    </div>

    <!-- Calidad de registro / FS -->
    <div class="row g-3 mb-3">
      <div class="col-12 col-md-3">
        <div class="card h-100"><div class="card-body">
          <div class="text-muted small">Turnos con registro</div>
          <div class="display-6">{{ totalRegistros }}</div>
          <div class="text-muted small">D+F+M</div>
        </div></div>
      </div>
      <div class="col-12 col-md-3">
        <div class="card h-100"><div class="card-body">
          <div class="text-muted small">Turnos sin registro</div>
          <div class="display-6">{{ turnosSinRegistro }}</div>
        </div></div>
      </div>
      <div class="col-12 col-md-3">
        <div class="card h-100"><div class="card-body">
          <div class="text-muted small">FS programada (%)</div>
          <div class="display-6">{{ fsProgramadaPct }}%</div>
          <div class="text-muted small">
            (M en bloques de ≥ 2 días) / (equipos × días considerados × 2)
          </div>
        </div></div>
      </div>
      <div class="col-12 col-md-3">
        <div class="card h-100"><div class="card-body">
          <div class="text-muted small">FS imprevista (%)</div>
          <div class="display-6">{{ fsImprevistaPct }}%</div>
          <div class="text-muted small">
            (F + M fuera de bloques) / (equipos × días considerados × 2)
          </div>
        </div></div>
      </div>
    </div>

    <!-- Gráfico torta -->
    <div class="card mb-3">
      <div class="card-header bg-dark text-white">Distribución de estados (D / F / M)</div>
      <div class="card-body">
        <div class="text-center" v-show="cargando"><div class="spinner-border text-secondary"></div></div>
        <div class="chart-sm mx-auto" v-show="!cargando">
          <canvas ref="chartEl"></canvas>
        </div>
        <div class="mt-3 small text-muted">
          * Los turnos teóricos consideran
          <strong>{{ soloHabiles ? 'días hábiles (lun–vie)' : 'todos los días (lun–dom)' }}</strong> × 2.
        </div>
      </div>
    </div>

    <!-- Gráfico línea -->
    <div class="card mb-3">
      <div class="card-header">Disponibilidad diaria (%)</div>
      <div class="card-body">
        <canvas ref="chartLineEl" height="120"></canvas>
        <div class="small text-muted mt-2">
          % por día = D(día) / (equipos × 2) × 100.
          {{ soloHabiles ? '(Fines de semana omitidos)' : '(Incluye fines de semana)' }}.
          Si no hay registros, se grafica 0.
        </div>
      </div>
    </div>

    <!-- Detalle por categoría -->
    <div class="card mb-3">
      <div class="card-header">Detalle por categoría</div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover table-sm align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Categoría</th>
                <th class="text-end">Equipos</th>
                <th class="text-end">Turnos teóricos</th>
                <th class="text-end">D</th>
                <th class="text-end">F</th>
                <th class="text-end">M</th>
                <th class="text-end">% Real</th>
                <th class="text-end">% Teórico</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in categoriaStats" :key="row.categoria">
                <td class="fw-semibold">{{ row.categoria }}</td>
                <td class="text-end">{{ row.equipos }}</td>
                <td class="text-end">{{ row.turnosTeoricos }}</td>
                <td class="text-end">{{ row.D }}</td>
                <td class="text-end">{{ row.F }}</td>
                <td class="text-end">{{ row.M }}</td>
                <td class="text-end">
                  {{ row.pctReal }}%
                  <div class="progress" style="height:6px;"><div class="progress-bar" :style="{width: row.pctReal + '%'}"></div></div>
                </td>
                <td class="text-end">
                  {{ row.pctTeorica }}%
                  <div class="progress" style="height:6px;"><div class="progress-bar" :style="{width: row.pctTeorica + '%'}"></div></div>
                </td>
              </tr>
              <tr class="table-light fw-semibold">
                <td>Total / Global</td>
                <td class="text-end">{{ equiposTotales }}</td>
                <td class="text-end">{{ turnosTeoricosTotales }}</td>
                <td class="text-end">{{ totalD }}</td>
                <td class="text-end">{{ totalF }}</td>
                <td class="text-end">{{ totalM }}</td>
                <td class="text-end">{{ disponibilidadReal }}%</td>
                <td class="text-end">{{ disponibilidadTeoricaGlobal }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- KRI: metas por categoría -->
    <div class="card mb-3">
      <div class="card-header">KRI por categoría vs metas del contrato</div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover table-sm align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Categoría</th>
                <th class="text-end">Requeridos</th>
                <th class="text-end">Mínimo op.</th>
                <th class="text-end">Actual</th>
                <th class="text-end">Cumple cantidad</th>
                <th class="text-end">Meta disp. (%)</th>
                <th class="text-end">Disp. real (%)</th>
                <th class="text-end">Cumpl. vs mínimo</th>
                <th class="text-end">Cumple disp.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in kriPorCategoria" :key="row.categoria">
                <td class="fw-semibold">{{ row.categoria }}</td>
                <td class="text-end">{{ row.requeridos ?? '—' }}</td>
                <td class="text-end">{{ row.minimoOperativo ?? '—' }}</td>
                <td class="text-end">{{ Number(row.actual ?? 0).toFixed(2) }}</td>
                <td class="text-end">
                  <span class="badge" :class="row.okCantidad ? 'bg-success' : 'bg-danger'">
                    {{ row.okCantidad ? 'OK' : 'ALERTA' }}
                  </span>
                </td>
                <td class="text-end">{{ row.metaDispPct != null ? row.metaDispPct + '%' : '—' }}</td>
                <td class="text-end">{{ row.dispRealPct }}%</td>
                <td class="text-end">
                  <template v-if="row.cmpMinDisplay === 'OK'">
                    <span class="badge bg-success">OK</span>
                  </template>
                  <template v-else-if="row.cmpMinDisplay !== '—'">
                    {{ row.cmpMinDisplay }}
                    <div class="progress" style="height:6px;">
                      <div class="progress-bar" :style="{ width: Math.min(row.cmpMinPct ?? 0, 100) + '%' }"></div>
                    </div>
                  </template>
                  <template v-else>—</template>
                </td>
                <td class="text-end">
                  <span class="badge" :class="row.okDisp ? 'bg-success' : 'bg-danger'">
                    {{ row.okDisp ? 'OK' : 'ALERTA' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="small text-muted p-3">
          Requeridos = <code>meta_total</code>. · Mínimo op. = <code>minimo_operativo</code>.<br>
          <strong>Actual</strong> = <em>promedio diario</em> de equipos con <u>ambos turnos D</u> (día completo) en el mes.<br>
          Meta disp. (%) = <code>minimo_operativo / meta_total</code> × 100.<br>
          <strong>Cumpl. vs mínimo</strong> = (Actual / Mínimo op.) × 100. Si ≥100, “OK”; si &lt;100, se muestra el %.
        </div>
      </div>
    </div>

    <!-- KPIs por equipo (lazy) -->
    <div class="card mb-3" v-if="showKpis">
      <div class="card-header">KPIs por equipo (MTBI / MTTR)</div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Equipo</th>
                <th>Categoría</th>
                <th class="text-end">D</th>
                <th class="text-end">F</th>
                <th class="text-end">M</th>
                <th class="text-end">Horas operación</th>
                <th class="text-end">Paradas (F+M)</th>
                <th class="text-end">Horas indisponibilidad</th>
                <th class="text-end">MTBI (h)</th>
                <th class="text-end">MTTR (h)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in kpisPorEquipo" :key="r.id">
                <td>{{ r.nombre }}</td>
                <td>{{ r.categoria }}</td>
                <td class="text-end">{{ r.D }}</td>
                <td class="text-end">{{ r.F }}</td>
                <td class="text-end">{{ r.M }}</td>
                <td class="text-end">{{ r.horasOperacion }}</td>
                <td class="text-end">{{ r.paradas }}</td>
                <td class="text-end">{{ r.horasIndisponibilidad }}</td>
                <td class="text-end">{{ r.MTBI }}</td>
                <td class="text-end">{{ r.MTTR }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="small text-muted p-3">
          <strong>Definiciones:</strong> MTBI = Horas de operación / Paradas (F+M).
          MTTR = Horas de indisponibilidad / Paradas (F+M).<br>
          Horas operación = D × {{ HOURS_PER_TURNO_UI }}; Horas indisponibilidad = (F+M) × {{ HOURS_PER_TURNO_UI }}.
          <br><em>* Si no hubo paradas, se muestra “SIN PARADAS”.</em>
        </div>
      </div>
    </div>

    <!-- Ranking equipos -->
    <div class="card">
      <div class="card-header">Top 10 equipos con más no-operativos (F+M)</div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>#</th>
                <th>Equipo</th>
                <th>Categoría</th>
                <th class="text-end">D</th>
                <th class="text-end">F</th>
                <th class="text-end">M</th>
                <th class="text-end">% Disponible</th>
                <th class="text-end">% No-operativo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rankingNoOperativo" :key="r.id">
                <td>{{ i + 1 }}</td>
                <td>{{ r.nombre }}</td>
                <td>{{ r.categoria }}</td>
                <td class="text-end">{{ r.D }}</td>
                <td class="text-end">{{ r.F }}</td>
                <td class="text-end">{{ r.M }}</td>
                <td class="text-end">{{ r.pctDisp }}%</td>
                <td class="text-end">{{ r.pctNoOp }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="small text-muted p-3">
          % por equipo = sobre {{ turnosDelMes }} turnos teóricos
          ({{ soloHabiles ? 'días hábiles' : 'todos los días' }} × 2).
        </div>
      </div>
    </div>

    <!-- Nomenclatura -->
    <div class="card mt-3">
      <div class="card-header">Nomenclatura</div>
      <div class="card-body">
        <ul class="mb-0">
          <li><strong>D</strong>: Disponible</li>
          <li><strong>F</strong>: Fuera de servicio</li>
          <li><strong>M</strong>: Mantención</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, defineProps, nextTick, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'
import { db } from '../firebase/config'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
const exportandoXLSX = ref(false)

/* Props */
const props = defineProps({ contratoId: { type: String, required: true } })

/* === Configuración KPIs === */
const HOURS_PER_TURNO = 12
const USE_OPERATING_HOURS_FOR_MTBI = true
const HOURS_PER_TURNO_UI = HOURS_PER_TURNO
const LABEL_SIN_PARADAS = 'SIN PARADAS'

/* Estado */
const contratoNombre = ref('')
const cargando = ref(false)
const chartEl = ref(null)
const chartLineEl = ref(null)
let chartInstance = null
let chartLineInstance = null

/* Filtros */
const now = new Date()
const filtroMes = ref(now.getMonth())
const filtroAnio = ref(now.getFullYear())
const mesesCorto = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const aniosDisponibles = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

/* Fecha seleccionada */
const inicioFinMes = computed(() => {
  const start = new Date(filtroAnio.value, filtroMes.value, 1, 0, 0, 0, 0)
  const end   = new Date(filtroAnio.value, filtroMes.value + 1, 1, 0, 0, 0, 0)
  return { start, end }
})

/* === Reglas de días por contrato === */
function normalizeStr(s='') {
  return String(s).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim()
}
const CONTRATOS_SOLO_HABILES = new Set([
  'urbano olivar',
  'urbano san bernardo',
  'hormigones',
  'predosificados',
  'predosificado'
])
const soloHabiles = computed(() => {
  const byName = normalizeStr(contratoNombre.value)
  const byId   = normalizeStr(props.contratoId)
  return CONTRATOS_SOLO_HABILES.has(byName) || CONTRATOS_SOLO_HABILES.has(byId)
})

/* Utilidades calendario */
function esFinDeSemana(d) { const w = d.getDay(); return w === 0 || w === 6 }
function contarDiasHabiles(start, end) {
  let cnt = 0
  for (let t = +start; t < +end; t += 86400000) { const d = new Date(t); if (!esFinDeSemana(d)) cnt++ }
  return cnt
}
function contarDiasSegunContrato(start, end) {
  if (soloHabiles.value) return contarDiasHabiles(start, end)
  return Math.round((end - start) / 86400000)
}
function indiceDiaHabil(start, hastaInclusive) {
  let cnt = 0
  for (let t = +start; t <= +hastaInclusive; t += 86400000) {
    const d = new Date(t)
    if (soloHabiles.value ? !esFinDeSemana(d) : true) cnt++
  }
  return cnt
}

/* Calendario KPIs */
const diasDelMes = computed(() => {
  const { start, end } = inicioFinMes.value
  return Math.round((end - start) / 86400000)
})
const diasConsideradosEnMes = computed(() => {
  const { start, end } = inicioFinMes.value
  return contarDiasSegunContrato(start, end)
})
const turnosDelMes = computed(() => diasConsideradosEnMes.value * 2)
const etiquetaPeriodo = computed(() => `${mesesCorto[filtroMes.value]} ${filtroAnio.value}`)
const rangoTexto = computed(() => {
  const { start, end } = inicioFinMes.value
  const fin = new Date(end.getTime() - 1)
  const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
  return `${fmt(start)} al ${fmt(fin)}`
})
const diaHabilActual = computed(() => {
  const { start, end } = inicioFinMes.value
  const hoy = new Date()
  if (hoy < start || hoy >= end) return null
  return indiceDiaHabil(start, hoy)
})

/* Acumulados globales */
const totalD = ref(0)
const totalF = ref(0)
const totalM = ref(0)
const totalRegistros = computed(() => totalD.value + totalF.value + totalM.value)
const disponibilidadReal = computed(() => {
  const t = totalRegistros.value
  return t ? ((totalD.value / t) * 100).toFixed(2) : '0.00'
})

/* Equipos / categorías */
const equipos = ref([])
const equiposTotales = computed(() => equipos.value.length)
const categoriaStats = ref([])
const turnosTeoricosTotales = computed(() =>
  categoriaStats.value.reduce((acc, r) => acc + r.turnosTeoricos, 0)
)
const disponibilidadTeoricaGlobal = computed(() => {
  const teor = turnosTeoricosTotales.value
  return teor ? ((totalD.value / teor) * 100).toFixed(2) : '0.00'
})
const turnosSinRegistro = computed(() => Math.max(0, turnosTeoricosTotales.value - totalRegistros.value))

/* Serie diaria y ranking */
const serieDisponibilidadDiaria = ref([])
const rankingNoOperativo = ref([])

/* Metas por categoría */
const metasPorCategoria = ref({})

/* KPIs por equipo (lazy) */
const kpisPorEquipo = ref([])
const showKpis = ref(false)
const kpisLoaded = ref(false)
const arrEqCache = ref([])

/* KRI por categoría */
const kriPorCategoria = ref([])

/* FS */
const fsProgramadaPct = ref('0.00')
const fsImprevistaPct = ref('0.00')

/* Helpers */
function normalizarCategoria(x) {
  const s = String(x || 'SIN CATEGORÍA').trim()
  if (!s) return 'SIN CATEGORÍA'
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function clasificarEstado(estadoRaw = '') {
  const e = String(estadoRaw || '').toUpperCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
  const s = e.replace(/\s+/g, '')
  if (s.startsWith('D') || s.includes('DISP') || s.includes('OPERAT') || s === 'OP' || s === 'OK' || s.includes('AVAILABLE')) return 'D'
  if (s.startsWith('F') || s.includes('FUERA') || s.includes('FALLA') || s === 'OFF' || s.includes('OUT')) return 'F'
  if (s.startsWith('M') || s.includes('MANT') || s.includes('MTO') || s.includes('MTTO') || s.includes('MAINT')) return 'M'
  return 'M'
}

/* Firestore */
async function cargarContrato() {
  const snap = await getDoc(doc(db, 'contratos', props.contratoId))
  contratoNombre.value = snap.exists() ? (snap.data().nombre || props.contratoId) : props.contratoId
}
async function cargarMetasContrato() {
  const metas = {}
  const q = query(collection(db, 'operatividad_base'), where('contratoId', '==', props.contratoId))
  const snap = await getDocs(q)
  snap.forEach(d => {
    const m = d.data()
    const cat = normalizarCategoria(m.categoria)
    const total = Number(m?.meta_total) || 0
    const minimo = Number(m?.minimo_operativo) || 0
    const metaDisponibilidadPct = total > 0 ? Number(((minimo / total) * 100).toFixed(2)) : null
    metas[cat] = { requiereCantidad: total, metaDisponibilidadPct, minimoOperativo: minimo }
  })
  metasPorCategoria.value = metas
}
async function cargarEquipos() {
  equipos.value = []
  const qeq = query(collection(db, 'equipos'), where('contratoId', '==', props.contratoId))
  const se = await getDocs(qeq)
  equipos.value = se.docs.map(d => ({ id: d.id, ...d.data() }))
}

/* Toggle & lazy KPIs */
function toggleKpis() {
  showKpis.value = !showKpis.value
  if (showKpis.value && !kpisLoaded.value) {
    computeKpisFromCache()
  }
}
function computeKpisFromCache() {
  const horasPorTurno = HOURS_PER_TURNO
  const usarHorasOperacion = USE_OPERATING_HOURS_FOR_MTBI
  const kpis = []
  for (const r of arrEqCache.value) {
    const D = r.D || 0
    const F = r.F || 0
    const M = r.M || 0
    const paradas = F + M
    const horasOperacion = (usarHorasOperacion ? D : (D + F + M)) * horasPorTurno
    const horasIndisponibilidad = (F + M) * horasPorTurno
    const MTBI = paradas > 0 ? Number((horasOperacion / paradas).toFixed(1)) : LABEL_SIN_PARADAS
    const MTTR = paradas > 0 ? Number((horasIndisponibilidad / paradas).toFixed(1)) : LABEL_SIN_PARADAS
    kpis.push({ id: r.id, nombre: r.nombre, categoria: r.categoria, D, F, M, horasOperacion, paradas, horasIndisponibilidad, MTBI, MTTR })
  }
  kpis.sort((a, b) => {
    const aa = typeof a.MTTR === 'number' ? a.MTTR : -Infinity
    const bb = typeof b.MTTR === 'number' ? b.MTTR : -Infinity
    return bb - aa
  })
  kpisPorEquipo.value = kpis
  kpisLoaded.value = true
}

/* Core */
async function cargarDatos() {
  cargando.value = true
  totalD.value = totalF.value = totalM.value = 0
  categoriaStats.value = []
  serieDisponibilidadDiaria.value = []
  rankingNoOperativo.value = []
  kpisPorEquipo.value = []
  kriPorCategoria.value = []
  fsProgramadaPct.value = '0.00'
  fsImprevistaPct.value = '0.00'

  const { start, end } = inicioFinMes.value
  const dias = diasDelMes.value || 0
  const diasCons = diasConsideradosEnMes.value || 0
  const turnosMes = Math.max(1, diasCons * 2)

  const basePorCategoria = {}
  const porEquipo = {}
  const equiposPorCategoria = {}
  for (const e of equipos.value) {
    const cat = normalizarCategoria(e.categoria)
    basePorCategoria[cat] ||= { equipos: 0, D: 0, F: 0, M: 0, turnosTeoricos: 0 }
    basePorCategoria[cat].equipos += 1
    ;(equiposPorCategoria[cat] ||= []).push(e.id)
    porEquipo[e.id] = { id: e.id, nombre: e.nombre_equipo || e.patente || e.id, categoria: cat, D: 0, F: 0, M: 0 }
  }
  for (const cat of Object.keys(basePorCategoria)) {
    basePorCategoria[cat].turnosTeoricos = basePorCategoria[cat].equipos * turnosMes
  }

  // Para “día completo”: ambos turnos D
  // dayStates[equipoId][idx] = { A:'D'|'X', B:'D'|'X' }  (X = no disponible o sin registro)
  const dayStates = {}

  const dPorDia = Array.from({ length: dias }, () => null)
  const mapMporEqDia = {}

  const qref = query(
    collection(db, 'operatividad'),
    where('contratoId', '==', props.contratoId),
    where('fecha', '>=', start),
    where('fecha', '<', end)
  )
  const snap = await getDocs(qref)
  for (const docu of snap.docs) {
    const data = docu.data()
    const k = clasificarEstado(data.estado)
    const date = data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha)
    const idx = Math.min(Math.max(date.getDate(), 1), dias) - 1

    // Sólo días válidos según contrato
    const cuentaEsteDia = soloHabiles.value ? !esFinDeSemana(date) : true
    if (!cuentaEsteDia) continue

    const eqId = data.equipoId
    const eqCat = normalizarCategoria((equipos.value.find(e => e.id === eqId)?.categoria) || 'SIN CATEGORÍA')
    const j = (data.jornada || '').toUpperCase().includes('B') ? 'B' : 'A'

    // Totales D/F/M
    if (k === 'D') totalD.value++
    else if (k === 'F') totalF.value++
    else totalM.value++

    basePorCategoria[eqCat] ||= { equipos: 0, D: 0, F: 0, M: 0, turnosTeoricos: 0 }
    basePorCategoria[eqCat][k] += 1

    porEquipo[eqId] ||= { id: eqId, nombre: eqId, categoria: eqCat, D: 0, F: 0, M: 0 }
    porEquipo[eqId][k] += 1

    // Serie diaria: cuenta D (sobre equipos×2)
    if (k === 'D') dPorDia[idx] = (dPorDia[idx] ?? 0) + 1

    // Día completo
    dayStates[eqId] ||= {}
    dayStates[eqId][idx] ||= { A: null, B: null }
    dayStates[eqId][idx][j] = (k === 'D') ? 'D' : 'X'

    // FS programada/imprevista
    if (k === 'M') {
      mapMporEqDia[eqId] ||= {}
      mapMporEqDia[eqId][idx] = (mapMporEqDia[eqId][idx] || 0) + 1
    }
  }

  // Tabla de categorías
  const filas = []
  for (const [cat, v] of Object.entries(basePorCategoria)) {
    const realDen = v.D + v.F + v.M
    const pctReal = realDen ? Number(((v.D / realDen) * 100).toFixed(2)) : 0
    const pctTeor = v.turnosTeoricos ? Number(((v.D / v.turnosTeoricos) * 100).toFixed(2)) : 0
    filas.push({ categoria: cat, equipos: v.equipos, turnosTeoricos: v.turnosTeoricos, D: v.D, F: v.F, M: v.M, pctReal, pctTeorica: pctTeor })
  }
  filas.sort((a, b) => a.categoria.localeCompare(b.categoria, 'es', { sensitivity: 'base' }))
  categoriaStats.value = filas

  // Serie diaria
  const denomDiario = Math.max(1, equiposTotales.value * 2)
  serieDisponibilidadDiaria.value = dPorDia.map((n, i) => {
    const fecha = new Date(filtroAnio.value, filtroMes.value, i + 1)
    if (soloHabiles.value && esFinDeSemana(fecha)) return null
    return Number((((n ?? 0) / denomDiario) * 100).toFixed(2))
  })

  // Ranking equipos y cache KPIs
  const teorEq = turnosMes
  const arrEq = Object.values(porEquipo).map(r => {
    const noOp = r.F + r.M
    const pctDisp = Number(((r.D / teorEq) * 100).toFixed(2))
    const pctNoOp = Number(((noOp / teorEq) * 100).toFixed(2))
    return { ...r, noOp, pctDisp, pctNoOp }
  }).sort((a, b) => b.noOp - a.noOp)
  rankingNoOperativo.value = arrEq.slice(0, 10)
  arrEqCache.value = arrEq
  kpisPorEquipo.value = []
  kpisLoaded.value = false
  showKpis.value = false

  /* ===== “Actual” por día (día completo) por categoría =====
     Para cada día considerado y categoría, contamos cuántos equipos tuvieron A='D' y B='D'.
     Luego Actual = (suma diaria) / (días considerados). */
  const actualFullDayAvgPorCategoria = {}
  const consideredIdx = []
  for (let i = 0; i < dias; i++) {
    const fecha = new Date(filtroAnio.value, filtroMes.value, i + 1)
    if (soloHabiles.value && esFinDeSemana(fecha)) continue
    consideredIdx.push(i)
  }
  for (const [cat, ids] of Object.entries(equiposPorCategoria)) {
    let sumFullDays = 0
    for (const i of consideredIdx) {
      let countCatDay = 0
      for (const id of ids) {
        const st = dayStates[id]?.[i]
        if (st && st.A === 'D' && st.B === 'D') countCatDay++
      }
      sumFullDays += countCatDay
    }
    const avg = diasCons > 0 ? Number((sumFullDays / diasCons).toFixed(2)) : 0
    actualFullDayAvgPorCategoria[cat] = avg
  }

  // KRI por categoría
  const kriRows = categoriaStats.value.map(row => {
    const meta = metasPorCategoria.value[row.categoria] || {}
    const requeridos = Number.isFinite(meta.requiereCantidad) ? meta.requiereCantidad : null
    const minimoOperativo = Number.isFinite(meta.minimoOperativo) ? meta.minimoOperativo : null
    const metaDispPct = Number.isFinite(meta.metaDisponibilidadPct) ? meta.metaDisponibilidadPct : null

    const actualEquivalente = actualFullDayAvgPorCategoria[row.categoria] ?? 0
    const dispRealPct = row.pctReal

    const okCantidad = requeridos == null ? true : (actualEquivalente >= requeridos)
    const okDisp = metaDispPct == null ? true : (dispRealPct >= metaDispPct)

    let cmpMinPct = null
    let cmpMinDisplay = '—'
    let okMinimo = true
    if (Number.isFinite(minimoOperativo) && minimoOperativo > 0) {
      cmpMinPct = Number(((actualEquivalente / minimoOperativo) * 100).toFixed(2))
      okMinimo = cmpMinPct >= 100
      cmpMinDisplay = okMinimo ? 'OK' : `${cmpMinPct.toFixed(2)}%`
    }

    return {
      categoria: row.categoria,
      requeridos,
      minimoOperativo,
      actual: actualEquivalente,
      metaDispPct,
      dispRealPct,
      okCantidad,
      okDisp,
      cmpMinPct,
      cmpMinDisplay,
      okMinimo
    }
  })

  // Categorías con meta pero sin registros
  for (const [cat, meta] of Object.entries(metasPorCategoria.value)) {
    if (!kriRows.some(r => r.categoria === cat)) {
      const requeridos = Number.isFinite(meta.requiereCantidad) ? meta.requiereCantidad : null
      const minimoOperativo = Number.isFinite(meta.minimoOperativo) ? meta.minimoOperativo : null
      const metaDispPct = Number.isFinite(meta.metaDisponibilidadPct) ? meta.metaDisponibilidadPct : null
      const actualEquivalente = 0
      const dispRealPct = 0
      const okCantidad = requeridos == null ? true : (actualEquivalente >= requeridos)
      const okDisp = metaDispPct == null ? true : (dispRealPct >= metaDispPct)
      let cmpMinPct = null
      let cmpMinDisplay = '—'
      let okMinimo = true
      if (Number.isFinite(minimoOperativo) && minimoOperativo > 0) {
        cmpMinPct = 0
        okMinimo = false
        cmpMinDisplay = '0.00%'
      }
      kriRows.push({
        categoria: cat,
        requeridos,
        minimoOperativo,
        actual: actualEquivalente,
        metaDispPct,
        dispRealPct,
        okCantidad,
        okDisp,
        cmpMinPct,
        cmpMinDisplay,
        okMinimo
      })
    }
  }
  kriRows.sort((a, b) => a.categoria.localeCompare(b.categoria, 'es', { sensitivity: 'base' }))
  kriPorCategoria.value = kriRows

  // FS programada / imprevista
  let mProgramadaTurnos = 0
  let mImprevistaTurnos = 0
  for (const mapDias of Object.values(mapMporEqDia)) {
    const isFullM = Array.from({ length: dias }, (_, i) => (mapDias[i] || 0) >= 2)
    const totalMTurnosEq = Object.values(mapDias).reduce((a,b)=>a+b,0)
    const fullMDays = isFullM.filter(Boolean).length
    let parcialesTurnos = totalMTurnosEq - fullMDays * 2
    let i = 0
    while (i < isFullM.length) {
      if (!isFullM[i]) { i++; continue }
      let j = i
      while (j < isFullM.length && isFullM[j]) j++
      const len = j - i
      if (len >= 2) {
        mProgramadaTurnos += 4 // primeros 2 días (4 turnos)
        const extra = (len - 2) * 2
        if (extra > 0) mImprevistaTurnos += extra
      }
      i = j
    }
    if (parcialesTurnos > 0) mImprevistaTurnos += parcialesTurnos
  }
  const totalTurnosTeoricosGlobal = Math.max(1, equiposTotales.value * turnosMes)
  fsProgramadaPct.value = ((mProgramadaTurnos / totalTurnosTeoricosGlobal) * 100).toFixed(2)
  fsImprevistaPct.value = (((mImprevistaTurnos + totalF.value) / totalTurnosTeoricosGlobal) * 100).toFixed(2)

  cargando.value = false
  await nextTick()
  dibujarChart()
  dibujarChartLinea()
}

/* Charts */
function dibujarChart() {
  if (!chartEl.value) return
  const data = [totalD.value, totalF.value, totalM.value]
  if (chartInstance) {
    chartInstance.data.labels = ['Disponible (D)', 'Fuera de servicio (F)', 'Mantención (M)']
    chartInstance.data.datasets[0].data = data
    chartInstance.update()
    return
  }
  const ctx = chartEl.value.getContext('2d')
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Disponible (D)', 'Fuera de servicio (F)', 'Mantención (M)'],
      datasets: [{ data }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: { legend: { position: 'bottom' }, tooltip: {} },
      cutout: '60%'
    }
  })
}
function dibujarChartLinea() {
  if (!chartLineEl.value) return
  const labels = Array.from({ length: diasDelMes.value }, (_, i) => `${i + 1}`)
  const data = serieDisponibilidadDiaria.value
  if (chartLineInstance) {
    chartLineInstance.data.labels = labels
    chartLineInstance.data.datasets[0].data = data
    chartLineInstance.update()
    return
  }
  const ctx = chartLineEl.value.getContext('2d')
  chartLineInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Disponibilidad diaria (%)', data, tension: 0.2, fill: false }] },
    options: {
      responsive: true,
      spanGaps: false,
      scales: { y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } } },
      plugins: { legend: { display: false } }
    }
  })
}

/* ===== Export Excel histórico (xlsx-js-style) ===== */
async function exportarXLSXHistorico() {
  exportandoXLSX.value = true
  try {
    const nDef = 6
    const n = Number(prompt('¿Cuántos meses hacia atrás exportar?', String(nDef)))
    const N = Number.isFinite(n) && n > 0 ? Math.min(24, n) : nDef

    const XLSX = await import(/* @vite-ignore */ 'xlsx-js-style')
      .catch(async () => await import(/* @vite-ignore */ 'xlsx'))

    const wb = XLSX.utils.book_new()
    wb.Workbook = wb.Workbook || {}
    wb.Workbook.CalcPr = { fullCalcOnLoad: true }

    if (!equipos.value.length) await cargarEquipos()
    if (!Object.keys(metasPorCategoria.value).length) await cargarMetasContrato()

    for (let k = 0; k < N; k++) {
      const { y, m } = retrocedeMes(filtroAnio.value, filtroMes.value, k)
      const resumen = await cargarResumenPara(y, m)

      const rows = []
      rows.push([`Estadísticas — ${contratoNombre.value}`])
      rows.push([`Período: ${mesesCorto[m]} ${y}`])
      rows.push([])

      const startResumenHeaderRow = rows.length + 1
      rows.push(['Resumen general'])
      rows.push(['Días mes','Días considerados','Turnos mes','Equipos','D','F','M','% Real','% Teórico','Tiempo disp. %','FS Prog. %','FS Imprev. %'])
      const startResumenDataRow = rows.length + 1
      rows.push([
        resumen.diasMes, resumen.diasConsiderados, resumen.turnosMes, resumen.equipos,
        resumen.D, resumen.F, resumen.M,
        Number(resumen.pctReal), Number(resumen.pctTeor), Number(resumen.tiempoDispPct),
        Number(resumen.fsProgPct), Number(resumen.fsImpPct)
      ])

      rows.push([])
      const startCatHeaderRow = rows.length + 1
      rows.push(['Resumen por categoría'])
      rows.push(['Categoría','Equipos','Turnos teóricos','D','F','M','% Real','% Teórico'])
      const startCatDataRow = rows.length + 1
      resumen.categorias.forEach(r => {
        rows.push([r.categoria, r.equipos, r.turnosTeoricos, r.D, r.F, r.M, Number(r.pctReal), Number(r.pctTeorica)])
      })

      const wsResumen = XLSX.utils.aoa_to_sheet(rows)
      wsResumen['!merges'] = [
        XLSX.utils.decode_range(`A1:L1`),
        XLSX.utils.decode_range(`A2:L2`),
        XLSX.utils.decode_range(`A${startResumenHeaderRow}:L${startResumenHeaderRow}`),
        XLSX.utils.decode_range(`A${startCatHeaderRow}:H${startCatHeaderRow}`)
      ]
      wsResumen['!cols'] = [
        { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
        { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
      ]

      const brand = { dark:'3B4252', gray:'ECEFF4', header:'4C566A', block:'D8DEE9', white:'FFFFFF', blue:'5E81AC' }

      styleRange(wsResumen, `A1`, { font:{ bold:true, sz:16, color:{rgb:brand.white}}, alignment:{horizontal:'center',vertical:'center'}, fill:{patternType:'solid', fgColor:{rgb:brand.dark}} })
      styleRange(wsResumen, `A2`, { font:{ sz:12, color:{rgb:brand.white}}, alignment:{horizontal:'center',vertical:'center'}, fill:{patternType:'solid', fgColor:{rgb:brand.blue}} })

      styleRange(wsResumen, `A${startResumenHeaderRow}`, { font:{ bold:true, sz:12 }, alignment:{ horizontal:'left', vertical:'center' }, fill:{ patternType:'solid', fgColor:{ rgb:brand.block } } })
      styleRow(wsResumen, startResumenHeaderRow + 1, { font:{ bold:true, color:{rgb:brand.white}}, alignment:{horizontal:'center',vertical:'center'}, fill:{patternType:'solid',fgColor:{rgb:brand.header}}, border: allThinBorders() }, 12)
      styleRow(wsResumen, startResumenDataRow, { alignment:{horizontal:'center',vertical:'center'}, border: allThinBorders() }, 12)
      percentCols(wsResumen, startResumenDataRow, ['H','I','J','K','L'])

      styleRange(wsResumen, `A${startCatHeaderRow}`, { font:{ bold:true, sz:12 }, alignment:{ horizontal:'left', vertical:'center' }, fill:{ patternType:'solid', fgColor:{ rgb:brand.block } } })
      styleRow(wsResumen, startCatHeaderRow + 1, { font:{ bold:true, color:{rgb:brand.white}}, alignment:{horizontal:'center',vertical:'center'}, fill:{patternType:'solid',fgColor:{rgb:brand.header}}, border: allThinBorders() }, 8)

      for (let r = startCatDataRow; r < startCatDataRow + resumen.categorias.length; r++) {
        styleRow(wsResumen, r, { alignment:{horizontal:'center',vertical:'center'}, border: allThinBorders() }, 8)
        if ((r - startCatDataRow) % 2 === 1) { fillRow(wsResumen, r, { patternType:'solid', fgColor:{ rgb:brand.gray } }, 8) }
        percentCols(wsResumen, r, ['G','H'])
      }

      wsResumen['!rows'] = wsResumen['!rows'] || []
      wsResumen['!rows'][0] = { hpt: 26 }
      wsResumen['!rows'][1] = { hpt: 20 }

      XLSX.utils.book_append_sheet(wb, wsResumen, `Resumen-${mesesCorto[m]}-${y}`)

      const wsDiario = await buildHojaDiariaMes(XLSX, { anio:y, mes:m })
      XLSX.utils.book_append_sheet(wb, wsDiario, `Diario-${mesesCorto[m]}-${y}`)
    }

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estadisticas_${contratoNombre.value}_historico.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Error exportando Excel', e)
    alert('No se pudo exportar el Excel histórico.')
  } finally {
    // pequeña pausa para que el usuario perciba el estado
    setTimeout(() => { exportandoXLSX.value = false }, 300)
  }
}

/* === Helper: obtiene operatividad del mes por equipo/día/turno (A/B) como letras D/F/M === */
async function getOperatividadMes(anio, mes) {
  const start = new Date(anio, mes, 1, 0,0,0,0)
  const end   = new Date(anio, mes + 1, 1, 0,0,0,0)

  const q = query(
    collection(db, 'operatividad'),
    where('contratoId', '==', props.contratoId),
    where('fecha', '>=', start),
    where('fecha', '<', end)
  )
  const snap = await getDocs(q)

  const map = {} // clave: `${equipoId}-${DD}-${A|B}` -> 'D'|'F'|'M'
  snap.forEach(d => {
    const x = d.data()
    const fecha = x.fecha?.toDate ? x.fecha.toDate() : new Date(x.fecha)
    const DD = String(fecha.getDate()).padStart(2,'0')
    const j = (x.jornada || '').toUpperCase().includes('B') ? 'B' : 'A'
    const letra = clasificarEstado(x.estado)

    const cuentaEsteDia = soloHabiles.value ? !esFinDeSemana(fecha) : true
    if (!cuentaEsteDia) return

    map[`${x.equipoId}-${DD}-${j}`] = letra
  })
  return map
}

/* === Helper: construye la hoja "Diario-<mes>" con estilos y totales === */
async function buildHojaDiariaMes(XLSX, { anio, mes }) {
  const operMap = await getOperatividadMes(anio, mes)
  const equiposContrato = equipos.value.slice()
  const perDay = 2

  const start = new Date(anio, mes, 1)
  const end = new Date(anio, mes + 1, 1)
  const diasMes = Math.round((end - start) / 86400000)
  const diasHeader = []
  for (let d = 1; d <= diasMes; d++) {
    const fecha = new Date(anio, mes, d)
    if (soloHabiles.value && (fecha.getDay() === 0 || fecha.getDay() === 6)) continue
    diasHeader.push(String(d).padStart(2, '0'))
  }

  const categorias = {}
  for (const eq of equiposContrato) {
    const cat = normalizarCategoria(eq.categoria)
    ;(categorias[cat] ||= []).push(eq)
  }

  const data = []
  const nombreMes = start.toLocaleString('default', { month: 'long' })
  const titulo = `Operatividad — ${contratoNombre.value} — ${nombreMes.charAt(0).toUpperCase()+nombreMes.slice(1)} ${anio}`
  data.push([titulo])

  const row1 = ['CATEGORÍA','N° INTERNO','PPU']
  const row2 = ['','','']
  for (const d of diasHeader) { row1.push(d); row1.push(''); row2.push('A','B') }
  row1.push('D','F','M','%')
  row2.push('','','','')

  data.push(row1, row2)

  let currentRow = 3
  const merges = []
  for (const [cat, lista] of Object.entries(categorias)) {
    const filaCat = [cat]
    for (let i = 1; i < row1.length; i++) filaCat.push('')
    data.push(filaCat)
    merges.push({ s:{ r: currentRow, c:0 }, e:{ r: currentRow, c: row1.length - 1 } })
    currentRow++

    for (const eq of lista) {
      const fila = ['', eq.nombre_equipo || '', eq.patente || '']
      for (const d of diasHeader) {
        fila.push((operMap[`${eq.id}-${d}-A`] || '').toUpperCase())
        fila.push((operMap[`${eq.id}-${d}-B`] || '').toUpperCase())
      }
      fila.push('','','','')
      data.push(fila)
      currentRow++
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(data)
  const totalCols = 3 + (diasHeader.length * perDay) + 4
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } })
  const mergesDias = diasHeader.map((_, i) => ({
    s: { r: 1, c: 3 + i * perDay },
    e: { r: 1, c: 3 + i * perDay + (perDay - 1) }
  }))
  ws['!merges'] = [...merges, ...mergesDias]

  const BORDER = { style: 'thin', color: { rgb: 'FFBBBBBB' } }
  const borders = { top: BORDER, right: BORDER, bottom: BORDER, left: BORDER }

  const styleTitle = { font:{ bold:true, sz:16, color:{ rgb:'FFFFFFFF' }}, fill:{ fgColor:{ rgb:'FF3B3F5C'}}, alignment:{ horizontal:'center', vertical:'center' }, border: borders }
  const styleHdr   = { font:{ bold:true, color:{ rgb:'FFFFFFFF' }}, fill:{ fgColor:{ rgb:'FF1F4E78'}}, alignment:{ horizontal:'center', vertical:'center', wrapText:true }, border: borders }
  const styleSub   = { font:{ bold:true, color:{ rgb:'FF1F4E78' }}, fill:{ fgColor:{ rgb:'FFD9E1F2'}}, alignment:{ horizontal:'center', vertical:'center' }, border: borders }
  const styleCat   = { font:{ bold:true, color:{ rgb:'FF333333' }}, fill:{ fgColor:{ rgb:'FFF2F2F2'}}, alignment:{ horizontal:'left',  vertical:'center' }, border: borders }
  const styleBodyC = { alignment:{ horizontal:'center', vertical:'center' }, border: borders }
  const styleBodyL = { alignment:{ horizontal:'left',   vertical:'center' }, border: borders }
  const styleD = { font:{ bold:true, color:{ rgb:'FF0E6027'}}, fill:{ fgColor:{ rgb:'FFC6EFCE'}}, alignment:{ horizontal:'center', vertical:'center' }, border: borders }
  const styleF = { font:{ bold:true, color:{ rgb:'FF9C0006'}}, fill:{ fgColor:{ rgb:'FFFFC7CE'}}, alignment:{ horizontal:'center', vertical:'center' }, border: borders }
  const styleM = { font:{ bold:true, color:{ rgb:'FF7F6000'}}, fill:{ fgColor:{ rgb:'FFFFEB9C'}}, alignment:{ horizontal:'center', vertical:'center' }, border: borders }

  const range = XLSX.utils.decode_range(ws['!ref'])
  const colsCount = range.e.c - range.s.c + 1

  for (let c = 0; c < colsCount; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c })
    ws[ref] = ws[ref] || {}; ws[ref].s = styleTitle
  }
  for (let c = 0; c < colsCount; c++) {
    const h1 = XLSX.utils.encode_cell({ r: 1, c })
    const h2 = XLSX.utils.encode_cell({ r: 2, c })
    ws[h1] = ws[h1] || {}; ws[h1].s = styleHdr
    ws[h2] = ws[h2] || {}; ws[h2].s = styleSub
  }
  for (let r = 3; r <= range.e.r; r++) {
    const c0 = XLSX.utils.encode_cell({ r, c: 0 })
    const isCat = ws[c0] && ws[c0].v && (ws[c0].v !== '')
    for (let c = 0; c < colsCount; c++) {
      const ref = XLSX.utils.encode_cell({ r, c })
      ws[ref] = ws[ref] || {}
      ws[ref].s = isCat ? styleCat : (c <= 2 ? styleBodyL : styleBodyC)
    }
  }

  const cIni = 3
  const cFin = 3 + (diasHeader.length * perDay) - 1
  for (let r = 3; r <= range.e.r; r++) {
    const isCat = ws[XLSX.utils.encode_cell({ r, c: 0 })]?.v ? true : false
    if (isCat) continue
    for (let c = cIni; c <= cFin; c++) {
      const ref = XLSX.utils.encode_cell({ r, c })
      const v = String(ws[ref]?.v ?? '').toUpperCase()
      if (v === 'D') ws[ref].s = styleD
      else if (v === 'F') ws[ref].s = styleF
      else if (v === 'M') ws[ref].s = styleM
    }
  }

  const totalTurnos = diasHeader.length * perDay
  for (let r = 3; r <= range.e.r; r++) {
    const isCat = ws[XLSX.utils.encode_cell({ r, c: 0 })]?.v ? true : false
    if (isCat) continue
    const rango = XLSX.utils.encode_range({ r, c: cIni }, { r, c: cFin })
    const colD = cFin + 1
    const colF = cFin + 2
    const colM = cFin + 3
    const colPct = cFin + 4
    ws[XLSX.utils.encode_cell({ r, c: colD })] = { t:'n', f:`COUNTIF(${rango},"D")` }
    ws[XLSX.utils.encode_cell({ r, c: colF })] = { t:'n', f:`COUNTIF(${rango},"F")` }
    ws[XLSX.utils.encode_cell({ r, c: colM })] = { t:'n', f:`COUNTIF(${rango},"M")` }
    ws[XLSX.utils.encode_cell({ r, c: colPct })] = { t:'n', f:`${XLSX.utils.encode_cell({r, c: colD})}/${totalTurnos}`, z:'0.00%' }
  }

  ws['!cols'] = [
    { wch: 22 }, { wch: 18 }, { wch: 14 },
    ...Array.from({ length: diasHeader.length * perDay }, () => ({ wch: 3.5 })),
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }
  ]
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s:{ r:2, c:0 }, e:{ r: range.e.r, c: 2 } }) }

  return ws
}

/* Helpers Excel styling */
function cell(ws, ref) { if (!ws[ref]) ws[ref] = { t: 's', v: '' }; return ws[ref] }
function colLetter(idx) { let s = '', n = idx; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26) } return s }
function addr(col, row) { return `${colLetter(col)}${row}` }
function styleRange(ws, a1ref, s) { const c = cell(ws, a1ref); c.s = Object.assign({}, c.s || {}, s) }
function styleRow(ws, rowIdx, styleObj, colsCount) {
  for (let c = 1; c <= colsCount; c++) {
    const ref = addr(c, rowIdx); const cc = cell(ws, ref); cc.s = Object.assign({}, cc.s || {}, styleObj)
  }
}
function fillRow(ws, rowIdx, fill, colsCount) {
  for (let c = 1; c <= colsCount; c++) {
    const ref = addr(c, rowIdx); const cc = cell(ws, ref); cc.s = Object.assign({}, cc.s || {}, { fill })
  }
}
function allThinBorders() {
  return {
    top: { style: 'thin', color: { rgb: 'CCCCCC' } },
    right: { style: 'thin', color: { rgb: 'CCCCCC' } },
    bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
    left: { style: 'thin', color: { rgb: 'CCCCCC' } }
  }
}
function percentCols(ws, rowIdx, colLetters) {
  for (const L of colLetters) {
    const ref = `${L}${rowIdx}`; if (!ws[ref]) continue
    const v = Number(ws[ref].v)
    if (Number.isFinite(v)) { ws[ref].t = 'n'; ws[ref].v = v / 100; ws[ref].z = '0.00%' }
  }
}

/* Utilidades export resumen por mes */
function retrocedeMes(anio, mes, k) {
  const idx = anio * 12 + mes - k
  const y = Math.floor(idx / 12)
  const m = idx % 12
  return { y, m }
}
async function cargarResumenPara(anio, mes) {
  const start = new Date(anio, mes, 1)
  const end = new Date(anio, mes + 1, 1)
  const diasMes = Math.round((end - start) / 86400000)

  const diasConsiderados = contarDiasSegunContrato(start, end)
  const turnosMes = Math.max(1, diasConsiderados * 2)

  const basePorCategoria = {}
  for (const e of equipos.value) {
    const cat = normalizarCategoria(e.categoria)
    basePorCategoria[cat] ||= { equipos: 0, D: 0, F: 0, M: 0, turnosTeoricos: 0 }
    basePorCategoria[cat].equipos += 1
  }
  for (const cat of Object.keys(basePorCategoria)) {
    basePorCategoria[cat].turnosTeoricos = basePorCategoria[cat].equipos * turnosMes
  }

  let D=0,F=0,M=0
  const dias = diasMes
  const mapMporEqDia = {}

  const qref = query(
    collection(db, 'operatividad'),
    where('contratoId', '==', props.contratoId),
    where('fecha', '>=', start),
    where('fecha', '<', end)
  )
  const snap = await getDocs(qref)
  for (const docu of snap.docs) {
    const data = docu.data()
    const k = clasificarEstado(data.estado)
    const date = data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha)
    const idx = Math.min(Math.max(date.getDate(), 1), dias) - 1

    const cuentaEsteDia = soloHabiles.value ? !esFinDeSemana(date) : true
    if (!cuentaEsteDia) continue

    if (k === 'D') D++; else if (k === 'F') F++; else M++

    const eq = equipos.value.find(e => e.id === data.equipoId)
    const cat = normalizarCategoria(eq?.categoria || 'SIN CATEGORÍA')
    basePorCategoria[cat] ||= { equipos: 0, D: 0, F: 0, M: 0, turnosTeoricos: 0 }
    basePorCategoria[cat][k] += 1

    if (k === 'M') {
      mapMporEqDia[data.equipoId] ||= {}
      mapMporEqDia[data.equipoId][idx] = (mapMporEqDia[data.equipoId][idx] || 0) + 1
    }
  }

  let mProgramadaTurnos = 0
  let mImprevistaTurnos = 0
  for (const mapDias of Object.values(mapMporEqDia)) {
    const isFullM = Array.from({ length: dias }, (_, i) => (mapDias[i] || 0) >= 2)
    const totalMTurnosEq = Object.values(mapDias).reduce((a,b)=>a+b,0)
    const fullMDays = isFullM.filter(Boolean).length
    let parcialesTurnos = totalMTurnosEq - fullMDays * 2
    let i = 0
    while (i < isFullM.length) {
      if (!isFullM[i]) { i++; continue }
      let j = i
      while (j < isFullM.length && isFullM[j]) j++
      const len = j - i
      if (len >= 2) {
        mProgramadaTurnos += 4
        const extra = (len - 2) * 2
        if (extra > 0) mImprevistaTurnos += extra
      }
      i = j
    }
    if (parcialesTurnos > 0) mImprevistaTurnos += parcialesTurnos
  }

  const fsProgPct = ((mProgramadaTurnos / Math.max(1, equipos.value.length * turnosMes)) * 100).toFixed(2)
  const fsImpPct  = (((mImprevistaTurnos + F) / Math.max(1, equipos.value.length * turnosMes)) * 100).toFixed(2)

  const filas = []
  for (const [cat, v] of Object.entries(basePorCategoria)) {
    const realDen = v.D + v.F + v.M
    const pctReal = realDen ? Number(((v.D / realDen) * 100).toFixed(2)) : 0
    const pctTeor = v.turnosTeoricos ? Number(((v.D / v.turnosTeoricos) * 100).toFixed(2)) : 0
    filas.push({ categoria: cat, equipos: v.equipos, turnosTeoricos: v.turnosTeoricos, D: v.D, F: v.F, M: v.M, pctReal, pctTeorica: pctTeor })
  }
  filas.sort((a, b) => a.categoria.localeCompare(b.categoria, 'es', { sensitivity: 'base' }))

  const teor = Object.values(basePorCategoria).reduce((a,b)=>a+b.turnosTeoricos,0) || 1
  const pctReal = ((D / Math.max(1, D + F + M)) * 100).toFixed(2)
  const pctTeor = ((D / teor) * 100).toFixed(2)
  const tiempoDispPct = pctTeor

  return {
    y: anio, m: mes,
    diasMes, diasConsiderados, turnosMes, equipos: equipos.value.length,
    D, F, M,
    pctReal, pctTeor, tiempoDispPct,
    fsProgPct, fsImpPct,
    categorias: filas
  }
}

/* Ciclo de vida */
async function refrescar() {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }
  if (chartLineInstance) { chartLineInstance.destroy(); chartLineInstance = null }
  showKpis.value = false
  kpisLoaded.value = false
  kpisPorEquipo.value = []
  await cargarMetasContrato()
  await cargarEquipos()
  await cargarDatos()
}
onMounted(async () => {
  await cargarContrato()
  await cargarMetasContrato()
  await cargarEquipos()
  await cargarDatos()
})
watch(() => props.contratoId, async () => {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }
  if (chartLineInstance) { chartLineInstance.destroy(); chartLineInstance = null }
  showKpis.value = false
  kpisLoaded.value = false
  kpisPorEquipo.value = []
  await cargarContrato()
  await cargarMetasContrato()
  await cargarEquipos()
  await cargarDatos()
})
onBeforeUnmount(() => {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }
  if (chartLineInstance) { chartLineInstance.destroy(); chartLineInstance = null }
})
</script>

<style scoped>
.export-overlay{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  display: grid;
  place-items: center;
  z-index: 1050; /* por encima de cards y charts */
  backdrop-filter: blur(1px);
}
.export-box{
  background: rgba(0,0,0,.25);
  padding: 22px 28px;
  border-radius: 14px;
  box-shadow: 0 6px 24px rgba(0,0,0,.25);
}

.chart-sm { width: 260px; max-width: 100%; }
.chart-sm canvas { width: 100% !important; height: auto !important; }
.card { border-radius: 16px; }
.display-6 { font-weight: 700; }
.progress { background-color: #e9ecef; }
.progress-bar { transition: width .4s ease; }
.badge { font-size: 0.75rem; }
</style>
