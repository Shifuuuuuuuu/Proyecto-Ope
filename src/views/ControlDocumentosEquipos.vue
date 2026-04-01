<template>
  <div class="doc-page">
    <!-- Overlay carga subida -->
    <transition name="fade">
      <div v-if="uploading" class="upload-overlay">
        <div class="upload-modal card border-0 shadow-lg">
          <div class="card-body p-4">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="upload-icon-wrap">
                <i class="bi bi-cloud-arrow-up"></i>
              </div>
              <div class="flex-grow-1">
                <h5 class="fw-bold mb-1">Subiendo documentos</h5>
                <div class="text-muted small">
                  {{ uploadProgress.uploadedCount }} de {{ uploadProgress.totalCount }} completados
                </div>
              </div>
            </div>

            <div class="mb-3">
              <div class="small fw-semibold mb-1">Archivo actual</div>
              <div class="upload-file-name text-truncate">
                {{ uploadProgress.currentFileName || "Preparando..." }}
              </div>
              <div class="small text-muted mt-1">
                Formato: {{ uploadProgress.currentFileExt || "-" }} · Tipo: {{ uploadProgress.currentFileType || "-" }}
              </div>
            </div>

            <div class="mb-3">
              <div class="d-flex justify-content-between small mb-1">
                <span>Progreso archivo actual</span>
                <span>{{ uploadProgress.currentFilePercent }}%</span>
              </div>
              <div class="progress progress-lg">
                <div
                  class="progress-bar bg-danger progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  :style="{ width: uploadProgress.currentFilePercent + '%' }"
                ></div>
              </div>
            </div>

            <div>
              <div class="d-flex justify-content-between small mb-1">
                <span>Progreso general</span>
                <span>{{ uploadProgress.overallPercent }}%</span>
              </div>
              <div class="progress progress-lg">
                <div
                  class="progress-bar bg-dark"
                  role="progressbar"
                  :style="{ width: uploadProgress.overallPercent + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Overlay operaciones -->
    <transition name="fade">
      <div v-if="actionBusy.on" class="busy-overlay">
        <div class="busy-card card border-0 shadow-lg">
          <div class="card-body p-4">
            <div class="d-flex align-items-center gap-3">
              <div class="busy-icon-wrap">
                <div class="spinner-border text-danger" role="status"></div>
              </div>
              <div class="flex-grow-1">
                <h5 class="fw-bold mb-1">{{ actionBusy.label }}</h5>
                <div class="text-muted small">{{ actionBusy.hint }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <div class="container-fluid py-4 doc-main-content">
      <!-- Header -->
      <div class="doc-hero card border-0 shadow-sm mb-4">
        <div class="card-body p-4">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h1 class="h4 fw-bold mb-1">Control de Documentos de Equipos</h1>
              <p class="text-muted mb-0">
                Explorador de carpetas, documentos y vista previa prioritaria.
              </p>
            </div>
            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-outline-danger btn-pill" @click="abrirModalCarpeta">
                <i class="bi bi-folder-plus me-2"></i>
                Nueva carpeta
              </button>

              <button
                class="btn btn-danger btn-pill"
                type="button"
                @click="toggleFiltros"
              >
                <i :class="showFilters ? 'bi bi-funnel-fill' : 'bi bi-funnel'" class="me-2"></i>
                {{ showFilters ? "Ocultar filtros" : "Filtros" }}
              </button>

              <input
                ref="fileInput"
                type="file"
                class="d-none"
                multiple
                @change="handleFileSelected"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <transition name="filters-slide">
        <div v-if="showFilters" class="card border-0 shadow-sm mb-4 filters-card">
          <div class="card-body p-3">
            <div class="row g-3 align-items-end">
              <div class="col-12 col-md-6 col-xl-3">
                <label class="form-label fw-semibold">Contrato</label>
                <select class="form-select" v-model="selectedContratoId" @change="onContratoChange">
                  <option
                    v-for="c in contratos"
                    :key="c.id"
                    :value="c.id"
                  >
                    {{ c.nombre || c.contrato || c.id }}
                  </option>
                </select>
              </div>

              <div class="col-12 col-md-6 col-xl-4 position-relative">
                <label class="form-label fw-semibold">Buscar documento</label>
                <div class="input-group">
                  <span class="input-group-text bg-white">
                    <i class="bi bi-search"></i>
                  </span>
                  <input
                    v-model.trim="filtroBusqueda"
                    type="text"
                    class="form-control"
                    placeholder="Ej: certificado, revisión, hermiticidad"
                    @focus="showSuggestions = true"
                    @blur="cerrarSugerenciasConDelay"
                  />
                </div>

                <div
                  v-if="showSuggestions && filtroBusqueda && sugerenciasBusqueda.length"
                  class="suggestions-box shadow-sm"
                >
                  <button
                    v-for="(item, idx) in sugerenciasBusqueda"
                    :key="idx"
                    type="button"
                    class="suggestion-item"
                    @mousedown.prevent="seleccionarSugerencia(item)"
                  >
                    <div class="fw-semibold">{{ item.label }}</div>
                    <small class="text-muted">{{ item.sub }}</small>
                  </button>
                </div>
              </div>

              <div class="col-12 col-md-6 col-xl-2">
                <label class="form-label fw-semibold">Categoría</label>
                <select class="form-select" v-model="filtroCategoria">
                  <option value="">Todas</option>
                  <option v-for="cat in categoriasDisponibles" :key="cat" :value="cat">
                    {{ cat }}
                  </option>
                </select>
              </div>

              <div class="col-12 col-md-6 col-xl-1">
                <button class="btn btn-outline-secondary btn-pill w-100" @click="limpiarFiltrosGenerales">
                  Limpiar
                </button>
              </div>

              <div class="col-12 col-md-6 col-xl-2">
                <button
                  class="btn btn-outline-secondary btn-pill w-100"
                  @click="abrirModalFiltroFechas"
                  :disabled="!currentFolderId"
                >
                  <i class="bi bi-calendar-range me-1"></i>
                  Fechas
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
      <!-- Layout principal -->
      <div class="row g-4 align-items-start">
        <!-- Explorador -->
        <div class="col-12" :class="previewDoc ? 'col-xl-4' : 'col-xl-5'">
          <div class="card border-0 shadow-sm explorer-card">
            <div class="card-header bg-white border-0 pt-3 pb-2">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h5 class="fw-bold mb-0">Explorador</h5>
                  <small class="text-muted">Árbol desplegable de carpetas</small>
                </div>
                <div class="d-flex align-items-center gap-2">
                  <span v-if="selectedFolderIdsArray.length" class="badge text-bg-danger">
                    {{ selectedFolderIdsArray.length }} seleccionada(s)
                  </span>
                  <span class="badge text-bg-light">{{ visibleTreeRows.length }}</span>
                </div>
              </div>
            </div>

            <div class="card-body pt-2">
              <div class="tree-toolbar mb-3">
                <div class="d-flex flex-wrap align-items-center gap-2">
                  <button
                    type="button"
                    class="path-chip"
                    :class="{ active: currentFolderId === '' }"
                    @click="irARaiz"
                  >
                    <i class="bi bi-house-door me-1"></i> Raíz
                  </button>

                  <button
                    v-if="selectedFolderIdsArray.length"
                    type="button"
                    class="btn btn-sm btn-outline-secondary btn-pill"
                    @click="limpiarSeleccionCarpetas"
                  >
                    <i class="bi bi-x-circle me-1"></i>
                    Limpiar selección
                  </button>
                </div>

                <div v-if="breadcrumbFolders.length" class="small text-muted mt-2">
                  {{ breadcrumbFolders.map(x => x.nombre).join(" / ") }}
                </div>
              </div>

              <div v-if="loadingFolders" class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm me-2"></div>
                Cargando carpetas...
              </div>

              <div v-else-if="visibleTreeRows.length === 0" class="empty-state compact">
                <i class="bi bi-folder2-open fs-2 mb-2"></i>
                <div class="fw-semibold">No hay carpetas</div>
                <small class="text-muted">Crea una carpeta principal o subcarpeta.</small>
              </div>

              <div
                v-else
                class="tree-list"
                :class="{ 'drag-panel-active': dragActive }"
                @dragenter.prevent="onDragEnter"
                @dragover.prevent="onDragOver"
                @dragleave.prevent="onDragLeave"
                @drop.prevent="onDropFiles"
              >
                <transition-group name="tree-fade" tag="div">
                    <div
                      v-for="(row, index) in visibleTreeRows"
                      :key="row.id"
                      class="tree-row"
                      :class="[
                        colorCarpetaClase(row.id),
                        {
                          active: currentFolderId === row.id,
                          compact: !!previewDoc,
                          selected: isFolderSelected(row.id),
                          'drag-folder-target': dragHoverFolderId === row.id,
                        }
                      ]"
                      :style="{ '--level': row.level }"
                      @click="handleFolderRowClick(row, index, $event)"
                      @dblclick.stop="handleFolderRowDoubleClick(row, $event)"
                      @dragenter.prevent="onFolderDragEnter(row.id)"
                      @dragover.prevent="onFolderDragOver(row.id)"
                      @dragleave.prevent="onFolderDragLeave(row.id)"
                      @drop.prevent="onDropFilesToFolder($event, row.folder)"
                    >
                    <div class="tree-indent" :style="{ width: `${row.level * 16}px` }"></div>

                    <div class="form-check tree-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :checked="isFolderSelected(row.id)"
                        @click.stop="toggleFolderSelectionOnly(row, index, $event)"
                      />
                    </div>

                    <button
                      type="button"
                      class="tree-expand-btn"
                      @click.stop="toggleFolderExpand(row.folder)"
                      :class="{ invisible: !row.hasChildren }"
                    >
                      <i
                        class="bi"
                        :class="row.expanded ? 'bi-chevron-down' : 'bi-chevron-right'"
                      ></i>
                    </button>

                    <button type="button" class="tree-main-btn">
                      <div class="tree-folder-icon" :class="iconoCarpetaClase(row.id)">
                        <i class="bi bi-folder-fill"></i>
                      </div>

                      <div class="tree-folder-body">
                        <div class="tree-folder-title d-flex align-items-center gap-2 flex-wrap">
                          <span>{{ row.folder.nombre }}</span>

                          <span
                            v-if="mostrarEstadoPropioCarpeta(row.id)"
                            class="badge rounded-pill"
                            :class="badgeCarpetaClase(row.id)"
                          >
                            {{ textoEstadoCarpeta(row.id) }}
                          </span>
                        </div>

                        <div class="tree-folder-meta">
                          {{ conteoArchivosPorCarpetaTotal(row.id) }} docs ·
                          {{ cantidadSubcarpetas(row.id) }} subcarpetas directas
                        </div>

                        <div
                          v-if="mostrarEstadoPropioCarpeta(row.id)"
                          class="tree-folder-meta small"
                        >
                          Último: {{ nombreUltimoDocumento(row.id) }}
                          <span class="ms-1">
                            · Vence: {{ formatDate(ultimoDocumentoDirectoPorCarpeta(row.id)?.fechaFin) || "-" }}
                          </span>
                        </div>

                        <div
                          v-else-if="resumenEstadosSubarbol(row.id).total > 0"
                          class="tree-folder-meta small d-flex flex-wrap gap-2"
                        >
                          <span class="badge rounded-pill text-bg-danger">
                            Vencidos: {{ resumenEstadosSubarbol(row.id).vencido }}
                          </span>
                          <span class="badge rounded-pill text-bg-warning">
                            Por vencer: {{ resumenEstadosSubarbol(row.id).porVencer }}
                          </span>
                          <span class="badge rounded-pill text-bg-success">
                            Vigentes: {{ resumenEstadosSubarbol(row.id).vigente }}
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                </transition-group>
              </div>
            </div>
          </div>
        </div>

        <!-- Lista documentos -->
        <div class="col-12" :class="previewDoc ? 'col-xl-2' : 'col-xl-7'">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white border-0 pt-3">
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <h5 class="fw-bold mb-0">
                    Documentos
                    <span v-if="currentFolder" class="text-muted">· {{ currentFolder.nombre }}</span>
                  </h5>
                </div>

                <div v-if="selectedDocumentIdsArray.length" class="small fw-semibold text-muted">
                  {{ selectedDocumentIdsArray.length }} documento(s) seleccionado(s)
                </div>
              </div>
            </div>

            <div class="card-body">
              <div v-if="loadingDocs" class="text-center py-5 text-muted">
                <div class="spinner-border me-2"></div>
                Cargando documentos...
              </div>

              <div v-else-if="!currentFolderId" class="empty-state compact py-5">
                <i class="bi bi-folder-check fs-1 mb-2"></i>
                <div class="fw-semibold">Selecciona una carpeta</div>
              </div>

              <div v-else-if="documentosVisibles.length === 0" class="empty-state compact py-5">
                <i class="bi bi-file-earmark-text fs-1 mb-2"></i>
                <div class="fw-semibold">No hay documentos</div>
              </div>

              <div v-else class="doc-list-compact">
                <transition-group name="tree-fade" tag="div">
                  <div
                    v-for="(docu, index) in documentosVisibles"
                    :key="docu.id"
                    class="doc-list-item"
                    :class="[
                      claseEstadoDocumento(docu),
                      {
                        active: previewDoc?.id === docu.id,
                        shrink: !!previewDoc && previewDoc?.id !== docu.id,
                        selected: isDocumentSelected(docu.id)
                      }
                    ]"
                    @click="handleDocumentRowClick(docu, index, $event)"
                  >
                    <div class="form-check doc-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :checked="isDocumentSelected(docu.id)"
                        @click.stop="toggleDocumentSelectionOnly(docu, index, $event)"
                      />
                    </div>

                    <div class="doc-list-left" @click.stop="verDocumento(docu)">
                      <div class="doc-file-icon compact" :class="claseIconoEstadoDocumento(docu)">
                        <i :class="iconoDocumento(docu)"></i>
                      </div>

                      <div class="doc-list-body">
                        <div class="doc-list-title">{{ docu.originalFileName || docu.nombreArchivo || "Documento" }}</div>
                        <div class="doc-list-meta">
                          {{ docu.categoria || "-" }} · {{ extensionArchivo(docu.originalFileName || docu.nombreArchivo) }}
                        </div>
                        <div class="doc-list-meta">
                          Inicio: {{ formatDate(docu.fechaInicio) || "-" }} · Final: {{ formatDate(docu.fechaFin) || "-" }}
                        </div>
                      </div>
                    </div>

                    <div class="doc-list-actions">
                      <span
                        class="badge rounded-pill doc-status-badge"
                        :class="badgeEstadoDocumento(docu)"
                      >
                        {{ textoEstadoDocumento(docu) }}
                      </span>
                    </div>
                  </div>
                </transition-group>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview prioritaria -->
        <div v-if="previewDoc" class="col-12 col-xl-6">
          <div class="card border-0 shadow-sm preview-priority-card">
            <div class="card-header bg-white border-0 pt-3">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h5 class="fw-bold mb-0">Vista previa</h5>
                  <small class="text-muted">{{ previewDoc.originalFileName || previewDoc.nombreArchivo }}</small>
                </div>
                <button class="btn btn-outline-secondary btn-sm btn-pill" @click="cerrarPreview">
                  Cerrar
                </button>
              </div>
            </div>

            <div class="card-body preview-priority-body preview-body-wrap">
              <transition name="fade">
                <div v-if="previewLoading" class="preview-loading-overlay">
                  <div class="preview-loading-card">
                    <div class="spinner-border text-danger mb-3" role="status"></div>
                    <div class="fw-semibold">Cargando vista previa...</div>
                    <div class="small text-muted mt-1">Preparando documento seleccionado</div>
                  </div>
                </div>
              </transition>

              <div class="preview-header-info mb-3">
                <span class="badge rounded-pill text-bg-light me-2">
                  {{ extensionArchivo(previewDoc.originalFileName || previewDoc.nombreArchivo) }}
                </span>
                <span class="badge rounded-pill doc-status-badge" :class="badgeEstadoDocumento(previewDoc)">
                  {{ textoEstadoDocumento(previewDoc) }}
                </span>
              </div>

              <div v-if="esPdf(previewDoc)" class="preview-frame-wrap">
                <iframe
                  :key="previewRenderKey"
                  :src="previewDoc.url"
                  class="preview-frame"
                  @load="onPreviewLoaded"
                ></iframe>
              </div>

              <div v-else-if="esImagen(previewDoc)" class="preview-image-wrap">
                <img
                  :key="previewRenderKey"
                  :src="previewDoc.url"
                  class="img-fluid rounded shadow-sm preview-image"
                  @load="onPreviewLoaded"
                  @error="onPreviewLoaded"
                />
              </div>

              <div v-else class="text-center py-5">
                <i class="bi bi-file-earmark fs-1 text-muted"></i>
                <p class="text-muted mt-2">Este archivo no tiene vista previa embebida.</p>
                <a class="btn btn-danger btn-pill" :href="previewDoc.url" target="_blank" rel="noopener">
                  Abrir documento
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Barra única carpetas -->
    <transition name="bottom-sheet">
      <div v-if="selectedFolderIdsArray.length && !selectedDocumentIdsArray.length" class="floating-action-bar">
        <div class="floating-card shadow-lg">
          <div class="floating-handle"></div>

          <div class="floating-header">
            <div>
              <div class="fw-bold">Acciones de carpeta</div>
              <div class="small text-muted">
                {{ selectedFolderIdsArray.length }} carpeta(s) seleccionada(s)
              </div>
            </div>
            <button class="btn btn-sm btn-light rounded-circle" @click="limpiarSeleccionCarpetas">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="floating-actions">
            <button
              v-if="canCreateFolders"
              class="btn btn-outline-danger btn-pill"
              @click="abrirModalCarpetaDesdeSeleccion"
            >
              <i class="bi bi-folder-plus me-2"></i>
              Crear carpeta
            </button>

            <button
              v-if="canCreateFolders"
              class="btn btn-outline-warning btn-pill"
              @click="abrirModalSubcarpetaDesdeSeleccion"
              :disabled="selectedFolderIdsArray.length !== 1"
            >
              <i class="bi bi-folder-symlink me-2"></i>
              Crear subcarpeta
            </button>

            <button
              v-if="canManageFolders"
              class="btn btn-outline-dark btn-pill"
              @click="abrirModalEditarCarpeta"
              :disabled="selectedFolderIdsArray.length !== 1"
            >
              <i class="bi bi-pencil-square me-2"></i>
              Editar nombre
            </button>

            <button
              v-if="canManageFolders"
              class="btn btn-outline-primary btn-pill"
              @click="prepararMoverCarpetasSeleccionadas"
            >
              <i class="bi bi-arrow-left-right me-2"></i>
              Mover
            </button>

            <button
              v-if="canManageFolders"
              class="btn btn-outline-secondary btn-pill"
              @click="prepararCopiarCarpetasSeleccionadas"
            >
              <i class="bi bi-copy me-2"></i>
              Copiar
            </button>

            <button
              v-if="canManageFolders"
              class="btn btn-outline-danger btn-pill"
              @click="prepararEliminarCarpetasSeleccionadas"
            >
              <i class="bi bi-trash me-2"></i>
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Barra única documentos -->
    <transition name="bottom-sheet">
      <div v-if="selectedDocumentIdsArray.length && !selectedFolderIdsArray.length" class="floating-action-bar">
        <div class="floating-card shadow-lg">
          <div class="floating-handle"></div>

          <div class="floating-header">
            <div class="min-w-0">
              <div class="fw-bold text-truncate">Acciones del documento</div>
              <div class="small text-muted text-truncate">
                {{ selectedDocumentIdsArray.length }} documento(s) seleccionado(s)
              </div>
            </div>
            <button class="btn btn-sm btn-light rounded-circle" @click="limpiarSeleccionDocumentos">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="floating-actions">
            <button
              v-if="canViewDocuments"
              class="btn btn-outline-primary btn-pill"
              @click="verDocumento(selectedSingleDocument)"
              :disabled="selectedDocumentIdsArray.length !== 1 || !selectedSingleDocument"
            >
              <i class="bi bi-eye me-2"></i>
              Ver
            </button>

            <a
              v-if="canViewDocuments"
              class="btn btn-outline-secondary btn-pill"
              :href="selectedSingleDocument?.url || '#'"
              target="_blank"
              rel="noopener"
              :class="{ disabled: selectedDocumentIdsArray.length !== 1 || !selectedSingleDocument }"
              @click.prevent="abrirDocumentoSeleccionado"
            >
              <i class="bi bi-box-arrow-up-right me-2"></i>
              Abrir
            </a>

            <button
              v-if="canManageDocuments"
              class="btn btn-outline-dark btn-pill"
              @click="abrirModalEditarDocumento"
              :disabled="selectedDocumentIdsArray.length !== 1 || !selectedSingleDocument"
            >
              <i class="bi bi-calendar2-week me-2"></i>
              Editar fechas
            </button>

            <button
              v-if="canManageDocuments"
              class="btn btn-outline-danger btn-pill"
              @click="prepararEliminarDocumentosSeleccionados"
            >
              <i class="bi bi-trash me-2"></i>
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modal editar documento -->
    <div class="modal fade" ref="modalEditarDocumentoEl" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-calendar2-week me-2"></i>Editar fechas del documento
            </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <div class="alert alert-light border mb-3">
              <div class="fw-semibold text-truncate">
                {{ editarDocumentoForm.originalFileName || "Documento" }}
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold">Fecha inicio</label>
              <input v-model="editarDocumentoForm.fechaInicio" type="date" class="form-control" />
            </div>

            <div class="mb-0">
              <label class="form-label fw-semibold">Fecha final</label>
              <input v-model="editarDocumentoForm.fechaFin" type="date" class="form-control" />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-pill" type="button" data-bs-dismiss="modal">
              Cancelar
            </button>
            <button class="btn btn-danger btn-pill" type="button" @click="guardarEdicionDocumento">
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal crear carpeta -->
    <div class="modal fade" ref="modalNuevaCarpetaEl" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content border-0 shadow">
          <div class="modal-header transfer-modal-header">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-folder-plus me-2"></i>
              {{ nuevaCarpeta.parentId ? "Nueva subcarpeta" : "Nueva carpeta" }}
            </h5>

            <div class="d-flex align-items-center gap-2 ms-auto">
              <button
                class="btn btn-outline-secondary btn-pill btn-sm"
                type="button"
                data-bs-dismiss="modal"
              >
                Cancelar
              </button>

              <button
                class="btn btn-danger btn-pill btn-sm"
                type="button"
                @click="crearCarpetasMultiples"
              >
                Guardar carpeta(s)
              </button>

              <button class="btn-close ms-1" type="button" data-bs-dismiss="modal"></button>
            </div>
          </div>

          <div class="modal-body">
            <div class="row g-4">
              <div class="col-12 col-lg-5">
                <div class="mb-3">
                  <label class="form-label fw-semibold">Contrato</label>
                  <select class="form-select" v-model="nuevaCarpeta.contratoId" @change="onCreateFolderContractChange">
                    <option value="">Selecciona contrato</option>
                    <option v-for="c in contratos" :key="c.id" :value="c.id">
                      {{ c.nombre || c.contrato || c.id }}
                    </option>
                  </select>
                </div>

                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="form-label fw-semibold mb-0">Carpetas a crear</label>
                    <button class="btn btn-sm btn-outline-danger btn-pill" type="button" @click="agregarFilaCarpeta">
                      <i class="bi bi-plus-lg me-1"></i> Agregar
                    </button>
                  </div>

                  <div class="multi-folder-list">
                    <div
                      v-for="(item, idx) in nuevaCarpeta.items"
                      :key="item.key"
                      class="multi-folder-row"
                    >
                      <input
                        v-model.trim="item.nombre"
                        type="text"
                        class="form-control"
                        :placeholder="`Nombre carpeta ${idx + 1}`"
                      />
                      <button
                        class="btn btn-outline-secondary rounded-circle"
                        type="button"
                        @click="eliminarFilaCarpeta(idx)"
                        :disabled="nuevaCarpeta.items.length === 1"
                      >
                        <i class="bi bi-dash"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div class="selected-destination">
                  <div class="small fw-semibold mb-1">Crear dentro de</div>
                  <div class="selected-destination-box">
                    {{ nuevaCarpeta.parentId ? rutaCarpetaTexto(nuevaCarpeta.parentId) : "Raíz del contrato" }}
                  </div>
                </div>
              </div>

              <div class="col-12 col-lg-7">
                <div class="transfer-browser card border-0 shadow-sm">
                  <div class="card-body p-3">
                    <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
                      <button
                        class="path-chip"
                        :class="{ active: createFolderBrowser.currentParentId === '' }"
                        @click="irACreateFolderRaiz"
                        type="button"
                      >
                        Raíz
                      </button>

                      <template v-for="item in createFolderBreadcrumbs" :key="item.id">
                        <span class="text-muted small">/</span>
                        <button class="path-chip" @click="abrirCreateFolderBrowser(item.id)" type="button">
                          {{ item.nombre }}
                        </button>
                      </template>
                    </div>

                    <div class="d-flex flex-wrap gap-2 mb-3">
                      <button
                        class="btn btn-outline-danger btn-pill btn-sm"
                        type="button"
                        @click="seleccionarPadreNuevaCarpeta(createFolderBrowser.currentParentId)"
                      >
                        <i class="bi bi-check2-circle me-1"></i>
                        Usar carpeta abierta
                      </button>
                    </div>

                    <div v-if="createFolderCurrentFolders.length === 0" class="empty-state compact transfer-empty">
                      <i class="bi bi-folder2-open fs-3 mb-2"></i>
                      <div class="fw-semibold">No hay subcarpetas aquí</div>
                      <small class="text-muted">Puedes crear directamente en este nivel.</small>
                    </div>

                    <div v-else class="transfer-list">
                      <div
                        v-for="folder in createFolderCurrentFolders"
                        :key="folder.id"
                        class="transfer-row"
                        :class="{ selected: nuevaCarpeta.parentId === folder.id }"
                        @click="abrirCreateFolderBrowser(folder.id)"
                      >
                        <div class="transfer-row-main">
                          <div class="transfer-row-icon">
                            <i class="bi bi-folder-fill"></i>
                          </div>
                          <div class="transfer-row-body">
                            <div class="fw-semibold text-truncate">{{ folder.nombre }}</div>
                            <div class="small text-muted text-truncate">
                              {{ cantidadSubcarpetas(folder.id) }} subcarpeta(s) · {{ conteoArchivosPorCarpetaTotal(folder.id) }} docs
                            </div>
                          </div>
                        </div>

                        <button
                          class="btn btn-sm btn-outline-danger btn-pill"
                          type="button"
                          @click.stop="seleccionarPadreNuevaCarpeta(folder.id)"
                        >
                          Elegir
                        </button>
                      </div>
                    </div>

                    <div class="small text-muted mt-3">
                      Puedes abrir una carpeta tocando la card completa y luego usar “Usar carpeta abierta”.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" ref="modalEditarCarpetaEl" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-pencil-square me-2"></i>Editar carpeta
            </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <div class="mb-0">
              <label class="form-label fw-semibold">Nuevo nombre</label>
              <input
                v-model.trim="editarCarpetaForm.nombre"
                type="text"
                class="form-control"
                placeholder="Nombre de carpeta"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-pill" type="button" data-bs-dismiss="modal">
              Cancelar
            </button>
            <button class="btn btn-danger btn-pill" type="button" @click="guardarEdicionCarpeta">
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal filtro -->
    <div class="modal fade" ref="modalFiltroFechasEl" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-calendar-range me-2"></i>Filtrar por fechas
            </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label fw-semibold">Fecha inicio</label>
              <input v-model="filtroFechaInicio" type="date" class="form-control" />
            </div>

            <div class="mb-0">
              <label class="form-label fw-semibold">Fecha final</label>
              <input v-model="filtroFechaFin" type="date" class="form-control" />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-pill" type="button" @click="limpiarFechas">
              Limpiar
            </button>
            <button class="btn btn-danger btn-pill" type="button" data-bs-dismiss="modal">
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal subir -->
    <div class="modal fade" ref="modalSubirArchivoEl" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-upload me-2"></i>Subir documentos
            </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <div class="alert alert-light border mb-4">
              <div><b>Carpeta:</b> {{ uploadTargetFolder?.nombre || currentFolder?.nombre || "-" }}</div>
              <div><b>Contrato:</b> {{ contratoNombre(uploadTargetFolder?.contratoId || currentFolder?.contratoId) }}</div>
              <div><b>Categoría detectada:</b> {{ categoriaUploadDetectada || "-" }}</div>
              <div><b>Archivos seleccionados:</b> {{ archivosSeleccionados.length }} / 20</div>
            </div>

            <div class="row g-3">
              <div class="col-12 col-md-6">
                <label class="form-label fw-semibold">Fecha de Creación</label>
                <input v-model="uploadForm.fechaInicio" type="date" class="form-control" required />
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label fw-semibold">Fecha de Vencimiento</label>
                <input v-model="uploadForm.fechaFin" type="date" class="form-control" required />
              </div>
            </div>
            <div class="col-12">
              <div class="form-text text-danger">
                Las fechas son obligatorias para poder guardar el documento.
              </div>
            </div>
            <div v-if="archivosSeleccionados.length" class="mt-4">
              <label class="form-label fw-semibold">Archivos a subir</label>

              <div class="selected-files">
                <div
                  v-for="(f, idx) in archivosSeleccionados"
                  :key="idx"
                  class="selected-file-item"
                >
                  <div class="selected-file-main">
                    <div class="d-flex align-items-center gap-2">
                      <i :class="iconoArchivoLocal(f)" class="text-danger"></i>
                      <div class="fw-semibold text-truncate">{{ f.name }}</div>
                    </div>

                    <div class="small text-muted mt-1">
                      Formato: {{ extensionArchivo(f.name) }} ·
                      Tipo: {{ f.type || "desconocido" }} ·
                      Tamaño: {{ formatearBytes(f.size) }}
                    </div>
                  </div>

                  <button
                    class="btn btn-sm btn-outline-danger rounded-circle"
                    @click="quitarArchivo(idx)"
                    :disabled="uploading || actionBusy.on"
                  >
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-3 small text-muted">
              El contrato y la categoría se completan automáticamente según la carpeta de destino.
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-pill" type="button" data-bs-dismiss="modal" :disabled="uploading || actionBusy.on">
              Cancelar
            </button>
            <button
              class="btn btn-danger btn-pill"
              type="button"
              :disabled="uploading || actionBusy.on || !archivosSeleccionados.length"
              @click="subirDocumentos"
            >
              Guardar documentos
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal eliminar -->
    <div class="modal fade" ref="modalEliminarEl" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <h5 class="modal-title fw-bold text-danger">
              <i class="bi bi-trash me-2"></i>Confirmar eliminación
            </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <template v-if="deleteTarget.type === 'documentos'">
              <p class="mb-2">¿Estás seguro de que quieres eliminar estos documentos?</p>
              <div class="alert alert-light border mb-0">
                <div><b>Total:</b> {{ deleteTarget.docs || 0 }} documento(s)</div>
              </div>
            </template>

            <template v-else-if="deleteTarget.type === 'carpetas'">
              <p class="mb-2">¿Estás seguro de que quieres eliminar las carpetas seleccionadas?</p>
              <div class="alert alert-light border mb-0">
                <div><b>Carpetas raíz seleccionadas:</b> {{ deleteTarget.hijos || 0 }}</div>
                <div><b>Total documentos afectados:</b> {{ deleteTarget.docs || 0 }}</div>
              </div>
              <div class="small text-muted mt-3">
                También se eliminarán sus subcarpetas y documentos internos.
              </div>
            </template>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-pill" type="button" data-bs-dismiss="modal">
              Cancelar
            </button>
            <button class="btn btn-danger btn-pill" type="button" @click="confirmarEliminar">
              Sí, eliminar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal mover/copiar -->
    <div class="modal fade" ref="modalTransferirEl" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content border-0 shadow">
          <div class="modal-header transfer-modal-header">
            <h5 class="modal-title fw-bold">
              <i :class="transferTarget.mode === 'mover' ? 'bi bi-arrow-left-right' : 'bi bi-copy'" class="me-2"></i>
              {{ transferTarget.mode === 'mover' ? 'Mover carpeta(s)' : 'Copiar carpeta(s)' }}
            </h5>

            <div class="d-flex align-items-center gap-2 ms-auto">
              <button
                class="btn btn-outline-secondary btn-pill btn-sm"
                type="button"
                data-bs-dismiss="modal"
              >
                Cancelar
              </button>

              <button
                class="btn btn-danger btn-pill btn-sm"
                type="button"
                :disabled="
                  transferTarget.mode === 'copiar'
                    ? !(transferTarget.destinoIds && transferTarget.destinoIds.length) || !transferTargetContratoId
                    : !transferTarget.destinoId || !transferTargetContratoId
                "
                @click="confirmarTransferencia"
              >
                {{ transferTarget.mode === 'mover' ? 'Mover' : 'Copiar' }}
              </button>

              <button class="btn-close ms-1" type="button" data-bs-dismiss="modal"></button>
            </div>
          </div>

          <div class="modal-body">
            <div class="row g-4">
              <div class="col-12 col-lg-4">
                <div class="alert alert-light border mb-3">
                  <div v-if="transferTarget.folders.length === 1">
                    <b>Carpeta seleccionada:</b> {{ transferTarget.folders[0]?.nombre || "-" }}
                  </div>
                  <div v-else>
                    <b>Carpetas seleccionadas:</b> {{ transferTarget.folders.length }}
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold">Contrato destino</label>
                  <select class="form-select" v-model="transferTargetContratoId" @change="onTransferContractChange">
                    <option value="">Selecciona contrato</option>
                    <option v-for="c in contratos" :key="c.id" :value="c.id">
                      {{ c.nombre || c.contrato || c.id }}
                    </option>
                  </select>
                </div>

                <div class="selected-destination">
                  <div class="small fw-semibold mb-1">
                    {{ transferTarget.mode === 'copiar' ? 'Destinos seleccionados' : 'Destino seleccionado' }}
                  </div>

                  <div
                    v-if="transferTarget.mode === 'copiar' && transferTarget.destinoIds?.length"
                    class="selected-destination-box"
                  >
                    <div
                      v-for="destId in transferTarget.destinoIds"
                      :key="destId"
                      class="selected-destination-item"
                    >
                      <div class="selected-destination-text">
                        • {{ rutaCarpetaTexto(destId) }}
                      </div>

                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger rounded-circle selected-destination-remove"
                        @click.stop="quitarDestinoTransfer(destId)"
                        title="Quitar destino"
                      >
                        <i class="bi bi-x"></i>
                      </button>
                    </div>
                  </div>

                  <div
                    v-else
                    class="selected-destination-box"
                  >
                    <div
                      v-if="transferTarget.destinoId"
                      class="selected-destination-item"
                    >
                      <div class="selected-destination-text">
                        {{ rutaCarpetaTexto(transferTarget.destinoId) }}
                      </div>

                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger rounded-circle selected-destination-remove"
                        @click.stop="quitarDestinoTransfer(transferTarget.destinoId)"
                        title="Quitar destino"
                      >
                        <i class="bi bi-x"></i>
                      </button>
                    </div>

                    <div v-else>
                      Ninguno
                    </div>
                  </div>
                </div>

                <div class="d-grid gap-2 mt-3">
                  <button
                    class="btn btn-outline-danger btn-pill"
                    type="button"
                    @click="seleccionarDestinoTransfer(transferBrowser.currentParentId)"
                    :disabled="!transferTargetContratoId"
                  >
                    <i class="bi bi-check2-circle me-1"></i>
                    Usar carpeta abierta
                  </button>
                </div>
              </div>

              <div class="col-12 col-lg-8">
                <div class="transfer-browser card border-0 shadow-sm">
                  <div class="card-body p-3">
                    <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
                      <button
                        class="path-chip"
                        :class="{ active: transferBrowser.currentParentId === '' }"
                        @click="irATransferRaiz"
                        type="button"
                      >
                        Raíz
                      </button>

                      <template v-for="item in transferBreadcrumbs" :key="item.id">
                        <span class="text-muted small">/</span>
                        <button class="path-chip" @click="abrirTransferFolder(item.id)" type="button">
                          {{ item.nombre }}
                        </button>
                      </template>
                    </div>

                    <div v-if="!transferTargetContratoId" class="empty-state compact transfer-empty">
                      <i class="bi bi-diagram-3 fs-3 mb-2"></i>
                      <div class="fw-semibold">Selecciona un contrato destino</div>
                      <small class="text-muted">Así verás solo las carpetas de ese contrato.</small>
                    </div>

                    <div v-else-if="transferCurrentFolders.length === 0" class="empty-state compact transfer-empty">
                      <i class="bi bi-folder2-open fs-3 mb-2"></i>
                      <div class="fw-semibold">No hay subcarpetas aquí</div>
                      <small class="text-muted">Puedes usar este nivel como destino.</small>
                    </div>

                    <div v-else class="transfer-list">
                        <div
                          v-for="folder in transferCurrentFolders"
                          :key="folder.id"
                          class="transfer-row"
                          :class="{ selected: destinoTransferSeleccionado(folder.id) }"
                          @click="abrirTransferFolder(folder.id)"
                        >
                        <div class="transfer-row-main">
                          <div class="transfer-row-icon">
                            <i class="bi bi-folder-fill"></i>
                          </div>
                          <div class="transfer-row-body">
                            <div class="fw-semibold text-truncate">{{ folder.nombre }}</div>
                            <div class="small text-muted text-truncate">
                              {{ cantidadSubcarpetas(folder.id) }} subcarpeta(s) · {{ conteoArchivosPorCarpetaTotal(folder.id) }} docs
                            </div>
                          </div>
                        </div>

                        <button
                          class="btn btn-sm btn-outline-danger btn-pill"
                          type="button"
                          @click.stop="seleccionarDestinoTransfer(folder.id)"
                        >
                          {{
                            transferTarget.mode === 'copiar'
                              ? (destinoTransferSeleccionado(folder.id) ? 'Quitar' : 'Agregar')
                              : 'Elegir'
                          }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import * as bootstrap from "bootstrap";
import { getAuth } from "firebase/auth";
import { db, storage } from "@/firebase/config";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  limit,
  doc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  uploadBytes,
} from "firebase/storage";
const showFilters = ref(true);
const MAX_FILES = 20;
const DIAS_POR_VENCER = 30;

