import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, Edit, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BackButton from '@/components/BackButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ServiceItem } from '@/types';
import { Switch } from '@/components/ui/switch';
import { useClients } from '@/features/clientes/hooks';
import { useRepositories } from '@/features/catalogo/hooks';
import {
  useOrdemDetalhe,
  useServicosDeOrdem,
  useUpsertOrdem,
} from '../hooks';
import { createServico, deleteServico, updateServico, type OrdemServicoPayload } from '../services';
import AddServiceDialog from '@/components/order/AddServiceDialog';
import { useUserRole } from '@/hooks/useUserRole';

type FormaPagamento = '' | 'pix' | 'credito' | 'debito' | 'boleto' | 'transferencia' | 'dinheiro' | 'cheque' | 'outro';

const OrdemServicoFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const ordemId = id ? Number(id) : undefined;
  const { toast } = useToast();
  const { isRestricted } = useUserRole();
  const qc = useQueryClient();

  useEffect(() => {
    if (isRestricted) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate('/ordens');
    }
  }, [isRestricted, navigate, toast]);

  const { data: fetchedClients = [] } = useClients();
  const { data: fetchedServices = [], isLoading: servicesLoading, isError: servicesError } = useRepositories();
  const { data: ordem } = useOrdemDetalhe(ordemId);
  const { data: existingServicos = [] } = useServicosDeOrdem(ordemId);

  const upsertOrdem = useUpsertOrdem();
  const [isSavingServicos, setIsSavingServicos] = useState(false);

  const clientsData = useMemo(() => {
    if (!ordem?.cliente_detail) return fetchedClients;
    const exists = fetchedClients.some(c => String(c.id) === String(ordem.cliente_detail.id));
    if (!exists) {
      return [...fetchedClients, { id: String(ordem.cliente_detail.id), name: ordem.cliente_detail.nome, email: '' }];
    }
    return fetchedClients;
  }, [fetchedClients, ordem]);

  const servicesData = useMemo(() => {
    const base = (fetchedServices || []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      price: 0,
      nao_faturavel: false,
    }));
    existingServicos.forEach((s) => {
      const catalogoId = s.catalogo;
      const catalogoNome = s.catalogo_detail?.nome ?? s.catalogo_nome;
      if (catalogoId && catalogoNome && !base.some(x => String(x.id) === String(catalogoId))) {
        base.push({ id: String(catalogoId), name: catalogoNome, description: '', price: 0, nao_faturavel: false });
      }
    });
    return base;
  }, [fetchedServices, existingServicos]);

  const [openClientSelect, setOpenClientSelect] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    dataVenda: new Date().toISOString().slice(0, 10),
    amount: 0,
    paymentMethod: '' as FormaPagamento,
    installments: 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
    immediateCharge: '' as '' | 'sim' | 'nao',
    invoiceContactName: '',
    invoiceContactEmail: '',
    observation: '',
    prioridade: 'baixa' as 'baixa' | 'media' | 'alta',
    contrato: false,
    objetoContrato: '',
    contratoDataInicio: '',
    contratoDataFim: '',
    gestorNome: '',
    gestorEmail: '',
    gestorTelefone: '',
  });

  const [orderServices, setOrderServices] = useState<ServiceItem[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | undefined>(undefined);
  const originalServiceIds = useRef<number[]>([]);

  useEffect(() => {
    if (!ordemId || !ordem) return;

    setFormData({
      clientId: String(ordem.cliente_detail?.id ?? ordem.cliente ?? ''),
      dataVenda: ordem.data_venda || new Date().toISOString().slice(0, 10),
      amount: Number(ordem.valor ?? 0),
      paymentMethod: (ordem.forma_pagamento || '') as FormaPagamento,
      installments: (ordem.quantidade_parcelas as any) ?? 1,
      immediateCharge: ordem.cobranca_imediata ? 'sim' : 'nao',
      invoiceContactName: ordem.nome_contato_envio_nf || '',
      invoiceContactEmail: ordem.contato_envio_nf || '',
      observation: ordem.observacao || '',
      prioridade: ordem.prioridade || 'baixa',
      contrato: !!ordem.contrato,
      objetoContrato: ordem.objeto_contrato || '',
      contratoDataInicio: ordem.contrato_data_inicio || '',
      contratoDataFim: ordem.contrato_data_fim || '',
      gestorNome: ordem.gestor_contrato_nome || '',
      gestorEmail: ordem.gestor_contrato_email || '',
      gestorTelefone: ordem.gestor_contrato_telefone || '',
    });
  }, [ordemId, ordem]);

  useEffect(() => {
    if (!ordemId) return;

    const items: ServiceItem[] = existingServicos.map((s) => ({
      id: `existing-${s.id}`,
      persistedId: s.id,
      serviceId: s.catalogo ? String(s.catalogo) : '',
      serviceName: s.catalogo_detail?.nome ?? s.catalogo_nome ?? `Serviço #${s.id}`,
      quantity: 1,
      unitPrice: 0,
      total: 0,
      status: 'pending',
      note: s.descricao || '',
    }));
    setOrderServices(items);
    originalServiceIds.current = items
      .filter(item => item.persistedId !== undefined)
      .map(item => item.persistedId as number);
  }, [ordemId, existingServicos]);


  const handleAddService = (item: ServiceItem) => {
    const exists = orderServices.some(s => String(s.serviceId) === String(item.serviceId));
    if (exists) {
      toast({
        title: "Serviço já adicionado",
        description: "Este serviço já está na lista.",
        variant: "destructive",
      });
      return;
    }
    setOrderServices([...orderServices, item]);
  };

  const handleUpdateService = (item: ServiceItem) => {
    const existsAnother = orderServices.some(s => s.id !== item.id && String(s.serviceId) === String(item.serviceId));
    if (existsAnother) {
      toast({
        title: "Serviço duplicado",
        description: "Já existe um serviço igual na lista.",
        variant: "destructive",
      });
      return;
    }
    setOrderServices(orderServices.map(s => s.id === item.id ? item : s));
  };

  const openEditModal = (item: ServiceItem) => {
    setEditingItem(item);
    setIsAddOpen(true);
  };

  const handleOpenChange = (v: boolean) => {
    setIsAddOpen(v);
    if (!v) setEditingItem(undefined);
  };

  const handleRemoveService = (id: string) => {
    setOrderServices(orderServices.filter(s => s.id !== id));
  };

  // Evita que Enter num input solto dispare o submit do form antes do usuário
  // terminar de preencher Contrato/Serviços, criando uma OS incompleta.
  const bloquearEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSavingServicos) return;

    const missing: string[] = [];
    if (!formData.clientId) missing.push("Cliente");
    if (!formData.dataVenda) missing.push("Data de criação");
    if (!Number.isFinite(formData.amount)) missing.push("Valor");
    if (!formData.paymentMethod) missing.push("Forma de Pagamento");

    if (!formData.invoiceContactName) missing.push("Nome do contato para NF");
    if (!formData.invoiceContactEmail) missing.push("Contato envio NF (email)");

    if (orderServices.length === 0) {
      missing.push("Serviços");
    } else {
      const anyWithoutNote = orderServices.some(s => !s.note || !s.note.trim());
      if (anyWithoutNote) missing.push("Descrição do serviço");
    }
    if (formData.contrato) {
      if (!formData.objetoContrato) missing.push("Objeto do contrato");
      if (!formData.contratoDataInicio) missing.push("Data de início do contrato");
      if (!formData.contratoDataFim) missing.push("Data de fim do contrato");
    }
    if (missing.length > 0) {
      toast({
        title: "Campos obrigatórios ausentes",
        description: `Preencha: ${missing.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    const ordemPayload: OrdemServicoPayload = {
      cliente: Number(formData.clientId),
      data_venda: formData.dataVenda,
      valor: formData.amount.toFixed(2),
      forma_pagamento: formData.paymentMethod as Exclude<FormaPagamento, ''>,
      quantidade_parcelas: formData.installments || null,
      cobranca_imediata: formData.immediateCharge === 'sim',
      nome_contato_envio_nf: formData.invoiceContactName,
      contato_envio_nf: formData.invoiceContactEmail,
      observacao: formData.observation || null,
      prioridade: formData.prioridade,
      contrato: formData.contrato,
      ...(formData.contrato ? {
        objeto_contrato: formData.objetoContrato,
        contrato_data_inicio: formData.contratoDataInicio,
        contrato_data_fim: formData.contratoDataFim,
        gestor_contrato_nome: formData.gestorNome || null,
        gestor_contrato_email: formData.gestorEmail || null,
        gestor_contrato_telefone: formData.gestorTelefone || null,
      } : {}),
    };

    setIsSubmitting(true);
    try {
      const savedOrdem = await new Promise<{ id: number }>((resolve, reject) => {
        upsertOrdem.mutate(
          { id: ordemId, payload: ordemPayload },
          { onSuccess: resolve, onError: reject },
        );
      });

      setIsSavingServicos(true);
      const currentPersistedIds = orderServices
        .filter(s => s.persistedId !== undefined)
        .map(s => s.persistedId as number);
      const servicosToDelete = originalServiceIds.current.filter(
        sid => !currentPersistedIds.includes(sid),
      );

      await Promise.all([
        ...servicosToDelete.map(sid => deleteServico(sid)),
        ...orderServices.map(s => {
          const catalogo = s.serviceId ? Number(s.serviceId) : null;
          return s.persistedId
            ? updateServico(s.persistedId, { catalogo, descricao: s.note || '' })
            : createServico({ ordem_servico: savedOrdem.id, catalogo, descricao: s.note || '' });
        }),
      ]);

      await Promise.all([
        qc.invalidateQueries({ queryKey: ['ordens-servicos', savedOrdem.id] }),
        qc.invalidateQueries({ queryKey: ['ordens-detalhe', savedOrdem.id] }),
        qc.invalidateQueries({ queryKey: ['ordens-lista'] }),
        qc.invalidateQueries({ queryKey: ['servicos-resumo'] }),
      ]);

      toast({
        title: ordemId ? "Ordem atualizada com sucesso!" : "Ordem criada com sucesso!",
        description: "A ordem de serviço foi processada no backend.",
      });
      navigate('/ordens');
    } catch {
      toast({
        title: "Erro ao salvar",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsSavingServicos(false);
    }
  };

  if (isRestricted) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{ordemId ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h1>
          <p className="text-muted-foreground">{ordemId ? 'Atualize os dados da ordem' : 'Preencha os dados para criar uma nova ordem'}</p>
        </div>
        <BackButton />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Dados da Ordem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Cliente *</Label>
                <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openClientSelect}
                      className="w-full justify-between bg-secondary border-border font-normal"
                    >
                      {formData.clientId
                        ? clientsData.find((client) => String(client.id) === formData.clientId)?.name
                        : "Selecione um cliente..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar cliente..." />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clientsData.map((client) => (
                            <CommandItem
                              key={String(client.id)}
                              value={client.name}
                              onSelect={() => {
                                setFormData({ ...formData, clientId: String(client.id) })
                                setOpenClientSelect(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.clientId === String(client.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {client.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {clientsData.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Nenhum cliente encontrado.{' '}
                    <Link to="/clientes/new" className="underline">
                      Cadastrar cliente
                    </Link>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataVenda">Data de Criação *</Label>
                <Input
                  id="dataVenda"
                  type="date"
                  value={formData.dataVenda}
                  onChange={(e) => setFormData({ ...formData, dataVenda: e.target.value })}
                  onKeyDown={bloquearEnter}
                  className="bg-secondary border-border max-w-[200px]"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => {
                    let s = e.target.value ?? '';
                    if (s.startsWith('0') && !s.startsWith('0.') && !s.startsWith('0,')) {
                      s = s.replace(/^0+/, '');
                      if (s === '') s = '0';
                    }
                    e.target.value = s;
                    setFormData({ ...formData, amount: Number(s) });
                  }}
                  onKeyDown={bloquearEnter}
                  className="bg-secondary border-border"
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento *</Label>
                <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v as FormaPagamento })}>
                  <SelectTrigger className="bg-secondary border-border w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantidade de parcelas</Label>
                <Select value={String(formData.installments)} onValueChange={(v) => setFormData({ ...formData, installments: Number(v) as any })}>
                  <SelectTrigger className="bg-secondary border-border w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={String(n)}>{n} parcela{n > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cobrança imediata</Label>
                <Select value={formData.immediateCharge} onValueChange={(v) => setFormData({ ...formData, immediateCharge: v as any })}>
                  <SelectTrigger className="bg-secondary border-border w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={formData.prioridade} onValueChange={(v) => setFormData({ ...formData, prioridade: v as any })}>
                  <SelectTrigger className="bg-secondary border-border w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceContactName">Nome do contato para NF *</Label>
                <Input
                  id="invoiceContactName"
                  value={formData.invoiceContactName}
                  onChange={(e) => setFormData({ ...formData, invoiceContactName: e.target.value })}
                  onKeyDown={bloquearEnter}
                  className="bg-secondary border-border"
                  placeholder="Nome do responsável"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceContactEmail">Contato envio NF *</Label>
                <Input
                  id="invoiceContactEmail"
                  type="email"
                  value={formData.invoiceContactEmail}
                  onChange={(e) => setFormData({ ...formData, invoiceContactEmail: e.target.value })}
                  onKeyDown={bloquearEnter}
                  className="bg-secondary border-border"
                  placeholder="email@empresa.com"
                  maxLength={254}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observation">Observação</Label>
              <Textarea
                id="observation"
                value={formData.observation}
                onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                className="bg-secondary border-border min-h-24"
                placeholder="Observação geral da OS"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <Label htmlFor="contrato" className="cursor-pointer">Esta OS representa um contrato</Label>
              <Switch
                id="contrato"
                checked={formData.contrato}
                onCheckedChange={(v) => setFormData({ ...formData, contrato: v })}
              />
            </div>
            {formData.contrato && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="objetoContrato">Objeto do contrato *</Label>
                  <Textarea
                    id="objetoContrato"
                    value={formData.objetoContrato}
                    onChange={(e) => setFormData({ ...formData, objetoContrato: e.target.value })}
                    className="bg-secondary border-border min-h-24"
                    placeholder="Descreva o objeto do contrato"
                    maxLength={255}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contratoDataInicio">Data de início *</Label>
                    <Input
                      id="contratoDataInicio"
                      type="date"
                      value={formData.contratoDataInicio}
                      onChange={(e) => setFormData({ ...formData, contratoDataInicio: e.target.value })}
                      onKeyDown={bloquearEnter}
                      className="bg-secondary border-border max-w-[200px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contratoDataFim">Data de fim *</Label>
                    <Input
                      id="contratoDataFim"
                      type="date"
                      value={formData.contratoDataFim}
                      onChange={(e) => setFormData({ ...formData, contratoDataFim: e.target.value })}
                      onKeyDown={bloquearEnter}
                      className="bg-secondary border-border max-w-[200px]"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gestorNome">Nome do gestor</Label>
                    <Input
                      id="gestorNome"
                      value={formData.gestorNome}
                      onChange={(e) => setFormData({ ...formData, gestorNome: e.target.value })}
                      onKeyDown={bloquearEnter}
                      className="bg-secondary border-border"
                      placeholder="Nome (opcional)"
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gestorEmail">E-mail do gestor</Label>
                    <Input
                      id="gestorEmail"
                      type="email"
                      value={formData.gestorEmail}
                      onChange={(e) => setFormData({ ...formData, gestorEmail: e.target.value })}
                      onKeyDown={bloquearEnter}
                      className="bg-secondary border-border"
                      placeholder="email@empresa.com (opcional)"
                      maxLength={254}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gestorTelefone">Telefone do gestor</Label>
                    <Input
                      id="gestorTelefone"
                      value={formData.gestorTelefone}
                      onChange={(e) => setFormData({ ...formData, gestorTelefone: e.target.value })}
                      onKeyDown={bloquearEnter}
                      className="bg-secondary border-border"
                      placeholder="(00) 00000-0000 (opcional)"
                      maxLength={30}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Serviços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {servicesData.length === 0 && (
              <div className="text-sm text-muted-foreground">
                Nenhum serviço no catálogo.{' '}
                <Link to="/catalogo/new" className="underline">
                  Cadastrar item
                </Link>
              </div>
            )}

            {orderServices.length > 0 ? (
              <div className="space-y-3">
                {orderServices.map(service => (
                  <div
                    key={service.id}
                    className="p-4 rounded-md border border-border bg-card hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{service.serviceName}</p>
                        {service.note && <p className="text-sm text-muted-foreground truncate">{service.note}</p>}
                      </div>
                      <div className="flex items-center gap-6">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => openEditModal(service)}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive"
                          onClick={() => handleRemoveService(service.id)}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum serviço adicionado ainda
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsAddOpen(true)}
                disabled={servicesLoading || servicesError || servicesData.length === 0}
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
            <AddServiceDialog
              open={isAddOpen}
              onOpenChange={handleOpenChange}
              services={servicesData}
              existingIds={orderServices.map(s => String(s.serviceId))}
              onAdd={handleAddService}
              itemToEdit={editingItem}
              onUpdate={handleUpdateService}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/ordens')}>
            Cancelar
          </Button>
          <Button type="submit" variant="hero" className="min-w-40" disabled={isSubmitting || isSavingServicos}>
            <Save className="w-4 h-4 mr-2" />
            {ordemId ? 'Salvar Alterações' : 'Criar Ordem'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OrdemServicoFormPage;
