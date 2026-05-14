import { useBusinessContext } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';

export function usePermissions() {
  const { currentBusiness, getUserRole } = useBusinessContext();
  const { currentUser } = useAuth();

  const role = currentBusiness && currentUser
    ? getUserRole(currentBusiness.id, currentUser.id)
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
      // Dashboard
      viewDashboard: ownerOrManager,

      // Menu
      viewMenu: true,
      editMenu: ownerOrManager,

      // Orders
      createOrder: true,
      moveOrderStages: true,
      processPayment: true,
      applyDiscount: true,
      deleteOrders: ownerOrManager,

      // Settings tabs
      viewSettingsNegocio: ownerOrManager,
      viewSettingsUsuarios: ownerOrManager,
      viewSettingsIdioma: true,
      viewSettingsMoneda: ownerOrManager,
      viewSettingsIngredientes: ownerOrManager,

      // User management
      inviteStaff: ownerOrManager,
      inviteManager: isOwner,
      inviteOwner: isOwner,
      changeManagerRole: isOwner,
      changeOwnerRole: false,
      deleteOwner: false,
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