const contratos = ref([]);
const equipos = ref([]);
const carpetas = ref([]);
const documentos = ref([]);

const selectedContratoId = ref("");
const filtroBusqueda = ref("");
const filtroCategoria = ref("");
const filtroFechaInicio = ref("");
const filtroFechaFin = ref("");

const showSuggestions = ref(false);
const currentFolderId = ref("");
const currentFolder = ref(null);
const loadingFolders = ref(false);
const loadingDocs = ref(false);
const uploading = ref(false);
const previewDoc = ref(null);
const previewLoading = ref(false);
const previewRenderKey = ref(0);

const fileInput = ref(null);
const dragActive = ref(false);
const dragHoverFolderId = ref("");

const expandedFolders = ref(new Set());
const selectedFolderIds = ref(new Set());
const lastSelectedFolderIndex = ref(null);

const selectedDocumentIds = ref(new Set());
const lastSelectedDocumentIndex = ref(null);

const actionBusy = ref({
  on: false,
  label: "",
  hint: "",
});

let dragCounter = 0;

const archivosSeleccionados = ref([]);
const uploadTargetFolder = ref(null);

const uploadProgress = ref({
  currentFileName: "",
  currentFileType: "",
  currentFileExt: "",
  currentFilePercent: 0,
  uploadedCount: 0,
  totalCount: 0,
  overallPercent: 0,
});

