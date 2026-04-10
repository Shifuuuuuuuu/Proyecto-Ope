<!-- src/views/HomeView.vue -->
<template>
  <div class="bg-white">
    <div class="container-fluid py-4 px-3">
      <transition name="fade">
        <div v-if="descargandoExcel" class="excel-overlay">
          <div class="excel-box text-center text-white">
            <div class="spinner-border text-light" role="status" aria-hidden="true"></div>
            <div class="mt-3 fw-bold">Generando Excel…</div>
            <div class="small text-white-50">Esto puede tardar unos segundos</div>
          </div>
        </div>
      </transition>

      <!-- ALERTA: contratos con inactividad >= 48h -->
      <transition name="alert-pop" appear>
        <div
          v-if="showAlert && contratosAtrasados.length"
          class="alert alert-danger border-0 shadow-sm mb-4"
        >
          <div class="d-flex align-items-start justify-content-between gap-3 flex-wrap">
            <div class="d-flex align-items-start gap-3 flex-grow-1">
              <i class="bi bi-exclamation-triangle-fill fs-3"></i>
              <div class="min-w-0">
                <h5 class="mb-1">Atención: inactividad detectada</h5>
                <p class="mb-2">
                  Los siguientes contratos tienen <strong>días sin registro de operatividad hasta hoy</strong>.
                  Debes completar los turnos <strong>A </strong> y <strong>B</strong> para dejar el contrato al día.
                </p>
                <!-- Listado compacto de contratos atrasados -->
                <ul class="list-unstyled mb-0">
                  <li v-for="c in contratosAtrasados" :key="c.id" class="mb-2">
                    <div class="d-flex flex-wrap align-items-center gap-2">
                      <span class="badge text-bg-light border text-truncate" :title="c.nombre" style="max-width: 60ch;">
                        {{ c.nombre }}
                      </span>
                      <div class="small text-muted d-flex flex-column flex-sm-row align-items-sm-center gap-1">
                        <!-- Bloque: Último día registrado -->
                        <div class="d-flex align-items-center flex-wrap gap-1">
                          <span class="text-nowrap">Último día registrado:</span>
                          <strong>{{ c._ultimoTextoCorto }}</strong>
                        </div>

                        <!-- Bloque: Días sin registro (solo si hay) -->
                        <div
                          v-if="c._diasSinRegistro && c._diasSinRegistro > 0"
                          class="d-flex align-items-center flex-wrap gap-1"
                        >
                          <!-- Punto separador solo en pantallas sm+ -->
                          <span class="d-none d-sm-inline">·</span>

                          <span class="text-nowrap">Días sin registro:</span>

                          <!-- Badge para que el número se vea clarito en todas las resoluciones -->
                          <span class="badge rounded-pill text-bg-light">
                            {{ c._diasSinRegistro }}
                          </span>
                        </div>
                      </div>
                      <button
                        class="btn btn-sm btn-outline-dark"
                        @click="abrirContratoDesdeAlerta(c.id)"
                        :disabled="loadingContrato[c.id]"
                      >
                        <i class="bi bi-pencil-square me-1"></i> Registrar ahora
                      </button>
                    </div>
                  </li>
                </ul>

                <div v-if="contratosNuncaRegistrados.length" class="mt-2">
                  <span class="badge text-bg-secondary">Sin registros previos</span>
                  <span class="small ms-2">
                    {{ contratosNuncaRegistrados.map(x => x.nombre).join(', ') }}
                  </span>
                </div>
              </div>
            </div>

            <div class="text-end">
              <button class="btn btn-sm btn-outline-secondary" @click="refrescarAlertaAnimada">
                <i class="bi bi-arrow-clockwise"></i> Actualizar
              </button>
            </div>
          </div>
        </div>
      </transition>

      <div v-if="mostrarInstrucciones" class="alert alert-warning border">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <strong class="text-danger">📌 Instrucciones:</strong>
            <ul class="mb-0 small">
              <li><strong>D</strong>: Disponible</li>
              <li><strong>F</strong>: Falla (fuera de servicio)</li>
              <li><strong>M</strong>: Mantención</li>
            </ul>
          </div>
          <button class="btn-close ms-auto" @click="mostrarInstrucciones = false"></button>
        </div>
      </div>

      <h2 class="text-center mb-1">Contrato Asignado</h2>
      <p class="text-center text-muted mb-4">
        Período de: <strong>{{ etiquetaPeriodo }}</strong>
      </p>

      <!-- Accesos rápidos + Volver -->
      <div class="d-flex flex-wrap justify-content-start gap-2 mb-4">
        <button
          class="btn btn-outline-secondary"
          @click="$router.back()"
          title="Volver a la página anterior"
        >
          <i class="bi bi-arrow-left-circle me-1"></i> Volver al menú
        </button>

        <router-link
          v-if="estaLogueado"
          class="btn btn-outline-secondary"
          to="/historial-operatividad"
        >
          <i class="bi bi-clock-history me-1"></i> Historial
        </router-link>

        <router-link
          v-if="rolUsuario === 'operador' || rolUsuario === 'admin'"
          class="btn btn-outline-secondary"
          to="/mis-equipos"
        >
          <i class="bi bi-tools me-1"></i> Editor Equipos
        </router-link>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-danger" role="status"></div>
      </div>

      <div v-else>
        <div v-if="!loading && contratosUsuario.length === 0" class="alert alert-warning">
          No tienes contratos asignados. Contacta al administrador si crees que es un error.
        </div>

        <div v-else class="row g-4">
          <div class="col-12" v-for="contrato in contratosUsuarioValidos" :key="contrato.id">
            <div class="card border" :data-contrato-id="contrato.id">
              <div class="card-body">
                <!-- Cabecera responsiva -->
                <div class="contrato-row">
                  <!-- Título -->
                  <div class="contrato-row__title">
                    <span class="emoji me-2">{{ emojiContrato(contrato.nombre) }}</span>
                    <h4
                      class="card-title mb-0 text-truncate"
                      :title="contrato.nombre"
                      @mouseenter="hoverContratoId = contrato.id"
                      @mouseleave="hoverContratoId = null"
                      @click="toggleNombreExpand(contrato.id)"
                      :class="{
                        'nombre-expandido': nombreExpandidoId === contrato.id || hoverContratoId === contrato.id
                      }"
                    >
                      {{ contrato.nombre }}
                    </h4>

                    <!-- NUEVO: badge estado -->
                    <span
                      class="badge ms-2"
                      :class="contrato.activo !== false ? 'text-bg-success' : 'text-bg-secondary'"
                      title="Estado del contrato"
                    >
                      {{ contrato.activo !== false ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>

                  <!-- Acciones -->
                  <div class="contrato-row__actions">
                    <div class="switches">
                      <div class="form-check form-switch me-2">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          v-model="modoAcciones"
                          :id="`swHist-${contrato.id}`"
                        />
                        <label class="form-check-label d-none d-md-inline" :for="`swHist-${contrato.id}`">Historial</label>
                      </div>

                      <!-- Selección múltiple -->
                      <div class="form-check form-switch me-2">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          v-model="selectionMode"
                          :id="`swSel-${contrato.id}`"
                        />
                        <label class="form-check-label d-none d-md-inline" :for="`swSel-${contrato.id}`">Selección múltiple</label>
                      </div>
                    </div>

                    <div class="actions-toolbar">
                      <button class="btn btn-outline-secondary" @click="toggleZoomTabla">
                        <i :class="zoomTabla ? 'bi bi-zoom-in' : 'bi bi-zoom-out'" title="Cambiar zoom de tabla"></i>
                      </button>

                      <button
                        class="btn btn-outline-primary"
                        @click="toggleExpand(contrato.id)"
                        :disabled="loadingContrato[contrato.id]"
                        title="Mostrar/Ocultar detalle del contrato"
                      >
                        <i :class="expandedContrato === contrato.id ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'"></i>
                      </button>
                      <button
                        class="btn btn-outline-warning"
                        @click="$router.push({ name: 'EditarOperatividadHistorica', query: { contratoId: contrato.id } })"
                        :disabled="loadingContrato[contrato.id]"
                        title="Solicitar edición de meses anteriores"
                      >
                        <i class="bi bi-calendar-range"></i>
                      </button>
                      <button
                        class="btn btn-outline-primary"
                        @click="toggleMes(contrato.id)"
                        :disabled="loadingContrato[contrato.id]"
                        title="Navegar entre meses"
                      >
                        <i class="bi" :class="mesOffset === 0 ? 'bi-arrow-left-circle' : 'bi-arrow-right-circle'"></i>
                      </button>

                      <button
                        class="btn btn-outline-success"
                        @click="descargarExcelContrato(contrato)"
                        :disabled="descargandoExcel || !canDescargarExcel || loadingContrato[contrato.id]"
                        :title="!canDescargarExcel ? 'Tu rol no permite descargar Excel' : (descargandoExcel ? 'Generando…' : 'Descargar Excel')"
                      >
                        <i class="bi" :class="descargandoExcel ? 'bi-hourglass-split' : 'bi-download'"></i>
                      </button>

                      <button
                        class="btn btn-outline-dark"
                        @click="$router.push({ name:'ContratoStats', params:{ contratoId: contrato.id }})"
                        :disabled="loadingContrato[contrato.id]"
                        title="Ver estadísticas de operatividad del contrato"
                      >
                        <i class="bi bi-bar-chart"></i>
                      </button>

                      <button
                        class="btn btn-outline-danger"
                        @click="$router.push({ name: 'OTsPage', params:{ contratoId: contrato.id }})"
                        :disabled="loadingContrato[contrato.id]"
                        title="Cargar y ver OTs de equipos en Falla o Mantención"
                      >
                        <i class="bi bi-file-earmark-text"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Barra de acciones por selección -->
                <div
                  v-if="expandedContrato === contrato.id && selectedCellsCount > 0"
                  class="alert alert-dark d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2 py-2 px-3"
                >
                <transition name="batch-progress-pop">
                  <div
                    v-if="expandedContrato === contrato.id && batchProgress.visible"
                    class="batch-progress-card mb-3"
                  >
                    <div class="d-flex justify-content-between align-items-center gap-3 mb-2">
                      <div class="fw-semibold">
                        {{ batchProgress.action }} celdas...
                      </div>
                      <div class="small text-muted">
                        {{ batchProgress.current }} / {{ batchProgress.total }}
                      </div>
                    </div>

                    <div class="progress batch-progress-bar">
                      <div
                        class="progress-bar progress-bar-striped progress-bar-animated"
                        role="progressbar"
                        :style="{ width: `${batchProgress.total ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }"
                      ></div>
                    </div>
                  </div>
                </transition>
                  <div class="d-flex align-items-center gap-3">
                    <strong class="me-1">Seleccionadas:</strong>
                    <span class="badge text-bg-secondary">{{ selectedCellsCount }}</span>
                    <span class="text-muted small text-truncate">({{ selectionContratoNombre }})</span>
                  </div>

                  <div class="d-flex align-items-center gap-2 flex-wrap">
                    <div class="btn-group" role="group" aria-label="Asignar estado rápido">
                      <button class="btn btn-sm btn-outline-success" @click="applyBatchQuick('D')">Marcar D</button>
                      <button class="btn btn-sm btn-outline-danger"  @click="applyBatchQuick('F')">Marcar F</button>
                      <button class="btn btn-sm btn-outline-warning" @click="applyBatchQuick('M')">Marcar M</button>
                      <button class="btn btn-sm btn-outline-dark" @click="openBatchClearModal">
                        Limpiar marcado
                      </button>
                    </div>

                    <button class="btn btn-sm btn-primary" @click="openBatchModal">
                      Aplicar con comentario…
                    </button>

                    <button class="btn btn-sm btn-outline-secondary" @click="clearSelection">
                      Limpiar selección
                    </button>
                  </div>
                </div>

                <!-- Detalle contrato -->
                <div v-if="expandedContrato === contrato.id" class="scroll-equipos">
                  <div v-if="loadingContrato[contrato.id]" class="text-center py-4">
                    <div class="spinner-border"></div>
                  </div>

                  <template v-else>
                    <template v-for="(grupo, categoria) in equiposPorContratoYCategoria(contrato.id)" :key="categoria">
                      <div class="card mb-4 border">
                        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                          <span class="text-truncate">{{ categoria }}</span>
                          <small class="text-white-50">Equipos: {{ grupo.length }}</small>
                        </div>

                        <div class="card-body p-0">
                          <div class="scroll-horizontal">
                            <table
                              class="table table-bordered table-sm text-center align-middle mb-0"
                              :class="[tablaClaseModo, { 'tabla-zoom-out': zoomTabla }]"
                            >
                              <!-- CABECERA: SIEMPRE DOS TURNOS (A/B) -->
                              <thead class="table-light">
                                <tr>
                                  <th rowspan="2" class="sticky-col col-interno">Nº INTERNO</th>
                                  <th rowspan="2" class="sticky-col-2 col-ppu">PPU</th>
                                  <th rowspan="2" class="sticky-col-3 col-docs">Docs</th>
                                  <th v-for="dia in diasPorContratoMap[contrato.id]" :key="dia" colspan="2">
                                    {{ dia }}
                                  </th>
                                </tr>
                                <tr>
                                  <template v-for="dia in diasPorContrato(contrato.id)" :key="'sub-' + dia">
                                    <th class="th-turno">A</th>
                                    <th class="th-turno">B</th>
                                  </template>
                                </tr>
                              </thead>

                              <tbody>
                                <tr v-for="(equipo, rowIndex) in grupo" :key="equipo.id">
                                  <td class="sticky-col col-interno text-truncate" :title="equipo.nombre_equipo">{{ equipo.nombre_equipo }}</td>
                                  <td class="sticky-col-2 col-ppu text-truncate" :title="equipo.patente">{{ equipo.patente }}</td>
                                  <td class="sticky-col-3 col-docs text-center">
                                    <button
                                      class="btn btn-sm btn-outline-dark"
                                      :title="`Documentos de ${equipo.nombre_equipo || 'equipo'}`"
                                      @click.stop="abrirGestorDocs(equipo)"
                                      :disabled="subiendoDocs"
                                    >
                                      <i class="bi bi-paperclip"></i>
                                    </button>
                                  </td>

                                  <template v-for="(dia, diaIndex) in diasPorContratoMap[contrato.id]" :key="'turno-' + dia">
                                    <!-- A -->
                                    <td
                                      class="position-relative p-1"
                                      :class="{ 'cell-selected': isSelected(equipo.id, 'A', dia) }"
                                      :data-eid="equipo.id"
                                      data-turno="A"
                                      :data-dia="dia"
                                      @mousedown="handleCellMouseDown($event, equipo.id, 'A', dia, contrato.id)"
                                      @mouseenter="onCellMouseEnter(equipo.id, 'A', dia, contrato.id)"
                                      @touchstart="handleCellTouchStart($event, equipo.id, 'A', dia, contrato.id)"
                                      @touchmove="onCellTouchMove($event)"
                                      @touchend="onCellTouchEnd"
                                      @click="onCellClick(equipo.id, 'A', dia, contrato.id, categoria, rowIndex, diaIndex)"
                                    >
                                      <span class="cell-letter-visible">
                                        {{ getValorCelda(`${equipo.id}-A-${dia}`) }}
                                      </span>

                                      <input
                                        type="text"
                                        class="form-control form-control-sm text-center cell-input"
                                        :class="[
                                          colorCelda(getValorCelda(`${equipo.id}-A-${dia}`)),
                                          {
                                            'cell-saved': savedBlinkKey === `${equipo.id}-A-${dia}`,
                                            'cell-processing': isProcessingCell(`${equipo.id}-A-${dia}`),
                                            'cell-clearing': isClearingCell(`${equipo.id}-A-${dia}`)
                                          }
                                        ]"
                                        :value="getValorCelda(`${equipo.id}-A-${dia}`)"
                                        placeholder="D/F/M"
                                        maxlength="1"
                                        @keydown="onCellKeydown($event, contrato.id, categoria, rowIndex, diaIndex, 'A', grupo.length, diasPorContrato(contrato.id).length, `${equipo.id}-A-${dia}`, dia)"
                                        @focus="onCellInputFocus(contrato.id, categoria, rowIndex, diaIndex, equipo.id, 'A', dia)"
                                        @click="onInputCellClick($event, equipo.id, 'A', dia, contrato.id, categoria, rowIndex, diaIndex)"
                                        @mousedown="onInputCellMouseDown($event, equipo.id, 'A', dia, contrato.id)"
                                        :ref="el => setCellRef(contrato.id, categoria, rowIndex, diaIndex, 'A', el)"
                                        :readonly="rolUsuario === 'visualizador'"
                                        :title="generarTooltip(`${equipo.id}-A-${dia}`)"
                                      />
                                      <div class="celda-actions" v-if="!modoAcciones && !isVisualizador && !selectionMode">
                                        <button
                                          class="btn btn-light btn-xs"
                                          title="Agregar/Editar comentario"
                                          @click.stop="abrirFloatingComment({
                                          contratoId: contrato.id,
                                          categoria,
                                          rowIndex,
                                          diaIndex,
                                          equipoId: `${equipo.id}`,
                                          jornada: 'A',
                                          dia,
                                          clave: `${equipo.id}-A-${dia}`
                                        })"
                                        >📝</button>

                                        <button
                                          v-if="getValorCelda(`${equipo.id}-A-${dia}`)"
                                          class="btn btn-danger btn-xs"
                                          title="Limpiar marcado"
                                          @click.stop="abrirModalLimpiar(`${equipo.id}`, 'A', dia)"
                                        >
                                          <i class="bi bi-eraser-fill"></i>
                                        </button>
                                      </div>
                                    </td>

                                    <!-- B -->
                                    <td
                                      class="position-relative p-1"
                                      :class="{ 'cell-selected': isSelected(equipo.id, 'B', dia) }"
                                      :data-eid="equipo.id"
                                      data-turno="B"
                                      :data-dia="dia"
                                      @mousedown="handleCellMouseDown($event, equipo.id, 'B', dia, contrato.id)"
                                      @mouseenter="onCellMouseEnter(equipo.id, 'B', dia, contrato.id)"
                                      @touchstart="handleCellTouchStart($event, equipo.id, 'B', dia, contrato.id)"
                                      @touchmove="onCellTouchMove($event)"
                                      @touchend="onCellTouchEnd"
                                      @click="onCellClick(equipo.id, 'B', dia, contrato.id, categoria, rowIndex, diaIndex)"
                                    >
                                      <span class="cell-letter-visible">
                                        {{ getValorCelda(`${equipo.id}-B-${dia}`) }}
                                      </span>

                                      <input
                                        type="text"
                                        class="form-control form-control-sm text-center cell-input"
                                        :class="[
                                          colorCelda(getValorCelda(`${equipo.id}-B-${dia}`)),
                                          {
                                            'cell-saved': savedBlinkKey === `${equipo.id}-B-${dia}`,
                                            'cell-processing': isProcessingCell(`${equipo.id}-B-${dia}`),
                                            'cell-clearing': isClearingCell(`${equipo.id}-B-${dia}`)
                                          }
                                        ]"
                                        :value="getValorCelda(`${equipo.id}-B-${dia}`)"
                                        placeholder="D/F/M"
                                        maxlength="1"
                                        @keydown="onCellKeydown($event, contrato.id, categoria, rowIndex, diaIndex, 'B', grupo.length, diasPorContrato(contrato.id).length, `${equipo.id}-B-${dia}`, dia)"
                                        @focus="onCellInputFocus(contrato.id, categoria, rowIndex, diaIndex, equipo.id, 'B', dia)"
                                        @click="onInputCellClick($event, equipo.id, 'B', dia, contrato.id, categoria, rowIndex, diaIndex)"
                                        @mousedown="onInputCellMouseDown($event, equipo.id, 'B', dia, contrato.id)"
                                        :ref="el => setCellRef(contrato.id, categoria, rowIndex, diaIndex, 'B', el)"
                                        :readonly="rolUsuario === 'visualizador'"
                                        :title="generarTooltip(`${equipo.id}-B-${dia}`)"
                                      />
                                      <div class="celda-actions" v-if="!modoAcciones && !isVisualizador && !selectionMode">
                                        <button
                                          class="btn btn-light btn-xs"
                                          title="Agregar/Editar comentario"
                                          @click.stop="abrirFloatingComment({
                                            contratoId: contrato.id,
                                            categoria,
                                            rowIndex,
                                            diaIndex,
                                            equipoId: `${equipo.id}`,
                                            jornada: 'B',
                                            dia,
                                            clave: `${equipo.id}-B-${dia}`
                                          })"
                                        >📝</button>

                                        <button
                                          v-if="getValorCelda(`${equipo.id}-B-${dia}`)"
                                          class="btn btn-danger btn-xs"
                                          title="Limpiar marcado"
                                          @click.stop="abrirModalLimpiar(`${equipo.id}`, 'B', dia)"
                                        >
                                          <i class="bi bi-eraser-fill"></i>
                                        </button>
                                      </div>
                                    </td>
                                  </template>
                                </tr>
                              </tbody>

                            </table>
                          </div>
                        </div>
                      </div>
                    </template>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Historial -->
          <div class="modal fade show" tabindex="-1" style="display:block;" v-if="historialVisible" @click.self="historialVisible=false">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">
                    Historial — Equipo: {{ historialMeta.equipoId }} · Turno {{ historialMeta.jornada }} · Día {{ historialMeta.dia }}
                  </h5>
                  <button type="button" class="btn-close" @click="historialVisible=false"></button>
                </div>
                <div class="modal-body">
                  <div v-if="cargandoHistorial" class="text-center py-3">
                    <div class="spinner-border text-secondary"></div>
                  </div>
                  <div v-else>
                    <div v-if="historialItems.length === 0" class="alert alert-light mb-0">
                      Sin movimientos para esta celda.
                    </div>
                    <ul v-else class="list-group">
                      <li v-for="h in historialItems" :key="h.id" class="list-group-item">
                        <div class="d-flex justify-content-between gap-3">
                          <div class="min-w-0">
                            <strong>{{ h.estado }}</strong>
                            <div class="small text-muted">
                              {{ h.jornada }} — {{ formatearFechaHora(h.fecha) }}
                            </div>
                            <div class="small text-break">Obs: {{ h.observaciones || '—' }}</div>
                          </div>
                          <div class="text-end">
                            <div class="small text-truncate" :title="h.nombre_completo || '—'">{{ h.nombre_completo || '—' }}</div>
                            <div class="small text-muted text-truncate">{{ h.registradoPor || '' }}</div>
                            <div class="small text-muted">{{ formatearFechaHora(h.timestamp) }}</div>
                            <span class="badge bg-secondary mt-1">{{ h.accion }}</span>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="btn btn-outline-secondary" @click="historialVisible=false">Cerrar</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Comentario individual -->
          <div class="modal fade show" tabindex="-1" style="display:block;" v-if="comentarioVisible" @click.self="comentarioVisible=false">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">
                    Comentario — Equipo: {{ comentarioMeta.equipoId }} · Turno {{ comentarioMeta.jornada }} · Día {{ comentarioMeta.dia }}
                  </h5>
                  <button type="button" class="btn-close" @click="comentarioVisible=false"></button>
                </div>
                <div class="modal-body">
                  <textarea class="form-control" rows="4" v-model="comentarioTexto" placeholder="Escribe un comentario (opcional)"></textarea>
                  <small class="text-muted d-block mt-2">El comentario quedará asociado al estado actual de la celda.</small>
                </div>
                <div class="modal-footer">
                  <button class="btn btn-outline-secondary" @click="comentarioVisible=false">Cancelar</button>
                  <button class="btn btn-primary" @click="guardarComentario">Guardar comentario</button>
                </div>
              </div>
            </div>
          </div>
          <transition name="floating-comment-pop">
            <div
              v-if="floatingCommentVisible && !selectionMode && !modoAcciones && !isVisualizador"
              class="floating-comment-card shadow-lg"
            >
              <div class="floating-comment-card__header">
                <div>
                  <div class="fw-semibold">
                    <i class="bi bi-chat-left-text me-2"></i>
                    Comentario rápido
                  </div>
                  <div class="small text-muted">
                    Equipo: {{ floatingCommentMeta.equipoId }} · Turno {{ floatingCommentMeta.jornada }} · Día {{ floatingCommentMeta.dia }}
                  </div>
                </div>

                <button
                  type="button"
                  class="btn-close"
                  @click="cerrarFloatingComment"
                ></button>
              </div>

              <div class="floating-comment-card__body">
                <div class="small text-muted mb-2">
                  Puedes agregar un comentario para esta casilla. Si no escribes nada, quedará el comentario automático del estado.
                </div>

                <textarea
                  class="form-control"
                  rows="3"
                  v-model="floatingCommentTexto"
                  placeholder="Ej: equipo operativo sin novedad / falla hidráulica / mantención preventiva"
                ></textarea>

                <div class="d-flex justify-content-end gap-2 mt-3">
                  <button
                    class="btn btn-outline-secondary btn-sm"
                    @click="cerrarFloatingComment"
                    :disabled="floatingCommentSaving"
                  >
                    Cerrar
                  </button>

                  <button
                    class="btn btn-danger btn-sm"
                    @click="floatingCommentTexto = ''"
                    :disabled="floatingCommentSaving"
                  >
                    Limpiar texto
                  </button>

                  <button
                    class="btn btn-primary btn-sm"
                    @click="guardarFloatingComment"
                    :disabled="floatingCommentSaving"
                  >
                    <span
                      v-if="floatingCommentSaving"
                      class="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Guardar comentario
                  </button>
                </div>
              </div>
            </div>
          </transition>
          <!-- Modal Limpiar marcado individual -->
          <div
            class="modal fade show"
            tabindex="-1"
            style="display:block;"
            v-if="limpiarVisible"
            @click.self="cerrarModalLimpiar"
          >
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">
                    Limpiar marcado — Equipo: {{ limpiarMeta.equipoId }} · Turno {{ limpiarMeta.jornada }} · Día {{ limpiarMeta.dia }}
                  </h5>
                  <button type="button" class="btn-close" @click="cerrarModalLimpiar"></button>
                </div>

                <div class="modal-body">
                  <div class="alert alert-warning">
                    Esta acción eliminará el estado actual de la celda y dejará registro en historial.
                  </div>

                  <label class="form-label fw-semibold">Comentario</label>
                  <textarea
                    class="form-control"
                    rows="4"
                    v-model="limpiarComentario"
                    placeholder="Ej: Se limpió porque fue un error de carga"
                  ></textarea>
                  <small class="text-muted d-block mt-2">
                    Si no escribes nada, se guardará un comentario automático.
                  </small>
                </div>

                <div class="modal-footer">
                  <button class="btn btn-outline-secondary" @click="cerrarModalLimpiar">Cancelar</button>
                  <button class="btn btn-danger" @click="confirmarLimpiarCelda">
                    <i class="bi bi-eraser-fill me-1"></i>
                    Limpiar marcado
                  </button>
                </div>
              </div>
            </div>
          </div>
          <!-- Modal Limpiar marcado múltiple -->
          <div
            class="modal fade show"
            tabindex="-1"
            style="display:block;"
            v-if="batchClearVisible"
            @click.self="closeBatchClearModal"
          >
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">
                    Limpiar selección ({{ selectedCellsCount }})
                  </h5>
                  <button type="button" class="btn-close" @click="closeBatchClearModal"></button>
                </div>

                <div class="modal-body">
                  <div class="alert alert-warning">
                    Se eliminarán los estados de las celdas seleccionadas y quedará registro en historial.
                  </div>

                  <label class="form-label fw-semibold">Comentario</label>
                  <textarea
                    class="form-control"
                    rows="4"
                    v-model="batchClearComentario"
                    placeholder="Ej: Limpieza masiva por error en el marcado"
                  ></textarea>
                  <small class="text-muted d-block mt-2">
                    Si no escribes nada, se guardará un comentario automático.
                  </small>
                </div>

                <div class="modal-footer">
                  <button class="btn btn-outline-secondary" @click="closeBatchClearModal">Cancelar</button>
                  <button class="btn btn-danger" @click="confirmBatchClear">
                    <i class="bi bi-eraser-fill me-1"></i>
                    Limpiar marcado
                  </button>
                </div>
              </div>
            </div>
          </div>
          <!-- MODAL: Gestor de Documentos por Equipo (más grande / casi pantalla completa) -->
          <div
            class="modal fade show docs-modal"
            tabindex="-1"
            style="display:block;"
            v-if="docsVisible"
            @click.self="cerrarGestorDocs"
          >
            <div class="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">
                    Documentos — {{ docMeta.equipoNombre }} ({{ docMeta.equipoPatente || 'sin PPU' }})
                  </h5>
                  <button type="button" class="btn-close" @click="cerrarGestorDocs"></button>
                </div>

                <div class="modal-body">
                  <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <input
                      ref="fileInputRef"
                      type="file"
                      class="d-none"
                      multiple
                      @change="onFilesSelected"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.xlsx,.doc,.docx"
                    />
                    <button class="btn btn-primary" @click="dispararFilePicker" :disabled="subiendoDocs">
                      <i class="bi bi-upload me-1"></i> Agregar documentos
                    </button>
                    <div v-if="subiendoDocs" class="small text-muted">
                      {{ textoProgresoSubida }}
                    </div>
                  </div>

                  <div v-if="cargandoDocs" class="text-center py-3">
                    <div class="spinner-border text-secondary"></div>
                  </div>

                  <div v-else>
                    <div v-if="docsEquipo.length === 0" class="alert alert-light">
                      Aún no hay documentos para este equipo.
                    </div>

                    <ul v-else class="list-group">
                      <li v-for="d in docsEquipo" :key="d._id" class="list-group-item d-flex justify-content-between align-items-start gap-3">
                        <div class="me-3 min-w-0">
                          <div class="fw-semibold text-truncate" :title="d.nombre">{{ d.nombre }}</div>
                          <div class="small text-muted">
                            {{ d.tipo }} · {{ (d.size/1024).toFixed(1) }} KB · {{ formatearFechaHora(d.timestamp) }}
                          </div>
                        </div>

                        <div class="d-flex gap-2 flex-wrap">
                          <!-- Ver IMAGEN -->
                          <button
                            v-if="esImagen(d.tipo, d.nombre)"
                            class="btn btn-sm btn-outline-primary"
                            @click="abrirPreviewPorId(d._id)"
                            title="Ver"
                          >
                            <i class="bi bi-eye"></i>
                          </button>

                          <!-- Ver PDF -->
                          <button
                            v-if="esPDF(d.tipo, d.nombre)"
                            class="btn btn-sm btn-outline-primary"
                            @click="abrirPDF(d)"
                            title="Ver"
                          >
                            <i class="bi bi-eye"></i>
                          </button>

                          <a
                            class="btn btn-sm btn-outline-secondary"
                            :href="`data:${normalizaMime(d.tipo, d.nombre)};base64,${d.base64}`"
                            :download="d.nombre"
                            title="Descargar"
                          >
                            <i class="bi bi-download"></i>
                          </a>
                          <button
                            class="btn btn-sm btn-outline-danger"
                            @click="eliminarDoc(d)"
                            :disabled="subiendoDocs"
                            title="Eliminar"
                          >
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </li>
                    </ul>

                    <!-- Grid de miniaturas (solo imágenes) -->
                    <div v-if="imagenesEquipo.length" class="mt-3">
                      <div class="small text-muted mb-2">Imágenes (haz clic para previsualizar):</div>
                      <div class="thumb-grid">
                        <button
                          v-for="(img, idx) in imagenesEquipo"
                          :key="img._id"
                          class="thumb-btn"
                          @click="abrirPreviewIndex(idx)"
                          :title="img.nombre"
                        >
                          <img :src="dataUrl(img)" :alt="img.nombre" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- VISOR DE IMAGEN (pantalla completa) -->
                <transition name="fade">
                  <div v-if="preview.abierto" class="preview-overlay" @click.self="cerrarPreview">
                    <div class="preview-toolbar">
                      <button class="btn btn-sm btn-light" @click.stop="prevPreview" :disabled="preview.index <= 0">
                        <i class="bi bi-chevron-left"></i>
                      </button>
                      <div class="mx-2 small">
                        {{ preview.index + 1 }} / {{ imagenesEquipo.length }}
                      </div>
                      <button class="btn btn-sm btn-light" @click.stop="nextPreview" :disabled="preview.index >= imagenesEquipo.length - 1">
                        <i class="bi bi-chevron-right"></i>
                      </button>

                      <div class="ms-auto d-flex gap-2">
                        <button class="btn btn-sm btn-light" @click.stop="zoomOut"><i class="bi bi-zoom-out"></i></button>
                        <button class="btn btn-sm btn-light" @click.stop="resetZoom"><i class="bi bi-aspect-ratio"></i></button>
                        <button class="btn btn-sm btn-light" @click.stop="zoomIn"><i class="bi bi-zoom-in"></i></button>
                        <button class="btn btn-sm btn-dark" @click.stop="cerrarPreview"><i class="bi bi-x-lg"></i></button>
                      </div>
                    </div>

                    <div class="preview-stage">
                      <img
                        v-if="imagenActual"
                        :src="dataUrl(imagenActual)"
                        :alt="imagenActual?.nombre || 'imagen'"
                        :style="{ transform: `scale(${preview.zoom})` }"
                        @wheel.prevent="onWheelZoom"
                      />
                    </div>
                  </div>
                </transition>

                <!-- VISOR PDF (pantalla completa / casi toda la pantalla) -->
                <transition name="fade">
                  <div v-if="pdfViewer.abierto" class="pdf-overlay" @click.self="cerrarPDF">
                    <div class="pdf-toolbar">
                      <div class="small fw-semibold text-truncate">{{ pdfViewer.nombre }}</div>
                      <div class="ms-auto d-flex gap-2">
                        <a class="btn btn-sm btn-light" :href="pdfViewer.url" target="_blank" rel="noopener">
                          Abrir en pestaña
                        </a>
                        <button class="btn btn-sm btn-dark" @click.stop="cerrarPDF">
                          <i class="bi bi-x-lg"></i>
                        </button>
                      </div>
                    </div>
                    <div class="pdf-stage">
                      <iframe :src="pdfViewer.url" frameborder="0"></iframe>
                    </div>
                  </div>
                </transition>

                <div class="modal-footer">
                  <button class="btn btn-outline-secondary" @click="cerrarGestorDocs">Cerrar</button>
                </div>
              </div>
            </div>
          </div>
          <!-- Modal aplicación en lote -->
          <div class="modal fade show" tabindex="-1" style="display:block;" v-if="batchModal.visible" @click.self="closeBatchModal">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">
                    Aplicar a {{ selectedCellsCount }} celdas
                  </h5>
                  <button type="button" class="btn-close" @click="closeBatchModal"></button>
                </div>

                <div class="modal-body">
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Estado</label>
                    <div class="btn-group" role="group">
                      <button type="button" class="btn" :class="{'btn-success': batchModal.estado==='D', 'btn-outline-success': batchModal.estado!=='D'}" @click="batchModal.estado='D'">D</button>
                      <button type="button" class="btn" :class="{'btn-danger':  batchModal.estado==='F', 'btn-outline-danger':  batchModal.estado!=='F'}" @click="batchModal.estado='F'">F</button>
                      <button type="button" class="btn" :class="{'btn-warning': batchModal.estado==='M', 'btn-outline-warning': batchModal.estado!=='M'}" @click="batchModal.estado='M'">M</button>
                    </div>
                  </div>
                  <div class="mb-2">
                    <label class="form-label fw-semibold">¿Deseas agregar comentario?</label>
                    <div class="d-flex gap-2">
                      <button class="btn" :class="batchModal.quiereComentario ? 'btn-primary' : 'btn-outline-primary'" @click="batchModal.quiereComentario=true">Sí</button>
                      <button class="btn" :class="!batchModal.quiereComentario ? 'btn-secondary' : 'btn-outline-secondary'" @click="batchModal.quiereComentario=false">No</button>
                    </div>
                  </div>

                  <div v-if="batchModal.quiereComentario" class="mt-2">
                    <textarea class="form-control" rows="4" v-model="batchModal.comentario" placeholder="Comentario (opcional)"></textarea>
                    <small class="text-muted">Si lo dejas vacío, se guardará sin comentario.</small>
                  </div>

                  <div v-if="batchFeedback.text" class="alert mt-3" :class="batchFeedback.error ? 'alert-danger' : 'alert-info'">
                    {{ batchFeedback.text }}
                  </div>
                </div>

                <div class="modal-footer">
                  <button class="btn btn-outline-secondary" @click="closeBatchModal">Cancelar</button>
                  <button class="btn btn-primary" :disabled="applyingBatch" @click="applyBatch">
                    <span v-if="!applyingBatch">Aplicar</span>
                    <span v-else class="d-inline-flex align-items-center gap-2">
                      <span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Aplicando…
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div> <!-- row -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, defineOptions, nextTick, watch } from 'vue'
import { db } from '../firebase/config'
import {
  collection, getDocs, setDoc, doc, getDoc, addDoc, deleteDoc,
  query, where, orderBy
} from 'firebase/firestore'

