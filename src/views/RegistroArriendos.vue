<template>
  <div class="arriendos-page">
    <div class="container py-4 py-lg-5">
      <!-- ===== Header / Hero ===== -->
      <div class="hero card border-0 shadow-sm overflow-hidden mb-4">
        <div class="hero-bg"></div>

        <div class="card-body position-relative p-4 p-lg-5">
          <div class="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3">
            <div class="minw-0">
              <div class="d-flex flex-wrap align-items-center gap-2 mb-2">

                <span v-if="form.contratoId" class="badge contract-badge">
                  <i class="bi bi-briefcase me-1"></i> {{ contratoNombre || "Contrato" }}
                </span>

                <span v-if="isVisualizador" class="badge mode-badge">
                  <i class="bi bi-eye me-1"></i> Modo visualizador
                </span>
              </div>

              <h1 class="h3 fw-black mb-1">Arriendos de Equipos</h1>
              <p class="text-muted mb-0">
                Crea solicitudes y gestiona estatus, archivos y trazabilidad por contrato.
              </p>

              <div class="stats mt-3">
                <div class="stat">
                  <div class="num">{{ arriendos.length }}</div>
                  <div class="label">Totales</div>
                </div>
                <div class="stat">
                  <div class="num">{{ arriendosFiltrados.length }}</div>
                  <div class="label">Mostrando</div>
                </div>
                <div class="stat" v-if="form.contratoId">
                  <div class="num">
                    <i class="bi bi-check2-circle"></i>
                  </div>
                  <div class="label">Contrato activo</div>
                </div>
              </div>
            </div>

            <div class="d-flex gap-2 flex-wrap justify-content-lg-end">
              <router-link to="/menu" class="btn btn-outline-secondary btn-pill">
                <i class="bi bi-arrow-left"></i>
                <span class="ms-1">Volver al menú</span>
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Content ===== -->
      <div class="row g-4">
        <!-- ===== Formulario ===== -->
        <div class="col-12 col-lg-5">
          <div class="card border-0 shadow-sm form-card">
            <div class="card-header form-header d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center gap-2">
                <span class="header-icon">
                  <i class="bi bi-file-earmark-plus"></i>
                </span>
                <strong>Solicitud de arriendo</strong>
              </div>

              <span v-if="isVisualizador" class="badge text-bg-warning">
                <i class="bi bi-eye me-1"></i> Visualizador
              </span>
            </div>

            <div class="card-body p-4 position-relative">
              <!-- Overlay visualizador -->
              <div v-if="isVisualizador" class="readonly-overlay">
                <div class="readonly-card">
                  <i class="bi bi-lock-fill me-2"></i>
                  Solo lectura (visualizador)
                </div>
              </div>

              <!-- Contrato -->
              <div class="mb-3">
                <label class="form-label fw-semibold">Contrato</label>
                <select
                  class="form-select"
                  v-model="form.contratoId"
                  @change="onChangeContrato"
                  :disabled="cargando.contratos"
                >
                  <option value="" disabled>Seleccione contrato…</option>
                  <option v-for="c in contratosUsuario" :key="c.id" :value="c.id">
                    {{ c.nombre }}
                  </option>
                </select>
                <div v-if="cargando.contratos" class="form-text">Cargando contratos…</div>
              </div>

              <!-- Equipo -->
              <div class="row">
                <div class="col-12 col-md-6 mb-3">
                  <label class="form-label fw-semibold">Patente</label>
                  <div class="input-group">
                    <span class="input-group-text"><i class="bi bi-upc-scan"></i></span>
                    <input
                      type="text"
                      class="form-control"
                      v-model="form.patente"
                      placeholder="Ej: XXYY-12"
                      :disabled="isVisualizador"
                      @blur="form.patente = (form.patente || '').toUpperCase().trim()"
                    />
                  </div>
                </div>
                <div class="col-12 col-md-6 mb-3">
                  <label class="form-label fw-semibold">Nº interno</label>
                  <div class="input-group">
                    <span class="input-group-text"><i class="bi bi-hash"></i></span>
                    <input
                      type="text"
                      class="form-control"
                      v-model="form.interno"
                      placeholder="Ej: EQ-123"
                      :disabled="isVisualizador"
                      @blur="form.interno = (form.interno || '').toUpperCase().trim()"
                    />
                  </div>
                </div>
              </div>

              <div class="hint mb-3">
                <i class="bi bi-info-circle me-1"></i>
                Puedes completar <strong>Patente</strong>, <strong>Nº interno</strong> o ambos.
              </div>

              <!-- Fecha/Hora -->
              <div class="row">
                <div class="col-12 col-sm-6 mb-3">
                  <label class="form-label fw-semibold">Fecha</label>
                  <input type="date" class="form-control" v-model="form.fechaStr" :disabled="isVisualizador" />
                </div>
                <div class="col-12 col-sm-6 mb-3">
                  <label class="form-label fw-semibold">Hora</label>
                  <input type="time" class="form-control" v-model="form.horaStr" :disabled="isVisualizador" />
                </div>
              </div>

              <!-- Motivo -->
              <div class="mb-3">
                <label class="form-label fw-semibold">Motivo del arriendo</label>
                <textarea
                  class="form-control"
                  rows="3"
                  v-model="form.motivo"
                  :disabled="isVisualizador"
                  placeholder="Describe brevemente el motivo…"
                ></textarea>
              </div>

              <div class="d-grid gap-2">
                <button
                  class="btn btn-danger btn-pill"
                  @click="guardar"
                  :disabled="isVisualizador || !puedeGuardar || guardando"
                >
                  <i class="bi bi-save"></i><span class="ms-1">Guardar arriendo</span>
                </button>
                <button class="btn btn-outline-secondary btn-pill" @click="limpiar" :disabled="isVisualizador || guardando">
                  <i class="bi bi-eraser me-1"></i> Limpiar
                </button>
              </div>

              <div v-if="errorMsg" class="alert alert-warning mt-3 mb-0">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMsg }}
              </div>
            </div>
          </div>
        </div>

        <!-- ===== Listado ===== -->
        <div class="col-12 col-lg-7">
          <div class="card border-0 shadow-sm">
            <div class="card-header list-header bg-white d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div class="d-flex flex-wrap align-items-center gap-2">
                <strong class="d-flex align-items-center gap-2">
                  <span class="header-icon soft">
                    <i class="bi bi-table"></i>
                  </span>
                  Arriendos
                </strong>

                <span v-if="form.contratoId" class="badge text-bg-danger">
                  <i class="bi bi-briefcase me-1"></i> {{ contratoNombre }}
                </span>
              </div>

              <div class="input-group input-group-sm buscador-grupo flex-nowrap w-100 w-sm-auto">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input
                  type="text"
                  class="form-control"
                  placeholder="Buscar por motivo, patente o Nº interno…"
                  v-model="busqueda"
                  :disabled="!form.contratoId"
                />
                <button class="btn btn-outline-secondary" type="button" @click="busqueda = ''" :disabled="!busqueda">
                  <i class="bi bi-x-lg"></i>
                </button>

                <button
                  class="btn btn-outline-primary d-flex align-items-center"
                  :disabled="cargando.arriendos || !form.contratoId || refrescando"
                  @click="refrescarArriendos"
                  title="Volver a cargar la lista"
                >
                  <i class="bi" :class="refrescando ? 'bi-arrow-repeat spin' : 'bi-arrow-clockwise'"></i>
                  <span class="ms-1 d-none d-sm-inline">Actualizar</span>
                </button>
              </div>
            </div>

            <div class="card-body p-0">
              <div v-if="!form.contratoId" class="p-4 empty">
                <div class="empty-icon mb-2"><i class="bi bi-briefcase"></i></div>
                <div class="fw-bold mb-1">Selecciona un contrato</div>
                <div class="text-muted">Para ver y gestionar arriendos, primero elige un contrato en el formulario.</div>
              </div>

              <div v-else>
                <div v-if="cargando.arriendos" class="p-4">
                  <div class="d-flex align-items-center gap-2 text-muted">
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Cargando arriendos…
                  </div>
                </div>

                <div v-else-if="arriendosFiltrados.length === 0" class="p-4 empty">
                  <div class="empty-icon mb-2"><i class="bi bi-inbox"></i></div>
                  <div class="fw-bold mb-1">Sin registros</div>
                  <div class="text-muted">No hay arriendos para este contrato (o tu búsqueda no encontró resultados).</div>
                </div>

                <div v-else class="table-responsive">
                  <table class="table table-sm table-hover align-middle mb-0 table-pro">
                    <thead class="table-light sticky-head">
                      <tr>
                        <th style="min-width: 150px;">Fecha/Hora</th>
                        <th>Equipo</th>
                        <th class="d-none d-md-table-cell">Motivo</th>
                        <th>Estatus</th>
                        <th class="text-center">Archivos</th>
                        <th class="d-none d-md-table-cell" style="min-width: 140px;">Usuario</th>
                        <th style="min-width: 170px;" class="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="a in arriendosFiltrados"
                        :key="a.id"
                        :class="{'row-inactivo': a.activo === false}"
                      >
                        <td>
                          <div class="fw-semibold">{{ formatearFechaHora(a.fecha) }}</div>
                          <small class="text-muted">Creado: {{ formatearFechaHora(a.createdAt) }}</small>
                        </td>

                        <td>
                          <div class="fw-semibold text-wrap">
                            <span v-if="a.equipoPatente">{{ a.equipoPatente }}</span>
                            <span v-if="a.equipoPatente && a.equipoInterno"> — </span>
                            <span v-if="a.equipoInterno">{{ a.equipoInterno }}</span>
                            <span v-if="!a.equipoPatente && !a.equipoInterno">—</span>
                          </div>
                          <small class="text-muted d-block" v-if="a.equipoNombre">{{ a.equipoNombre }}</small>
                        </td>

                        <td class="d-none d-md-table-cell">
                          <div class="text-wrap clamp-2">{{ a.motivo || '—' }}</div>
                        </td>

                        <td>
                          <span class="badge" :class="badgeClass(a.estatus)">
                            {{ a.estatus || 'Solicitado' }}
                          </span>
                          <div class="small text-muted" v-if="a.updatedBy">por {{ a.updatedBy }}</div>
                        </td>

                        <td class="text-center">
                          <button class="btn btn-link btn-sm text-decoration-none" @click="abrirArchivos(a)">
                            <i class="bi bi-paperclip me-1"></i> {{ a.contArchivos ?? 0 }}
                          </button>
                        </td>

                        <td class="d-none d-md-table-cell">
                          <div class="small">{{ a.nombreUsuario || '—' }}</div>
                          <small class="text-muted">{{ a.emailUsuario || '' }}</small>
                        </td>

                        <!-- Acciones -->
                        <td class="text-end">
                          <!-- Desktop -->
                          <div class="btn-group btn-group-sm flex-wrap justify-content-end gap-1 d-none d-md-inline-flex">
                            <button
                              class="btn btn-outline-dark"
                              :disabled="isVisualizador || !isAdmin || a.activo===false || a.estatus==='Finalizado'"
                              @click="abrirSubida(a, 'cotizacion')"
                              title="Subir cotización"
                            >
                              <i class="bi bi-file-earmark-plus"></i>
                            </button>
                            <button
                              class="btn btn-outline-primary"
                              :disabled="isVisualizador || !isAdmin || a.activo===false || a.estatus==='Finalizado'"
                              @click="abrirSubida(a, 'pago')"
                              title="Subir estado de pago"
                            >
                              <i class="bi bi-receipt"></i>
                            </button>
                            <button
                              class="btn btn-outline-success"
                              :disabled="isVisualizador || !isAdmin || a.activo===false || a.estatus==='Finalizado'"
                              @click="abrirCambioEstatus(a)"
                              title="Cambiar estatus"
                            >
                              <i class="bi bi-arrow-repeat"></i>
                            </button>
                            <button
                              class="btn btn-outline-secondary"
                              :disabled="isVisualizador || !canEditOrDelete(a)"
                              @click="abrirEditar(a)"
                              title="Editar"
                            >
                              <i class="bi bi-pencil"></i>
                            </button>
                            <button
                              class="btn btn-outline-danger"
                              :disabled="isVisualizador || !canEditOrDelete(a)"
                              @click="confirmarBorrar(a)"
                              title="Eliminar"
                            >
                              <i class="bi bi-trash"></i>
                            </button>
                          </div>

                          <!-- Móvil -->
                          <div class="dropdown d-inline d-md-none">
                            <button class="btn btn-outline-secondary btn-sm dropdown-toggle btn-pill" type="button" data-bs-toggle="dropdown">
                              Acciones
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                              <li>
                                <button
                                  class="dropdown-item"
                                  :disabled="isVisualizador || !isAdmin || a.activo===false || a.estatus==='Finalizado'"
                                  @click="abrirSubida(a, 'cotizacion')"
                                >
                                  <i class="bi bi-file-earmark-plus me-2"></i> Cotización
                                </button>
                              </li>
                              <li>
                                <button
                                  class="dropdown-item"
                                  :disabled="isVisualizador || !isAdmin || a.activo===false || a.estatus==='Finalizado'"
                                  @click="abrirSubida(a, 'pago')"
                                >
                                  <i class="bi bi-receipt me-2"></i> Estado de pago
                                </button>
                              </li>
                              <li>
                                <button
                                  class="dropdown-item"
                                  :disabled="isVisualizador || !isAdmin || a.activo===false || a.estatus==='Finalizado'"
                                  @click="abrirCambioEstatus(a)"
                                >
                                  <i class="bi bi-arrow-repeat me-2"></i> Estatus
                                </button>
                              </li>
                              <li><hr class="dropdown-divider" /></li>
                              <li>
                                <button
                                  class="dropdown-item"
                                  :disabled="isVisualizador || !canEditOrDelete(a)"
                                  @click="abrirEditar(a)"
                                >
                                  <i class="bi bi-pencil me-2"></i> Editar
                                </button>
                              </li>
                              <li>
                                <button
                                  class="dropdown-item text-danger"
                                  :disabled="isVisualizador || !canEditOrDelete(a)"
                                  @click="confirmarBorrar(a)"
                                >
                                  <i class="bi bi-trash me-2"></i> Eliminar
                                </button>
                              </li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div v-if="form.contratoId" class="card-footer small text-muted">
              <i class="bi bi-info-circle me-1"></i>
              {{ arriendos.length }} registro(s) totales • Mostrando {{ arriendosFiltrados.length }}
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Toast éxito ===== -->
      <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1080;">
        <div
          class="toast align-items-center text-bg-success border-0"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          ref="toastRef"
        >
          <div class="d-flex">
            <div class="toast-body">{{ toastMsg }}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" @click="hideToast"></button>
          </div>
        </div>
      </div>

      <!-- ===== Modal Editar ===== -->
      <div class="modal fade show" v-if="modalEdit.visible" style="display:block;" @click.self="cerrarEditar">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content modal-pro">
            <div class="modal-header">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-pencil-square me-2"></i>Editar arriendo
              </h5>
              <button class="btn-close" @click="cerrarEditar"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-12 col-md-6 mb-3">
                  <label class="form-label fw-semibold">Patente</label>
                  <input
                    type="text"
                    class="form-control"
                    v-model="modalEdit.form.patente"
                    @blur="modalEdit.form.patente = (modalEdit.form.patente||'').toUpperCase().trim()"
                  />
                </div>
                <div class="col-12 col-md-6 mb-3">
                  <label class="form-label fw-semibold">Nº interno</label>
                  <input
                    type="text"
                    class="form-control"
                    v-model="modalEdit.form.interno"
                    @blur="modalEdit.form.interno = (modalEdit.form.interno||'').toUpperCase().trim()"
                  />
                </div>
              </div>

              <div class="row">
                <div class="col-12 col-sm-6 mb-3">
                  <label class="form-label fw-semibold">Fecha</label>
                  <input type="date" class="form-control" v-model="modalEdit.form.fechaStr" />
                </div>
                <div class="col-12 col-sm-6 mb-3">
                  <label class="form-label fw-semibold">Hora</label>
                  <input type="time" class="form-control" v-model="modalEdit.form.horaStr" />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Motivo</label>
                <textarea class="form-control" rows="3" v-model="modalEdit.form.motivo"></textarea>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Observación de cambio</label>
                <input type="text" class="form-control" v-model="modalEdit.observacion" placeholder="(opcional)" />
              </div>

              <div v-if="modalEdit.error" class="alert alert-warning py-2 mb-0">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ modalEdit.error }}
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary btn-pill" @click="cerrarEditar">Cancelar</button>
              <button class="btn btn-primary btn-pill" :disabled="modalEdit.saving" @click="guardarEdicion">
                <i class="bi bi-save"></i> Guardar cambios
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Modal Borrar ===== -->
      <div class="modal fade show" v-if="modalDelete.visible" style="display:block;" @click.self="cerrarBorrar">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content modal-pro">
            <div class="modal-header">
              <h5 class="modal-title fw-bold text-danger">
                <i class="bi bi-trash3 me-2"></i>Eliminar arriendo
              </h5>
              <button class="btn-close" @click="cerrarBorrar"></button>
            </div>
            <div class="modal-body">
              <p class="mb-2">¿Seguro que deseas eliminar este registro? Se marcará como inactivo.</p>
              <ul class="small text-muted mb-3">
                <li><strong>Fecha:</strong> {{ formatearFechaHora(modalDelete.item?.fecha) }}</li>
                <li><strong>Equipo:</strong>
                  <template v-if="modalDelete.item">
                    {{ modalDelete.item.equipoPatente || '—' }}
                    <span v-if="modalDelete.item.equipoPatente && modalDelete.item.equipoInterno"> — </span>
                    {{ modalDelete.item.equipoInterno || '' }}
                  </template>
                </li>
                <li><strong>Motivo:</strong> {{ modalDelete.item?.motivo || '—' }}</li>
              </ul>

              <div class="mb-3">
                <label class="form-label fw-semibold">Observación</label>
                <input class="form-control" v-model="modalDelete.observacion" placeholder="Motivo del borrado (recomendado)" />
              </div>

              <div v-if="modalDelete.error" class="alert alert-warning py-2 mb-0">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ modalDelete.error }}
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary btn-pill" @click="cerrarBorrar">Cancelar</button>
              <button class="btn btn-danger btn-pill" :disabled="modalDelete.deleting" @click="borrarConfirmado">
                <i class="bi bi-trash"></i> Eliminar (lógico)
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Modal Subida de archivos ===== -->
      <div class="modal fade show" v-if="modalUpload.visible" style="display:block;" @click.self="cerrarSubida">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content modal-pro">
            <div class="modal-header">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-upload me-2"></i>
                Subir PDF — {{ labelTipoArchivo(modalUpload.tipo) }}
                <span v-if="modalUpload.arriendo" class="ms-2 badge text-bg-light">
                  {{ modalUpload.arriendo?.estatus || 'Solicitado' }}
                </span>
              </h5>
              <button class="btn-close" @click="cerrarSubida"></button>
            </div>

            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label fw-semibold">Archivo (PDF)</label>
                <input type="file" accept="application/pdf" class="form-control" @change="onPickFile" />
                <div class="form-text">Máx. recomendado ~800KB en base64 por doc (usa PDF comprimido).</div>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Observación</label>
                <input type="text" class="form-control" v-model="modalUpload.observacion" placeholder="Comentario (opcional pero útil)" />
              </div>

              <div v-if="modalUpload.loading" class="mb-2">
                <div class="progress progress-pro">
                  <div class="progress-bar" role="progressbar" :style="{width: modalUpload.progress + '%'}">
                    {{ Math.round(modalUpload.progress) }}%
                  </div>
                </div>
                <div class="small text-muted mt-1">Convirtiendo y subiendo…</div>
              </div>

              <div v-if="modalUpload.error" class="alert alert-warning py-2">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ modalUpload.error }}
              </div>

              <div v-if="modalUpload.tipo === 'finalizacion'" class="alert alert-info small mb-0">
                Al adjuntar el PDF de finalización, podrás cambiar el estatus a <strong>Finalizado</strong>.
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline-secondary btn-pill w-100 w-sm-auto" @click="cerrarSubida">Cancelar</button>
              <button class="btn btn-primary btn-pill w-100 w-sm-auto" :disabled="!modalUpload.file || modalUpload.loading" @click="subirArchivo">
                <i class="bi bi-upload"></i> Subir PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Modal Ver Archivos ===== -->
      <div class="modal fade show" v-if="modalFiles.visible" style="display:block;" @click.self="cerrarArchivos">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content modal-pro">
            <div class="modal-header">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-paperclip me-2"></i>
                Archivos —
                <span class="text-muted">
                  {{ modalFiles.arriendo?.equipoPatente || modalFiles.arriendo?.equipoInterno || '—' }}
                </span>
              </h5>
              <button class="btn-close" @click="cerrarArchivos"></button>
            </div>

            <div class="modal-body">
              <div v-if="modalFiles.cargando" class="text-muted">Cargando archivos…</div>

              <div v-else>
                <div v-if="modalFiles.items.length === 0" class="text-muted">No hay archivos.</div>

                <div v-else class="table-responsive">
                  <table class="table table-sm align-middle">
                    <thead class="table-light">
                      <tr>
                        <th>Tipo</th>
                        <th>Nombre</th>
                        <th class="d-none d-sm-table-cell">Tamaño</th>
                        <th class="d-none d-sm-table-cell">Subido por</th>
                        <th>Fecha</th>
                        <th class="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="f in modalFiles.items" :key="f.id">
                        <td>{{ labelTipoArchivo(f.tipo) }}</td>
                        <td class="text-truncate" style="max-width: 280px;" :title="f.nombre">{{ f.nombre }}</td>
                        <td class="d-none d-sm-table-cell">{{ kb(f.size) }} KB</td>
                        <td class="d-none d-sm-table-cell">
                          <span class="small">{{ f.createdBy || '—' }}</span>
                        </td>
                        <td><span class="small">{{ formatearFechaHora(f.createdAt) }}</span></td>
                        <td class="text-end">
                          <div class="btn-group btn-group-sm">
                            <a class="btn btn-outline-secondary" :href="f.base64" target="_blank">
                              <i class="bi bi-box-arrow-up-right"></i> Abrir
                            </a>
                            <button class="btn btn-outline-danger" :disabled="!isAdmin" @click="eliminarArchivo(f)">
                              <i class="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div v-if="isAdmin && modalFiles.arriendo?.estatus !== 'Finalizado'" class="alert alert-info small">
                  Para finalizar el arriendo, adjunta el PDF de finalización y cambia el estatus a <strong>Finalizado</strong>.
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline-secondary btn-pill w-100 w-sm-auto" @click="cerrarArchivos">Cerrar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Modal Cambiar Estatus ===== -->
      <div class="modal fade show" v-if="modalStatus.visible" style="display:block;" @click.self="cerrarCambioEstatus">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content modal-pro">
            <div class="modal-header">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-arrow-repeat me-2"></i>Cambiar estatus
              </h5>
              <button class="btn-close" @click="cerrarCambioEstatus"></button>
            </div>

            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label fw-semibold">Estatus actual</label>
                <input type="text" class="form-control" :value="modalStatus.arriendo?.estatus || 'Solicitado'" disabled />
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Nuevo estatus</label>
                <select class="form-select" v-model="modalStatus.nuevo">
                  <option value="Solicitado">Solicitado</option>
                  <option value="Arrendando">Arrendando</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
                <div class="form-text">
                  - Al crear: queda <strong>Solicitado</strong>.<br />
                  - <strong>Arrendando</strong> cuando ya esté en marcha.<br />
                  - <strong>Finalizado</strong> requiere PDF de finalización.
                </div>
              </div>

              <div class="mb-3" v-if="modalStatus.nuevo === 'Finalizado'">
                <label class="form-label fw-semibold">PDF de finalización (requerido si no hay uno subido)</label>
                <input type="file" accept="application/pdf" class="form-control" @change="onPickStatusFile" />
                <div class="form-text">
                  Si este arriendo no tiene PDF de finalización, adjúntalo para poder marcar como <strong>Finalizado</strong>.
                </div>

                <div v-if="modalStatus.loadingFile" class="mt-2">
                  <div class="progress progress-pro">
                    <div class="progress-bar" role="progressbar" :style="{width: modalStatus.progressFile + '%'}">
                      {{ Math.round(modalStatus.progressFile) }}%
                    </div>
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Observación</label>
                <input type="text" class="form-control" v-model="modalStatus.observacion" placeholder="Motivo del cambio (recomendado)" />
              </div>

              <div v-if="modalStatus.error" class="alert alert-warning py-2 mb-0">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ modalStatus.error }}
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline-secondary btn-pill w-100 w-sm-auto" @click="cerrarCambioEstatus">Cancelar</button>
              <button class="btn btn-success btn-pill w-100 w-sm-auto" :disabled="modalStatus.saving" @click="guardarCambioEstatus">
                <i class="bi bi-check2-circle"></i> Guardar estatus
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { db } from '@/firebase/config'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  collection, addDoc, doc, getDocFromServer, getDocs,
  query, where, orderBy, onSnapshot, limit, updateDoc
} from 'firebase/firestore'

