<template>
  <div class="admin-page container-fluid py-4 px-3 px-md-5">

    <!-- ===== HEADER RECTANGULAR (compacto) ===== -->
    <div class="hero card border-0 shadow-sm overflow-hidden mb-3">
      <div class="hero-bg"></div>

      <div class="card-body position-relative py-3 px-3 px-sm-4">
        <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <!-- Left -->
          <button class="btn btn-outline-secondary btn-sm btn-rect" @click="volver" title="Volver">
            <i class="bi bi-arrow-left"></i>
            <span class="d-none d-sm-inline ms-1">Volver</span>
          </button>

          <!-- Center: título rectangular -->
          <div class="flex-grow-1 text-center px-2">
            <div class="title-bar">
              <div class="title-left">
                <i class="bi bi-shield-lock"></i>
              </div>
              <div class="title-mid">
                <div class="title-text">Panel de Administración</div>
                <div class="title-sub">Gestión de usuarios, contratos, categorías, equipos y metas.</div>
              </div>
            </div>
          </div>

          <!-- Right -->
          <router-link
            :to="{ name: 'AdminGestorIngresosOTs' }"
            class="btn btn-dark btn-sm btn-rect d-flex align-items-center gap-2 btn-w-xs"
          >
            <span class="d-sm-none">🧰 Gestor</span>
            <span class="d-none d-sm-inline">🧰 Gestor de Ingresos & OTs</span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- TOASTS -->
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1080;">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast align-items-center text-white border-0 show mb-2 toast-pro"
        :class="t.variant === 'success' ? 'bg-success' : 'bg-danger'"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div class="d-flex">
          <div class="toast-body">{{ t.msg }}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" @click="closeToast(t.id)"></button>
        </div>
      </div>
    </div>

    <!-- MODAL CONFIRMACIÓN -->
    <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true" ref="confirmModalEl">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content modal-pro">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">{{ confirmTitle }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            {{ confirmMsg }}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary btn-rect" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-danger btn-rect" @click="confirmOk()">Confirmar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- GRID RESPONSIVO -->
    <div class="row row-cols-1 row-cols-lg-2 row-cols-xxl-4 gy-4">

      <!-- COL 1: USUARIOS -->
      <div class="col d-flex flex-column gap-3">
        <div class="card h-100 shadow-sm border-0 card-rect">
          <div class="card-header head-primary header-rect">👥 Usuarios registrados</div>
          <div class="card-body p-3 scroll-panel">

            <div class="row g-2 align-items-center mb-2 row-cols-1 row-cols-sm-3">
              <div class="col d-flex align-items-center">
                <div class="form-check ms-1">
                  <input class="form-check-input" type="checkbox" v-model="selectAllUsuarios" @change="toggleAllUsuarios" />
                  <label class="form-check-label">Seleccionar todos</label>
                </div>
              </div>

              <div class="col">
                <input
                  v-model.trim="buscaUsuario"
                  class="form-control form-control-sm"
                  placeholder="Buscar por nombre, email, rol, teléfono o contrato…"
                />
              </div>

              <div class="col d-flex justify-content-sm-end">
                <button
                  class="btn btn-sm btn-outline-danger w-100 btn-w-xs btn-rect"
                  :disabled="!seleccionUsuarios.length"
                  @click="eliminarUsuariosSeleccion"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>

            <div class="text-center my-2" v-if="loadingUsuarios">
              <div class="spinner-border" role="status"></div>
            </div>

            <template v-else-if="usuariosFiltrados.length > 0">
              <ul class="list-group list-group-flush">
                <li
                  v-for="user in usuariosFiltrados"
                  :key="user.id"
                  class="list-group-item py-2 px-3 d-flex justify-content-between align-items-start flex-column flex-sm-row"
                  style="font-size: 0.9rem;"
                >
                  <div class="d-flex w-100">
                    <input class="form-check-input me-2 mt-1" type="checkbox" v-model="seleccionUsuarios" :value="user.id" />
                    <div class="flex-grow-1">
                      <strong>{{ user.nombre_completo }}</strong>
                      <span class="badge bg-secondary ms-1 text-capitalize">{{ user.rol }}</span><br />
                      {{ user.email }}<br />
                      <small class="text-muted">Tel: {{ user.telefono || '—' }}</small><br />
                      Contratos:
                      <div class="mt-1">
                        <span
                          v-for="id in user.contratosAsignados || []"
                          :key="id"
                          class="badge bg-light text-dark border me-1 mb-1"
                        >
                          {{ nombreContrato(id) }}
                        </span>
                        <span v-if="!user.contratosAsignados || !user.contratosAsignados.length" class="text-muted">—</span>
                      </div>
                    </div>
                  </div>

                  <div class="mt-2 mt-sm-0 d-flex gap-1">
                    <button @click="editarUsuario(user)" class="btn btn-sm btn-outline-primary btn-rect">✏️</button>
                    <button @click="eliminarUsuario(user.id, user.email)" class="btn btn-sm btn-outline-danger btn-rect">🗑️</button>
                  </div>
                </li>
              </ul>
            </template>

            <div v-else class="text-center text-muted">No hay usuarios para los filtros aplicados.</div>
          </div>
        </div>

        <!-- Formulario usuario -->
        <div class="card shadow-sm border-0 card-rect">
          <div class="card-header bg-light fw-bold header-rect">
            {{ modoEdicionUsuario ? '✏️ Editar usuario' : '➕ Agregar nuevo usuario' }}
          </div>
          <div class="card-body p-3">
            <form @submit.prevent="modoEdicionUsuario ? actualizarUsuario() : agregarUsuario()">
              <div class="mb-2">
                <label>Nombre completo</label>
                <input v-model="nuevoUsuario.nombre_completo" class="form-control" required />
              </div>
              <div class="mb-2">
                <label>Email</label>
                <input v-model="nuevoUsuario.email" type="email" class="form-control" required :disabled="modoEdicionUsuario" />
              </div>
              <div class="mb-2" v-if="!modoEdicionUsuario">
                <label>Contraseña</label>
                <input v-model="nuevoUsuario.password" type="password" class="form-control" required minlength="8" />
              </div>
              <div class="mb-2">
                <label>Teléfono</label>
                <input
                  v-model="nuevoUsuario.telefono"
                  type="tel"
                  class="form-control"
                  placeholder="+569XXXXXXXX"
                  @input="formatearTelefono"
                  maxlength="12"
                  required
                />
              </div>
              <div class="mb-2">
                <label>Rol</label>
                <select v-model="nuevoUsuario.rol" class="form-select" required>
                  <option disabled value="">Selecciona un rol</option>
                  <option value="admin">Admin</option>
                  <option value="visualizador">Visualizador</option>
                  <option value="operador">Operador</option>
                </select>
              </div>
              <div class="mb-3">
                <label>Contrato(s)</label>
                <select v-model="nuevoUsuario.contratosAsignados" class="form-select" multiple>
                  <option v-for="c in contratosActivos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>
                <small class="text-muted">Mantén Ctrl (o Cmd) para seleccionar varios</small>
              </div>

              <button type="submit" class="btn btn-primary w-100 btn-rect" :disabled="loadingUsuariosBtn">
                {{ loadingUsuariosBtn ? 'Guardando...' : modoEdicionUsuario ? 'Actualizar Usuario' : 'Agregar Usuario' }}
              </button>
              <button
                v-if="modoEdicionUsuario"
                type="button"
                class="btn btn-outline-secondary w-100 mt-2 btn-rect"
                @click="cancelarEdicionUsuario()"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- COL 2: CONTRATOS -->
      <div class="col d-flex flex-column gap-3">
        <div class="card h-70 shadow-sm border-0 card-rect">
          <div class="card-header head-success header-rect">📄 Contratos registrados</div>
          <div class="card-body p-3 scroll-panel">

            <div class="text-center my-2" v-if="loadingContratos">
              <div class="spinner-border" role="status"></div>
            </div>

            <template v-else-if="contratos.length > 0">
              <ul class="list-group list-group-flush">
                <li
                  v-for="c in contratos"
                  :key="c.id"
                  class="list-group-item py-2 px-3 d-flex justify-content-between align-items-start flex-column flex-sm-row"
                  style="font-size: 0.9rem;"
                >
                  <div>
                    <strong>ID: {{ c.id }}</strong>
                    <span class="badge ms-2" :class="c.activo ? 'text-bg-success' : 'text-bg-secondary'">
                      {{ c.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                    <br />
                    {{ c.nombre }}<br />
                    <small class="text-muted">Creado: {{ formatoFecha(c.fecha_creacion) }}</small>
                  </div>
                  <div class="mt-2 mt-sm-0 d-flex gap-1">
                    <button @click="editarContrato(c)" class="btn btn-sm btn-outline-primary btn-rect">✏️</button>
                    <button @click="toggleActivoContrato(c)" class="btn btn-sm btn-outline-secondary btn-rect">
                      {{ c.activo ? 'Desactivar' : 'Activar' }}
                    </button>
                    <button @click="confirmEliminarContrato(c.id)" class="btn btn-sm btn-outline-danger btn-rect">🗑️</button>
                  </div>
                </li>
              </ul>
            </template>
            <div v-else class="text-center text-muted">No hay contratos registrados.</div>
          </div>
        </div>

        <div class="card shadow-sm border-0 card-rect">
          <div class="card-header bg-light fw-bold header-rect">
            {{ modoEdicionContrato ? '✏️ Editar contrato' : '➕ Agregar nuevo contrato' }}
          </div>
          <div class="card-body p-3">
            <form @submit.prevent="modoEdicionContrato ? actualizarContrato() : agregarContrato()">
              <div class="mb-3">
                <label>Nombre del contrato</label>
                <input v-model="nuevoContrato.nombre" class="form-control" list="nombresContratos" required />
                <datalist id="nombresContratos">
                  <option v-for="c in contratos" :key="c.id" :value="c.nombre" />
                </datalist>
              </div>

              <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" id="swContratoActivo" v-model="nuevoContrato.activo">
                <label class="form-check-label" for="swContratoActivo">Contrato activo</label>
              </div>

              <button type="submit" class="btn btn-success w-100 btn-rect" :disabled="loadingContratosBtn">
                {{ loadingContratosBtn ? 'Guardando...' : modoEdicionContrato ? 'Actualizar Contrato' : 'Agregar Contrato' }}
              </button>
              <button
                v-if="modoEdicionContrato"
                type="button"
                class="btn btn-outline-secondary w-100 mt-2 btn-rect"
                @click="cancelarEdicionContrato()"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>

        <div class="card shadow-sm border-0 card-rect">
          <div class="card-header bg-light fw-bold header-rect">➕ Agregar nueva categoría</div>
          <div class="card-body p-3">
            <form @submit.prevent="agregarCategoria()">
              <div class="mb-3">
                <label>Nombre de la categoría</label>
                <input
                  v-model="nuevaCategoria"
                  class="form-control"
                  list="categoriasGuardadas"
                  placeholder="Ej: Camioneta, Excavadora"
                  required
                />
                <datalist id="categoriasGuardadas">
                  <option v-for="cat in categoriasGuardadas" :key="cat" :value="cat" />
                </datalist>
              </div>
              <button type="submit" class="btn btn-success w-100 btn-rect" :disabled="loadingCategoriasBtn">
                {{ loadingCategoriasBtn ? 'Guardando...' : 'Agregar Categoría' }}
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- COL 3: EQUIPOS -->
      <div class="col d-flex flex-column gap-3">
        <div class="card h-70 shadow-sm border-0 card-rect">
          <div class="card-header head-warning header-rect">🚜 Equipos registrados</div>
          <div class="card-body p-3 scroll-panel">

            <div class="row g-2 mb-3">
              <div class="col-md-5">
                <label class="form-label">Filtrar por contrato</label>
                <select v-model="contratoFiltrado" class="form-select" @change="recargarEquipos()">
                  <option value="">Todos</option>
                  <option v-for="c in contratos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>
              </div>
              <div class="col-md-5">
                <label class="form-label">Filtrar por categoría</label>
                <select v-model="categoriaFiltrada" class="form-select" @change="recargarEquipos()">
                  <option value="">Todas</option>
                  <option v-for="cat in categoriasFiltradas" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label invisible d-block">Buscar</label>
                <button class="btn btn-outline-secondary w-100 btn-rect" @click="limpiarFiltrosEquipos()">🧹</button>
              </div>
              <div class="col-12">
                <input
                  v-model="buscaEquipo"
                  class="form-control"
                  placeholder="Buscar por nombre o patente…"
                  @input="recargarEquiposDebounced"
                />
              </div>
            </div>

            <div class="text-center my-2" v-if="loadingEquipos">
              <div class="spinner-border" role="status"></div>
            </div>

            <template v-else-if="equiposPage.length > 0">
              <ul class="list-group list-group-flush">
                <li
                  v-for="e in equiposPage"
                  :key="e.id"
                  class="list-group-item py-2 px-3 d-flex justify-content-between align-items-start flex-column flex-sm-row"
                  style="font-size: 0.9rem;"
                >
                  <div>
                    <strong>ID: {{ e.id }}</strong><br />
                    {{ e.nombre_equipo }}<br />
                    Patente: {{ e.patente }}<br />
                    Modelo: {{ e.fecha_modelo }}<br />
                    Categoría: {{ e.categoria || 'N/A' }}<br />
                    Contrato: {{ nombreContrato(e.contratoId) }}<br />
                    <span class="badge" :class="e.visible_actual === false ? 'text-bg-secondary' : 'text-bg-success'">
                      {{ e.visible_actual === false ? 'Oculto en mes actual' : 'Visible en mes actual' }}
                    </span>
                  </div>
                  <div class="mt-2 mt-sm-0 d-flex gap-1">
                    <button @click="editarEquipo(e)" class="btn btn-sm btn-outline-primary btn-rect">✏️</button>
                    <button @click="toggleVisibleEquipo(e)" class="btn btn-sm btn-outline-secondary btn-rect">
                      {{ e.visible_actual === false ? 'Hacer visible' : 'Ocultar ahora' }}
                    </button>
                    <button @click="confirmEliminarEquipo(e.id)" class="btn btn-sm btn-outline-danger btn-rect">🗑️</button>
                  </div>
                </li>
              </ul>

              <div class="d-grid mt-3">
                <button class="btn btn-outline-secondary btn-rect" :disabled="!equiposHasMore || loadingEquipos" @click="cargarMasEquipos">
                  {{ loadingEquipos ? 'Cargando...' : (equiposHasMore ? 'Cargar más' : 'No hay más resultados') }}
                </button>
              </div>
            </template>
            <div v-else class="text-center text-muted">No hay equipos para los filtros aplicados.</div>
          </div>
        </div>

        <div class="card shadow-sm border-0 card-rect">
          <div class="card-header bg-light fw-bold header-rect">
            {{ modoEdicionEquipo ? '✏️ Editar equipo' : '➕ Registrar equipo' }}
          </div>
          <div class="card-body p-3">
            <form @submit.prevent="modoEdicionEquipo ? actualizarEquipo() : agregarEquipo()">
              <div class="mb-2">
                <label>Nombre del equipo</label>
                <input v-model="nuevoEquipo.nombre_equipo" class="form-control" list="nombresEquipos" required />
                <datalist id="nombresEquipos">
                  <option v-for="e in equiposTodos" :key="e.id" :value="e.nombre_equipo" />
                </datalist>
              </div>
              <div class="mb-2">
                <label>Patente</label>
                <input v-model="nuevoEquipo.patente" class="form-control" list="patentesEquipos" required />
                <datalist id="patentesEquipos">
                  <option v-for="e in equiposTodos" :key="'pat-' + e.id" :value="e.patente" />
                </datalist>
              </div>
              <div class="mb-2">
                <label>Año del modelo</label>
                <select v-model="nuevoEquipo.fecha_modelo" class="form-select" required>
                  <option disabled value="">Selecciona un año</option>
                  <option v-for="anio in aniosDisponibles" :key="anio" :value="anio">{{ anio }}</option>
                </select>
              </div>
              <div class="mb-2">
                <label>Categoría</label>
                <select v-model="nuevoEquipo.categoria" class="form-select" required>
                  <option disabled value="">Selecciona una categoría</option>
                  <option v-for="cat in categoriasCombinadas" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
              <div class="mb-3">
                <label>Contrato</label>
                <select v-model="nuevoEquipo.contratoId" class="form-select" required>
                  <option disabled value="">Selecciona un contrato</option>
                  <option v-for="c in contratos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>
              </div>

              <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" id="swVisible" v-model="nuevoEquipo.visible_actual">
                <label class="form-check-label" for="swVisible">Mostrar el Equipo</label>
              </div>

              <button type="submit" class="btn btn-warning w-100 btn-rect" :disabled="loadingEquiposBtn">
                {{ loadingEquiposBtn ? 'Guardando...' : modoEdicionEquipo ? 'Actualizar Equipo' : 'Agregar Equipo' }}
              </button>
              <button
                v-if="modoEdicionEquipo"
                type="button"
                class="btn btn-outline-secondary w-100 mt-2 btn-rect"
                @click="cancelarEdicionEquipo()"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- COL 4: METAS -->
      <div class="col d-flex flex-column gap-3">
        <div class="card shadow-sm border-0 card-rect">
          <div class="card-header head-info header-rect">📋 Metas de operatividad</div>
          <div class="card-body p-3 scroll-panel">
            <div class="row g-2 mb-3">
              <div class="col-md-6">
                <label class="form-label">Filtrar por contrato</label>
                <select v-model="filtroMetaContrato" class="form-select">
                  <option value="">Todos</option>
                  <option v-for="c in contratos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Filtrar por categoría</label>
                <select v-model="filtroMetaCategoria" class="form-select">
                  <option value="">Todas</option>
                  <option v-for="cat in categoriasMetasFiltrables" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
              <div class="col-12 text-end">
                <button class="btn btn-outline-secondary btn-rect" @click="limpiarFiltrosMetas">🧹</button>
              </div>
            </div>

            <div class="text-center my-2" v-if="loadingMetas">
              <div class="spinner-border" role="status"></div>
            </div>

            <template v-else-if="metasFiltradas.length > 0">
              <ul class="list-group list-group-flush">
                <li
                  v-for="m in metasFiltradas"
                  :key="m.id"
                  class="list-group-item py-2 px-3"
                  style="font-size: 0.9rem;"
                >
                  <div class="w-100 d-flex justify-content-between flex-column flex-sm-row">
                    <div>
                      <strong>{{ nombreContrato(m.contratoId) }}</strong> — {{ m.categoria }}<br />
                      Total existente: {{ m.meta_total }}<br />
                      Mínimo operativo: {{ m.minimo_operativo }}
                    </div>
                    <div class="mt-2 mt-sm-0 d-flex gap-1">
                      <button @click="editarMeta(m)" class="btn btn-sm btn-outline-primary btn-rect">✏️</button>
                      <button @click="confirmEliminarMeta(m.id)" class="btn btn-sm btn-outline-danger btn-rect">🗑️</button>
                    </div>
                  </div>
                  <div class="progress mt-2" style="height: 8px;">
                    <div
                      class="progress-bar"
                      role="progressbar"
                      :style="{ width: `${Math.min(100, Math.round((m.minimo_operativo / Math.max(1, m.meta_total)) * 100))}%` }"
                    ></div>
                  </div>
                  <small class="text-muted">
                    {{ Math.round((m.minimo_operativo / Math.max(1, m.meta_total)) * 100) }}% requerido
                  </small>
                </li>
              </ul>
            </template>

            <div v-else class="text-center text-muted">No hay metas para los filtros aplicados.</div>
          </div>
        </div>

        <div class="card shadow-sm border-0 card-rect">
          <div class="card-header bg-light fw-bold header-rect">
            {{ modoEdicionMeta ? '✏️ Editar meta operativa' : '➕ Agregar nueva meta' }}
          </div>
          <div class="card-body">
            <form @submit.prevent="modoEdicionMeta ? actualizarMetaOperatividad() : guardarMetaOperatividad()">
              <div class="mb-2">
                <label>Contrato</label>
                <select v-model="metaNueva.contratoId" class="form-select" required>
                  <option disabled value="">Selecciona un contrato</option>
                  <option v-for="c in contratos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                </select>
              </div>
              <div class="mb-2">
                <label>Categoría</label>
                <select v-model="metaNueva.categoria" class="form-select" required>
                  <option disabled value="">Selecciona una categoría</option>
                  <option v-for="cat in categoriasCombinadas" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
              <div class="mb-2">
                <label>Total Equipos Existentes</label>
                <input v-model.number="metaNueva.meta_total" type="number" min="0" class="form-control" required />
              </div>
              <div class="mb-3">
                <label>Mínimo operativo requerido</label>
                <input v-model.number="metaNueva.minimo_operativo" type="number" min="0" :max="Math.max(0, metaNueva.meta_total)" class="form-control" required />
              </div>

              <button type="submit" class="btn btn-primary w-100 btn-rect" :disabled="loadingMetasBtn">
                {{ loadingMetasBtn ? (modoEdicionMeta ? 'Actualizando...' : 'Guardando...') : (modoEdicionMeta ? 'Actualizar meta' : 'Guardar meta') }}
              </button>

              <button
                v-if="modoEdicionMeta"
                type="button"
                class="btn btn-outline-secondary w-100 mt-2 btn-rect"
                @click="cancelarEdicionMeta()"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>

    <!-- MODAL CARGA MASIVA -->
    <div class="modal fade" id="bulkModal" tabindex="-1" aria-hidden="true" ref="bulkModalEl">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content modal-pro">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">📥 Carga masiva de equipos</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <p class="mb-2">
              Sube un <strong>CSV</strong> o <strong>Excel</strong> con columnas:
              <code>nombre_equipo, patente, fecha_modelo, categoria, contratoId</code>
              (o <code>contratoNombre</code>).
            </p>
            <input type="file" class="form-control" accept=".csv,.xlsx,.xls" @change="handleBulkFile" />
            <div v-if="bulkPreview.length" class="mt-3">
              <div class="alert alert-info p-2">
                Vista previa ({{ bulkPreview.length }} filas válidas). Duplicados por patente en el archivo fueron ignorados.
              </div>
              <div class="table-responsive" style="max-height: 260px; overflow:auto;">
                <table class="table table-sm table-bordered mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>#</th><th>Nombre</th><th>Patente</th><th>Año</th><th>Categoría</th><th>Contrato</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r,i) in bulkPreview.slice(0,50)" :key="i">
                      <td>{{ i+1 }}</td>
                      <td>{{ r.nombre_equipo }}</td>
                      <td>{{ r.patente }}</td>
                      <td>{{ r.fecha_modelo }}</td>
                      <td>{{ r.categoria }}</td>
                      <td>{{ nombreContrato(r.contratoId) || r.contratoId }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <small class="text-muted">Mostrando primeras 50 filas.</small>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-rect" data-bs-dismiss="modal">Cerrar</button>
            <button class="btn btn-primary btn-rect" :disabled="!bulkPreview.length || loadingBulk" @click="confirmarCargaMasiva">
              {{ loadingBulk ? 'Cargando…' : 'Cargar equipos' }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth } from '../firebase/config'
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { obtenerSiguienteId } from '../firebase/firestore'
import * as bootstrap from 'bootstrap'
import * as XLSX from 'xlsx'

/** Volver **/
const router = useRouter()
const volver = () => router.back()

const contratosActivos = computed(() =>
  (contratos.value || []).filter(c => c.activo !== false)
)
function sanitizeContratosSeleccionados(ids = []) {
  const activos = new Set(contratosActivos.value.map(c => c.id))
  return (ids || []).filter(id => activos.has(id))
}

/** ------------- TOASTS ------------- **/
const toasts = ref([]); let toastId = 0
function toastOk(msg){ toasts.value.push({ id: ++toastId, msg, variant: 'success' }); autoHide(toastId) }
function toastErr(msg){ toasts.value.push({ id: ++toastId, msg, variant: 'danger' }); autoHide(toastId) }
function autoHide(id){ setTimeout(()=> closeToast(id), 3500) }
function closeToast(id){ toasts.value = toasts.value.filter(t => t.id !== id) }

/** ------------- MODAL CONFIRM ------------- **/
const confirmTitle = ref('Confirmar')
const confirmMsg = ref('')
const confirmModalEl = ref(null)
let confirmResolver = null
function askConfirm(title, msg){
  confirmTitle.value = title
  confirmMsg.value = msg
  const modal = new bootstrap.Modal(confirmModalEl.value)
  modal.show()
  return new Promise(res => { confirmResolver = (ok)=>{ modal.hide(); res(ok) } })
}
function confirmOk(){ confirmResolver?.(true) }

/** ------------- STATE ------------- **/
const usuarios = ref([])
const contratos = ref([])
const equiposTodos = ref([])
const metasOperatividad = ref([])
const MIN_YEAR = 1900
const MAX_YEAR = 2026

const aniosDisponibles = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, i) => MAX_YEAR - i // de 2026 hacia atrás
)


// Loading por sección
const loadingUsuarios = ref(false)
const loadingUsuariosBtn = ref(false)
const loadingContratos = ref(false)
const loadingContratosBtn = ref(false)
const loadingCategoriasBtn = ref(false)
const loadingEquipos = ref(false)
const loadingEquiposBtn = ref(false)
const loadingMetas = ref(false)
const loadingMetasBtn = ref(false)

// --- Filtros Equipos + paginación ---
const contratoFiltrado = ref('')
const categoriaFiltrada = ref('')
const buscaEquipo = ref('')

// modo paginación
const equiposPage = ref([])
const equiposHasMore = ref(true)
let equiposLastDoc = null
const PAGE_SIZE = 25
let debounceTimer = null

function recargarEquiposDebounced(){
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(()=> recargarEquipos(), 350)
}
function limpiarFiltrosEquipos(){
  contratoFiltrado.value = ''
  categoriaFiltrada.value = ''
  buscaEquipo.value = ''
  recargarEquipos()
}

/** ------------- CATEGORÍAS ------------- **/
const categoriasGuardadas = ref([])
const nuevaCategoria = ref('')
const categoriasCombinadas = computed(() => {
  const setVals = new Set([
    ...categoriasGuardadas.value.map(c => (c || '').toUpperCase()),
    ...equiposTodos.value.map(e => (e.categoria || '').toUpperCase()).filter(Boolean)
  ])
  return Array.from(setVals)
})
const categoriasFiltradas = computed(() => {
  const unicas = new Set()
  equiposTodos.value.forEach(e => {
    const c = (e.categoria || '').toString().trim().toUpperCase()
    if (c) unicas.add(c)
  })
  categoriasGuardadas.value.forEach(c => {
    const up = (c || '').toString().trim().toUpperCase()
    if (up) unicas.add(up)
  })
  return Array.from(unicas).sort()
})

/** ------------- UTIL ------------- **/
const formatoFecha = (f) => {
  if (typeof f === 'number') return f
  if (f?.toDate) return f.toDate().toLocaleDateString()
  if (f instanceof Date) return f.toLocaleDateString()
  return ''
}
const nombreContrato = (id) => {
  const contrato = contratos.value.find(c => c.id === id)
  return contrato ? contrato.nombre : 'Desconocido'
}
function toUpperSafe(obj, keys){
  keys.forEach(k => obj[k] && (obj[k] = String(obj[k]).toUpperCase()))
  return obj
}
function formatearTelefono(e) {
  let valor = e.target.value.replace(/\D/g, '')
  if (!valor.startsWith('569')) {
    valor = '569' + valor.replace(/^569/, '')
  }
  valor = '+' + valor
  if (valor.length > 12) valor = valor.slice(0, 12)
  nuevoUsuario.value.telefono = valor
}

/** ------------- BUSCADOR USUARIOS ------------- **/
const buscaUsuario = ref('')
const usuariosFiltrados = computed(() => {
  const q = buscaUsuario.value.trim().toLowerCase()
  if (!q) return usuarios.value
  return usuarios.value.filter(u => {
    const campos = [
      u.nombre_completo,
      u.email,
      u.rol,
      u.telefono,
      ...(u.contratosAsignados || []).map(id => nombreContrato(id))
    ].map(v => (v || '').toString().toLowerCase())
    return campos.some(v => v.includes(q))
  })
})

/** ------------- CRUD Usuarios ------------- **/
const modoEdicionUsuario = ref(false)
const usuarioEditId = ref(null)
const nuevoUsuario = ref({
  nombre_completo: '',
  email: '',
  password: '',
  rol: '',
  contratosAsignados: [],
  telefono: ''
})

const seleccionUsuarios = ref([])
const selectAllUsuarios = ref(false)
function toggleAllUsuarios(){
  seleccionUsuarios.value = selectAllUsuarios.value ? usuariosFiltrados.value.map(u => u.id) : []
}

async function obtenerUsuarios() {
  loadingUsuarios.value = true
  try {
    const snap = await getDocs(collection(db, 'usuarios'))
    usuarios.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    toastErr('Error al obtener usuarios: ' + err.message)
  } finally {
    loadingUsuarios.value = false
  }
}

async function agregarUsuario() {
  loadingUsuariosBtn.value = true
  try {
    const cred = await createUserWithEmailAndPassword(auth, nuevoUsuario.value.email, nuevoUsuario.value.password)
    const payload = {
      nombre_completo: nuevoUsuario.value.nombre_completo.trim(),
      email: nuevoUsuario.value.email.trim().toLowerCase(),
      rol: nuevoUsuario.value.rol,
      contratosAsignados: sanitizeContratosSeleccionados(nuevoUsuario.value.contratosAsignados),
      telefono: nuevoUsuario.value.telefono
    }
    toUpperSafe(payload, ['nombre_completo'])
    await setDoc(doc(db, 'usuarios', cred.user.uid), payload)
    nuevoUsuario.value = { nombre_completo:'', email:'', password:'', rol:'', contratosAsignados:[], telefono:'' }
    await obtenerUsuarios()
    toastOk('Usuario agregado')
  } catch (err) {
    toastErr('Error al agregar usuario: ' + err.message)
  } finally {
    loadingUsuariosBtn.value = false
  }
}

function editarUsuario(usuario) {
  modoEdicionUsuario.value = true
  usuarioEditId.value = usuario.id

  const originales = usuario.contratosAsignados || []
  const filtrados = sanitizeContratosSeleccionados(originales)
  if (originales.length && filtrados.length !== originales.length) {
    toastErr('Se ocultaron contratos inactivos en la selección de este usuario.')
  }

  nuevoUsuario.value = {
    nombre_completo: usuario.nombre_completo,
    email: usuario.email,
    password: '',
    rol: usuario.rol,
    contratosAsignados: filtrados,
    telefono: usuario.telefono || ''
  }
}


async function actualizarUsuario() {
  loadingUsuariosBtn.value = true
  try {
    const payload = {
      nombre_completo: nuevoUsuario.value.nombre_completo,
      rol: nuevoUsuario.value.rol,
      contratosAsignados: sanitizeContratosSeleccionados(nuevoUsuario.value.contratosAsignados),
      telefono: nuevoUsuario.value.telefono
    }
    toUpperSafe(payload, ['nombre_completo'])
    await updateDoc(doc(db, 'usuarios', usuarioEditId.value), payload)
    modoEdicionUsuario.value = false
    usuarioEditId.value = null
    nuevoUsuario.value = { nombre_completo:'', email:'', password:'', rol:'', contratosAsignados:[], telefono:'' }
    await obtenerUsuarios()
    toastOk('Usuario actualizado')
  } catch (err) {
    toastErr('Error al actualizar usuario: ' + err.message)
  } finally {
    loadingUsuariosBtn.value = false
  }
}

async function eliminarUsuario(id, email) {
  if (!(await askConfirm('Eliminar usuario', `¿Eliminar el usuario ${email}? Esto borra solo sus datos en Firestore.`))) return
  try {
    await deleteDoc(doc(db, 'usuarios', id))
    await obtenerUsuarios()
    toastOk('Usuario eliminado')
  } catch (err) {
    toastErr('Error al eliminar usuario: ' + err.message)
  }
}

async function eliminarUsuariosSeleccion(){
  if (!seleccionUsuarios.value.length) return
  if (!(await askConfirm('Eliminar usuarios', `¿Eliminar ${seleccionUsuarios.value.length} usuario(s)?`))) return
  try {
    await Promise.all(seleccionUsuarios.value.map(id => deleteDoc(doc(db,'usuarios', id))))
    seleccionUsuarios.value = []
    selectAllUsuarios.value = false
    await obtenerUsuarios()
    toastOk('Usuarios eliminados')
  } catch (err) {
    toastErr('Error al eliminar usuarios: ' + err.message)
  }
}

function cancelarEdicionUsuario(){
  modoEdicionUsuario.value = false
  usuarioEditId.value = null
  nuevoUsuario.value = { nombre_completo:'', email:'', password:'', rol:'', contratosAsignados:[], telefono:'' }
}

/** ------------- CRUD Contratos ------------- **/
const modoEdicionContrato = ref(false)
const contratoEditId = ref(null)
const nuevoContrato = ref({ nombre: '', activo: true })

async function obtenerContratos() {
  loadingContratos.value = true
  try {
    const snap = await getDocs(collection(db, 'contratos'))
    contratos.value = snap.docs.map(d => {
      const data = d.data() || {}
      return {
        id: d.id,
        ...data,
        // fallback: si no existe el campo, considerarlo activo
        activo: data.activo !== false
      }
    })
  } catch (err) {
    toastErr('Error al obtener contratos: ' + err.message)
  } finally {
    loadingContratos.value = false
  }
}


async function agregarContrato() {
  loadingContratosBtn.value = true
  try {
    const nuevoId = await obtenerSiguienteId('contratos')
    const payload = {
      id: nuevoId,
      nombre: String(nuevoContrato.value.nombre || '').toUpperCase(),
      activo: nuevoContrato.value.activo !== false,
      fecha_creacion: new Date()
    }
    await setDoc(doc(db, 'contratos', nuevoId), payload)
    nuevoContrato.value = { nombre: '', activo: true }
    await obtenerContratos()
    toastOk('Contrato agregado')
  } catch (err) {
    toastErr('Error al guardar contrato: ' + err.message)
  } finally {
    loadingContratosBtn.value = false
  }
}


function editarContrato(contrato) {
  modoEdicionContrato.value = true
  contratoEditId.value = contrato.id
  nuevoContrato.value = { nombre: contrato.nombre, activo: contrato.activo !== false }
}

async function actualizarContrato() {
  loadingContratosBtn.value = true
  try {
    await updateDoc(doc(db, 'contratos', contratoEditId.value), {
      nombre: String(nuevoContrato.value.nombre || '').toUpperCase(),
      activo: nuevoContrato.value.activo !== false
    })
    modoEdicionContrato.value = false
    contratoEditId.value = null
    nuevoContrato.value = { nombre: '', activo: true }
    await obtenerContratos()
    toastOk('Contrato actualizado')
  } catch (err) {
    toastErr('Error al actualizar contrato: ' + err.message)
  } finally {
    loadingContratosBtn.value = false
  }
}

async function puedeEliminarContrato(id){
  const eqSnap = await getDocs(query(collection(db,'equipos'), where('contratoId','==', id), limit(1)))
  const usSnap = await getDocs(query(collection(db,'usuarios'), where('contratosAsignados','array-contains', id), limit(1)))
  return eqSnap.empty && usSnap.empty
}

async function confirmEliminarContrato(id){
  if (!(await askConfirm('Eliminar contrato', 'Esta acción no se puede deshacer.'))) return
  try {
    if (!(await puedeEliminarContrato(id))) {
      toastErr('No se puede eliminar: tiene equipos o usuarios asociados')
      return
    }
    await deleteDoc(doc(db, 'contratos', id))
    await obtenerContratos()
    toastOk('Contrato eliminado')
    recargarEquipos()
  } catch (err) {
    toastErr('Error al eliminar contrato: ' + err.message)
  }
}

function cancelarEdicionContrato(){
  modoEdicionContrato.value = false
  contratoEditId.value = null
  nuevoContrato.value = { nombre: '', activo: true }
}
async function toggleActivoContrato(c){
  try {
    const nuevo = !c.activo
    await updateDoc(doc(db, 'contratos', c.id), { activo: nuevo })
    c.activo = nuevo
    toastOk(nuevo ? 'Contrato activado' : 'Contrato desactivado')
  } catch (err) {
    toastErr('No se pudo cambiar estado: ' + err.message)
  }
}

/** ------------- Categorías ------------- **/
async function obtenerCategorias(){
  try {
    const snap = await getDocs(collection(db, 'categorias'))
    categoriasGuardadas.value = snap.docs.map(d => d.data().nombre)
  } catch (err) {
    toastErr('Error al obtener categorías: ' + err.message)
  }
}
async function agregarCategoria(){
  loadingCategoriasBtn.value = true
  try {
    const nombre = String(nuevaCategoria.value || '').toUpperCase()
    if (!nombre) { loadingCategoriasBtn.value = false; return }
    await setDoc(doc(db, 'categorias', nombre), { nombre })
    nuevaCategoria.value = ''
    await obtenerCategorias()
    toastOk('Categoría agregada')
  } catch (err) {
    toastErr('Error al guardar categoría: ' + err.message)
  } finally {
    loadingCategoriasBtn.value = false
  }
}

/** ------------- CRUD Equipos + visibilidad ------------- **/
const modoEdicionEquipo = ref(false)
const equipoEditId = ref(null)
const nuevoEquipo = ref({
  nombre_equipo: '',
  patente: '',
  fecha_modelo: '',
  categoria: '',
  contratoId: '',
  visible_actual: true, // default visible en mes actual
})

async function obtenerEquiposTodos() {
  try {
    const snap = await getDocs(collection(db, 'equipos'))
    equiposTodos.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    toastErr('Error al obtener equipos (datalist): ' + err.message)
  }
}

/** NUEVO: alternar visibilidad mes actual */
async function toggleVisibleEquipo(equipo) {
  try {
    const nuevo = (equipo.visible_actual === false) ? true : false
    await updateDoc(doc(db, 'equipos', equipo.id), { visible_actual: nuevo })
    toastOk(nuevo ? 'Equipo visible en mes actual' : 'Equipo oculto para mes actual')
    await recargarEquipos()
    await obtenerEquiposTodos()
  } catch (err) {
    toastErr('No se pudo cambiar visibilidad: ' + err.message)
  }
}

function qEquiposPorNombrePrefijo(pref, contratoId, categoria) {
  const col = collection(db, 'equipos')
  const p = String(pref).toUpperCase()

  if (contratoId && categoria) {
    return query(
      col,
      where('contratoId', '==', contratoId),
      where('categoria', '==', String(categoria).toUpperCase()),
      orderBy('nombre_equipo'),
      where('nombre_equipo', '>=', p),
      where('nombre_equipo', '<=', p + '\uf8ff'),
      limit(PAGE_SIZE)
    )
  }
  if (contratoId) {
    return query(
      col,
      where('contratoId', '==', contratoFiltrado.value),
      orderBy('nombre_equipo'),
      where('nombre_equipo', '>=', p),
      where('nombre_equipo', '<=', p + '\uf8ff'),
      limit(PAGE_SIZE)
    )
  }
  if (categoria) {
    return query(
      col,
      where('categoria','==', String(categoria).toUpperCase()),
      orderBy('nombre_equipo'),
      where('nombre_equipo','>=', p),
      where('nombre_equipo','<=', p + '\uf8ff'),
      limit(PAGE_SIZE)
    )
  }
  return query(
    col,
    orderBy('nombre_equipo'),
    where('nombre_equipo', '>=', p),
    where('nombre_equipo', '<=', p + '\uf8ff'),
    limit(PAGE_SIZE)
  )
}

function qEquiposPorPatentePrefijo(pref, contratoId, categoria) {
  const col = collection(db, 'equipos')
  const p = String(pref).toUpperCase()

  if (contratoId && categoria) {
    return query(
      col,
      where('contratoId', '==', contratoId),
      where('categoria', '==', String(categoria).toUpperCase()),
      orderBy('patente'),
      where('patente', '>=', p),
      where('patente', '<=', p + '\uf8ff'),
      limit(PAGE_SIZE)
    )
  }
  if (contratoId) {
    return query(
      col,
      where('contratoId', '==', contratoId),
      orderBy('patente'),
      where('patente', '>=', p),
      where('patente', '<=', p + '\uf8ff'),
      limit(PAGE_SIZE)
    )
  }
  if (categoria) {
    return query(
      col,
      where('categoria','==', String(categoria).toUpperCase()),
      orderBy('patente'),
      where('patente','>=', p),
      where('patente','<=', p + '\uf8ff'),
      limit(PAGE_SIZE)
    )
  }
  return query(
    col,
    orderBy('patente'),
    where('patente', '>=', p),
    where('patente', '<=', p + '\uf8ff'),
    limit(PAGE_SIZE)
  )
}

function buildEquiposQuery({ reset = false } = {}) {
  const colRef = collection(db, 'equipos')
  const catUp = categoriaFiltrada.value ? String(categoriaFiltrada.value).toUpperCase() : null
  const hasContrato = !!contratoFiltrado.value

  let qRef
  if (hasContrato && catUp) {
    qRef = query(
      colRef,
      where('contratoId', '==', contratoFiltrado.value),
      where('categoria', '==', catUp),
      orderBy('nombre_equipo'),
      limit(PAGE_SIZE)
    )
  } else if (hasContrato) {
    qRef = query(
      colRef,
      where('contratoId', '==', contratoFiltrado.value),
      orderBy('nombre_equipo'),
      limit(PAGE_SIZE)
    )
  } else if (catUp) {
    qRef = query(
      colRef,
      where('categoria', '==', catUp),
      orderBy('nombre_equipo'),
      limit(PAGE_SIZE)
    )
  } else {
    qRef = query(colRef, orderBy('nombre_equipo'), limit(PAGE_SIZE))
  }

  if (!reset && equiposLastDoc) {
    qRef = query(qRef, startAfter(equiposLastDoc))
  }
  return qRef
}

async function recargarEquipos() {
  loadingEquipos.value = true
  equiposHasMore.value = true
  equiposLastDoc = null
  equiposPage.value = []

  try {
    const hasBusca = !!String(buscaEquipo.value).trim()
    const catUp = categoriaFiltrada.value ? String(categoriaFiltrada.value).toUpperCase() : null

    if (hasBusca) {
      const pref = String(buscaEquipo.value).trim().toUpperCase()

      const [snapNombre, snapPatente] = await Promise.all([
        getDocs(qEquiposPorNombrePrefijo(pref, contratoFiltrado.value || '', catUp)),
        getDocs(qEquiposPorPatentePrefijo(pref, contratoFiltrado.value || '', catUp)),
      ])

      const mapa = new Map()
      for (const d of snapNombre.docs) mapa.set(d.id, { id: d.id, ...d.data() })
      for (const d of snapPatente.docs) mapa.set(d.id, { id: d.id, ...d.data() })

      let items = Array.from(mapa.values())
      if (catUp) items = items.filter(e => (e.categoria || '').toString().toUpperCase() === catUp)
      items.sort((a, b) => String(a.nombre_equipo || '').localeCompare(String(b.nombre_equipo || ''), 'es', { sensitivity: 'base' }))

      equiposPage.value = items
      equiposHasMore.value = false
      equiposLastDoc = null
      return
    }

    const q = buildEquiposQuery({ reset: true })
    const snap = await getDocs(q)

    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (catUp) items = items.filter(e => (e.categoria || '').toString().toUpperCase() === catUp)
    items.sort((a, b) => String(a.nombre_equipo || '').localeCompare(String(b.nombre_equipo || ''), 'es', { sensitivity: 'base' }))

    equiposPage.value = items
    equiposLastDoc = snap.docs.at(-1) || null
    equiposHasMore.value = snap.size === PAGE_SIZE
  } catch (err) {
    const m = (err?.message || '').match(/https:\/\/console\.firebase\.google\.com\/[^\s)]+/i)
    if (m) {
      window.open(m[0], '_blank')
      toastErr('Falta un índice para esta consulta. Abrí la página para crearlo.')
    } else {
      toastErr('Error al cargar equipos: ' + (err?.message || err))
    }
  } finally {
    loadingEquipos.value = false
  }
}