import { getAuth, onAuthStateChanged } from 'firebase/auth'
import * as XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'

defineOptions({ name: 'HomeView' })

/* ======================= DOCUMENTOS POR EQUIPO ======================= */
const descargandoExcel = ref(false)

function esPDF(mime = '', nombre = '') {
  const t = (mime || '').toLowerCase()
  if (t.startsWith('application/pdf')) return true
  const ext = (nombre.split('.').pop() || '').toLowerCase()
  return ext === 'pdf'
}

const pdfViewer = ref({ abierto: false, url: '', nombre: '' })

function abrirPDF(d) {
  if (pdfViewer.value.url) URL.revokeObjectURL(pdfViewer.value.url)
  pdfViewer.value = { abierto: true, url: blobUrl(d), nombre: d.nombre }
}

function cerrarPDF() {
  if (pdfViewer.value.url) URL.revokeObjectURL(pdfViewer.value.url)
  pdfViewer.value = { abierto: false, url: '', nombre: '' }
}

function blobUrl(d) {
  const tipoOk = normalizaMime(d.tipo, d.nombre)
  const bin = atob(d.base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: tipoOk })
  return URL.createObjectURL(blob)
}

const docsVisible = ref(false)
const docsEquipo = ref([])
const cargandoDocs = ref(false)
const subiendoDocs = ref(false)
const textoProgresoSubida = ref('')
const fileInputRef = ref(null)
const docMeta = ref({ equipoId: '', equipoNombre: '', equipoPatente: '' })

