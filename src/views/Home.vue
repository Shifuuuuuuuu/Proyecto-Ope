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
      <!-- ALERTA: contratos con inactividad >= 48h (aparece con animación y se calcula en segundo plano) -->
      <transition name="alert-pop" appear>
        <div
          v-if="showAlert && contratosAtrasados.length"
          class="alert alert-danger border-0 shadow-sm mb-4"
        >
          <div class="d-flex align-items-start justify-content-between gap-3">
            <div class="d-flex align-items-start gap-3">
              <i class="bi bi-exclamation-triangle-fill fs-3"></i>
              <div>
                <h5 class="mb-1">Atención: inactividad detectada</h5>
                <p class="mb-2">
                  Los siguientes contratos no tienen registros en las <strong>últimas 48 horas</strong>.
                  Por favor, ingresa operatividad para mantener la información al día.
                </p>

                <!-- Listado compacto de contratos atrasados -->
                <ul class="list-unstyled mb-0">
                  <li v-for="c in contratosAtrasados" :key="c.id" class="mb-2">
                    <div class="d-flex flex-wrap align-items-center gap-2">
                      <span class="badge text-bg-light border" :title="c.nombre">{{ c.nombre }}</span>
                      <span class="small text-muted">
                        Último registro: <strong>{{ c._lastText }}</strong>
                      </span>
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

                <!-- Fila sin registros jamás -->
                <div v-if="contratosNuncaRegistrados.length" class="mt-2">
                  <span class="badge text-bg-secondary">Sin registros previos</span>
                  <span class="small ms-2">
                    {{ contratosNuncaRegistrados.map(x => x.nombre).join(', ') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Acciones -->
            <div class="text-end">
              <button class="btn btn-sm btn-outline-secondary" @click="refrescarAlertaAnimada">
                <i class="bi bi-arrow-clockwise"></i> Actualizar
              </button>
            </div>
          </div>
        </div>
      </transition>
      <div v-if="mostrarInstrucciones" class="alert alert-warning border">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <strong class="text-danger">📌 Instrucciones:</strong>
            <ul class="mb-0 small">
              <li><strong>D</strong>: Disponible</li>
              <li><strong>F</strong>: Falla (fuera de servicio)</li>
              <li><strong>M</strong>: Mantención</li>
            </ul>
          </div>
          <button class="btn-close" @click="mostrarInstrucciones = false"></button>
        </div>
      </div>
      <h2 class="text-center mb-1">Contrato Asignado</h2>
      <p class="text-center text-muted mb-4">
        Período de: <strong>{{ etiquetaPeriodo }}</strong>
      </p>
      <!-- Accesos rápidos + Volver (alineados) -->
      <div class="d-flex flex-wrap justify-content-start gap-2 mb-4">
        <button class="btn btn-outline-secondary"
                @click="$router.back()"
                title="Volver a la página anterior">
          <i class="bi bi-arrow-left-circle me-1"></i> Volver al menú
        </button>

        <!-- Historial (si está logueado) -->
        <router-link
          v-if="estaLogueado"
          class="btn btn-outline-secondary"
          to="/historial-operatividad">
          <i class="bi bi-clock-history me-1"></i> Historial
        </router-link>

        <!-- Editor Equipos (solo operador o admin) -->
        <router-link
          v-if="rolUsuario === 'operador' || rolUsuario === 'admin'"
          class="btn btn-outline-secondary"
          to="/mis-equipos">
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
                  <!-- Título (full al hover/tap) -->
                  <div class="contrato-row__title">
                    <span class="emoji me-2">{{ emojiContrato(contrato.nombre) }}</span>
                    <h4
                      class="card-title mb-0 text-truncate"
                      :title="contrato.nombre"
                      @mouseenter="hoverContratoId = contrato.id"
                      @mouseleave="hoverContratoId = null"
                      @click="toggleNombreExpand(contrato.id)"
                      :class="{'nombre-expandido': nombreExpandidoId === contrato.id || hoverContratoId === contrato.id}"
                    >
                      {{ contrato.nombre }}
                    </h4>
                  </div>

                  <!-- Acciones -->
                  <div class="contrato-row__actions">
                    <div class="switches">
                      <div class="form-check form-switch me-2">
                        <input class="form-check-input" type="checkbox" v-model="modoAcciones" :id="`swHist-${contrato.id}`">
                        <label class="form-check-label d-none d-md-inline" :for="`swHist-${contrato.id}`">Historial de Cambios</label>
                      </div>

                      <div class="form-check form-switch me-2">
                        <input class="form-check-input" type="checkbox" v-model="autoAvance" :id="`swAuto-${contrato.id}`">
                        <label class="form-check-label d-none d-md-inline" :for="`swAuto-${contrato.id}`">Auto-avance</label>
                      </div>
                    </div>

                    <div class="actions-toolbar">
                      <!-- Botón Zoom tabla -->
                      <button class="btn btn-outline-secondary"
                              @click="toggleZoomTabla">
                        <i :class="zoomTabla ? 'bi bi-zoom-in' : 'bi bi-zoom-out'"></i>
                        <span class="d-none d-sm-inline ms-1">
                        </span>
                      </button>

                      <button class="btn btn-outline-primary"
                              @click="toggleExpand(contrato.id)"
                              :disabled="loadingContrato[contrato.id]">
                        <i :class="expandedContrato === contrato.id ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'"></i>
                        <span class="d-none d-sm-inline ms-1">
                          {{ expandedContrato === contrato.id ? 'Ocultar Equipos' : 'Ver Equipos' }}
                        </span>
                      </button>

                      <button class="btn btn-outline-primary"
                              @click="toggleMes(contrato.id)"
                              :disabled="loadingContrato[contrato.id]">
                        <i class="bi" :class="mesOffset === 0 ? 'bi-arrow-left-circle' : 'bi-arrow-right-circle'"></i>
                        <span class="d-none d-sm-inline ms-1">
                          {{ mesOffset === 0 ? 'Ir a MES PASADO' : 'Volver a MES ACTUAL' }}
                        </span>
                      </button>

                      <button class="btn btn-outline-success"
                              @click="descargarExcelContrato(contrato)"
                              :disabled="descargandoExcel || !canDescargarExcel || loadingContrato[contrato.id]"
                              :title="!canDescargarExcel ? 'Tu rol no permite descargar Excel' : (descargandoExcel ? 'Generando…' : 'Descargar Excel')">
                        <i class="bi" :class="descargandoExcel ? 'bi-hourglass-split' : 'bi-download'"></i>
                        <span class="d-none d-sm-inline ms-1">
                          {{ descargandoExcel ? 'Generando…' : 'Descargar Excel' }}
                        </span>
                      </button>
                      <button class="btn btn-outline-dark"
                              @click="$router.push({ name:'ContratoStats', params:{ contratoId: contrato.id }})"
                              :disabled="loadingContrato[contrato.id]">
                        <i class="bi bi-bar-chart"></i>
                        <span class="d-none d-sm-inline ms-1">Estadísticas</span>
                      </button>

                      <button class="btn btn-outline-danger"
                              @click="$router.push({ name: 'OTsPage', params:{ contratoId: contrato.id }})"
                              :disabled="loadingContrato[contrato.id]"
                              title="Cargar y ver OTs de equipos en Falla o Mantención">
                        <i class="bi bi-file-earmark-text"></i>
                        <span class="d-none d-sm-inline ms-1">OTs</span>
                      </button>
                      
                    </div>
                  </div>
                </div>

                <p v-if="expandedContrato === contrato.id" class="card-text mt-2">
                  <strong>Equipos asociados:</strong>
                  <span v-if="loadingContrato[contrato.id]" class="text-muted">cargando…</span>
                  <span v-else>{{ (equiposByContrato[contrato.id]?.length) ?? 0 }}</span>
                </p>

                <!-- Detalle contrato -->
                <div v-if="expandedContrato === contrato.id" class="scroll-equipos">
                  <div v-if="loadingContrato[contrato.id]" class="text-center py-4">
                    <div class="spinner-border"></div>
                  </div>

                  <template v-else>
                    <template v-for="(grupo, categoria) in equiposPorContratoYCategoria(contrato.id)" :key="categoria">
                      <div class="card mb-4 border">
                        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                          <span>{{ categoria }}</span>
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
                                  <th v-for="dia in diasPorContrato(contrato.id)" :key="dia" colspan="2">
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
                                  <td class="sticky-col col-interno" :title="equipo.nombre_equipo">{{ equipo.nombre_equipo }}</td>
                                  <td class="sticky-col-2 col-ppu" :title="equipo.patente">{{ equipo.patente }}</td>
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
                                  <template v-for="(dia, diaIndex) in diasPorContrato(contrato.id)" :key="'turno-' + dia">
                                    <!-- A -->
                                    <td class="position-relative p-1"
                                        @click="modoAcciones && abrirHistorial(equipo.id, 'A', dia)"
                                        @dblclick="modoAcciones && abrirComentario(equipo.id, 'A', dia)">
                                      <span class="cell-letter-visible">
                                        {{ getValorCelda(`${equipo.id}-A-${dia}`) }}
                                      </span>

                                      <input
                                        type="text"
                                        class="form-control form-control-sm text-center cell-input"
                                        :class="[colorCelda(getValorCelda(`${equipo.id}-A-${dia}`)), {'cell-saved': savedBlinkKey === `${equipo.id}-A-${dia}`} ]"
                                        :value="getValorCelda(`${equipo.id}-A-${dia}`)"
                                        placeholder="D/F/M"
                                        maxlength="1"
                                        @input="onCellInput($event, `${equipo.id}-A-${dia}`, dia, 'A', contrato.id, categoria, rowIndex, diaIndex, grupo.length, diasPorContrato(contrato.id).length)"
                                        @change="actualizarValorCelda(`${equipo.id}-A-${dia}`, dia, $event.target.value, 'A')"
                                        @keydown="onCellKeydown($event, contrato.id, categoria, rowIndex, diaIndex, 'A', grupo.length, diasPorContrato(contrato.id).length)"
                                        :ref="el => setCellRef(contrato.id, categoria, rowIndex, diaIndex, 'A', el)"
                                        :readonly="rolUsuario === 'visualizador' || !puedeEditar(timestampsCelda[`${equipo.id}-A-${dia}`])"
                                        :title="generarTooltip(`${equipo.id}-A-${dia}`)"
                                      />
                                      <div class="celda-actions" v-if="!modoAcciones && !isVisualizador">
                                        <button class="btn btn-light btn-xs"
                                                title="Agregar/Editar comentario"
                                                @click.stop="abrirComentario(`${equipo.id}`, 'A', dia)">📝</button>
                                      </div>
                                    </td>

                                    <!-- B -->
                                    <td class="position-relative p-1"
                                        @click="modoAcciones && abrirHistorial(equipo.id, 'B', dia)"
                                        @dblclick="modoAcciones && abrirComentario(equipo.id, 'B', dia)">
                                      <span class="cell-letter-visible">
                                        {{ getValorCelda(`${equipo.id}-B-${dia}`) }}
                                      </span>

                                      <input
                                        type="text"
                                        class="form-control form-control-sm text-center cell-input"
                                        :class="[colorCelda(getValorCelda(`${equipo.id}-B-${dia}`)), {'cell-saved': savedBlinkKey === `${equipo.id}-B-${dia}`} ]"
                                        :value="getValorCelda(`${equipo.id}-B-${dia}`)"
                                        placeholder="D/F/M"
                                        maxlength="1"
                                        @input="onCellInput($event, `${equipo.id}-B-${dia}`, dia, 'B', contrato.id, categoria, rowIndex, diaIndex, grupo.length, diasPorContrato(contrato.id).length)"
                                        @change="actualizarValorCelda(`${equipo.id}-B-${dia}`, dia, $event.target.value, 'B')"
                                        @keydown="onCellKeydown($event, contrato.id, categoria, rowIndex, diaIndex, 'B', grupo.length, diasPorContrato(contrato.id).length)"
                                        :ref="el => setCellRef(contrato.id, categoria, rowIndex, diaIndex, 'B', el)"
                                        :readonly="rolUsuario === 'visualizador' || !puedeEditar(timestampsCelda[`${equipo.id}-B-${dia}`])"
                                        :title="generarTooltip(`${equipo.id}-B-${dia}`)"
                                      />
                                      <div class="celda-actions" v-if="!modoAcciones && !isVisualizador">
                                        <button class="btn btn-light btn-xs"
                                                title="Agregar/Editar comentario"
                                                @click.stop="abrirComentario(`${equipo.id}`, 'B', dia)">📝</button>
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
                        <div class="d-flex justify-content-between">
                          <div>
                            <strong>{{ h.estado }}</strong>
                            <div class="small text-muted">
                              {{ h.jornada }} — {{ formatearFechaHora(h.fecha) }}
                            </div>
                            <div class="small">Obs: {{ h.observaciones || '—' }}</div>
                          </div>
                          <div class="text-end">
                            <div class="small">{{ h.nombre_completo || '—' }}</div>
                            <div class="small text-muted">{{ h.registradoPor || '' }}</div>
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

          <!-- Modal Comentario -->
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

          <!-- MODAL: Gestor de Documentos por Equipo -->
          <div class="modal fade show" tabindex="-1" style="display:block;" v-if="docsVisible" @click.self="cerrarGestorDocs">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">
                    Documentos — {{ docMeta.equipoNombre }} ({{ docMeta.equipoPatente || 'sin PPU' }})
                  </h5>
                  <button type="button" class="btn-close" @click="cerrarGestorDocs"></button>
                </div>

                <div class="modal-body">
                  <!-- Barra de acciones -->
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

                  <!-- Listado -->
                  <div v-if="cargandoDocs" class="text-center py-3">
                    <div class="spinner-border text-secondary"></div>
                  </div>

                  <div v-else>
                    <div v-if="docsEquipo.length === 0" class="alert alert-light">
                      Aún no hay documentos para este equipo.
                    </div>

                    <ul v-else class="list-group">
                      <li v-for="d in docsEquipo" :key="d._id" class="list-group-item d-flex justify-content-between align-items-start">
                        <div class="me-3">
                          <div class="fw-semibold">{{ d.nombre }}</div>
                          <div class="small text-muted">
                            {{ d.tipo }} · {{ (d.size/1024).toFixed(1) }} KB · {{ formatearFechaHora(d.timestamp) }}
                          </div>
                        </div>

                        <div class="d-flex gap-2">
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
                            :href="`data:${d.tipo};base64,${d.base64}`"
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

                <!-- VISOR DE IMAGEN DENTRO DEL MISMO MODAL -->
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

        </div> <!-- row -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, defineOptions, nextTick } from 'vue'
import { db } from '../firebase/config'
import {
  collection, getDocs, setDoc, doc, getDoc, addDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp
} from 'firebase/firestore'
import { watch } from 'vue'

import { getAuth, onAuthStateChanged } from 'firebase/auth'
import * as XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'

defineOptions({ name: 'HomeView' })
const descargandoExcel = ref(false)
function esPDF(mime = '', nombre = '') {
  const t = (mime || '').toLowerCase()
  if (t.startsWith('application/pdf')) return true
  const ext = (nombre.split('.').pop() || '').toLowerCase()
  return ext === 'pdf'
}
const pdfViewer = ref({ abierto: false, url: '', nombre: '' })

function abrirPDF(d) {
  // revoca el URL anterior si existía
  if (pdfViewer.value.url) URL.revokeObjectURL(pdfViewer.value.url)
  pdfViewer.value = { abierto: true, url: blobUrl(d), nombre: d.nombre }
}
function cerrarPDF() {
  if (pdfViewer.value.url) URL.revokeObjectURL(pdfViewer.value.url)
  pdfViewer.value = { abierto: false, url: '', nombre: '' }
}

// Crea un Blob URL a partir del base64 (sirve para PDF y otros)
function blobUrl(d) {
  const tipoOk = normalizaMime(d.tipo, d.nombre)
  const bin = atob(d.base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: tipoOk })
  return URL.createObjectURL(blob)
}

