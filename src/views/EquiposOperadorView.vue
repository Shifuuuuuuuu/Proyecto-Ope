<template>
  <div class="container py-4" style="max-height: 85vh; overflow-y: auto;">
    <div class="d-flex align-items-center gap-2 mb-2">
      <h2 class="text-center flex-grow-1 mb-0">🚜 Mis Equipos</h2>
      <!-- Toggle modo selección -->
      <div class="form-check form-switch">
        <input id="modoSel" class="form-check-input" type="checkbox" v-model="modoSeleccion" />
        <label class="form-check-label" for="modoSel">Modo selección</label>
      </div>
    </div>

    <!-- Buscador + Filtros + botón mostrar formulario -->
    <div class="d-flex align-items-center flex-wrap gap-2 mb-3">
      <input
        v-model="busqueda"
        type="text"
        class="form-control"
        placeholder="Buscar por nombre o patente..."
        style="max-width: 280px;"
      />

      <!-- Filtro Categoría -->
      <select v-model="filtroCategoria" class="form-select" style="max-width: 220px;">
        <option value="">Todas las categorías</option>
        <option v-for="cat in categorias" :key="cat" :value="cat">{{ cat }}</option>
      </select>

      <!-- Filtro Año (Modelo) -->
      <select v-model="filtroAnio" class="form-select" style="max-width: 180px;">
        <option value="">Todos los años</option>
        <option v-for="anio in aniosDisponibles" :key="anio" :value="anio">{{ anio }}</option>
      </select>

      <!-- Limpiar filtros -->
      <button class="btn btn-outline-secondary" @click="limpiarFiltros">Limpiar filtros</button>

      <!-- Mostrar/Ocultar formulario -->
      <button class="btn btn-outline-success ms-auto" @click="mostrarFormulario = !mostrarFormulario">
        {{ mostrarFormulario ? '✖️ Ocultar formulario' : '➕ Agregar equipo' }}
      </button>
    </div>

    <!-- Barra de acciones masivas -->
    <div
      v-if="modoSeleccion && seleccionadosCount > 0"
      class="bulkbar border rounded-3 shadow-sm p-2 mb-3 bg-white d-flex flex-wrap align-items-center gap-2"
    >
      <span class="fw-semibold">Seleccionados: {{ seleccionadosCount }}</span>

      <select v-model="nuevoContratoId" class="form-select" style="max-width: 320px;">
        <option disabled value="">Mover a contrato…</option>
        <option v-for="c in contratosActivos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
      </select>

      <button class="btn btn-primary" :disabled="!nuevoContratoId" @click="aplicarCambioContratoMasivo">
        Cambiar contrato
      </button>

      <button class="btn btn-outline-secondary ms-auto" @click="limpiarSeleccion">
        Limpiar selección
      </button>
    </div>

    <!-- Formulario agregar o editar equipo -->
    <div v-if="mostrarFormulario" class="card mb-4 shadow-sm" ref="formularioRef">
      <div class="card-body">
        <h5 class="mb-3">{{ modoEdicion ? '✏️ Editar equipo' : '➕ Agregar nuevo equipo' }}</h5>
        <form @submit.prevent="modoEdicion ? guardarCambios() : agregarEquipo()">
          <div class="row g-2">
            <div class="col-md-4">
              <label class="form-label">Nombre del equipo</label>
              <input v-model="equipoActual.nombre_equipo" class="form-control" required />
            </div>
            <div class="col-md-4">
              <label class="form-label">Patente</label>
              <input v-model="equipoActual.patente" class="form-control" required />
            </div>
            <div class="col-md-4">
              <label class="form-label">Modelo (año)</label>
              <input v-model="equipoActual.fecha_modelo" type="number" class="form-control" required />
            </div>
            <div class="col-md-4">
              <label class="form-label">Categoría</label>
              <select v-model="equipoActual.categoria" class="form-select" required>
                <option disabled value="">Selecciona una categoría</option>
                <option v-for="cat in categorias" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="col-md-8">
              <label class="form-label">Contrato</label>
              <select v-model="equipoActual.contratoId" class="form-select" required>
                <option disabled value="">Selecciona un contrato</option>
                <option v-for="c in contratosActivos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
              </select>
            </div>
          </div>

          <div class="mt-3">
            <button type="submit" class="btn btn-success">
              {{ modoEdicion ? 'Guardar cambios' : 'Agregar equipo' }}
            </button>
            <button type="button" v-if="modoEdicion" class="btn btn-secondary ms-2" @click="cancelarEdicion">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Listado agrupado por contrato con acordeón + paginación -->
    <div v-if="equiposAgrupados.length > 0">
      <div v-for="grupo in equiposAgrupados" :key="grupo.contratoId" class="mb-3">
        <div class="d-flex justify-content-between align-items-center bg-light px-3 py-2 border rounded shadow-sm">
          <div class="d-flex align-items-center gap-3">
            <h5 class="mb-0 text-primary">{{ grupo.nombreContrato }}</h5>

            <!-- Selección por grupo (ahora selecciona TODO el contrato con filtros aplicados) -->
            <div v-if="modoSeleccion">
              <div class="form-check ms-1">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :id="`selall-${grupo.contratoId}`"
                  :checked="estadoSeleccionContratoCompleto(grupo.contratoId)"
                  @change="toggleSeleccionContratoCompleto(grupo.contratoId, $event.target.checked)"
                />
                <label class="form-check-label small" :for="`selall-${grupo.contratoId}`">
                  Seleccionar todo (filtro actual)
                </label>
              </div>
            </div>
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" @click="alternarContrato(grupo.contratoId)">
              {{ contratosColapsados[grupo.contratoId] ? 'Mostrar' : 'Ocultar' }}
            </button>
            <button
              v-if="!contratosColapsados[grupo.contratoId]"
              class="btn btn-sm btn-outline-primary"
              :disabled="grupo.loading || !grupo.hasMore"
              @click="cargarMasEquiposContrato(grupo.contratoId, 12)"
            >
              {{ grupo.loading ? 'Cargando...' : (grupo.hasMore ? 'Cargar más' : 'No hay más') }}
            </button>
          </div>
        </div>

        <div v-show="!contratosColapsados[grupo.contratoId]" class="mt-3">
          <div class="row g-3">
            <div class="col-md-6" v-for="equipo in grupo.equipos" :key="equipo.id">
              <div class="card shadow-sm rounded-4 h-100 position-relative">
                <!-- Checkbox selección por tarjeta (visible solo en modo selección) -->
                <div v-if="modoSeleccion" class="seleccion-checkbox form-check">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    :id="`chk-${equipo.id}`"
                    :checked="seleccionados.has(equipo.id)"
                    @change="toggleSeleccion(equipo, $event.target.checked)"
                  />
                </div>

                <div class="card-body d-flex flex-column">
                  <h5 class="card-title">{{ equipo.nombre_equipo }}</h5>
                  <p class="card-text mb-1">Patente: <strong>{{ equipo.patente }}</strong></p>
                  <p class="card-text mb-1">Modelo: {{ equipo.fecha_modelo }}</p>
                  <p class="card-text mb-3">Categoría: {{ equipo.categoria }}</p>
                  <div class="mt-auto d-flex gap-2">
                    <button class="btn btn-outline-primary btn-sm" @click="editarEquipo(equipo)" :disabled="modoSeleccion">✏️ Editar</button>
                    <button class="btn btn-outline-danger btn-sm" @click="eliminarEquipo(equipo)" :disabled="modoSeleccion">🗑️ Eliminar</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="grupo.loading" class="col-12">
              <div class="text-center text-muted small">Cargando equipos...</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-muted text-center">No se encontraron equipos.</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { db, auth } from '../firebase/config';
