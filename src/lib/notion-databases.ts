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

export type FieldType = "title" | "number" | "date" | "select" | "status" | "url" | "relation";

export interface FieldConfig {
  name: string;
  property: string;
  type: FieldType;
  required: boolean;
  relationDatabase?: string;
}

export const ACTION_BUTTONS: {
  key: string;
  label: string;
  icon: string;
  databaseId: string;
  fields: FieldConfig[];
}[] = [
  {
    key: "transaccion",
    label: "Transacción",
    icon: "💰",
    databaseId: NOTION_DATABASES.FINANZAS,
    fields: [
      { name: "Concepto", property: "title", type: "title", required: true },
      { name: "Valor", property: "Valor", type: "number", required: true },
      { name: "Fecha Transacción", property: "Fecha Transacción", type: "date", required: false },
      { name: "Categoria", property: "Categoria", type: "select", required: false },
      { name: "Tipo", property: "Tipo", type: "select", required: false },
      { name: "Área", property: "Área", type: "relation", required: false, relationDatabase: NOTION_DATABASES.AREAS },
    ],
  },
  {
    key: "recurso",
    label: "Up Recursos",
    icon: "📎",
    databaseId: NOTION_DATABASES.BRAIN,
    fields: [
      { name: "Nombre", property: "title", type: "title", required: true },
      { name: "Tipo", property: "Tipo", type: "select", required: false },
      { name: "URL", property: "URL", type: "url", required: false },
      { name: "Estado", property: "Estado", type: "select", required: false },
      { name: "Área", property: "Área", type: "relation", required: false, relationDatabase: NOTION_DATABASES.AREAS },
      { name: "Habilidad", property: "Habilidad", type: "relation", required: false, relationDatabase: NOTION_DATABASES.SKILL_TREE },
      { name: "Proyecto", property: "Proyecto", type: "relation", required: false, relationDatabase: NOTION_DATABASES.PROYECTOS },
    ],
  },
  {
    key: "tarea",
    label: "Up Tareas",
    icon: "✅",
    databaseId: NOTION_DATABASES.TAREAS,
    fields: [
      { name: "Nombre", property: "title", type: "title", required: true },
      { name: "Status", property: "Status", type: "status", required: false },
      { name: "Prioridad", property: "Prioridad", type: "select", required: false },
      { name: "Esfuerzo", property: "Esfuerzo", type: "select", required: false },
      { name: "Fecha (Hacer)", property: "Fecha Hacer", type: "date", required: false },
      { name: "Proyecto", property: "Proyecto", type: "relation", required: false, relationDatabase: NOTION_DATABASES.PROYECTOS },
      { name: "Áreas", property: "Áreas", type: "relation", required: false, relationDatabase: NOTION_DATABASES.AREAS },
    ],
  },
];