const deleteTarget = ref({
  type: "",
  id: "",
  nombre: "",
  data: null,
  hijos: 0,
  docs: 0,
});

const transferTarget = ref({
  mode: "",
  folders: [],
  destinoId: "",
  destinoIds: [],
});

const transferTargetContratoId = ref("");

const transferBrowser = ref({
  currentParentId: "",
});

const createFolderBrowser = ref({
  currentParentId: "",
});

const editarCarpetaForm = ref({
  id: "",
  nombre: "",
});

const editarDocumentoForm = ref({
  id: "",
  originalFileName: "",
  fechaInicio: "",
  fechaFin: "",
});

const modalNuevaCarpetaEl = ref(null);
const modalEditarCarpetaEl = ref(null);
const modalEditarDocumentoEl = ref(null);
const modalFiltroFechasEl = ref(null);
const modalSubirArchivoEl = ref(null);
const modalEliminarEl = ref(null);
const modalTransferirEl = ref(null);

let modalNuevaCarpeta = null;
let modalEditarCarpeta = null;
let modalEditarDocumento = null;
let modalFiltroFechas = null;
let modalSubirArchivo = null;
let modalEliminar = null;
let modalTransferir = null;

let folderItemKey = 1;

const nuevaCarpeta = ref({
  contratoId: "",
  parentId: "",
  items: [{ key: folderItemKey++, nombre: "" }],
});

const uploadForm = ref({
  fechaInicio: "",
  fechaFin: "",
});
function toggleFiltros() {
  showFilters.value = !showFilters.value;
}



function handleFolderRowDoubleClick(row, event) {
  const tag = event?.target?.tagName?.toLowerCase?.() || "";
  if (tag === "input" || tag === "button" || tag === "i") return;

  if (expandedFolders.value.has(row.id)) {
    const set = new Set(expandedFolders.value);
    set.delete(row.id);
    expandedFolders.value = set;
  } else if (row.hasChildren) {
    const set = new Set(expandedFolders.value);
    set.add(row.id);
    expandedFolders.value = set;
  }
}
function normalizarFechaComparable(v) {
  if (!v) return null;

  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof v?.toDate === "function") {
    return v.toDate();
  }

  if (v instanceof Date) return v;

  return null;
}

function fechaMs(v) {
  const d = normalizarFechaComparable(v);
  return d ? d.getTime() : 0;
}

function toDateOnly(v) {
  const d = normalizarFechaComparable(v);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}



function ultimoDocumentoPorCarpeta(carpetaId) {
  const ids = [carpetaId, ...obtenerDescendientesIds(carpetaId)];

  const docs = documentos.value
    .filter((d) => ids.includes(d.carpetaId))
    .sort((a, b) => {
      const byCreated = fechaMs(b.createdAt) - fechaMs(a.createdAt);
      if (byCreated !== 0) return byCreated;

      const byFin = fechaMs(b.fechaFin) - fechaMs(a.fechaFin);
      if (byFin !== 0) return byFin;

      return fechaMs(b.updatedAt) - fechaMs(a.updatedAt);
    });

  return docs.length ? docs[0] : null;
}