import {
  collection, query, where, getDocs, getDoc, doc, limit,
  orderBy, startAfter, updateDoc, setDoc, deleteDoc, writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { obtenerSiguienteId } from '../firebase/firestore';

// ---------- STATE ----------
const usuario = ref(null);
const contratosAsignados = ref([]);
const contratos = ref([]);
const categorias = ref([]);
const mostrarFormulario = ref(false);
const modoEdicion = ref(false);
const formularioRef = ref(null);

// Selección múltiple
const modoSeleccion = ref(false);
const seleccionados = ref(new Set()); // Set<string>
const mapEquipoPorId = ref(new Map()); // Map<string, Equipo>
const nuevoContratoId = ref('');

// Filtros y búsqueda
const busqueda = ref('');
const filtroCategoria = ref('');
const filtroAnio = ref('');

// Debounce búsqueda (client-side)
const textoBusqueda = ref('');
let tDebounce = null;
watch(busqueda, (v) => {
  clearTimeout(tDebounce);
  tDebounce = setTimeout(() => (textoBusqueda.value = (v || '').toLowerCase().trim()), 250);
});

// Colapsado por contrato (true por defecto)
const contratosColapsados = ref({}); // { [contratoId]: boolean }

// Equipos por contrato con paginación
const equiposPorContrato = ref({}); // { [contratoId]: { items:[], last:null, hasMore:true, loading:false } }

// Form equipo actual
const equipoActual = ref({
  id: '',
  nombre_equipo: '',
  patente: '',
  fecha_modelo: '',
  categoria: '',
  contratoId: ''
});

// ---------- HELPERS ----------
const ensureContratoState = (cid) => {
  if (!equiposPorContrato.value[cid]) {
    equiposPorContrato.value[cid] = { items: [], last: null, hasMore: true, loading: false };
  }
  if (contratosColapsados.value[cid] === undefined) {
    contratosColapsados.value[cid] = true;
  }
};

const obtenerCategorias = async () => {
  const snap = await getDocs(collection(db, 'categorias'));
  categorias.value = snap.docs.map(d => d.data().nombre).filter(Boolean).sort();
};

const obtenerUsuarioActual = () =>
  new Promise((resolve) => {
    onAuthStateChanged(auth, async (u) => {
      if (!u) return resolve();
      const uref = doc(db, 'usuarios', u.uid);
      const usnap = await getDoc(uref);
      if (usnap.exists()) {
        usuario.value = { id: u.uid, ...usnap.data() };
        contratosAsignados.value = usuario.value.contratosAsignados || [];
      }
      resolve();
    });
  });
const contratosActivos = computed(() => (contratos.value || []).filter(c => c.activo !== false));

const cargarContratosAsignados = async () => {
  const prom = contratosAsignados.value.map(id => getDoc(doc(db, 'contratos', id)));
  const snaps = await Promise.all(prom);

  // Normaliza y guarda
  const todos = snaps
    .filter(s => s.exists())
    .map(s => {
      const data = s.data() || {};
      return { id: s.id, ...data, activo: data.activo !== false }; // undefined => activo
    });

  // SOLO activos
  contratos.value = todos.filter(c => c.activo);

  // (re)inicia estados de UI solo para activos
  contratos.value.forEach(c => ensureContratoState(c.id));
};


// Query base (paginada) por contrato con filtros server-side
const buildEquiposQuery = (contratoId, pageSize = 12, last = null) => {
  const conds = [where('contratoId', '==', contratoId)];
  if (filtroCategoria.value) conds.push(where('categoria', '==', (filtroCategoria.value || '').toUpperCase()));
  if (filtroAnio.value) conds.push(where('fecha_modelo', '==', Number(filtroAnio.value)));

  let qref = query(collection(db, 'equipos'), ...conds, orderBy('id'), limit(pageSize));
  if (last) qref = query(qref, startAfter(last));
  return qref;
};

// Carga una página (UI)
const cargarMasEquiposContrato = async (contratoId, pageSize = 12) => {
  const state = (equiposPorContrato.value[contratoId] ||= { items: [], last: null, hasMore: true, loading: false });
  if (state.loading || !state.hasMore) return;

  state.loading = true;
  const snap = await getDocs(buildEquiposQuery(contratoId, pageSize, state.last));

  if (snap.empty) {
    state.hasMore = false;
    state.loading = false;
    return;
  }

  const nuevos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const q = textoBusqueda.value;
  const filtrados = q
    ? nuevos.filter(e => {
        const n = (e.nombre_equipo || '').toLowerCase();
        const p = (e.patente || '').toLowerCase();
        return n.includes(q) || p.includes(q);
      })
    : nuevos;

  filtrados.forEach(e => mapEquipoPorId.value.set(e.id, e));

  state.items = state.last ? state.items.concat(filtrados) : filtrados;
  state.last = snap.docs[snap.docs.length - 1];
  if (snap.size < pageSize) state.hasMore = false;
  state.loading = false;
};

// **NUEVO**: obtiene TODOS los equipos de un contrato (con filtros server-side y texto client-side)
const fetchTodosEquiposContrato = async (contratoId) => {
  const pageSize = 200; // grande para reducir rondas
  let last = null;
  let done = false;
  const todos = [];

  while (!done) {
    const qref = buildEquiposQuery(contratoId, pageSize, last);
    const snap = await getDocs(qref);
    if (snap.empty) {
      done = true;
      break;
    }
    const lote = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    todos.push(...lote);
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < pageSize) done = true;
  }

  // Filtro client-side por búsqueda de texto (nombre/patente)
  const q = textoBusqueda.value;
  const result = q
    ? todos.filter(e => {
        const n = (e.nombre_equipo || '').toLowerCase();
        const p = (e.patente || '').toLowerCase();
        return n.includes(q) || p.includes(q);
      })
    : todos;

  // Actualiza cache rápida
  result.forEach(e => mapEquipoPorId.value.set(e.id, e));
  return result;
};