async function cargarMasEquipos() {
  if (!equiposHasMore.value || loadingEquipos.value) return
  if (String(buscaEquipo.value).trim()) return
  loadingEquipos.value = true
  try {
    const q = buildEquiposQuery()
    const snap = await getDocs(q)
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (categoriaFiltrada.value) {
      const cat = String(categoriaFiltrada.value).toUpperCase()
      items = items.filter(e => (e.categoria || '').toUpperCase() === cat)
    }
    equiposPage.value.push(...items)
    equiposLastDoc = snap.docs.at(-1) || equiposLastDoc
    equiposHasMore.value = snap.size === PAGE_SIZE
  } catch (err) {
    toastErr('Error al cargar más equipos: ' + err.message)
  } finally {
    loadingEquipos.value = false
  }
}

/** ------------- INIT ------------- **/
const init = async () => {
  await Promise.all([
    obtenerUsuarios(),
    obtenerContratos(),
    obtenerMetasOperatividad(),
    obtenerCategorias(),
    obtenerEquiposTodos()
  ])
  await recargarEquipos()
}
onMounted(() => { init() })

async function agregarEquipo() {
  loadingEquiposBtn.value = true
  try {
    const nuevoId = await obtenerSiguienteId('equipos')
    const payload = {
      id: nuevoId,
      nombre_equipo: String(nuevoEquipo.value.nombre_equipo || '').toUpperCase(),
      patente: String(nuevoEquipo.value.patente || '').toUpperCase(),
      fecha_modelo: parseInt(nuevoEquipo.value.fecha_modelo),
      categoria: String(nuevoEquipo.value.categoria || '').toUpperCase(),
      contratoId: nuevoEquipo.value.contratoId,
      visible_actual: nuevoEquipo.value.visible_actual !== false
    }
    await setDoc(doc(db, 'equipos', String(nuevoId)), payload)
    nuevoEquipo.value = { nombre_equipo:'', patente:'', fecha_modelo:'', categoria:'', contratoId:'', visible_actual:true }
    await obtenerEquiposTodos()
    await recargarEquipos()
    toastOk('Equipo agregado')
  } catch (err) {
    toastErr('Error al guardar equipo: ' + err.message)
  } finally {
    loadingEquiposBtn.value = false
  }
}