function mostrarEstadoPropioCarpeta(carpetaId) {
  return carpetaTieneDocumentosDirectos(carpetaId);
}


function nombreUltimoDocumento(carpetaId) {
  const docu = ultimoDocumentoDirectoPorCarpeta(carpetaId);
  return docu?.originalFileName || docu?.nombreArchivo || "Documento";
}

function documentosDirectosDeCarpeta(carpetaId) {
  return documentos.value.filter((d) => d.carpetaId === carpetaId);
}



function documentosDelSubarbol(carpetaId) {
  const ids = [carpetaId, ...obtenerDescendientesIds(carpetaId)];
  return documentos.value.filter((d) => ids.includes(d.carpetaId));
}

function ultimoDocumentoDirectoPorCarpeta(carpetaId) {
  const docs = documentosDirectosDeCarpeta(carpetaId).sort((a, b) => {
    const byCreated = fechaMs(b.createdAt) - fechaMs(a.createdAt);
    if (byCreated !== 0) return byCreated;

    const byFin = fechaMs(b.fechaFin) - fechaMs(a.fechaFin);
    if (byFin !== 0) return byFin;

    return fechaMs(b.updatedAt) - fechaMs(a.updatedAt);
  });

  return docs.length ? docs[0] : null;
}

function carpetaTieneDocumentosDirectos(carpetaId) {
  return documentosDirectosDeCarpeta(carpetaId).length > 0;
}

function resumenEstadosSubarbol(carpetaId) {
  const docs = documentosDelSubarbol(carpetaId);

  const resumen = {
    vencido: 0,
    porVencer: 0,
    vigente: 0,
    sinFecha: 0,
    total: docs.length,
  };

  docs.forEach((docu) => {
    const estado = estadoSemaforoDocumento(docu);

    if (estado === "vencido") resumen.vencido += 1;
    else if (estado === "por-vencer") resumen.porVencer += 1;
    else if (estado === "vigente") resumen.vigente += 1;
    else resumen.sinFecha += 1;
  });

  return resumen;
}


onMounted(async () => {
  if (modalNuevaCarpetaEl.value) modalNuevaCarpeta = new bootstrap.Modal(modalNuevaCarpetaEl.value);
  if (modalEditarCarpetaEl.value) modalEditarCarpeta = new bootstrap.Modal(modalEditarCarpetaEl.value);
  if (modalEditarDocumentoEl.value) modalEditarDocumento = new bootstrap.Modal(modalEditarDocumentoEl.value);
  if (modalFiltroFechasEl.value) modalFiltroFechas = new bootstrap.Modal(modalFiltroFechasEl.value);
  if (modalSubirArchivoEl.value) modalSubirArchivo = new bootstrap.Modal(modalSubirArchivoEl.value);
  if (modalEliminarEl.value) modalEliminar = new bootstrap.Modal(modalEliminarEl.value);
  if (modalTransferirEl.value) modalTransferir = new bootstrap.Modal(modalTransferirEl.value);

  await cargarPerfilUsuario();
  await cargarContratos();

  await Promise.all([
    cargarEquipos(),
    cargarCarpetas(),
    cargarDocumentos(),
  ]);
});


const auth = getAuth();
const currentUser = ref(null);
const currentUserProfile = ref(null);
async function cargarPerfilUsuario() {
  currentUser.value = auth.currentUser || null;
  if (!currentUser.value?.uid) {
    currentUserProfile.value = null;
    return;
  }

  try {
    const refUser = doc(db, "usuarios", currentUser.value.uid);
    const snapUser = await getDoc(refUser);

    if (snapUser.exists()) {
      currentUserProfile.value = { id: snapUser.id, ...snapUser.data() };
      return;
    }

    const altSnap = await getDocs(
      query(collection(db, "users"), where("uid", "==", currentUser.value.uid), limit(1))
    );

    if (!altSnap.empty) {
      currentUserProfile.value = { id: altSnap.docs[0].id, ...altSnap.docs[0].data() };
      return;
    }

    currentUserProfile.value = null;
  } catch (e) {
    console.error("Error cargando perfil usuario:", e);
    currentUserProfile.value = null;
  }
}
function contratosAsignadosUsuario() {
  const arr = Array.isArray(currentUserProfile.value?.contratosAsignados)
    ? currentUserProfile.value.contratosAsignados
    : [];

  const unico = currentUserProfile.value?.contratoId
    ? [String(currentUserProfile.value.contratoId)]
    : [];

  return [...new Set([...arr.map(String), ...unico])];
}

onBeforeUnmount(() => {
  modalNuevaCarpeta?.dispose?.();
  modalEditarCarpeta?.dispose?.();
  modalEditarDocumento?.dispose?.();
  modalFiltroFechas?.dispose?.();
  modalSubirArchivo?.dispose?.();
  modalEliminar?.dispose?.();
  modalTransferir?.dispose?.();
});

