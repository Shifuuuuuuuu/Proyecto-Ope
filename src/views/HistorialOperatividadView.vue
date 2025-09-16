<template>
  <div class="container py-4" style="max-height: 85vh; overflow-y: auto;">
    <h2 class="text-center mb-4">Historial de Operatividad</h2>

    <div v-if="loading" class="text-center">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else>
      <div v-if="contratosUsuario.length === 0" class="alert alert-info text-center">
        No se encontraron contratos asignados al usuario.
      </div>

      <div v-else>
        <div v-for="contrato in contratosUsuario" :key="contrato.id" class="mb-4">
          <div class="card shadow-sm">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <span>Contrato: {{ contrato.nombre }}</span>
              <small class="text-white-50">Últimos 6 meses</small>
            </div>

            <div class="accordion" :id="'accordion-' + contrato.id">
              <div
                class="accordion-item"
                v-for="mesKey in mesesUltimos"
                :key="mesKey"
              >
                <h2 class="accordion-header" :id="'heading-' + contrato.id + '-' + mesKey">
                  <div class="d-flex justify-content-between align-items-center px-3 py-2 bg-body-tertiary border-bottom rounded-top">
                    <button
                      class="accordion-button collapsed flex-grow-1 bg-transparent border-0 fw-bold"
                      type="button"
                      data-bs-toggle="collapse"
                      :data-bs-target="'#collapse-' + contrato.id + '-' + mesKey"
                      aria-expanded="false"
                      :aria-controls="'collapse-' + contrato.id + '-' + mesKey"
                      @click="onAbrirMes(contrato.id, mesKey)"
                    >
                      {{ formatearMes(mesKey) }}
                    </button>

                    <div class="d-flex align-items-center gap-2">
                      <span v-if="loadingMes[contrato.id]?.[mesKey]" class="spinner-border spinner-border-sm" />
                      <button
                        class="btn btn-outline-success btn-sm"
                        @click="descargarExcelMes(contrato, mesKey)"
                        :disabled="!historialPorContrato[contrato.id]?.[mesKey]?.length"
                        title="Descargar Excel del mes"
                      >
                        <i class="bi bi-file-earmark-excel-fill me-1"></i> Excel
                      </button>
                    </div>
                  </div>
                </h2>

                <div
                  :id="'collapse-' + contrato.id + '-' + mesKey"
                  class="accordion-collapse collapse"
                  :aria-labelledby="'heading-' + contrato.id + '-' + mesKey"
                  :data-bs-parent="'#accordion-' + contrato.id"
                >
                  <div class="accordion-body">
                    <div v-if="loadingMes[contrato.id]?.[mesKey]" class="text-center py-3">
                      <div class="spinner-border text-secondary"></div>
                    </div>

                    <div v-else>
                      <div
                        v-if="!historialPorContrato[contrato.id]?.[mesKey] || historialPorContrato[contrato.id][mesKey].length === 0"
                        class="alert alert-light mb-0"
                      >
                        Sin registros para este mes.
                      </div>

                      <ul v-else class="list-group">
                        <li
                          v-for="registro in historialPorContrato[contrato.id][mesKey]"
                          :key="registro.id"
                          class="list-group-item"
                        >
                          <strong>Equipo:</strong> {{ obtenerNombreEquipo(contrato.id, registro.equipoId) }}<br />
                          <strong>Estado:</strong> {{ registro.estado }} ({{ registro.jornada }})<br />
                          <strong>Observación:</strong> {{ registro.observaciones || 'Sin observación' }}<br />
                          <strong>Registrado por:</strong>
                          {{ registro.nombre_completo || 'Desconocido' }} ({{ registro.registradoPor || '---' }})<br />
                          <small class="text-muted">Fecha: {{ formatoFecha(registro.fecha) }}</small>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div> <!-- /accordion-item -->
            </div> <!-- /accordion -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'