function editarEquipo(equipo) {
  modoEdicionEquipo.value = true
  equipoEditId.value = equipo.id
  nuevoEquipo.value = {
    nombre_equipo: equipo.nombre_equipo,
    patente: equipo.patente,
    fecha_modelo: equipo.fecha_modelo,
    categoria: equipo.categoria || '',
    contratoId: equipo.contratoId,
    visible_actual: equipo.visible_actual !== false
  }
}

async function actualizarEquipo() {
  loadingEquiposBtn.value = true
  try {
    const payload = {
      nombre_equipo: String(nuevoEquipo.value.nombre_equipo || '').toUpperCase(),
      patente: String(nuevoEquipo.value.patente || '').toUpperCase(),
      fecha_modelo: parseInt(nuevoEquipo.value.fecha_modelo),
      categoria: String(nuevoEquipo.value.categoria || '').toUpperCase(),
      contratoId: nuevoEquipo.value.contratoId,
      visible_actual: nuevoEquipo.value.visible_actual !== false
    }
    await updateDoc(doc(db, 'equipos', equipoEditId.value), payload)
    modoEdicionEquipo.value = false
    equipoEditId.value = null
    nuevoEquipo.value = { nombre_equipo:'', patente:'', fecha_modelo:'', categoria:'', contratoId:'', visible_actual:true }
    await obtenerEquiposTodos()
    await recargarEquipos()
    toastOk('Equipo actualizado')
  } catch (err) {
    toastErr('Error al actualizar equipo: ' + err.message)
  } finally {
    loadingEquiposBtn.value = false
  }
}

