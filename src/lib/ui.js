// Clases Tailwind para las piezas de diseño compartidas (contenedores, grillas, filtros, tablas).
// Reemplazan a las mismas claves de `s` (estilosLecheria / EstilosMaquinaria) donde importa el tamaño
// de pantalla. Los colores y detalles visuales de `s` se mantienen igual.
//
// Puntos de quiebre de Tailwind (se aplican DESDE ese ancho hacia arriba):
//   sin prefijo = celular · sm: 640px · md: 768px · lg: 1024px · xl: 1280px
// Media pantalla de un PC suele quedar entre md y lg.
const tw = {
  // Página
  container: "flex flex-col gap-4 md:gap-5",
  topBar: "flex flex-wrap items-start justify-between gap-3",

  // Tarjetas de indicadores: 1 col en celular, 2 en tablet / media pantalla, automático en escritorio
  statsRow: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]",
  cardsGrid: "grid grid-cols-1 gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]",

  // Pestañas: si no caben, se deslizan en vez de ensanchar la página
  tabs: "flex gap-1 overflow-x-auto border-b border-slate-200",
  tab: "shrink-0 cursor-pointer whitespace-nowrap border-b-2 border-transparent bg-transparent px-3 py-2 text-[13px] font-semibold text-slate-400 md:px-4",

  // Filtros y buscador: el buscador ocupa todo el ancho en celular
  filtros: "flex flex-wrap items-center gap-2.5",
  buscador: "flex w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 sm:w-auto sm:min-w-[220px]",
  buscadorInput: "min-w-0 flex-1 border-none bg-transparent py-2 text-[13px] outline-none",

  // Tablas: mantienen un ancho mínimo y se deslizan dentro de su tarjeta en pantallas chicas
  tableCard: "overflow-x-auto rounded-[10px] border border-slate-200 bg-white",
  table: "w-full min-w-[720px] border-collapse",
  th: "whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:px-4",
  td: "border-b border-slate-100 px-3 py-3 align-middle text-[13px] text-slate-700 md:px-4",
  actions: "flex gap-1.5",

  // Formularios: 1 columna en celular y media pantalla angosta, 2 desde md
  formGrid: "grid grid-cols-1 gap-4 md:grid-cols-2",
  modalFooter: "mt-5 flex flex-wrap justify-end gap-2.5",
}

export default tw