function abrirGestorDocs(equipo) {
  docMeta.value = {
    equipoId: equipo.id,
    equipoNombre: equipo.nombre_equipo || 'Equipo',
    equipoPatente: equipo.patente || ''
  }
  docsVisible.value = true
  cargarDocsEquipo()
}

function cerrarGestorDocs() {
  if (subiendoDocs.value) return
  docsVisible.value = false
  docsEquipo.value = []
  textoProgresoSubida.value = ''
}

async function cargarDocsEquipo() {
  cargandoDocs.value = true
  try {
    const col = collection(db, 'equipos', docMeta.value.equipoId, 'documentos')
    const q = query(col, orderBy('timestamp', 'desc'))
    const snap = await getDocs(q)
    docsEquipo.value = snap.docs.map(d => ({ _id: d.id, ...d.data() }))
  } catch (e) {
    console.error('Error al cargar documentos:', e)
    docsEquipo.value = []
  } finally {
    cargandoDocs.value = false
  }
}

function dispararFilePicker() { fileInputRef.value?.click?.() }

function leerArchivoComoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = btoa(
        new Uint8Array(reader.result).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function mimeFromExt(nombre = '') {
  const ext = (nombre.split('.').pop() || '').toLowerCase()
  const mapa = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
    heic: 'image/heic', heif: 'image/heif', svg: 'image/svg+xml',
    pdf: 'application/pdf'
  }
  return mapa[ext] || ''
}

