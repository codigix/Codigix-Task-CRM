import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Mail, Lock, LogIn } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const userData = await response.json();

      const validRoles = [
        'Super Admin', 'Admin', 'Leads Manager', 'Deals Manager',
        'Sales Manager', 'Marketing Manager', 'IT Manager',
        'Accounting Manager', 'Sales Executive', 'Marketing Executive',
        'IT Specialist', 'Accountant', 'Employee'
      ];
      const roleFromServer = userData.role_name || 'Employee';

      // Find role case-insensitively
      let finalRole = validRoles.find(
        r => r.toLowerCase() === roleFromServer.toLowerCase()
      ) || 'Employee';

      // Ensure Super Admin override for known admin emails
      const userEmail = userData.email?.toLowerCase();
      if (userEmail === 'rohityadav@gmail.com' || userEmail === 'admin@example.com') {
        finalRole = 'Super Admin';
      }

      console.log('Login override check:', { originalEmail: userData.email, lowerEmail: userEmail, finalRole });

      login({
        id: userData.id,
        email: userData.email,
        name: userData.first_name,
        role: finalRole,
        department: userData.department,
        avatar: userData.avatar,
      });

      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const DEMO_USERS = [];

  const handleDemoLogin = async (demoUser) => {
    setError('');
    setLoading(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: demoUser.email, password: demoUser.password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const userData = await response.json();

      const validRoles = [
        'Super Admin', 'Admin', 'Leads Manager', 'Deals Manager',
        'Sales Manager', 'Marketing Manager', 'IT Manager',
        'Accounting Manager', 'Sales Executive', 'Marketing Executive',
        'IT Specialist', 'Accountant', 'Employee'
      ];
      const roleFromServer = userData.role_name || 'Employee';

      // Find role case-insensitively
      let finalRole = validRoles.find(
        r => r.toLowerCase() === roleFromServer.toLowerCase()
      ) || 'Employee';

      // Ensure Super Admin override for known admin emails
      const userEmail = userData.email?.toLowerCase();
      if (userEmail === 'rohityadav@gmail.com' || userEmail === 'admin@example.com') {
        finalRole = 'Super Admin';
      }

      console.log('Login override check:', { originalEmail: userData.email, lowerEmail: userEmail, finalRole });

      login({
        id: userData.id,
        email: userData.email,
        name: userData.first_name,
        role: finalRole,
        department: userData.department,
        avatar: userData.avatar,
      });

      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo login failed. Please try the regular login form.');
      console.error('Demo login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-centerp-2  ">
      <div className="w-full max-w-md m-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 border border-red-100 rounded  mb-4">
            <div className="w-10 h-10 bg-red-600 rounded  flex items-center justify-center text-white   text-xl">
              D
            </div>
          </div>
          <h1 className="text-2xl   text-gray-900 mb-1">Welcome Back</h1>
          <p className="text-sm text-gray-500 ">Enterprise CRM Access Center</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded  border border-gray-100 p-8 mb-6">
          <form onSubmit={handleLogin}>
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded  flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                <p className="text-xs  text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-xs   text-[#1F2020]  tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-[#1F2020]"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs   text-[#1F2020]  tracking-wider">
                    Password
                  </label>
                  <button type="button" className="text-xs    text-red  hover:underline  ">
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-[#1F2020]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs    text-red  hover:text-red-700  er"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-red-600 text-white py-2.5 rounded   text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2  transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </>
              )}
            </button>

            <div className="relative mt-6 mb-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const portalUrl = process.env.REACT_APP_MANAGEMENT_PORTAL_URL || 'http://localhost:8080';
                const crmUrl = process.env.REACT_APP_CRM_URL || 'http://localhost:3001';
                window.location.href = `${portalUrl}/sso-provider?redirect_uri=${crmUrl}/sso-login`;
              }}
              className="w-full bg-white text-gray-700 border border-gray-300 py-2.5 rounded text-sm hover:bg-gray-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 font-medium shadow-sm"
            >
              Login with Management Portal
            </button>
          </form>
          <div className=" border-t border-gray-50 mt-2 text-center">
            <p className="text-sm text-gray-500">
              New to the platform?{' '}
              <Link to="/signup" className="text-red    hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>


      </div>
    </div>
  );
};

export default LoginPage;