async function confirmEliminarEquipo(id){
  if (!(await askConfirm('Eliminar equipo', '¿Eliminar este equipo definitivamente?'))) return
  try {
    await deleteDoc(doc(db, 'equipos', id))
    await obtenerEquiposTodos()
    await recargarEquipos()
    toastOk('Equipo eliminado')
  } catch (err) {
    toastErr('Error al eliminar equipo: ' + err.message)
  }
}

function cancelarEdicionEquipo(){
  modoEdicionEquipo.value = false
  equipoEditId.value = null
  nuevoEquipo.value = { nombre_equipo:'', patente:'', fecha_modelo:'', categoria:'', contratoId:'', visible_actual:true }
}

/** ------------- Metas operatividad ------------- **/
const modoEdicionMeta = ref(false)
const metaEditId = ref(null)
const metaNueva = ref({
  contratoId: '',
  categoria: '',
  minimo_operativo: 0,
  meta_total: 0
})

const filtroMetaContrato = ref('')
const filtroMetaCategoria = ref('')

const categoriasMetasFiltrables = computed(() => {
  const set = new Set([
    ...metasOperatividad.value.map(m => (m.categoria || '').toString().toUpperCase()).filter(Boolean),
    ...categoriasCombinadas.value
  ])
  return Array.from(set).sort()
})

