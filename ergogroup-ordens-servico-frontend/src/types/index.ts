export type ServiceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  nao_faturavel?: boolean;
}

export interface RepositoryItem {
  id: string;
  name: string;
  description: string;
}

export interface ServiceItem {
  id: string;
  persistedId?: number;
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: ServiceStatus;
  note?: string;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  description: string;
  services: ServiceItem[];
  status: ServiceStatus;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  isPaid: boolean;
  priority?: 'baixa' | 'media' | 'alta';
  liberadaParaFaturamento?: boolean;
  isContract?: boolean;
}

export interface FinancialSummary {
  totalRevenue: number;
  pendingPayments: number;
  completedOrders: number;
  activeOrders: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: 'admin' | 'user';
  active?: boolean;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  address?: string;
  notes?: string;
  tipo_inscricao?: 'cnpj' | 'cpf' | 'cei' | 'cno' | 'caepf' | 'outro';
  active?: boolean;
  chargeRevisionChange?: boolean;
  tipoCliente?: string;
  representativeName?: string;
  representativeSector?: string;
  representativeEmail?: string;
  representativeContact?: string;
  createdAt?: string;
}

export interface Contact {
  id: string;
  cliente: string;
  nome: string;
  email: string;
  telefone: string;
  setor?: string;
  funcao?: string;
}

export interface EnderecoPF {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface ClientePF {
  id: string;
  nome: string;
  tipo_inscricao: 'cpf';
  numero_inscricao: string;
  telefone_institucional: string;
  email_institucional: string;
  endereco: EnderecoPF;
}

export type CollaboratorStatus = 'pending' | 'in_progress' | 'done';

export interface ServiceCollaborator {
  userId: string;
  status: CollaboratorStatus;
  startedAt?: string;
  completedAt?: string;
  note?: string;
}

export interface ServiceComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  assignedTo?: string;
  done: boolean;
  doneAt?: string;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  createdAt: string;
  createdBy?: string;
}

export interface ServiceItemManagement {
  orderId: string;
  itemId: string;
  collaborators: ServiceCollaborator[];
  comments: ServiceComment[];
  checklists: Checklist[];
}

// API Types
export interface CatalogoServicoDetails {
  id: number;
  criado_por_nome: string;
  atualizado_por_nome: string;
  nome: string;
  descricao: string;
  nao_faturavel: boolean;
  valor: string;
  criado_em: string;
  atualizado_em: string;
  criado_por: number;
  atualizado_por: number;
}

export interface EnderecoDetails {
  id: number;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  criado_em: string;
  atualizado_em: string;
  criado_por: number;
  atualizado_por: number;
}

export interface ClienteDetails {
  id: number;
  endereco: EnderecoDetails;
  nome: string;
  tipo_inscricao: string;
  numero_inscricao: string;
  telefone_institucional: string;
  email_institucional: string;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
  criado_por: number;
  atualizado_por: number;
}

export interface OrdemServicoDetails {
  id: number;
  cliente_details: ClienteDetails;
  data_venda: string;
  status: string;
  valor_total: string;
  data_criacao: string;
  data_atualizacao: string;
  cliente: number;
  criado_por: number;
  atualizado_por: number;
}

export interface ServiceExecution {
  id: number;
  ordem_servico: number;
  repositorio: number | null;
  repositorio_detail: { id: number; nome: string; descricao?: string } | null;
  descricao: string;
  status: string;
  status_display: string;
  data_conclusao: string | null;
}

export interface ServiceListItem {
  id: number;
  cliente_nome: string;
  servico_catalogo_nome: string;
  status: string;
  ordem_servico?: number;
  tem_tarefas?: boolean;
  data_criacao?: string;
}