// Recargar SOLO contratos abiertos (después de filtros/búsqueda)
const recargarContratosVisibles = async () => {
  const abiertos = Object.keys(contratosColapsados.value).filter(cid => contratosColapsados.value[cid] === false);
  for (const cid of abiertos) {
    equiposPorContrato.value[cid] = { items: [], last: null, hasMore: true, loading: false };
  }
  for (let i = 0; i < abiertos.length; i += 3) {
    await Promise.all(abiertos.slice(i, i + 3).map(cid => cargarMasEquiposContrato(cid, 12)));
  }
};

// ---------- SELECCIÓN ----------
const seleccionadosCount = computed(() => seleccionados.value.size);

// Card
const toggleSeleccion = (equipo, checked) => {
  if (checked) {
    seleccionados.value.add(equipo.id);
    mapEquipoPorId.value.set(equipo.id, equipo);
  } else {
    seleccionados.value.delete(equipo.id);
  }
  seleccionados.value = new Set(seleccionados.value);
};

// **NUEVO**: estado del “select all” por contrato teniendo en cuenta TODO el contrato
const estadoSeleccionContratoCompleto = (contratoId) => {
  const visibles = equiposPorContrato.value[contratoId]?.items || [];
  if (!visibles.length) return false;
  // Si los visibles están todos seleccionados, y además (heurística) hay selección de ids de ese contrato
  return visibles.every(e => seleccionados.value.has(e.id));
};

