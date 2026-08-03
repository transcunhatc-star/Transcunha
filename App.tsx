
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { useDatabase } from './hooks/useDatabase';
import type { Client, Owner, Driver, Vehicle, Product, Cargo, Shipment, User, Page, ProfilePermissions, HistoryLog, Ticket, TicketHistory, ShipmentLock, Branch } from './types';
import { CargoStatus, ShipmentStatus, UserProfile, TicketStatus, TicketPriority, DriverClassification, VehicleSetType, VehicleBodyType, REQUIRED_DOCUMENT_MAP } from './types';
import { formatId } from './utils';
import { INITIAL_PERMISSIONS } from './auth';
import { useToast } from './hooks/useToast';

// Page Imports
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ClientsPage from './pages/ClientsPage';
import OwnersPage from './pages/OwnersPage';
import DriversPage from './pages/DriversPage';
import VehiclesPage from './pages/VehiclesPage';
import LoadsPage from './pages/LoadsPage';
import ProductsPage from './pages/ProductsPage';
import ShipmentsPage from './pages/ShipmentsPage';
import OperationalLoadsPage from './pages/OperationalLoadsPage';
import OperationalMapPage from './pages/OperationalMapPage';
import CommissionsPage from './pages/CommissionsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import AppearancePage from './pages/AppearancePage';
import ShipmentHistoryPage from './pages/ShipmentHistoryPage';
import LoadHistoryPage from './pages/LoadHistoryPage';
import LayoverCalculatorPage from './pages/LayoverCalculatorPage';
import FreightQuotePage from './pages/FreightQuotePage';
import ToolsHistoryPage from './pages/ToolsHistoryPage';
import BranchesPage from './pages/BranchesPage';
import SystemMonitorPage from './pages/SystemMonitorPage';

// Component Imports
import TopNavBar from './components/TopNavBar';
import TicketModal from './components/TicketModal';
import PasswordChangeModal from './components/PasswordChangeModal';

import {
  upsertClient, upsertOwner, upsertDriver, upsertVehicle, upsertCargo, insertCargo,
  upsertShipment, insertShipment, upsertUser, upsertTicket, saveProfilePermissions,
  upsertManyDrivers, upsertManyVehicles, upsertManyShipments, upsertManyCargos,
  uploadShipmentAttachment, getShipmentAttachmentUrl,
  saveAppSettings,
  deleteCargo, deleteShipment, deleteUser, upsertProduct, deleteProduct,
  tryAcquireShipmentLock, releaseShipmentLock, toUser,
  deleteShipmentAttachmentFromStorage, upsertBranch, deleteBranch
} from './services/api/db';

const TRANSCUNHA_LOGO_BASE64 = "/logo.png";


const FIELD_TRANSLATIONS: Record<string, string> = {
  // Cargo fields
  clientId: 'Cliente',
  productId: 'Produto',
  origin: 'Origem',
  originMapLink: 'Link do Mapa (Origem)',
  destination: 'Destino',
  destinationMapLink: 'Link do Mapa (Destino)',
  totalVolume: 'Volume Total',
  scheduledVolume: 'Volume Agendado',
  loadedVolume: 'Volume Carregado',
  companyFreightValuePerTon: 'Frete Empresa (p/ Ton)',
  driverFreightValuePerTon: 'Frete Motorista (p/ Ton)',
  hasIcms: 'Incide ICMS',
  icmsPercentage: '% ICMS',
  requiresScheduling: 'Exige Agendamento',
  type: 'Tipo de Carga',
  status: 'Status da Carga',
  createdById: 'Comercial Responsável',
  freightLegs: 'Trechos de Frete',
  dailySchedule: 'Agenda Diária',
  originCoords: 'Coordenadas de Origem',
  destinationCoords: 'Coordenadas de Destino',

  // Shipment fields
  driverId: 'Motorista',
  driverCpf: 'CPF do Motorista',
  anttOwnerIdentifier: 'CPF/CNPJ Titular ANTT',
  bankDetails: 'Dados Bancários',
  embarcadorId: 'Embarcador',
  horsePlate: 'Placa Cavalo',
  trailer1Plate: 'Placa Carreta 1',
  trailer2Plate: 'Placa Carreta 2',
  trailer3Plate: 'Placa Carreta 3',
  shipmentTonnage: 'Toneladas do Embarque',
  driverFreightValue: 'Valor Frete Motorista',
  vehicleSetType: 'Tipo de Veículo',
  vehicleBodyType: 'Tipo de Carroceria',
};

interface NewShipmentRequestData extends Omit<Shipment, 'id' | 'orderId' | 'status' | 'documents' | 'history' | 'createdAt' | 'createdById' | 'statusHistory'> {
  driverCnh?: string;
  vehicleSetType?: VehicleSetType;
  vehicleBodyType?: VehicleBodyType;
  filesToAttach?: File[];
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('transcunha_currentUser');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = (location.pathname === '/' ? 'dashboard' : location.pathname.substring(1)) as Page;

  const setCurrentPage = (page: Page) => {
    navigate(`/${page}`);
    localStorage.setItem('transcunha_currentPage', page);
  };

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  
  // Use custom hook for all database-related state and logic
  const {
    clients, setClients,
    owners, setOwners,
    drivers, setDrivers,
    vehicles, setVehicles,
    products, setProducts,
    cargos, setCargos,
    shipments, setShipments,
    users, setUsers,
    tickets, setTickets,
    activeLocks, setActiveLocks,
    profilePermissions, setProfilePermissions,
    isLoading, loadError,
    companyLogo, setCompanyLogo,
    themeImage, setThemeImage,
    nextIds, setNextIds,
    loadAllData,
    isAnyModalActiveRef,
    branches, setBranches
  } = useDatabase(currentUser);

  const { showToast } = useToast();

  const isAnyModalActive = isAnyModalOpen || isTicketModalOpen;
  
  // Sincronização de modais para supressão de real-time
  useEffect(() => {
    isAnyModalActiveRef.current = isAnyModalActive;
  }, [isAnyModalActive, isAnyModalActiveRef]);

