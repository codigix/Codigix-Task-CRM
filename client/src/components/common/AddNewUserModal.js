import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AddNewUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [roles, setRoles] = useState([]);

  const [formData, setFormData] = useState({
    firstName: '',
    userName: '',
    email: '',
    emailOptOut: false,
    role: '',
    phone1: '',
    phone1Country: 'US',
    phone2: '',
    phone2Country: 'US',
    password: '',
    repeatPassword: '',
    location: '',
    avatar: null,
  });

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/roles`);
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(data);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setRoles([]);
    }
  };

  const countries = [
    { code: 'US', name: '+1' },
    { code: 'UK', name: '+44' },
    { code: 'CA', name: '+1' },
    { code: 'AU', name: '+61' },
    { code: 'IN', name: '+91' },
  ];

  const locations = [
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Miami',
    'San Francisco',
    'Boston',
    'Seattle'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 800 * 1024) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result);
        setFormData(prev => ({
          ...prev,
          avatar: event.target?.result
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setError('File size must be less than 800KB');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName.trim()) {
      setError('First name is required');
      return;
    }

    if (!formData.userName.trim()) {
      setError('Username is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      return;
    }

    if (formData.password !== formData.repeatPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.role) {
      setError('Role is required');
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const selectedRole = roles.find(r => r.name === formData.role);
      const roleId = selectedRole?.id || 5;

      const response = await fetch(`${apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          username: formData.userName,
          email: formData.email,
          password: formData.password,
          phone1: formData.phone1,
          phone1_country: formData.phone1Country,
          phone2: formData.phone2,
          phone2_country: formData.phone2Country,
          location: formData.location,
          avatar: previewImage || `https://i.pravatar.cc/40?img=${Math.floor(Math.random() * 100)}`,
          role_id: roleId,
          email_opt_out: formData.emailOptOut,
          status: 'Active'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const newUser = await response.json();
      
      const formattedUser = {
        id: newUser.id,
        name: newUser.first_name,
        role: newUser.role_name || 'User',
        avatar: newUser.avatar,
        phone: newUser.phone1,
        email: newUser.email,
        created: new Date(newUser.created_at).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        lastActivity: 'Just now',
        status: newUser.status,
      };

      if (onSuccess) {
        onSuccess(formattedUser);
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to create user');
      console.error('Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: '',
      userName: '',
      email: '',
      emailOptOut: false,
      role: '',
      phone1: '',
      phone1Country: 'US',
      phone2: '',
      phone2Country: 'US',
      password: '',
      repeatPassword: '',
      location: '',
      avatar: null,
    });
    setPreviewImage(null);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={handleCancel}>
      <div
        className="h-full w-full md:w-[72%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-centerp-3  border-b border-[#EAECF0] sticky top-0 bg-white">
          <h2 className="text-md  text-gray-900">Add New User</h2>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-[#1F2020] hover:text-red  transition-colors text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="p-2 m-4 bg-red-50 border border-red-200 rounded ">
            <p className="text-xs  text-red-700  ">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Avatar Upload */}
          <div>
            <label className="block text-xs   text-gray-900 mb-2">
              Upload Avatar
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded  bg-gray-100 flex items-center justify-center overflow-hidden">
                {previewImage ? (
                  <img src={previewImage} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">📷</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block text-xs  text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded  file:border-0 file:text-xs  file:  file:bg-red-600 file:text-white hover:file:bg-red-700"
              />
            </div>
          </div>

          {/* First Name & User Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs   text-gray-900 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Enter first name"
                className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs   text-gray-900 mb-1">
                User Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleInputChange}
                placeholder="Enter username"
                className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs   text-gray-900 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email"
                className="flex-1 p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="emailOptOut"
                  checked={formData.emailOptOut}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-xs  text-gray-600">Email Opt Out</span>
              </label>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs   text-gray-900 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            >
              <option value="">Select a role</option>
              {roles.length > 0 ? (
                roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))
              ) : (
                <option disabled>Loading roles...</option>
              )}
            </select>
          </div>

          {/* Phone 1 & Phone 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs   text-gray-900 mb-1">
                Phone 1 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  name="phone1Country"
                  value={formData.phone1Country}
                  onChange={handleInputChange}
                  className="w-20 px-2 py-2 border border-gray-300 rounded  text-xs  bg-white"
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  name="phone1"
                  value={formData.phone1}
                  onChange={handleInputChange}
                  placeholder="(201) 555-0123"
                  className="flex-1 p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs   text-gray-900 mb-1">
                Phone 2
              </label>
              <div className="flex gap-2">
                <select
                  name="phone2Country"
                  value={formData.phone2Country}
                  onChange={handleInputChange}
                  className="w-20 px-2 py-2 border border-gray-300 rounded  text-xs  bg-white"
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  name="phone2"
                  value={formData.phone2}
                  onChange={handleInputChange}
                  placeholder="(201) 555-0123"
                  className="flex-1 p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Password & Repeat Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs   text-gray-900 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password"
                className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs   text-gray-900 mb-1">
                Repeat Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="repeatPassword"
                value={formData.repeatPassword}
                onChange={handleInputChange}
                placeholder="Repeat password"
                className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs   text-gray-900 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <select
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            >
              <option value="">Choose location</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="p-2  text-gray-700   border border-gray-300 rounded  hover:bg-gray-50 transition disabled:opacity-50 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="p-2  bg-red-600 text-white   rounded  hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2 text-xs"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewUserModal;