// ====================== STATE ======================
const cargando = reactive({ contratos: true, arriendos: false })
const guardando = ref(false)
const refrescando = ref(false)
const errorMsg = ref('')
const toastMsg = ref('Acción realizada correctamente.')

const usuario = ref(null)
const perfilUsuario = ref(null) // { rol, nombre_completo, contratosAsignados:[] }

const contratosUsuario = ref([])   // [{id, nombre}]
const arriendos = ref([])          // arriendos del contrato seleccionado
const unsubArriendos = ref(null)

const busqueda = ref('')

const form = reactive({
  contratoId: '',
  patente: '',
  interno: '',
  fechaStr: hoyISO(),
  horaStr: horaISO(),
  motivo: ''
})

// Modales
const modalEdit = reactive({
  visible: false, saving: false, error: '', item: null,
  form: { patente:'', interno:'', fechaStr:'', horaStr:'', motivo:'' },
  observacion: ''
})
const modalDelete = reactive({
  visible: false, deleting: false, error: '', item: null, observacion: ''
})
const modalUpload = reactive({
  visible: false, arriendo: null, tipo: 'cotizacion', file: null,
  loading: false, progress: 0, error: '', observacion: ''
})
const modalFiles = reactive({
  visible: false, arriendo: null, items: [], cargando: false
})
const unsubFiles = ref(null)
const modalStatus = reactive({
  visible: false, arriendo: null, nuevo: 'Solicitado',
  observacion: '', saving: false, error: '',
  file: null, loadingFile: false, progressFile: 0
})