  // Persistência local do usuário logado
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('transcunha_currentUser', JSON.stringify(currentUser));
      localStorage.setItem('transcunha_user_email', currentUser.email);
    } else {
      localStorage.removeItem('transcunha_currentUser');
      localStorage.removeItem('transcunha_user_email');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('transcunha_currentPage', currentPage);
  }, [currentPage]);

  // UI Effects (Branding & Theme)
  useEffect(() => {
    document.title = 'Transcunha';
  }, []);

  useEffect(() => {
    if (companyLogo) {
      localStorage.setItem('transcunha_companyLogo', companyLogo);
      const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = companyLogo;
      if (!document.querySelector("link[rel*='icon']")) {
        document.getElementsByTagName('head')[0].appendChild(link);
      }
    }
  }, [companyLogo]);

  useEffect(() => {
    if (themeImage) {
      localStorage.setItem('transcunha_themeImage', themeImage);
      document.body.style.backgroundImage = `url(${themeImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = '';
    }
  }, [themeImage]);

  const verifySession = useCallback(async () => {
    setIsAuthChecking(true);
    console.log('[Auth] Iniciando verificação de sessão...');
    
    try {
      // 1. Tenta recuperar e-mail do localStorage ou da sessão do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const savedUserEmail = localStorage.getItem('transcunha_user_email') || session?.user?.email;
      
      if (savedUserEmail) {
        if (localStorage.getItem('transcunha_user_email') && session?.user?.email && localStorage.getItem('transcunha_user_email') !== session?.user?.email) {
          console.warn('[Auth] Mismatch detected between localStorage and Supabase session.');
        }
        console.log('[Auth] Recuperando perfil para:', savedUserEmail);
        const { data: dbUser, error: dbError } = await supabase
          .from('app_users')
          .select('*')
          .eq('email', savedUserEmail)
          .single();
          
        if (!dbError && dbUser) {
          const userProfile = toUser(dbUser);
          
          if (userProfile.active) {
            // Lógica de expiração de senha (30 dias)
            if (userProfile.passwordUpdatedAt) {
              const lastUpdate = new Date(userProfile.passwordUpdatedAt).getTime();
              const now = new Date().getTime();
              const daysSinceUpdate = (now - lastUpdate) / (1000 * 3600 * 24);
              
              if (daysSinceUpdate >= 30) {
                userProfile.requirePasswordChange = true;
              }
            }
            
            setCurrentUser(userProfile);
            console.log('[Auth] Sessão restaurada com sucesso:', userProfile.name);
          } else {
            console.warn('[Auth] Usuário inativo no banco.');
            setCurrentUser(null);
          }
        } else {
          if (dbError) console.error('[Auth] Erro ao recuperar perfil:', dbError.message);
          // Se o usuário não existe no app_users, limpa a sessão
          if (dbError?.code === 'PGRST116') {
            setCurrentUser(null);
          }
        }
      } else {
        console.log('[Auth] Nenhuma sessão encontrada.');
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('[Auth] Erro crítico na verificação:', err);
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const nextStatusMap: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
    [ShipmentStatus.PreCadastro]: ShipmentStatus.AguardandoSeguradora,
    [ShipmentStatus.AguardandoSeguradora]: ShipmentStatus.AguardandoCarregamento,
    [ShipmentStatus.AguardandoCarregamento]: ShipmentStatus.AguardandoNota,
    [ShipmentStatus.AguardandoNota]: ShipmentStatus.AguardandoAdiantamento,
    // AguardandoAdiantamento is now handled conditionally
    [ShipmentStatus.AguardandoAgendamento]: ShipmentStatus.AguardandoDescarga,
    [ShipmentStatus.AguardandoDescarga]: ShipmentStatus.AguardandoPagamentoSaldo,
    [ShipmentStatus.AguardandoPagamentoSaldo]: ShipmentStatus.Finalizado,
  };

  // --- HISTORY LOGGING ---
  const createHistoryLog = (description: string): HistoryLog => {
    if (!currentUser) throw new Error("Ação não pode ser realizada sem um usuário logado.");
    const newLog = {
      id: `log_${nextIds.history}`,
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
      description: `${description}`,
    };
    setNextIds((prev: any) => ({...prev, history: prev.history + 1}));
    return newLog;
  }

  // --- AUTH HANDLERS ---
  const handleLogin = (user: User) => {
    localStorage.setItem('transcunha_user_email', user.email);
    setCurrentUser(user);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('transcunha_user_email');
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  const handlePasswordChange = async (newPassword: string, currentPassword: string) => {
    if (!currentUser) return;
    
    try {
      // 1. Atualiza no Banco de Dados
      const { data, error: dbError } = await supabase
        .from('app_users')
        .update({ 
          password: newPassword,
          require_password_change: false,
          password_updated_at: new Date().toISOString()
        })
        .eq('email', currentUser.email)
        .eq('password', currentPassword)
        .select();
      
      if (dbError || !data || data.length === 0) {
        console.error('Erro ao atualizar senha no Banco:', dbError || 'Nenhuma linha afetada (senha incorreta)');
        throw new Error('A senha atual está incorreta ou houve um erro no banco.');
      }

      // Atualiza estado local
      const updatedUser: User = { 
        ...currentUser, 
        password: newPassword, 
        requirePasswordChange: false,
        passwordUpdatedAt: data[0].password_updated_at
      };
      
      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      
      showToast('Senha atualizada com sucesso no sistema! Próxima atualização em 30 dias.', 'success');
    } catch (err: any) {
      console.error('Erro geral no handlePasswordChange:', err);
      throw err;
    }
  };

  const handleSavePermissions = async (newPermissions: ProfilePermissions) => {
    try {
      await saveProfilePermissions(newPermissions);
      setProfilePermissions(newPermissions);
      showToast("Permissões salvas com sucesso!", 'success');
    } catch (err) {
      console.error('Erro ao salvar permissões:', err);
      showToast("Erro ao salvar permissões. Tente novamente.", 'error');
    }
  };
  
  const handleSaveLogo = async (logo: string) => {
    setCompanyLogo(logo || null);
    try {
      await saveAppSettings({ company_logo: logo || null });
    } catch (err) {
      console.error('Erro ao salvar logo no Supabase:', err);
    }
    showToast("Logo da empresa atualizado com sucesso!", 'success');
  };

  const handleSaveThemeImage = async (image: string) => {
    setThemeImage(image || null);
    try {
      await saveAppSettings({ theme_image: image || null });
    } catch (err) {
      console.error('Erro ao salvar tema no Supabase:', err);
    }
    showToast("Tema de fundo atualizado com sucesso!", 'success');
  };

  const handleSaveTicket = async (ticketData: Omit<Ticket, 'id' | 'history' | 'createdAt' | 'createdById'>) => {
    if (!currentUser) return;
    const newId = formatId(nextIds.ticket, 'TCK');
    const newTicket: Ticket = {
      ...ticketData,
      id: newId,
      status: TicketStatus.Aberto,
      createdById: currentUser.id,
      createdAt: new Date().toISOString(),
      history: [{
          userId: currentUser.id,
          timestamp: new Date().toISOString(),
          comment: `Chamado criado e atribuído a ${users.find(u => u.id === ticketData.assignedToId)?.name || 'N/A'}.`
      }],
    };
    setTickets((prev: Ticket[]) => [newTicket, ...prev]);
    setNextIds((prev: any) => ({ ...prev, ticket: prev.ticket + 1 }));
    try { await upsertTicket(newTicket); } catch(err) { console.error('Erro ao salvar ticket:', err); }
  }

  const handleUpdateTicket = async (ticketId: string, newStatus: TicketStatus, comment: string) => {
    if (!currentUser) return;
    
    const ticketToUpdate = tickets.find(t => t.id === ticketId);
    if (!ticketToUpdate) return;

    const oldStatus = ticketToUpdate.status;
    let finalComment = comment.trim();
    if (!finalComment) {
      finalComment = newStatus === TicketStatus.Resolvido
        ? 'Chamado marcado como resolvido.'
        : `Status alterado para ${newStatus}.`;
    }

    const newHistoryEntry: TicketHistory = {
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
      comment: finalComment,
      oldStatus,
      newStatus,
    };

    const updatedTicket = { 
      ...ticketToUpdate, 
      status: newStatus, 
      history: [...ticketToUpdate.history, newHistoryEntry] 
    };

    setTickets((prevTickets: Ticket[]) =>
      prevTickets.map(ticket => ticket.id === ticketId ? updatedTicket : ticket)
    );

    try {
      await upsertTicket(updatedTicket);
    } catch (err) {
      console.error('Erro ao atualizar ticket:', err);
    }
  };


  // --- DATA FILTERING BASED ON USER ---
  const visibleLoads = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.profile === UserProfile.Embarcador) {
      return cargos;
    }
    if (currentUser.profile === UserProfile.Cliente && currentUser.clientId) {
      return cargos.filter(c => c.clientId === currentUser.clientId);
    }
    // Profiles that see everything
    if ([UserProfile.Admin, UserProfile.Diretor, UserProfile.Coordenador].includes(currentUser.profile as UserProfile)) {
      return cargos;
    }
    
    // Branch filtering for other profiles
    if (currentUser.branchId) {
      // Show data from their branch OR legacy data (no branch assigned)
      return cargos.filter(c => c.branchId === currentUser.branchId || !c.branchId);
    }

    return cargos;
  }, [currentUser, cargos, shipments]);

  const visibleShipments = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.profile === UserProfile.Embarcador) {
      return shipments.filter(s => s.embarcadorId === currentUser.id);
    }
    if (currentUser.profile === UserProfile.Cliente && currentUser.clientId) {
        const clientCargoIds = new Set(
            cargos.filter(c => c.clientId === currentUser.clientId).map(c => c.id)
        );
        return shipments.filter(s => clientCargoIds.has(s.cargoId));
    }
    // Profiles that see everything
    if ([UserProfile.Admin, UserProfile.Diretor, UserProfile.Coordenador].includes(currentUser.profile as UserProfile)) {
      return shipments;
    }

    // Branch filtering for other profiles
    if (currentUser.branchId) {
      // Show data from their branch OR legacy data (no branch assigned)
      return shipments.filter(s => s.branchId === currentUser.branchId || !s.branchId);
    }

    return shipments;
  }, [currentUser, shipments, cargos]);
  
  const visibleEmbarcadores = useMemo(() => {
    if (!currentUser) return [];
    const allEmbarcadorUsers = users.filter(u => u.profile === UserProfile.Embarcador);

    if (currentUser.profile === UserProfile.Embarcador) {
        return allEmbarcadorUsers.filter(u => u.id === currentUser.id);
    }
    
    return allEmbarcadorUsers;
  }, [currentUser, users]);


  const inProgressLoads = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return visibleLoads.filter(c => {
      if (c.status === CargoStatus.Suspensa) return true;
      if (c.status === CargoStatus.EmAndamento) {
        return c.dailySchedule?.some(ds => ds.date >= today);
      }
      return false;
    });
  }, [visibleLoads]);

  const activeLoads = useMemo(() => 
    visibleLoads.filter(c => c.status !== CargoStatus.Fechada),
    [visibleLoads]
  );

  const closedLoads = useMemo(() => 
    visibleLoads.filter(c => c.status === CargoStatus.Fechada),
    [visibleLoads]
  );

  
  // --- CRUD HANDLERS ---
  const handleCreateShipment = async (data: NewShipmentRequestData) => {
    if (!currentUser) return;
    
    let currentNextIds = { ...nextIds };
    let historyId = currentNextIds.history;
    
    const createHistoryLogLocal = (description: string): HistoryLog => {
      const newLog = {
        id: `log_${historyId}`,
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
        description,
      };
      historyId++;
      return newLog;
    };

    let newDrivers = [...drivers];
    let addedDrivers: Driver[] = [];
    let driverToUse = drivers.find(d => 
        (d.name.trim().toLowerCase() === data.driverName.trim().toLowerCase() && data.driverName.trim() !== '') || 
        (d.cpf.replace(/\D/g, '') === (data.driverCpf || '').replace(/\D/g, '') && (data.driverCpf || '').trim() !== '')
    );
    if (!driverToUse) {
      const newDriverId = formatId(currentNextIds.driver, 'DRV');
      driverToUse = {
        id: newDriverId,
        name: data.driverName,
        cpf: data.driverCpf || '',
        cnh: data.driverCnh || '',
        phone: data.driverContact || '',
        classification: DriverClassification.Terceiro,
        active: true,
      };
      newDrivers.unshift(driverToUse);
      addedDrivers.push(driverToUse);
      currentNextIds.driver++;
    }

    let newVehicles = [...vehicles];
    let addedVehicles: Vehicle[] = [];
    let newOwners = [...owners];
    let addedOwner: Owner | null = null;
    let defaultOwner = newOwners.find(o => o.name.toUpperCase() === 'PROPRIETÁRIO PADRÃO TERCEIRO');
    if (!defaultOwner) {
        const newOwnerId = formatId(currentNextIds.owner, 'OWN');
        defaultOwner = {
            id: newOwnerId,
            name: 'PROPRIETÁRIO PADRÃO TERCEIRO',
            cpfCnpj: '00.000.000/0000-00',
            phone: '',
            type: 'Pessoa Jurídica' as any,
            bankDetails: '',
        };
        newOwners.unshift(defaultOwner);
        addedOwner = defaultOwner;
        currentNextIds.owner++;
    }

    const processVehicle = (plate: string, isHorse: boolean) => {
        if (!plate || !plate.trim()) return;
        let vehicle = newVehicles.find(v => v.plate.trim().toLowerCase() === plate.trim().toLowerCase());
        if (!vehicle) {
            const newVehicleId = formatId(currentNextIds.vehicle, 'VEH');
            const newVehicle: Vehicle = {
                id: newVehicleId,
                plate: plate,
                setType: isHorse ? (data.vehicleSetType || VehicleSetType.LSSimples) : VehicleSetType.LSSimples,
                bodyType: isHorse ? (data.vehicleBodyType || VehicleBodyType.Graneleiro) : VehicleBodyType.Graneleiro,
                classification: DriverClassification.Terceiro,
                ownerId: defaultOwner.id,
            };
            newVehicles.unshift(newVehicle);
            addedVehicles.push(newVehicle);
            currentNextIds.vehicle++;
        }
    };

    processVehicle(data.horsePlate, true);
    processVehicle(data.trailer1Plate || '', false);
    processVehicle(data.trailer2Plate || '', false);
    processVehicle(data.trailer3Plate || '', false);

    const prefix = currentUser?.name ? currentUser.name.substring(0, 3).toUpperCase() : 'SHP';
    const newShipmentId = formatId(currentNextIds.shipment, prefix);
    
    const documentsUrlMap: { [key: string]: string[] } = {};
    const attachedFileNames: string[] = [];
    if (data.filesToAttach && data.filesToAttach.length > 0) {
      try {
        const newDocUrls = [];
        for (const file of data.filesToAttach) {
          const path = await uploadShipmentAttachment(newShipmentId, 'Arquivos Iniciais', file);
          const url = getShipmentAttachmentUrl(path);
          newDocUrls.push(url);
          attachedFileNames.push(file.name);
        }
        documentsUrlMap['Arquivos Iniciais'] = newDocUrls;
      } catch (error) {
        console.error('Erro ao fazer upload dos anexos iniciais:', error);
        showToast('Ocorreu um erro ao enviar os arquivos. O embarque foi criado, mas os arquivos não puderam ser salvos.', 'warning');
      }
    }
    
    let historyMsg = `Embarque ${newShipmentId} criado.`;
    if (attachedFileNames.length > 0) historyMsg += ` Anexo(s): ${attachedFileNames.join(', ')}.`;
    if (data.bankDetails) historyMsg += ` Dados bancários preenchidos.`;

    const newShipment: Shipment = {
      id: newShipmentId,
      orderId: `ord_${newShipmentId}`,
      cargoId: data.cargoId,
      driverName: data.driverName,
      driverContact: data.driverContact,
      driverCpf: data.driverCpf,
      embarcadorId: data.embarcadorId,
      horsePlate: data.horsePlate,
      trailer1Plate: data.trailer1Plate,
      trailer2Plate: data.trailer2Plate,
      trailer3Plate: data.trailer3Plate,
      shipmentTonnage: data.shipmentTonnage,
      driverFreightValue: data.driverFreightValue,
      driverFreightRateSnapshot: data.driverFreightRateSnapshot !== undefined ? data.driverFreightRateSnapshot : cargos.find(c => c.id === data.cargoId)?.driverFreightValuePerTon,
      companyFreightRateSnapshot: data.companyFreightRateSnapshot !== undefined ? data.companyFreightRateSnapshot : cargos.find(c => c.id === data.cargoId)?.companyFreightValuePerTon,
      status: ShipmentStatus.PreCadastro,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      bankDetails: data.bankDetails,
      documents: Object.keys(documentsUrlMap).length > 0 ? documentsUrlMap : undefined,
      history: [createHistoryLogLocal(historyMsg)],
      createdAt: new Date().toISOString(),
      createdById: currentUser.id,
      driverReferences: data.driverReferences,
      ownerContact: data.ownerContact,
      statusHistory: [{
        status: ShipmentStatus.PreCadastro,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
      }],
      vehicleTag: data.vehicleTag,
      vehicleSetType: data.vehicleSetType,
      vehicleBodyType: data.vehicleBodyType,
      branchId: currentUser.branchId,
      route: (data as any).destination || undefined,
    };
    const newShipments = [newShipment, ...shipments];
    
    const newCargos = cargos.map(cargo => {
      if (cargo.id === data.cargoId) {
        const newScheduledVolume = cargo.scheduledVolume + data.shipmentTonnage;
        return {
          ...cargo,
          scheduledVolume: newScheduledVolume,
          history: [...cargo.history, createHistoryLogLocal(`Volume agendado atualizado para ${newScheduledVolume.toFixed(2)} ton devido ao novo embarque ${newShipmentId}`)],
        };
      }
      return cargo;
    });
    
    currentNextIds.shipment++;
    currentNextIds.history = historyId;
    
    // Batch state updates (optimistic)
    setDrivers(newDrivers);
    setVehicles(newVehicles);
    setShipments(newShipments);
    setCargos(newCargos);
    if (addedOwner) setOwners(newOwners);
    setNextIds(currentNextIds);

    // Persist to Supabase
    try {
      const updatedCargo = newCargos.find(c => c.id === data.cargoId);
      await Promise.all([
        addedOwner ? upsertOwner(addedOwner) : Promise.resolve(),
        upsertManyDrivers(addedDrivers),
        upsertManyVehicles(addedVehicles),
        insertShipment(newShipment),
        updatedCargo ? upsertCargo(updatedCargo) : Promise.resolve(),
      ]);
    } catch (err: any) {
      console.error('Erro ao salvar embarque no Supabase:', err);
      const errorMessage = err?.message || 'Erro desconhecido ao salvar no banco de dados.';
      showToast(`[ERRO CRÍTICO] O embarque não pôde ser salvo no banco de dados: ${errorMessage}. Verifique sua conexão ou contate o suporte.`, 'error');
    }

    setCurrentPage('shipments');
    showToast(`Novo embarque ${newShipmentId} criado com sucesso! Motoristas/Veículos não cadastrados foram adicionados automaticamente.`, 'success');
  };

  const handleMarkArrival = async (shipmentId: string) => {
    if (!currentUser) return;
    const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
    if (!shipmentToUpdate) return;

    const now = new Date().toISOString();
    const updatedShipment: Shipment = { 
      ...shipmentToUpdate, 
      arrivalTime: now, 
      history: [...shipmentToUpdate.history, createHistoryLog(`Chegada do veículo marcada em ${new Date(now).toLocaleString('pt-BR')}`)] 
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    try {
      await upsertShipment(updatedShipment);
    } catch (err) {
      console.error('Erro ao marcar chegada:', err);
    }
  };


  const handleAddShipmentAttachments = async (shipmentId: string, files: File[]) => {
    if (!currentUser) {
      showToast('Usuário não autenticado.', 'error');
      return;
    }
    
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment) {
      showToast('Embarque não encontrado.', 'error');
      return;
    }

    try {
      const updatedDocuments = { ...(shipment.documents || {}) };
      const newUrls: string[] = [];
      const fileNames: string[] = [];

      for (const file of files) {
        const path = await uploadShipmentAttachment(shipmentId, 'Arquivos Iniciais', file);
        const url = getShipmentAttachmentUrl(path);
        newUrls.push(url);
        fileNames.push(file.name);
      }

      const existingDocs = updatedDocuments['Arquivos Iniciais'] || [];
      updatedDocuments['Arquivos Iniciais'] = [...existingDocs, ...newUrls];

      const updatedShipment: Shipment = {
        ...shipment,
        documents: updatedDocuments,
        history: [...shipment.history, createHistoryLog(`Novos anexos adicionados: ${fileNames.join(', ')}.`)]
      };

      await upsertShipment(updatedShipment);
      setShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));
      showToast('Documentos anexados com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao anexar documentos:', error);
      showToast('Erro ao anexar documentos. Verifique sua conexão.', 'error');
    }
  };
  
  const handleDeleteShipmentAttachment = async (shipmentId: string, url: string) => {
    if (!currentUser) return;
    
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment || !shipment.documents) return;

    try {
      // 1. Storage Removal
      await deleteShipmentAttachmentFromStorage(url);

      // 2. Database Update
      const updatedDocuments = { ...shipment.documents };
      let foundCategory = '';
      let fileName = '';

      // Find the category and remove the URL
      Object.keys(updatedDocuments).forEach(category => {
        const index = updatedDocuments[category].indexOf(url);
        if (index !== -1) {
          foundCategory = category;
          // Extract filename from URL for history log
          const urlParts = url.split('/');
          fileName = decodeURIComponent(urlParts[urlParts.length - 1].split('_').slice(2).join('_'));
          
          updatedDocuments[category] = updatedDocuments[category].filter(u => u !== url);
          if (updatedDocuments[category].length === 0) {
            delete updatedDocuments[category];
          }
        }
      });

      const updatedShipment: Shipment = {
        ...shipment,
        documents: updatedDocuments,
        history: [...shipment.history, createHistoryLog(`Anexo removido (${foundCategory}): ${fileName || 'Arquivo'}`)]
      };

      await upsertShipment(updatedShipment);
      setShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));
      showToast('Anexo removido com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      showToast('Erro ao remover anexo. Verifique sua conexão.', 'error');
    }
  };

  const handleUpdateShipmentAttachment = async (shipmentId: string, data: { 
    filesToAttach: { [key: string]: File[] }, 
    bankDetails?: string, 
    loadedTonnage?: number, 
    advancePercentage?: number, 
    advanceValue?: number,
    tollValue?: number, 
    balanceToReceiveValue?: number,
    discountValue?: number,
    netBalanceValue?: number,
    unloadedTonnage?: number,
    route?: string 
  }) => {
    const { filesToAttach, bankDetails, loadedTonnage, advancePercentage, advanceValue, tollValue, balanceToReceiveValue, discountValue, netBalanceValue, unloadedTonnage, route } = data;
    const originalShipment = shipments.find(s => s.id === shipmentId);
    
    if (!originalShipment) {
      showToast('Embarque não encontrado.', 'error');
      throw new Error('Embarque não encontrado');
    }
    
    if (!currentUser) {
      showToast('Usuário não autenticado.', 'error');
      throw new Error('Usuário não autenticado');
    }

    // Validation for "Aguardando Nota" transition
    if (originalShipment.status === ShipmentStatus.AguardandoNota && !originalShipment.bankDetails && !bankDetails) {
        showToast('Dados bancários são obrigatórios para avançar para a etapa de adiantamento.', 'warning');
        return;
    }

    if (originalShipment.status === ShipmentStatus.AguardandoCarregamento && !route?.trim()) {
        showToast('A rota do motorista é obrigatória para avançar para a próxima etapa.', 'warning');
        return;
    }

    if (originalShipment.status === ShipmentStatus.AguardandoCarregamento && (!loadedTonnage || loadedTonnage <= 0)) {
        showToast('O peso carregado é obrigatório para avançar para a próxima etapa.', 'warning');
        return;
    }

    let nextStatus: ShipmentStatus | undefined;

    if (originalShipment.status === ShipmentStatus.AguardandoAdiantamento) {
        const relatedCargo = cargos.find(c => c.id === originalShipment.cargoId);
        if (relatedCargo?.requiresScheduling) {
            nextStatus = ShipmentStatus.AguardandoAgendamento;
        } else {
            nextStatus = ShipmentStatus.AguardandoDescarga;
        }
    } else {
        nextStatus = nextStatusMap[originalShipment.status];
    }
    
    if (!nextStatus) {
      console.warn(`[handleUpdateShipmentAttachment] No next status found for ${originalShipment.status}`);
      return;
    }

    const currentStatus = originalShipment.status;
    let isUserAllowed = true;
    let alertMessage = '';

    // Check permissions based on the current status
    if (currentStatus === ShipmentStatus.PreCadastro || currentStatus === ShipmentStatus.AguardandoSeguradora) {
        isUserAllowed = [UserProfile.Fiscal, UserProfile.Diretor, UserProfile.Coordenador, UserProfile.Admin].includes(currentUser.profile);
        alertMessage = 'Apenas os perfis Fiscal, Diretor, Coordenador ou Administrador podem realizar esta ação.';
    } else if (currentStatus === ShipmentStatus.AguardandoAdiantamento || currentStatus === ShipmentStatus.AguardandoPagamentoSaldo) {
        isUserAllowed = [UserProfile.Financeiro, UserProfile.Diretor, UserProfile.Coordenador, UserProfile.Admin].includes(currentUser.profile);
        alertMessage = 'Apenas os perfis Financeiro, Diretor, Coordenador ou Administrador do Sistema podem realizar esta ação.';
    }

    if (!isUserAllowed) {
        showToast(`Você não tem permissão para alterar o status deste embarque. ${alertMessage}`, 'error');
        return;
    }

    // 1. Upload Files
    const updatedDocuments = { ...(originalShipment.documents || {}) };
    const attachedFileNames: string[] = [];

    try {
      for (const docType in filesToAttach) {
        const files = filesToAttach[docType];
        if (!Array.isArray(files) || files.length === 0) continue;
        
        const newDocUrls = [];
        for (const file of files) {
          const path = await uploadShipmentAttachment(shipmentId, docType, file);
          const url = getShipmentAttachmentUrl(path);
          newDocUrls.push(url);
          attachedFileNames.push(file.name);
        }
        const existingDocs = updatedDocuments[docType] || [];
        updatedDocuments[docType] = [...existingDocs, ...newDocUrls];
      }
    } catch (error) {
      console.error('Erro ao fazer upload dos anexos:', error);
      showToast('Ocorreu um erro ao enviar os arquivos. Verifique sua conexão e tente novamente.', 'error');
      throw error;
    }
    
    // 2. Prepare Updates
    const historyLogs = [];
    if(attachedFileNames.length > 0) historyLogs.push(`anexo(s): ${attachedFileNames.join(', ')}`);
    if(bankDetails) historyLogs.push(`Dados bancários preenchidos.`);

    let updatedTonnage = originalShipment.shipmentTonnage;
    let updatedDriverFreight = originalShipment.driverFreightValue;
    
    if (loadedTonnage !== undefined && loadedTonnage > 0) {
        updatedTonnage = loadedTonnage;
        const rateToUse = originalShipment.driverFreightRateSnapshot || cargos.find(c => c.id === originalShipment.cargoId)?.driverFreightValuePerTon || 0;
        updatedDriverFreight = rateToUse * loadedTonnage;
        const formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(updatedDriverFreight);
        historyLogs.push(`Tonelagem ajustada para ${loadedTonnage.toLocaleString('pt-BR')} ton. Frete atualizado para ${formattedVal}.`);
    }
    
    let calculatedAdvanceValue = originalShipment.advanceValue;
    let finalAdvancePercentage = originalShipment.advancePercentage;
    
    if (advanceValue !== undefined) {
        calculatedAdvanceValue = advanceValue;
        finalAdvancePercentage = advancePercentage || originalShipment.advancePercentage;
        historyLogs.push(`Valor pago na conta de R$ ${calculatedAdvanceValue.toLocaleString('pt-BR')} registrado.`);
    } else if (advancePercentage !== undefined && advancePercentage > 0) {
        finalAdvancePercentage = advancePercentage;
        calculatedAdvanceValue = ((updatedDriverFreight * advancePercentage) / 100) - (tollValue || 0);
        const formattedAdv = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatedAdvanceValue);
        historyLogs.push(`Pagamento de Adiantamento: ${advancePercentage}% registrado (${formattedAdv}).`);
    }

    let finalBalanceToReceive = balanceToReceiveValue ?? originalShipment.balanceToReceiveValue;
    let finalDiscountValue = discountValue ?? originalShipment.discountValue;
    let finalNetBalanceValue = netBalanceValue ?? originalShipment.netBalanceValue;

    if (balanceToReceiveValue !== undefined || discountValue !== undefined || netBalanceValue !== undefined) {
        historyLogs.push(`Pagamento de Saldo registrado.`);
    }

    let finalUnloadedTonnage = unloadedTonnage ?? originalShipment.unloadedTonnage;
    if (unloadedTonnage !== undefined && unloadedTonnage > 0) {
        historyLogs.push(`Peso descarregado: ${unloadedTonnage.toLocaleString('pt-BR')} ton.`);
    }
    
    if (route) historyLogs.push(`Rota informada: ${route}`);

    const statusChangeLog = createHistoryLog(`Status alterado para ${nextStatus}. ${historyLogs.join(' ')}`);

    const updatedShipment: Shipment = {
        ...originalShipment,
        status: nextStatus,
        documents: updatedDocuments,
        bankDetails: bankDetails || originalShipment.bankDetails,
        shipmentTonnage: updatedTonnage,
        driverFreightValue: updatedDriverFreight,
        advancePercentage: finalAdvancePercentage,
        advanceValue: calculatedAdvanceValue,
        tollValue: tollValue !== undefined ? tollValue : originalShipment.tollValue,
        balanceToReceiveValue: finalBalanceToReceive,
        discountValue: finalDiscountValue,
        netBalanceValue: finalNetBalanceValue,
        unloadedTonnage: finalUnloadedTonnage,
        route: route || originalShipment.route,
        history: [...originalShipment.history, statusChangeLog],
        statusHistory: [
            ...(originalShipment.statusHistory || []),
            {
                status: nextStatus,
                timestamp: new Date().toISOString(),
                userId: currentUser.id,
            }
        ],
    };

    // 3. Prepare Cargo Update (if applicable)
    const statusOrder = [
        ShipmentStatus.PreCadastro, ShipmentStatus.AguardandoSeguradora,
        ShipmentStatus.AguardandoCarregamento, ShipmentStatus.AguardandoNota,
        ShipmentStatus.AguardandoAdiantamento, ShipmentStatus.AguardandoAgendamento,
        ShipmentStatus.AguardandoDescarga, ShipmentStatus.AguardandoPagamentoSaldo,
        ShipmentStatus.Finalizado
    ];

    const isAdvancingToLoaded = nextStatus === ShipmentStatus.AguardandoDescarga && 
                               statusOrder.indexOf(originalShipment.status) < statusOrder.indexOf(ShipmentStatus.AguardandoDescarga);

    let updatedCargo: Cargo | undefined;
    if (isAdvancingToLoaded) {
        const cargo = cargos.find(c => c.id === originalShipment.cargoId);
        if (cargo) {
            const newLoadedVolume = (cargo.loadedVolume || 0) + updatedShipment.shipmentTonnage;
            updatedCargo = { 
                ...cargo, 
                loadedVolume: newLoadedVolume, 
                history: [...cargo.history, createHistoryLog(`Volume carregado atualizado para ${newLoadedVolume.toFixed(2)} ton via embarque ${shipmentId}.`)] 
            };
        }
    }

    // 4. Persist to Supabase
    try {
      await upsertShipment(updatedShipment);
      if (updatedCargo) {
        await upsertCargo(updatedCargo);
      }
      
      // 5. Update local state on SUCCESS
      setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
      if (updatedCargo) {
        const cargoToUpdate = updatedCargo; // capture for closure
        setCargos(prev => prev.map(c => c.id === cargoToUpdate.id ? cargoToUpdate : c));
      }

      // 6. Release lock if moving from PreCadastro to AguardandoSeguradora
      if (originalShipment.status === ShipmentStatus.PreCadastro && nextStatus === ShipmentStatus.AguardandoSeguradora) {
        try {
          await releaseShipmentLock(shipmentId, currentUser.id);
          setActiveLocks((prev: ShipmentLock[]) => prev.filter(l => !(l.shipmentId === shipmentId && l.userId === currentUser.id)));
        } catch (lockErr) {
          console.error('Erro ao liberar o bloqueio do embarque:', lockErr);
        }
      }
      
      showToast('Embarque atualizado com sucesso!', 'success');
    } catch(err: any) { 
      console.error('Erro ao salvar no Supabase:', err);
      const errorMessage = err?.message || 'Erro desconhecido ao salvar no banco de dados.';
      showToast(`[ERRO CRÍTICO] Falha ao persistir dados: ${errorMessage}`, 'error');
      throw err;
    }
  };

  const handleUpdateShipmentAnttAndBankDetails = async (shipmentId: string, data: { anttOwnerIdentifier: string; bankDetails?: string }) => {
    const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
    if (!shipmentToUpdate) return;

    const changes: string[] = [];
    if (shipmentToUpdate.anttOwnerIdentifier !== data.anttOwnerIdentifier) changes.push(`${FIELD_TRANSLATIONS.anttOwnerIdentifier} definido.`);
    if (data.bankDetails && shipmentToUpdate.bankDetails !== data.bankDetails) changes.push(`${FIELD_TRANSLATIONS.bankDetails} definidos.`);

    const updatedShipment: Shipment = { 
      ...shipmentToUpdate, 
      anttOwnerIdentifier: data.anttOwnerIdentifier, 
      bankDetails: data.bankDetails || shipmentToUpdate.bankDetails, 
      history: changes.length > 0 ? [...shipmentToUpdate.history, createHistoryLog(changes.join(' '))] : shipmentToUpdate.history 
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    try {
      await upsertShipment(updatedShipment);
    } catch (err) {
      console.error('Erro ao atualizar ANTT/banco:', err);
    }
  };

  const handleUpdateShipmentData = async (shipmentId: string, data: Partial<Shipment>) => {
    const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
    if (!shipmentToUpdate) return;

    const changes: string[] = [];
    const fieldsToTrack: (keyof Shipment)[] = [
      'driverName', 'driverCpf', 'driverContact', 
      'horsePlate', 'trailer1Plate', 'trailer2Plate', 'trailer3Plate', 
      'vehicleTag', 'vehicleSetType', 'vehicleBodyType',
      'shipmentTonnage', 'bankDetails', 'driverReferences', 'ownerContact', 'anttOwnerIdentifier'
    ];

    fieldsToTrack.forEach(field => {
      if (data[field] !== undefined && data[field] !== shipmentToUpdate[field]) {
        const oldVal = shipmentToUpdate[field] || 'Vazio';
        const newVal = data[field] || 'Vazio';
        changes.push(`${FIELD_TRANSLATIONS[field] || field} alterado de "${oldVal}" para "${newVal}".`);
      }
    });

    if (changes.length === 0) return;

    let updatedDriverFreight = shipmentToUpdate.driverFreightValue;
    let updatedCargo: Cargo | undefined;

    if (data.shipmentTonnage !== undefined && data.shipmentTonnage !== shipmentToUpdate.shipmentTonnage) {
        const diff = data.shipmentTonnage - shipmentToUpdate.shipmentTonnage;
        const rateToUse = shipmentToUpdate.driverFreightRateSnapshot || cargos.find(c => c.id === shipmentToUpdate.cargoId)?.driverFreightValuePerTon || 0;
        updatedDriverFreight = rateToUse * data.shipmentTonnage;
        
        const cargo = cargos.find(c => c.id === shipmentToUpdate.cargoId);
        if (cargo) {
            const isLoaded = Object.values(ShipmentStatus).indexOf(shipmentToUpdate.status) >= Object.values(ShipmentStatus).indexOf(ShipmentStatus.AguardandoDescarga);
            updatedCargo = {
                ...cargo,
                scheduledVolume: Math.max(0, cargo.scheduledVolume + diff),
                loadedVolume: isLoaded ? Math.max(0, cargo.loadedVolume + diff) : cargo.loadedVolume,
                history: [...cargo.history, createHistoryLog(`Volume ajustado devido à correção de tonelagem no embarque ${shipmentId} (${shipmentToUpdate.shipmentTonnage} -> ${data.shipmentTonnage}).`)]
            };
        }
    }

    const updatedShipment: Shipment = { 
      ...shipmentToUpdate, 
      ...data, 
      driverFreightValue: updatedDriverFreight,
      history: [...shipmentToUpdate.history, createHistoryLog(`Dados do embarque corrigidos: ${changes.join(' ')}`)] 
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    if (updatedCargo) {
        setCargos(prev => prev.map(c => c.id === updatedShipment.cargoId ? updatedCargo! : c));
    }

    try {
      await upsertShipment(updatedShipment);
      if (updatedCargo) await upsertCargo(updatedCargo);
      showToast('Dados do embarque atualizados com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao atualizar dados do embarque:', err);
      showToast('Erro ao salvar alterações no banco de dados.', 'error');
    }
  };

  const handleUpdateShipmentPrice = async (shipmentId: string, data: { newTotal: number, newRate?: number, newCompanyRate?: number }) => {
    const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
    if (!shipmentToUpdate) return;

    const oldPriceFormatted = shipmentToUpdate.driverFreightValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const newPriceFormatted = data.newTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const historyMsgParts = [`${FIELD_TRANSLATIONS['driverFreightValue']} alterado de "${oldPriceFormatted}" para "${newPriceFormatted}".`];

    const updateObj: Partial<Shipment> = { driverFreightValue: data.newTotal };
    
    if (data.newRate !== undefined) {
      const oldRateFormatted = (shipmentToUpdate.driverFreightRateSnapshot || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const newRateFormatted = data.newRate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      updateObj.driverFreightRateSnapshot = data.newRate;
      historyMsgParts.push(`Taxa do motorista alterada de "${oldRateFormatted}" para "${newRateFormatted}".`);
    }

    if (data.newCompanyRate !== undefined) {
      const oldCompanyRateFormatted = (shipmentToUpdate.companyFreightRateSnapshot || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const newCompanyRateFormatted = data.newCompanyRate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      updateObj.companyFreightRateSnapshot = data.newCompanyRate;
      historyMsgParts.push(`Frete Empresa alterado de "${oldCompanyRateFormatted}" para "${newCompanyRateFormatted}".`);
    }

    const updatedShipment: Shipment = { 
      ...shipmentToUpdate, 
      ...updateObj, 
      history: [...shipmentToUpdate.history, createHistoryLog(historyMsgParts.join(' '))] 
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    try {
      await upsertShipment(updatedShipment);
    } catch (err) {
      console.error('Erro ao atualizar preço:', err);
    }
  };

  const handleUpdateScheduledDateTime = async (shipmentId: string, data: { scheduledDate: string, scheduledTime?: string }) => {
    const shipmentToUpdate = shipments.find(s => s.id === shipmentId);
    if (!shipmentToUpdate) return;

    const changes: string[] = [];
    if (shipmentToUpdate.scheduledDate !== data.scheduledDate) {
      changes.push(`Data Programada alterada de "${shipmentToUpdate.scheduledDate}" para "${data.scheduledDate}".`);
    }
    if (data.scheduledTime !== undefined && shipmentToUpdate.scheduledTime !== data.scheduledTime) {
      changes.push(`Horário Previsto alterado de "${shipmentToUpdate.scheduledTime || 'N/A'}" para "${data.scheduledTime}".`);
    }

    if (changes.length === 0) return;

    const updatedShipment: Shipment = { 
      ...shipmentToUpdate, 
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      history: [...shipmentToUpdate.history, createHistoryLog(changes.join(' '))] 
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    try {
      await upsertShipment(updatedShipment);
    } catch (err) {
      console.error('Erro ao atualizar agendamento:', err);
    }
  };

  
  const handleConfirmCancelShipment = async (shipmentId: string, reason: string) => {
    const shipmentToCancel = shipments.find(s => s.id === shipmentId);
    if (!shipmentToCancel || !currentUser) return;
    
    const oldStatus = shipmentToCancel.status;
    const historyEntry = `Status alterado de "${oldStatus}" para "${ShipmentStatus.Cancelado}". Motivo: ${reason}`;
    
    const cancelledShipment: Shipment = { 
      ...shipmentToCancel, 
      status: ShipmentStatus.Cancelado,
      cancellationReason: reason,
      history: [...shipmentToCancel.history, createHistoryLog(historyEntry)], 
      statusHistory: [...(shipmentToCancel.statusHistory || []), { status: ShipmentStatus.Cancelado, timestamp: new Date().toISOString(), userId: currentUser.id }] 
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? cancelledShipment : s));

    const wasLoaded = Object.values(ShipmentStatus).indexOf(shipmentToCancel.status) >= Object.values(ShipmentStatus).indexOf(ShipmentStatus.AguardandoDescarga);
    const relatedCargo = cargos.find(c => c.id === shipmentToCancel.cargoId);
    
    let updatedCargo: Cargo | undefined;
    if (relatedCargo) {
        const newScheduledVolume = relatedCargo.scheduledVolume - shipmentToCancel.shipmentTonnage;
        const newLoadedVolume = wasLoaded ? relatedCargo.loadedVolume - shipmentToCancel.shipmentTonnage : relatedCargo.loadedVolume;
        const historyDescription = wasLoaded
            ? `Volumes agendado e carregado ajustados devido ao cancelamento do embarque ${shipmentId}`
            : `Volume agendado ajustado devido ao cancelamento do embarque ${shipmentId}`;
        
        updatedCargo = { 
            ...relatedCargo, 
            scheduledVolume: Math.max(0, newScheduledVolume), 
            loadedVolume: Math.max(0, newLoadedVolume), 
            history: [...relatedCargo.history, createHistoryLog(historyDescription)] 
        };
        
        setCargos(prevCargos => prevCargos.map(cargo => cargo.id === relatedCargo.id ? updatedCargo! : cargo));
    }

    try {
      await upsertShipment(cancelledShipment);
      if (updatedCargo) await upsertCargo(updatedCargo);
      
      // Release lock on cancel if it was locked
      if (shipmentToCancel.status === ShipmentStatus.PreCadastro) {
        try {
          await releaseShipmentLock(shipmentId, currentUser.id);
          setActiveLocks((prev: ShipmentLock[]) => prev.filter(l => !(l.shipmentId === shipmentId && l.userId === currentUser.id)));
        } catch (lockErr) {
          console.error('Erro ao liberar o bloqueio do embarque no cancelamento:', lockErr);
        }
      }
    } catch (err) {
      console.error('Erro ao cancelar embarque:', err);
    }
  };

  const handleTransferShipment = async (shipmentId: string, newEmbarcadorId: string) => {
    let updated: Shipment | undefined;
    setShipments((prev: Shipment[]) => prev.map(s => {
        if (s.id === shipmentId) {
            const oldEmbarcadorName = users.find(u => u.id === s.embarcadorId)?.name || 'N/A';
            const newEmbarcadorName = users.find(u => u.id === newEmbarcadorId)?.name || 'N/A';
            updated = { ...s, embarcadorId: newEmbarcadorId, history: [...s.history, createHistoryLog(`Embarcador responsável alterado de "${oldEmbarcadorName}" para "${newEmbarcadorName}".`)] };
            return updated;
        }
        return s;
    }));
    if (updated) {
      try { await upsertShipment(updated); } catch(err) { console.error('Erro ao transferir embarque:', err); }
    }
  };

  const handleSwapCargo = async (shipmentId: string, newCargoId: string) => {
    if (!currentUser) return;

    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment) return;

    const oldCargoId = shipment.cargoId;
    if (oldCargoId === newCargoId) return;

    const oldCargo = cargos.find(c => c.id === oldCargoId);
    const newCargo = cargos.find(c => c.id === newCargoId);

    if (!newCargo) {
      showToast('Nova carga não encontrada.', 'error');
      return;
    }

    const tonnage = shipment.shipmentTonnage;

    // 1. Prepare updated Shipment
    const newDriverRate = newCargo.driverFreightValuePerTon;
    const newCompanyRate = newCargo.companyFreightValuePerTon;
    const newTotalDriverFreight = newDriverRate * tonnage;

    const updatedShipment: Shipment = {
      ...shipment,
      cargoId: newCargoId,
      driverFreightRateSnapshot: newDriverRate,
      companyFreightRateSnapshot: newCompanyRate,
      driverFreightValue: newTotalDriverFreight,
      history: [
        ...shipment.history,
        createHistoryLog(`Carga trocada de #${oldCargo?.sequenceId || oldCargoId} para #${newCargo.sequenceId}. Taxas e valores de frete atualizados.`)
      ]
    };

    // 2. Prepare updated Old Cargo (if exists)
    let updatedOldCargo: Cargo | undefined;
    if (oldCargo) {
      updatedOldCargo = {
        ...oldCargo,
        scheduledVolume: Math.max(0, oldCargo.scheduledVolume - tonnage),
        history: [
          ...oldCargo.history,
          createHistoryLog(`Volume agendado reduzido em ${tonnage} ton devido à troca de carga do embarque ${shipmentId} para a carga #${newCargo.sequenceId}.`)
        ]
      };
    }

    // 3. Prepare updated New Cargo
    const updatedNewCargo: Cargo = {
      ...newCargo,
      scheduledVolume: newCargo.scheduledVolume + tonnage,
      history: [
        ...newCargo.history,
        createHistoryLog(`Volume agendado aumentado em ${tonnage} ton devido à troca de carga do embarque ${shipmentId} da carga #${oldCargo?.sequenceId || oldCargoId}.`)
      ]
    };

    // Optimistic UI updates
    setShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    setCargos(prev => prev.map(c => {
      if (c.id === oldCargoId && updatedOldCargo) return updatedOldCargo;
      if (c.id === newCargoId) return updatedNewCargo;
      return c;
    }));

    // Persistence
    try {
      const promises = [
        upsertShipment(updatedShipment),
        upsertCargo(updatedNewCargo)
      ];
      if (updatedOldCargo) promises.push(upsertCargo(updatedOldCargo));
      
      await Promise.all(promises);
      showToast(`Embarque ${shipmentId} transferido para a carga #${newCargo.sequenceId} com sucesso!`, 'success');
    } catch (err) {
      console.error('Erro ao trocar carga:', err);
      showToast('Erro ao persistir a troca de carga no banco de dados.', 'error');
    }
  };

  const handleSaveClient = async (clientData: Client | Omit<Client, 'id'>) => {
    let saved: Client;
    if ('id' in clientData) {
      saved = clientData;
      setClients(prev => prev.map(c => c.id === clientData.id ? clientData : c));
    } else { 
      const newId = formatId(nextIds.client, 'CLI');
      saved = { ...clientData, id: newId };
      setClients(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, client: prev.client + 1 }));
    }
    try { await upsertClient(saved); } catch(err) { console.error('Erro ao salvar cliente:', err); }
  };
  
  const handleDeleteCargo = async (cargoId: string) => {
    if (!currentUser || currentUser.profile !== UserProfile.Admin) return;
    
    const relatedShipments = shipments.filter(s => s.cargoId === cargoId);
    const confirmMsg = relatedShipments.length > 0
      ? `A carga ${cargoId} possui ${relatedShipments.length} embarque(s) associado(s). Se você excluir a carga, os embarques NÃO serão excluídos, mas poderão ficar sem os detalhes da carga original na visualização. Deseja excluir a carga e manter os embarques?`
      : `Tem certeza que deseja excluir permanentemente a carga ${cargoId}?`;

    if (confirm(confirmMsg)) {
        try {
            await deleteCargo(cargoId);
            setCargos(prev => prev.filter(c => c.id !== cargoId));
            showToast("Carga excluída com sucesso. Os embarques vinculados foram preservados.", 'success');
        } catch (error) {
            console.error('Erro ao excluir carga:', error);
            showToast("Erro ao excluir carga. Verifique o console.", 'error');
        }
    }
  };


  const handleDeleteShipment = async (shipmentId: string) => {
    if (!currentUser || currentUser.profile !== UserProfile.Admin) return;
    
    const shipmentToDelete = shipments.find(s => s.id === shipmentId);
    if (!shipmentToDelete) return;

    if (confirm(`Tem certeza que deseja excluir permanentemente o embarque ${shipmentId}?`)) {
        try {
            await deleteShipment(shipmentId);
            setShipments(prev => prev.filter(s => s.id !== shipmentId));

            // Release lock if it existed
            try {
              await releaseShipmentLock(shipmentId, currentUser.id);
              setActiveLocks((prev: ShipmentLock[]) => prev.filter(l => l.shipmentId !== shipmentId));
            } catch (lockErr) {
              console.warn('Erro ao liberar bloqueio do embarque excluído:', lockErr);
            }

            // Atualizar volumes da carga
            const wasLoaded = Object.values(ShipmentStatus).indexOf(shipmentToDelete.status) >= Object.values(ShipmentStatus).indexOf(ShipmentStatus.AguardandoDescarga);
            const relatedCargo = cargos.find(c => c.id === shipmentToDelete.cargoId);
            
            if (relatedCargo) {
                const newScheduledVolume = Math.max(0, relatedCargo.scheduledVolume - (shipmentToDelete.shipmentTonnage || 0));
                const newLoadedVolume = wasLoaded ? Math.max(0, relatedCargo.loadedVolume - (shipmentToDelete.shipmentTonnage || 0)) : relatedCargo.loadedVolume;
                const updatedCargo: Cargo = { 
                    ...relatedCargo, 
                    scheduledVolume: newScheduledVolume, 
                    loadedVolume: newLoadedVolume,
                    history: [...relatedCargo.history, createHistoryLog(`Embarque ${shipmentId} EXCLUÍDO pelo Administrador. Volumes ajustados.`)]
                };
                
                setCargos(prevCargos => prevCargos.map(cargo => cargo.id === relatedCargo.id ? updatedCargo : cargo));
                await upsertCargo(updatedCargo);
            }
            showToast("Embarque excluído com sucesso e volumes da carga recalculados.", 'success');
        } catch (error) {
            console.error('Erro ao excluir embarque:', error);
            showToast("Erro ao excluir embarque. Verifique o console.", 'error');
        }
    }
  };

  const handleSaveOwner = async (ownerData: Owner | Omit<Owner, 'id'>) => {
    let saved: Owner;
    if ('id' in ownerData) {
      saved = ownerData;
      setOwners(prev => prev.map(o => o.id === ownerData.id ? ownerData : o));
    } else {
      const newId = formatId(nextIds.owner, 'OWN');
      saved = { ...ownerData, id: newId };
      setOwners(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, owner: prev.owner + 1 }));
    }
    try { await upsertOwner(saved); } catch(err) { console.error('Erro ao salvar proprietário:', err); }
  };

  const handleSaveDriver = async (driverData: Driver | Omit<Driver, 'id'>) => {
    let saved: Driver;
    if ('id' in driverData) {
      saved = driverData;
      setDrivers(prev => prev.map(d => d.id === driverData.id ? driverData : d));
    } else {
      const newId = formatId(nextIds.driver, 'DRV');
      saved = { ...driverData, id: newId };
      setDrivers(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, driver: prev.driver + 1 }));
    }
    try { 
      await upsertDriver(saved); 
      showToast('Motorista salvo com sucesso!', 'success');
    } catch(err: any) { 
      console.error('Erro ao salvar motorista:', err); 
      showToast(`Erro ao salvar motorista: ${err.message || 'Erro desconhecido'}`, 'error');
    }
  };

  const handleSaveVehicle = async (vehicleData: Vehicle | Omit<Vehicle, 'id'>) => {
    let saved: Vehicle;
    if ('id' in vehicleData) {
      saved = vehicleData;
      setVehicles(prev => prev.map(v => v.id === vehicleData.id ? vehicleData : v));
    } else {
      const newId = formatId(nextIds.vehicle, 'VEH');
      saved = { ...vehicleData, id: newId };
      setVehicles(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, vehicle: prev.vehicle + 1 }));
    }
    try { 
      await upsertVehicle(saved); 
      showToast('Veículo salvo com sucesso!', 'success');
    } catch(err: any) { 
      console.error('Erro ao salvar veículo:', err); 
      showToast(`Erro ao salvar veículo: ${err.message || 'Erro desconhecido'}`, 'error');
    }
  };

  const handleSaveProduct = async (productData: Product | Omit<Product, 'id'>) => {
    let saved: Product;
    if ('id' in productData) {
      saved = productData;
      setProducts(prev => prev.map(p => p.id === productData.id ? productData : p));
    } else {
      const newId = `PRD-${String(nextIds.product).padStart(3, '0')}`;
      saved = { ...productData, id: newId };
      setProducts(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, product: prev.product + 1 }));
    }
    try { await upsertProduct(saved); } catch(err) { console.error('Erro ao salvar produto:', err); }
    showToast('Produto salvo com sucesso!', 'success');
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      showToast('Produto excluído com sucesso.', 'success');
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      showToast('Erro ao excluir produto.', 'error');
    }
  };
  
  const handleSaveLoad = async (loadData: Cargo | Omit<Cargo, 'id' | 'history' | 'createdAt' | 'createdById'>) => {
    // Sanitize branchId to avoid FK violations ('' is not a valid UUID)
    if (loadData.branchId === '') {
        delete loadData.branchId;
    }

    if ('id' in loadData) {
      const oldCargo = cargos.find(l => l.id === loadData.id);

      if (!oldCargo) return;

      if (loadData.status === CargoStatus.Fechada || loadData.status === CargoStatus.Suspensa) {
        const today = new Date().toISOString().split('T')[0];
        if (loadData.dailySchedule) {
          loadData.dailySchedule = loadData.dailySchedule.filter(entry => entry.date <= today);
        }
      }

      const changes: string[] = [];
      (Object.keys(loadData) as Array<keyof Cargo>).forEach(key => {
        if (key === 'scheduledVolume' || key === 'loadedVolume') return;

        const oldValue: any = oldCargo[key];
        const newValue: any = loadData[key];

        if (key !== 'id' && key !== 'history' && key !== 'createdAt' && oldValue !== newValue) {
          const fieldName = FIELD_TRANSLATIONS[key] || key;
          let oldDisplayValue = oldValue;
          let newDisplayValue = newValue;

          switch (key) {
            case 'clientId':
              oldDisplayValue = clients.find(c => c.id === oldValue)?.nomeFantasia || oldValue;
              newDisplayValue = clients.find(c => c.id === newValue)?.nomeFantasia || newValue;
              break;
            case 'productId':
              oldDisplayValue = products.find(p => p.id === oldValue)?.name || oldValue;
              newDisplayValue = products.find(p => p.id === newValue)?.name || newValue;
              break;
            case 'createdById':
              oldDisplayValue = users.find(u => u.id === oldValue)?.name || oldValue;
              newDisplayValue = users.find(u => u.id === newValue)?.name || newValue;
              break;
            case 'hasIcms':
            case 'requiresScheduling':
              oldDisplayValue = oldValue ? 'Sim' : 'Não';
              newDisplayValue = newValue ? 'Sim' : 'Não';
              break;
            case 'companyFreightValuePerTon':
            case 'driverFreightValuePerTon':
              oldDisplayValue = oldValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'N/A';
              newDisplayValue = newValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'N/A';
              break;
            case 'totalVolume':
              oldDisplayValue = `${oldValue} ton`;
              newDisplayValue = `${newValue} ton`;
              break;
            case 'icmsPercentage':
              oldDisplayValue = `${oldValue}%`;
              newDisplayValue = `${newValue}%`;
              break;
            case 'originCoords':
            case 'destinationCoords':
              oldDisplayValue = oldValue ? `Lat: ${oldValue.lat.toFixed(4)}, Lng: ${oldValue.lng.toFixed(4)}` : 'N/A';
              newDisplayValue = newValue ? `Lat: ${newValue.lat.toFixed(4)}, Lng: ${newValue.lng.toFixed(4)}` : 'N/A';
              break;
            case 'dailySchedule':
              oldDisplayValue = Array.isArray(oldValue) && oldValue.length > 0 ? `${oldValue.length} dias agendados` : (oldValue === "" ? 'Vazio' : 'N/A');
              newDisplayValue = Array.isArray(newValue) && newValue.length > 0 ? `${newValue.length} dias agendados` : 'Vazio';
              break;
            case 'freightLegs':
              oldDisplayValue = Array.isArray(oldValue) && oldValue.length > 0 ? `${oldValue.length} trechos` : 'Padrão';
              newDisplayValue = Array.isArray(newValue) && newValue.length > 0 ? `${newValue.length} trechos` : 'Padrão';
              break;
          }
          changes.push(`${fieldName} alterado de "${oldDisplayValue}" para "${newDisplayValue}"`);
        }
      });

      let updatedCargo: Cargo;
      const baseHistory = ('history' in loadData && Array.isArray(loadData.history) && loadData.history.length > oldCargo.history.length) ? loadData.history : oldCargo.history;

      if (changes.length > 0) {
        const newHistory = createHistoryLog(`Carga atualizada: ${changes.join('; ')}.`);
        updatedCargo = { ...oldCargo, ...loadData, history: [...baseHistory, newHistory] } as Cargo;
      } else {
        updatedCargo = { ...oldCargo, ...loadData, history: baseHistory } as Cargo;
      }

      setCargos(prev => prev.map(l => l.id === loadData.id ? updatedCargo : l));
      try {
        await upsertCargo(updatedCargo);
      } catch (err: any) {
        console.error('Erro ao salvar carga no Supabase:', err);
        const errorMessage = err?.message || 'Erro desconhecido ao salvar no banco de dados.';
        showToast(`[ERRO CRÍTICO] A carga não pôde ser atualizada no banco de dados: ${errorMessage}`, 'error');
      }
    } else { 
      if (!currentUser) return;
      
      const newId = formatId(nextIds.cargo, 'CRG');
      const newSequenceId = (loadData as any).sequenceId || nextIds.cargo;
      const newLoad: Cargo = {
        ...loadData,
        id: newId,
        sequenceId: newSequenceId,
        scheduledVolume: loadData.scheduledVolume || 0,
        loadedVolume: loadData.loadedVolume || 0,
        createdAt: new Date().toISOString(),
        createdById: (loadData as any).createdById || currentUser.id,
        history: [createHistoryLog(`Carga #${newSequenceId} criada com sucesso.`)],
      } as Cargo;

      // Persistência imediata no estado local (nunca é removida por rollback)
      setCargos(prev => [newLoad, ...prev]);
      setNextIds((prev: any) => ({ ...prev, cargo: Math.max(prev.cargo, newSequenceId + 1) }));
      
      try {
        await upsertCargo(newLoad);
      } catch (err: any) {
        console.warn('Erro/Aviso ao sincronizar carga no Supabase:', err);
      }
      showToast(`Nova carga #${newLoad.sequenceId || newLoad.id} cadastrada com sucesso!`, 'success');
    }
  };

  const handleSaveUser = async (userData: User | Omit<User, 'id'>) => {
    let saved: User;
    if ('id' in userData) {
      const existingUser = users.find(u => u.id === userData.id);
      saved = { ...existingUser, ...userData } as User;
      setUsers(prev => prev.map(u => u.id === userData.id ? saved : u));
    } else { 
      const newId = formatId(nextIds.user, 'USR');
      saved = { ...userData, id: newId } as User;
      setUsers(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, user: prev.user + 1 }));
    }
    try { 
      await upsertUser(saved);
      showToast("Usuário salvo com sucesso!", "success");
    } catch(err: any) { 
      console.error('Erro ao salvar usuário:', err); 
      showToast("Erro ao salvar usuário: " + (err.message || "Erro desconhecido"), "error");
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (!currentUser || currentUser.profile !== UserProfile.Admin) return;
    if (userId === currentUser.id) {
        showToast("Você não pode excluir seu próprio usuário.", 'warning');
        return;
    }
    
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        try {
            await deleteUser(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
            showToast("Usuário excluído com sucesso.", 'success');
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            showToast("Erro ao excluir usuário. Verifique o console.", 'error');
        }
    }
  };

  const handleSaveBranch = async (branchData: Branch | Omit<Branch, 'id' | 'createdAt'>) => {
    let saved: Branch;
    if ('id' in branchData) {
      saved = branchData;
      setBranches(prev => prev.map(b => b.id === branchData.id ? branchData : b));
    } else {
      const newId = `FIL-${String(nextIds.branch).padStart(3, '0')}`;
      saved = { ...branchData, id: newId, createdAt: new Date().toISOString() } as Branch;
      setBranches(prev => [saved, ...prev]);
      setNextIds((prev: any) => ({ ...prev, branch: prev.branch + 1 }));
    }
    try { await upsertBranch(saved); } catch(err) { console.error('Erro ao salvar filial:', err); }
    showToast('Filial salva com sucesso!', 'success');
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (!currentUser || currentUser.profile !== UserProfile.Admin) return;
    if (confirm('Tem certeza que deseja excluir esta filial?')) {
      try {
        await deleteBranch(branchId);
        setBranches(prev => prev.filter(b => b.id !== branchId));
        showToast('Filial excluída com sucesso.', 'success');
      } catch (err) {
        console.error('Erro ao excluir filial:', err);
        showToast('Erro ao excluir filial.', 'error');
      }
    }
  };

  const handleRevertShipmentStatus = async (shipmentId: string) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment || !currentUser) return;
    
    if (![UserProfile.Admin, UserProfile.Diretor, UserProfile.Coordenador].includes(currentUser.profile)) {
        showToast("Apenas administradores, diretores ou coordenadores podem reverter o status.", 'warning');
        return;
    }

    if (!shipment.statusHistory || shipment.statusHistory.length <= 1) {
        showToast("Não há histórico de status para reverter.", 'info');
        return;
    }

    const currentStatus = shipment.status;
    const historyCopy = [...shipment.statusHistory];
    historyCopy.pop(); // Remove the current status entry
    const previousStatusEntry = historyCopy[historyCopy.length - 1];
    const previousStatus = previousStatusEntry.status;

    const docTypeToRemove = REQUIRED_DOCUMENT_MAP[previousStatus];
    const updatedDocuments = { ...(shipment.documents || {}) };
    if (docTypeToRemove && updatedDocuments[docTypeToRemove]) {
        delete updatedDocuments[docTypeToRemove];
    }

    let updatedCargo: Cargo | undefined;
    if (currentStatus === ShipmentStatus.AguardandoDescarga) {
        const cargo = cargos.find(c => c.id === shipment.cargoId);
        if (cargo) {
            const newLoadedVolume = Math.max(0, cargo.loadedVolume - shipment.shipmentTonnage);
            updatedCargo = {
                ...cargo,
                loadedVolume: newLoadedVolume,
                history: [...cargo.history, createHistoryLog(`Volume carregado estornado devido à reversão do embarque ${shipmentId} (Status revertido para ${previousStatus}).`)]
            };
        }
    }

    const updatedShipment: Shipment = {
        ...shipment,
        status: previousStatus,
        statusHistory: historyCopy,
        documents: Object.keys(updatedDocuments).length > 0 ? updatedDocuments : undefined,
        history: [...shipment.history, createHistoryLog(`Status revertido de "${currentStatus}" para "${previousStatus}" por ${currentUser.name}. Anexos do último passo removidos.`)]
    };

    setShipments((prev: Shipment[]) => prev.map(s => s.id === shipmentId ? updatedShipment : s));
    if (updatedCargo) {
        setCargos(prev => prev.map(c => c.id === updatedShipment.cargoId ? updatedCargo! : c));
    }

    try {
        await upsertShipment(updatedShipment);
        if (updatedCargo) await upsertCargo(updatedCargo);
    } catch (err) {
        console.error('Erro ao salvar reversão:', err);
        showToast("Erro ao salvar a reversão no banco de dados.", 'error');
    }
  };

  const handleReactivateLoad = async (cargoToReactivate: Cargo) => {
    if (!currentUser) return;
    
    const reason = window.prompt(`Por favor, informe o motivo para reativar a carga ${cargoToReactivate.sequenceId}:`);
    if (reason === null) return;
    if (!reason.trim()) {
        showToast("É obrigatório informar o motivo para reativar a carga.", "warning");
        return;
    }

    const updatedCargo: Cargo = {
      ...cargoToReactivate,
      status: CargoStatus.EmAndamento,
      history: [...cargoToReactivate.history, createHistoryLog(`Carga reativada por ${currentUser.name}. Motivo: ${reason}. Status alterado de "${cargoToReactivate.status}" para "Em Andamento".`)]
    };

    setCargos(prev => prev.map(c => c.id === cargoToReactivate.id ? updatedCargo : c));
    try {
      await upsertCargo(updatedCargo);
    } catch (err) {
      console.error('Erro ao reativar carga:', err);
      showToast("Erro ao reativar carga no banco de dados.", 'error');
    }
  };

  const handleSuspendLoad = async (cargoToSuspend: Cargo) => {
    if (!currentUser) return;
    
    const reason = window.prompt(`Por favor, informe o motivo para suspender a carga ${cargoToSuspend.sequenceId}:`);
    if (reason === null) return;
    if (!reason.trim()) {
        showToast("É obrigatório informar o motivo para suspender a carga.", "warning");
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const filteredSchedule = cargoToSuspend.dailySchedule ? cargoToSuspend.dailySchedule.filter(entry => entry.date <= today) : [];

    const updatedCargo: Cargo = {
      ...cargoToSuspend,
      status: CargoStatus.Suspensa,
      dailySchedule: filteredSchedule,
      history: [...cargoToSuspend.history, createHistoryLog(`Carga suspensa por ${currentUser.name}. Motivo: ${reason}. Programação futura excluída.`)]
    };

    setCargos(prev => prev.map(c => c.id === cargoToSuspend.id ? updatedCargo : c));
    try {
      await upsertCargo(updatedCargo);
    } catch (err) {
      console.error('Erro ao suspender carga:', err);
      showToast("Erro ao suspender carga no banco de dados.", 'error');
    }
  };

  const handleUpdateTmsBatch = async (cargoId: string, tmsBatchNumber: string, destId?: string) => {
    if (!currentUser) return;
    const cargo = cargos.find(c => c.id === cargoId);
    if (!cargo) return;

    let updatedCargo: Cargo;
    if (destId) {
      updatedCargo = {
        ...cargo,
        destinations: cargo.destinations?.map(d => d.id === destId ? { ...d, tmsBatchNumber } : d),
        history: [...cargo.history, createHistoryLog(`Lote TMS do destino atualizado para: ${tmsBatchNumber} por ${currentUser.name}`)]
      };
    } else {
      updatedCargo = {
        ...cargo,
        tmsBatchNumber,
        history: [...cargo.history, createHistoryLog(`Lote TMS atualizado para: ${tmsBatchNumber} por ${currentUser.name}`)]
      };
    }

    setCargos(prev => prev.map(c => c.id === cargoId ? updatedCargo : c));
    try {
      await upsertCargo(updatedCargo);
      showToast("Lote TMS atualizado com sucesso!", "success");
    } catch (err) {
      console.error('Erro ao atualizar Lote TMS:', err);
      showToast("Erro ao atualizar Lote TMS no banco de dados.", "error");
    }
  };

  // --- RENDER LOGIC ---
  const renderPage = () => {
    if (!currentUser) return null;

    // We moved the isLoading check to the top-level to prevent race conditions during login.

    if (loadError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
          <p style={{ color: '#ef4444', fontSize: '16px' }}>{loadError}</p>
          <button onClick={() => loadAllData()} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Tentar novamente</button>
        </div>
      );
    }


    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage cargos={visibleLoads} shipments={visibleShipments} users={users} currentUser={currentUser} clients={clients} products={products} companyLogo={companyLogo} vehicles={vehicles} onDeleteAttachment={handleDeleteShipmentAttachment} onUpdatePrice={handleUpdateShipmentPrice} />;
      case 'clients':
        return <ClientsPage clients={clients} setClients={setClients} onSaveClient={handleSaveClient} currentUser={currentUser} profilePermissions={profilePermissions} />;
      case 'owners':
        return <OwnersPage owners={owners} setOwners={setOwners} onSaveOwner={handleSaveOwner} currentUser={currentUser} profilePermissions={profilePermissions} />;
      case 'drivers':
        return <DriversPage drivers={drivers} setDrivers={setDrivers} onSaveDriver={handleSaveDriver} owners={owners} currentUser={currentUser} profilePermissions={profilePermissions} shipments={visibleShipments} cargos={cargos} />;
      case 'vehicles':
        return <VehiclesPage vehicles={vehicles} setVehicles={setVehicles} onSaveVehicle={handleSaveVehicle} owners={owners} currentUser={currentUser} profilePermissions={profilePermissions} shipments={visibleShipments} cargos={cargos} />;
      case 'loads':
        return <LoadsPage loads={activeLoads} setLoads={setCargos} clients={clients} products={products} onSaveLoad={handleSaveLoad} onReactivateLoad={handleReactivateLoad} onSuspendLoad={handleSuspendLoad} onUpdateTmsBatch={handleUpdateTmsBatch} onUpdatePrice={handleUpdateShipmentPrice} currentUser={currentUser} profilePermissions={profilePermissions} users={users} shipments={visibleShipments} onDeleteLoad={handleDeleteCargo} onModalStateChange={setIsAnyModalOpen} companyLogo={companyLogo} vehicles={vehicles} onDeleteAttachment={handleDeleteShipmentAttachment} branches={branches} />;
      case 'products':
        return <ProductsPage products={products} onSaveProduct={handleSaveProduct} onDeleteProduct={handleDeleteProduct} currentUser={currentUser} profilePermissions={profilePermissions} />;
      case 'shipments':
        return <ShipmentsPage 
                    shipments={visibleShipments} 
                    cargos={cargos} 
                    clients={clients} 
                    products={products}
                    drivers={drivers} 
                    vehicles={vehicles}
                    currentUser={currentUser} 
                    profilePermissions={profilePermissions} 
                    users={users}
                    onUpdateAttachment={handleUpdateShipmentAttachment}
                    onAddAttachments={handleAddShipmentAttachments}
                    onUpdatePrice={handleUpdateShipmentPrice}
                    onConfirmCancel={handleConfirmCancelShipment}
                    onUpdateAnttAndBankDetails={handleUpdateShipmentAnttAndBankDetails}
                    onMarkArrival={handleMarkArrival}
                    onTransferShipment={handleTransferShipment}
                    onDeleteShipment={handleDeleteShipment}
                    onRevertStatus={handleRevertShipmentStatus}
                    onUpdateScheduledDateTime={handleUpdateScheduledDateTime}
                    onUpdateShipmentData={handleUpdateShipmentData}
                    onDeleteAttachment={handleDeleteShipmentAttachment}
                    onSwapCargo={handleSwapCargo}
                    activeLocks={activeLocks}
                    onModalStateChange={setIsAnyModalOpen}
                    companyLogo={companyLogo}
                />;
      case 'operational-loads':
        return (
          <OperationalLoadsPage
            loads={inProgressLoads}
            clients={clients}
            products={products}
            drivers={drivers}
            vehicles={vehicles}
            onCreateShipment={handleCreateShipment}
            onSaveLoad={handleSaveLoad}
            onReactivateLoad={handleReactivateLoad}
            onSuspendLoad={handleSuspendLoad}
            onUpdateTmsBatch={handleUpdateTmsBatch}
            currentUser={currentUser} 
            profilePermissions={profilePermissions}
            shipments={visibleShipments}
            users={users}
            onDeleteLoad={handleDeleteCargo}
            onUpdatePrice={handleUpdateShipmentPrice}
            onModalStateChange={setIsAnyModalOpen}
            onDeleteAttachment={handleDeleteShipmentAttachment}
            branches={branches}
          />
        );
      case 'operational-map':
        return (
          <OperationalMapPage
            cargos={cargos}
            shipments={shipments}
            clients={clients}
            products={products}
            drivers={drivers}
            vehicles={vehicles}
            onCreateShipment={handleCreateShipment}
            currentUser={currentUser}
            users={users}
            onModalStateChange={setIsAnyModalOpen}
            onDeleteAttachment={handleDeleteShipmentAttachment}
          />
        );
      case 'financial':
        return <CommissionsPage shipments={visibleShipments} cargos={cargos} users={users} />;
      case 'reports':
        return <ReportsPage shipments={visibleShipments} embarcadores={visibleEmbarcadores} cargos={cargos} users={users} currentUser={currentUser} clients={clients} branches={branches} />;
      case 'users-register':
        return <UsersPage 
                  users={users} 
                  setUsers={setUsers} 
                  onSaveUser={handleSaveUser} 
                  currentUser={currentUser} 
                  profilePermissions={profilePermissions} 
                  onSavePermissions={handleSavePermissions}
                  clients={clients}
                  onDeleteUser={handleDeleteUser}
                  branches={branches}
                />;
      case 'appearance':
        return <AppearancePage
                  currentLogo={companyLogo}
                  onSaveLogo={handleSaveLogo}
                  currentTheme={themeImage}
                  onSaveTheme={handleSaveThemeImage}
                />;
      case 'system-monitor':
        return <SystemMonitorPage />;
      case 'shipment-history':
        return <ShipmentHistoryPage
                  shipments={visibleShipments}
                  cargos={cargos}
                  users={users}
                  currentUser={currentUser}
                  clients={clients}
                  products={products}
                  vehicles={vehicles}
                  onDeleteShipment={handleDeleteShipment}
                  onRevertStatus={handleRevertShipmentStatus}
                  onDeleteAttachment={handleDeleteShipmentAttachment}
                  onUpdatePrice={handleUpdateShipmentPrice}
                  profilePermissions={profilePermissions}
                />;
      case 'load-history':
        return <LoadHistoryPage
                  loads={closedLoads}
                  clients={clients}
                  products={products}
                  users={users}
                  currentUser={currentUser}
                  shipments={shipments}
                  onDeleteLoad={handleDeleteCargo}
                  onReactivateLoad={handleReactivateLoad}
                  profilePermissions={profilePermissions}
                />;
      case 'layover-calculator':
        return <LayoverCalculatorPage currentUser={currentUser} shipments={shipments} cargos={cargos} clients={clients} />;
      case 'freight-quote':
        return <FreightQuotePage currentUser={currentUser} />;
      case 'tools-history':
        return <ToolsHistoryPage currentUser={currentUser} shipments={shipments} cargos={cargos} clients={clients} />;
      case 'branches':
        return <BranchesPage branches={branches} onSaveBranch={handleSaveBranch} onDeleteBranch={handleDeleteBranch} currentUser={currentUser} profilePermissions={profilePermissions} />;
      default:
        return <DashboardPage cargos={activeLoads} shipments={visibleShipments} users={users} currentUser={currentUser} clients={clients} products={products} companyLogo={companyLogo} vehicles={vehicles} onDeleteAttachment={handleDeleteShipmentAttachment} />;

    }
  };

  // Only show the full-screen loader if it's the initial load (no data yet) or checking auth
  if (isAuthChecking || (isLoading && shipments.length === 0 && cargos.length === 0)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', background: '#f9fafb' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280', fontSize: '18px', fontWeight: 500 }}>Carregando Agromarcantil Logística...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} users={users} companyLogo={companyLogo} />;
  }

  const operationalPages: Page[] = ['loads', 'shipments', 'shipment-history', 'load-history', 'operational-loads', 'operational-map'];
  const isOperationalPage = operationalPages.includes(currentPage);

  return (
    <div 
      className="flex flex-col h-screen bg-light-bg dark:bg-dark-bg text-gray-800 dark:text-gray-200 portal-theme-bg"
      style={{ '--theme-bg': themeImage ? `url(${themeImage})` : 'none' } as React.CSSProperties}
    >
      <TopNavBar
        user={currentUser}
        onLogout={handleLogout}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        profilePermissions={profilePermissions}
        companyLogo={companyLogo}
        onOpenTickets={() => setIsTicketModalOpen(true)}
        tickets={tickets}
      />
      <main className="flex-1 overflow-y-auto" style={{ zoom: 0.8 }}>
        <div className={isOperationalPage ? "px-6 py-8" : "container mx-auto px-6 py-8"}>
            {renderPage()}
        </div>
      </main>
       <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        tickets={tickets}
        users={users}
        currentUser={currentUser}
        onSave={handleSaveTicket}
        onUpdate={handleUpdateTicket}
      />
      {currentUser?.requirePasswordChange && (
        <PasswordChangeModal 
          user={currentUser} 
          onPasswordChange={handlePasswordChange} 
        />
      )}
    </div>
  );
};

export default App;