const metasFiltradas = computed(() => {
  const cId = filtroMetaContrato.value
  const cat = (filtroMetaCategoria.value || '').toString().toUpperCase()
  return metasOperatividad.value.filter(m => {
    const passContrato = !cId || m.contratoId === cId
    const passCat = !cat || (m.categoria || '').toString().toUpperCase() === cat
    return passContrato && passCat
  })
})

function limpiarFiltrosMetas(){
  filtroMetaContrato.value = ''
  filtroMetaCategoria.value = ''
}

async function obtenerMetasOperatividad() {
  loadingMetas.value = true
  try {
    const snap = await getDocs(collection(db, 'operatividad_base'))
    metasOperatividad.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    toastErr('Error al obtener metas: ' + e.message)
  } finally {
    loadingMetas.value = false
  }
}

async function guardarMetaOperatividad() {
  loadingMetasBtn.value = true
  try {
    await addDoc(collection(db, 'operatividad_base'), {
      contratoId: metaNueva.value.contratoId,
      categoria: metaNueva.value.categoria,
      minimo_operativo: metaNueva.value.minimo_operativo,
      meta_total: metaNueva.value.meta_total,
      ts: serverTimestamp()
    })
    metaNueva.value = { contratoId:'', categoria:'', minimo_operativo: 0, meta_total: 0 }
    await obtenerMetasOperatividad()
    toastOk('Meta agregada')
  } catch (e) {
    toastErr('Error al guardar meta: ' + e.message)
  } finally {
    loadingMetasBtn.value = false
  }
}

