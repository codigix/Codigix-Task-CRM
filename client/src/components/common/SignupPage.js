import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Mail, Lock, User, LogIn, Check, AlertCircle, Plus, X } from 'lucide-react';
import AddNewDealModal from '../sales/AddNewDealModal';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Employee',
    roleType: 'Employee',
    department: 'Admin',
    phone: '',
    company: '',
    companyId: null,
    projects: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [projectInput, setProjectInput] = useState('');
  const [deals, setDeals] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const DEPARTMENTS = [
    'Management',
    'Sales Department',
    'IT Department',
    'Marketing Department'
  ];

  const DESIGNATIONS = {
    'Management': ['Super Admin', 'HR Management'],
    'Sales Department': ['Manager', 'Sales Executive', 'Employee'],
    'IT Department': ['Manager', 'Developer', 'Tester', 'DevOps Engineer'],
    'Marketing Department': ['Graphics Designer', 'Video Editor', 'Social Media Marketing', 'SEO & GMB', 'Manager', 'PPC Manager', 'Wordpress Developer'],
    '': []
  };

  useEffect(() => {
    if (location.state?.prefillData) {
      const { email, firstName, lastName, phone } = location.state.prefillData;
      setFormData(prev => ({
        ...prev,
        email: email || prev.email,
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
        phone: phone || prev.phone
      }));
    }
  }, [location.state]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setPasswordsMatch(formData.password === formData.confirmPassword || formData.confirmPassword === '');
  }, [formData.password, formData.confirmPassword]);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/deals`);
      if (response.ok) {
        const data = await response.json();
        setDeals(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching deals:', err);
    }
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Invalid email address');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return false;
    }
    if (!formData.department) {
      setError('Please select a department');
      return false;
    }
    return true;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleAddProject = (e) => {
    if (e.key === 'Enter' && projectInput.trim()) {
      e.preventDefault();
      setFormData(prev => ({
        ...prev,
        projects: [...prev.projects, projectInput.trim()]
      }));
      setProjectInput('');
    }
  };

  const handleRemoveProject = (index) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  const handleDealSubmit = async (dealData) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/deals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dealData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create deal');
      }

      const newDeal = await response.json();
      setSelectedDeals(prev => [...prev, newDeal]);
      setIsDealModalOpen(false);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to create deal');
      console.error('Deal creation error:', err);
    }
  };

  const handleRemoveDeal = (dealId) => {
    setSelectedDeals(prev => prev.filter(deal => deal.id !== dealId));
  };

  const getRoleName = (department, roleType) => {
    if (!roleType) return 'Employee';
    
    if (department === 'IT Department') {
      if (roleType === 'Manager') return 'IT Manager';
      return roleType;
    } else if (department === 'Sales Department') {
      if (roleType === 'Manager') return 'Sales Manager';
      return roleType;
    } else if (department === 'Marketing Department') {
      if (roleType === 'Manager') return 'Marketing Manager';
      return roleType;
    } else if (department === 'Management') {
      if (roleType === 'Super Admin') return 'Super Admin';
      return roleType;
    }
    
    return roleType;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateForm()) {
      console.error('Form validation failed');
      setLoading(false);
      return;
    }

    const derivedRoleName = getRoleName(formData.department, formData.roleType);
    console.log('Form validation passed, proceeding with signup');
    console.log('Form data:', {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      role: derivedRoleName,
      department: formData.department,
      passwordLength: formData.password.length
    });

    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';

      const response = await fetch(`${apiUrl}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password,
          role_name: derivedRoleName,
          department: formData.department || null,
          phone: formData.phone || null,
          company: formData.company || null,
          job_title: formData.roleType || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Signup API error:', data);
        throw new Error(data.error || 'Signup failed');
      }

      const userData = await response.json();
      console.log('Signup response:', userData);

      console.log('Signup response received:', userData);
      console.log('Received ID - type:', typeof userData.id, 'value:', userData.id);

      const numericId = typeof userData.id === 'string' ? parseInt(userData.id) : userData.id;

      if (isNaN(numericId)) {
        throw new Error(`Invalid user ID received from server: ${userData.id}`);
      }

      const roleFromResponse = userData.role_name || derivedRoleName;
      let finalRole = roleFromResponse || 'Employee';

      // Ensure Super Admin override for known admin emails
      const userEmail = userData.email?.toLowerCase();
      if (userEmail === 'rohityadav@gmail.com' || userEmail === 'admin@example.com') {
        finalRole = 'Super Admin';
      }

      console.log('🔍 ROLE VALIDATION:');
      console.log('  Backend returned role_name:', userData.role_name);
      console.log('  Fallback to derivedRoleName:', derivedRoleName);
      console.log('  Final role used:', finalRole);

      const loginData = {
        id: numericId,
        email: userData.email,
        name: userData.first_name,
        role: finalRole,
        department: userData.department || formData.department,
        avatar: userData.avatar || `https://i.pravatar.cc/150?u=${userData.email}`,
      };

      console.log('Logging in user with data (after conversion):', loginData);
      console.log('Final role set to:', finalRole);
      login(loginData);
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-centerp-2   py-12">
      <div className="w-full max-w-2xl m-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 border border-red-100 rounded  mb-4">
            <div className="w-10 h-10 bg-red-600 rounded  flex items-center justify-center text-white   text-xl">
              D
            </div>
          </div>
          <h1 className="text-2xl   text-gray-900 mb-1">Create Account</h1>
          <p className="text-sm text-gray-500 ">Join our Enterprise CRM Platform</p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded  border border-gray-100 p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded  flex items-center gap-3">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
              <p className="text-xs  text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="block text-xs   text-[#1F2020]  tracking-wider">
                  First Name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-[#1F2020]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs   text-[#1F2020]  tracking-wider">
                  Last Name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-[#1F2020]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-xs   text-[#1F2020]  tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-[#1F2020]"
                  required
                />
              </div>
            </div>

            {/* Phone & Company Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="block text-xs   text-[#1F2020]  tracking-wider">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full p-2  bg-gray-50 border border-gray-200 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-[#1F2020]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs   text-[#1F2020]  tracking-wider">
                  Company (Optional)
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  placeholder="Acme Inc."
                  className="w-full p-2  bg-gray-50 border border-gray-200 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-[#1F2020]"
                />
              </div>
            </div>

            {/* Department & Role Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="block text-xs   text-[#1F2020]  tracking-wider">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={(e) => {
                    handleInputChange(e);
                    // Reset roleType when department changes
                    setFormData(prev => ({ ...prev, department: e.target.value, roleType: DESIGNATIONS[e.target.value]?.[0] || 'Employee' }));
                  }}
                  className="w-full p-2  bg-gray-50 border border-gray-200 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none cursor-pointer"
                  required
                >
                  <option value="">Choose a department</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs   text-[#1F2020]  tracking-wider">
                  Role Type
                </label>
                <select
                  name="roleType"
                  value={formData.roleType}
                  onChange={handleInputChange}
                  className="w-full p-2  bg-gray-50 border border-gray-200 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select a designation</option>
                  {(DESIGNATIONS[formData.department] || []).map(designation => (
                    <option key={designation} value={designation}>{designation}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="block text-xs   text-[#1F2020]  tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
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

              <div className="space-y-2">
                <label className="block text-xs   text-[#1F2020]  tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-12 py-2.5 bg-gray-50 border ${!passwordsMatch ? 'border-red-500' : 'border-gray-200'} rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-[#1F2020]`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs    text-red  hover:text-red-700  er"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            {/* Signup Button */}
            <button
              type="submit"
              disabled={loading || (formData.confirmPassword && !passwordsMatch)}
              className="w-full bg-red-600 text-white py-3 rounded   text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2  transition-all active:scale-[0.99]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 pt-6 border-t border-gray-50 text-center">
            <p className="text-sm text-gray-500 ">
              Already have an account?{' '}
              <Link to="/login" className="text-red    hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AddNewDealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        onSubmit={handleDealSubmit}
        contacts={[]}
        projects={formData.projects}
        companies={[]}
        isCompanyContext={true}
      />
    </div>
  );
};

export default SignupPage;