function normalizeText(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function extraerRoles(profile) {
  const roles = new Set();

  const directos = [
    profile?.role,
    profile?.rol,
    ...(Array.isArray(profile?.roles) ? profile.roles : []),
  ];

  directos.forEach((r) => {
    const nr = normalizeText(r);
    if (nr) roles.add(nr);
  });

  if (Array.isArray(profile?.memberships)) {
    profile.memberships.forEach((m) => {
      (m?.roles || []).forEach((r) => {
        const nr = normalizeText(r);
        if (nr) roles.add(nr);
      });
    });
  }

  return Array.from(roles);
}


const categoriasDisponibles = computed(() => {
  const set = new Set();

  documentos.value.forEach((d) => {
    const cat = (d.categoria || "").trim();
    if (cat) set.add(cat);
  });

  carpetas.value.forEach((c) => {
    if (!(c.parentId || "")) {
      const nombre = (c.nombre || "").trim();
      if (nombre) set.add(nombre);
    }
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
});

const breadcrumbFolders = computed(() => {
  if (!currentFolderId.value) return [];
  const chain = [];
  let current = carpetas.value.find((x) => x.id === currentFolderId.value) || null;

  while (current) {
    chain.unshift(current);
    current = current.parentId
      ? carpetas.value.find((x) => x.id === current.parentId) || null
      : null;
  }

  return chain;
});

const categoriaUploadDetectada = computed(() => {
  const folder = uploadTargetFolder.value || currentFolder.value;
  if (!folder?.id) return "";
  const root = obtenerCarpetaRaiz(folder.id);
  return root?.nombre || "";
});

const selectedFolderIdsArray = computed(() => Array.from(selectedFolderIds.value));
const selectedDocumentIdsArray = computed(() => Array.from(selectedDocumentIds.value));

const selectedSingleDocument = computed(() => {
  if (selectedDocumentIdsArray.value.length !== 1) return null;
  return documentos.value.find((d) => d.id === selectedDocumentIdsArray.value[0]) || null;
});

const transferForbiddenIds = computed(() => {
  const ids = new Set();
  transferTarget.value.folders.forEach((folder) => {
    ids.add(folder.id);
    obtenerDescendientesIds(folder.id).forEach((id) => ids.add(id));
  });
  return ids;
});

const transferCurrentFolders = computed(() => {
  if (!transferTargetContratoId.value) return [];
  const parentId = transferBrowser.value.currentParentId || "";
  return carpetas.value
    .filter((f) => f.contratoId === transferTargetContratoId.value)
    .filter((f) => (f.parentId || "") === parentId)
    .filter((f) => !transferForbiddenIds.value.has(f.id))
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
});

const transferBreadcrumbs = computed(() => {
  if (!transferBrowser.value.currentParentId) return [];
  const chain = [];
  let current = carpetas.value.find((x) => x.id === transferBrowser.value.currentParentId) || null;

  while (current) {
    chain.unshift(current);
    current = current.parentId
      ? carpetas.value.find((x) => x.id === current.parentId) || null
      : null;
  }

  return chain;
});

const createFolderCurrentFolders = computed(() => {
  if (!nuevaCarpeta.value.contratoId) return [];
  const parentId = createFolderBrowser.value.currentParentId || "";
  return carpetas.value
    .filter((f) => f.contratoId === nuevaCarpeta.value.contratoId)
    .filter((f) => (f.parentId || "") === parentId)
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
});

const createFolderBreadcrumbs = computed(() => {
  if (!createFolderBrowser.value.currentParentId) return [];
  const chain = [];
  let current = carpetas.value.find((x) => x.id === createFolderBrowser.value.currentParentId) || null;

  while (current) {
    chain.unshift(current);
    current = current.parentId
      ? carpetas.value.find((x) => x.id === current.parentId) || null
      : null;
  }

  return chain;
});

const sugerenciasBusqueda = computed(() => {
  const term = (filtroBusqueda.value || "").trim().toLowerCase();
  if (!term) return [];

  const base = documentos.value.map((d) => ({
    label: d.originalFileName || d.nombreArchivo || "Documento",
    sub: `${d.categoria || "Sin categoría"} · ${contratoNombre(d.contratoId)}`,
    value: d.originalFileName || d.nombreArchivo || "",
  }));

  const vistos = new Set();
  return base
    .filter((x) => `${x.label} ${x.sub}`.toLowerCase().includes(term))
    .filter((x) => {
      const key = x.value.toLowerCase();
      if (!key || vistos.has(key)) return false;
      vistos.add(key);
      return true;
    })
    .slice(0, 8);
});

const documentosFiltrados = computed(() => {
  const term = (filtroBusqueda.value || "").trim().toLowerCase();

  return documentos.value.filter((d) => {
    if (!currentFolderId.value || d.carpetaId !== currentFolderId.value) return false;
    if (selectedContratoId.value && d.contratoId !== selectedContratoId.value) return false;
    if (filtroCategoria.value && d.categoria !== filtroCategoria.value) return false;

    if (term) {
      const nombreArchivo = (d.nombreArchivo || "").toLowerCase();
      const originalFileName = (d.originalFileName || "").toLowerCase();
      const categoria = (d.categoria || "").toLowerCase();

      if (
        !nombreArchivo.includes(term) &&
        !originalFileName.includes(term) &&
        !categoria.includes(term)
      ) {
        return false;
      }
    }

    if (filtroFechaInicio.value) {
      const fi = toDateOnly(d.fechaInicio);
      if (!fi || fi < filtroFechaInicio.value) return false;
    }

    if (filtroFechaFin.value) {
      const ff = toDateOnly(d.fechaFin);
      if (!ff || ff > filtroFechaFin.value) return false;
    }

    return true;
  });
});

const visibleTreeRows = computed(() => {
  const rows = [];
  const byParent = new Map();

  const sourceFolders = carpetas.value.filter((c) => {
    return !selectedContratoId.value || c.contratoId === selectedContratoId.value;
  });

  sourceFolders.forEach((folder) => {
    const parent = folder.parentId || "";
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(folder);
  });

  for (const arr of byParent.values()) {
    arr.sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
  }

  const walk = (parentId = "", level = 0) => {
    const children = byParent.get(parentId) || [];
    for (const folder of children) {
      const hasChildren = (byParent.get(folder.id) || []).length > 0;
      const expanded = expandedFolders.value.has(folder.id);
      rows.push({
        id: folder.id,
        folder,
        level,
        hasChildren,
        expanded,
      });

      if (expanded) {
        walk(folder.id, level + 1);
      }
    }
  };

  walk("", 0);
  return rows;
});

async function withBusy(label, hint, fn) {
  actionBusy.value = { on: true, label, hint };
  try {
    return await fn();
  } finally {
    actionBusy.value = { on: false, label: "", hint: "" };
  }
}

async function cargarContratos() {
  const snap = await getDocs(query(collection(db, "contratos")));
  const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const asignados = contratosAsignadosUsuario();

  // Si es admin y no tiene asignados explícitos, ve todos
  if (isAdmin.value && !asignados.length) {
    contratos.value = todos.sort((a, b) =>
      String(a.nombre || a.contrato || a.id).localeCompare(
        String(b.nombre || b.contrato || b.id)
      )
    );

    if (!selectedContratoId.value && contratos.value.length) {
      selectedContratoId.value = contratos.value[0].id;
    }

    return;
  }

  contratos.value = todos
    .filter((c) => asignados.includes(String(c.id)))
    .sort((a, b) =>
      String(a.nombre || a.contrato || a.id).localeCompare(
        String(b.nombre || b.contrato || b.id)
      )
    );

  if (contratos.value.length) {
    if (
      !selectedContratoId.value ||
      !contratos.value.some((c) => c.id === selectedContratoId.value)
    ) {
      selectedContratoId.value = contratos.value[0].id;
    }
  } else {
    selectedContratoId.value = "";
  }
}

async function cargarEquipos() {
  const snap = await getDocs(query(collection(db, "equipos")));
  equipos.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function cargarCarpetas() {
  loadingFolders.value = true;
  try {
    const snap = await getDocs(query(collection(db, "documentos_equipos_carpetas"), orderBy("nombre", "asc")));
    carpetas.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } finally {
    loadingFolders.value = false;
  }
}

async function cargarDocumentos() {
  loadingDocs.value = true;
  try {
    const snap = await getDocs(query(collection(db, "documentos_equipos_archivos"), orderBy("createdAt", "desc")));
    documentos.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } finally {
    loadingDocs.value = false;
  }
}

function onContratoChange() {
  if (!contratos.value.length) {
    selectedContratoId.value = "";
    return;
  }

  const existe = contratos.value.some((c) => c.id === selectedContratoId.value);
  if (!existe) {
    selectedContratoId.value = contratos.value[0].id;
  }

  currentFolderId.value = "";
  currentFolder.value = null;
  previewDoc.value = null;

  selectedFolderIds.value = new Set();
  selectedDocumentIds.value = new Set();

  lastSelectedFolderIndex.value = null;
  lastSelectedDocumentIndex.value = null;
}

function limpiarFiltrosGenerales() {
  selectedContratoId.value = "";
  filtroBusqueda.value = "";
  filtroCategoria.value = "";
  filtroFechaInicio.value = "";
  filtroFechaFin.value = "";
  showSuggestions.value = false;
}

function resetNuevaCarpetaItems() {
  nuevaCarpeta.value.items = [{ key: folderItemKey++, nombre: "" }];
}

function agregarFilaCarpeta() {
  nuevaCarpeta.value.items.push({ key: folderItemKey++, nombre: "" });
}

function eliminarFilaCarpeta(index) {
  if (nuevaCarpeta.value.items.length === 1) return;
  nuevaCarpeta.value.items.splice(index, 1);
}

function abrirModalCarpeta() {
  const folderSeleccionada =
    selectedFolderIdsArray.value.length === 1
      ? carpetas.value.find((f) => f.id === selectedFolderIdsArray.value[0]) || null
      : null;

  nuevaCarpeta.value.contratoId =
    folderSeleccionada?.contratoId ||
    selectedContratoId.value ||
    currentFolder.value?.contratoId ||
    "";

  nuevaCarpeta.value.parentId =
    folderSeleccionada?.id ||
    currentFolderId.value ||
    "";

  resetNuevaCarpetaItems();
  createFolderBrowser.value.currentParentId = nuevaCarpeta.value.parentId || "";
  modalNuevaCarpeta?.show();
}

function abrirModalCarpetaDesdeSeleccion() {
  const folder = carpetas.value.find((f) => f.id === selectedFolderIdsArray.value[0]) || null;

  nuevaCarpeta.value.contratoId =
    folder?.contratoId ||
    selectedContratoId.value ||
    currentFolder.value?.contratoId ||
    "";

  nuevaCarpeta.value.parentId = folder?.id || currentFolderId.value || "";

  resetNuevaCarpetaItems();
  createFolderBrowser.value.currentParentId = nuevaCarpeta.value.parentId || "";
  modalNuevaCarpeta?.show();
}
function abrirModalSubcarpeta(folder) {
  nuevaCarpeta.value.contratoId = folder.contratoId || selectedContratoId.value || "";
  nuevaCarpeta.value.parentId = folder.id;
  resetNuevaCarpetaItems();
  createFolderBrowser.value.currentParentId = folder.id;
  modalNuevaCarpeta?.show();
}

function abrirModalSubcarpetaDesdeSeleccion() {
  if (selectedFolderIdsArray.value.length !== 1) return;
  const folder = carpetas.value.find((f) => f.id === selectedFolderIdsArray.value[0]);
  if (!folder) return;
  abrirModalSubcarpeta(folder);
}

function onCreateFolderContractChange() {
  nuevaCarpeta.value.parentId = "";
  createFolderBrowser.value.currentParentId = "";
}

function irACreateFolderRaiz() {
  createFolderBrowser.value.currentParentId = "";
}

function abrirCreateFolderBrowser(folderId) {
  createFolderBrowser.value.currentParentId = folderId;
}

function seleccionarPadreNuevaCarpeta(folderId) {
  nuevaCarpeta.value.parentId = folderId || "";
}

async function crearCarpetasMultiples() {
  const nombres = nuevaCarpeta.value.items
    .map((x) => (x.nombre || "").trim())
    .filter(Boolean);

  if (!nuevaCarpeta.value.contratoId) {
    alert("Debes seleccionar un contrato.");
    return;
  }

  if (!nombres.length) {
    alert("Debes ingresar al menos un nombre.");
    return;
  }

  await withBusy("Creando carpetas", "Guardando las nuevas carpetas...", async () => {
    let ultimaCreadaId = "";

    for (const nombre of nombres) {
      const docRef = await addDoc(collection(db, "documentos_equipos_carpetas"), {
        nombre,
        contratoId: nuevaCarpeta.value.contratoId,
        parentId: nuevaCarpeta.value.parentId || "",
        createdAt: serverTimestamp(),
      });
      ultimaCreadaId = docRef.id;
    }

    if (nuevaCarpeta.value.parentId) {
      expandedFolders.value.add(nuevaCarpeta.value.parentId);
      expandedFolders.value = new Set(expandedFolders.value);
    }

    modalNuevaCarpeta?.hide();
    await cargarCarpetas();

    if (ultimaCreadaId) {
      const creada = carpetas.value.find((x) => x.id === ultimaCreadaId);
      if (creada) seleccionarCarpeta(creada);
    }
  });
}

function abrirModalEditarCarpeta() {
  if (!canManageFolders.value) {
    alert("No tienes permisos para editar carpetas.");
    return;
  }

  if (selectedFolderIdsArray.value.length !== 1) return;
  const folder = carpetas.value.find((f) => f.id === selectedFolderIdsArray.value[0]);
  if (!folder) return;

  editarCarpetaForm.value = {
    id: folder.id,
    nombre: folder.nombre || "",
  };

  modalEditarCarpeta?.show();
}

async function guardarEdicionCarpeta() {
  if (!canManageFolders.value) {
    alert("No tienes permisos para editar carpetas.");
    return;
  }

  if (!editarCarpetaForm.value.id || !editarCarpetaForm.value.nombre.trim()) {
    alert("Debes ingresar un nombre.");
    return;
  }

  await withBusy("Actualizando carpeta", "Guardando el nuevo nombre...", async () => {
    await updateDoc(doc(db, "documentos_equipos_carpetas", editarCarpetaForm.value.id), {
      nombre: editarCarpetaForm.value.nombre.trim(),
    });

    modalEditarCarpeta?.hide();
    await cargarCarpetas();

    if (currentFolderId.value === editarCarpetaForm.value.id) {
      const updated = carpetas.value.find((f) => f.id === editarCarpetaForm.value.id);
      if (updated) currentFolder.value = updated;
    }
  });
}

function abrirModalEditarDocumento() {
  if (!canManageDocuments.value) {
    alert("No tienes permisos para editar documentos.");
    return;
  }

  if (!selectedSingleDocument.value) return;

  editarDocumentoForm.value = {
    id: selectedSingleDocument.value.id,
    originalFileName: selectedSingleDocument.value.originalFileName || "",
    fechaInicio: formatDate(selectedSingleDocument.value.fechaInicio) || "",
    fechaFin: formatDate(selectedSingleDocument.value.fechaFin) || "",
  };

  modalEditarDocumento?.show();
}

async function guardarEdicionDocumento() {
  if (!canManageDocuments.value) {
    alert("No tienes permisos para editar documentos.");
    return;
  }

  if (!editarDocumentoForm.value.id) return;

  await withBusy("Actualizando documento", "Guardando las fechas del documento...", async () => {
    await updateDoc(doc(db, "documentos_equipos_archivos", editarDocumentoForm.value.id), {
      fechaInicio: editarDocumentoForm.value.fechaInicio || "",
      fechaFin: editarDocumentoForm.value.fechaFin || "",
    });

    modalEditarDocumento?.hide();
    await cargarDocumentos();

    if (previewDoc.value?.id === editarDocumentoForm.value.id) {
      const actualizado = documentos.value.find((d) => d.id === editarDocumentoForm.value.id);
      if (actualizado) previewDoc.value = actualizado;
    }
  });
}

function seleccionarCarpeta(folder) {
  currentFolderId.value = folder.id;
  currentFolder.value = folder;
  previewDoc.value = null;
  previewLoading.value = false;
  limpiarSeleccionDocumentos();

  if (!selectedContratoId.value) {
    selectedContratoId.value = folder.contratoId || "";
  }

  expandirRuta(folder.id);
}

function isFolderSelected(folderId) {
  return selectedFolderIds.value.has(folderId);
}



function limpiarSeleccionCarpetas() {
  selectedFolderIds.value = new Set();
  lastSelectedFolderIndex.value = null;
}

function toggleFolderSelectionOnly(row, index, event) {
  limpiarSeleccionDocumentos();

  const ctrl = event?.ctrlKey || event?.metaKey;
  const shift = event?.shiftKey;

  if (shift && lastSelectedFolderIndex.value !== null) {
    const start = Math.min(lastSelectedFolderIndex.value, index);
    const end = Math.max(lastSelectedFolderIndex.value, index);
    const set = new Set(selectedFolderIds.value);
    for (let i = start; i <= end; i++) {
      set.add(visibleTreeRows.value[i].id);
    }
    selectedFolderIds.value = set;
  } else if (ctrl) {
    const set = new Set(selectedFolderIds.value);
    if (set.has(row.id)) set.delete(row.id);
    else set.add(row.id);
    selectedFolderIds.value = set;
    lastSelectedFolderIndex.value = index;
  } else {
    const set = new Set(selectedFolderIds.value);
    if (set.has(row.id) && set.size === 1) {
      set.clear();
    } else {
      set.clear();
      set.add(row.id);
    }
    selectedFolderIds.value = set;
    lastSelectedFolderIndex.value = index;
  }
}

function handleFolderRowClick(row, index, event) {
  limpiarSeleccionDocumentos();

  const ctrl = event?.ctrlKey || event?.metaKey;
  const shift = event?.shiftKey;

  if (shift && lastSelectedFolderIndex.value !== null) {
    const start = Math.min(lastSelectedFolderIndex.value, index);
    const end = Math.max(lastSelectedFolderIndex.value, index);
    const set = new Set(selectedFolderIds.value);
    for (let i = start; i <= end; i++) {
      set.add(visibleTreeRows.value[i].id);
    }
    selectedFolderIds.value = set;
    lastSelectedFolderIndex.value = index;
  } else if (ctrl) {
    const set = new Set(selectedFolderIds.value);
    if (set.has(row.id)) set.delete(row.id);
    else set.add(row.id);
    selectedFolderIds.value = set;
    lastSelectedFolderIndex.value = index;
  }

  seleccionarCarpeta(row.folder);
}

function toggleFolderExpand(folder) {
  const set = new Set(expandedFolders.value);
  if (set.has(folder.id)) {
    set.delete(folder.id);
  } else {
    set.add(folder.id);
  }
  expandedFolders.value = set;
}

function expandirRuta(folderId) {
  const set = new Set(expandedFolders.value);
  let current = carpetas.value.find((x) => x.id === folderId) || null;

  while (current) {
    set.add(current.id);
    current = current.parentId
      ? carpetas.value.find((x) => x.id === current.parentId) || null
      : null;
  }

  expandedFolders.value = set;
}

function irARaiz() {
  currentFolderId.value = "";
  currentFolder.value = null;
  previewDoc.value = null;
  previewLoading.value = false;
  limpiarSeleccionDocumentos();
}

function isDocumentSelected(docId) {
  return selectedDocumentIds.value.has(docId);
}

function limpiarSeleccionDocumentos() {
  selectedDocumentIds.value = new Set();
  lastSelectedDocumentIndex.value = null;
}

function toggleDocumentSelectionOnly(docu, index, event) {
  limpiarSeleccionCarpetas();

  const ctrl = event?.ctrlKey || event?.metaKey;
  const shift = event?.shiftKey;

  if (shift && lastSelectedDocumentIndex.value !== null) {
    const start = Math.min(lastSelectedDocumentIndex.value, index);
    const end = Math.max(lastSelectedDocumentIndex.value, index);
    const set = new Set(selectedDocumentIds.value);
    for (let i = start; i <= end; i++) {
      set.add(documentosFiltrados.value[i].id);
    }
    selectedDocumentIds.value = set;
  } else if (ctrl) {
    const set = new Set(selectedDocumentIds.value);
    if (set.has(docu.id)) set.delete(docu.id);
    else set.add(docu.id);
    selectedDocumentIds.value = set;
    lastSelectedDocumentIndex.value = index;
  } else {
    const set = new Set(selectedDocumentIds.value);
    if (set.has(docu.id) && set.size === 1) {
      set.clear();
    } else {
      set.clear();
      set.add(docu.id);
    }
    selectedDocumentIds.value = set;
    lastSelectedDocumentIndex.value = index;
  }
}
const isAdmin = computed(() => {
  const roles = extraerRoles(currentUserProfile.value);
  return roles.includes("admin") || roles.includes("administrador");
});
const canManageFolders = computed(() => isAdmin.value);
const canManageDocuments = computed(() => isAdmin.value);

const canCreateFolders = computed(() => true);
const canViewDocuments = computed(() => true);

function handleDocumentRowClick(docu, index, event) {
  limpiarSeleccionCarpetas();

  const ctrl = event?.ctrlKey || event?.metaKey;
  const shift = event?.shiftKey;

  if (shift && lastSelectedDocumentIndex.value !== null) {
    const start = Math.min(lastSelectedDocumentIndex.value, index);
    const end = Math.max(lastSelectedDocumentIndex.value, index);
    const set = new Set(selectedDocumentIds.value);
    for (let i = start; i <= end; i++) {
      set.add(documentosFiltrados.value[i].id);
    }
    selectedDocumentIds.value = set;
  } else if (ctrl) {
    const set = new Set(selectedDocumentIds.value);
    if (set.has(docu.id)) set.delete(docu.id);
    else set.add(docu.id);
    selectedDocumentIds.value = set;
    lastSelectedDocumentIndex.value = index;
  } else {
    selectedDocumentIds.value = new Set([docu.id]);
    lastSelectedDocumentIndex.value = index;
  }
}

function abrirDocumentoSeleccionado() {
  if (!selectedSingleDocument.value) return;

  if (!isAdmin.value) {
    const ultimo = ultimoDocumentoPorCarpeta(selectedSingleDocument.value.carpetaId);
    if (!ultimo || ultimo.id !== selectedSingleDocument.value.id) {
      alert("Solo puedes abrir el último documento cargado en esta carpeta.");
      return;
    }
  }

  window.open(selectedSingleDocument.value.url, "_blank", "noopener");
}

function abrirModalFiltroFechas() {
  if (!currentFolderId.value) return;
  modalFiltroFechas?.show();
}

function limpiarFechas() {
  filtroFechaInicio.value = "";
  filtroFechaFin.value = "";
}

function contratoNombre(id) {
  if (!id) return "-";
  const c = contratos.value.find((x) => x.id === id);
  return c?.nombre || c?.contrato || id;
}

function cantidadSubcarpetas(carpetaId) {
  return carpetas.value.filter((c) => (c.parentId || "") === carpetaId).length;
}

function conteoArchivosPorCarpetaTotal(carpetaId) {
  const ids = [carpetaId, ...obtenerDescendientesIds(carpetaId)];
  return documentos.value.filter((d) => ids.includes(d.carpetaId)).length;
}

function rutaCarpetaTexto(carpetaId) {
  const chain = [];
  let current = carpetas.value.find((x) => x.id === carpetaId) || null;
  while (current) {
    chain.unshift(current.nombre);
    current = current.parentId
      ? carpetas.value.find((x) => x.id === current.parentId) || null
      : null;
  }
  return chain.join(" / ");
}

function obtenerCarpetaRaiz(carpetaId) {
  let current = carpetas.value.find((x) => x.id === carpetaId) || null;
  while (current && current.parentId) {
    current = carpetas.value.find((x) => x.id === current.parentId) || null;
  }
  return current || null;
}

function obtenerDescendientesIds(folderId) {
  const result = [];
  const walk = (id) => {
    const hijos = carpetas.value.filter((c) => (c.parentId || "") === id);
    for (const h of hijos) {
      result.push(h.id);
      walk(h.id);
    }
  };
  walk(folderId);
  return result;
}

function obtenerFoldersSeleccionados() {
  return carpetas.value.filter((f) => selectedFolderIds.value.has(f.id));
}

function obtenerDocumentosSeleccionados() {
  return documentos.value.filter((d) => selectedDocumentIds.value.has(d.id));
}

function obtenerRaicesSeleccionadasFolders() {
  const selected = obtenerFoldersSeleccionados();
  const selectedIds = new Set(selected.map((x) => x.id));

  return selected.filter((folder) => {
    let parentId = folder.parentId || "";
    while (parentId) {
      if (selectedIds.has(parentId)) return false;
      const parent = carpetas.value.find((x) => x.id === parentId);
      parentId = parent?.parentId || "";
    }
    return true;
  });
}

function cerrarSugerenciasConDelay() {
  setTimeout(() => {
    showSuggestions.value = false;
  }, 120);
}

function seleccionarSugerencia(item) {
  filtroBusqueda.value = item.value;
  showSuggestions.value = false;
}

function normalizarListaArchivos(files) {
  return Array.from(files || []).filter((f) => !!f);
}

function prepararArchivos(files, targetFolder = null) {
  const carpetaDestino = targetFolder || currentFolder.value;

  if (!carpetaDestino?.id) {
    alert("Primero selecciona una carpeta.");
    return;
  }

  const lista = normalizarListaArchivos(files);
  if (!lista.length) return;

  archivosSeleccionados.value = lista.length > MAX_FILES ? lista.slice(0, MAX_FILES) : lista;

  if (lista.length > MAX_FILES) {
    alert(`Solo puedes subir un máximo de ${MAX_FILES} archivos a la vez.`);
  }

  uploadTargetFolder.value = carpetaDestino;

  uploadForm.value = {
    fechaInicio: "",
    fechaFin: "",
  };

  modalSubirArchivo?.show();
}

function handleFileSelected(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  prepararArchivos(files, currentFolder.value);
  e.target.value = "";
}

function quitarArchivo(index) {
  archivosSeleccionados.value.splice(index, 1);
}

function onDragEnter() {
  dragCounter++;
  dragActive.value = true;
}

function onDragOver() {
  dragActive.value = true;
}

function onDragLeave() {
  dragCounter--;
  if (dragCounter <= 0) {
    dragActive.value = false;
    dragCounter = 0;
    dragHoverFolderId.value = "";
  }
}

function onFolderDragEnter(folderId) {
  dragActive.value = true;
  dragHoverFolderId.value = folderId;
}

function onFolderDragOver(folderId) {
  dragActive.value = true;
  dragHoverFolderId.value = folderId;
}

function onFolderDragLeave(folderId) {
  if (dragHoverFolderId.value === folderId) {
    dragHoverFolderId.value = "";
  }
}

function onDropFiles(e) {
  dragActive.value = false;
  dragCounter = 0;
  dragHoverFolderId.value = "";

  const files = Array.from(e.dataTransfer?.files || []);
  if (!files.length) return;

  prepararArchivos(files, currentFolder.value);
}

function onDropFilesToFolder(e, folder) {
  dragActive.value = false;
  dragCounter = 0;
  dragHoverFolderId.value = "";

  const files = Array.from(e.dataTransfer?.files || []);
  if (!files.length) return;

  seleccionarCarpeta(folder);
  prepararArchivos(files, folder);
}

function subirArchivoConProgreso(sRef, archivo, onProgress) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(sRef, archivo);

    task.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(percent);
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

async function subirDocumentos() {
  try {
    if (!uploadForm.value.fechaInicio || !uploadForm.value.fechaFin) {
      alert("Debes ingresar fecha inicio y fecha final para subir documentos.");
      return;
    }

    if (uploadForm.value.fechaFin < uploadForm.value.fechaInicio) {
      alert("La fecha final no puede ser menor que la fecha inicio.");
      return;
    }
    if (!archivosSeleccionados.value.length) {
      alert("Selecciona al menos un archivo.");
      return;
    }

    const folder = uploadTargetFolder.value || currentFolder.value;
    if (!folder?.id) {
      alert("Debes seleccionar una carpeta.");
      return;
    }

    uploading.value = true;

    uploadProgress.value = {
      currentFileName: "",
      currentFileType: "",
      currentFileExt: "",
      currentFilePercent: 0,
      uploadedCount: 0,
      totalCount: archivosSeleccionados.value.length,
      overallPercent: 0,
    };

    modalSubirArchivo?.hide();

    const auth = getAuth();
    const user = auth.currentUser;
    const total = archivosSeleccionados.value.length;
    const contratoId = folder.contratoId || "";
    const rootFolder = obtenerCarpetaRaiz(folder.id);
    const categoriaDetectada = rootFolder?.nombre || "";

    for (let i = 0; i < archivosSeleccionados.value.length; i++) {
      const archivo = archivosSeleccionados.value[i];

      uploadProgress.value.currentFileName = archivo.name;
      uploadProgress.value.currentFileType = archivo.type || "desconocido";
      uploadProgress.value.currentFileExt = extensionArchivo(archivo.name);
      uploadProgress.value.currentFilePercent = 0;
      uploadProgress.value.uploadedCount = i;
      uploadProgress.value.overallPercent = Math.round((i / total) * 100);

      const safeName = archivo.name.replace(/\s+/g, "_");
      const path = `documentos_equipos/${contratoId}/${folder.id}/${Date.now()}_${i}_${safeName}`;
      const sRef = storageRef(storage, path);

      const url = await subirArchivoConProgreso(sRef, archivo, (percent) => {
        uploadProgress.value.currentFilePercent = percent;
        uploadProgress.value.overallPercent = Math.min(
          100,
          Math.round(((i + percent / 100) / total) * 100)
        );
      });

      await addDoc(collection(db, "documentos_equipos_archivos"), {
        carpetaId: folder.id,
        contratoId,
        categoria: categoriaDetectada,
        nombreArchivo: "",
        originalFileName: archivo.name,
        storagePath: path,
        url,
        contentType: archivo.type || "",
        extension: extensionArchivo(archivo.name),
        tamanioBytes: archivo.size || 0,
        fechaInicio: uploadForm.value.fechaInicio || "",
        fechaFin: uploadForm.value.fechaFin || "",
        creadoPorUid: user?.uid || "",
        creadoPorEmail: user?.email || "",
        createdAt: serverTimestamp(),
      });

      uploadProgress.value.uploadedCount = i + 1;
      uploadProgress.value.currentFilePercent = 100;
      uploadProgress.value.overallPercent = Math.round(((i + 1) / total) * 100);
    }

    currentFolderId.value = folder.id;
    currentFolder.value = folder;
    archivosSeleccionados.value = [];
    uploadTargetFolder.value = null;
    previewDoc.value = null;
    previewLoading.value = false;

    await cargarDocumentos();
  } catch (error) {
    console.error("Error al subir documentos:", error);
    alert("No se pudieron subir los documentos.");
  } finally {
    uploading.value = false;
    uploadTargetFolder.value = null;
    uploadProgress.value = {
      currentFileName: "",
      currentFileType: "",
      currentFileExt: "",
      currentFilePercent: 0,
      uploadedCount: 0,
      totalCount: 0,
      overallPercent: 0,
    };
  }
}

function prepararEliminarDocumentosSeleccionados() {
  const docs = obtenerDocumentosSeleccionados();
  if (!docs.length) return;

  deleteTarget.value = {
    type: "documentos",
    id: "",
    nombre: "",
    data: docs,
    hijos: 0,
    docs: docs.length,
  };
  modalEliminar?.show();
}

function prepararEliminarCarpetasSeleccionadas() {
  const roots = obtenerRaicesSeleccionadasFolders();
  if (!roots.length) return;

  let totalDocs = 0;
  for (const folder of roots) {
    totalDocs += conteoArchivosPorCarpetaTotal(folder.id);
  }

  deleteTarget.value = {
    type: "carpetas",
    id: "",
    nombre: "",
    data: roots,
    hijos: roots.length,
    docs: totalDocs,
  };
  modalEliminar?.show();
}

async function confirmarEliminar() {
  if (deleteTarget.value.type === "documentos" && Array.isArray(deleteTarget.value.data)) {
    await withBusy("Eliminando documentos", "Quitando archivos y registros seleccionados...", async () => {
      for (const d of deleteTarget.value.data) {
        await eliminarDocumentoReal(d, false);
      }
      await cargarDocumentos();
      limpiarSeleccionDocumentos();
      modalEliminar?.hide();
    });
    return;
  }

  if (deleteTarget.value.type === "carpetas" && Array.isArray(deleteTarget.value.data)) {
    await withBusy("Eliminando carpetas", "Quitando carpetas, subcarpetas y documentos...", async () => {
      for (const folder of deleteTarget.value.data) {
        await eliminarCarpetaRecursiva(folder);
      }
      await Promise.all([cargarCarpetas(), cargarDocumentos()]);
      limpiarSeleccionCarpetas();
      modalEliminar?.hide();
    });
  }
}

function prepararMoverCarpetasSeleccionadas() {
  const folders = obtenerRaicesSeleccionadasFolders();
  if (!folders.length) return;

  const contratoDetectado =
    selectedContratoId.value ||
    currentFolder.value?.contratoId ||
    (folders.length === 1 ? folders[0].contratoId || "" : "");

  const carpetaActualValida =
    currentFolderId.value &&
    carpetas.value.some(
      (f) =>
        f.id === currentFolderId.value &&
        f.contratoId === contratoDetectado
    )
      ? currentFolderId.value
      : "";

  transferTarget.value = {
    mode: "mover",
    folders,
    destinoId: carpetaActualValida,
    destinoIds: [],
  };

  transferTargetContratoId.value = contratoDetectado;
  transferBrowser.value.currentParentId = carpetaActualValida || "";
  modalTransferir?.show();
}

function prepararCopiarCarpetasSeleccionadas() {
  const folders = obtenerRaicesSeleccionadasFolders();
  if (!folders.length) return;

  const contratoDetectado =
    selectedContratoId.value ||
    currentFolder.value?.contratoId ||
    (folders.length === 1 ? folders[0].contratoId || "" : "");

  const carpetaActualValida =
    currentFolderId.value &&
    carpetas.value.some(
      (f) =>
        f.id === currentFolderId.value &&
        f.contratoId === contratoDetectado
    )
      ? currentFolderId.value
      : "";

  transferTarget.value = {
    mode: "copiar",
    folders,
    destinoId: carpetaActualValida,
    destinoIds: carpetaActualValida ? [carpetaActualValida] : [],
  };

  transferTargetContratoId.value = contratoDetectado;
  transferBrowser.value.currentParentId = carpetaActualValida || "";
  modalTransferir?.show();
}

function onTransferContractChange() {
  transferTarget.value.destinoId = "";
  transferTarget.value.destinoIds = [];
  transferBrowser.value.currentParentId = "";
}
function irATransferRaiz() {
  transferBrowser.value.currentParentId = "";
}

function abrirTransferFolder(folderId) {
  transferBrowser.value.currentParentId = folderId;
}

function seleccionarDestinoTransfer(folderId) {
  if (!folderId) return;

  if (transferTarget.value.mode === "copiar") {
    const actuales = new Set(transferTarget.value.destinoIds || []);

    if (actuales.has(folderId)) {
      actuales.delete(folderId);
    } else {
      actuales.add(folderId);
    }

    transferTarget.value.destinoIds = Array.from(actuales);
    transferTarget.value.destinoId = transferTarget.value.destinoIds[0] || "";
    return;
  }

  transferTarget.value.destinoId = folderId;
}

function quitarDestinoTransfer(folderId) {
  if (!folderId) return;

  if (transferTarget.value.mode === "copiar") {
    const actuales = new Set(transferTarget.value.destinoIds || []);
    actuales.delete(folderId);
    transferTarget.value.destinoIds = Array.from(actuales);
    transferTarget.value.destinoId = transferTarget.value.destinoIds[0] || "";
    return;
  }

  if (transferTarget.value.destinoId === folderId) {
    transferTarget.value.destinoId = "";
  }
}

function destinoTransferSeleccionado(folderId) {
  if (transferTarget.value.mode === "copiar") {
    return (transferTarget.value.destinoIds || []).includes(folderId);
  }
  return transferTarget.value.destinoId === folderId;
}

async function confirmarTransferencia() {
  if (!transferTarget.value.folders.length || !transferTargetContratoId.value) return;

  if (transferTarget.value.mode === "mover") {
    if (!transferTarget.value.destinoId) return;

    await withBusy("Moviendo carpetas", "Aplicando el cambio de ubicación.", async () => {
      for (const folder of transferTarget.value.folders) {
        await moverCarpeta(
          folder,
          transferTarget.value.destinoId,
          transferTargetContratoId.value
        );
      }

      modalTransferir?.hide();
      await Promise.all([cargarCarpetas(), cargarDocumentos()]);
    });

    return;
  }

  const destinos = transferTarget.value.destinoIds || [];
  if (!destinos.length) return;

  await withBusy("Copiando carpetas", "Duplicando la estructura y los documentos.", async () => {
    for (const destinoId of destinos) {
      for (const folder of transferTarget.value.folders) {
        await copiarCarpetaCompleta(
          folder,
          destinoId,
          transferTargetContratoId.value
        );
      }
    }

    modalTransferir?.hide();
    await Promise.all([cargarCarpetas(), cargarDocumentos()]);
  });
}

async function moverCarpeta(folder, destinoId, nuevoContratoId) {
  if (folder.id === destinoId) return;
  if (obtenerDescendientesIds(folder.id).includes(destinoId)) return;

  const idsSubtree = [folder.id, ...obtenerDescendientesIds(folder.id)];

  await updateDoc(doc(db, "documentos_equipos_carpetas", folder.id), {
    parentId: destinoId,
    contratoId: nuevoContratoId,
  });

  for (const childId of idsSubtree.slice(1)) {
    await updateDoc(doc(db, "documentos_equipos_carpetas", childId), {
      contratoId: nuevoContratoId,
    });
  }

  const docsToUpdate = documentos.value.filter((d) => idsSubtree.includes(d.carpetaId));
  for (const item of docsToUpdate) {
    await updateDoc(doc(db, "documentos_equipos_archivos", item.id), {
      contratoId: nuevoContratoId,
    });
  }

  expandirRuta(folder.id);
}

async function copiarBlobDesdeUrl(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("No se pudo duplicar el archivo");
  return await resp.blob();
}

async function duplicarDocumento(docu, nuevaCarpetaId, nuevoContratoId, categoriaDestino, idx) {
  const blob = await copiarBlobDesdeUrl(docu.url);
  const originalName = docu.originalFileName || docu.nombreArchivo || `archivo_${idx}`;
  const safeName = originalName.replace(/\s+/g, "_");
  const path = `documentos_equipos/${nuevoContratoId}/${nuevaCarpetaId}/${Date.now()}_copy_${idx}_${safeName}`;
  const sRef = storageRef(storage, path);

  await uploadBytes(sRef, blob);
  const newUrl = await getDownloadURL(sRef);

  await addDoc(collection(db, "documentos_equipos_archivos"), {
    carpetaId: nuevaCarpetaId,
    contratoId: nuevoContratoId,
    categoria: categoriaDestino,
    nombreArchivo: "",
    originalFileName: originalName,
    storagePath: path,
    url: newUrl,
    contentType: docu.contentType || blob.type || "",
    extension: docu.extension || extensionArchivo(originalName),
    tamanioBytes: docu.tamanioBytes || blob.size || 0,
    fechaInicio: docu.fechaInicio || "",
    fechaFin: docu.fechaFin || "",
    creadoPorUid: docu.creadoPorUid || "",
    creadoPorEmail: docu.creadoPorEmail || "",
    createdAt: serverTimestamp(),
  });
}

async function copiarCarpetaRecursiva(sourceFolder, nuevoParentId, nuevoContratoId, categoriaDestino) {
  const newFolderRef = await addDoc(collection(db, "documentos_equipos_carpetas"), {
    nombre: sourceFolder.nombre,
    contratoId: nuevoContratoId,
    parentId: nuevoParentId,
    createdAt: serverTimestamp(),
  });

  const docsDirectos = documentos.value.filter((d) => d.carpetaId === sourceFolder.id);
  for (let i = 0; i < docsDirectos.length; i++) {
    await duplicarDocumento(docsDirectos[i], newFolderRef.id, nuevoContratoId, categoriaDestino, i);
  }

  const hijos = carpetas.value.filter((c) => (c.parentId || "") === sourceFolder.id);
  for (const hijo of hijos) {
    await copiarCarpetaRecursiva(hijo, newFolderRef.id, nuevoContratoId, categoriaDestino);
  }

  return newFolderRef.id;
}

async function copiarCarpetaCompleta(folder, destinoId, nuevoContratoId) {
  const categoriaDestino = obtenerCarpetaRaiz(destinoId)?.nombre || folder.nombre;
  await copiarCarpetaRecursiva(folder, destinoId, nuevoContratoId, categoriaDestino);
}

function verDocumento(docu) {
  if (!docu) return;

  if (!isAdmin.value) {
    const ultimo = ultimoDocumentoPorCarpeta(docu.carpetaId);
    if (!ultimo || ultimo.id !== docu.id) {
      alert("Solo puedes ver el último documento cargado en esta carpeta.");
      return;
    }
  }

  previewLoading.value = true;
  previewDoc.value = docu;
  previewRenderKey.value += 1;
}

function onPreviewLoaded() {
  previewLoading.value = false;
}

function cerrarPreview() {
  previewDoc.value = null;
  previewLoading.value = false;
}

async function eliminarDocumentoReal(docu, recargar = true) {
  if (docu.storagePath) {
    const sRef = storageRef(storage, docu.storagePath);
    try {
      await deleteObject(sRef);
    } catch (e) {
      console.warn("No se pudo borrar archivo de storage:", e);
    }
  }

  await deleteDoc(doc(db, "documentos_equipos_archivos", docu.id));

  if (previewDoc.value?.id === docu.id) {
    previewDoc.value = null;
    previewLoading.value = false;
  }

  const set = new Set(selectedDocumentIds.value);
  set.delete(docu.id);
  selectedDocumentIds.value = set;

  if (recargar) {
    await cargarDocumentos();
  }
}

async function eliminarCarpetaRecursiva(folder) {
  const hijos = carpetas.value.filter((c) => (c.parentId || "") === folder.id);

  for (const hijo of hijos) {
    await eliminarCarpetaRecursiva(hijo);
  }

  const docs = documentos.value.filter((d) => d.carpetaId === folder.id);
  for (const d of docs) {
    if (d.storagePath) {
      const sRef = storageRef(storage, d.storagePath);
      try {
        await deleteObject(sRef);
      } catch (e) {
        console.warn("No se pudo borrar archivo de storage:", e);
      }
    }
    await deleteDoc(doc(db, "documentos_equipos_archivos", d.id));
  }

  await deleteDoc(doc(db, "documentos_equipos_carpetas", folder.id));

  if (currentFolderId.value === folder.id) {
    currentFolderId.value = "";
    currentFolder.value = null;
    previewDoc.value = null;
    previewLoading.value = false;
  }
}

function extensionArchivo(name = "") {
  const parts = String(name).split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
}

function formatearBytes(bytes = 0) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function esPdf(docu) {
  const n = (docu?.originalFileName || docu?.nombreArchivo || "").toLowerCase();
  return n.endsWith(".pdf") || (docu?.contentType || "").includes("pdf");
}

function esImagen(docu) {
  const n = (docu?.originalFileName || docu?.nombreArchivo || "").toLowerCase();
  const ct = docu?.contentType || "";
  return (
    n.endsWith(".png") ||
    n.endsWith(".jpg") ||
    n.endsWith(".jpeg") ||
    n.endsWith(".webp") ||
    ct.startsWith("image/")
  );
}

function iconoDocumento(docu) {
  if (esPdf(docu)) return "bi bi-file-earmark-pdf-fill";
  if (esImagen(docu)) return "bi bi-file-earmark-image-fill";

  const n = (docu?.originalFileName || docu?.nombreArchivo || "").toLowerCase();
  if (n.endsWith(".xls") || n.endsWith(".xlsx")) return "bi bi-file-earmark-excel-fill";
  if (n.endsWith(".doc") || n.endsWith(".docx")) return "bi bi-file-earmark-word-fill";
  return "bi bi-file-earmark-fill";
}

function iconoArchivoLocal(file) {
  const n = (file?.name || "").toLowerCase();
  const t = file?.type || "";

  if (n.endsWith(".pdf") || t.includes("pdf")) return "bi bi-file-earmark-pdf-fill";
  if (
    n.endsWith(".png") ||
    n.endsWith(".jpg") ||
    n.endsWith(".jpeg") ||
    n.endsWith(".webp") ||
    t.startsWith("image/")
  ) return "bi bi-file-earmark-image-fill";
  if (n.endsWith(".xls") || n.endsWith(".xlsx")) return "bi bi-file-earmark-excel-fill";
  if (n.endsWith(".doc") || n.endsWith(".docx")) return "bi bi-file-earmark-word-fill";
  return "bi bi-file-earmark-fill";
}

function formatDate(val) {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (val?.toDate) return val.toDate().toISOString().slice(0, 10);
  return "";
}

function estadoSemaforoDocumento(docu) {
  if (!docu) return "sin-documento";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fin = normalizarFechaComparable(docu.fechaFin);
  if (!fin) return "sin-fecha";

  fin.setHours(0, 0, 0, 0);

  const diffMs = fin.getTime() - hoy.getTime();
  const diffDias = Math.ceil(diffMs / 86400000);

  if (diffDias < 0) return "vencido";
  if (diffDias <= DIAS_POR_VENCER) return "por-vencer";
  return "vigente";
}

function colorCarpetaClase(carpetaId) {
  const docDirecto = ultimoDocumentoDirectoPorCarpeta(carpetaId);

  if (!docDirecto) {
    return {
      "folder-row-vigente": false,
      "folder-row-warning": false,
      "folder-row-danger": false,
      "folder-row-muted": true,
    };
  }

  const estado = estadoSemaforoDocumento(docDirecto);

  return {
    "folder-row-vigente": estado === "vigente",
    "folder-row-warning": estado === "por-vencer",
    "folder-row-danger": estado === "vencido",
    "folder-row-muted": estado === "sin-fecha" || estado === "sin-documento",
  };
}

function iconoCarpetaClase(carpetaId) {
  const docDirecto = ultimoDocumentoDirectoPorCarpeta(carpetaId);
  const estado = docDirecto ? estadoSemaforoDocumento(docDirecto) : "sin-documento";

  return {
    "folder-icon-vigente": estado === "vigente",
    "folder-icon-warning": estado === "por-vencer",
    "folder-icon-danger": estado === "vencido",
    "folder-icon-muted": estado === "sin-fecha" || estado === "sin-documento",
  };
}

function badgeCarpetaClase(carpetaId) {
  const docDirecto = ultimoDocumentoDirectoPorCarpeta(carpetaId);
  const estado = docDirecto ? estadoSemaforoDocumento(docDirecto) : "sin-documento";

  if (estado === "vigente") return "text-bg-success";
  if (estado === "por-vencer") return "text-bg-warning";
  if (estado === "vencido") return "text-bg-danger";
  return "text-bg-secondary";
}
function textoEstadoCarpeta(carpetaId) {
  const estado = estadoSemaforoDocumento(ultimoDocumentoPorCarpeta(carpetaId));

  if (estado === "vigente") return "Vigente";
  if (estado === "por-vencer") return "Por vencer";
  if (estado === "vencido") return "Vencido";
  if (estado === "sin-fecha") return "Sin fecha";
  return "Sin documentos";
}
function normalizarFechaLocal(fechaStr) {
  if (!fechaStr || typeof fechaStr !== "string") return null;
  const [y, m, d] = fechaStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function inicioDelDia(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
const documentosVisibles = computed(() => {
  const base = [...documentosFiltrados.value].sort((a, b) => {
    const byCreated = fechaMs(b.createdAt) - fechaMs(a.createdAt);
    if (byCreated !== 0) return byCreated;

    const byFin = fechaMs(b.fechaFin) - fechaMs(a.fechaFin);
    if (byFin !== 0) return byFin;

    return fechaMs(b.updatedAt) - fechaMs(a.updatedAt);
  });

  if (isAdmin.value) return base;

  return base.length ? [base[0]] : [];
});
function diasParaVencimiento(docu) {
  const fechaFin = normalizarFechaLocal(toDateOnly(docu.fechaFin));
  if (!fechaFin) return null;
  const hoy = inicioDelDia(new Date());
  const diffMs = fechaFin.getTime() - hoy.getTime();
  return Math.ceil(diffMs / 86400000);
}

function estadoDocumento(docu) {
  const dias = diasParaVencimiento(docu);
  if (dias === null) return "sin_fecha";
  if (dias < 0) return "vencido";
  if (dias <= DIAS_POR_VENCER) return "por_vencer";
  return "vigente";
}

function textoEstadoDocumento(docu) {
  const estado = estadoDocumento(docu);
  if (estado === "vigente") return "Vigente";
  if (estado === "por_vencer") return "Por vencer";
  if (estado === "vencido") return "Vencido";
  return "Sin fecha";
}

function badgeEstadoDocumento(docu) {
  const estado = estadoDocumento(docu);
  if (estado === "vigente") return "status-badge-green";
  if (estado === "por_vencer") return "status-badge-yellow";
  if (estado === "vencido") return "status-badge-red";
  return "status-badge-gray";
}

function claseEstadoDocumento(docu) {
  const estado = estadoDocumento(docu);
  if (estado === "vigente") return "doc-card-green";
  if (estado === "por_vencer") return "doc-card-yellow";
  if (estado === "vencido") return "doc-card-red";
  return "doc-card-gray";
}

function claseIconoEstadoDocumento(docu) {
  const estado = estadoDocumento(docu);
  if (estado === "vigente") return "doc-file-icon-green";
  if (estado === "por_vencer") return "doc-file-icon-yellow";
  if (estado === "vencido") return "doc-file-icon-red";
  return "doc-file-icon-gray";
}
</script>

<style scoped>
.doc-page {
  min-height: calc(100vh - 56px);
  background:
    radial-gradient(1100px 500px at 10% 0%, rgba(220, 53, 69, 0.08), transparent 60%),
    radial-gradient(900px 500px at 90% 0%, rgba(13, 110, 253, 0.07), transparent 60%),
    linear-gradient(180deg, #ffffff, #fafafb);
}

.doc-main-content {
  padding-bottom: 8rem;
}

.doc-hero,
.explorer-card,
.preview-priority-card {
  border-radius: 24px;
}

.btn-pill {
  border-radius: 999px;
  font-weight: 800;
}

.tree-toolbar {
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 16px;
  padding: .85rem;
  background: rgba(255,255,255,.7);
}

.path-chip {
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  border-radius: 999px;
  padding: .45rem .8rem;
  font-weight: 700;
  transition: all .18s ease;
}

.path-chip.active {
  background: rgba(220, 53, 69, 0.08);
  border-color: rgba(220, 53, 69, 0.18);
  color: #b21f2d;
}

.tree-list {
  display: flex;
  flex-direction: column;
  gap: .55rem;
  transition: all .2s ease;
}

.tree-list.drag-panel-active {
  outline: 2px dashed rgba(220, 53, 69, 0.24);
  outline-offset: 10px;
  border-radius: 18px;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: .4rem;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 18px;
  padding: .75rem .85rem;
  background: #fff;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background-color .18s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.tree-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.08);
}

.tree-row.active {
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.18);
}

.tree-row.selected {
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.18);
}

.tree-row.drag-folder-target {
  border-color: rgba(25, 135, 84, 0.45);
  box-shadow: 0 0 0 2px rgba(25, 135, 84, 0.18);
  transform: scale(1.01);
}

.tree-row.compact {
  padding: .5rem .6rem;
}

.tree-row.drag-folder-target {
  border-color: rgba(25, 135, 84, 0.35);
  background: rgba(25, 135, 84, 0.08);
  box-shadow: 0 0 0 1px rgba(25, 135, 84, 0.12);
  transform: scale(1.01);
}

.tree-row.compact {
  padding: .45rem .55rem;
}

.tree-indent {
  flex: 0 0 auto;
}

.tree-check,
.doc-check {
  display: flex;
  align-items: center;
  margin: 0 .1rem 0 0;
  z-index: 2;
}

.tree-check .form-check-input,
.doc-check .form-check-input {
  cursor: pointer;
}

.tree-expand-btn {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  border: 0;
  background: rgba(0,0,0,0.04);
  color: #495057;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.tree-expand-btn.invisible {
  opacity: 0;
  pointer-events: none;
}

.tree-main-btn {
  border: 0;
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  gap: .75rem;
  min-width: 0;
  flex: 1;
  text-align: left;
  pointer-events: none;
}

.tree-folder-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 193, 7, 0.16);
  color: #b58100;
  font-size: 1.1rem;
  flex: 0 0 auto;
}

.tree-folder-body {
  min-width: 0;
  flex: 1;
}

.tree-folder-title {
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-folder-meta {
  font-size: .78rem;
  color: #6c757d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-folder-drop-hint {
  margin-top: .2rem;
  font-size: .76rem;
  font-weight: 700;
  color: #198754;
}

.drop-zone {
  border: 2px dashed rgba(220, 53, 69, 0.18);
  border-radius: 22px;
  background: rgba(255,255,255,0.75);
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  transition: all .18s ease;
  text-align: center;
  padding: 1rem;
}

.drop-zone.is-active {
  border-color: rgba(220, 53, 69, 0.45);
  background: rgba(220, 53, 69, 0.05);
  transform: scale(1.01);
}

.drop-zone.is-disabled {
  opacity: .65;
}

.doc-list-compact {
  display: flex;
  flex-direction: column;
  gap: .65rem;
}

.doc-list-item {
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 16px;
  padding: .7rem .8rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  transition: all .18s ease;
  background: #fff;
  cursor: pointer;
}

.doc-list-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(0,0,0,0.05);
}

.doc-list-item.active {
  transform: scale(1.01);
  box-shadow: 0 16px 30px rgba(0,0,0,0.08);
}

.doc-list-item.selected {
  border-color: rgba(13, 110, 253, 0.28);
  background: linear-gradient(180deg, rgba(236,244,255,0.96), #fff);
  box-shadow: 0 0 0 1px rgba(13,110,253,0.08);
}

.doc-list-item.shrink {
  opacity: .72;
  transform: scale(.98);
}

.doc-list-left {
  display: flex;
  align-items: center;
  gap: .75rem;
  min-width: 0;
  flex: 1;
  cursor: pointer;
}

.doc-list-body {
  min-width: 0;
  flex: 1;
}

.doc-list-title {
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-list-meta {
  font-size: .78rem;
  color: #6c757d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-list-actions {
  display: flex;
  align-items: center;
  gap: .5rem;
  flex: 0 0 auto;
}

.doc-card-green {
  border-color: rgba(25, 135, 84, 0.22) !important;
  background: linear-gradient(180deg, rgba(240,253,244,0.9), #fff);
}

.doc-card-yellow {
  border-color: rgba(255, 193, 7, 0.30) !important;
  background: linear-gradient(180deg, rgba(255,248,220,0.95), #fff);
}

.doc-card-red {
  border-color: rgba(220, 53, 69, 0.26) !important;
  background: linear-gradient(180deg, rgba(255,240,240,0.95), #fff);
}

.doc-card-gray {
  border-color: rgba(108, 117, 125, 0.14) !important;
  background: linear-gradient(180deg, rgba(248,249,250,0.95), #fff);
}

.doc-file-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.doc-file-icon.compact {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  font-size: 1rem;
}

.doc-file-icon-green {
  background: rgba(25, 135, 84, 0.14);
  color: #198754;
}

.doc-file-icon-yellow {
  background: rgba(255, 193, 7, 0.18);
  color: #b58100;
}

.doc-file-icon-red {
  background: rgba(220, 53, 69, 0.12);
  color: #dc3545;
}

.doc-file-icon-gray {
  background: rgba(108, 117, 125, 0.12);
  color: #6c757d;
}

.doc-status-badge {
  font-weight: 800;
  font-size: .72rem;
}

.status-badge-green {
  background: rgba(25, 135, 84, 0.14);
  color: #146c43;
  border: 1px solid rgba(25, 135, 84, 0.22);
}

.status-badge-yellow {
  background: rgba(255, 193, 7, 0.18);
  color: #8a5a00;
  border: 1px solid rgba(255, 193, 7, 0.26);
}

.status-badge-red {
  background: rgba(220, 53, 69, 0.12);
  color: #b21f2d;
  border: 1px solid rgba(220, 53, 69, 0.20);
}

.status-badge-gray {
  background: rgba(108, 117, 125, 0.12);
  color: #5c636a;
  border: 1px solid rgba(108, 117, 125, 0.18);
}

.preview-priority-card {
  min-height: 100%;
}

.preview-priority-body {
  min-height: 70vh;
}

.preview-body-wrap {
  position: relative;
}

.preview-header-info {
  display: flex;
  align-items: center;
  gap: .5rem;
  flex-wrap: wrap;
}

.preview-frame-wrap {
  min-height: 72vh;
  border-radius: 18px;
  overflow: hidden;
  background: #f8f9fa;
}

.preview-frame {
  width: 100%;
  min-height: 72vh;
  border: 0;
}

.preview-image-wrap {
  min-height: 72vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-height: 72vh;
  object-fit: contain;
}

.preview-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: rgba(255,255,255,0.78);
  backdrop-filter: blur(2px);
  border-radius: 0 0 24px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.preview-loading-card {
  width: min(340px, 100%);
  text-align: center;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 20px;
  padding: 1.2rem 1rem;
  box-shadow: 0 14px 34px rgba(0,0,0,0.08);
}

.empty-state {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(0,0,0,0.12);
  border-radius: 20px;
  color: #6c757d;
  background: rgba(255,255,255,0.7);
}

.empty-state.compact {
  min-height: 160px;
}

.transfer-empty {
  min-height: 120px;
}

.suggestions-box {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.08);
  overflow: hidden;
}

.suggestion-item {
  width: 100%;
  text-align: left;
  border: 0;
  background: white;
  padding: .8rem .9rem;
  transition: background .12s ease;
}

.suggestion-item:hover {
  background: rgba(220, 53, 69, 0.05);
}

.selected-files {
  display: flex;
  flex-direction: column;
  gap: .55rem;
  max-height: 280px;
  overflow: auto;
}

.selected-file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 14px;
  padding: .75rem .8rem;
  background: #fff;
}

.selected-file-main {
  min-width: 0;
  flex: 1;
}

.multi-folder-list {
  display: flex;
  flex-direction: column;
  gap: .65rem;
}

.multi-folder-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: .6rem;
  align-items: center;
}

.upload-overlay,
.busy-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(17, 24, 39, 0.45);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.upload-modal,
.busy-card {
  width: 100%;
  max-width: 560px;
  border-radius: 24px;
}

.upload-icon-wrap,
.busy-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: rgba(220, 53, 69, 0.12);
  color: #dc3545;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.45rem;
}

.upload-file-name {
  font-weight: 700;
  color: #212529;
}

.progress-lg {
  height: 14px;
  border-radius: 999px;
  overflow: hidden;
  background: #eceef1;
}

.floating-action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 1rem;
  z-index: 2500;
  display: flex;
  justify-content: center;
  padding: 0 1rem;
  pointer-events: none;
}

.floating-card {
  width: min(1100px, 100%);
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 24px;
  padding: .9rem 1rem 1rem;
  pointer-events: auto;
}

.floating-handle {
  width: 56px;
  height: 5px;
  border-radius: 999px;
  background: rgba(0,0,0,0.12);
  margin: 0 auto .8rem;
}

.floating-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  margin-bottom: .9rem;
}

.floating-actions {
  display: flex;
  flex-wrap: wrap;
  gap: .65rem;
}

.transfer-browser {
  border-radius: 20px;
  background: linear-gradient(180deg, #fff, #fafafb);
}

.selected-destination-box {
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 14px;
  padding: .8rem .9rem;
  background: #fff;
  font-weight: 700;
}

.transfer-list {
  display: flex;
  flex-direction: column;
  gap: .65rem;
}

.transfer-row {
  width: 100%;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 16px;
  background: #fff;
  padding: .75rem .85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  transition: all .18s ease;
  cursor: pointer;
}

.transfer-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(0,0,0,0.05);
}

.transfer-row.selected {
  border-color: rgba(220,53,69,0.24);
  background: rgba(220,53,69,0.05);
}

.transfer-row-main {
  display: flex;
  align-items: center;
  gap: .75rem;
  min-width: 0;
  flex: 1;
}

.filters-card {
  overflow: hidden;
  border-radius: 22px;
}

.filters-slide-enter-active,
.filters-slide-leave-active {
  transition: all .24s ease;
  transform-origin: top;
}

.filters-slide-enter-from,
.filters-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scaleY(.96);
  max-height: 0;
  margin-bottom: 0 !important;
}

.filters-slide-enter-to,
.filters-slide-leave-from {
  opacity: 1;
  transform: translateY(0) scaleY(1);
  max-height: 500px;
}

.transfer-row-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 193, 7, 0.16);
  color: #b58100;
  font-size: 1.05rem;
  flex: 0 0 auto;
}

