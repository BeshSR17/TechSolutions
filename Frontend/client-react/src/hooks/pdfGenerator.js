// src/utils/pdfGenerator.js

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Paleta corporativa ────────────────────────────────────────────────────────
const COLORS = {
  primary:     [37,  99,  235],   // azul corporativo
  primaryDark: [29,  78,  216],
  accent:      [16,  185, 129],   // verde éxito
  warning:     [245, 158, 11],    // ámbar
  danger:      [239, 68,  68],    // rojo
  purple:      [139, 92,  246],   // morado
  gray100:     [248, 250, 252],
  gray200:     [226, 232, 240],
  gray400:     [148, 163, 184],
  gray600:     [71,  85,  105],
  gray800:     [30,  41,  59],
  white:       [255, 255, 255],
}

// ── Dibuja el encabezado del reporte ─────────────────────────────────────────
function drawHeader(doc, { titulo, subtitulo, accentColor, filtros }) {
  const W = doc.internal.pageSize.getWidth()

  // Banda superior de color
  doc.setFillColor(...accentColor)
  doc.rect(0, 0, W, 28, 'F')

  // Franja decorativa delgada debajo
  doc.setFillColor(...COLORS.gray200)
  doc.rect(0, 28, W, 1.5, 'F')

  // Título en blanco sobre la banda
  doc.setTextColor(...COLORS.white)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, 14, 12)

  // Subtítulo / descripción
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitulo || '', 14, 20)

  // Fecha y hora alineadas a la derecha
  const fechaStr = new Date().toLocaleString('es-GT', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  doc.setFontSize(8)
  doc.text(`Generado: ${fechaStr}`, W - 14, 20, { align: 'right' })

  // Línea de filtros activos (si hay)
  let nextY = 38
  if (filtros && filtros.length > 0) {
    doc.setFillColor(...COLORS.gray100)
    doc.roundedRect(10, 32, W - 20, 10, 2, 2, 'F')
    doc.setFontSize(7.5)
    doc.setTextColor(...COLORS.gray600)
    doc.setFont('helvetica', 'bold')
    doc.text('Filtros aplicados: ', 14, 38.5)
    doc.setFont('helvetica', 'normal')
    doc.text(filtros.join('  •  '), 14 + doc.getTextWidth('Filtros aplicados: '), 38.5)
    nextY = 48
  }

  doc.setTextColor(...COLORS.gray800)
  return nextY
}

// ── Dibuja el pie de página ───────────────────────────────────────────────────
function addPageFooter(doc, pageNumber, totalPages) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  doc.setFillColor(...COLORS.gray200)
  doc.rect(0, H - 12, W, 12, 'F')

  doc.setFontSize(7.5)
  doc.setTextColor(...COLORS.gray400)
  doc.setFont('helvetica', 'normal')
  doc.text('Documento generado automáticamente — uso interno confidencial', 14, H - 4.5)
  doc.text(`Página ${pageNumber} de ${totalPages}`, W - 14, H - 4.5, { align: 'right' })
}

// ── Aplica pie de página a todas las páginas ─────────────────────────────────
function applyFooters(doc) {
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    addPageFooter(doc, i, total)
  }
}

// ── Chips de resumen (fila de KPIs bajo el encabezado) ───────────────────────
function drawSummaryChips(doc, chips, startY) {
  const W = doc.internal.pageSize.getWidth()
  const chipW = (W - 20 - (chips.length - 1) * 4) / chips.length
  let x = 10

  chips.forEach(chip => {
    doc.setFillColor(...chip.bg)
    doc.roundedRect(x, startY, chipW, 14, 2, 2, 'F')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...chip.labelColor)
    doc.text(chip.label.toUpperCase(), x + chipW / 2, startY + 4.5, { align: 'center' })

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...chip.valueColor)
    doc.text(String(chip.value), x + chipW / 2, startY + 11, { align: 'center' })

    x += chipW + 4
  })

  doc.setTextColor(...COLORS.gray800)
  return startY + 20
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERADORES PÚBLICOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reporte de Clientes
 * @param {Array}  clientes        - lista filtrada de clientes
 * @param {Object} stats           - { total, activos, inactivos, sinProyectos }
 * @param {string} filtroActivo    - texto del filtro activo (puede ser null)
 */