function editarMeta(meta) {
  modoEdicionMeta.value = true
  metaEditId.value = meta.id
  metaNueva.value = {
    contratoId: meta.contratoId,
    categoria: meta.categoria,
    minimo_operativo: meta.minimo_operativo,
    meta_total: meta.meta_total
  }
}

async function actualizarMetaOperatividad() {
  loadingMetasBtn.value = true
  try {
    await updateDoc(doc(db, 'operatividad_base', metaEditId.value), {
      contratoId: metaNueva.value.contratoId,
      categoria: metaNueva.value.categoria,
      minimo_operativo: metaNueva.value.minimo_operativo,
      meta_total: metaNueva.value.meta_total
    })
    modoEdicionMeta.value = false
    metaEditId.value = null
    metaNueva.value = { contratoId:'', categoria:'', minimo_operativo: 0, meta_total: 0 }
    await obtenerMetasOperatividad()
    toastOk('Meta actualizada')
  } catch (e) {
    toastErr('Error al actualizar meta: ' + e.message)
  } finally {
    loadingMetasBtn.value = false
  }
}

async function confirmEliminarMeta(id){
  if (!(await askConfirm('Eliminar meta', '¿Eliminar esta meta base de operatividad?'))) return
  try {
    await deleteDoc(doc(db, 'operatividad_base', id))
    await obtenerMetasOperatividad()
    toastOk('Meta eliminada')
  } catch (e) {
    toastErr('Error al eliminar meta: ' + e.message)
  }
}