.transfer-row-body {
  min-width: 0;
  flex: 1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity .2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.tree-fade-enter-active,
.tree-fade-leave-active {
  transition: all .2s ease;
}
.tree-fade-enter-from,
.tree-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.bottom-sheet-enter-active,
.bottom-sheet-leave-active {
  transition: all .25s ease;
}

.bottom-sheet-enter-from,
.bottom-sheet-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

@media (max-width: 768px) {
  .doc-main-content {
    padding-bottom: 10rem;
  }

  .floating-card {
    border-radius: 20px;
    padding: .85rem .85rem .95rem;
  }

  .floating-actions .btn,
  .floating-actions a {
    width: 100%;
  }
.folder-row-vigente {
  background: rgba(25, 135, 84, 0.08);
  border-left: 4px solid #198754;
}

.folder-row-warning {
  background: rgba(255, 193, 7, 0.12);
  border-left: 4px solid #ffc107;
}

.folder-row-danger {
  background: rgba(220, 53, 69, 0.10);
  border-left: 4px solid #dc3545;
}

.folder-row-muted {
  background: rgba(108, 117, 125, 0.08);
  border-left: 4px solid #6c757d;
}

.folder-icon-vigente {
  color: #198754;
}

.folder-icon-warning {
  color: #d39e00;
}

.folder-icon-danger {
  color: #dc3545;
}

.folder-icon-muted {
  color: #6c757d;
}
  .transfer-row {
    flex-direction: column;
    align-items: stretch;
  }

  .multi-folder-row {
    grid-template-columns: 1fr auto;
  }
}

.tree-row.folder-row-vigente {
  background: linear-gradient(135deg, rgba(25, 135, 84, 0.20), rgba(25, 135, 84, 0.10));
  border-color: rgba(25, 135, 84, 0.35);
}

.tree-row.folder-row-warning {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.28), rgba(255, 193, 7, 0.12));
  border-color: rgba(255, 193, 7, 0.45);
}

