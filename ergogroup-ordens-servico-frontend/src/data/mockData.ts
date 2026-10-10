import { Service, ServiceOrder, ServiceStatus } from '@/types';

export const services: Service[] = [
  { id: '1', name: 'Manutenção Preventiva', description: 'Verificação e manutenção geral do equipamento', price: 150 },
  { id: '2', name: 'Reparo de Hardware', description: 'Diagnóstico e reparo de componentes físicos', price: 250 },
  { id: '3', name: 'Instalação de Software', description: 'Instalação e configuração de programas', price: 80 },
  { id: '4', name: 'Backup de Dados', description: 'Backup completo e seguro dos dados', price: 120 },
  { id: '5', name: 'Limpeza Técnica', description: 'Limpeza interna e externa do equipamento', price: 60 },
  { id: '6', name: 'Consultoria TI', description: 'Análise e recomendações técnicas', price: 200 },
];

export const clients = [
  { id: 'c1', name: 'João Silva', email: 'joao@email.com', phone: '(11) 99999-1111' },
  { id: 'c2', name: 'Maria Santos', email: 'maria@email.com', phone: '(11) 99999-2222' },
  { id: 'c3', name: 'Pedro Oliveira', email: 'pedro@email.com', phone: '(11) 99999-3333' },
  { id: 'c4', name: 'Ana Costa', email: 'ana@email.com', phone: '(11) 99999-4444' },
  { id: 'c5', name: 'Lucas Almeida', email: 'lucas@email.com', phone: '(11) 99999-5555' },
  { id: 'c6', name: 'Carla Pereira', email: 'carla@email.com', phone: '(11) 99999-6666' },
  { id: 'c7', name: 'Rafael Souza', email: 'rafael@email.com', phone: '(11) 99999-7777' },
  { id: 'c8', name: 'Beatriz Lima', email: 'beatriz@email.com', phone: '(11) 99999-8888' },
  { id: 'c9', name: 'Fernanda Rocha', email: 'fernanda@email.com', phone: '(21) 98888-1111' },
  { id: 'c10', name: 'Gustavo Mendes', email: 'gustavo@email.com', phone: '(21) 98888-2222' },
  { id: 'c11', name: 'Patrícia Duarte', email: 'patricia@email.com', phone: '(31) 97777-3333' },
  { id: 'c12', name: 'Renato Martins', email: 'renato@email.com', phone: '(31) 97777-4444' },
];

export const contacts = [
  { id: 'ct1', name: 'Financeiro - João', email: 'financeiro.joao@empresa.com' },
  { id: 'ct2', name: 'Financeiro - Maria', email: 'financeiro.maria@empresa.com' },
  { id: 'ct3', name: 'Contabilidade - Pedro', email: 'contab.pedro@empresa.com' },
  { id: 'ct4', name: 'Fiscal - Ana', email: 'fiscal.ana@empresa.com' },
];

const pickStatus = (i: number): ServiceStatus => {
  const arr: ServiceStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
  return arr[i % arr.length];
};

const buildServiceItems = (seed: number): { items: ServiceOrder['services']; orderStatus: ServiceStatus } => {
  const itemsCount = (seed % 3) + 1;
  const items: ServiceOrder['services'] = [];
  let allCompleted = true;
  let anyInProgress = false;
  for (let k = 0; k < itemsCount; k++) {
    const svc = services[(seed + k) % services.length];
    const quantity = ((seed + k) % 4) + 1;
    const status = pickStatus(seed + k);
    if (status !== 'completed') allCompleted = false;
    if (status === 'in_progress') anyInProgress = true;
    items.push({
      id: `${seed}-${k + 1}`,
      serviceId: svc.id,
      serviceName: svc.name,
      quantity,
      unitPrice: svc.price,
      total: svc.price * quantity,
      status,
    });
  }
  const orderStatus: ServiceStatus = allCompleted ? 'completed' : anyInProgress ? 'in_progress' : items.every(i => i.status === 'pending') ? 'pending' : 'cancelled';
  return { items, orderStatus };
};

const buildOrder = (year: number, month: number, indexInMonth: number, globalIndex: number): ServiceOrder => {
  const client = clients[(globalIndex + month) % clients.length];
  const day = ((indexInMonth + 1) * 3);
  const created = new Date(year, month, Math.min(day, 25));
  const updated = new Date(year, month, Math.min(day + 2, 28));
  const due = new Date(year, month, Math.min(day + 5, 30));
  const { items, orderStatus } = buildServiceItems(globalIndex + month);
  const totalAmount = items.reduce((acc, it) => acc + it.total, 0);
  return {
    id: `${year}-${month + 1}-${indexInMonth + 1}`,
    orderNumber: `OS-${year}-${String(month + 1).padStart(2, '0')}-${String(indexInMonth + 1).padStart(3, '0')}`,
    clientName: client.name,
    clientEmail: client.email,
    clientPhone: client.phone,
    description: 'Ordem de serviço gerada para mock de dashboard',
    services: items,
    status: orderStatus,
    totalAmount,
    createdAt: created,
    updatedAt: updated,
    dueDate: due,
    isPaid: orderStatus === 'completed',
  };
};

const generateOrders = (): ServiceOrder[] => {
  const list: ServiceOrder[] = [];
  let global = 0;
  for (let month = 0; month < 12; month++) {
    for (let i = 0; i < 3; i++) {
      list.push(buildOrder(2025, month, i, global++));
    }
  }
  for (let month = 6; month < 12; month++) {
    for (let i = 0; i < 2; i++) {
      list.push(buildOrder(2024, month, i, global++));
    }
  }
  return list;
};

export const serviceOrders: ServiceOrder[] = generateOrders();

export const getStatusColor = (status: ServiceStatus): string => {
  const colors = {
    pending: 'bg-status-pending text-primary-foreground',
    in_progress: 'bg-status-progress text-primary-foreground',
    completed: 'bg-status-completed text-primary-foreground',
    cancelled: 'bg-status-cancelled text-destructive-foreground',
  };
  return colors[status];
};

export const getStatusLabel = (status: ServiceStatus): string => {
  const labels = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };
  return labels[status];
};

export const getPriorityLabel = (priority?: 'baixa' | 'media' | 'alta'): string => {
  const labels = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
  return priority ? labels[priority] : '';
};

export const getPriorityColor = (priority?: 'baixa' | 'media' | 'alta'): string => {
  const colors = {
    baixa: 'bg-muted text-foreground',
    media: 'bg-yellow-500 text-white',
    alta: 'bg-red-600 text-white',
  };
  return priority ? colors[priority] : 'bg-muted text-foreground';
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};