function normalizaMime(tipo, nombre) {
  const t = (tipo || '').toLowerCase()
  if (!t || t === 'application/octet-stream') {
    const inferido = mimeFromExt(nombre)
    return inferido || t || 'application/octet-stream'
  }
  return t
}

function esImagen(mime = '', nombre = '') {
  const t = (mime || '').toLowerCase()
  if (t.startsWith('image/')) return true
  const ext = (nombre.split('.').pop() || '').toLowerCase()
  return ['jpg','jpeg','png','gif','webp','bmp','heic','heif','svg'].includes(ext)
}

function dataUrl(d) {
  const tipoOk = normalizaMime(d.tipo, d.nombre)
  return `data:${tipoOk};base64,${d.base64}`
}

/* ✅ FIX: considerar extensión también */
const imagenesEquipo = computed(() => docsEquipo.value.filter(d => esImagen(d.tipo, d.nombre)))

const preview = ref({ abierto: false, index: 0, zoom: 1 })
const imagenActual = computed(() => imagenesEquipo.value[preview.value.index] || null)

function abrirPreviewIndex(i = 0) {
  if (!imagenesEquipo.value.length) return
  preview.value.index = Math.min(Math.max(0, i), imagenesEquipo.value.length - 1)
  preview.value.zoom = 1
  preview.value.abierto = true
}

function abrirPreviewPorId(id) {
  const idx = imagenesEquipo.value.findIndex(d => d._id === id)
  if (idx >= 0) abrirPreviewIndex(idx)
}

function cerrarPreview() { preview.value.abierto = false; preview.value.zoom = 1 }
function nextPreview() { if (preview.value.index < imagenesEquipo.value.length - 1) { preview.value.index++; preview.value.zoom = 1 } }
function prevPreview() { if (preview.value.index > 0) { preview.value.index--; preview.value.zoom = 1 } }
function zoomIn()  { preview.value.zoom = Math.min(preview.value.zoom + 0.2, 4) }
function zoomOut() { preview.value.zoom = Math.max(preview.value.zoom - 0.2, 0.25) }
function resetZoom(){ preview.value.zoom = 1 }
function onWheelZoom(e){ if (e.deltaY > 0) zoomOut(); else zoomIn() }

function keyHandler(e){
  if (!preview.value.abierto) return
  if (e.key === 'Escape') { e.preventDefault(); cerrarPreview() }
  if (e.key === 'ArrowRight') { e.preventDefault(); nextPreview() }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); prevPreview() }
  if (e.key === '+') { e.preventDefault(); zoomIn() }
  if (e.key === '-') { e.preventDefault(); zoomOut() }
  if (e.key === '0') { e.preventDefault(); resetZoom() }
}

watch(docsVisible, (v)=>{ if (v) window.addEventListener('keydown', keyHandler); else { window.removeEventListener('keydown', keyHandler); cerrarPreview() } })

/* ✅ Bloquear scroll del body cuando visor (PDF o imagen) está abierto */
watch(
  () => (preview.value.abierto || pdfViewer.value.abierto),
  (v) => { document.body.style.overflow = v ? 'hidden' : '' }
)

async function onFilesSelected(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  const auth = getAuth()
  const currentUser = auth.currentUser
  let usuario = currentUser?.email || 'desconocido'
  subiendoDocs.value = true
  textoProgresoSubida.value = `Preparando...`
  try {
    const total = files.length; let idx = 0
    for (const file of files) {
      idx++; textoProgresoSubida.value = `Cargando ${idx}/${total} (${file.name})...`
      const MAX_BYTES = 400 * 1024
      if (file.size > MAX_BYTES) { console.warn(`Archivo omitido por tamaño: ${file.name}`); continue }
      const base64 = await leerArchivoComoBase64(file)
      const payload = {
        nombre: file.name,
        tipo: file.type || 'application/octet-stream',
        size: file.size,
        base64,
        timestamp: new Date(),
        usuario
      }
      await addDoc(collection(db, 'equipos', docMeta.value.equipoId, 'documentos'), payload)
    }
    await cargarDocsEquipo()
    textoProgresoSubida.value = `Listo`
    if (fileInputRef.value) fileInputRef.value.value = ''
  } catch (err) {
    console.error('Error subiendo documentos:', err)
    alert('Ocurrió un error subiendo los documentos. Intenta nuevamente.')
  } finally {
    setTimeout(() => { subiendoDocs.value = false; textoProgresoSubida.value = '' }, 400)
  }
}

async function eliminarDoc(d) {
  const ok = confirm(`¿Eliminar el documento "${d.nombre}"?`)
  if (!ok) return
  try {
    await deleteDoc(doc(db, 'equipos', docMeta.value.equipoId, 'documentos', d._id))
    docsEquipo.value = docsEquipo.value.filter(x => x._id !== d._id)
  } catch (e) {
    console.error('Error al eliminar documento:', e)
    alert('No se pudo eliminar. Intenta nuevamente.')
  }
}

/* ======================= PERIODO VISIBLE ======================= */
const mesOffset = ref(0)
const baseDate = computed(() => { const hoy = new Date(); return new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset.value, 1, 0, 0, 0, 0) })
const year = computed(() => baseDate.value.getFullYear())
const mes  = computed(() => baseDate.value.getMonth())
const inicioMes = computed(() => new Date(year.value, mes.value, 1, 0, 0, 0, 0))
const finMes    = computed(() => new Date(year.value, mes.value + 1, 1, 0, 0, 0, 0))
const nombreMesCorto = computed(() => baseDate.value.toLocaleString('default', { month: 'short' }).toLowerCase())
const nombreMesLargo = computed(() => { const s = baseDate.value.toLocaleString('default', { month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1) })
const etiquetaPeriodo = computed(() => `${nombreMesLargo.value} ${year.value}`)
const diasEnMes = computed(() => new Date(year.value, mes.value + 1, 0).getDate())
const diasDelMes = computed(() => Array.from({ length: diasEnMes.value }, (_, i) => `${String(i+1).padStart(2,'0')}-${nombreMesCorto.value}`))
const diasHabilesDelMes = computed(() => {
  const arr = []
  for (let d = 1; d <= diasEnMes.value; d++) {
    const dt = new Date(year.value, mes.value, d)
    const day = dt.getDay()
    if (day !== 0 && day !== 6) arr.push(`${String(d).padStart(2,'0')}-${nombreMesCorto.value}`)
  }
  return arr
})

/* ======================= STATE GENERAL ======================= */
const mostrarInstrucciones = ref(true)
const loading = ref(true)
const rolUsuario = ref('')
const estaLogueado = ref(false)
const contratosUsuario = ref([])
const auth = getAuth()
const isVisualizador = computed(() => (rolUsuario.value || '').toLowerCase() === 'visualizador')
const modoAcciones = ref(false)
const tablaClaseModo = computed(() => modoAcciones.value ? 'modo-acciones' : '')
const zoomTabla = ref(false)
function toggleZoomTabla() { zoomTabla.value = !zoomTabla.value }
const hoverContratoId = ref(null)
const nombreExpandidoId = ref(null)
function toggleNombreExpand(id) { nombreExpandidoId.value = (nombreExpandidoId.value === id) ? null : id }

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) { estaLogueado.value = true; await obtenerContratosDelUsuario() }
    else { estaLogueado.value = false }
    loading.value = false
  })
})

/* Carga por contrato */
const loadingContrato = ref({})
const equiposByContrato = ref({})
const operByContrato = ref({})
const expandedContrato = ref(null)

/* buffers de celdas */
const inputValues = ref({})
const observacionesCelda = ref({})
const usuariosCelda = ref({})
const timestampsCelda = ref({})
const savedBlinkKey = ref('')
const processingCells = ref(new Set())
const clearingCells = ref(new Set())
const batchProgress = ref({
  visible: false,
  total: 0,
  current: 0,
  action: ''
})


/* ====== Letras y mapeos ====== */
const ALLOWED = ['D','F','M']
const letraToNombre = (l) => ({ D:'DISPONIBLE', F:'FUERA DE SERVICIO', M:'MANTENCIÓN' }[l] || '')
const nombreToLetra = (n) => {
  const s = String(n || '').toUpperCase()
  if (s.includes('DISP')) return 'D'
  if (s.includes('FUERA')) return 'F'
  if (s.includes('MANT')) return 'M'
  if (ALLOWED.includes(s)) return s
  return ''
}
const canDescargarExcel = computed(() => {
  const r = (rolUsuario.value || '').toLowerCase()
  return ['admin', 'operador', 'visualizador'].includes(r)
})

/* ====== Refs navegación ====== */
const cellRefs = ref({})
function setCellRef(contratoId, categoria, row, dia, turno, el) {
  if (!el) return
  const key = `${contratoId}|${categoria}|${row}|${dia}|${turno}`
  cellRefs.value[key] = el
}
function focusCell(contratoId, categoria, row, dia, turno) {
  const key = `${contratoId}|${categoria}|${row}|${dia}|${turno}`
  const el = cellRefs.value[key]
  el?.focus?.()
  el?.select?.()
}

/* ====== DÍAS VISIBLES POR CONTRATO ====== */
function normaliza(txt='') { return String(txt).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/\s+/g,' ').trim() }
function isWeekdaysOnlyContratoId(contratoId) {
  const c = contratosUsuario.value.find(x => x.id === contratoId)
  if (!c) return false
  const n = normaliza(c.nombre)
  const esUrbSanBern = n.includes('urbano') && n.includes('san bernardo')
  const esUrbOlivar  = n.includes('urbano') && n.includes('olivar')
  const esHormPredo  = (n.includes('hormigon') || n.includes('hormigones')) && (n.includes('predos') || n.includes('pre dos') || n.includes('predosificados'))
  return esUrbSanBern || esUrbOlivar || esHormPredo
}
function diasPorContrato(contratoId) { return isWeekdaysOnlyContratoId(contratoId) ? diasHabilesDelMes.value : diasDelMes.value }
function diasNumericosPorContrato(contratoId) { return diasPorContrato(contratoId).map(s => s.slice(0,2)) }

/* ====== Entrada/navegación individual ====== */
async function onCellKeydown(
  e,
  contratoId,
  categoria,
  rowIdx,
  diaIdx,
  turno,
  totalRows,
  totalDias,
  clave,
  dia
) {
  const kRaw = String(e.key || '')
  const k = kRaw.toUpperCase()

  const perDay = 2
  let col = diaIdx * perDay + (turno === 'A' ? 0 : 1)
  const maxCol = totalDias * perDay - 1
  let r = rowIdx

  const [equipoId] = String(clave || '').split('-')

  const openCardForCurrentCell = () => {
    if (!equipoId) return
    abrirFloatingComment({
      contratoId,
      categoria,
      rowIndex: rowIdx,
      diaIndex: diaIdx,
      equipoId,
      jornada: turno,
      dia,
      clave,
    })
  }

  const focusNewCellAndSyncCard = (newRow, newCol) => {
    const newDia = Math.floor(newCol / perDay)
    const newTurno = (newCol % 2 === 0) ? 'A' : 'B'

    nextTick(() => {
      focusCell(contratoId, categoria, newRow, newDia, newTurno)
    })
  }

  if (k === 'ARROWRIGHT' || k === 'ARROWLEFT' || k === 'ARROWDOWN' || k === 'ARROWUP') {
    e.preventDefault()

    if (k === 'ARROWRIGHT' && col < maxCol) col++
    if (k === 'ARROWLEFT' && col > 0) col--
    if (k === 'ARROWDOWN' && r < totalRows - 1) r++
    if (k === 'ARROWUP' && r > 0) r--

    focusNewCellAndSyncCard(r, col)
    return
  }

  if (k === 'ENTER') {
    e.preventDefault()

    if (col < maxCol) col++
    else if (r < totalRows - 1) {
      r++
      col = 0
    }

    focusNewCellAndSyncCard(r, col)
    return
  }

  if (k === 'TAB') return

  if (k === 'BACKSPACE' || k === 'DELETE') {
    e.preventDefault()

    if (!equipoId) return

    await limpiarMarcadoCelda(equipoId, dia, turno, 'Limpieza manual del registro.')
    cerrarFloatingComment()
    return
  }

  if (ALLOWED.includes(k)) {
    e.preventDefault()

    if (!equipoId) return

    const comentarioActual = String(observacionesCelda.value[clave] || '').trim()
    const comentarioFinal = comentarioActual || getComentarioAutomaticoPorEstado(k)

    // Mostrar card al instante, sin esperar Firestore
    floatingCommentTexto.value = comentarioFinal
    abrirFloatingComment({
      contratoId,
      categoria,
      rowIndex: rowIdx,
      diaIndex: diaIdx,
      equipoId,
      jornada: turno,
      dia,
      clave,
    })

    // Guardado real
    guardarEstadoSimple(equipoId, dia, turno, k, comentarioFinal).catch((error) => {
      console.error('Error guardando estado:', error)
    })

    // Mantenerse en la misma celda
    nextTick(() => {
      focusCell(contratoId, categoria, rowIdx, diaIdx, turno)
    })

    return
  }

  if (kRaw.length === 1) {
    e.preventDefault()
  }
}