// **NUEVO**: seleccionar TODO el contrato (aplica filtros); si uncheck, desmarca solo ids de ese contrato
const toggleSeleccionContratoCompleto = async (contratoId, checkAll) => {
  if (checkAll) {
    const todos = await fetchTodosEquiposContrato(contratoId);
    todos.forEach(e => seleccionados.value.add(e.id));
  } else {
    // quitar selección solo de ese contrato (entre lo que tenemos cacheado)
    for (const [eid, eq] of mapEquipoPorId.value.entries()) {
      if (eq?.contratoId === contratoId) {
        seleccionados.value.delete(eid);
      }
    }
  }
  seleccionados.value = new Set(seleccionados.value);
};

const limpiarSeleccion = () => {
  seleccionados.value.clear();
  seleccionados.value = new Set();
  nuevoContratoId.value = '';
};

// Acción masiva
const aplicarCambioContratoMasivo = async () => {
  if (!seleccionados.value.size || !nuevoContratoId.value) return;

  if (!contratosAsignados.value.includes(nuevoContratoId.value)) {
    alert('No estás autorizado para mover equipos a ese contrato.');
    return;
  }

  const confirmMsg = `Vas a mover ${seleccionados.value.size} equipo(s) al contrato seleccionado. ¿Continuar?`;
  if (!confirm(confirmMsg)) return;

  try {
    const destino = nuevoContratoId.value;
    const destinoActivo = contratosActivos.value.some(c => c.id === destino);
    if (!destinoActivo) {
      alert('El contrato de destino está inactivo. Elige un contrato activo.');
      return;
    }

    // Preparar lista real de equipos (construye payload desde el cache; si falta alguno, lo traeremos por contrato)
    // Agrupamos por contrato de origen para refrescar después
    const origenes = new Set();
    const ids = Array.from(seleccionados.value);

    // Asegura que conocemos el equipo (si no está en el map, lo buscamos por su contrato cargando todo y filtrando por id… pero
    // como seleccionamos mediante UI o “select all” que usa fetchTodosEquiposContrato, ya debemos tenerlos en el map)
    const equiposSeleccionados = ids
      .map(id => mapEquipoPorId.value.get(id))
      .filter(Boolean);

    equiposSeleccionados.forEach(eq => { if (eq?.contratoId) origenes.add(eq.contratoId); });

    // Firestore batch en trozos (límite ~500)
    const CHUNK = 450;
    for (let i = 0; i < equiposSeleccionados.length; i += CHUNK) {
      const batch = writeBatch(db);
      equiposSeleccionados.slice(i, i + CHUNK).forEach(eq => {
        // evita “mover a mismo contrato”
        if (eq.contratoId === destino) return;
        batch.update(doc(db, 'equipos', String(eq.id)), { contratoId: destino });
      });
      await batch.commit();
    }

    // Limpiar selección
    limpiarSeleccion();

    // Refrescar origen(es) y destino si están abiertos
    const aRecargar = new Set([...origenes, destino]);
    for (const cid of aRecargar) {
      if (contratosColapsados.value[cid] === false) {
        equiposPorContrato.value[cid] = { items: [], last: null, hasMore: true, loading: false };
        await cargarMasEquiposContrato(cid, 12);
      }
    }

    alert('Contrato actualizado para los equipos seleccionados.');
  } catch (e) {
    alert('Error al cambiar contrato: ' + (e?.message || e));
  }
};