function cancelarEdicionMeta(){
  modoEdicionMeta.value = false
  metaEditId.value = null
  metaNueva.value = { contratoId:'', categoria:'', minimo_operativo: 0, meta_total: 0 }
}

/** ------------- CARGA MASIVA ------------- **/
const bulkModalEl = ref(null)
const bulkPreview = ref([])
const loadingBulk = ref(false)

function normalizaFila(r){
  const fila = {
    nombre_equipo: String(r.nombre_equipo || '').trim().toUpperCase(),
    patente: String(r.patente || '').trim().toUpperCase(),
    fecha_modelo: parseInt(r.fecha_modelo || r.modelo || r.anio || r.año),
    categoria: String(r.categoria || '').trim().toUpperCase(),
    contratoId: String(r.contratoId || '').trim(),
    contratoNombre: String(r.contratoNombre || r.contrato || '').trim().toUpperCase()
  }
  if (!fila.contratoId && fila.contratoNombre) {
    const c = contratos.value.find(x => String(x.nombre).toUpperCase() === fila.contratoNombre)
    if (c) fila.contratoId = c.id
  }
  return fila
}

async function handleBulkFile(e){
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    let rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

    const seenPat = new Set()
    const parsed = []
    for (const r of rows) {
      const f = normalizaFila(r)
      if (!f.nombre_equipo || !f.patente || !f.fecha_modelo || !f.categoria || !f.contratoId) continue
      if (seenPat.has(f.patente)) continue
      seenPat.add(f.patente)
      parsed.push(f)
    }

    const existentes = new Set(equiposTodos.value.map(e => String(e.patente).toUpperCase()))
    const finalRows = parsed.filter(f => !existentes.has(f.patente))

    bulkPreview.value = finalRows
    if (!finalRows.length) toastErr('No hay filas válidas o todas son duplicados de patentes existentes.')
  } catch (err) {
    toastErr('Error leyendo archivo: ' + err.message)
  } finally {
    e.target.value = ''
  }
}