/* ======================= UTILIDADES ======================= */
const contratosUsuarioValidos = computed(() =>
  (contratosUsuario.value || []).filter(c => c && c.id && c.activo !== false)
)

const emojiContrato = (nombreContrato) => {
  const nombre = (nombreContrato || '').toLowerCase()
  if (nombre.includes('olivar') || nombre.includes('san bernardo')) return '🏙️'
  if (nombre.includes('hormigon') || nombre.includes('hormigón')) return '🧱'
  if (nombre.includes('carpetas')) return '🛣️'
  if (nombre.includes('áridos') || nombre.includes('aridos')) return '⛰️'
  if (nombre.includes('reparación') || nombre.includes('infraestructura')) return '🧰'
  if (nombre.includes('chuquicamata') || nombre.includes('pmchs')) return '🏗️'
  if (nombre.includes('casa')|| nombre.includes('matriz')) return '🏠'
  if (nombre.includes('servicios') || nombre.includes('taller')) return '🔧'
  if (nombre.includes('alto') || nombre.includes('maipo')) return '⛰️'
  return '📁'
}

const formatearFechaHora = (ts) => {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`
}

const colorCelda = (valor) => {
  if (valor === 'D') return 'bg-success text-white'
  if (valor === 'F') return 'bg-danger text-white'
  if (valor === 'M') return 'bg-warning text-dark'
  return ''
}

const puedeEditar = () => {
  return true
}

const getValorCelda = (clave) => inputValues.value[clave] || ''

const generarTooltip = (clave) => {
  const estadoLetra = getValorCelda(clave)
  if (!estadoLetra) return ''

  const mapa = {
    D: 'Disponible',
    F: 'Fuera de servicio',
    M: 'Mantención',
  }

  const estadoTexto = mapa[estadoLetra] || estadoLetra
  const obs = observacionesCelda.value[clave] || 'Sin observación'
  const usuario = usuariosCelda.value[clave] || 'Desconocido'
  const cuando = formatearFechaHora(timestampsCelda.value[clave])

  return `Estado: ${estadoTexto}
Obs: ${obs}
Usuario: ${usuario}
Últ. edición: ${cuando}`
}

/* ======================= ALERTA: CONTRATOS NO AL DÍA ======================= */
const estadoContratos = ref({})
const checkingInactividad = ref(false)
const showAlert = ref(false)

function normalizaSoloFecha(d) {
  const dt = d instanceof Date ? d : (d?.toDate ? d.toDate() : new Date(d))
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0)
}

function formatearSoloFecha(d) {
  const dt = normalizaSoloFecha(d)
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const yyyy = dt.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function maxDateSafe(a, b) {
  const da = a ? (a.toDate ? a.toDate() : new Date(a)) : null
  const db = b ? (b.toDate ? b.toDate() : new Date(b)) : null
  if (da && db) return da > db ? da : db
  return da || db || null
}

async function fetchEstadoContrato(contratoId) {
  const hoy = new Date()
  const hoyDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0)
  const inicioRango = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0, 0)

  let ultimaFecha = null
  let ultimoRegistro = null
  const fechasSet = new Set()

  try {
    const q1 = query(
      collection(db, 'operatividad'),
      where('contratoId', '==', contratoId),
      where('fecha', '>=', inicioRango),
      where('fecha', '<=', hoyDia),
      orderBy('fecha', 'asc')
    )
    const snap = await getDocs(q1)

    snap.forEach(docSnap => {
      const d = docSnap.data()
      if (!d.fecha) return
      const f = d.fecha?.toDate ? d.fecha.toDate() : new Date(d.fecha)
      const fDia = normalizaSoloFecha(f)

      const key = fDia.toISOString().slice(0, 10)
      fechasSet.add(key)

      if (!ultimaFecha || fDia > ultimaFecha) ultimaFecha = fDia

      const bestTS = maxDateSafe(d.timestamp, d.fecha)
      if (bestTS && (!ultimoRegistro || bestTS > ultimoRegistro)) {
        ultimoRegistro = bestTS
      }
    })
  } catch (e) {
    console.error('Error leyendo operatividad para alerta:', e)
  }

  if (!ultimaFecha) {
    return {
      tieneRegistros: false,
      ultimaFecha: null,
      ultimoRegistro: ultimoRegistro || ultimaFecha,
      diasFaltantes: []
    }
  }

  const diasFaltantes = []
  const desde = new Date(
    ultimaFecha.getFullYear(),
    ultimaFecha.getMonth(),
    ultimaFecha.getDate() + 1,
    0, 0, 0, 0
  )

  for (let d = desde; d <= hoyDia; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    if (!fechasSet.has(key)) {
      diasFaltantes.push(new Date(d.getTime()))
    }
  }

  return {
    tieneRegistros: true,
    ultimaFecha,
    ultimoRegistro: ultimoRegistro || ultimaFecha,
    diasFaltantes
  }
}

const contratosAtrasados = computed(() => {
  const ahora = new Date()

  return contratosUsuarioValidos.value
    .filter(c => c.activo !== false)
    .map(c => {
      const est = estadoContratos.value[c.id] || {}

      const tieneRegistros   = !!est.tieneRegistros
      const ultimaFecha      = est.ultimaFecha || null
      const diasFaltantes    = est.diasFaltantes || []
      const ultimoRegistro   = est.ultimoRegistro || null

      let horasSinRegistrar = null
      let inactivo48h = false

      if (ultimoRegistro) {
        const dt = ultimoRegistro.toDate ? ultimoRegistro.toDate() : new Date(ultimoRegistro)
        horasSinRegistrar = (ahora.getTime() - dt.getTime()) / (1000 * 60 * 60)
        inactivo48h = horasSinRegistrar >= 48
      } else if (!tieneRegistros) {
        inactivo48h = true
      }

      const atrasado = inactivo48h && (!tieneRegistros || diasFaltantes.length > 0)

      return {
        ...c,
        _atrasado: atrasado,
        _ultimaFecha: ultimaFecha,
        _ultimoTextoCorto: ultimaFecha ? formatearSoloFecha(ultimaFecha) : 'Nunca',
        _diasSinRegistro: diasFaltantes.length,
        _horasSinRegistrar: horasSinRegistrar,
        _inactivo48h: inactivo48h
      }
    })
    .filter(c => c._atrasado)
})

const contratosNuncaRegistrados = computed(() =>
  contratosUsuarioValidos.value.filter(c => {
    const est = estadoContratos.value[c.id]
    return !est || !est.tieneRegistros
  })
)

async function revisarInactividadContratos() {
  if (!contratosUsuarioValidos.value.length) return
  checkingInactividad.value = true
  try {
    const resultados = {}
    await Promise.all(
      contratosUsuarioValidos.value.map(async (c) => {
        resultados[c.id] = await fetchEstadoContrato(c.id)
      })
    )
    estadoContratos.value = resultados
  } finally {
    checkingInactividad.value = false
  }
}

async function refrescarAlertaAnimada() {
  showAlert.value = false
  await revisarInactividadContratos()
  await nextTick()
  if (contratosAtrasados.value.length > 0) {
    setTimeout(() => { showAlert.value = true }, 120)
  }
}

async function abrirContratoDesdeAlerta(contratoId) {
  if (expandedContrato.value !== contratoId) {
    expandedContrato.value = contratoId
    await cargarContratoDetalle(contratoId)
  }
  const el = document.querySelector(`[data-contrato-id="${contratoId}"]`)
  el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

/* ======================= AUTH + CONTRATOS ======================= */
async function obtenerContratosDelUsuario() {
  const auth = getAuth()
  const currentUser = auth.currentUser
  if (!currentUser) return

  const userDoc = await getDoc(doc(db, 'usuarios', currentUser.uid))
  if (!userDoc.exists()) return

  rolUsuario.value = userDoc.data().rol || ''
  const contratosIds = userDoc.data().contratosAsignados || []
  if (!contratosIds.length) return

  const chunks = []
  for (let i = 0; i < contratosIds.length; i += 10) chunks.push(contratosIds.slice(i, i + 10))

  const results = []
  for (const ids of chunks) {
    const contratosQuery = query(collection(db, 'contratos'), where('__name__', 'in', ids))
    const snapshot = await getDocs(contratosQuery)
    results.push(...snapshot.docs.map(d => {
      const data = d.data() || {}
      return {
        id: d.id,
        ...data,
        activo: data.activo !== false
      }
    }))
  }

  contratosUsuario.value = results.filter(c => c.activo !== false)

  await revisarInactividadContratos()
  await nextTick()
  if (contratosAtrasados.value.length > 0) setTimeout(() => { showAlert.value = true }, 120)
}

const diasPorContratoMap = computed(() => {
  const mapa = {}
  for (const c of contratosUsuarioValidos.value) {
    mapa[c.id] = diasPorContrato(c.id)
  }
  return mapa
})

/* ======================= CARGA LAZY POR CONTRATO ======================= */
async function cargarContratoDetalle(contratoId, { force = false } = {}) {
  if (!force && equiposByContrato.value[contratoId] && operByContrato.value[contratoId]) return
  loadingContrato.value[contratoId] = true
  try {
    // Equipos
    let equipos = []
    try {
      const qeOrdered = query(
        collection(db, 'equipos'),
        where('contratoId', '==', contratoId),
        orderBy('nombre_equipo')
      )
      const se = await getDocs(qeOrdered)
      equipos = se.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch {
      const qe = query(collection(db, 'equipos'), where('contratoId', '==', contratoId))
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

    equiposByContrato.value[contratoId] = equipos

    // Operatividad del período
    const qo = query(
      collection(db, 'operatividad'),
      where('contratoId', '==', contratoId),
      where('fecha', '>=', inicioMes.value),
      where('fecha', '<',  finMes.value)
    )
    const so = await getDocs(qo)
    operByContrato.value[contratoId] = so.docs.map(d => ({ id: d.id, ...d.data() }))

    inicializarValoresDesde(contratoId)
  } finally {
    loadingContrato.value[contratoId] = false
  }
}
function inicializarValoresDesde(contratoId) {
  const oper = operByContrato.value[contratoId] || []

  for (const item of oper) {
    const date = item.fecha?.toDate ? item.fecha.toDate() : new Date(item.fecha)
    const dia = String(date.getDate()).padStart(2, '0')
    const mesNombre = date.toLocaleString('default', { month: 'short' }).toLowerCase()
    const clave = `${item.equipoId}-${item.jornada}-${dia}-${mesNombre}`

    inputValues.value[clave] = nombreToLetra(item.estado)
    observacionesCelda.value[clave] = item.observaciones || ''


    const nombre = (item.nombre_completo || '').trim()
    const correo = (item.registradoPor || '').trim()
    usuariosCelda.value[clave] = nombre ? `${nombre}${correo ? ` (${correo})` : ''}` : (correo || 'Desconocido')
    timestampsCelda.value[clave] = item.timestamp || null
  }
}

/* ======================= UI: EXPAND / COLLAPSE ======================= */
async function toggleExpand(id) {
  if (expandedContrato.value === id) { expandedContrato.value = null; return }
  expandedContrato.value = id
  await cargarContratoDetalle(id)
}

/* ======================= CAMBIO DE MES ======================= */
async function toggleMes(contratoIdActual = null) {
  mesOffset.value = (mesOffset.value === 0 ? -1 : 0)
  inputValues.value = {}
  observacionesCelda.value = {}
  usuariosCelda.value = {}
  timestampsCelda.value = {}
  operByContrato.value = {}

  const target = contratoIdActual || expandedContrato.value
  if (target) {
    loadingContrato.value[target] = true
    await cargarContratoDetalle(target, { force: true })
    loadingContrato.value[target] = false
  }
}


function buildClave(equipoId, jornada, dia) {
  return `${equipoId}-${jornada}-${dia}`
}
function markProcessingCell(clave) {
  const next = new Set(processingCells.value)
  next.add(clave)
  processingCells.value = next
}

function unmarkProcessingCell(clave) {
  const next = new Set(processingCells.value)
  next.delete(clave)
  processingCells.value = next
}

function markClearingCell(clave) {
  const next = new Set(clearingCells.value)
  next.add(clave)
  clearingCells.value = next
}

function unmarkClearingCell(clave) {
  const next = new Set(clearingCells.value)
  next.delete(clave)
  clearingCells.value = next
}

function isProcessingCell(clave) {
  return processingCells.value.has(clave)
}

function isClearingCell(clave) {
  return clearingCells.value.has(clave)
}

function wait(ms = 60) {
  return new Promise(resolve => setTimeout(resolve, ms))
}








async function limpiarMarcadoCelda(equipoId, dia, jornada, comentarioExtra = '') {
  if (!equipoId || !dia || !jornada) {
    console.warn('limpiarMarcadoCelda recibió datos incompletos:', { equipoId, dia, jornada })
    return
  }

  const dd = parseInt(String(dia).slice(0, 2))
  const fecha = new Date(year.value, mes.value, dd)
  const contratoId = buscarContratoIdPorEquipo(equipoId) || ''
  const clave = buildClave(equipoId, jornada, dia)

  markClearingCell(clave)

  try {
    const auth = getAuth()
    const currentUser = auth.currentUser

    let nombre_completo = ''
    let registradoPor = ''

    if (currentUser) {
      registradoPor = currentUser.email || ''
      const userDocRef = doc(db, 'usuarios', currentUser.uid)
      const userSnap = await getDoc(userDocRef)
      if (userSnap.exists()) {
        nombre_completo = userSnap.data().nombre_completo || ''
      }
    }

    const docId = `${equipoId}_${jornada}_${dia}`
    const comentarioFinal = String(comentarioExtra || '').trim() || 'Registro eliminado por error de carga.'

    await deleteDoc(doc(db, 'operatividad', docId))

    inputValues.value[clave] = ''
    observacionesCelda.value[clave] = ''
    usuariosCelda.value[clave] = nombre_completo
      ? `${nombre_completo}${registradoPor ? ` (${registradoPor})` : ''}`
      : (registradoPor || 'Desconocido')
    timestampsCelda.value[clave] = new Date()

    await setDoc(doc(db, 'historial_operatividad', `${docId}_limpieza_${Date.now()}`), {
      equipoId,
      contratoId,
      estado: 'LIMPIADO',
      fecha,
      jornada,
      nombre_completo,
      observaciones: comentarioFinal,
      registradoPor,
      accion: 'limpieza',
      timestamp: new Date(),
    })

    savedBlinkKey.value = clave
    setTimeout(() => {
      if (savedBlinkKey.value === clave) savedBlinkKey.value = ''
    }, 550)
  } finally {
    setTimeout(() => unmarkClearingCell(clave), 180)
  }
}
/* ======================= HISTORIAL FOCALIZADO ======================= */
const historialVisible = ref(false)
const cargandoHistorial = ref(false)
const historialItems = ref([])
const historialMeta = ref({ equipoId: '', jornada: '', dia: '' })

function rangoDia(diaStr) {
  const dd = parseInt(diaStr.slice(0, 2))
  const start = new Date(year.value, mes.value, dd, 0, 0, 0, 0)
  const end   = new Date(year.value, mes.value, dd + 1, 0, 0, 0, 0)
  return { start, end }
}

async function abrirHistorial(equipoId, jornada, dia) {
  historialMeta.value = { equipoId, jornada, dia }
  historialVisible.value = true
  cargandoHistorial.value = true

  const { start, end } = rangoDia(dia)

  try {
    const qh = query(
      collection(db, 'historial_operatividad'),
      where('equipoId', '==', equipoId),
      where('jornada', '==', jornada),
      where('fecha', '>=', start),
      where('fecha', '<', end),
      orderBy('fecha'),
      orderBy('timestamp', 'desc')
    )

    const sh = await getDocs(qh)
    historialItems.value = sh.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.warn('Fallback historial sin índice compuesto:', error)

    const qh = query(
      collection(db, 'historial_operatividad'),
      where('equipoId', '==', equipoId),
      where('jornada', '==', jornada),
      where('fecha', '>=', start),
      where('fecha', '<', end)
    )

    const sh = await getDocs(qh)
    historialItems.value = sh.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || a.fecha)
        const tb = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || b.fecha)
        return tb - ta
      })
  } finally {
    cargandoHistorial.value = false
  }
}

/* ======================= COMENTARIO INDIVIDUAL ======================= */
const comentarioVisible = ref(false)
const comentarioTexto = ref('')
const comentarioMeta = ref({ equipoId: '', jornada: '', dia: '' })
const floatingCommentVisible = ref(false)
const floatingCommentSaving = ref(false)
const floatingCommentTexto = ref('')
const floatingCommentMeta = ref({
  contratoId: '',
  categoria: '',
  rowIndex: -1,
  diaIndex: -1,
  equipoId: '',
  jornada: '',
  dia: '',
  clave: '',
})

function getComentarioAutomaticoPorEstado(estado) {
  const map = {
    D: 'EQUIPO OPERATIVO',
    F: 'EQUIPO POR FALLA MECANICA',
    M: 'MANTENCIÓN RUTINARIA',
  }
  return map[String(estado || '').toUpperCase()] || 'REGISTRO DE OPERATIVIDAD'
}

function cerrarFloatingComment() {
  floatingCommentVisible.value = false
  floatingCommentSaving.value = false
  floatingCommentTexto.value = ''
  floatingCommentMeta.value = {
    contratoId: '',
    categoria: '',
    rowIndex: -1,
    diaIndex: -1,
    equipoId: '',
    jornada: '',
    dia: '',
    clave: '',
  }
}

function abrirFloatingComment(meta = {}) {
  const clave =
    meta.clave ||
    `${meta.equipoId || ''}-${meta.jornada || ''}-${meta.dia || ''}`

  floatingCommentMeta.value = {
    contratoId: meta.contratoId || '',
    categoria: meta.categoria || '',
    rowIndex: Number.isFinite(meta.rowIndex) ? meta.rowIndex : -1,
    diaIndex: Number.isFinite(meta.diaIndex) ? meta.diaIndex : -1,
    equipoId: meta.equipoId || '',
    jornada: meta.jornada || '',
    dia: meta.dia || '',
    clave,
  }

  floatingCommentTexto.value = observacionesCelda.value[clave] || ''
  floatingCommentVisible.value = true
}

async function guardarFloatingComment() {
  const { equipoId, jornada, dia, clave } = floatingCommentMeta.value
  if (!equipoId || !jornada || !dia || !clave) return

  const estadoActual = getValorCelda(clave)
  if (!estadoActual) {
    alert('Primero debes marcar la celda con D, F o M.')
    return
  }

  floatingCommentSaving.value = true
  try {
    await guardarEstadoSimple(
      equipoId,
      dia,
      jornada,
      estadoActual,
      String(floatingCommentTexto.value || '').trim()
    )

    floatingCommentTexto.value = observacionesCelda.value[clave] || String(floatingCommentTexto.value || '').trim()
  } catch (error) {
    console.error('Error guardando comentario flotante:', error)
    alert('No se pudo guardar el comentario.')
  } finally {
    floatingCommentSaving.value = false
  }
}

function onCellInputFocus(contratoId, categoria, rowIndex, diaIndex, equipoId, jornada, dia) {
  if (selectionMode.value || modoAcciones.value || isVisualizador.value) return

  const clave = `${equipoId}-${jornada}-${dia}`
  const estadoActual = getValorCelda(clave)

  if (!estadoActual) {
    cerrarFloatingComment()
    return
  }

  abrirFloatingComment({
    contratoId,
    categoria,
    rowIndex,
    diaIndex,
    equipoId,
    jornada,
    dia,
    clave,
  })
}


async function guardarComentario() {
  const { equipoId, jornada, dia } = comentarioMeta.value
  const clave = `${equipoId}-${jornada}-${dia}`
  const estadoActual = getValorCelda(clave)

  if (!estadoActual) {
    alert('Primero debes marcar la celda con D, F o M.')
    return
  }

  await guardarEstadoSimple(
    equipoId,
    dia,
    jornada,
    estadoActual,
    String(comentarioTexto.value || '').trim()
  )

  comentarioVisible.value = false

  abrirFloatingComment({
    equipoId,
    jornada,
    dia,
    clave,
  })
}

function abrirModalLimpiar(equipoId, jornada, dia) {
  if (rolUsuario.value === 'visualizador') {
    alert('No tienes permisos para editar.')
    return
  }

  limpiarMeta.value = { equipoId, jornada, dia }
  limpiarComentario.value = ''
  limpiarVisible.value = true
}

function cerrarModalLimpiar() {
  limpiarVisible.value = false
  limpiarMeta.value = {
    equipoId: '',
    jornada: '',
    dia: ''
  }
  limpiarComentario.value = ''
}

async function confirmarLimpiarCelda() {
  const { equipoId, jornada, dia } = limpiarMeta.value
  if (!equipoId || !jornada || !dia) return

  await limpiarMarcadoCelda(equipoId, dia, jornada, limpiarComentario.value)
  cerrarModalLimpiar()
}
function buscarContratoIdPorEquipo(equipoId) {
  const cId = expandedContrato.value
  if (cId && (equiposByContrato.value[cId] || []).length) {
    const eq = equiposByContrato.value[cId].find(e => e.id === equipoId)
    if (eq) return eq.contratoId
  }
  for (const [, lista] of Object.entries(equiposByContrato.value)) {
    const eq = (lista || []).find(e => e.id === equipoId)
    if (eq) return eq.contratoId
  }
  return null
}

/* ======================= AGRUPACIÓN ======================= */
function equiposPorContratoYCategoria(contratoId) {
  const grupo = {}
  const lista = equiposByContrato.value[contratoId] || []
  for (const e of lista) {
    const cat = e.categoria || 'SIN CATEGORÍA'
    if (!grupo[cat]) grupo[cat] = []
    grupo[cat].push(e)
  }
  return grupo
}

/* ======================= EXCEL ======================= */
async function descargarExcelContrato(contrato) {
  descargandoExcel.value = true
  try {
    if (!equiposByContrato.value[contrato.id]) await cargarContratoDetalle(contrato.id)
    const equiposContrato = equiposByContrato.value[contrato.id] || []
    const oper = operByContrato.value[contrato.id] || []
    const operMap = {}
    for (const o of oper) {
      const fecha = o.fecha?.toDate ? o.fecha.toDate() : new Date(o.fecha)
      const dia   = String(fecha.getDate()).padStart(2, '0')
      const clave = `${o.equipoId}-${dia}-${o.jornada}`
      operMap[clave] = (nombreToLetra(o.estado) || '').toUpperCase()
    }
    const dias   = diasNumericosPorContrato(contrato.id)
    const perDay = 2
    const categorias = {}
    for (const eq of equiposContrato) {
      const cat = eq.categoria || 'SIN CATEGORÍA'
      if (!categorias[cat]) categorias[cat] = []
      categorias[cat].push(eq)
    }
    const wb = XLSX.utils.book_new()
    wb.Workbook = wb.Workbook || {}
    wb.Workbook.CalcPr = { fullCalcOnLoad: true }

    const data = []
    const titulo = `Operatividad — ${contrato.nombre} — ${etiquetaPeriodo.value}`
    data.push([titulo])
    const row1 = ['CATEGORÍA', 'N° INTERNO', 'PPU']
    const row2 = ['', '', '']
    dias.forEach((d) => { row1.push(String(parseInt(d, 10))); row1.push(''); row2.push('A','B') })
    row1.push('D (Disponible)', 'F (Falla)', '%')
    row2.push('', '', '')
    data.push(row1, row2)

    let currentRow = 3
    const merges = []
    for (const [categoria, grupoEquipos] of Object.entries(categorias)) {
      const categoriaRow = [categoria]; for (let i = 1; i < row1.length; i++) categoriaRow.push('')
      data.push(categoriaRow)
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: row1.length - 1 } })
      currentRow++
      for (const eq of grupoEquipos) {
        const fila = ['', eq.nombre_equipo || '', eq.patente || '']
        for (const d of dias) {
          fila.push((operMap[`${eq.id}-${d}-A`] || '').toUpperCase())
          fila.push((operMap[`${eq.id}-${d}-B`] || '').toUpperCase())
        }
        fila.push('', '', '')
        data.push(fila)
        currentRow++
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(data)
    const totalCols = 3 + (dias.length * perDay) + 3
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } })
    const mergesDias = dias.map((_, i) => ({
      s: { r: 1, c: 3 + i * perDay },
      e: { r: 1, c: 3 + i * perDay + (perDay - 1) }
    }))
    ws['!merges'] = [...merges, ...mergesDias]

    // estilos
    const BORDER_THIN = { style: 'thin', color: { rgb: 'FF999999' } }
    const allBorders  = { top: BORDER_THIN, right: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN }
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
    for (let c = 0; c < colsCount; c++) {
      const ref = XLSX.utils.encode_cell({ r: 0, c })
      ws[ref] = ws[ref] || {}; ws[ref].s = titleStyle
    }
    for (let c = 0; c < colsCount; c++) {
      const h1 = XLSX.utils.encode_cell({ r: 1, c })
      const h2 = XLSX.utils.encode_cell({ r: 2, c })
      ws[h1] = ws[h1] || {}; ws[h1].s = headerStyle
      ws[h2] = ws[h2] || {}; ws[h2].s = subHeaderStyle
    }
    for (let r = 3; r <= range.e.r; r++) {
      const c0 = XLSX.utils.encode_cell({ r, c: 0 })
      const isCategoriaRow = ws[c0] && ws[c0].v && (ws[c0].v !== '')
      for (let c = 0; c < colsCount; c++) {
        const ref = XLSX.utils.encode_cell({ r, c })
        ws[ref] = ws[ref] || {}
        ws[ref].s = isCategoriaRow ? categoriaStyle : (c <= 2 ? bodyLeftStyle : bodyStyle)
      }
    }
    const estadosStart = 3
    const estadosEnd   = 3 + (dias.length * perDay) - 1
    for (let r = 3; r <= range.e.r; r++) {
      const isCategoriaRow = ws[XLSX.utils.encode_cell({ r, c: 0 })]?.v ? true : false
      if (isCategoriaRow) continue
      for (let c = estadosStart; c <= estadosEnd; c++) {
        const ref = XLSX.utils.encode_cell({ r, c })
        const v = String(ws[ref]?.v ?? '').toUpperCase()
        if (v === 'D') ws[ref].s = styleD
        else if (v === 'F') ws[ref].s = styleF
        else if (v === 'M') ws[ref].s = styleM
      }
    }
    const totalTurnos = dias.length * perDay
    for (let r = 3; r <= range.e.r; r++) {
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
    ws['!cols'] = [
      { wch: 22 }, { wch: 18 }, { wch: 14 },
      ...Array.from({ length: dias.length * perDay }, () => ({ wch: 4 })),
      { wch: 14 }, { wch: 12 }, { wch: 10 }
    ]
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: range.e.r, c: 2 } }) }
    XLSX.utils.book_append_sheet(wb, ws, 'Operatividad')
    const nombreArchivo = `operatividad_${contrato.nombre.replace(/\s+/g,'_')}_${String(mes.value+1).padStart(2,'0')}-${year.value}.xlsx`
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob   = new Blob([buffer], { type: 'application/octet-stream' })
    saveAs(blob, nombreArchivo)
  } catch (e) {
    console.error('Error al generar Excel:', e)
  } finally {
    setTimeout(() => { descargandoExcel.value = false }, 300)
  }
}

/* ======================= SELECCIÓN MÚLTIPLE ======================= */
const selectionMode = ref(false)
const selectedCells = ref(new Map())
const applyingBatch = ref(false)
const batchModal = ref({
  visible: false,
  estado: '',
  quiereComentario: false,
  comentario: ''
})
const batchFeedback = ref({ text: '', error: false })

const selectedCellsCount = computed(() => selectedCells.value.size)
const selectionContratoNombre = computed(() => {
  const c = contratosUsuario.value.find(x => x.id === expandedContrato.value)
  return c?.nombre || '—'
})

function cellKey(equipoId, jornada, dia){ return `${equipoId}-${jornada}-${dia}` }
function isSelected(equipoId, jornada, dia){ return selectedCells.value.has(cellKey(equipoId, jornada, dia)) }

function addToSelection(equipoId, jornada, dia, contratoId) {
  if (rolUsuario.value === 'visualizador') return
  const key = cellKey(equipoId, jornada, dia)
  if (!puedeEditar(timestampsCelda.value[key])) return
  if (dragAddMode.value) selectedCells.value.set(key, { equipoId, jornada, dia, contratoId })
  else selectedCells.value.delete(key)
}

function onCellClickSelect(equipoId, jornada, dia, contratoId){
  const key = cellKey(equipoId, jornada, dia)
  if (selectedCells.value.has(key)) selectedCells.value.delete(key)
  else addToSelection(equipoId, jornada, dia, contratoId)
}

function clearSelection(){ selectedCells.value.clear() }

function openBatchModal() {
  if (selectedCellsCount.value === 0) return
  batchModal.value = {
    visible: true,
    estado: '',
    quiereComentario: false,
    comentario: ''
  }
  batchFeedback.value = { text: '', error: false }
}

function closeBatchModal() {
  batchModal.value.visible = false
  batchModal.value.estado = ''
  batchModal.value.quiereComentario = false
  batchModal.value.comentario = ''
  batchFeedback.value = { text: '', error: false }
}

async function applyBatch() {
  if (rolUsuario.value === 'visualizador') {
    batchFeedback.value = { text: 'No tienes permisos para editar.', error: true }
    return
  }

  if (!ALLOWED.includes(batchModal.value.estado)) {
    batchFeedback.value = { text: 'Debes seleccionar D, F o M.', error: true }
    return
  }

  const items = Array.from(selectedCells.value.entries())

  applyingBatch.value = true
  batchProgress.value = {
    visible: true,
    total: items.length,
    current: 0,
    action: 'Registrando'
  }

  let ok = 0
  let skipped = 0

  try {
    for (const [key, meta] of items) {
      const equipoId = meta?.equipoId
      const jornada = meta?.jornada
      const dia = meta?.dia

      batchProgress.value.current++

      if (!equipoId || !jornada || !dia) {
        skipped++
        continue
      }

      const comentario = batchModal.value.quiereComentario
        ? String(batchModal.value.comentario || '').trim()
        : ''

      try {
        await guardarEstadoSimple(
          equipoId,
          dia,
          jornada,
          batchModal.value.estado,
          comentario
        )
        ok++
        await wait(40)
      } catch (e) {
        console.error('Error aplicando lote en celda:', { key, meta, e })
        skipped++
      }
    }

    const msg = `Aplicadas ${ok} celdas` + (skipped ? ` · Omitidas ${skipped}` : '')
    batchFeedback.value = { text: msg, error: false }

    if (ok > 0) {
      clearSelection()
      closeBatchModal()
    }
  } catch (e) {
    console.error(e)
    batchFeedback.value = { text: 'Ocurrió un error aplicando los cambios.', error: true }
  } finally {
    applyingBatch.value = false
    setTimeout(() => {
      batchProgress.value.visible = false
      batchProgress.value.current = 0
      batchProgress.value.total = 0
      batchProgress.value.action = ''
    }, 500)
  }
}
const batchClearVisible = ref(false)
const batchClearComentario = ref('')

function openBatchClearModal() {
  if (!selectedCellsCount.value) {
    alert('No hay celdas seleccionadas.')
    return
  }
  batchClearComentario.value = ''
  batchClearVisible.value = true
}

function closeBatchClearModal() {
  batchClearVisible.value = false
  batchClearComentario.value = ''
}

async function confirmBatchClear() {
  try {
    const comentario = String(batchClearComentario.value || '').trim() || 'Limpieza masiva por error de carga.'
    const items = Array.from(selectedCells.value.entries())

    batchProgress.value = {
      visible: true,
      total: items.length,
      current: 0,
      action: 'Limpiando'
    }

    let ok = 0
    let skipped = 0

    for (const [key, meta] of items) {
      const equipoId = meta?.equipoId
      const jornada = meta?.jornada
      const dia = meta?.dia

      batchProgress.value.current++

      if (!equipoId || !jornada || !dia) {
        console.warn('Selección inválida omitida:', { key, meta })
        skipped++
        continue
      }

      if (!puedeEditar(timestampsCelda.value[key])) {
        skipped++
        continue
      }

      try {
        await limpiarMarcadoCelda(equipoId, dia, jornada, comentario)
        ok++
        await wait(45)
      } catch (error) {
        console.error('Error limpiando selección:', { key, meta, error })
        skipped++
      }
    }

    if (ok > 0) {
      clearSelection()
      closeBatchClearModal()
    }

    if (skipped > 0) {
      console.warn(`Limpieza completada con ${skipped} celdas omitidas.`)
    }
  } catch (error) {
    console.error('Error al limpiar selección:', error)
    alert('No se pudo limpiar una o más celdas seleccionadas.')
  } finally {
    setTimeout(() => {
      batchProgress.value.visible = false
      batchProgress.value.current = 0
      batchProgress.value.total = 0
      batchProgress.value.action = ''
    }, 500)
  }
}
async function applyBatchQuick(estadoLetra) {
  batchModal.value.estado = estadoLetra
  batchModal.value.quiereComentario = false
  batchModal.value.comentario = ''
  await applyBatch()
}

watch(selectionMode, v => { if (!v) clearSelection() })
watch(modoAcciones, (activo) => {
  if (activo) {
    cerrarFloatingComment()
  }
})
/* ===== Arrastre con mouse (“pincel”) ===== */
const isDraggingSelect = ref(false)
const dragAddMode = ref(true)

function handleCellMouseDown(evt, equipoId, jornada, dia, contratoId){
  if (!selectionMode.value) return
  evt.preventDefault()
  evt.stopPropagation()
  if (rolUsuario.value === 'visualizador') return
  isDraggingSelect.value = true
  dragAddMode.value = !evt.altKey
  addToSelection(equipoId, jornada, dia, contratoId)
}

function onCellMouseEnter(equipoId, jornada, dia, contratoId){
  if (!isDraggingSelect.value) return
  addToSelection(equipoId, jornada, dia, contratoId)
}

function onMouseUpGlobal(){ isDraggingSelect.value = false }
function onKeyDownGlobal(e){ if (e.key === 'Alt') dragAddMode.value = false }
function onKeyUpGlobal(e){ if (e.key === 'Alt') dragAddMode.value = true }

onMounted(() => {
  window.addEventListener('mouseup', onMouseUpGlobal)
  window.addEventListener('keydown', onKeyDownGlobal)
  window.addEventListener('keyup', onKeyUpGlobal)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', onMouseUpGlobal)
  window.removeEventListener('keydown', onKeyDownGlobal)
  window.removeEventListener('keyup', onKeyUpGlobal)
  document.body.style.overflow = ''
})

function onCellClick(equipoId, jornada, dia, contratoId, categoria, rowIndex, diaIndex) {
  if (selectionMode.value) {
    onCellClickSelect(equipoId, jornada, dia, contratoId)
    return
  }

  if (modoAcciones.value) {
    abrirHistorial(equipoId, jornada, dia)
    return
  }

  focusCell(contratoId, categoria, rowIndex, diaIndex, jornada)

  nextTick(() => {
    onCellInputFocus(contratoId, categoria, rowIndex, diaIndex, equipoId, jornada, dia)
  })
}
function onInputCellClick(event, equipoId, jornada, dia, contratoId, categoria, rowIndex, diaIndex) {
  event.stopPropagation()

  if (modoAcciones.value) {
    abrirHistorial(equipoId, jornada, dia)
    return
  }

  if (selectionMode.value) {
    onCellClickSelect(equipoId, jornada, dia, contratoId)
    return
  }

  onCellClick(equipoId, jornada, dia, contratoId, categoria, rowIndex, diaIndex)
}

function onInputCellMouseDown(event, equipoId, jornada, dia, contratoId) {
  if (selectionMode.value) {
    handleCellMouseDown(event, equipoId, jornada, dia, contratoId)
    return
  }

  if (modoAcciones.value) {
    event.preventDefault()
    event.stopPropagation()
  }
}
async function guardarEstadoSimple(equipoId, dia, jornada, estadoLetra, comentarioManual = '') {
  if (!equipoId || !dia || !jornada || !estadoLetra) return

  const dd = parseInt(String(dia).slice(0, 2))
  const fecha = new Date(year.value, mes.value, dd)
  const contratoId = buscarContratoIdPorEquipo(equipoId) || ''
  const clave = buildClave(equipoId, jornada, dia)

  markProcessingCell(clave)

  try {
    const auth = getAuth()
    const currentUser = auth.currentUser

    let nombre_completo = ''
    let registradoPor = ''

    if (currentUser) {
      registradoPor = currentUser.email || ''
      const userDocRef = doc(db, 'usuarios', currentUser.uid)
      const userSnap = await getDoc(userDocRef)
      if (userSnap.exists()) {
        nombre_completo = userSnap.data().nombre_completo || ''
      }
    }

    const observaciones = String(comentarioManual || '').trim()
    const docId = `${equipoId}_${jornada}_${dia}`

    await setDoc(doc(db, 'operatividad', docId), {
      contratoId,
      equipoId,
      estado: letraToNombre(estadoLetra),
      fecha,
      jornada,
      nombre_completo,
      observaciones,
      registradoPor,
      timestamp: new Date()
    })

    inputValues.value[clave] = estadoLetra
    observacionesCelda.value[clave] = observaciones
    usuariosCelda.value[clave] = nombre_completo
      ? `${nombre_completo}${registradoPor ? ` (${registradoPor})` : ''}`
      : (registradoPor || 'Desconocido')
    timestampsCelda.value[clave] = new Date()

    await setDoc(doc(db, 'historial_operatividad', `${docId}_${Date.now()}`), {
      accion: 'actualizacion',
      contratoId,
      equipoId,
      estado: letraToNombre(estadoLetra),
      fecha,
      jornada,
      nombre_completo,
      observaciones,
      registradoPor,
      timestamp: new Date()
    })

    savedBlinkKey.value = clave
    setTimeout(() => {
      if (savedBlinkKey.value === clave) savedBlinkKey.value = ''
    }, 550)
  } finally {
    unmarkProcessingCell(clave)
  }
}
/* === Arrastre táctil (mobile) === */
const touchDragging = ref(false)
const touchLongPress = ref(false)
let touchLongPressTimer = null

function startTouchBrush() {
  if (!selectionMode.value) return
  if (rolUsuario.value === 'visualizador') return
  isDraggingSelect.value = true
  touchDragging.value = true
  dragAddMode.value = true
}
function clearTouchTimers() {
  if (touchLongPressTimer) {
    clearTimeout(touchLongPressTimer)
    touchLongPressTimer = null
  }
}
const limpiarVisible = ref(false)
const limpiarMeta = ref({
  equipoId: '',
  jornada: '',
  dia: ''
})
const limpiarComentario = ref('')
function handleCellTouchStart(e, equipoId, jornada, dia, contratoId) {
  if (!selectionMode.value) return
  e.preventDefault()
  e.stopPropagation()
  touchLongPress.value = false
  clearTouchTimers()
  touchLongPressTimer = setTimeout(() => {
    touchLongPress.value = true
    startTouchBrush()
    addToSelection(equipoId, jornada, dia, contratoId)
  }, 300)
}
function elementCellMetaFromPoint(x, y) {
  const el = document.elementFromPoint(x, y)
  if (!el) return null
  const td = el.closest?.('td.position-relative[data-eid]')
  if (!td) return null
  const equipoId = td.getAttribute('data-eid')
  const jornada  = td.getAttribute('data-turno')
  const dia      = td.getAttribute('data-dia')
  const contratoId = expandedContrato.value
  return { equipoId, jornada, dia, contratoId }
}
function onCellTouchMove(e) {
  if (!selectionMode.value) return
  if (!touchDragging.value) return
  const t = e.changedTouches?.[0]
  if (!t) return
  const meta = elementCellMetaFromPoint(t.clientX, t.clientY)
  if (!meta) return
  addToSelection(meta.equipoId, meta.jornada, meta.dia, meta.contratoId)
}
function onCellTouchEnd(e) {
  clearTouchTimers()
  if (!selectionMode.value) return
  const t = e.changedTouches?.[0]
  if (t) {
    const meta = elementCellMetaFromPoint(t.clientX, t.clientY)
    if (meta && !touchLongPress.value) {
      onCellClickSelect(meta.equipoId, meta.jornada, meta.dia, meta.contratoId)
    }
  }
  isDraggingSelect.value = false
  touchDragging.value = false
  touchLongPress.value = false
}
onMounted(() => {
  window.addEventListener('touchend', onCellTouchEnd, { passive: false })
})
onUnmounted(() => {
  window.removeEventListener('touchend', onCellTouchEnd)
  clearTouchTimers()
})
</script>

<style scoped>
/* ========= Variables responsivas para sticky ========= */
:root, :host {
  --col-interno: 160px;
  --col-ppu: 140px;
}
/* md-down */
@media (max-width: 992px){
  :root, :host { --col-interno: 120px; --col-ppu: 100px; }
}
/* xs */
@media (max-width: 576px){
  :root, :host { --col-interno: 100px; --col-ppu: 88px; }
}

/* ===== Modal docs “casi pantalla completa” ===== */
.docs-modal { z-index: 1800; }
.docs-modal .modal-dialog{
  max-width: min(1100px, 98vw);
  width: 98vw;
  margin: 0.75rem auto;
}
.docs-modal .modal-content{
  height: min(92vh, 980px);
  border-radius: 16px;
  overflow: hidden;
}
.docs-modal .modal-body{
  overflow: auto;
}

/* ===== PDF overlay (más arriba y full) ===== */
.pdf-overlay{
  position: fixed; inset: 0; background: rgba(0,0,0,.60);
  z-index: 5000; display: flex; flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom);
}
.pdf-toolbar{
  display: flex; align-items: center; gap: 8px;
  background: rgba(0,0,0,.75); color: #fff; padding: 10px 12px;
}
.pdf-stage{
  flex: 1;
  min-height: 0;
  background: #111;
}
.pdf-stage iframe{
  width: 100%;
  height: calc(100vh - 52px);
  background: #fff;
}

/* ===== Preview overlay (imagen) full ===== */
.preview-overlay{
  position: fixed; inset: 0;
  background: rgba(0,0,0,.65);
  z-index: 5001;
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom);
}
.preview-toolbar{
  display: flex; align-items: center; gap: 8px;
  background: rgba(0,0,0,.75);
  color: #fff;
  padding: 10px 12px;
}
.preview-stage{
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: auto;
  padding: 10px;
}
.preview-stage img{
  max-width: 96vw;
  max-height: calc(100vh - 70px);
  transform-origin: center;
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,.35);
}

/* Grid miniaturas */
.thumb-grid{
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 10px;
}
.thumb-btn{
  border: 1px solid rgba(0,0,0,.12);
  border-radius: 12px;
  background: #fff;
  padding: 6px;
  transition: transform .12s ease, box-shadow .12s ease;
}
.thumb-btn:hover{
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0,0,0,.12);
}
.thumb-btn img{
  width: 100%;
  height: 78px;
  object-fit: cover;
  border-radius: 8px;
}

/* Nueva columna sticky para DOCS */
.col-docs { width: 56px; min-width: 56px; text-align: center; }
.sticky-col-3 {
  position: sticky;
  background: #fff;
  z-index: 3;
  left: calc(var(--col-interno) + var(--col-ppu));
  box-shadow: 2px 0 0 rgba(0,0,0,0.06);
}
.table thead th.sticky-col-3 { z-index: 4; }

/* Ajustes dinámicos por variables */
.col-interno { width: var(--col-interno); min-width: var(--col-interno); }
.col-ppu     { width: var(--col-ppu);     min-width: var(--col-ppu); }
.sticky-col, .sticky-col-2 { position: sticky; background: #fff; z-index: 3; }
.sticky-col   { left: 0;     box-shadow: 2px 0 0 rgba(0,0,0,0.06); }
.sticky-col-2 { left: var(--col-interno); box-shadow: 2px 0 0 rgba(0,0,0,0.06); }
.table thead th.sticky-col, .table thead th.sticky-col-2 { z-index: 4; }

.horas-range {
  cursor: pointer;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
}

.horas-range::-webkit-slider-thumb {
  cursor: grab;
}

.horas-range:active::-webkit-slider-thumb {
  cursor: grabbing;
}

.horas-num {
  max-width: 92px;
}

/* Modal ajuste leve */
.modal .list-group-item .btn { padding: .25rem .5rem; }

/* ======== Cabecera responsiva por contrato ======== */
.contrato-row{ display: grid; grid-template-columns: 1fr auto; gap: 12px 16px; align-items: center; }
.contrato-row__title{ min-width: 0; display: flex; align-items: center; }
.contrato-row__title .emoji{ font-size: 1.9rem; line-height: 1; }
.contrato-row__title .card-title{
  margin: 0; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all .2s ease;
}
.contrato-row__title .card-title.nombre-expandido{ white-space: normal; overflow: visible; text-overflow: initial; }
.contrato-row__actions{ display: grid; grid-auto-flow: column; grid-auto-columns: max-content; gap: 8px 12px; align-items: center; }
.switches{ display: flex; align-items: center; gap: 8px; }
.actions-toolbar{ display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

@media (max-width: 1200px){
  .contrato-row{ grid-template-columns: 1fr; }
  .contrato-row__actions{ grid-auto-flow: row; grid-auto-rows: max-content; }
}
@media (max-width: 768px){
  .switches{ gap: 4px; }
  .actions-toolbar{
    flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: thin;
    overscroll-behavior-x: contain; padding-bottom: 2px;
  }
  .actions-toolbar > *{ flex: 0 0 auto; }
  .btn{ padding: .42rem .6rem; }
}

/* ===== Ajustes de tabla ===== */
.table td, .table th { vertical-align: middle; padding: 0.25rem; }
.th-turno { font-size: 0.8rem; line-height: 1; }

/* Letras visibles */
.cell-letter-visible{
  position: absolute; inset: 2px; display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 1rem; line-height: 1; text-transform: uppercase;
  letter-spacing: .5px; pointer-events: none; user-select: none; z-index: 2; color: white !important;
}

/* Input */
.cell-input{
  min-height: 30px; font-weight: 900; font-size: 1rem; text-transform: uppercase;
  letter-spacing: .5px; text-align: center; line-height: 1.1; padding-right: 30px; z-index: 1;
  color: transparent !important; -webkit-text-fill-color: transparent !important; caret-color: #111;
  background-clip: padding-box;
}
.cell-input:focus{ color: #111 !important; -webkit-text-fill-color: #111 !important; }

/* Colores */
.bg-success.text-white { color: #fff !important; }
.bg-danger.text-white  { color: #fff !important; }
.bg-warning.text-dark  { color: #000 !important; }
.bg-info.text-dark     { color: #000 !important; }

/* Botones flotantes */
.celda-actions{
  position: absolute; bottom: 2px; right: 45px; display: none; gap: 2px; z-index: 5;
}
td.position-relative:hover .celda-actions{ display: inline-flex; }
td.position-relative .btn-xs{
  padding: 2px 6px; font-size: 0.7rem; line-height: 1; box-shadow: 0 0 0 1px rgba(0,0,0,.05);
}

/* Modo acciones */
.modo-acciones td.position-relative:hover .celda-actions{ display: none !important; }
.modo-acciones td.position-relative{ cursor: pointer; }

/* Selección múltiple */
.cell-selected {
  outline: 2px solid #0d6efd; outline-offset: -2px; box-shadow: inset 0 0 0 2px rgba(13,110,253,.3);
  position: relative;
}
.cell-selected::after{
  content: ""; position: absolute; inset: 2px; background: rgba(13,110,253,.08);
  pointer-events: none; border-radius: 2px;
}

/* Scrolls */
.scroll-horizontal {
  overflow-x: auto; scrollbar-width: thin; scrollbar-color: #aaa transparent;
  -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain;
}
.scroll-horizontal::-webkit-scrollbar { height: 8px; }
.scroll-horizontal::-webkit-scrollbar-thumb { background: #aaa; border-radius: 4px; }
.scroll-horizontal::-webkit-scrollbar-thumb:hover { background: #666; }

.scroll-equipos {
  max-height: 600px; overflow-y: auto; margin-bottom: 1rem; padding-right: 8px;
  scrollbar-width: thin; scrollbar-color: #bbb transparent;
  -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
}
.scroll-equipos::-webkit-scrollbar { width: 8px; }
.scroll-equipos::-webkit-scrollbar-thumb { background: #bbb; border-radius: 4px; }
.scroll-equipos::-webkit-scrollbar-thumb:hover { background: #999; }

/* Alerta */
.alert-danger.shadow-sm h5 { font-weight: 700; }
.cell-saved {
  animation: pulseSaved .55s ease;
}

.cell-processing {
  animation: pulseProcessing 1s ease-in-out infinite;
  box-shadow: inset 0 0 0 2px rgba(13,110,253,.45), 0 0 0 2px rgba(13,110,253,.10);
}

.cell-clearing {
  animation: pulseClearing .45s ease;
  box-shadow: inset 0 0 0 2px rgba(220,53,69,.35), 0 0 0 2px rgba(220,53,69,.08);
}

@keyframes pulseSaved {
  0%   { transform: scale(1); box-shadow: 0 0 0 rgba(25,135,84,0); }
  40%  { transform: scale(1.04); box-shadow: 0 0 0 4px rgba(25,135,84,.18); }
  100% { transform: scale(1); box-shadow: 0 0 0 rgba(25,135,84,0); }
}

@keyframes pulseProcessing {
  0%   { box-shadow: inset 0 0 0 2px rgba(13,110,253,.22), 0 0 0 0 rgba(13,110,253,.15); }
  50%  { box-shadow: inset 0 0 0 2px rgba(13,110,253,.55), 0 0 0 6px rgba(13,110,253,.08); }
  100% { box-shadow: inset 0 0 0 2px rgba(13,110,253,.22), 0 0 0 0 rgba(13,110,253,.15); }
}

@keyframes pulseClearing {
  0%   { transform: scale(1); background-color: rgba(220,53,69,.08); }
  50%  { transform: scale(.97); background-color: rgba(220,53,69,.18); }
  100% { transform: scale(1); background-color: transparent; }
}

.batch-progress-card {
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: 0 8px 18px rgba(0,0,0,.06);
}

.batch-progress-bar {
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(0,0,0,.06);
}

.batch-progress-bar .progress-bar {
  transition: width .22s ease;
}

.batch-progress-pop-enter-from,
.batch-progress-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(.98);
}

.batch-progress-pop-enter-active,
.batch-progress-pop-leave-active {
  transition: all .25s ease;
}

.batch-progress-pop-enter-to,
.batch-progress-pop-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
/* Animación alerta */
.alert-pop-enter-from { opacity: 0; transform: translateY(-6px) scale(.98); filter: blur(1px); }
.alert-pop-enter-active { transition: all .35s cubic-bezier(.2,.8,.2,1); }
.alert-pop-enter-to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
.alert-pop-leave-from { opacity: 1; transform: translateY(0) scale(1); }
.alert-pop-leave-active { transition: all .22s ease; }
.alert-pop-leave-to { opacity: 0; transform: translateY(-6px) scale(.98); }

/* Zoom tabla */
.tabla-zoom-out td, .tabla-zoom-out th { font-size: 0.52rem; padding: 0.15rem; }
.tabla-zoom-out .cell-input { font-size: 0.55rem !important; min-height: 22px !important; }

/* Overlay Excel */
.excel-overlay{
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: grid; place-items: center; z-index: 2000; backdrop-filter: blur(1px);
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
.excel-box{
  background: rgba(0,0,0,.25); padding: 22px 28px; border-radius: 14px;
  box-shadow: 0 6px 24px rgba(0,0,0,.25);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-width: 260px; min-height: 160px;
}

/* Fade overlay */
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }

/* Card */
.card { border-radius: 16px; background-color: #fff; border: 1px solid #dee2e6; }
.floating-comment-card {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  width: min(680px, calc(100vw - 24px));
  z-index: 9999;
  background: #fff;
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 18px 40px rgba(0,0,0,.18);
  will-change: transform, opacity;
}
.floating-comment-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(0,0,0,.06);
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
}

.floating-comment-card__body {
  padding: 14px 16px 16px;
}

.floating-comment-pop-enter-active,
.floating-comment-pop-leave-active {
  transition: opacity .18s ease, transform .22s ease;
}

.floating-comment-pop-enter-from,
.floating-comment-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(22px) scale(.98);
}

.floating-comment-pop-enter-to,
.floating-comment-pop-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}
</style>


<script>
export default { name: 'HomeView' }
</script>