// ---------- COMPUTEDS ----------
const contratosFiltrados = contratosActivos; // mantener nombre usado abajo


const aniosDisponibles = computed(() => {
  const set = new Set();
  for (const cid of Object.keys(equiposPorContrato.value)) {
    for (const e of equiposPorContrato.value[cid]?.items || []) {
      if (e.fecha_modelo !== undefined && e.fecha_modelo !== null && e.fecha_modelo !== '')
        set.add(Number(e.fecha_modelo));
    }
  }
  return Array.from(set).sort((a, b) => b - a);
});

const equiposAgrupados = computed(() =>
  contratosFiltrados.value.map(c => ({
    contratoId: c.id,
    nombreContrato: c.nombre,
    equipos: equiposPorContrato.value[c.id]?.items || [],
    hasMore: equiposPorContrato.value[c.id]?.hasMore,
    loading: equiposPorContrato.value[c.id]?.loading
  }))
);

// ---------- UI ----------
const alternarContrato = async (contratoId) => {
  const estabaColapsado = contratosColapsados.value[contratoId];
  contratosColapsados.value[contratoId] = !estabaColapsado;

  if (!contratosColapsados.value[contratoId] && (equiposPorContrato.value[contratoId]?.items.length || 0) === 0) {
    await cargarMasEquiposContrato(contratoId, 12);
  }
};

const limpiarFiltros = async () => {
  busqueda.value = '';
  filtroCategoria.value = '';
  filtroAnio.value = '';
  await recargarContratosVisibles();
};

watch([filtroCategoria, filtroAnio], () => {
  recargarContratosVisibles();
});

watch(textoBusqueda, async () => {
  await recargarContratosVisibles();
});

