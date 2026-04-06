import {
  integer,
  serial,
  varchar,
  pgTable,
  text,
  timestamp,
  boolean,
  json,
  decimal,
  date,
} from "drizzle-orm/pg-core";

// =============================================
// USERS
// =============================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 50 }).$type<"user" | "admin">().default("user").notNull(),
  // EHS-specific fields
  ehsRole: varchar("ehsRole", { length: 50 }).$type<"adm_ehs" | "cliente" | "tecnico" | "apoio">().default("tecnico"),
  phone: varchar("phone", { length: 20 }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  avatarUrl: text("avatarUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// =============================================
// COMPANIES (Empresas)
// =============================================
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 50 }),
  cep: varchar("cep", { length: 20 }),
  address: text("address"),
  neighborhood: varchar("neighborhood", { length: 255 }),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  phones: json("phones").$type<string[]>().default([]),
  email: varchar("email", { length: 320 }),
  emails: json("emails").$type<string[]>().default([]),
  logoUrl: text("logoUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  contractSignedAt: date("contractSignedAt"),
  contractValue: decimal("contractValue", { precision: 15, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// =============================================
// OBRAS (Construction Sites)
// =============================================
export const obras = pgTable("obras", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  cep: varchar("cep", { length: 9 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  phones: json("phones").$type<string[]>().default([]),
  emails: json("emails").$type<string[]>().default([]),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type Obra = typeof obras.$inferSelect;
export type InsertObra = typeof obras.$inferInsert;

// =============================================
// OBRA USERS (Vinculação obra-usuário)
// =============================================
export const obraUsers = pgTable("obra_users", {
  id: serial("id").primaryKey(),
  obraId: integer("obraId").notNull(),
  userId: integer("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ObraUser = typeof obraUsers.$inferSelect;
export type InsertObraUser = typeof obraUsers.$inferInsert;

// =============================================
// COMPANY USERS (Vinculação empresa-usuário com cargo)
// =============================================
export const companyUsers = pgTable("company_users", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  userId: integer("userId").notNull(),
  cargo: varchar("cargo", { length: 50 }).$type<"diretor" | "engenheiro" | "administrativo" | "coordenador" | "equipe_tecnica">().default("equipe_tecnica"),
  isNotificationRecipient: boolean("isNotificationRecipient").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompanyUser = typeof companyUsers.$inferSelect;
export type InsertCompanyUser = typeof companyUsers.$inferInsert;

// =============================================
// CONTRACTS (Contratos)
// =============================================
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  contractNumber: varchar("contractNumber", { length: 100 }),
  signedAt: date("signedAt"),
  description: text("description"),
  fileUrl: text("fileUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

// =============================================
// NRs (Normas Regulamentadoras)
// =============================================
export const nrs = pgTable("nrs", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId"), // If null, it's a global system NR. If set, it's a custom NR.
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NR = typeof nrs.$inferSelect;
export type InsertNR = typeof nrs.$inferInsert;

// =============================================
// CHECK LISTS
// =============================================
export const checkLists = pgTable("check_lists", {
  id: serial("id").primaryKey(),
  nrId: integer("nrId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdById: integer("createdById").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type CheckList = typeof checkLists.$inferSelect;
export type InsertCheckList = typeof checkLists.$inferInsert;

// =============================================
// CHECK LIST ITEMS
// =============================================
export const checkListItems = pgTable("check_list_items", {
  id: serial("id").primaryKey(),
  checkListId: integer("checkListId").notNull(),
  order: integer("order").default(0).notNull(),
  description: text("description").notNull(),
  examplePhotoUrl: text("examplePhotoUrl"),
  isRequired: boolean("isRequired").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type CheckListItem = typeof checkListItems.$inferSelect;
export type InsertCheckListItem = typeof checkListItems.$inferInsert;

// =============================================
// CHECKLIST TEMPLATES (V2)
// =============================================
export const checklistTemplates = pgTable("checklist_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).$type<"estatico" | "dinamico">().default("estatico").notNull(),
  frequencyType: varchar("frequencyType", { length: 50 }).$type<"dias" | "semanas" | "meses">().default("dias").notNull(),
  frequencyValue: integer("frequencyValue").default(0).notNull(), // e.g. 30 (dias)
  isFavorite: boolean("isFavorite").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = typeof checklistTemplates.$inferInsert;

export const checklistTemplateItems = pgTable("checklist_template_items", {
  id: serial("id").primaryKey(),
  templateId: integer("templateId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  norma: varchar("norma", { length: 100 }), // e.g. "NR-18", "NR-35"
  referenceImgUrl: text("referenceImgUrl"),
  order: integer("order").default(0).notNull(),
});

export type ChecklistTemplateItem = typeof checklistTemplateItems.$inferSelect;
export type InsertChecklistTemplateItem = typeof checklistTemplateItems.$inferInsert;

// =============================================
// CHECKLIST EXECUTIONS (V2)
// =============================================
export const checklistExecutions = pgTable("checklist_executions", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  projectId: integer("projectId"), // Optional relation to "obras"
  templateId: integer("templateId").notNull(),
  date: date("date").notNull(), // Target or execution date
  status: varchar("status", { length: 50 }).$type<"pendente" | "concluida">().default("pendente").notNull(),
  createdById: integer("createdById"), // Who actually completed it, if completed
  signatureUrl: text("signatureUrl"),
  score: decimal("score", { precision: 5, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type ChecklistExecution = typeof checklistExecutions.$inferSelect;
export type InsertChecklistExecution = typeof checklistExecutions.$inferInsert;

export const checklistExecutionItems = pgTable("checklist_execution_items", {
  id: serial("id").primaryKey(),
  executionId: integer("executionId").notNull(),
  itemId: integer("itemId").notNull(), // Refers to checklist_template_items.id
  status: varchar("status", { length: 20 }).$type<"OK" | "NÃO OK" | "N/A">(), // Initially null, populated on execution
  observation: text("observation"),
  mediaUrls: json("mediaUrls").$type<string[]>().default([]),
});

export type ChecklistExecutionItem = typeof checklistExecutionItems.$inferSelect;
export type InsertChecklistExecutionItem = typeof checklistExecutionItems.$inferInsert;

// =============================================
// INSPECTIONS (Inspeções / Relatórios)
// =============================================
export const inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  obraId: integer("obraId"),
  checkListId: integer("checkListId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).$type<"nao_iniciada" | "pendente" | "atencao" | "resolvida" | "concluida">().default("nao_iniciada").notNull(),
  inspectedById: integer("inspectedById").notNull(),
  inspectedAt: timestamp("inspectedAt"),
  watermark: varchar("watermark", { length: 255 }),
  usesPreviousReport: boolean("usesPreviousReport").default(false),
  previousInspectionId: integer("previousInspectionId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = typeof inspections.$inferInsert;

// =============================================
// INSPECTION ITEMS (Itens do Relatório)
// =============================================
export const inspectionItems = pgTable("inspection_items", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspectionId").notNull(),
  checkListItemId: integer("checkListItemId"),
  nrId: integer("nrId"),
  title: varchar("title", { length: 255 }),
  situacao: text("situacao"),
  planoAcao: text("planoAcao"),
  observacoes: text("observacoes"),
  status: varchar("status", { length: 50 }).$type<"resolvido" | "pendente" | "atencao" | "previsto">().default("pendente").notNull(),
  resolvedAt: timestamp("resolvedAt"),
  mediaUrls: json("mediaUrls").$type<string[]>().default([]),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type InspectionItem = typeof inspectionItems.$inferSelect;
export type InsertInspectionItem = typeof inspectionItems.$inferInsert;

// =============================================
// INSPECTION NRs (NRs incluídas no relatório)
// =============================================
export const inspectionNrs = pgTable("inspection_nrs", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspectionId").notNull(),
  nrId: integer("nrId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// =============================================
// PGR (Programa de Gestão de Riscos)
// =============================================
export const pgr = pgTable("pgr", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  obraId: integer("obraId"),
  title: varchar("title", { length: 255 }).notNull(),
  version: varchar("version", { length: 20 }).default("1.0"),
  status: varchar("status", { length: 50 }).$type<"em_elaboracao" | "vigente" | "revisao" | "cancelado">().default("em_elaboracao").notNull(),
  validFrom: date("validFrom"),
  validUntil: date("validUntil"),
  responsibleId: integer("responsibleId"),
  content: text("content"),
  fileUrl: text("fileUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type PGR = typeof pgr.$inferSelect;
export type InsertPGR = typeof pgr.$inferInsert;

// =============================================
// PGR STAGES (Etapas da Obra do PGR)
// =============================================
export const pgrStages = pgTable("pgr_stages", {
  id: serial("id").primaryKey(),
  pgrId: integer("pgrId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type PgrStage = typeof pgrStages.$inferSelect;
export type InsertPgrStage = typeof pgrStages.$inferInsert;

// =============================================
// RISK MATRIX (Matriz de Risco do PGR)
// =============================================
export const riskMatrix = pgTable("risk_matrix", {
  id: serial("id").primaryKey(),
  stageId: integer("stageId").notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 50 }).default("media"),     // ex: baixa, media, alta
  probability: varchar("probability", { length: 50 }).default("media"), // ex: raro, provavel, frequente
  mitigation: text("mitigation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type RiskMatrix = typeof riskMatrix.$inferSelect;
export type InsertRiskMatrix = typeof riskMatrix.$inferInsert;

// =============================================
// SUBCONTRACTORS (Empresas Terceiras)
// =============================================
export const subcontractors = pgTable("subcontractors", {
  id: serial("id").primaryKey(),
  stageId: integer("stageId"), // Link via Stage ou PGR
  pgrId: integer("pgrId"),
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 50 }),
  activity: varchar("activity", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Subcontractor = typeof subcontractors.$inferSelect;
export type InsertSubcontractor = typeof subcontractors.$inferInsert;

// =============================================
// ITS (Instrução Técnica de Segurança)
// =============================================
export const its = pgTable("its", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  obraId: integer("obraId"),
  code: varchar("code", { length: 50 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content"),
  status: varchar("status", { length: 50 }).$type<"ativo" | "inativo" | "revisao">().default("ativo").notNull(),
  createdById: integer("createdById").notNull(),
  fileUrl: text("fileUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type ITS = typeof its.$inferSelect;
export type InsertITS = typeof its.$inferInsert;

// =============================================
// PT (Procedimento Técnico)
// =============================================
export const pt = pgTable("pt", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  obraId: integer("obraId"),
  code: varchar("code", { length: 50 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content"),
  status: varchar("status", { length: 50 }).$type<"ativo" | "inativo" | "revisao">().default("ativo").notNull(),
  createdById: integer("createdById").notNull(),
  fileUrl: text("fileUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type PT = typeof pt.$inferSelect;
export type InsertPT = typeof pt.$inferInsert;

// =============================================
// TRAININGS (Treinamentos)
// =============================================
export const trainings = pgTable("trainings", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  nrId: integer("nrId"),
  description: text("description"),
  instructor: varchar("instructor", { length: 255 }),
  trainingDate: date("trainingDate"),
  validityMonths: integer("validityMonths").default(12),
  location: varchar("location", { length: 255 }),
  status: varchar("status", { length: 50 }).$type<"agendado" | "realizado" | "cancelado">().default("agendado").notNull(),
  fileUrl: text("fileUrl"),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type Training = typeof trainings.$inferSelect;
export type InsertTraining = typeof trainings.$inferInsert;

// =============================================
// TRAINING PARTICIPANTS
// =============================================
export const trainingParticipants = pgTable("training_participants", {
  id: serial("id").primaryKey(),
  trainingId: integer("trainingId").notNull(),
  userId: integer("userId").notNull(),
  attended: boolean("attended").default(false),
  signatureUrl: text("signatureUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// =============================================
// APR (Análise Preliminar de Riscos)
// =============================================
export const apr = pgTable("apr", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  obraId: integer("obraId"),
  title: varchar("title", { length: 255 }).notNull(),
  activity: varchar("activity", { length: 255 }),
  location: varchar("location", { length: 255 }),
  date: date("date"),
  status: varchar("status", { length: 50 }).$type<"aberta" | "em_andamento" | "concluida" | "cancelada">().default("aberta").notNull(),
  responsibleId: integer("responsibleId"),
  content: json("content").$type<Record<string, unknown>>().default({}),
  signatureUrl: text("signatureUrl"),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type APR = typeof apr.$inferSelect;
export type InsertAPR = typeof apr.$inferInsert;

// =============================================
// EPI FICHA (Ficha de EPI)
// =============================================
export const epiFicha = pgTable("epi_ficha", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  userId: integer("userId"),
  employeeName: varchar("employeeName", { length: 255 }),
  obraId: integer("obraId"),
  epiName: varchar("epiName", { length: 255 }).notNull(),
  ca: varchar("ca", { length: 50 }),
  quantity: integer("quantity").default(1),
  deliveredAt: date("deliveredAt"),
  validUntil: date("validUntil"),
  reason: text("reason"),
  signatureUrl: text("signatureUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type EpiFicha = typeof epiFicha.$inferSelect;
export type InsertEpiFicha = typeof epiFicha.$inferInsert;

// =============================================
// ADVERTÊNCIAS
// =============================================
export const advertencias = pgTable("advertencias", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  userId: integer("userId"),
  employeeName: varchar("employeeName", { length: 255 }),
  type: varchar("type", { length: 50 }).$type<"verbal" | "escrita" | "suspensao" | "demissao">().default("escrita").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  date: date("date").notNull(),
  witnessId: integer("witnessId"),
  signatureUrl: text("signatureUrl"),
  fileUrl: text("fileUrl"),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type Advertencia = typeof advertencias.$inferSelect;
export type InsertAdvertencia = typeof advertencias.$inferInsert;

// =============================================
// TACTDRIVER
// =============================================
export const tactdriver = pgTable("tactdriver", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  driverName: varchar("driverName", { length: 255 }).notNull(),
  vehiclePlate: varchar("vehiclePlate", { length: 20 }),
  vehicleModel: varchar("vehicleModel", { length: 100 }),
  date: date("date").notNull(),
  score: decimal("score", { precision: 5, scale: 2 }),
  incidents: json("incidents").$type<Record<string, unknown>[]>().default([]),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).$type<"aprovado" | "atencao" | "reprovado">().default("aprovado").notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type Tactdriver = typeof tactdriver.$inferSelect;
export type InsertTactdriver = typeof tactdriver.$inferInsert;

// =============================================
// NOTIFICATIONS
// =============================================
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).$type<"whatsapp" | "email" | "system">().default("system").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  recipientUserId: integer("recipientUserId"),
  recipientCompanyId: integer("recipientCompanyId"),
  sentAt: timestamp("sentAt"),
  readAt: timestamp("readAt"),
  status: varchar("status", { length: 50 }).$type<"pending" | "sent" | "read" | "failed">().default("pending").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// =============================================
// CHAT MESSAGES
// =============================================
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspectionId"),
  senderId: integer("senderId").notNull(),
  recipientId: integer("recipientId"),
  companyId: integer("companyId"),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// =============================================
// ENTERPRISE DOCUMENT ENGINE (V2)
// =============================================

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  obraId: integer("obraId"), // Relacionamento com a obra para puxar o endereço no PDF
  type: varchar("type", { length: 255 }).notNull(), // e.g., 'Relatório Técnico', 'APR'
  status: varchar("status", { length: 50 }).$type<"draft" | "concluido" | "arquivado">().default("draft").notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

export const reportData = pgTable("report_data", {
  id: serial("id").primaryKey(),
  reportId: integer("reportId").notNull(),
  schemaVersion: varchar("schemaVersion", { length: 50 }).default("1.0").notNull(),
  payload: json("payload").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type ReportData = typeof reportData.$inferSelect;
export type InsertReportData = typeof reportData.$inferInsert;

export const reportImages = pgTable("report_images", {
  id: serial("id").primaryKey(),
  reportId: integer("reportId").notNull(),
  section: varchar("section", { length: 255 }).notNull(), // Link to the specific block or item ID
  imageUrl: text("imageUrl").notNull(),
  description: text("description"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReportImage = typeof reportImages.$inferSelect;
export type InsertReportImage = typeof reportImages.$inferInsert;

export const signatures = pgTable("signatures", {
  id: serial("id").primaryKey(),
  reportId: integer("reportId").notNull(),
  role: varchar("role", { length: 100 }).notNull(), // e.g., 'Técnico', 'Gestor'
  name: varchar("name", { length: 255 }).notNull(),
  signatureUrl: text("signatureUrl").notNull(), // Path to canvas image
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Signature = typeof signatures.$inferSelect;
export type InsertSignature = typeof signatures.$inferInsert;

// =============================================
// TACT DRIVE — Gerenciamento de Documentos
// =============================================
export const tactDriveFolders = pgTable("tact_drive_folders", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 30 }).default("blue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type TactDriveFolder = typeof tactDriveFolders.$inferSelect;
export type InsertTactDriveFolder = typeof tactDriveFolders.$inferInsert;

export const tactDriveDocuments = pgTable("tact_drive_documents", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  folderId: integer("folderId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: text("fileUrl"),
  fileName: varchar("fileName", { length: 255 }),
  fileType: varchar("fileType", { length: 100 }),
  hasExpiry: boolean("hasExpiry").default(false).notNull(),
  expiryDate: date("expiryDate"),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type TactDriveDocument = typeof tactDriveDocuments.$inferSelect;
export type InsertTactDriveDocument = typeof tactDriveDocuments.$inferInsert;