.tree-row.folder-row-danger {
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.24), rgba(220, 53, 69, 0.12));
  border-color: rgba(220, 53, 69, 0.42);
}

.tree-row.folder-row-muted {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.08);
}
.tree-row.folder-row-vigente .tree-folder-title,
.tree-row.folder-row-warning .tree-folder-title,
.tree-row.folder-row-danger .tree-folder-title,
.tree-row.folder-row-muted .tree-folder-title {
  color: #1f2328;
}

.tree-row.folder-row-vigente .tree-folder-meta,
.tree-row.folder-row-warning .tree-folder-meta,
.tree-row.folder-row-danger .tree-folder-meta,
.tree-row.folder-row-muted .tree-folder-meta {
  color: rgba(33, 37, 41, 0.82);
}
.tree-folder-icon.folder-icon-vigente {
  background: rgba(25, 135, 84, 0.22);
  color: #146c43;
}

.tree-folder-icon.folder-icon-warning {
  background: rgba(255, 193, 7, 0.28);
  color: #9a6700;
}

.tree-folder-icon.folder-icon-danger {
  background: rgba(220, 53, 69, 0.24);
  color: #b02a37;
}

.tree-folder-icon.folder-icon-muted {
  background: #f8f9fa;
  color: #bd942b;
}
.tree-row.folder-row-vigente::before,
.tree-row.folder-row-warning::before,
.tree-row.folder-row-danger::before,
.tree-row.folder-row-muted::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 6px;
  border-radius: 18px 0 0 18px;
}

.tree-row.folder-row-vigente::before {
  background: #198754;
}

.tree-row.folder-row-warning::before {
  background: #ffc107;
}

.tree-row.folder-row-danger::before {
  background: #dc3545;
}

.tree-row.folder-row-muted::before {
  background: #bd942b;
}
.tree-row.folder-row-muted {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.08);
}
.transfer-modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.transfer-modal-header .modal-title {
  min-width: 0;
}

.transfer-modal-header .btn-close {
  margin: 0;
}
.tree-folder-icon.folder-icon-muted {
  background: #f8f9fa;
  color: #b8860b;
}

.tree-row.folder-row-muted::before {
  background: transparent;
}
.selected-destination-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: .5rem;
  padding: .35rem 0;
  border-bottom: 1px dashed rgba(0,0,0,0.08);
}

.selected-destination-item:last-child {
  border-bottom: 0;
}

.selected-destination-text {
  min-width: 0;
  flex: 1;
  font-size: .9rem;
  word-break: break-word;
}
.transfer-modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.transfer-modal-header .modal-title {
  min-width: 0;
}

.transfer-modal-header .btn-close {
  margin: 0;
}
.selected-destination-remove {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
</style>