// ---------- CRUD ----------
const editarEquipo = async (equipo) => {
  equipoActual.value = { ...equipo };
  modoEdicion.value = true;
  mostrarFormulario.value = true;

  await nextTick();
  if (formularioRef.value) {
    formularioRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const cancelarEdicion = () => {
  modoEdicion.value = false;
  equipoActual.value = {
    id: '',
    nombre_equipo: '',
    patente: '',
    fecha_modelo: '',
    categoria: '',
    contratoId: ''
  };
};

const guardarCambios = async () => {
  if (!equipoActual.value?.id) return;
  const refEquipo = doc(db, 'equipos', equipoActual.value.id);
  await updateDoc(refEquipo, {
    nombre_equipo: (equipoActual.value.nombre_equipo || '').toUpperCase(),
    patente: (equipoActual.value.patente || '').toUpperCase(),
    fecha_modelo: parseInt(equipoActual.value.fecha_modelo),
    categoria: (equipoActual.value.categoria || '').toUpperCase(),
    contratoId: equipoActual.value.contratoId
  });
  const contratoAfectado = equipoActual.value.contratoId;
  cancelarEdicion();
  if (contratosColapsados.value[contratoAfectado] === false) {
    equiposPorContrato.value[contratoAfectado] = { items: [], last: null, hasMore: true, loading: false };
    await cargarMasEquiposContrato(contratoAfectado, 12);
  }
};

const agregarEquipo = async () => {
  const nuevoId = await obtenerSiguienteId('equipos');
  const payload = {
    id: nuevoId,
    nombre_equipo: (equipoActual.value.nombre_equipo || '').toUpperCase(),
    patente: (equipoActual.value.patente || '').toUpperCase(),
    fecha_modelo: parseInt(equipoActual.value.fecha_modelo),
    categoria: (equipoActual.value.categoria || '').toUpperCase(),
    contratoId: equipoActual.value.contratoId
  };
  await setDoc(doc(db, 'equipos', String(nuevoId)), payload);
  const contratoAfectado = equipoActual.value.contratoId;
  cancelarEdicion();

  contratosColapsados.value[contratoAfectado] = false;
  equiposPorContrato.value[contratoAfectado] = { items: [], last: null, hasMore: true, loading: false };
  await cargarMasEquiposContrato(contratoAfectado, 12);
};

const eliminarEquipo = async (equipo) => {
  const autorizado = contratosAsignados.value.includes(equipo.contratoId);
  if (!autorizado) {
    alert('No estás autorizado para eliminar este equipo.');
    return;
  }
  const ok = confirm(`¿Eliminar el equipo "${equipo.nombre_equipo}" (Patente ${equipo.patente})?`);
  if (!ok) return;

  try {
    await deleteDoc(doc(db, 'equipos', equipo.id));
    if (contratosColapsados.value[equipo.contratoId] === false) {
      equiposPorContrato.value[equipo.contratoId] = { items: [], last: null, hasMore: true, loading: false };
      await cargarMasEquiposContrato(equipo.contratoId, 12);
    }
    if (modoEdicion.value && equipoActual.value?.id === equipo.id) cancelarEdicion();
    if (seleccionados.value.has(equipo.id)) {
      seleccionados.value.delete(equipo.id);
      seleccionados.value = new Set(seleccionados.value);
    }
  } catch (e) {
    alert('Error al eliminar el equipo: ' + (e?.message || e));
  }
};

// ---------- LIFECYCLE ----------
onMounted(async () => {
  await obtenerUsuarioActual();
  if (!contratosAsignados.value.length) return;
  await Promise.all([cargarContratosAsignados(), obtenerCategorias()]);
  // Lazy load: no cargamos equipos hasta expandir un contrato.
});
</script>

<style scoped>
/* Checkbox flotante de selección en cada card */
.seleccion-checkbox{
  position: absolute;
  top: 8px;
  right: 8px;
  background: #fff;
  border-radius: 8px;
  padding: 4px 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,.08);
}

/* Barra de acciones masivas */
.bulkbar{
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>