export function generarPDFClientes(clientes, stats, filtroActivo) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  const filtros = []
  if (filtroActivo) filtros.push(`Estado: ${filtroActivo}`)
  if (clientes.length !== stats.total) filtros.push(`Mostrando ${clientes.length} de ${stats.total} clientes`)

  let y = drawHeader(doc, {
    titulo: 'Reporte de Clientes',
    subtitulo: 'Listado completo de empresas clientes registradas en el sistema',
    accentColor: COLORS.primary,
    filtros,
  })

  y = drawSummaryChips(doc, [
    { label: 'Total',         value: stats.total,         bg: [239,246,255], labelColor: COLORS.gray600, valueColor: COLORS.primary },
    { label: 'Activos',       value: stats.activos,       bg: [236,253,245], labelColor: COLORS.gray600, valueColor: COLORS.accent  },
    { label: 'Inactivos',     value: stats.inactivos,     bg: [255,241,242], labelColor: COLORS.gray600, valueColor: COLORS.danger  },
    { label: 'Sin Proyectos', value: stats.sinProyectos,  bg: [255,251,235], labelColor: COLORS.gray600, valueColor: COLORS.warning },
  ], y)

  autoTable(doc, {
    startY: y,
    head: [['#', 'Empresa', 'Contacto', 'Correo electrónico', 'Teléfono', 'Estado', 'Proyectos']],
    body: clientes.map((c, i) => [
      i + 1,
      c.empresa || '',
      c.nombre_contacto || '',
      c.email || '',
      c.telefono || '—',
      c.estado || '',
      c.proyectos?.length || 0,
    ]),
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      valign: 'middle',
      textColor: COLORS.gray800,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: COLORS.gray100 },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
    },
    willDrawCell(data) {
        if (data.section !== 'body') return

        if (
            data.column.index === 5
        ) {
            data.cell.text = []
        }
    },
    didDrawCell(data) {
      if (data.section === 'body' && data.column.index === 5) {
        const val = data.cell.raw
        const color = val === 'Activo' ? COLORS.accent : COLORS.danger
        doc.setTextColor(...color)
        doc.setFont('helvetica', 'bold')
        doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center', baseline: 'middle' })
        doc.setTextColor(...COLORS.gray800)
        doc.setFont('helvetica', 'normal')
        
      }
    },
    margin: { left: 10, right: 10, bottom: 16 },
  })

  applyFooters(doc)
  doc.save(`Reporte_Clientes_${_fecha()}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reporte de Proyectos
 */
export function generarPDFProyectos(proyectos, stats, todasLasTareas, filtroActivo) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const filtros = []
  if (filtroActivo) filtros.push(`Estado: ${filtroActivo}`)
  if (proyectos.length !== stats.total) filtros.push(`Mostrando ${proyectos.length} de ${stats.total} proyectos`)

  let y = drawHeader(doc, {
    titulo: 'Reporte de Proyectos',
    subtitulo: 'Resumen ejecutivo de proyectos con avance, fechas y asignación',
    accentColor: COLORS.accent,
    filtros,
  })

  y = drawSummaryChips(doc, [
    { label: 'Total',         value: stats.total,         bg: [239,246,255], labelColor: COLORS.gray600, valueColor: COLORS.primary },
    { label: 'Planificación', value: stats.planificacion, bg: [245,243,255], labelColor: COLORS.gray600, valueColor: COLORS.purple  },
    { label: 'En Progreso',   value: stats.progreso,      bg: [255,251,235], labelColor: COLORS.gray600, valueColor: COLORS.warning },
    { label: 'Finalizados',   value: stats.finalizados,   bg: [236,253,245], labelColor: COLORS.gray600, valueColor: COLORS.accent  },
  ], y)

  const ESTADO_COLOR = {
    'Planificación': COLORS.purple,
    'En Progreso':   COLORS.warning,
    'Finalizado':    COLORS.accent,
    'Cancelado':     COLORS.danger,
  }

  autoTable(doc, {
    startY: y,
    head: [['#', 'Proyecto', 'Cliente', 'Estado', 'Inicio', 'Vencimiento', 'Tareas', 'Responsables', 'Avance']],
    body: proyectos.map((p, i) => {
      const tareas = todasLasTareas.filter(t => t.proyecto_id === p.id)
      const responsables = [...new Set(tareas.map(t => t.perfiles?.nombre).filter(Boolean))].join(', ')
      const avance = tareas.length
        ? Math.round(tareas.reduce((a, t) => a + (t.avance || 0), 0) / tareas.length) : 0
      return [
        i + 1,
        p.nombre_proyecto || '',
        p.clientes?.empresa || '',
        p.estado || '',
        _fmt(p.fecha_inicio),
        _fmt(p.fecha_fin),
        tareas.length,
        responsables || '—',
        `${avance}%`,
      ]
    }),
    styles: {
      fontSize: 8,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      valign: 'middle',
      textColor: COLORS.gray800,
    },
    headStyles: {
      fillColor: COLORS.accent,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: COLORS.gray100 },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      3: { halign: 'center' },
      6: { halign: 'center' },
      8: { halign: 'center' },
    },

    willDrawCell(data) {
        if (data.section !== 'body') return

        if (
            data.column.index === 3
        ) {
            data.cell.text = []
        }
    },

    didDrawCell(data) {
      if (data.section === 'body' && data.column.index === 3) {
        const val = data.cell.raw
        const color = ESTADO_COLOR[val] || COLORS.gray600
        doc.setTextColor(...color)
        doc.setFont('helvetica', 'bold')
        doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center', baseline: 'middle' })
        doc.setTextColor(...COLORS.gray800)
        doc.setFont('helvetica', 'normal')
        
      }
      if (data.section === 'body' && data.column.index === 8) {
        const pct = parseInt(data.cell.raw)
        const barColor = pct >= 75 ? COLORS.accent : pct >= 40 ? COLORS.warning : COLORS.danger
        const bx = data.cell.x + 2
        const by = data.cell.y + data.cell.height - 4.5
        const bw = data.cell.width - 4
        doc.setFillColor(...COLORS.gray200)
        doc.roundedRect(bx, by, bw, 2.5, 1, 1, 'F')
        if (pct > 0) {
          doc.setFillColor(...barColor)
          doc.roundedRect(bx, by, bw * pct / 100, 2.5, 1, 1, 'F')
        }
      }
    },
    margin: { left: 10, right: 10, bottom: 16 },
  })

  applyFooters(doc)
  doc.save(`Reporte_Proyectos_${_fecha()}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reporte de Tareas (Admin o Usuario)
 * @param {string} modo  'admin' | 'usuario'
 */
export function generarPDFTareas(tareas, stats, filtroEstado, filtroPrioridad, modo = 'admin') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const filtros = []
  if (filtroEstado)    filtros.push(`Estado: ${filtroEstado}`)
  if (filtroPrioridad) filtros.push(`Prioridad: ${filtroPrioridad}`)
  if (tareas.length !== stats.total) filtros.push(`Mostrando ${tareas.length} de ${stats.total} tareas`)

  let y = drawHeader(doc, {
    titulo: modo === 'admin' ? 'Reporte de Tareas — Administración' : 'Reporte de Mis Tareas',
    subtitulo: modo === 'admin'
      ? 'Detalle de todas las tareas asignadas con avance y responsables'
      : 'Tareas asignadas a tu usuario con estado y avance actual',
    accentColor: COLORS.primary,
    filtros,
  })

  const adminChips = [
    { label: 'Total',       value: stats.total,      bg: [239,246,255], labelColor: COLORS.gray600, valueColor: COLORS.primary },
    { label: 'Pendiente',   value: stats.pendiente,  bg: [248,250,252], labelColor: COLORS.gray600, valueColor: COLORS.gray600 },
    { label: 'En Progreso', value: stats.progreso,   bg: [239,246,255], labelColor: COLORS.gray600, valueColor: COLORS.primary },
    { label: 'En Revisión', value: stats.revision,   bg: [255,251,235], labelColor: COLORS.gray600, valueColor: COLORS.warning },
    { label: 'Completadas', value: stats.completada, bg: [236,253,245], labelColor: COLORS.gray600, valueColor: COLORS.accent  },
  ]

  const userChips = [
    { label: 'Total',       value: stats.total,      bg: [239,246,255], labelColor: COLORS.gray600, valueColor: COLORS.primary },
    { label: 'Pendiente',   value: stats.pendiente,  bg: [248,250,252], labelColor: COLORS.gray600, valueColor: COLORS.gray600 },
    { label: 'En Curso',    value: stats.enProgreso, bg: [239,246,255], labelColor: COLORS.gray600, valueColor: COLORS.primary },
    { label: 'En Revisión', value: stats.enRevision, bg: [255,251,235], labelColor: COLORS.gray600, valueColor: COLORS.warning },
    { label: '⚠ Urgentes',  value: stats.urgentes,   bg: [255,241,242], labelColor: COLORS.gray600, valueColor: COLORS.danger  },
  ]

  y = drawSummaryChips(doc, modo === 'admin' ? adminChips : userChips, y)

  const PRIORIDAD_COLOR = {
    'Urgente': COLORS.danger,
    'Alta':    [249, 115, 22],
    'Media':   COLORS.warning,
    'Baja':    COLORS.accent,
  }
  const ESTADO_COLOR = {
    'Pendiente':   COLORS.gray400,
    'En Progreso': COLORS.primary,
    'En Revisión': COLORS.warning,
    'Completada':  COLORS.accent,
  }

  const headAdmin = ['#', 'Código', 'Título', 'Proyecto', 'Cliente', 'Responsable', 'Estado', 'Prioridad', 'Avance', 'Límite']
  const headUser  = ['#', 'Código', 'Título', 'Proyecto', 'Estado', 'Prioridad', 'Avance', 'Fecha Inicio', 'Fecha Límite']

  const bodyAdmin = tareas.map((t, i) => [
    i + 1,
    t.codigo_serie || '',
    t.titulo || '',
    t.proyectos?.nombre_proyecto || '',
    t.proyectos?.clientes?.empresa || '',
    t.perfiles?.nombre || '',
    t.estado || '',
    t.prioridad || '',
    `${t.avance || 0}%`,
    _fmt(t.fecha_finalizacion),
  ])

  const bodyUser = tareas.map((t, i) => [
    i + 1,
    t.codigo_serie || '',
    t.titulo || '',
    t.proyectos?.nombre_proyecto || '',
    t.estado || '',
    t.prioridad || '',
    `${t.avance || 0}%`,
    _fmt(t.fecha_inicio),
    _fmt(t.fecha_finalizacion),
  ])

  const estadoColIdx  = modo === 'admin' ? 6 : 4
  const prioColIdx    = modo === 'admin' ? 7 : 5
  const avanceColIdx  = modo === 'admin' ? 8 : 6

  autoTable(doc, {
    startY: y,
    head: [modo === 'admin' ? headAdmin : headUser],
    body: modo === 'admin' ? bodyAdmin : bodyUser,
    styles: {
      fontSize: 7.8,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      valign: 'middle',
      textColor: COLORS.gray800,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 7.8,
    },
    alternateRowStyles: { fillColor: COLORS.gray100 },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      [estadoColIdx]:  { halign: 'center' },
      [prioColIdx]:    { halign: 'center' },
      [avanceColIdx]:  { halign: 'center' },
    },

    willDrawCell(data) {
        if (data.section !== 'body') return

        if (
            data.column.index === estadoColIdx ||
            data.column.index === prioColIdx
        ) {
            data.cell.text = []
        }
    },

    didDrawCell(data) {
      if (data.section !== 'body') return

      // Color estado
      if (data.column.index === estadoColIdx) {
        const val   = data.cell.raw
        const color = ESTADO_COLOR[val] || COLORS.gray600
        doc.setTextColor(...color)
        doc.setFont('helvetica', 'bold')
        doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center', baseline: 'middle' })
        doc.setTextColor(...COLORS.gray800)
        doc.setFont('helvetica', 'normal')
        
      }

      // Color prioridad
      if (data.column.index === prioColIdx) {
        const val   = data.cell.raw
        const color = PRIORIDAD_COLOR[val] || COLORS.gray600
        doc.setTextColor(...color)
        doc.setFont('helvetica', 'bold')
        doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center', baseline: 'middle' })
        doc.setTextColor(...COLORS.gray800)
        doc.setFont('helvetica', 'normal')
        
      }

      // Barra de avance
      if (data.column.index === avanceColIdx) {
        const pct     = parseInt(data.cell.raw)
        const barColor = pct >= 75 ? COLORS.accent : pct >= 40 ? COLORS.warning : COLORS.danger
        const bx = data.cell.x + 2
        const bw = data.cell.width - 4
        const by = data.cell.y + data.cell.height - 4.5
        doc.setFillColor(...COLORS.gray200)
        doc.roundedRect(bx, by, bw, 2.5, 1, 1, 'F')
        if (pct > 0) {
          doc.setFillColor(...barColor)
          doc.roundedRect(bx, by, bw * pct / 100, 2.5, 1, 1, 'F')
        }
      }
    },
    margin: { left: 10, right: 10, bottom: 16 },
  })

  applyFooters(doc)
  const nombre = modo === 'admin' ? 'Reporte_Tareas' : 'Mis_Tareas'
  doc.save(`${nombre}_${_fecha()}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reporte de proyectos del cliente (vista Cliente)
 * @param {Object} cliente   - datos del cliente { empresa, nombre_contacto, email }
 * @param {Array}  proyectos - proyectos filtrados del cliente con _tareas incluidas
 */
export function generarPDFClienteProyectos(cliente, proyectos) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  let y = drawHeader(doc, {
    titulo: `Estado de Proyectos — ${cliente.empresa}`,
    subtitulo: `Contacto: ${cliente.nombre_contacto}  ·  ${cliente.email}`,
    accentColor: COLORS.primary,
    filtros: [],
  })

  // KPIs de proyectos
  const totalTareas    = proyectos.reduce((a, p) => a + (p._tareas?.length || 0), 0)
  const avancePromedio = proyectos.length
    ? Math.round(proyectos.reduce((a, p) => {
        const t = p._tareas || []
        const av = t.length ? Math.round(t.reduce((s, x) => s + (x.avance || 0), 0) / t.length) : 0
        return a + av
      }, 0) / proyectos.length) : 0

  y = drawSummaryChips(doc, [
    { label: 'Proyectos',      value: proyectos.length, bg: [239,246,255], labelColor: COLORS.gray600, valueColor: COLORS.primary },
    { label: 'Total de Tareas',value: totalTareas,      bg: [248,250,252], labelColor: COLORS.gray600, valueColor: COLORS.gray600 },
    { label: 'Avance Global',  value: `${avancePromedio}%`, bg: [236,253,245], labelColor: COLORS.gray600, valueColor: COLORS.accent },
    { label: 'En Progreso',    value: proyectos.filter(p => p.estado === 'En Progreso').length,  bg: [255,251,235], labelColor: COLORS.gray600, valueColor: COLORS.warning },
    { label: 'Finalizados',    value: proyectos.filter(p => p.estado === 'Finalizado').length,   bg: [236,253,245], labelColor: COLORS.gray600, valueColor: COLORS.accent  },
  ], y)

  const ESTADO_COLOR = {
    'Planificación': COLORS.purple,
    'En Progreso':   COLORS.warning,
    'Finalizado':    COLORS.accent,
    'Cancelado':     COLORS.danger,
  }

  autoTable(doc, {
    startY: y,
    head: [['#', 'Proyecto', 'Estado', 'Inicio', 'Vencimiento', 'Tareas', 'Completadas', 'En Progreso', 'Avance', 'Responsables']],
    body: proyectos.map((p, i) => {
      const tareas = p._tareas || []
      const completadas = tareas.filter(t => t.estado === 'Completada').length
      const enProgreso  = tareas.filter(t => t.estado === 'En Progreso').length
      const avance = tareas.length
        ? Math.round(tareas.reduce((a, t) => a + (t.avance || 0), 0) / tareas.length) : 0
      const responsables = [...new Set(tareas.map(t => t.perfiles?.nombre).filter(Boolean))].join(', ')
      return [
        i + 1,
        p.nombre_proyecto || '',
        p.estado || '',
        _fmt(p.fecha_inicio),
        _fmt(p.fecha_fin),
        tareas.length,
        completadas,
        enProgreso,
        `${avance}%`,
        responsables || '—',
      ]
    }),
    styles: {
      fontSize: 8,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      valign: 'middle',
      textColor: COLORS.gray800,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: COLORS.gray100 },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      2: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'center' },
    },

    willDrawCell(data){
        if(data.section !== 'body') return

        if(
            data.column.index === estadoColIdx ||
            data.column.index === prioColIdx
        ){
            data.cell.text = []
        }
    },

    didDrawCell(data) {
      if (data.section !== 'body') return
      if (data.column.index === 2) {
        const val   = data.cell.raw
        const color = ESTADO_COLOR[val] || COLORS.gray600
        doc.setTextColor(...color)
        doc.setFont('helvetica', 'bold')
        doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center', baseline: 'middle' })
        doc.setTextColor(...COLORS.gray800)
        doc.setFont('helvetica', 'normal')
        
      }
      if (data.column.index === 8) {
        const pct = parseInt(data.cell.raw)
        const barColor = pct >= 75 ? COLORS.accent : pct >= 40 ? COLORS.warning : COLORS.danger
        const bx = data.cell.x + 2
        const bw = data.cell.width - 4
        const by = data.cell.y + data.cell.height - 4.5
        doc.setFillColor(...COLORS.gray200)
        doc.roundedRect(bx, by, bw, 2.5, 1, 1, 'F')
        if (pct > 0) {
          doc.setFillColor(...barColor)
          doc.roundedRect(bx, by, bw * pct / 100, 2.5, 1, 1, 'F')
        }
      }
    },
    margin: { left: 10, right: 10, bottom: 16 },
  })

  applyFooters(doc)
  doc.save(`Proyectos_${cliente.empresa.replace(/\s+/g, '_')}_${_fecha()}.pdf`)
}

/**
 * Reporte de tareas de un proyecto específico (vista Cliente)
 */
export function generarPDFClienteTareas(cliente, proyecto, tareas) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  let y = drawHeader(doc, {
    titulo: `Tareas — ${proyecto.nombre_proyecto}`,
    subtitulo: `Cliente: ${cliente.empresa}  ·  Estado del proyecto: ${proyecto.estado}`,
    accentColor: COLORS.accent,
    filtros: [],
  })

  const avance = tareas.length
    ? Math.round(tareas.reduce((a, t) => a + (t.avance || 0), 0) / tareas.length) : 0

  y = drawSummaryChips(doc, [
    { label: 'Total Tareas',  value: tareas.length,                                            bg: [239,246,255], labelColor: COLORS.gray600, valueColor: COLORS.primary },
    { label: 'Completadas',   value: tareas.filter(t => t.estado === 'Completada').length,    bg: [236,253,245], labelColor: COLORS.gray600, valueColor: COLORS.accent  },
    { label: 'En Progreso',   value: tareas.filter(t => t.estado === 'En Progreso').length,   bg: [255,251,235], labelColor: COLORS.gray600, valueColor: COLORS.warning },
    { label: 'Pendientes',    value: tareas.filter(t => t.estado === 'Pendiente').length,     bg: [248,250,252], labelColor: COLORS.gray600, valueColor: COLORS.gray600 },
    { label: 'Avance Global', value: `${avance}%`,                                            bg: [236,253,245], labelColor: COLORS.gray600, valueColor: COLORS.accent  },
  ], y)

  const ESTADO_COLOR = {
    'Pendiente':   COLORS.gray400,
    'En Progreso': COLORS.primary,
    'En Revisión': COLORS.warning,
    'Completada':  COLORS.accent,
  }
  const PRIORIDAD_COLOR = {
    'Urgente': COLORS.danger,
    'Alta':    [249, 115, 22],
    'Media':   COLORS.warning,
    'Baja':    COLORS.accent,
  }

  autoTable(doc, {
    startY: y,
    head: [['#', 'Código', 'Título', 'Responsable', 'Estado', 'Prioridad', 'Avance', 'Inicio', 'Vencimiento', 'Completada']],
    body: tareas.map((t, i) => [
      i + 1,
      t.codigo_serie || '',
      t.titulo || '',
      t.perfiles?.nombre || '—',
      t.estado || '',
      t.prioridad || '',
      `${t.avance || 0}%`,
      _fmt(t.fecha_inicio),
      _fmt(t.fecha_finalizacion),
      t.fecha_completada ? _fmt(t.fecha_completada) : '—',
    ]),
    styles: {
      fontSize: 8,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      valign: 'middle',
      textColor: COLORS.gray800,
    },
    headStyles: {
      fillColor: COLORS.accent,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: COLORS.gray100 },
    columnStyles: {
      0: { cellWidth: 7,  halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
    },

    willDrawCell(data){
        if(data.section !== 'body') return

        if(
            data.column.index === estadoColIdx ||
            data.column.index === prioColIdx
        ){
            data.cell.text = []
        }
    },

    didDrawCell(data) {
      if (data.section !== 'body') return
      if (data.column.index === 4) {
        const val = data.cell.raw
        const color = ESTADO_COLOR[val] || COLORS.gray600
        doc.setTextColor(...color)
        doc.setFont('helvetica', 'bold')
        doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center', baseline: 'middle' })
        doc.setTextColor(...COLORS.gray800)
        doc.setFont('helvetica', 'normal')
        
      }
      if (data.column.index === 5) {
        const val = data.cell.raw
        const color = PRIORIDAD_COLOR[val] || COLORS.gray600
        doc.setTextColor(...color)
        doc.setFont('helvetica', 'bold')
        doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center', baseline: 'middle' })
        doc.setTextColor(...COLORS.gray800)
        doc.setFont('helvetica', 'normal')
        
      }
      if (data.column.index === 6) {
        const pct = parseInt(data.cell.raw)
        const barColor = pct >= 75 ? COLORS.accent : pct >= 40 ? COLORS.warning : COLORS.danger
        const bx = data.cell.x + 2
        const bw = data.cell.width - 4
        const by = data.cell.y + data.cell.height - 4.5
        doc.setFillColor(...COLORS.gray200)
        doc.roundedRect(bx, by, bw, 2.5, 1, 1, 'F')
        if (pct > 0) {
          doc.setFillColor(...barColor)
          doc.roundedRect(bx, by, bw * pct / 100, 2.5, 1, 1, 'F')
        }
      }
    },
    margin: { left: 10, right: 10, bottom: 16 },
  })

  applyFooters(doc)
  doc.save(`Tareas_${proyecto.nombre_proyecto.replace(/\s+/g, '_')}_${_fecha()}.pdf`)
}

// ── Helpers internos ──────────────────────────────────────────────────────────
function _fmt(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function _fecha() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
}