async function confirmarCargaMasiva(){
  if (!bulkPreview.value.length) return
  loadingBulk.value = true
  try {
    const CHUNK = 450
    for (let i = 0; i < bulkPreview.value.length; i += CHUNK) {
      const batch = writeBatch(db)
      const slice = bulkPreview.value.slice(i, i + CHUNK)
      for (const row of slice) {
        const nuevoId = await obtenerSiguienteId('equipos')
        const payload = {
          id: nuevoId,
          nombre_equipo: row.nombre_equipo,
          patente: row.patente,
          fecha_modelo: parseInt(row.fecha_modelo),
          categoria: row.categoria,
          contratoId: row.contratoId,
          visible_actual: true // por defecto visibles al cargar masivo
        }
        const docRef = doc(db, 'equipos', String(nuevoId))
        batch.set(docRef, payload)
      }
      await batch.commit()
    }

    bulkPreview.value = []
    await obtenerEquiposTodos()
    await recargarEquipos()
    toastOk('Carga masiva completa')
    bootstrap.Modal.getInstance(bulkModalEl.value)?.hide()
  } catch (err) {
    toastErr('Error en carga masiva: ' + err.message)
  } finally {
    loadingBulk.value = false
  }
}
</script>

<script>
export default { name: 'AdminPanelView' }
</script>

<style scoped>
/* ===== Fondo estilo nuevo ===== */
.admin-page{
  min-height: calc(100vh - 56px);
  background:
    radial-gradient(1200px 650px at 15% 10%, rgba(220, 53, 69, 0.10), transparent 60%),
    radial-gradient(900px 550px at 85% 20%, rgba(13, 110, 253, 0.08), transparent 60%),
    linear-gradient(180deg, #ffffff, #fbfbfc);
}

/* ===== Header/Hero RECTANGULAR ===== */
.hero{
  border-radius: 12px;
  position: relative;
}
.hero-bg{
  position:absolute;
  inset:0;
  background: linear-gradient(90deg, rgba(220,53,69,.10), rgba(170,25,40,.05));
}

/* Barra central rectangular */
.title-bar{
  display: inline-flex;
  align-items: stretch;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,.06);
  background: rgba(255,255,255,.85);
  box-shadow: 0 10px 22px rgba(0,0,0,.06);
  max-width: 720px;
  width: 100%;
}
.title-left{
  width: 44px;
  display:flex;
  align-items:center;
  justify-content:center;
  background: rgba(220,53,69,.10);
  color: #b21f2d;
}
.title-mid{
  padding: .45rem .8rem;
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap: .1rem;
}
.title-text{
  font-weight: 900;
  font-size: .95rem;
  line-height: 1.1;
}
.title-sub{
  font-size: .78rem;
  color: #6c757d;
  line-height: 1.1;
}

/* ===== Botones “rectos” ===== */
.btn-rect{
  border-radius: 10px;
  font-weight: 800;
}

/* Cards rectangulares */
.card-rect{
  border-radius: 12px;
}
.header-rect{
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  font-weight: 900;
}

/* Headers de cards */
.head-primary{ background: rgba(13,110,253,1); color:#fff; }
.head-success{ background: rgba(25,135,84,1); color:#fff; }
.head-warning{ background: rgba(255,193,7,1); color:#212529; }
.head-info{ background: rgba(13,202,240,1); color:#0b2b33; }

/* Toast */
.toast-pro{ border-radius: 12px; }

/* Modal */
.modal-pro{
  border-radius: 12px;
  border: 0;
  box-shadow: 0 20px 60px rgba(0,0,0,.22);
}

/* Scroll */
.scroll-panel {
  max-height: 350px;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: #ccc #f9f9f9;
}
.scroll-panel::-webkit-scrollbar { width: 6px; }
.scroll-panel::-webkit-scrollbar-track { background: #f9f9f9; border-radius: 4px; }
.scroll-panel::-webkit-scrollbar-thumb { background: #bbb; border-radius: 4px; }
.scroll-panel::-webkit-scrollbar-thumb:hover { background: #999; }

/* Botón ancho en XS */
.btn-w-xs { width: 100%; }
@media (min-width: 576px) {
  .btn-w-xs { width: auto; }
}

/* Móvil */
@media (max-width: 575.98px) {
  .container-fluid {
    padding-left: 14px !important;
    padding-right: 14px !important;
  }
  .scroll-panel { max-height: 60vh; }
  .form-label { font-size: .95rem; }
  .form-control, .form-select { font-size: .95rem; }
  .title-bar{ max-width: 100%; }
  .title-left{ width: 40px; }
}
</style>


