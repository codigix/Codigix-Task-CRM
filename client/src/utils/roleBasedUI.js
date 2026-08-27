import { isComponentVisible, isViewOnly } from './roleBasedAccess';

export const getButtonVisibility = (role, button) => {
  const visibility = {
    createButton: () => isComponentVisible(role, 'createButton'),
    editButton: () => isComponentVisible(role, 'editButton'),
    deleteButton: () => isComponentVisible(role, 'deleteButton'),
    exportButton: () => isComponentVisible(role, 'exportButton'),
    assignButton: () => isComponentVisible(role, 'assignButton'),
    transferButton: () => isComponentVisible(role, 'transferButton'),
  };
  
  return visibility[button]?.() ?? false;
};

export const shouldDisableButton = (role, button, menuItem = null) => {
  if (button === 'editButton' || button === 'deleteButton' || button === 'transferButton') {
    if (menuItem && isViewOnly(role, menuItem)) {
      return true;
    }
  }
  return false;
};

export const getAccessRestriction = (role, menuItem) => {
  if (isViewOnly(role, menuItem)) {
    return {
      canEdit: false,
      canDelete: false,
      message: 'You have view-only access to this page.',
    };
  }
  
  return {
    canEdit: isComponentVisible(role, 'editButton'),
    canDelete: isComponentVisible(role, 'deleteButton'),
    message: null,
  };
};

export const renderLockedButton = (button, title = 'You do not have permission to perform this action.') => (
  <button
    disabled
    title={title}
    className="p-2  bg-gray-100 text-[#1F2020] rounded  cursor-not-allowed opacity-50 flex items-center gap-2"
  >
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
    {button}
  </button>
);