// ====================== HELPERS FECHA/HORA ======================
function hoyISO () {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function horaISO () {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function combinarFechaHora(fechaStr, horaStr) {
  try {
    const [y,m,d] = fechaStr.split('-').map(n => parseInt(n))
    const [hh,mi] = horaStr.split(':').map(n => parseInt(n))
    return new Date(y, m - 1, d, hh, mi, 0, 0)
  } catch (e) {
    console.warn('combinarFechaHora: usando fecha actual por error de parseo', e)
    return new Date()
  }
}
function formatearFechaHora(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`
}

// ====================== ROLES ======================
const rol = computed(() => (perfilUsuario.value?.rol || '').toLowerCase())
const isAdmin = computed(() => rol.value === 'admin')
const isVisualizador = computed(() =>
  rol.value === 'visualizador' || rol.value === 'viewer' || rol.value === 'visualizer'
)

// ====================== CONTRATOS/USUARIO ======================
async function cargarContratosAsignados(uid) {
  cargando.contratos = true
  try {
    const snapUser = await getDocFromServer(doc(db, 'usuarios', uid))
    if (!snapUser.exists()) { contratosUsuario.value = []; return }

    perfilUsuario.value = snapUser.data()
    const ids = (perfilUsuario.value.contratosAsignados || []).filter(Boolean)
    if (!ids.length) { contratosUsuario.value = []; return }

    const activos = []
    for (let i = 0; i < ids.length; i += 10) {
      const slice = ids.slice(i, i + 10)
      const qs = await getDocs(
        query(collection(db, 'contratos'), where('__name__', 'in', slice))
      )
      qs.docs.forEach(d => {
        const data = d.data() || {}
        const isActivo = data.activo !== false
        if (isActivo) {
          activos.push({ id: d.id, nombre: data.nombre || d.id })
        }
      })
    }

    contratosUsuario.value = activos.sort((a, b) =>
      String(a.nombre).localeCompare(String(b.nombre), 'es', { sensitivity: 'base' })
    )

    if (contratosUsuario.value.length === 1) {
      form.contratoId = contratosUsuario.value[0].id
      await onChangeContrato()
    } else {
      if (form.contratoId && !contratosUsuario.value.some(c => c.id === form.contratoId)) {
        form.contratoId = ''
        arriendos.value = []
      }
    }
  } finally {
    cargando.contratos = false
  }
}

// ====================== CAMBIO DE CONTRATO ======================
async function onChangeContrato() {
  if (unsubArriendos.value) { unsubArriendos.value(); unsubArriendos.value = null }
  if (unsubFiles.value) { unsubFiles.value(); unsubFiles.value = null }
  arriendos.value = []
  if (!form.contratoId) return
  await escucharArriendosContrato(form.contratoId)
}

// ====================== LISTENER ARRIENDOS ======================
async function escucharArriendosContrato(contratoId) {
  cargando.arriendos = true
  try {
    const qArr = query(
      collection(db, 'arriendos'),
      where('contratoId', '==', contratoId),
      orderBy('fecha', 'desc'),
      limit(200)
    )
    unsubArriendos.value = onSnapshot(qArr, async (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      arriendos.value = rows.filter(r => r.activo !== false)
      cargando.arriendos = false
    }, (err) => {
      console.warn('onSnapshot error:', err)
      cargando.arriendos = false
    })
  } catch (e) {
    console.warn('escucharArriendosContrato (outer):', e)
    cargando.arriendos = false
  }
}

// ====================== REFRESCAR MANUAL ======================
async function refrescarArriendos() {
  if (!form.contratoId) return
  try {
    refrescando.value = true
    if (unsubArriendos.value) { unsubArriendos.value(); unsubArriendos.value = null }
    await escucharArriendosContrato(form.contratoId)
    showToast('Lista actualizada')
  } catch (e) {
    console.warn('Error al refrescar:', e)
  } finally {
    refrescando.value = false
  }
}

// ====================== GUARDAR NUEVO ======================
const puedeGuardar = computed(() => {
  const tieneEquipo = (form.patente || '').trim().length > 0 || (form.interno || '').trim().length > 0
  return !!form.contratoId && tieneEquipo && !!form.fechaStr && !!form.horaStr && (form.motivo || '').trim().length > 0
})

async function guardar() {
  errorMsg.value = ''
  if (!puedeGuardar.value) {
    errorMsg.value = 'Completa contrato, equipo (patente o Nº interno), fecha/hora y motivo.'
    return
  }
  guardando.value = true
  try {
    const fecha = combinarFechaHora(form.fechaStr, form.horaStr)
    const contrato = contratosUsuario.value.find(c => c.id === form.contratoId)
    const docRef = await addDoc(collection(db, 'arriendos'), {
      contratoId: form.contratoId,
      contratoNombre: contrato?.nombre || '',
      equipoPatente: (form.patente || '').toUpperCase().trim(),
      equipoInterno: (form.interno || '').toUpperCase().trim(),
      equipoNombre: '',
      fecha,
      motivo: (form.motivo || '').trim(),
      estatus: 'Solicitado',
      activo: true,
      uidUsuario: usuario.value?.uid || '',
      nombreUsuario: perfilUsuario.value?.nombre_completo || '',
      emailUsuario: usuario.value?.email || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: usuario.value?.email || ''
    })
    await registrarHistorial(docRef.id, 'CREAR', null, 'Solicitado', 'Creación de arriendo', usuario.value?.email)

    showToast('Arriendo guardado')
    limpiar(false)
  } catch (e) {
    errorMsg.value = 'No se pudo guardar. Intenta nuevamente.'
    console.error(e)
  } finally { guardando.value = false }
}

function limpiar(resetContrato = false) {
  if (resetContrato) form.contratoId = ''
  form.patente = ''
  form.interno = ''
  form.fechaStr = hoyISO()
  form.horaStr = horaISO()
  form.motivo = ''
}

// ====================== EDITAR / BORRAR ======================
function canEditOrDelete(a) {
  if (!usuario.value) return false
  if (isAdmin.value) return true
  return (a.uidUsuario && a.uidUsuario === usuario.value.uid)
}

function abrirEditar(a) {
  if (!canEditOrDelete(a)) return
  modalEdit.item = a
  const d = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha)
  modalEdit.form = {
    patente: a.equipoPatente || '',
    interno: a.equipoInterno || '',
    fechaStr: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
    horaStr: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
    motivo: a.motivo || ''
  }
  modalEdit.observacion = ''
  modalEdit.error = ''
  modalEdit.visible = true
}
function cerrarEditar() {
  modalEdit.visible = false
  modalEdit.item = null
  modalEdit.error = ''
  modalEdit.observacion = ''
}
async function guardarEdicion() {
  modalEdit.error = ''
  if (!modalEdit.item) return
  const tieneEquipo = (modalEdit.form.patente || '').trim() || (modalEdit.form.interno || '').trim()
  if (!tieneEquipo || !modalEdit.form.fechaStr || !modalEdit.form.horaStr || !(modalEdit.form.motivo||'').trim()) {
    modalEdit.error = 'Completa equipo (patente o Nº interno), fecha/hora y motivo.'
    return
  }
  modalEdit.saving = true
  try {
    const fecha = combinarFechaHora(modalEdit.form.fechaStr, modalEdit.form.horaStr)
    await updateDoc(doc(db, 'arriendos', modalEdit.item.id), {
      equipoPatente: (modalEdit.form.patente || '').toUpperCase().trim(),
      equipoInterno: (modalEdit.form.interno || '').toUpperCase().trim(),
      fecha,
      motivo: (modalEdit.form.motivo || '').trim(),
      updatedAt: new Date(),
      updatedBy: usuario.value?.email || ''
    })
    await registrarHistorial(
      modalEdit.item.id,
      'EDITAR',
      null,
      null,
      modalEdit.observacion || 'Edición de campos',
      usuario.value?.email
    )

    cerrarEditar()
    showToast('Cambios guardados')
  } catch (e) {
    modalEdit.error = 'No se pudo guardar los cambios.'
    console.error(e)
  } finally { modalEdit.saving = false }
}

// Borrado lógico
function confirmarBorrar(a) {
  if (!canEditOrDelete(a)) return
  modalDelete.item = a
  modalDelete.error = ''
  modalDelete.observacion = ''
  modalDelete.visible = true
}
function cerrarBorrar() {
  modalDelete.visible = false
  modalDelete.item = null
  modalDelete.error = ''
  modalDelete.observacion = ''
}
async function borrarConfirmado() {
  if (!modalDelete.item) return
  modalDelete.deleting = true
  try {
    await updateDoc(doc(db, 'arriendos', modalDelete.item.id), {
      activo: false,
      updatedAt: new Date(),
      updatedBy: usuario.value?.email || ''
    })
    await registrarHistorial(
      modalDelete.item.id,
      'BORRAR_LOGICO',
      null,
      null,
      modalDelete.observacion || 'Marcado como inactivo',
      usuario.value?.email
    )
    cerrarBorrar()
    showToast('Arriendo eliminado')
  } catch (e) {
    modalDelete.error = 'No se pudo eliminar el registro.'
    console.error(e)
  } finally {
    modalDelete.deleting = false
  }
}

// ====================== ARCHIVOS (PDF base64) ======================
function labelTipoArchivo(t) {
  if (t === 'cotizacion') return 'Cotización'
  if (t === 'pago') return 'Estado de pago'
  if (t === 'finalizacion') return 'Finalización de arriendo'
  return t
}
function abrirSubida(a, tipo) {
  if (!isAdmin.value || a.activo===false) return
  modalUpload.visible = true
  modalUpload.arriendo = a
  modalUpload.tipo = tipo
  modalUpload.file = null
  modalUpload.error = ''
  modalUpload.progress = 0
  modalUpload.loading = false
  modalUpload.observacion = ''
}
function cerrarSubida() {
  modalUpload.visible = false
  modalUpload.arriendo = null
  modalUpload.file = null
  modalUpload.progress = 0
  modalUpload.loading = false
  modalUpload.error = ''
  modalUpload.observacion = ''
}
function onPickFile(e) {
  modalUpload.file = e.target.files?.[0] || null
}
function onPickStatusFile(e) {
  modalStatus.file = e.target.files?.[0] || null
}

function leerArchivoComoBase64(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.onprogress = (evt) => {
      if (evt.lengthComputable && typeof onProgress === 'function') {
        onProgress((evt.loaded / evt.total) * 100)
      }
    }
    reader.readAsDataURL(file)
  })
}

async function subirArchivo() {
  if (!modalUpload.file || !modalUpload.arriendo) return
  modalUpload.error = ''

  const file = modalUpload.file
  if (file.type !== 'application/pdf') {
    modalUpload.error = 'Solo se permiten PDF.'
    return
  }
  if (file.size > 900 * 1024) {
    modalUpload.error = 'Archivo muy grande (>900KB). Comprime el PDF antes de subir.'
    return
  }

  modalUpload.loading = true
  modalUpload.progress = 5
  try {
    const b64 = await leerArchivoComoBase64(file, (p) => {
      modalUpload.progress = Math.max(5, Math.min(95, p))
    })
    const arriendoId = modalUpload.arriendo.id
    await addDoc(collection(db, 'arriendos', arriendoId, 'archivos'), {
      tipo: modalUpload.tipo,
      nombre: file.name,
      size: file.size,
      base64: b64,
      createdAt: new Date(),
      createdBy: usuario.value?.email || '',
      observacion: modalUpload.observacion || ''
    })

    try {
      const actual = Number(modalUpload.arriendo.contArchivos || 0) + 1
      await updateDoc(doc(db, 'arriendos', arriendoId), {
        contArchivos: actual, updatedAt: new Date(), updatedBy: usuario.value?.email || ''
      })
    } catch (e) {
      console.warn('No se pudo actualizar contArchivos', e)
    }

    await registrarHistorial(
      arriendoId,
      'SUBIR_ARCHIVO',
      null,
      null,
      `${labelTipoArchivo(modalUpload.tipo)}: ${modalUpload.observacion || file.name}`,
      usuario.value?.email
    )

    modalUpload.progress = 100
    showToast('Archivo subido')
    cerrarSubida()
  } catch (e) {
    modalUpload.error = 'No se pudo subir el archivo.'
    console.error(e)
  } finally {
    modalUpload.loading = false
  }
}

function abrirArchivos(a) {
  modalFiles.visible = true
  modalFiles.arriendo = a
  modalFiles.cargando = true
  modalFiles.items = []

  if (unsubFiles.value) { unsubFiles.value(); unsubFiles.value = null }

  const q = query(collection(db, 'arriendos', a.id, 'archivos'))
  unsubFiles.value = onSnapshot(q, (snap) => {
    modalFiles.items = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(x => x.activo !== false)
    modalFiles.cargando = false
  }, (err) => {
    console.warn('onSnapshot archivos:', err)
    modalFiles.cargando = false
  })
}
function cerrarArchivos() {
  modalFiles.visible = false
  modalFiles.arriendo = null
  modalFiles.items = []
  if (unsubFiles.value) { unsubFiles.value(); unsubFiles.value = null }
}

async function eliminarArchivo(f) {
  if (!isAdmin.value || !modalFiles.arriendo) return
  try {
    const arriendoId = modalFiles.arriendo.id
    await updateDoc(doc(db, 'arriendos', arriendoId), {
      updatedAt: new Date(), updatedBy: usuario.value?.email || ''
    })

    const archivoRef = doc(db, 'arriendos', arriendoId, 'archivos', f.id)
    await updateDoc(archivoRef, {
      activo: false, deletedAt: new Date(), deletedBy: usuario.value?.email || ''
    })

    await registrarHistorial(
      arriendoId,
      'BORRAR_ARCHIVO',
      null,
      null,
      `Archivo: ${f.nombre}`,
      usuario.value?.email
    )
    showToast('Archivo eliminado')
  } catch (e) {
    console.error(e)
    alert('No se pudo eliminar el archivo.')
  }
}

// ====================== CAMBIO DE ESTATUS ======================
function badgeClass(status) {
  const s = (status || 'Solicitado').toLowerCase()
  if (s === 'solicitado') return 'text-bg-secondary'
  if (s === 'arrendando') return 'text-bg-primary'
  if (s === 'finalizado') return 'text-bg-success'
  return 'text-bg-light'
}

function abrirCambioEstatus(a) {
  if (!isAdmin.value || a.activo===false) return
  modalStatus.visible = true
  modalStatus.arriendo = a
  modalStatus.nuevo = a.estatus || 'Solicitado'
  modalStatus.observacion = ''
  modalStatus.error = ''
  modalStatus.file = null
  modalStatus.loadingFile = false
  modalStatus.progressFile = 0
}
function cerrarCambioEstatus() {
  modalStatus.visible = false
  modalStatus.arriendo = null
  modalStatus.nuevo = 'Solicitado'
  modalStatus.observacion = ''
  modalStatus.error = ''
  modalStatus.file = null
  modalStatus.loadingFile = false
  modalStatus.progressFile = 0
}

async function guardarCambioEstatus() {
  modalStatus.error = ''
  if (!modalStatus.arriendo) return

  let tieneFin = false
  if (modalStatus.nuevo === 'Finalizado') {
    const qFin = query(collection(db, 'arriendos', modalStatus.arriendo.id, 'archivos'))
    const snap = await getDocs(qFin)
    tieneFin = snap.docs.some(d => (d.data().tipo === 'finalizacion') && d.data().activo !== false)

    if (!tieneFin) {
      if (!modalStatus.file) {
        modalStatus.error = 'Este arriendo no tiene PDF de finalización. Adjunta uno para finalizar.'
        return
      }
      const file = modalStatus.file
      if (file.type !== 'application/pdf') {
        modalStatus.error = 'El archivo debe ser PDF.'
        return
      }
      if (file.size > 900 * 1024) {
        modalStatus.error = 'Archivo muy grande (>900KB). Comprime el PDF antes de subir.'
        return
      }

      try {
        modalStatus.loadingFile = true
        modalStatus.progressFile = 5
        const b64 = await leerArchivoComoBase64(file, (p) => {
          modalStatus.progressFile = Math.max(5, Math.min(95, p))
        })
        await addDoc(collection(db, 'arriendos', modalStatus.arriendo.id, 'archivos'), {
          tipo: 'finalizacion',
          nombre: file.name,
          size: file.size,
          base64: b64,
          createdAt: new Date(),
          createdBy: usuario.value?.email || '',
          observacion: modalStatus.observacion || 'PDF de finalización'
        })
        try {
          const actual = Number(modalStatus.arriendo.contArchivos || 0) + 1
          await updateDoc(doc(db, 'arriendos', modalStatus.arriendo.id), {
            contArchivos: actual, updatedAt: new Date(), updatedBy: usuario.value?.email || ''
          })
        } catch (e) {
          console.warn('No se pudo actualizar contArchivos en finalizar', e)
        }
        await registrarHistorial(
          modalStatus.arriendo.id,
          'SUBIR_ARCHIVO',
          null,
          null,
          `Finalización: ${modalStatus.observacion || file.name}`,
          usuario.value?.email
        )

        modalStatus.progressFile = 100
        tieneFin = true
      } catch (e) {
        console.error(e)
        modalStatus.error = 'No se pudo subir el PDF de finalización.'
        return
      } finally {
        modalStatus.loadingFile = false
      }
    }
  }

  modalStatus.saving = true
  try {
    const prev = modalStatus.arriendo.estatus || 'Solicitado'
    await updateDoc(doc(db, 'arriendos', modalStatus.arriendo.id), {
      estatus: modalStatus.nuevo,
      updatedAt: new Date(),
      updatedBy: usuario.value?.email || ''
    })
    await registrarHistorial(
      modalStatus.arriendo.id,
      'CAMBIO_ESTATUS',
      prev,
      modalStatus.nuevo,
      modalStatus.observacion || `Cambio de estatus: ${prev} → ${modalStatus.nuevo}`,
      usuario.value?.email
    )
    cerrarCambioEstatus()
    showToast('Estatus actualizado')
  } catch (e) {
    modalStatus.error = 'No se pudo cambiar el estatus.'
    console.error(e)
  } finally {
    modalStatus.saving = false
  }
}

// ====================== BÚSQUEDA Y CONTRATO ======================
const arriendosFiltrados = computed(() => {
  const t = (busqueda.value || '').toLowerCase().trim()
  if (!t) return arriendos.value
  return arriendos.value.filter(a => {
    const equipo = `${a.equipoPatente || ''} ${a.equipoInterno || ''}`.toLowerCase()
    const mo = String(a.motivo || '').toLowerCase()
    return equipo.includes(t) || mo.includes(t)
  })
})
const contratoSeleccionado = computed(() => contratosUsuario.value.find(c => c.id === form.contratoId) || null)
const contratoNombre = computed(() => contratoSeleccionado.value?.nombre || '')

// ====================== HISTORIAL ======================
async function registrarHistorial(arriendoId, accion, de=null, a=null, observacion='', por='') {
  try {
    await addDoc(collection(db, 'arriendos', arriendoId, 'historial'), {
      accion, de, a, observacion, por, fecha: new Date()
    })
  } catch (e) {
    console.warn('No se pudo registrar historial', e)
  }
}

// ====================== TOAST ======================
const toastRef = ref(null)
function showToast(msg = 'Acción realizada correctamente.') {
  toastMsg.value = msg
  try {
    const Toast = window?.bootstrap?.Toast
    if (Toast && toastRef.value) {
      new Toast(toastRef.value).show()
    } else {
      toastRef.value?.classList?.add('show')
      setTimeout(() => hideToast(), 1800)
    }
  } catch (e) {
    console.warn('Toast fallback:', e)
    toastRef.value?.classList?.add('show')
    setTimeout(() => hideToast(), 1800)
  }
}
function hideToast() { toastRef.value?.classList?.remove('show') }

// ====================== UTILS ======================
function kb(bytes) { return Math.round((bytes || 0) / 1024) }

// ====================== MONTAJE ======================
onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, async (u) => {
    usuario.value = u
    if (u) await cargarContratosAsignados(u.uid)
  })
})

onBeforeUnmount(() => {
  if (unsubArriendos.value) { unsubArriendos.value(); unsubArriendos.value = null }
  if (unsubFiles.value) { unsubFiles.value(); unsubFiles.value = null }
})

watch(() => form.contratoId, async (n, o) => {
  // Si prefieres NO usar watch, puedes eliminar esto (pero lo dejo por compatibilidad).
  if (n !== o && n) await onChangeContrato()
})
</script>

<style scoped>
/* ===== Page background ===== */
.arriendos-page{
  min-height: calc(100vh - 56px);
  background:
    radial-gradient(1200px 700px at 15% 10%, rgba(220, 53, 69, 0.12), transparent 60%),
    radial-gradient(900px 600px at 85% 20%, rgba(13, 110, 253, 0.10), transparent 60%),
    linear-gradient(180deg, #ffffff, #fbfbfc);
}

/* ===== Hero ===== */
.hero{ border-radius: 22px; position: relative; }
.hero-bg{
  position:absolute; inset:0;
  background: linear-gradient(90deg, rgba(220,53,69,.14), rgba(170,25,40,.08));
}
.fw-black{ font-weight: 900; }

.hero-badge{
  background: rgba(220,53,69,.16);
  color:#b21f2d;
  border:1px solid rgba(220,53,69,.22);
  border-radius:999px;
  padding:.45rem .65rem;
  font-weight: 900;
}
.contract-badge{
  background: rgba(13,110,253,.12);
  color:#0b5ed7;
  border:1px solid rgba(13,110,253,.20);
  border-radius:999px;
  padding:.45rem .65rem;
  font-weight: 900;
}
.mode-badge{
  background: rgba(255,193,7,.16);
  color:#9a6b00;
  border:1px solid rgba(255,193,7,.26);
  border-radius:999px;
  padding:.45rem .65rem;
  font-weight: 900;
}

/* Stats */
.stats{
  display:flex; gap:.75rem; flex-wrap:wrap;
}
.stat{
  background: rgba(255,255,255,.85);
  border: 1px solid rgba(0,0,0,.06);
  border-radius: 16px;
  padding: .55rem .8rem;
  min-width: 120px;
  box-shadow: 0 12px 28px rgba(0,0,0,.06);
}
.stat .num{ font-weight: 950; font-size: 1.05rem; }
.stat .label{ color:#6c757d; font-size:.8rem; font-weight: 800; }

/* ===== Buttons ===== */
.btn-pill{ border-radius: 999px; font-weight: 900; }

/* ===== Cards ===== */
.card{ border-radius: 18px; }
.form-card{ position: relative; }
.form-header{
  background: linear-gradient(90deg, rgba(220,53,69,1), rgba(170,25,40,1));
  color:#fff;
  border:0;
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
}
.list-header{
  border-bottom: 1px solid rgba(0,0,0,.06);
}

/* Small header icon */
.header-icon{
  width: 36px; height: 36px;
  display:inline-flex; align-items:center; justify-content:center;
  border-radius: 12px;
  background: rgba(255,255,255,.18);
  color:#fff;
}
.header-icon.soft{
  background: rgba(220,53,69,.12);
  color:#dc3545;
}

/* Hint */
.hint{
  background: rgba(13,110,253,.08);
  border:1px solid rgba(13,110,253,.12);
  color:#0b5ed7;
  padding:.6rem .75rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: .9rem;
}

/* Visualizador overlay */
.readonly-overlay{
  position:absolute; inset:0;
  background: rgba(255,255,255,.55);
  backdrop-filter: blur(2px);
  z-index: 10;
  border-radius: 18px;
  display:flex;
  align-items:flex-start;
  justify-content:flex-end;
  padding: 14px;
  pointer-events:none;
}
.readonly-card{
  pointer-events:none;
  background: rgba(33,37,41,.92);
  color:#fff;
  border-radius: 999px;
  padding: .45rem .75rem;
  font-weight: 900;
  box-shadow: 0 12px 26px rgba(0,0,0,.18);
}

/* Search group sizing */
.buscador-grupo{ max-width: 100%; }
@media (min-width: 576px){
  .buscador-grupo{ max-width: 560px; }
}

/* Table */
.table-pro thead th{ font-weight: 900; }
.table-pro tbody tr:hover{ background: rgba(220,53,69,.04); }
.sticky-head{
  position: sticky;
  top: 0;
  z-index: 2;
}
.text-wrap{ white-space: normal; }

/* Clamp 2 lines */
.clamp-2{
  display:-webkit-box;
  -webkit-box-orient: vertical;
  overflow:hidden;
}

/* Inactivo */
.row-inactivo{ opacity: .6; text-decoration: line-through; }

/* Empty states */
.empty{
  text-align: center;
}
.empty-icon{
  width: 58px; height: 58px;
  border-radius: 18px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-size: 1.5rem;
  background: rgba(220,53,69,.10);
  color:#b21f2d;
  margin: 0 auto;
}

/* Modals */
.modal{ background: rgba(0,0,0,.45); }
.modal-pro{
  border-radius: 16px;
  border: 0;
  box-shadow: 0 20px 60px rgba(0,0,0,.22);
}
.progress-pro{ height: 10px; border-radius: 999px; }

/* Spin refresh */
.spin{ animation: spin .9s linear infinite; }
@keyframes spin{
  from{ transform: rotate(0deg); }
  to{ transform: rotate(360deg); }
}
</style>