/* =======================
   DOCUMENTOS POR EQUIPO
======================= */
const docsVisible = ref(false)
const docsEquipo = ref([])           // [{ _id, nombre, tipo, size, base64, timestamp, usuario }]
const cargandoDocs = ref(false)
const subiendoDocs = ref(false)
const textoProgresoSubida = ref('')
const fileInputRef = ref(null)
const docMeta = ref({
  equipoId: '',
  equipoNombre: '',
  equipoPatente: ''
})

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
  if (subiendoDocs.value) return // evita cerrar mientras sube
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
    docsEquipo.value = snap.docs.map(d => ({
      _id: d.id,
      ...d.data()
    }))
  } catch (e) {
    console.error('Error al cargar documentos:', e)
    docsEquipo.value = []
  } finally {
    cargandoDocs.value = false
  }
}

function dispararFilePicker() {
  fileInputRef.value?.click?.()
}

function leerArchivoComoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // reader.result = "data:<mime>;base64,...." si usáramos readAsDataURL,
      // pero preferimos leer como binario y convertir a base64 puro.
      const base64 = btoa(
        new Uint8Array(reader.result)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      )
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
// --- Helpers (reemplaza los actuales esImagen/dataUrl por estos)
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
  // si viene vacío o genérico, intenta inferir por extensión
  const t = (tipo || '').toLowerCase()
  if (!t || t === 'application/octet-stream') {
    const inferido = mimeFromExt(nombre)
    return inferido || t || 'application/octet-stream'
  }
  return t
}

