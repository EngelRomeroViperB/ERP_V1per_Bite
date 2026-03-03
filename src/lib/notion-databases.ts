export const NOTION_DATABASES = {
  AREAS: "310e69c5-1c9e-80b4-b65d-ccc6b06cabd5",
  SKILL_TREE: "310e69c5-1c9e-80f7-bf94-e21ca3ea7752",
  CRM: "310e69c5-1c9e-8079-ab1c-e9e2543bd045",
  FINANZAS: "310e69c5-1c9e-8022-a99a-cc0950afdb25",
  BRAIN: "310e69c5-1c9e-80c4-bd25-d61eb18a09b6",
  TAREAS: "310e69c5-1c9e-8041-87ba-dfb73ce339ae",
  PROYECTOS: "310e69c5-1c9e-80a8-94c3-c2b754b1ea99",
} as const;

export type NotionDatabaseKey = keyof typeof NOTION_DATABASES;

export const ACTION_BUTTONS = [
  {
    key: "transaccion" as const,
    label: "Transacción",
    icon: "💰",
    databaseId: NOTION_DATABASES.FINANZAS,
    fields: [
      { name: "Concepto", property: "title", type: "title" as const, required: true },
      { name: "Valor", property: "Valor", type: "number" as const, required: true },
      { name: "Fecha Transacción", property: "Fecha Transacción", type: "date" as const, required: false },
      { name: "Categoria", property: "Categoria", type: "select" as const, required: false },
      { name: "Tipo", property: "Tipo", type: "select" as const, required: false },
    ],
  },
  {
    key: "recurso" as const,
    label: "Up Recursos",
    icon: "📎",
    databaseId: NOTION_DATABASES.BRAIN,
    fields: [
      { name: "Nombre", property: "title", type: "title" as const, required: true },
      { name: "Tipo", property: "Tipo", type: "select" as const, required: false },
      { name: "URL", property: "URL", type: "url" as const, required: false },
      { name: "Estado", property: "Estado", type: "select" as const, required: false },
    ],
  },
  {
    key: "tarea" as const,
    label: "Up Tareas",
    icon: "✅",
    databaseId: NOTION_DATABASES.TAREAS,
    fields: [
      { name: "Nombre", property: "title", type: "title" as const, required: true },
      { name: "Prioridad", property: "Prioridad", type: "select" as const, required: false },
      { name: "Esfuerzo", property: "Esfuerzo", type: "select" as const, required: false },
      { name: "Fecha (Hacer)", property: "Fecha (Hacer)", type: "date" as const, required: false },
    ],
  },
] as const;