import { ref, onMounted } from 'vue'
import { db } from '../firebase/config'
import { getAuth } from 'firebase/auth'
import {
  doc, getDoc, getDocs, collection,
  query, where, orderBy
} from 'firebase/firestore'

/* =========================
   STATE
========================= */
const loading = ref(true)
const contratosUsuario = ref([])                  // [{id, nombre}]
const equiposPorContrato = ref({})               // { [contratoId]: Equipo[] }
const historialPorContrato = ref({})             // { [contratoId]: { [YYYY-MM]: Registro[] } }
const loadingMes = ref({})                        // { [contratoId]: { [YYYY-MM]: boolean } }

/* =========================
   UTIL: Meses últimos (6)
========================= */
const mesesUltimos = getUltimosMeses(6)          // ['2025-08', '2025-07', ...]
function getUltimosMeses(n) {
  const out = []
  const base = new Date()
  base.setDate(1)
  for (let i = 0; i < n; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

/* =========================
   AUTH + CONTRATOS (usuario)
========================= */
async function obtenerContratosDelUsuario() {
  const auth = getAuth()
  const currentUser = auth.currentUser
  if (!currentUser) return

  const userDoc = await getDoc(doc(db, 'usuarios', currentUser.uid))
  if (!userDoc.exists()) return
  const ids = (userDoc.data().contratosAsignados || []).filter(Boolean)

  // Traemos por id (en serie para simplicidad; si son muchos, haz chunks de 10 usando where('__name__','in',...))
  const result = []
  for (const id of ids) {
    const c = await getDoc(doc(db, 'contratos', id))
    if (c.exists()) result.push({ id: c.id, ...c.data() })
  }
  contratosUsuario.value = result
}

/* =========================
   EQUIPOS (lazy por contrato)
========================= */
async function asegurarEquiposContrato(contratoId) {
  if (equiposPorContrato.value[contratoId]) return
  const snap = await getDocs(query(collection(db, 'equipos'), where('contratoId', '==', contratoId)))
  equiposPorContrato.value[contratoId] = snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/* =========================
   HISTORIAL (lazy por contrato/mes)
========================= */
function rangoDeMes(mKey) {
  const [y, m] = mKey.split('-').map(Number)
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0)
  const end = new Date(y, m, 1, 0, 0, 0, 0)
  return { start, end }
}

async function onAbrirMes(contratoId, mesKey) {
  // si ya cargó una vez, no recargar
  if (historialPorContrato.value[contratoId]?.[mesKey]) return
  await cargarHistorialMes(contratoId, mesKey)
}

async function cargarHistorialMes(contratoId, mesKey) {
  loadingMes.value[contratoId] = loadingMes.value[contratoId] || {}
  loadingMes.value[contratoId][mesKey] = true

  await asegurarEquiposContrato(contratoId)
  const { start, end } = rangoDeMes(mesKey)

  // helper normalizador
  const normJ = j => String(j || '').trim().toUpperCase() === 'B' ? 'B' : 'A'

  let registros = []
  try {
    // principal: operatividad
    const q1 = query(
      collection(db, 'operatividad'),
      where('contratoId', '==', contratoId),
      where('fecha', '>=', start),
      where('fecha', '<', end),
      orderBy('fecha')
    )
    const s1 = await getDocs(q1)
    registros = s1.docs.map(d => {
      const x = d.data()
      const fecha = x.fecha?.toDate?.() || new Date(x.fecha)
      return { id: d.id, ...x, fecha, jornada: normJ(x.jornada) }
    })
  } catch (err) {
    if (err?.code !== 'failed-precondition') {
      console.error('operatividad error:', err)
    }
  }

  // fallback si no hay resultados o índice: historial_operatividad (tomar último de cada celda)
  if (!registros.length) {
    try {
      const qh = query(
        collection(db, 'historial_operatividad'),
        where('contratoId', '==', contratoId),
        where('fecha', '>=', start),
        where('fecha', '<', end)
      )
      const sh = await getDocs(qh)
      const porClave = new Map() // clave = equipoId|dia|jornada  => keep último
      sh.docs.forEach(d => {
        const x = d.data()
        const fecha = x.fecha?.toDate?.() || new Date(x.fecha)
        const dia = String(fecha.getDate()).padStart(2, '0')
        const j = normJ(x.jornada)
        const key = `${x.equipoId}|${dia}|${j}`
        const prev = porClave.get(key)
        if (!prev || (x.timestamp?.toMillis?.() || 0) > (prev.timestamp?.toMillis?.() || 0)) {
          porClave.set(key, { id: d.id, ...x, fecha, jornada: j })
        }
      })
      registros = Array.from(porClave.values()).sort((a, b) => a.fecha - b.fecha)
    } catch (err) {
      console.error('historial_operatividad error:', err)
    }
  }

  historialPorContrato.value[contratoId] = historialPorContrato.value[contratoId] || {}
  historialPorContrato.value[contratoId][mesKey] = registros
  loadingMes.value[contratoId][mesKey] = false
}


/* =========================
   EXCEL (usa caché del mes)
========================= */
function nombreToLetra(n) {
  const s = String(n || '').toUpperCase()
  if (s.includes('DISP')) return 'D'
  if (s.includes('FUERA')) return 'F'
  if (s.includes('MANT')) return 'M'
  if (['D','F','M'].includes(s)) return s
  return ''
}

async function descargarExcelMes(contrato, mesKey) {
  if (!historialPorContrato.value[contrato.id]?.[mesKey]) {
    await cargarHistorialMes(contrato.id, mesKey)
  }
  const registros = historialPorContrato.value[contrato.id]?.[mesKey] || []
  await asegurarEquiposContrato(contrato.id)
  const equiposContrato = equiposPorContrato.value[contrato.id] || []

  const [y, m] = mesKey.split('-').map(Number)
  const diasEnMes = new Date(y, m, 0).getDate()
  const dias = Array.from({ length: diasEnMes }, (_, i) => String(i + 1).padStart(2, '0'))

  // === operMap: equipoId-dia-turno => 'D'/'F'/'M'
  const normJ = j => String(j || '').trim().toUpperCase() === 'B' ? 'B' : 'A'
  const operMap = {}
  for (const r of registros) {
    const d = String((r.fecha?.getDate?.() || new Date(r.fecha).getDate())).padStart(2, '0')
    const j = normJ(r.jornada)
    operMap[`${r.equipoId}-${d}-${j}`] = (nombreToLetra(r.estado) || '').toUpperCase()
  }

  // Agrupar por categoría
  const categorias = {}
  for (const eq of equiposContrato) {
    const cat = eq.categoria || 'SIN CATEGORÍA'
    if (!categorias[cat]) categorias[cat] = []
    categorias[cat].push(eq)
  }

  // ==== Workbook / Worksheet ====
  const wb = XLSX.utils.book_new()
  wb.Workbook = wb.Workbook || {}
  wb.Workbook.CalcPr = { fullCalcOnLoad: true }

  const data = []
  const nombreMes = new Date(y, m - 1).toLocaleString('default', { month: 'long' })
  const titulo = `Historial — ${contrato.nombre} — ${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${y}`
  data.push([titulo])

  const row1 = ['CATEGORÍA', 'N° INTERNO', 'PPU']
  const row2 = ['', '', '']
  dias.forEach(d => { row1.push(String(parseInt(d, 10))); row1.push(''); row2.push('A','B') })
  row1.push('D (Disponible)', 'F (Falla)', '%')
  row2.push('', '', '')
  data.push(row1, row2)

  const filaInicioDatos = 3
  let currentRow = filaInicioDatos
  const merges = []

  // Construcción AOA (prellenado con letras si existen)
  for (const [categoria, grupo] of Object.entries(categorias)) {
    const catRow = [categoria]; for (let i = 1; i < row1.length; i++) catRow.push('')
    data.push(catRow)
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: row1.length - 1 } })
    currentRow++

    for (const eq of grupo) {
      const fila = ['', eq.nombre_equipo || '', eq.patente || '']
      for (const d of dias) {
        for (const t of ['A','B']) {
          const v = (operMap[`${eq.id}-${d}-${t}`] || '')
          fila.push(v) // ya intentamos meter la letra aquí
        }
      }
      fila.push('', '', '') // D / F / %
      data.push(fila)
      currentRow++
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(data)

  // Merges: título y días
  const totalCols = 3 + (dias.length * 2) + 3
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } })
  const mergesDias = dias.map((_, i) => ({ s: { r: 1, c: 3 + i*2 }, e: { r: 1, c: 3 + i*2 + 1 } }))
  ws['!merges'] = [...merges, ...mergesDias]

  // ===== Estilos (igual que antes) =====
  const BORDER_THIN = { style: 'thin', color: { rgb: 'FF999999' } }
  const allBorders = { top: BORDER_THIN, right: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN }
  const titleStyle = { font: { bold: true, sz: 16, color: { rgb: 'FFFFFFFF' } }, fill: { fgColor: { rgb: 'FF3B3F5C' } }, alignment: { vertical: 'center', horizontal: 'center' }, border: allBorders }
  const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFFFF' } }, fill: { fgColor: { rgb: 'FF1F4E78' } }, alignment: { vertical: 'center', horizontal: 'center', wrapText: true }, border: allBorders }
  const subHeaderStyle = { font: { bold: true, color: { rgb: 'FF1F4E78' } }, fill: { fgColor: { rgb: 'FFD9E1F2' } }, alignment: { vertical: 'center', horizontal: 'center' }, border: allBorders }
  const categoriaStyle = { font: { bold: true, color: { rgb: 'FF333333' } }, fill: { fgColor: { rgb: 'FFF2F2F2' } }, alignment: { vertical: 'center', horizontal: 'left' }, border: allBorders }
  const bodyStyle = { alignment: { vertical: 'center', horizontal: 'center' }, border: allBorders }
  const bodyLeftStyle = { alignment: { vertical: 'center', horizontal: 'left' }, border: allBorders }
  const styleD = { font: { bold: true, color: { rgb: 'FF0E6027' } }, fill: { fgColor: { rgb: 'FFC6EFCE' } }, alignment: { vertical: 'center', horizontal: 'center' }, border: allBorders }
  const styleF = { font: { bold: true, color: { rgb: 'FF9C0006' } }, fill: { fgColor: { rgb: 'FFFFC7CE' } }, alignment: { vertical: 'center', horizontal: 'center' }, border: allBorders }
  const styleM = { font: { bold: true, color: { rgb: 'FF7F6000' } }, fill: { fgColor: { rgb: 'FFFFEB9C' } }, alignment: { vertical: 'center', horizontal: 'center' }, border: allBorders }

  const range = XLSX.utils.decode_range(ws['!ref'])
  const colsCount = range.e.c - range.s.c + 1

  // Título / headers
  for (let c = 0; c < colsCount; c++) {
    const r0 = XLSX.utils.encode_cell({ r: 0, c })
    const r1 = XLSX.utils.encode_cell({ r: 1, c })
    const r2 = XLSX.utils.encode_cell({ r: 2, c })
    ws[r0] = ws[r0] || {}; ws[r0].s = titleStyle
    ws[r1] = ws[r1] || {}; ws[r1].s = headerStyle
    ws[r2] = ws[r2] || {}; ws[r2].s = subHeaderStyle
  }

  // Cuerpo + filas de categoría (sin perder valores)
  for (let r = filaInicioDatos; r <= range.e.r; r++) {
    const c0 = XLSX.utils.encode_cell({ r, c: 0 })
    const isCategoriaRow = ws[c0] && ws[c0].v && (ws[c0].v !== '')
    for (let c = 0; c < colsCount; c++) {
      const ref = XLSX.utils.encode_cell({ r, c })
      if (!ws[ref]) ws[ref] = {}
      ws[ref].s = isCategoriaRow ? categoriaStyle : (c <= 2 ? bodyLeftStyle : bodyStyle)
    }
  }

  // === FORZAR volver a escribir letras A/B (por si alguna celda quedó sin "v") ===
  const estadosStart = 3
  const estadosEnd = 3 + (dias.length * 2) - 1
  let fila = filaInicioDatos
  for (const [categoria, grupo] of Object.entries(categorias)) {
    fila++ // salta la fila de título de categoría
    for (const eq of grupo) {
      let c = estadosStart
      for (const d of dias) {
        for (const t of ['A','B']) {
          const ref = XLSX.utils.encode_cell({ r: fila, c })
          const v = (operMap[`${eq.id}-${d}-${t}`] || '')
          ws[ref] = ws[ref] || {}
          ws[ref].t = 's'
          ws[ref].v = v
          // colorea según letra
          if (v === 'D') ws[ref].s = styleD
          else if (v === 'F') ws[ref].s = styleF
          else if (v === 'M') ws[ref].s = styleM
          c++
        }
      }
      fila++
    }
  }

  // Fórmulas D / F / %
  const totalTurnos = dias.length * 2
  for (let r = filaInicioDatos; r <= range.e.r; r++) {
    const isCategoriaRow = ws[XLSX.utils.encode_cell({ r, c: 0 })]?.v ? true : false
    if (isCategoriaRow) continue
    const rangoAB = XLSX.utils.encode_range({ r, c: estadosStart }, { r, c: estadosEnd })
    const colD   = estadosEnd + 1
    const colF   = estadosEnd + 2
    const colPct = estadosEnd + 3
    ws[XLSX.utils.encode_cell({ r, c: colD })] = { t: 'n', f: `COUNTIF(${rangoAB},"D")+MIN(2,COUNTIF(${rangoAB},"M"))` }
    ws[XLSX.utils.encode_cell({ r, c: colF })] = { t: 'n', f: `COUNTIF(${rangoAB},"F")+MAX(0,COUNTIF(${rangoAB},"M")-2)` }
    const refD = XLSX.utils.encode_cell({ r, c: colD })
    ws[XLSX.utils.encode_cell({ r, c: colPct })] = { t: 'n', f: `${refD}/${totalTurnos}`, z: '0.00%' }
  }

  // Anchos + autofiltro A:C
  ws['!cols'] = [
    { wch: 22 }, { wch: 18 }, { wch: 14 },
    ...Array.from({ length: dias.length * 2 }, () => ({ wch: 4 })),
    { wch: 14 }, { wch: 12 }, { wch: 10 }
  ]
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: range.e.r, c: 2 } }) }

  XLSX.utils.book_append_sheet(wb, ws, 'Historial')
  const nombreArchivo = `historial_${contrato.nombre.replace(/\s+/g,'_')}_${mesKey}.xlsx`
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], { type: 'application/octet-stream' })
  saveAs(blob, nombreArchivo)
}

/* =========================
   HELPERS
========================= */
function obtenerNombreEquipo(contratoId, id) {
  const lista = equiposPorContrato.value[contratoId] || []
  const e = lista.find(x => x.id === id)
  return e?.nombre_equipo || `Equipo ${id}`
}

function formatoFecha(fecha) {
  try {
    const d = fecha?.toDate ? fecha.toDate() : fecha
    return new Date(d).toLocaleDateString()
  } catch { return '-' }
}

function formatearMes(mesStr) {
  const [year, month] = mesStr.split('-').map(Number)
  const fecha = new Date(year, month - 1)
  return fecha.toLocaleString('default', { month: 'long', year: 'numeric' })
}

/* =========================
   MONTAJE
========================= */
onMounted(async () => {
  try {
    await obtenerContratosDelUsuario()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.card-header { font-weight: bold; }
.accordion-button { font-weight: bold; }
</style>

<script>
export default { name: 'HistorialOperatividadView' }
</script>