// Ahora acepta MIME o extensión
function esImagen(mime = '', nombre = '') {
  const t = (mime || '').toLowerCase()
  if (t.startsWith('image/')) return true
  const ext = (nombre.split('.').pop() || '').toLowerCase()
  return ['jpg','jpeg','png','gif','webp','bmp','heic','heif','svg'].includes(ext)
}

// Usa MIME normalizado o el inferido para construir el data URL
function dataUrl(d) {
  const tipoOk = normalizaMime(d.tipo, d.nombre)
  return `data:${tipoOk};base64,${d.base64}`
}


// --- Derivados: solo imágenes del equipo
const imagenesEquipo = computed(() => docsEquipo.value.filter(d => esImagen(d.tipo)))

// --- Estado visor
const preview = ref({
  abierto: false,
  index: 0,
  zoom: 1
})
const imagenActual = computed(() => imagenesEquipo.value[preview.value.index] || null)

// --- Acciones visor
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
function cerrarPreview() {
  preview.value.abierto = false
  preview.value.zoom = 1
}
function nextPreview() {
  if (preview.value.index < imagenesEquipo.value.length - 1) {
    preview.value.index++
    preview.value.zoom = 1
  }
}
function prevPreview() {
  if (preview.value.index > 0) {
    preview.value.index--
    preview.value.zoom = 1
  }
}
function zoomIn()  { preview.value.zoom = Math.min(preview.value.zoom + 0.2, 4) }
function zoomOut() { preview.value.zoom = Math.max(preview.value.zoom - 0.2, 0.25) }
function resetZoom(){ preview.value.zoom = 1 }
function onWheelZoom(e){
  if (e.deltaY > 0) zoomOut(); else zoomIn()
}

// --- Atajos de teclado cuando el visor está abierto
function keyHandler(e){
  if (!preview.value.abierto) return
  if (e.key === 'Escape') { e.preventDefault(); cerrarPreview() }
  if (e.key === 'ArrowRight') { e.preventDefault(); nextPreview() }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); prevPreview() }
  if (e.key === '+') { e.preventDefault(); zoomIn() }
  if (e.key === '-') { e.preventDefault(); zoomOut() }
  if (e.key === '0') { e.preventDefault(); resetZoom() }
}

// Montar/desmontar listener cuando el modal de docs está visible
watch(docsVisible, (v)=>{
  if (v) {
    window.addEventListener('keydown', keyHandler)
  } else {
    window.removeEventListener('keydown', keyHandler)
    cerrarPreview()
  }
})

