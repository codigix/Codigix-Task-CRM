import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Mail, Lock, User, AlertCircle, Send, CheckCircle2, ArrowRight } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

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

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL;

      const response = await fetch(`${apiUrl}/auth/registration-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit registration request');
      }

      setSubmittedData({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 border border-red-100 rounded-xl mb-4 shadow-xs">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              D
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
          <p className="text-sm text-gray-500">Join our Task Management Platform</p>
        </div>

        {/* Signup Card or Confirmation View */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          {requestSubmitted ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full mb-4 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Request Sent!</h2>
              <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                Thank you, <strong className="text-gray-900">{submittedData?.firstName}</strong>! Your registration request has been submitted to the HR Department and Admin for verification and role assignment.
              </p>

              {/* Request Summary Box */}
              <div className="bg-gray-50 border border-gray-200/70 rounded-xl p-5 text-left mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block mb-0.5">Applicant Name</span>
                    <span className="font-semibold text-gray-900 text-sm">{submittedData?.firstName} {submittedData?.lastName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-0.5">Email Address</span>
                    <span className="font-semibold text-gray-900 text-sm">{submittedData?.email}</span>
                  </div>
                  {submittedData?.phone && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 block mb-0.5">Phone</span>
                      <span className="font-semibold text-gray-900 text-sm">{submittedData?.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Informative Alert */}
              <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 mb-6 text-left flex items-start gap-2.5">
                <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Next Steps:</strong> Once HR or an Administrator approves your request and assigns your department and role, you will be able to log in using your email and password.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-xs"
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
                      phone: '',
                    });
                  }}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="John"
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-gray-900 placeholder:text-gray-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Doe"
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-gray-900 placeholder:text-gray-400"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@company.com"
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-gray-900 placeholder:text-gray-400"
                      required
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-700">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className={`w-full pl-9 pr-14 py-2.5 bg-gray-50 border ${
                          formData.confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-gray-200'
                        } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-gray-900 placeholder:text-gray-400`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {formData.password && formData.password.length < 6 && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle size={13} className="flex-shrink-0" />
                        <span>Must be at least 6 characters</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className={`w-full pl-9 pr-14 py-2.5 bg-gray-50 border ${
                          !passwordsMatch ? 'border-red-500 bg-red-50/20' : formData.confirmPassword && passwordsMatch ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-200'
                        } rounded-lg text-sm focus:outline-none focus:ring-2 ${
                          !passwordsMatch ? 'focus:ring-red-500' : 'focus:ring-emerald-500'
                        } focus:bg-white transition-all text-gray-900 placeholder:text-gray-400`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {formData.confirmPassword && !passwordsMatch && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle size={13} className="flex-shrink-0" />
                        <span>Passwords do not match</span>
                      </p>
                    )}
                    {formData.confirmPassword && passwordsMatch && formData.password && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                        <CheckCircle2 size={13} className="flex-shrink-0" />
                        <span>Passwords match</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Send Registration Request Button */}
                <button
                  type="submit"
                  disabled={loading || (formData.confirmPassword && !passwordsMatch)}
                  className="w-full bg-red-600 text-white py-3 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-all active:scale-[0.99] shadow-sm hover:shadow"
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
              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-red-600 hover:underline font-medium">
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
