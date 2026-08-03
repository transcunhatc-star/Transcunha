
import type { User, Page, ProfilePermissions, CrudPermissions } from './types';
import { UserProfile } from './types';

const allPages: Page[] = ['dashboard', 'clients', 'owners', 'embarcadores', 'drivers', 'vehicles', 'loads', 'products', 'shipments', 'financial', 'reports', 'operational-loads', 'operational-map', 'users-register', 'commissions', 'appearance', 'shipment-history', 'load-history', 'layover-calculator', 'freight-quote', 'ai-assistant', 'tools-history', 'branches', 'system-monitor'];

const createPermissions = (pages: Page[], readOnly = false): { [key in Page]?: CrudPermissions } => {
  const permissions: { [key in Page]?: CrudPermissions } = {};
  for (const page of allPages) {
    const canAccess = pages.includes(page);
    permissions[page] = {
      read: canAccess,
      create: canAccess && !readOnly,
      update: canAccess && !readOnly,
      delete: canAccess && !readOnly,
    };
  }
  return permissions;
};

const diretorPages = allPages.filter(p => p !== 'appearance');
const coordenadorPages = diretorPages;

export const INITIAL_PERMISSIONS: ProfilePermissions = {
  [UserProfile.Comercial]: createPermissions(['dashboard', 'clients', 'owners', 'embarcadores', 'drivers', 'vehicles', 'loads', 'products', 'shipments', 'reports', 'operational-loads', 'financial', 'operational-map', 'commissions', 'shipment-history', 'load-history', 'layover-calculator', 'freight-quote', 'tools-history', 'branches']),
  [UserProfile.Coordenador]: createPermissions(coordenadorPages),
  [UserProfile.Diretor]: createPermissions(diretorPages),
  [UserProfile.Fiscal]: createPermissions(['dashboard', 'clients', 'owners', 'embarcadores', 'drivers', 'vehicles', 'loads', 'products', 'shipments', 'reports', 'operational-loads', 'financial', 'operational-map', 'shipment-history', 'load-history', 'branches']),
  [UserProfile.Financeiro]: createPermissions(['dashboard', 'clients', 'owners', 'embarcadores', 'drivers', 'vehicles', 'loads', 'products', 'shipments', 'reports', 'financial', 'commissions', 'shipment-history', 'load-history', 'branches']),
  [UserProfile.Embarcador]: createPermissions(['dashboard', 'clients', 'owners', 'embarcadores', 'drivers', 'vehicles', 'loads', 'products', 'reports', 'operational-loads', 'shipments', 'operational-map', 'shipment-history', 'load-history', 'layover-calculator', 'branches']),
  [UserProfile.Cliente]: createPermissions(['dashboard', 'clients', 'owners', 'drivers', 'vehicles', 'loads', 'products', 'shipments', 'shipment-history', 'load-history']),
};

if (INITIAL_PERMISSIONS[UserProfile.Fiscal] && INITIAL_PERMISSIONS[UserProfile.Fiscal]!['shipments']) {
    INITIAL_PERMISSIONS[UserProfile.Fiscal]!['shipments']!.delete = true;
}

if (INITIAL_PERMISSIONS[UserProfile.Embarcador] && INITIAL_PERMISSIONS[UserProfile.Embarcador]!['shipments']) {
    INITIAL_PERMISSIONS[UserProfile.Embarcador]!['shipments']!.create = true;
}

// Diretor e Coordenador can do everything EXCEPT delete cargas (loads) and embarques (shipments)
if (INITIAL_PERMISSIONS[UserProfile.Diretor]) {
    if (INITIAL_PERMISSIONS[UserProfile.Diretor]!['loads']) {
        INITIAL_PERMISSIONS[UserProfile.Diretor]!['loads']!.delete = false;
    }
    if (INITIAL_PERMISSIONS[UserProfile.Diretor]!['shipments']) {
        INITIAL_PERMISSIONS[UserProfile.Diretor]!['shipments']!.delete = false;
    }
}

if (INITIAL_PERMISSIONS[UserProfile.Coordenador]) {
    if (INITIAL_PERMISSIONS[UserProfile.Coordenador]!['loads']) {
        INITIAL_PERMISSIONS[UserProfile.Coordenador]!['loads']!.delete = false;
    }
    if (INITIAL_PERMISSIONS[UserProfile.Coordenador]!['shipments']) {
        INITIAL_PERMISSIONS[UserProfile.Coordenador]!['shipments']!.delete = false;
    }
}


export const can = (
  action: keyof CrudPermissions,
  user: User | null,
  page: Page,
  permissions: ProfilePermissions
): boolean => {
  if (!user) return false;
  
  // Admin can do everything, always.
  if (user.profile === UserProfile.Admin) return true;

  const userProfilePermissions = permissions[user.profile];
  if (!userProfilePermissions) return false;

  const pagePermissions = userProfilePermissions[page];
  if (!pagePermissions) return false;

  return pagePermissions[action];
};