async function onFilesSelected(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return

  // Info del usuario que sube
  const auth = getAuth()
  const currentUser = auth.currentUser
  let usuario = currentUser?.email || 'desconocido'

  subiendoDocs.value = true
  textoProgresoSubida.value = `Preparando...`

  try {
    const total = files.length
    let idx = 0

    for (const file of files) {
      idx++
      textoProgresoSubida.value = `Cargando ${idx}/${total} (${file.name})...`

      // Seguridad básica: límite razonable de tamaño para Firestore + base64
      // (ej. 400 KB por archivo ~ 530 KB en base64) -> ajusta si lo deseas
      const MAX_BYTES = 400 * 1024
      if (file.size > MAX_BYTES) {
        console.warn(`Archivo omitido por tamaño: ${file.name} (${(file.size/1024).toFixed(0)} KB)`)
        continue
      }

      const base64 = await leerArchivoComoBase64(file)

      const payload = {
        nombre: file.name,
        tipo: file.type || 'application/octet-stream',
        size: file.size,
        base64,
        timestamp: serverTimestamp(),
        usuario
      }

      await addDoc(collection(db, 'equipos', docMeta.value.equipoId, 'documentos'), payload)
    }

    // recargar listado
    await cargarDocsEquipo()
    textoProgresoSubida.value = `Listo`
    // limpiar input
    if (fileInputRef.value) fileInputRef.value.value = ''
  } catch (err) {
    console.error('Error subiendo documentos:', err)
    alert('Ocurrió un error subiendo los documentos. Intenta nuevamente.')
  } finally {
    setTimeout(() => {
      subiendoDocs.value = false
      textoProgresoSubida.value = ''
    }, 400)
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

/* =======================
   PERIODO VISIBLE (reactivo)
======================= */
const mesOffset = ref(0) // 0 = mes actual, -1 = mes pasado

const baseDate = computed(() => {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset.value, 1, 0, 0, 0, 0)
})

const year = computed(() => baseDate.value.getFullYear())
const mes  = computed(() => baseDate.value.getMonth()) // 0..11

const inicioMes = computed(() => new Date(year.value, mes.value, 1, 0, 0, 0, 0))
const finMes    = computed(() => new Date(year.value, mes.value + 1, 1, 0, 0, 0, 0))

const nombreMesCorto = computed(() =>
  baseDate.value.toLocaleString('default', { month: 'short' }).toLowerCase()
)
const nombreMesLargo = computed(() => {
  const s = baseDate.value.toLocaleString('default', { month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
})
const etiquetaPeriodo = computed(() => `${nombreMesLargo.value} ${year.value}`)

const diasEnMes = computed(() => new Date(year.value, mes.value + 1, 0).getDate())

// dd-mesCorto (01-ago)
const diasDelMes = computed(() => {
  return Array.from({ length: diasEnMes.value }, (_, i) => {
    const d = i + 1
    return `${String(d).padStart(2, '0')}-${nombreMesCorto.value}`
  })
})
// Solo días hábiles (lun–vie)
const diasHabilesDelMes = computed(() => {
  const arr = []
  for (let d = 1; d <= diasEnMes.value; d++) {
    const dt = new Date(year.value, mes.value, d)
    const day = dt.getDay() // 0=Dom..6=Sab
    if (day !== 0 && day !== 6) {
      arr.push(`${String(d).padStart(2,'0')}-${nombreMesCorto.value}`)
    }
  }
  return arr
})

/* =======================
   STATE GENERAL
======================= */
const mostrarInstrucciones = ref(true)
const loading = ref(true)
const rolUsuario = ref('')
const estaLogueado = ref(false) 
const contratosUsuario = ref([])
const auth = getAuth() 
const isVisualizador = computed(() => (rolUsuario.value || '').toLowerCase() === 'visualizador')

const modoAcciones = ref(false)
const autoAvance = ref(false)
const tablaClaseModo = computed(() => modoAcciones.value ? 'modo-acciones' : '')

/* Zoom de la tabla D/F/M */
const zoomTabla = ref(false)
function toggleZoomTabla() { zoomTabla.value = !zoomTabla.value }

/* “Mostrar nombre completo” al hover/tap */
const hoverContratoId = ref(null)
const nombreExpandidoId = ref(null)
function toggleNombreExpand(id) {
  nombreExpandidoId.value = (nombreExpandidoId.value === id) ? null : id
}
onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      estaLogueado.value = true
      await obtenerContratosDelUsuario()
    } else {
      estaLogueado.value = false
    }
    loading.value = false
  })
})

/* Carga por contrato (lazy + caché) */
const loadingContrato = ref({})
const loadingConteo = ref({})
const conteoEquipos = ref({})
const equiposByContrato = ref({})
const operByContrato = ref({})
const expandedContrato = ref(null)

/* buffers de celdas */
const inputValues = ref({})
const observacionesCelda = ref({})
const usuariosCelda = ref({})
const timestampsCelda = ref({})
const savedBlinkKey = ref('')

/* ====== Letras y mapeos ====== */
const ALLOWED = ['D','F','M']
const letraToNombre = (l) => ({
  D: 'DISPONIBLE',
  F: 'FUERA DE SERVICIO',
  M: 'MANTENCIÓN',
}[l] || '')

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
function normaliza(txt='') {
  return String(txt).toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/\s+/g,' ').trim()
}
function isWeekdaysOnlyContratoId(contratoId) {
  const c = contratosUsuario.value.find(x => x.id === contratoId)
  if (!c) return false
  const n = normaliza(c.nombre)
  const esUrbSanBern = n.includes('urbano') && n.includes('san bernardo')
  const esUrbOlivar  = n.includes('urbano') && n.includes('olivar')
  const esHormPredo  = (n.includes('hormigon') || n.includes('hormigones')) &&
                       (n.includes('predos') || n.includes('pre dos') || n.includes('predosificados'))
  return esUrbSanBern || esUrbOlivar || esHormPredo
}
function diasPorContrato(contratoId) {
  return isWeekdaysOnlyContratoId(contratoId) ? diasHabilesDelMes.value : diasDelMes.value
}
function diasNumericosPorContrato(contratoId) {
  const base = diasPorContrato(contratoId)
  return base.map(s => s.slice(0,2))
}

/* ====== Entrada/navegación ====== */
function onCellKeydown(e, contratoId, categoria, rowIdx, diaIdx, turno, totalRows, totalDias) {
  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    focusCell(contratoId, categoria, rowIdx, diaIdx, turno)
    return
  }
  const k = e.key
  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(k)) return
  e.preventDefault()

  const perDay = 2
  let col = diaIdx * perDay + (turno === 'A' ? 0 : 1)
  const maxCol = totalDias * perDay - 1
  let r = rowIdx

  if (k === 'ArrowRight' && col < maxCol) col++
  if (k === 'ArrowLeft'  && col > 0)     col--
  if (k === 'ArrowDown'  && r < totalRows - 1) r++
  if (k === 'ArrowUp'    && r > 0)            r--

  const newDia = Math.floor(col / perDay)
  const newTurno = (col % 2 === 0) ? 'A' : 'B'
  focusCell(contratoId, categoria, r, newDia, newTurno)
}

function onCellInput(e, clave, dia, jornada, contratoId, categoria, rowIdx, diaIdx, totalRows, totalDias) {
  let val = (e.target.value || '').toUpperCase().slice(0,1)
  e.target.value = val
  if (!ALLOWED.includes(val)) {
    inputValues.value[clave] = ''
    return
  }
  inputValues.value[clave] = val
  const equipoId = clave.split('-')[0]
  const obsActual = observacionesCelda.value[clave] || ''
  validarYActualizar(equipoId, dia, val, jornada, obsActual)
}

/* =======================
   UTILIDADES
======================= */
const contratosUsuarioValidos = computed(() => contratosUsuario.value.filter(c => c && c.id))

