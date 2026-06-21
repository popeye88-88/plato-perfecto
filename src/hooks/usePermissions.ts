import { useOptionalBusinessContext } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';

export function usePermissions() {
  const businessContext = useOptionalBusinessContext();
  const { currentUser } = useAuth();
  const currentBusiness = businessContext?.currentBusiness;

  const role = currentBusiness && currentUser && businessContext
    ? businessContext.getUserRole(currentBusiness.id, currentUser.id)
    : undefined;

  const isOwner = role === 'owner';
  const isManager = role === 'manager';
  const isStaff = role === 'staff' || role === undefined;

  const ownerOrManager = isOwner || isManager;

  return {
    role,
    isOwner,
    isManager,
    isStaff,
    can: {
      viewDashboard: ownerOrManager,
      viewMenu: true,
      editMenu: ownerOrManager,
      createOrder: true,
      moveOrderStages: true,
      processPayment: true,
      applyDiscount: true,
      deleteOrders: ownerOrManager,
      viewSettingsNegocio: ownerOrManager,
      viewSettingsUsuarios: ownerOrManager,
      viewSettingsIdioma: true,
      viewSettingsMoneda: ownerOrManager,
      viewSettingsIngredientes: ownerOrManager,
      inviteStaff: ownerOrManager,
      inviteManager: isOwner,
      inviteOwner: isOwner,
      removeUser: ownerOrManager,
      changeRoleOfStaff: ownerOrManager,
      changeRoleOfManager: isOwner,
      changeRoleOfOwner: false,
      deleteBusiness: isOwner,
      viewRoleHistory: ownerOrManager,
    },
  };
}

export const ROLE_LABELS: Record<'owner' | 'manager' | 'staff', string> = {
  owner: 'Propietario',
  manager: 'Manager',
  staff: 'Staff',
};

export const ROLE_BADGE_CLASS: Record<'owner' | 'manager' | 'staff', string> = {
  owner: 'bg-orange-500 text-white hover:bg-orange-500/90',
  manager: 'bg-blue-500 text-white hover:bg-blue-500/90',
  staff: 'bg-muted text-muted-foreground hover:bg-muted/90',
};
