<template>
  <div class="historial-wrap">
    <div class="container py-4">
      <div class="page-head d-flex align-items-center justify-content-between gap-3 flex-wrap">
        <div>
          <h1 class="title">Historial de Operatividad</h1>
          <p class="subtitle">
            Se listan únicamente los <strong>meses con registros</strong> (ventana: {{ LOOKBACK_MESES }} meses).
          </p>
        </div>

        <div class="toolbar d-flex align-items-center gap-2 flex-wrap">
          <div class="year-filter input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-calendar2-week"></i></span>
            <select class="form-select" v-model="anioSeleccionado">
              <option value="__ALL__">Todos los años</option>
              <option v-for="y in aniosDisponiblesGlobal" :key="y" :value="String(y)">
                {{ y }}
              </option>
            </select>
          </div>
          <div class="legend d-none d-sm-flex align-items-center gap-2 ms-1">
            <span class="chip"><span class="dot dot-d"></span> Disponible (D)</span>
            <span class="chip"><span class="dot dot-f"></span> Falla (F)</span>
            <span class="chip"><span class="dot dot-m"></span> Mantención (M)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading principal -->
    <div v-if="loading" class="container">
      <div class="glass card-load text-center">
        <div class="spinner-border" role="status"></div>
        <div class="mt-2 text-muted small">Cargando…</div>
      </div>
    </div>

    <div v-else class="container pb-5">
      <div v-if="contratosUsuario.length === 0" class="glass card-empty text-center">
        <i class="bi bi-inboxes fs-3 text-muted"></i>
        <p class="mt-2 mb-0 text-muted">No tienes contratos activos asignados.</p>
      </div>

      <div v-else class="d-flex flex-column gap-4">
        <div v-for="contrato in contratosUsuario" :key="contrato.id" class="glass">
          <!-- Header contrato -->
          <div class="contract-head d-flex flex-wrap justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-3">
              <div class="avatar"><i class="bi bi-briefcase"></i></div>
              <div>
                <div class="contract-name">
                  {{ contrato.nombre }}
                  <span class="badge bg-gradient-success align-middle ms-2">Activo</span>
                </div>
              </div>
            </div>
            <div class="muted small d-flex align-items-center gap-2">
              <i class="bi bi-clock-history"></i>
              Meses detectados:
              <strong>{{ (mesesPorContrato[contrato.id] || []).length }}</strong>
            </div>
          </div>

          <!-- Meses -->
          <div class="accordion accordion-flush" :id="'accordion-' + contrato.id">
            <div v-if="mesesFiltradosParaUI(contrato.id).length === 0" class="table-empty text-center">
              <i class="bi bi-clipboard-x fs-4 text-muted"></i>
              <p class="mb-0 text-muted">Sin registros para el año seleccionado.</p>
            </div>

            <div class="accordion-item" v-for="mesKey in mesesFiltradosParaUI(contrato.id)" :key="mesKey">
              <h2 class="accordion-header" :id="'heading-' + contrato.id + '-' + mesKey">
                <button
                  class="accordion-button collapsed month-head"
                  type="button"
                  data-bs-toggle="collapse"
                  :data-bs-target="'#collapse-' + contrato.id + '-' + mesKey"
                  aria-expanded="false"
                  :aria-controls="'collapse-' + contrato.id + '-' + mesKey"
                  @click="onAbrirMes(contrato.id, mesKey)"
                >
                  <div class="d-flex align-items-center gap-3 flex-grow-1">
                    <span class="month-badge"><i class="bi bi-calendar3 me-2"></i>{{ formatearMes(mesKey) }}</span>
                    <span class="muted small d-none d-sm-inline">Registros: {{ countRegistrosMes(contrato.id, mesKey) }}</span>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <span v-if="loadingMes[contrato.id]?.[mesKey]" class="spinner-border spinner-border-sm"></span>
                    <button
                      class="btn btn-outline-success btn-sm"
                      @click.stop="descargarExcelMes(contrato, mesKey)"
                      :disabled="!historialPorContrato[contrato.id]?.[mesKey]?.length"
                      title="Descargar Excel del mes"
                    >
                      <i class="bi bi-file-earmark-excel-fill me-1"></i> Exportar
                    </button>
                  </div>
                </button>
              </h2>

              <div
                :id="'collapse-' + contrato.id + '-' + mesKey"
                class="accordion-collapse collapse"
                :aria-labelledby="'heading-' + contrato.id + '-' + mesKey"
                :data-bs-parent="'#accordion-' + contrato.id"
              >
                <div class="accordion-body p-0">
                  <div v-if="loadingMes[contrato.id]?.[mesKey]" class="table-load text-center">
                    <div class="spinner-border text-secondary"></div>
                  </div>

                  <div
                    v-else-if="!historialPorContrato[contrato.id]?.[mesKey] || historialPorContrato[contrato.id][mesKey].length === 0"
                    class="table-empty text-center"
                  >
                    <i class="bi bi-clipboard-x fs-4 text-muted"></i>
                    <p class="mb-0 text-muted">Sin registros para este mes.</p>
                  </div>

                  <div v-else class="table-responsive">
                    <table class="table table-hover table-modern align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Equipo</th>
                          <th>PPU</th>
                          <th>Categoría</th>
                          <th>Estado</th>
                          <th>Observación</th>
                          <th class="text-end">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="registro in historialPorContrato[contrato.id][mesKey]" :key="registro.id">
                          <td class="fw-semibold">
                            <div class="d-flex flex-column">
                              <span>{{ obtenerNombreEquipoSeguro(registro.equipoId) }}</span>
                            </div>
                          </td>
                          <td>{{ obtenerPatenteEquipoSeguro(registro.equipoId) }}</td>
                          <td>{{ obtenerCategoriaEquipoSeguro(registro.equipoId) }}</td>
                          <td>
                            <span class="status-pill" :class="statusPillClase(registro.estado)" :title="`Jornada ${registro.jornada}`">
                              <span class="status-dot" :class="statusDotClase(registro.estado)"></span>
                              {{ etiquetaEstado(registro.estado) }}
                              <span class="sep">•</span> {{ registro.jornada }}
                            </span>
                          </td>
                          <td class="text-truncate" style="max-width: 360px;">{{ registro.observaciones || '—' }}</td>
                          <td class="text-end"><span class="muted small">{{ formatoFecha(registro.fecha) }}</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div> <!-- /table -->
                </div>
              </div>
            </div> <!-- /item -->
          </div> <!-- /accordion -->
        </div> <!-- /glass -->
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
  doc, getDoc, getDocs, collection, query, where, limit
} from 'firebase/firestore'

