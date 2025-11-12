export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  AGENT = 'AGENT',
  VIEWER = 'VIEWER',
}

export enum RequestType {
  CASH = 'CASH',
  INSTALLMENT = 'INSTALLMENT',
  UNKNOWN = 'UNKNOWN',
}

export enum RequestStatus {
  NOT_ANSWERED = 'NOT_ANSWERED',
  AWAITING_CLIENT = 'AWAITING_CLIENT',
  FOLLOW_UP = 'FOLLOW_UP',
  AWAITING_DOCS = 'AWAITING_DOCS',
  AWAITING_BANK_REP = 'AWAITING_BANK_REP',
  SOLD = 'SOLD',
  NOT_SOLD = 'NOT_SOLD',
}

export enum EmployerType {
  GOVERNMENT = 'GOVERNMENT',
  MILITARY = 'MILITARY',
  PRIVATE_APPROVED = 'PRIVATE_APPROVED',
  PRIVATE_UNAPPROVED = 'PRIVATE_UNAPPROVED',
  RETIRED = 'RETIRED',
}

export enum ObligationType {
  PERSONAL = 'PERSONAL',
  REAL_ESTATE_SUPPORTED = 'REAL_ESTATE_SUPPORTED',
  REAL_ESTATE_UNSUPPORTED = 'REAL_ESTATE_UNSUPPORTED',
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  active: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  name: string
  nationalId?: string
  phonePrimary: string
  phoneSecondary?: string
  email?: string
  city?: string
  address?: string
  source?: string
  notes?: string
  additionalData?: string // JSON string for storing additional client data
  commitments?: string // JSON string for storing client commitments
  createdById: string
  createdAt: string
  updatedAt: string
  createdBy?: User
  comments?: Comment[]
  _count?: {
    requests: number
    attachments: number
    comments: number
  }
}

export interface Obligation {
  type: ObligationType
  description: string
  amount: number
}

export interface InstallmentDetails {
  id: string
  requestId: string
  carName?: string
  carPrice?: number
  additionalFees?: number
  shipping?: number
  registration?: number
  otherAdditions?: number
  plateNumber?: number
  workOrganization?: string
  salary?: number
  salaryBankId?: string
  salaryBank?: Bank
  age?: number
  obligationTypes?: string[]
  deductionPercentage?: number
  obligation1?: number
  obligation2?: number
  visaAmount?: number
  deductedAmount?: number
  finalAmount?: number
  insurancePercentage?: number
  hasServiceStop: boolean
  financingBankId?: string
  financingBank?: Bank
  downPaymentPercentage?: number
  finalPaymentPercentage?: number
  profitMargin?: number
  installmentMonths?: number
  createdAt: string
  updatedAt: string
}

export interface Request {
  id: string
  clientId: string
  title: string
  type: RequestType
  initialStatus: RequestStatus
  currentStatus: RequestStatus
  assignedToId?: string
  price?: number
  customFields?: any
  isArchived: boolean
  createdById: string
  createdAt: string
  updatedAt: string
  client?: Client
  assignedTo?: User
  createdBy?: User
  installmentDetails?: InstallmentDetails
  events?: RequestEvent[]
  comments?: Comment[]
  _count?: {
    attachments: number
    comments: number
    events: number
  }
}

export interface RequestEvent {
  id: string
  requestId: string
  fromStatus?: RequestStatus
  toStatus: RequestStatus
  comment?: string
  changedById: string
  createdAt: string
  changedBy?: User
}

export interface Attachment {
  id: string
  requestId?: string
  clientId?: string
  filename: string
  storagePath: string
  mimeType: string
  uploadedById: string
  uploadedAt: string
  uploadedBy?: User
}

export interface Comment {
  id: string
  requestId?: string
  clientId?: string
  userId: string
  text: string
  createdAt: string
  user?: User
}

export interface Bank {
  id: string
  name: string
  code?: string
  notes?: string
  createdById: string
  createdAt: string
  updatedAt: string
  createdBy?: User
  _count?: {
    installmentDetails: number
  }
}

export interface Formula {
  id: string
  name: string
  expression: string
  description?: string
  active: boolean
  ownerId: string
  version: number
  createdAt: string
  updatedAt: string
  owner?: User
}

export interface AuditLog {
  id: string
  actorId: string
  actionType: string
  targetType: string
  targetId?: string
  details?: any
  createdAt: string
  actor?: User
}

export interface KanbanColumn {
  status: RequestStatus
  title: string
  requests: Request[]
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface ApiResponse<T> {
  data?: T
  pagination?: Pagination
  message?: string
}

export interface LoginRequest {
  email?: string
  phone?: string
  password: string
}

export interface LoginResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface CreateClientRequest {
  name: string
  nationalId?: string
  phonePrimary: string
  phoneSecondary?: string
  email?: string
  city?: string
  address?: string
  source?: string
  notes?: string
  additionalData?: string // JSON string for storing additional client data
  commitments?: string // JSON string for storing client commitments
}

export interface BulkClientEntry {
  name: string
  phonePrimary: string
  notes?: string
}

export interface BulkCreateClientsResponse {
  totalEntries: number
  createdCount: number
  createdClients: Client[]
  duplicates: Array<{
    phone: string
    occurrences: number
    indexes: number[]
    existingClients: Array<{
      id: string
      name: string
      phonePrimary: string
    }>
  }>
  skipped: Array<{
    index: number
    reason: string
  }>
}

export interface CreateRequestRequest {
  clientId: string
  title: string
  type: RequestType
  initialStatus?: RequestStatus
  assignedToId?: string
  price?: number
  customFields?: string
  installmentDetails?: Partial<InstallmentDetails>
}

export interface MoveRequestRequest {
  toStatus: RequestStatus
  comment?: string
  feedback?: string
}

export interface CreateBankRequest {
  name: string
  code?: string
}

export interface CreateFormulaRequest {
  name: string
  expression: string
  description?: string
  active?: boolean
}

export interface EvaluateFormulaRequest {
  variables: Record<string, any>
}