const emojiContrato = (nombreContrato) => {
  const nombre = (nombreContrato || '').toLowerCase()
  if (nombre.includes('urbanos olivar') || nombre.includes('san bernardo')) return '🏙️'
  if (nombre.includes('hormigon') || nombre.includes('hormigón')) return '🧱'
  if (nombre.includes('carpetas')) return '🛣️'
  if (nombre.includes('áridos') || nombre.includes('aridos')) return '⛰️'
  if (nombre.includes('reparación') || nombre.includes('infraestructura')) return '🧰'
  if (nombre.includes('chuquicamata') || nombre.includes('pmchs')) return '🏗️'
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

const puedeEditar = (docTimestamp) => {
  if (!docTimestamp) return true
  const tiempoRegistro = docTimestamp.toDate ? docTimestamp.toDate() : new Date(docTimestamp)
  const ahora = new Date()
  const esHoy =
    tiempoRegistro.getFullYear() === ahora.getFullYear() &&
    tiempoRegistro.getMonth() === ahora.getMonth() &&
    tiempoRegistro.getDate() === ahora.getDate()
  const diferenciaHoras = (ahora.getTime() - tiempoRegistro.getTime()) / (1000 * 60 * 60)
  if (esHoy) return diferenciaHoras <= 4
  return true
}

const getValorCelda = (clave) => inputValues.value[clave] || ''

const generarTooltip = (clave) => {
  const estadoLetra = getValorCelda(clave)
  if (!estadoLetra) return ''
  const mapa = { D:'Disponible', F:'Fuera de servicio', M:'Mantención', T:'Tránsito' }
  const estadoTexto = mapa[estadoLetra] || estadoLetra
  const obs = observacionesCelda.value[clave] || 'Sin observación'
  const usuario = usuariosCelda.value[clave] || 'Desconocido'
  const cuando = formatearFechaHora(timestampsCelda.value[clave])
  return `Estado: ${estadoTexto}\nObs: ${obs}\nUsuario: ${usuario}\nÚlt. edición: ${cuando}`
}

/* =======================
   ALERTA 48H SIN REGISTRO
======================= */
const lastTimestampByContrato = ref({}) // { [contratoId]: Date | null }
const checkingInactividad = ref(false)
/* NUEVO: control de animación/visibilidad */
const showAlert = ref(false)

function isSameLocalDay(a, b = new Date()) {
  if (!a) return false
  const d = a instanceof Date ? a : (a?.toDate ? a.toDate() : new Date(a))
  return d.getFullYear() === b.getFullYear() &&
         d.getMonth()    === b.getMonth() &&
         d.getDate()     === b.getDate()
}

function maxDateSafe(a, b) {
  const da = a ? (a.toDate ? a.toDate() : new Date(a)) : null
  const db = b ? (b.toDate ? b.toDate() : new Date(b)) : null
  if (da && db) return da > db ? da : db
  return da || db || null
}

function humanizeDiff(fecha) {
  if (!fecha) return 'Nunca'
  const ms = Date.now() - fecha.getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `hace ${mins} min`
  const horas = Math.floor(mins / 60)
  if (horas < 48) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`
}

const contratosAtrasados = computed(() => {
  const limiteHoras = 48
  const ahora = new Date()
  return contratosUsuarioValidos.value
    .map(c => {
      const t = lastTimestampByContrato.value[c.id] ?? null
      if (t && isSameLocalDay(t, ahora)) {
        return { ...c, _diffH: 0, _lastText: humanizeDiff(t), _atrasado: false }
      }
      const diffH = t ? (Date.now() - t.getTime()) / 36e5 : Infinity
      return { ...c, _diffH: diffH, _lastText: humanizeDiff(t), _atrasado: diffH >= limiteHoras }
    })
    .filter(c => c._atrasado)
})

const contratosNuncaRegistrados = computed(() =>
  contratosUsuarioValidos.value.filter(c => lastTimestampByContrato.value[c.id] === null)
)

async function fetchUltimoRegistroContrato(contratoId) {
  try {
    const q1 = query(
      collection(db, 'operatividad'),
      where('contratoId', '==', contratoId),
      orderBy('fecha', 'desc'),
      limit(50)
    )
    const snap = await getDocs(q1)
    if (!snap.empty) {
      let ultimo = null
      snap.forEach(docSnap => {
        const d = docSnap.data()
        const best = maxDateSafe(d?.timestamp, d?.fecha)
        if (best && (!ultimo || best > ultimo)) ultimo = best
      })
      if (ultimo) return ultimo
    }
  } catch (err) {
    // fallback sin orderBy(fecha)
  }

  try {
    const q2 = query(
      collection(db, 'operatividad'),
      where('contratoId', '==', contratoId),
      limit(100)
    )
    const snap2 = await getDocs(q2)
    if (!snap2.empty) {
      let ultimo = null
      snap2.forEach(docSnap => {
        const d = docSnap.data()
        const best = maxDateSafe(d?.timestamp, d?.fecha)
        if (best && (!ultimo || best > ultimo)) ultimo = best
      })
      if (ultimo) return ultimo
    }
  } catch (err2) {
    // nada
  }
  return null
}

async function revisarInactividadContratos() {
  if (!contratosUsuarioValidos.value.length) return
  checkingInactividad.value = true
  try {
    const resultados = {}
    await Promise.all(
      contratosUsuarioValidos.value.map(async (c) => {
        resultados[c.id] = await fetchUltimoRegistroContrato(c.id)
      })
    )
    lastTimestampByContrato.value = resultados
  } finally {
    checkingInactividad.value = false
  }
}

/* NUEVO: refresco con animación (oculta, recalcula y vuelve a mostrar) */
async function refrescarAlertaAnimada() {
  showAlert.value = false
  await revisarInactividadContratos()
  await nextTick()
  if (contratosAtrasados.value.length > 0) {
    setTimeout(() => { showAlert.value = true }, 80)
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

/* =======================
   AUTH + CONTRATOS (INICIAL)
======================= */
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
    results.push(...snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  contratosUsuario.value = results

  for (const c of contratosUsuario.value) cargarConteoEquipos(c.id)

  // Cálculo "en segundo plano" y luego mostramos con animación
  await revisarInactividadContratos()
  await nextTick()
  if (contratosAtrasados.value.length > 0) {
    setTimeout(() => { showAlert.value = true }, 120)
  }
}

/* =======================
   CONTEO RÁPIDO DE EQUIPOS
======================= */
async function cargarConteoEquipos(contratoId) {
  loadingConteo.value[contratoId] = true
  try {
    const qeq = query(collection(db, 'equipos'), where('contratoId', '==', contratoId), limit(1))
    const snap = await getDocs(qeq)
    conteoEquipos.value[contratoId] = snap.empty ? 0 : undefined
  } finally {
    loadingConteo.value[contratoId] = false
  }
}

/* =======================
   CARGA LAZY POR CONTRATO
======================= */
async function cargarContratoDetalle(contratoId, { force = false } = {}) {
  if (!force && equiposByContrato.value[contratoId] && operByContrato.value[contratoId]) return
  loadingContrato.value[contratoId] = true
  try {
    // 1) Equipos
    let equipos = []
    try {
      const qeOrdered = query(
        collection(db, 'equipos'),
        where('contratoId', '==', contratoId),
        orderBy('nombre_equipo')
      )
      const se = await getDocs(qeOrdered)
      equipos = se.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (err) {
      const qe = query(collection(db, 'equipos'), where('contratoId', '==', contratoId))
      const se = await getDocs(qe)
      equipos = se.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) =>
          String(a.nombre_equipo || '').localeCompare(
            String(b.nombre_equipo || ''),
            'es',
            { sensitivity: 'base' }
          )
        )
    }
    equiposByContrato.value[contratoId] = equipos
    conteoEquipos.value[contratoId] = equipos.length

    // 2) Operatividad del PERÍODO VISIBLE
    const qo = query(
      collection(db, 'operatividad'),
      where('contratoId', '==', contratoId),
      where('fecha', '>=', inicioMes.value),
      where('fecha', '<',  finMes.value)
    )
    const so = await getDocs(qo)
    operByContrato.value[contratoId] = so.docs.map(d => ({ id: d.id, ...d.data() }))

    // 3) Buffers
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

/* =======================
   UI: EXPAND / COLLAPSE
======================= */
async function toggleExpand(id) {
  if (expandedContrato.value === id) {
    expandedContrato.value = null
    return
  }
  expandedContrato.value = id
  await cargarContratoDetalle(id)
}

/* =======================
   CAMBIO DE MES
======================= */
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

/* =======================
   HISTORIAL FOCALIZADO
======================= */
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
      orderBy('fecha')
    )
    const sh = await getDocs(qh)
    historialItems.value = sh.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
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
        const da = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha)
        const dbb = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha)
        return da - dbb
      })
  } finally {
    cargandoHistorial.value = false
  }
}

/* =======================
   COMENTARIO DIFERIDO
======================= */
const comentarioVisible = ref(false)
const comentarioTexto = ref('')
const comentarioMeta = ref({ equipoId: '', jornada: '', dia: '' })

function abrirComentario(equipoId, jornada, dia) {
  if (isVisualizador.value) {
    alert('Tu rol no permite agregar comentarios.')
    return
  }
  comentarioMeta.value = { equipoId, jornada, dia }
  comentarioTexto.value = observacionesCelda.value[`${equipoId}-${jornada}-${dia}`] || ''
  comentarioVisible.value = true
}

async function guardarComentario() {
  const { equipoId, jornada, dia } = comentarioMeta.value
  const clave = `${equipoId}-${jornada}-${dia}`
  const letra = getValorCelda(clave)
  if (!letra) {
    alert('Primero ingresa D/F/M en la celda antes de comentar.')
    return
  }
  await actualizarSoloComentario(equipoId, dia, letra, jornada, comentarioTexto.value)
  comentarioVisible.value = false
}

async function actualizarSoloComentario(equipoId, dia, letra, jornada, observaciones) {
  const estado = letraToNombre(letra)
  if (!estado) return

  const dd = parseInt(dia.slice(0, 2))
  const fecha = new Date(year.value, mes.value, dd)
  const clave = `${equipoId}-${jornada}-${dia}`

  const auth = getAuth()
  const currentUser = auth.currentUser
  let nombre_completo = ''
  let registradoPor = ''
  if (currentUser) {
    registradoPor = currentUser.email || ''
    const userDocRef = doc(db, 'usuarios', currentUser.uid)
    const userSnap = await getDoc(userDocRef)
    if (userSnap.exists()) nombre_completo = userSnap.data().nombre_completo || ''
  }

  const docId = `${equipoId}_${jornada}_${dia}`
  const contratoId = buscarContratoIdPorEquipo(equipoId) || ''

  await setDoc(doc(db, 'historial_operatividad', `${docId}_${Date.now()}`), {
    equipoId, contratoId, estado, fecha, jornada,
    nombre_completo, observaciones, registradoPor,
    accion: 'comentario', timestamp: new Date()
  })

  await setDoc(doc(db, 'operatividad', docId), {
    equipoId, contratoId, estado, fecha, jornada,
    nombre_completo, observaciones, registradoPor,
    timestamp: new Date()
  })

  observacionesCelda.value[clave] = observaciones || ''
  timestampsCelda.value[clave] = new Date()
  savedBlinkKey.value = clave
  setTimeout(() => { if (savedBlinkKey.value === clave) savedBlinkKey.value = '' }, 350)
}

/* =======================
   ACTUALIZAR / ELIMINAR CELDA
======================= */
async function eliminarRegistroOperatividad(clave, dia, jornada) {
  const equipoId = clave.split('-')[0]
  const docId = `${equipoId}_${jornada}_${dia}`

  const auth = getAuth()
  const currentUser = auth.currentUser
  let nombre_completo = ''
  let registradoPor = ''
  if (currentUser) {
    registradoPor = currentUser.email || ''
    const userDocRef = doc(db, 'usuarios', currentUser.uid)
    const userSnap = await getDoc(userDocRef)
    if (userSnap.exists()) nombre_completo = userSnap.data().nombre_completo || ''
  }

  const dd = parseInt(dia.slice(0, 2))
  const fecha = new Date(year.value, mes.value, dd)
  const contratoId = buscarContratoIdPorEquipo(equipoId) || ''

  await deleteDoc(doc(db, 'operatividad', docId))
  timestampsCelda.value[clave] = null
  observacionesCelda.value[clave] = ''

  await setDoc(doc(db, 'historial_operatividad', `${docId}_${Date.now()}`), {
    equipoId, contratoId, estado: 'ELIMINADO', fecha, jornada,
    nombre_completo, observaciones: '', registradoPor,
    accion: 'eliminacion', timestamp: new Date()
  })
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

async function validarYActualizar(equipoId, dia, valor, jornada, observaciones = '') {
  const estado = letraToNombre(valor)
  if (!estado) return

  const dd = parseInt(dia.slice(0, 2))
  const fecha = new Date(year.value, mes.value, dd)
  const clave = `${equipoId}-${jornada}-${dia}`
  inputValues.value[clave] = valor

  const auth = getAuth()
  const currentUser = auth.currentUser
  let nombre_completo = ''
  let registradoPor = ''
  if (currentUser) {
    registradoPor = currentUser.email || ''
    const userDocRef = doc(db, 'usuarios', currentUser.uid)
    const userSnap = await getDoc(userDocRef)
    if (userSnap.exists()) nombre_completo = userSnap.data().nombre_completo || ''
  }

  const docId = `${equipoId}_${jornada}_${dia}`
  const contratoId = buscarContratoIdPorEquipo(equipoId) || ''

  await setDoc(doc(db, 'historial_operatividad', `${docId}_${Date.now()}`), {
    equipoId, contratoId, estado, fecha, jornada,
    nombre_completo, observaciones, registradoPor,
    accion: 'actualizacion', timestamp: new Date()
  })

  await setDoc(doc(db, 'operatividad', docId), {
    equipoId, contratoId, estado, fecha, jornada,
    nombre_completo, observaciones, registradoPor,
    timestamp: new Date()
  })

  timestampsCelda.value[clave] = new Date()
  savedBlinkKey.value = clave
  setTimeout(() => { if (savedBlinkKey.value === clave) savedBlinkKey.value = '' }, 350)
}

async function actualizarValorCelda(clave, dia, valor, jornada) {
  const upper = (valor || '').toUpperCase()
  const yaTieneValor = getValorCelda(clave) !== ''
  const puedeModificar = puedeEditar(timestampsCelda.value[clave])

  if (yaTieneValor && !puedeModificar) {
    alert('Este turno ya no se puede editar. Solo disponible dentro de las 4 horas del día de registro.')
    return
  }
  if (rolUsuario.value === 'visualizador') {
    alert('No tienes permisos para editar.')
    return
  }

  if (upper === '') {
    inputValues.value[clave] = ''
    await eliminarRegistroOperatividad(clave, dia, jornada)
    return
  }
  if (!ALLOWED.includes(upper)) return

  const obsActual = observacionesCelda.value[clave] || ''
  inputValues.value[clave] = upper
  await validarYActualizar(clave.split('-')[0], dia, upper, jornada, obsActual)
}

/* =======================
   AGRUPACIÓN
======================= */
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

/* =======================
   EXCEL
======================= */
async function descargarExcelContrato(contrato) {
  descargandoExcel.value = true
  try {
    // Asegura datos cargados
    if (!equiposByContrato.value[contrato.id]) await cargarContratoDetalle(contrato.id)

    const equiposContrato = equiposByContrato.value[contrato.id] || []
    const oper = operByContrato.value[contrato.id] || []

    // Map rápido: "equipoId-<diaNum>-<A|B>" => "D/F/M"
    const operMap = {}
    for (const o of oper) {
      const fecha = o.fecha?.toDate ? o.fecha.toDate() : new Date(o.fecha)
      const dia   = String(fecha.getDate()).padStart(2, '0')
      const clave = `${o.equipoId}-${dia}-${o.jornada}`
      operMap[clave] = (nombreToLetra(o.estado) || '').toUpperCase()
    }

    const dias   = diasNumericosPorContrato(contrato.id) // ["01","02",...]
    const perDay = 2

    // Agrupar equipos por categoría
    const categorias = {}
    for (const eq of equiposContrato) {
      const cat = eq.categoria || 'SIN CATEGORÍA'
      if (!categorias[cat]) categorias[cat] = []
      categorias[cat].push(eq)
    }

    // Workbook
    const wb = XLSX.utils.book_new()
    wb.Workbook = wb.Workbook || {}
    wb.Workbook.CalcPr = { fullCalcOnLoad: true }

    // Cabecera y títulos
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

    // Cuerpo por categoría
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

    // Sheet
    const ws = XLSX.utils.aoa_to_sheet(data)
    const totalCols = 3 + (dias.length * perDay) + 3

    // Merges: título y días (A/B)
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } })
    const mergesDias = dias.map((_, i) => ({
      s: { r: 1, c: 3 + i * perDay },
      e: { r: 1, c: 3 + i * perDay + (perDay - 1) }
    }))
    ws['!merges'] = [...merges, ...mergesDias]

    // Estilos
    const BORDER_THIN = { style: 'thin', color: { rgb: 'FF999999' } }
    const allBorders  = { top: BORDER_THIN, right: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN }

    const titleStyle = {
      font: { bold: true, sz: 16, color: { rgb: 'FFFFFFFF' } },
      fill: { fgColor: { rgb: 'FF3B3F5C' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: allBorders
    }
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFFFF' } },
      fill: { fgColor: { rgb: 'FF1F4E78' } },
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
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

    const styleD = { font: { bold: true, color: { rgb: 'FF0E6027' } }, fill: { fgColor: { rgb: 'FFC6EFCE' } }, alignment: { vertical: 'center', horizontal: 'center' }, border: allBorders }
    const styleF = { font: { bold: true, color: { rgb: 'FF9C0006' } }, fill: { fgColor: { rgb: 'FFFFC7CE' } }, alignment: { vertical: 'center', horizontal: 'center' }, border: allBorders }
    const styleM = { font: { bold: true, color: { rgb: 'FF7F6000' } }, fill: { fgColor: { rgb: 'FFFFEB9C' } }, alignment: { vertical: 'center', horizontal: 'center' }, border: allBorders }

    const range = XLSX.utils.decode_range(ws['!ref'])
    const colsCount = range.e.c - range.s.c + 1

    // Aplicar estilos cabeceras
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

    // Estilo filas (categoría vs normales)
    for (let r = 3; r <= range.e.r; r++) {
      const c0 = XLSX.utils.encode_cell({ r, c: 0 })
      const isCategoriaRow = ws[c0] && ws[c0].v && (ws[c0].v !== '')
      for (let c = 0; c < colsCount; c++) {
        const ref = XLSX.utils.encode_cell({ r, c })
        ws[ref] = ws[ref] || {}
        ws[ref].s = isCategoriaRow ? categoriaStyle : (c <= 2 ? bodyLeftStyle : bodyStyle)
      }
    }

    // Pintar celdas D/F/M
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

    // Totales D/F y %
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

    // Anchos y autofiltro
    ws['!cols'] = [
      { wch: 22 }, { wch: 18 }, { wch: 14 },
      ...Array.from({ length: dias.length * perDay }, () => ({ wch: 4 })),
      { wch: 14 }, { wch: 12 }, { wch: 10 }
    ]
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: range.e.r, c: 2 } })
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Operatividad')

    // Guardar
    const nombreArchivo = `operatividad_${contrato.nombre.replace(/\s+/g,'_')}_${String(mes.value+1).padStart(2,'0')}-${year.value}.xlsx`
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob   = new Blob([buffer], { type: 'application/octet-stream' })
    saveAs(blob, nombreArchivo)
  } catch (e) {
    console.error('Error al generar Excel:', e)
  } finally {
    // breve pausa para que se vea el overlay
    setTimeout(() => { descargandoExcel.value = false }, 300)
  }
}


/* =======================
   MONTAJE
======================= */
onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await obtenerContratosDelUsuario()
    }
    loading.value = false
  })
})
</script>

<style scoped>
.pdf-overlay{
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  z-index: 2100; display: flex; flex-direction: column;
}
.pdf-toolbar{
  display: flex; align-items: center; gap: 8px;
  background: rgba(0,0,0,.65); color: #fff; padding: 8px 10px;
}
.pdf-stage{ flex: 1; background: #222; }
.pdf-stage iframe{ width: 100%; height: 100%; background: #fff; }

/* Nueva columna sticky para DOCS */
.col-docs { width: 56px; min-width: 56px; text-align: center; }

.sticky-col-3 {
  position: sticky;
  background: #fff;
  z-index: 3;
  left: calc(160px + 140px); /* = left col-interno (160) + left col-ppu (140) */
  box-shadow: 2px 0 0 rgba(0,0,0,0.06);
}

/* Asegura que los TH sticky queden por encima del body */
.table thead th.sticky-col-3 { z-index: 4; }

/* Responsivo: ajusta offsets según los @media existentes */
@media (max-width: 992px){
  .col-interno { width: 120px; min-width: 120px; }
  .col-ppu     { width: 100px; min-width: 100px; }
  .sticky-col-2 { left: 120px; }
  .sticky-col-3 { left: calc(120px + 100px); }
}

@media (max-width: 576px){
  .col-interno { width: 100px; min-width: 100px; }
  .col-ppu     { width: 88px;  min-width: 88px;  }
  .sticky-col-2 { left: 100px; }
  .sticky-col-3 { left: calc(100px + 88px); }
}

/* Modal ajuste leve para mejor lectura */
.modal .list-group-item .btn { padding: .25rem .5rem; }

/* ======== Cabecera responsiva por contrato ======== */
.contrato-row{
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px 16px;
  align-items: center;
}
.contrato-row__title{
  min-width: 0;
  display: flex;
  align-items: center;
}
.contrato-row__title .emoji{
  font-size: 1.9rem;
  line-height: 1;
}
/* Truncar y expandir nombre de contrato en hover o tap */
.contrato-row__title .card-title{
  margin: 0;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all .2s ease;
}
.contrato-row__title .card-title.nombre-expandido{
  white-space: normal;
  overflow: visible;
  text-overflow: initial;
}

.contrato-row__actions{
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  gap: 8px 12px;
  align-items: center;
}

.switches{
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions-toolbar{
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 1200px){
  .contrato-row{
    grid-template-columns: 1fr;
  }
  .contrato-row__actions{
    grid-auto-flow: row;
    grid-auto-rows: max-content;
  }
}

@media (max-width: 768px){
  .switches{ gap: 4px; }
  .actions-toolbar{
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
  .actions-toolbar > *{ flex: 0 0 auto; }
  .btn{ padding: .42rem .6rem; }
}

/* ===== Ajustes de tabla en pantallas pequeñas ===== */
@media (max-width: 992px){
  .col-interno { width: 120px; min-width: 120px; }
  .col-ppu     { width: 100px; min-width: 100px; }
  .cell-input{ font-size: .95rem; min-height: 28px; }
  /* Compensar sticky del 2do col al ancho real de la 1ra */
  .sticky-col-2 { left: 120px; }
}
@media (max-width: 576px){
  .col-interno { width: 100px; min-width: 100px; }
  .col-ppu     { width: 88px;  min-width: 88px; }
  .th-turno{ font-size: .72rem; }
  .sticky-col-2 { left: 100px; }
}

/* ===== Columnas fijas (sticky) ===== */
.col-interno,
.col-ppu {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-interno { width: 160px; min-width: 160px; }
.col-ppu     { width: 140px; min-width: 140px; }

.sticky-col,
.sticky-col-2 {
  position: sticky;
  background: #fff;
  z-index: 3;
}
.sticky-col   { left: 0;     box-shadow: 2px 0 0 rgba(0,0,0,0.06); }
.sticky-col-2 { left: 160px; box-shadow: 2px 0 0 rgba(0,0,0,0.06); }

/* Cabeceras por encima del body */
.table thead th.sticky-col,
.table thead th.sticky-col-2 { z-index: 4; }

/* Tarjeta/tabla */
.card { border-radius: 16px; background-color: #fff; border: 1px solid #dee2e6; }
.table td, .table th { vertical-align: middle; padding: 0.25rem; }
.th-turno { font-size: 0.8rem; line-height: 1; }

/* =========================================================
   LETRAS SIEMPRE VISIBLES
   ========================================================= */
.cell-letter-visible{
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
.accesos-rapidos{
  display:flex;
  gap:.5rem;
  justify-content:flex-start; /* izquierda */
}

/* Input */
.cell-input{
  min-height: 30px;
  font-weight: 900;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: .5px;
  text-align: center;
  line-height: 1.1;
  padding-right: 30px;
  z-index: 1;
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  caret-color: #111;
  background-clip: padding-box;
}
.cell-input:focus{
  color: #111 !important;
  -webkit-text-fill-color: #111 !important;
}

/* Colores */
.bg-success.text-white { color: #fff !important; }
.bg-danger.text-white  { color: #fff !important; }
.bg-warning.text-dark  { color: #000 !important; }
.bg-info.text-dark     { color: #000 !important; }

/* Botones flotantes */
.celda-actions{
  position: absolute;
  bottom: 2px;
  right: 45px;
  display: none;
  gap: 2px;
  z-index: 5;
}
td.position-relative:hover .celda-actions{ display: inline-flex; }
td.position-relative .btn-xs{
  padding: 2px 6px; font-size: 0.7rem; line-height: 1;
  box-shadow: 0 0 0 1px rgba(0,0,0,.05);
}

/* Modo acciones */
.modo-acciones td.position-relative:hover .celda-actions{ display: none !important; }
.modo-acciones td.position-relative{ cursor: pointer; }

/* Scrolleo */
.scroll-horizontal { overflow-x: auto; scrollbar-width: thin; scrollbar-color: #aaa transparent; }
.scroll-horizontal::-webkit-scrollbar { height: 8px; }
.scroll-horizontal::-webkit-scrollbar-thumb { background: #aaa; border-radius: 4px; }
.scroll-horizontal::-webkit-scrollbar-thumb:hover { background: #666; }

.scroll-equipos { max-height: 600px; overflow-y: auto; margin-bottom: 1rem; padding-right: 8px; scrollbar-width: thin; scrollbar-color: #bbb transparent; }
.scroll-equipos::-webkit-scrollbar { width: 8px; }
.scroll-equipos::-webkit-scrollbar-thumb { background: #bbb; border-radius: 4px; }
.scroll-equipos::-webkit-scrollbar-thumb:hover { background: #999; }

/* ===== Alerta estilos ===== */
.alert-danger.shadow-sm h5 { font-weight: 700; }
.alert-danger .badge.text-bg-light { border-color: #e9ecef; }

/* =======================
   Animación de la alerta
   ======================= */
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
  transform: translateY(0) scale(1);
}
.alert-pop-leave-active {
  transition: all .22s ease;
}
.alert-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(.98);
}

/* =======================
   Zoom de tabla (compacto)
   ======================= */
.tabla-zoom-out td,
.tabla-zoom-out th {
  font-size: 0.52rem;
  padding: 0.15rem;
}
.tabla-zoom-out .cell-input {
  font-size: 0.55rem !important;
  min-height: 22px !important;
}

/* Ajuste de sticky cuando hay zoom-out en móviles */
@media (max-width: 576px){
  .tabla-zoom-out .col-interno { width: 60px !important; min-width: 60px !important; }
  .tabla-zoom-out .col-ppu     { width: 60px !important; min-width: 60px !important; }
  .tabla-zoom-out .sticky-col-2 { left: 60px !important; }
}
/* Overlay de carga Excel */
.excel-overlay{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  display: grid;
  place-items: center;     /* centra en ambos ejes */
  z-index: 2000;           /* más alto por si hay modales */
  backdrop-filter: blur(1px);
}
.excel-box{
  background: rgba(0,0,0,.25);
  padding: 22px 28px;
  border-radius: 14px;
  box-shadow: 0 6px 24px rgba(0,0,0,.25);
  display: flex;           /* centra contenido interno */
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 260px;
  min-height: 160px;
}



/* Fade del overlay */
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }

</style>

<script>
export default {
  name: 'HomeView'
}
</script>