/* ===== CONFIG ===== */
const LOOKBACK_MESES = 12     // ventana para detectar meses con datos (ajusta si necesitas)
const CHUNK_IN = 10           // Firestore 'in' máx 10
const PAR_MESES_CONC = 6      // concurrencia por contrato al detectar meses

/* ===== STATE ===== */
const loading = ref(true)
const contratosUsuario = ref([])                // [{id, nombre, activo}]
const mesesPorContrato = ref({})                // { contratoId: [YYYY-MM,...] }
const historialPorContrato = ref({})            // { contratoId: { ym: Registro[] } }
const loadingMes = ref({})                      // { contratoId: { ym: boolean } }

const equiposPorContrato = ref({})              // { contratoId: Equipo[] }
const equiposCache = ref(new Map())             // Map<equipoId, Equipo>

const anioSeleccionado = ref('__ALL__')
const aniosDisponiblesGlobal = ref([])

/* ===== UTILES ===== */
function ymKey(date){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}` }
function rangeMonth(ym){
  const [y,m] = ym.split('-').map(Number)
  return { start: new Date(y, m-1, 1, 0,0,0,0), end: new Date(y, m, 1, 0,0,0,0) }
}
function monthsLookback(n){
  const out=[]
  const base = new Date(); base.setDate(1)
  for(let i=0;i<n;i++){
    const d = new Date(base.getFullYear(), base.getMonth()-i, 1)
    out.push(ymKey(d))
  }
  return out // desc: mes actual hacia atrás
}


/* ===== CONTRATOS (activos) ===== */
async function obtenerContratosDelUsuario() {
  const auth = getAuth()
  const u = auth.currentUser
  if (!u) return

  const udoc = await getDoc(doc(db, 'usuarios', u.uid))
  if (!udoc.exists()) return
  const ids = (udoc.data().contratosAsignados || []).filter(Boolean)
  if (!ids.length) { contratosUsuario.value = []; return }

  const res=[]
  for(let i=0;i<ids.length;i+=CHUNK_IN){
    const slice = ids.slice(i, i+CHUNK_IN)
    const snap = await getDocs(query(collection(db,'contratos'), where('__name__','in', slice)))
    snap.docs.forEach(d=>{
      const data = d.data()||{}
      if (data.activo !== false) res.push({id:d.id, ...data})
    })
  }
  contratosUsuario.value = res
}

/* ===== DETECCIÓN DE MESES (con queries minúsculas) ===== */
async function existeDatoEnColeccion(nombreCol, contratoId, ym){
  try{
    const {start, end} = rangeMonth(ym)
    const qref = query(
      collection(db, nombreCol),
      where('contratoId','==', contratoId),
      where('fecha','>=', start),
      where('fecha','<',  end),
      limit(1)
    )
    const s = await getDocs(qref)
    return !s.empty
  }catch(e){
    // si falta un índice, simplemente devolvemos false para esta colección
    return false
  }
}

async function hayRegistrosMes(contratoId, ym){
  // Dos consultas pequeñas en paralelo y corta si cualquiera devuelve algo
  const [a,b] = await Promise.all([
    existeDatoEnColeccion('operatividad', contratoId, ym),
    existeDatoEnColeccion('historial_operatividad', contratoId, ym)
  ])
  return a || b
}

async function detectarMesesContrato(contratoId){
  const candidates = monthsLookback(LOOKBACK_MESES) // ya viene desc
  const detectados=[]
  // Control de concurrencia simple por lotes
  for(let i=0;i<candidates.length;i+=PAR_MESES_CONC){
    const batch = candidates.slice(i, i+PAR_MESES_CONC)
    const flags = await Promise.all(batch.map(ym => hayRegistrosMes(contratoId, ym)))
    flags.forEach((ok, idx)=>{ if(ok) detectados.push(batch[idx]) })
  }
  mesesPorContrato.value[contratoId] = detectados
}

function buildAniosDisponiblesGlobal(){
  const ys = new Set()
  Object.values(mesesPorContrato.value).forEach(arr => arr.forEach(ym => ys.add(Number(ym.slice(0,4)))))
  aniosDisponiblesGlobal.value = Array.from(ys).sort((a,b)=>b-a)
}

function mesesFiltradosParaUI(contratoId){
  const arr = mesesPorContrato.value[contratoId] || []
  if (anioSeleccionado.value === '__ALL__') return arr
  return arr.filter(ym => ym.startsWith(`${anioSeleccionado.value}-`))
}

/* ===== EQUIPOS / CACHE ===== */
async function asegurarEquiposContrato(contratoId){
  if (equiposPorContrato.value[contratoId]) return
  // no filtramos por visibilidad aquí; queremos tener nombres/ppu para histórico
  const snap = await getDocs(query(collection(db,'equipos'), where('contratoId','==', contratoId)))
  const list = snap.docs.map(d=>({id:d.id, ...d.data()}))
  equiposPorContrato.value[contratoId] = list
  list.forEach(eq => equiposCache.value.set(String(eq.id), eq))
}
async function asegurarEquipoPorId(equipoId){
  const k = String(equipoId)
  if (equiposCache.value.has(k)) return equiposCache.value.get(k)
  try{
    const s = await getDoc(doc(db,'equipos', k))
    if (s.exists()){
      const eq = {id:s.id, ...s.data()}
      equiposCache.value.set(k, eq)
      return eq
    }
  }catch{ /* noop */ }
  return null
}

/* ===== CARGA DE MES ===== */
function normJ(j){ return String(j||'').trim().toUpperCase()==='B' ? 'B' : 'A' }

async function onAbrirMes(contratoId, ym){
  if (historialPorContrato.value[contratoId]?.[ym]) return
  await cargarHistorialMes(contratoId, ym)
}

async function cargarHistorialMes(contratoId, ym){
  loadingMes.value[contratoId] ||= {}
  loadingMes.value[contratoId][ym] = true

  await asegurarEquiposContrato(contratoId)
  const {start, end} = rangeMonth(ym)

  let registros = []
  // 1) intenta operatividad
  try{
    const q1 = query(
      collection(db,'operatividad'),
      where('contratoId','==', contratoId),
      where('fecha','>=', start),
      where('fecha','<',  end)
    )
    const s1 = await getDocs(q1)
    if (!s1.empty){
      registros = s1.docs.map(d=>{
        const x = d.data()
        const fecha = x.fecha?.toDate?.() || new Date(x.fecha)
        return { id:d.id, ...x, fecha, jornada: normJ(x.jornada) }
      }).sort((a,b)=> a.fecha - b.fecha)
    }
  }catch{ /* index faltante => seguimos con historial */ }

  // 2) fallback historial_operatividad (tomar último por celda)
  if (!registros.length){
    try{
      const q2 = query(
        collection(db,'historial_operatividad'),
        where('contratoId','==', contratoId),
        where('fecha','>=', start),
        where('fecha','<',  end)
      )
      const s2 = await getDocs(q2)
      const mapa = new Map()
      s2.docs.forEach(d=>{
        const x = d.data()
        const fecha = x.fecha?.toDate?.() || new Date(x.fecha)
        const dia = String(fecha.getDate()).padStart(2,'0')
        const j = normJ(x.jornada)
        const key = `${x.equipoId}|${dia}|${j}`
        const prev = mapa.get(key)
        const tsNew = x.timestamp?.toMillis?.() || 0
        const tsOld = prev?.timestamp?.toMillis?.() || 0
        if (!prev || tsNew > tsOld) mapa.set(key, { id:d.id, ...x, fecha, jornada:j })
      })
      registros = Array.from(mapa.values()).sort((a,b)=> a.fecha - b.fecha)
    }catch{ /* noop */ }
  }

  // Precache por equipoId (aunque ya no estén en este contrato)
  const ids = Array.from(new Set(registros.map(r => String(r.equipoId)).filter(Boolean)))
  for (let i=0;i<ids.length;i+=25){
    await Promise.all(ids.slice(i,i+25).map(id => asegurarEquipoPorId(id)))
  }

  historialPorContrato.value[contratoId] ||= {}
  historialPorContrato.value[contratoId][ym] = registros
  loadingMes.value[contratoId][ym] = false
}

/* ===== EXCEL ===== */
function nombreToLetra(n){
  const s = String(n||'').toUpperCase()
  if (s.includes('DISP')) return 'D'
  if (s.includes('FUERA')) return 'F'
  if (s.includes('MANT')) return 'M'
  if (['D','F','M'].includes(s)) return s
  return ''
}

async function descargarExcelMes(contrato, ym){
  if (!historialPorContrato.value[contrato.id]?.[ym]) await cargarHistorialMes(contrato.id, ym)
  const registros = historialPorContrato.value[contrato.id]?.[ym] || []

  await asegurarEquiposContrato(contrato.id)
  const equiposContrato = equiposPorContrato.value[contrato.id] || []

  const [y, m] = ym.split('-').map(Number)
  const dias = Array.from({length: new Date(y, m, 0).getDate()}, (_,i)=> String(i+1).padStart(2,'0'))

  const operMap = {}
  for (const r of registros){
    const d = String((r.fecha?.getDate?.() || new Date(r.fecha).getDate())).padStart(2,'0')
    const j = normJ(r.jornada)
    operMap[`${r.equipoId}-${d}-${j}`] = (nombreToLetra(r.estado) || '').toUpperCase()
  }

  // Unir equipos: actuales + por ID (para no perder histórico)
  const equiposMap = new Map(equiposContrato.map(eq => [String(eq.id), eq]))
  const ids = Array.from(new Set(registros.map(r=>String(r.equipoId)).filter(Boolean)))
  for (let i=0;i<ids.length;i+=25){
    await Promise.all(ids.slice(i,i+25).map(id => asegurarEquipoPorId(id)))
  }
  for (const id of ids){
    if (!equiposMap.has(id)){
      const eq = equiposCache.value.get(id)
      equiposMap.set(id, eq || { id, nombre_equipo:`EQUIPO ${id}`, patente:'-', categoria:'SIN CATEGORÍA', contratoId: contrato.id })
    }
  }
  const equiposTodos = Array.from(equiposMap.values())

  // Agrupar por categoría
  const categorias = {}
  for(const eq of equiposTodos){
    const c = (eq.categoria || 'SIN CATEGORÍA').toString().toUpperCase()
    ;(categorias[c] ||= []).push(eq)
  }

  // Workbook
  const wb = XLSX.utils.book_new()
  const data=[]
  const nombreMes = new Date(y, m-1).toLocaleString('default',{month:'long'})
  const titulo = `Historial — ${contrato.nombre} — ${nombreMes.charAt(0).toUpperCase()+nombreMes.slice(1)} ${y}`
  data.push([titulo])

  const row1=['CATEGORÍA','N° INTERNO','PPU']
  const row2=['','','']
  dias.forEach(d=>{ row1.push(String(parseInt(d,10))); row1.push(''); row2.push('A','B') })
  row1.push('D (Disponible)','F (Falla)','%'); row2.push('','','')
  data.push(row1,row2)

  const merges=[]
  let currentRow=3
  for (const [cat, grupo] of Object.entries(categorias)){
    const r=[cat]; for(let i=1;i<row1.length;i++) r.push('')
    data.push(r)
    merges.push({s:{r:currentRow,c:0}, e:{r:currentRow,c:row1.length-1}})
    currentRow++
    for (const eq of grupo){
      const fila=['', eq.nombre_equipo||'', eq.patente||'']
      for (const d of dias){ for (const t of ['A','B']) fila.push(operMap[`${eq.id}-${d}-${t}`] || '') }
      fila.push('','','')
      data.push(fila)
      currentRow++
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(data)
  const totalCols = 3 + (dias.length*2) + 3
  merges.push({s:{r:0,c:0}, e:{r:0,c:totalCols-1}})
  ws['!merges'] = merges

  // Estilos compactos
  const BORDER_THIN = { style: 'thin', color: { rgb: 'FF999999' } }
  const allBorders = { top: BORDER_THIN, right: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN }
  const titleStyle = { font:{bold:true, sz:16, color:{rgb:'FFFFFFFF'}}, fill:{fgColor:{rgb:'FF3B3F5C'}}, alignment:{vertical:'center',horizontal:'center'}, border:allBorders }
  const headerStyle = { font:{bold:true, color:{rgb:'FFFFFFFF'}}, fill:{fgColor:{rgb:'FF1F4E78'}}, alignment:{vertical:'center',horizontal:'center'}, border:allBorders }
  const subHeaderStyle = { font:{bold:true, color:{rgb:'FF1F4E78'}}, fill:{fgColor:{rgb:'FFD9E1F2'}}, alignment:{vertical:'center',horizontal:'center'}, border:allBorders }
  const categoriaStyle = { font:{bold:true, color:{rgb:'FF333333'}}, fill:{fgColor:{rgb:'FFF2F2F2'}}, alignment:{vertical:'center',horizontal:'left'}, border:allBorders }
  const bodyStyle = { alignment:{vertical:'center',horizontal:'center'}, border:allBorders }
  const bodyLeftStyle = { alignment:{vertical:'center',horizontal:'left'}, border:allBorders }
  const styleD = { font:{bold:true, color:{rgb:'FF0E6027'}}, fill:{fgColor:{rgb:'FFC6EFCE'}}, alignment:{vertical:'center',horizontal:'center'}, border:allBorders }
  const styleF = { font:{bold:true, color:{rgb:'FF9C0006'}}, fill:{fgColor:{rgb:'FFFFC7CE'}}, alignment:{vertical:'center',horizontal:'center'}, border:allBorders }
  const styleM = { font:{bold:true, color:{rgb:'FF7F6000'}}, fill:{fgColor:{rgb:'FFFFEB9C'}}, alignment:{vertical:'center',horizontal:'center'}, border:allBorders }

  const range = XLSX.utils.decode_range(ws['!ref'])
  const colsCount = range.e.c - range.s.c + 1
  for (let c=0;c<colsCount;c++){
    const r0 = XLSX.utils.encode_cell({r:0,c}); const r1=XLSX.utils.encode_cell({r:1,c}); const r2=XLSX.utils.encode_cell({r:2,c})
    ws[r0] = ws[r0]||{}; ws[r0].s = titleStyle
    ws[r1] = ws[r1]||{}; ws[r1].s = headerStyle
    ws[r2] = ws[r2]||{}; ws[r2].s = subHeaderStyle
  }
  for (let r=3;r<=range.e.r;r++){
    const c0 = XLSX.utils.encode_cell({r, c:0})
    const isCat = ws[c0] && ws[c0].v && (ws[c0].v!=='')
    for (let c=0;c<colsCount;c++){
      const ref = XLSX.utils.encode_cell({r,c})
      ws[ref] = ws[ref] || {}
      ws[ref].s = isCat ? categoriaStyle : (c<=2 ? bodyLeftStyle : bodyStyle)
    }
  }

  // colorear letras + fórmulas
  const estadosStart = 3
  const estadosEnd   = 3 + (dias.length*2) - 1
  let fila = 3
  for (const [_, grupo] of Object.entries(categorias)){
    fila++ // fila categoría
    for (const eq of grupo){
      let c = estadosStart
      for (const d of dias){
        for (const t of ['A','B']){
          const ref = XLSX.utils.encode_cell({r:fila,c})
          const v = ws[ref]?.v || ''
          if (v === 'D') ws[ref].s = styleD
          else if (v === 'F') ws[ref].s = styleF
          else if (v === 'M') ws[ref].s = styleM
          c++
        }
      }
      const rangoAB = XLSX.utils.encode_range({r:fila,c:estadosStart},{r:fila,c:estadosEnd})
      const colD    = estadosEnd+1
      const colF    = estadosEnd+2
      const colPct  = estadosEnd+3
      ws[XLSX.utils.encode_cell({r:fila,c:colD})] = { t:'n', f:`COUNTIF(${rangoAB},"D")+MIN(2,COUNTIF(${rangoAB},"M"))` }
      ws[XLSX.utils.encode_cell({r:fila,c:colF})] = { t:'n', f:`COUNTIF(${rangoAB},"F")+MAX(0,COUNTIF(${rangoAB},"M")-2)` }
      const refD = XLSX.utils.encode_cell({r:fila,c:colD})
      ws[XLSX.utils.encode_cell({r:fila,c:colPct})] = { t:'n', f:`${refD}/${dias.length*2}`, z:'0.00%' }
      fila++
    }
  }

  ws['!cols'] = [
    { wch: 24 }, { wch: 16 }, { wch: 16 },
    ...Array.from({length:dias.length*2},()=>({wch:4})),
    { wch: 16 }, { wch: 16 }, { wch: 10 }
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Historial')
  const nombreArchivo = `historial_${contrato.nombre.replace(/\s+/g,'_')}_${ym}.xlsx`
  const blob = new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})], {type:'application/octet-stream'})
  saveAs(blob, nombreArchivo)
}

/* ===== UI HELPERS ===== */
function obtenerNombreEquipoSeguro(id){ return equiposCache.value.get(String(id))?.nombre_equipo || `Equipo ${id}` }
function obtenerPatenteEquipoSeguro(id){ return equiposCache.value.get(String(id))?.patente || '—' }
function obtenerCategoriaEquipoSeguro(id){ return equiposCache.value.get(String(id))?.categoria || 'SIN CATEGORÍA' }
function formatoFecha(f){ try{ const d = f?.toDate ? f.toDate() : f; return new Date(d).toLocaleDateString() }catch{ return '-' } }
function formatearMes(ym){ const [y,m]=ym.split('-').map(Number); return new Date(y,m-1).toLocaleString('default',{month:'long',year:'numeric'}) }
function etiquetaEstado(e){ const s=String(e||'').toUpperCase(); if(s.includes('DISP'))return 'Disponible'; if(s.includes('FALL'))return 'Falla'; if(s.includes('MANT'))return 'Mantención'; return '—' }
function statusDotClase(e){ const s=String(e||'').toUpperCase(); if(s.includes('DISP'))return 'dot-d'; if(s.includes('FALL'))return 'dot-f'; if(s.includes('MANT'))return 'dot-m'; return 'dot-x' }
function statusPillClase(e){ const s=String(e||'').toUpperCase(); if(s.includes('DISP'))return 'pill-d'; if(s.includes('FALL'))return 'pill-f'; if(s.includes('MANT'))return 'pill-m'; return 'pill-x' }
function countRegistrosMes(contratoId, ym){ const arr = historialPorContrato.value[contratoId]?.[ym]; return Array.isArray(arr) ? arr.length : '—' }

/* ===== MONTAJE ===== */
onMounted(async ()=>{
  try{
    await obtenerContratosDelUsuario()

    // Detecta meses por contrato con consultas pequeñas y concurrencia controlada
    for (let i=0;i<contratosUsuario.value.length;i+=2){
      await Promise.all(
        contratosUsuario.value.slice(i,i+2).map(c => detectarMesesContrato(c.id))
      )
    }

    // Años disponibles a partir de todo lo detectado
    buildAniosDisponiblesGlobal()
    const yNow = String(new Date().getFullYear())
    anioSeleccionado.value = aniosDisponiblesGlobal.value.map(String).includes(yNow) ? yNow : '__ALL__'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* Fondo suave */
.historial-wrap{
  min-height: 100vh;
  background:
    radial-gradient(1000px 360px at 100% -80%, rgba(70,95,250,.06), transparent 70%),
    radial-gradient(800px 260px at -10% 0%, rgba(20,160,120,.05), transparent 60%),
    linear-gradient(180deg, #f9fafb 0%, #f3f5f7 100%);
}

/* Header */
.page-head .title{ font-size: clamp(1.4rem, 2.4vw, 1.8rem); font-weight: 700; margin: 0; }
.page-head .subtitle{ margin: .15rem 0 0 0; color: #6b7280; }

/* Toolbar */
.toolbar .year-filter .input-group-text{ background:#fff; border-color: rgba(0,0,0,.08); }
.toolbar .year-filter .form-select{ border-color: rgba(0,0,0,.08); }

/* Chips leyenda */
.chip{ display:inline-flex; align-items:center; gap:.45rem; padding:.35rem .6rem; border-radius:999px; background:#fff; border:1px solid rgba(0,0,0,.06); box-shadow:0 1px 2px rgba(0,0,0,.04); font-size:.85rem; color:#374151; }
.dot{ width:10px; height:10px; border-radius:50%; border:1px solid rgba(0,0,0,.2); display:inline-block; }
.dot-d{ background:#c6efce } .dot-f{ background:#ffc7ce } .dot-m{ background:#ffeb9c } .dot-x{ background:#e5e7eb }

/* Cards estilo glass */
.glass{ background:rgba(255,255,255,.8); border:1px solid rgba(0,0,0,.06); border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,.05), inset 0 1px 0 rgba(255,255,255,.4); overflow:hidden; }
.card-load, .card-empty{ padding:2.2rem 1rem; }
.card-empty i{ display:block; }

/* Header de contrato */
.contract-head{ padding:14px 16px; background:linear-gradient(180deg, rgba(17,24,39,.9) 0%, rgba(17,24,39,.85) 100%); color:#fff; }
.contract-name{ font-size:1.05rem; font-weight:700; }
.avatar{ width:40px; height:40px; border-radius:12px; display:grid; place-items:center; background:linear-gradient(180deg, #334155, #1f2937); color:#fff; }
.bg-gradient-success{ background:linear-gradient(180deg,#22c55e,#16a34a)!important; }

/* Meses (acordeón) */
.month-head{ background:#fff !important; padding:.6rem 1rem !important; box-shadow:inset 0 -1px 0 rgba(0,0,0,.06); }
.month-head .month-badge{ font-weight:600; padding:.35rem .7rem; border-radius:10px; background:#f3f4f6; color:#111827; display:inline-flex; align-items:center; }
.muted{ color:#6b7280; } .tiny{ font-size:.75rem; }

/* Tabla moderna */
.table-modern thead th{ font-weight:700; font-size:.85rem; letter-spacing:.02em; color:#111827; background:#fff; border-bottom:1px solid rgba(0,0,0,.08)!important; white-space:nowrap; }
.table-modern tbody tr:hover{ background:#f8fafc; }
.table-modern td{ border-color:rgba(0,0,0,.06)!important; }
.table-empty, .table-load{ padding:1.6rem 1rem; }

/* Pills de estado */
.status-pill{ display:inline-flex; align-items:center; gap:.5rem; padding:.32rem .6rem; border-radius:999px; font-weight:600; font-size:.85rem; border:1px solid transparent; background:#f3f4f6; color:#111827; }
.status-dot{ width:8px; height:8px; border-radius:50%; border:1px solid rgba(0,0,0,.15); }
.pill-d{ background:#ecfdf5; color:#065f46; border-color:#a7f3d0; }
.pill-f{ background:#fef2f2; color:#991b1b; border-color:#fecaca; }
.pill-m{ background:#fffbeb; color:#92400e; border-color:#fde68a; }
.pill-x{ background:#f3f4f6; color:#374151; border-color:#e5e7eb; }
.sep{ opacity:.45; }
</style>

<script>
export default { name: 'HistorialOperatividadView' }
</script>
