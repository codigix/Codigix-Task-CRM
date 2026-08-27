import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function SSOLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');

    if (token) {
      // Send the token to your CRM backend to verify and create a session
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      fetch(`${API_BASE_URL}/auth/sso-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          const userData = data.user;
          const validRoles = [
            'Super Admin', 'Admin', 'Leads Manager', 'Deals Manager',
            'Sales Manager', 'Marketing Manager', 'IT Manager',
            'Accounting Manager', 'Sales Executive', 'Marketing Executive',
            'IT Specialist', 'Accountant', 'Employee'
          ];
          const roleFromServer = userData.role_name || userData.role || 'Employee';

          let finalRole = validRoles.find(
            r => r.toLowerCase() === roleFromServer.toLowerCase()
          ) || 'Employee';

          const userEmail = userData.email?.toLowerCase();
          if (userEmail === 'rohityadav@gmail.com' || userEmail === 'admin@example.com') {
            finalRole = 'Super Admin';
          }

          login({
            id: userData.id,
            email: userData.email,
            name: userData.first_name || userData.name,
            role: finalRole,
            department: userData.department,
            avatar: userData.avatar,
          });

          navigate('/'); // Go to CRM dashboard
        } else if (data.success && data.action === 'register') {
          navigate('/signup', { state: { prefillData: data.prefillData } });
        } else {
          alert("SSO Login Failed: " + (data.message || "Invalid Token"));
          navigate('/login');
        }
      })
      .catch(err => {
        console.error("SSO verification error:", err);
        alert("SSO Login Error");
        navigate('/login');
      });
    } else {
      navigate('/login');
    }
  }, [navigate, location, isAuthenticated, login]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Authenticating</h2>
        <p className="text-gray-500">Logging you securely into the CRM via SSO...</p>
      </div>
    </div>
  );
}
