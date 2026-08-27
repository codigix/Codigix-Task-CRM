import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Helper to map backend department names to frontend route prefixes
const getDeptRoutePrefix = (departmentName) => {
  if (!departmentName) return null;
  const name = departmentName.toLowerCase();
  
  if (name.includes('super admin') || name.includes('management') || name === 'admin') return 'super-admin';
  if (name.includes('it')) return 'it';
  if (name.includes('sales')) return 'sales';
  if (name.includes('marketing')) return 'marketing';
  if (name.includes('seo') || name.includes('gmb')) return 'seo-gmb';
  if (name.includes('deals')) return 'deals';
  if (name.includes('leads')) return 'leads';
  if (name.includes('projects')) return 'projects';
  
  return null;
};

const DepartmentRoute = ({ children, fallback = null, redirectTo = '/login' }) => {
  const { user } = useAuth();
  const { dept } = useParams();

  const AccessDeniedPage = () => {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mb-6">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M7.08 6.47A9.002 9.002 0 1112 2a9 9 0 00-4.92 4.47z" />
            </svg>
          </div>
          <h1 className="text-xl text-gray-900 mb-2">Department Access Denied</h1>
          <p className="text-gray-600 mb-4">You do not have permission to view pages for the {dept?.toUpperCase()} department.</p>
          {user && (
            <p className="text-xs text-gray-500 mt-4">
              Your registered department: {user.department || 'Not set'}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Super Admins and Admins have global access
  if (user.role === 'Admin' || user.role === 'Super Admin') {
    return children;
  }

  const userRoutePrefix = getDeptRoutePrefix(user.department);
  
  // If the user's mapped prefix doesn't match the route :dept
  // allow access if they somehow fall into a specific shared scenario, but mostly block.
  if (userRoutePrefix && dept && userRoutePrefix !== dept) {
    // Specifically allow deals, leads, projects for sales department
    if (userRoutePrefix === 'sales' && ['deals', 'leads', 'projects'].includes(dept)) {
      return children;
    }
    return fallback || <AccessDeniedPage />;
  }

  return children;
};

export default DepartmentRoute;
