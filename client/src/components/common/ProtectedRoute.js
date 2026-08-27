import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getMenuItemAccess } from '../../utils/roleBasedAccess';

const ProtectedRoute = ({ 
  children, 
  requiredRoles, 
  requiredModules,
  requiredMenuItem,
  minAccessLevel,
  fallback = null,
  redirectTo = '/login'
}) => {
  const { user, hasRole, canAccess } = useAuth();

  const AccessDeniedPage = ({ reason = 'You do not have permission to access this page.' }) => {
    console.warn('Access Denied Page Rendered - User:', user, 'Required Roles:', requiredRoles, 'Required Modules:', requiredModules);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mb-6">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M7.08 6.47A9.002 9.002 0 1112 2a9 9 0 00-4.92 4.47z" />
            </svg>
          </div>
          <h1 className="text-xl  text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{reason}</p>
          {requiredRoles && (
            <p className="text-xs  text-gray-500">
              Required role: {Array.isArray(requiredRoles) ? requiredRoles.join(', ') : requiredRoles}
            </p>
          )}
          {user && (
            <p className="text-xs text-[#1F2020] mt-4">
              Your role: {user.role || 'Not set'}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRoles && !hasRole(requiredRoles)) {
    return fallback || <AccessDeniedPage />;
  }

  if (requiredModules && !canAccess(requiredModules)) {
    return fallback || <AccessDeniedPage reason="You don't have permission to access this module." />;
  }

  if (requiredMenuItem) {
    const access = getMenuItemAccess(user.role, requiredMenuItem);
    if (!access || access === false) {
      return fallback || <AccessDeniedPage reason={`You don't have access to ${requiredMenuItem}.`} />;
    }

    if (minAccessLevel && minAccessLevel !== 'view_only' && access === 'view_only') {
      return fallback || <AccessDeniedPage reason="You have view-only access to this page. Edit not permitted." />;
    }
  }

  return children;
};

export default ProtectedRoute;
