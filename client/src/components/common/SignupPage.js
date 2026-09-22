import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Mail, Lock, User, LogIn, Check, AlertCircle, Plus, X, Send, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
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
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

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
      navigate('/dashboard');
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
      setLoading(false);
      return;
    }

    const derivedRoleName = getRoleName(formData.department, formData.roleType);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';

      const response = await fetch(`${apiUrl}/auth/registration-request`, {
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
          role_type: formData.roleType || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit registration request');
      }

      setSubmittedData({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        department: formData.department,
        roleType: formData.roleType,
        roleName: derivedRoleName,
      });
      setRequestSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit registration request. Please try again.');
      console.error('Registration request error:', err);
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
          <p className="text-sm text-gray-500 ">Join our Task Management Platform</p>
        </div>

        {/* Signup Card or Confirmation View */}
        <div className="bg-white rounded border border-gray-100 p-8 shadow-sm">
          {requestSubmitted ? (
            <div className="text-center py-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full mb-4 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Request Sent!</h2>
              <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                Thank you, <strong className="text-gray-900">{submittedData?.firstName}</strong>! Your registration request has been submitted to the HR Department and Admin for verification.
              </p>

              {/* Request Summary Box */}
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-5 text-left mb-6 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Request Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    <Clock size={13} />
                    Pending Review
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 block">Applicant Name</span>
                    <span className="font-medium text-gray-900">{submittedData?.firstName} {submittedData?.lastName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Email Address</span>
                    <span className="font-medium text-gray-900">{submittedData?.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Department</span>
                    <span className="font-medium text-gray-900">{submittedData?.department || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Role / Designation</span>
                    <span className="font-medium text-gray-900">{submittedData?.roleType || submittedData?.roleName || 'Employee'}</span>
                  </div>
                  {submittedData?.phone && (
                    <div>
                      <span className="text-gray-500 block">Phone</span>
                      <span className="font-medium text-gray-900">{submittedData?.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Informative Alert */}
              <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 mb-6 text-left flex items-start gap-2.5">
                <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Next Steps:</strong> Once HR or an Administrator approves your request, your account will be activated and you can log in using your email and the password you entered.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestSubmitted(false);
                    setFormData({
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
                  }}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          ) : (
            <>
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

                {/* Phone Field */}
                <div className="space-y-2">
                  <label className="block text-xs text-[#1F2020] tracking-wider">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-[#1F2020]"
                  />
                </div>

                {/* Department and Designation Row */}
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
                        const newDept = e.target.value;
                        const availableDesignations = DESIGNATIONS[newDept] || [];
                        setFormData(prev => ({
                          ...prev,
                          department: newDept,
                          roleType: availableDesignations[0] || 'Employee'
                        }));
                      }}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-[#1F2020]"
                      required
                    >
                      <option value="" disabled>Choose a department</option>
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
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
                      disabled={!formData.department}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded  text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-[#1F2020] disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="" disabled>Select a designation</option>
                      {(DESIGNATIONS[formData.department] || []).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
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

                {/* Send Registration Request Button */}
                <button
                  type="submit"
                  disabled={loading || (formData.confirmPassword && !passwordsMatch)}
                  className="w-full bg-red-600 text-white py-3 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-all active:scale-[0.99] shadow-sm hover:shadow"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Send Registration Request</span>
                    </>
                  )}
                </button>
              </form>

              {/* Footer Link */}
              <div className="mt-8 pt-6 border-t border-gray-50 text-center">
                <p className="text-sm text-gray-500 ">
                  Already have an account?{' '}
                  <Link to="/login" className="text-red hover:underline font-medium">
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}
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
