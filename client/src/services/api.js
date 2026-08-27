const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


const getAuthHeaders = () => {
  const user = localStorage.getItem('currentUser');
  const headers = { 'Content-Type': 'application/json' };
  
  if (user) {
    try {
      const userData = JSON.parse(user);
      const userId = userData.id || userData.userId;
      const userRole = userData.role_name || userData.role || userData.userRole;
      
      if (userId) {
        headers['x-user-id'] = userId.toString();
      }
      if (userRole) {
        headers['x-user-role'] = userRole;
      }
    } catch (e) {
      console.warn('Failed to parse user from localStorage');
    }
  }
  
  return headers;
};

const apiService = {
  
  // Helper to sanitize payload (convert empty strings to null for DB compatibility)
  sanitize: (data) => {
    if (!data || typeof data !== 'object') return data;
    const sanitized = { ...data };
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === '') {
        sanitized[key] = null;
      }
    });
    return sanitized;
  },
  
  get: async (endpoint) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        cache: 'no-store',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        let errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.error || errorText;
        } catch (e) {
          errorText = errorText.substring(0, 200);
        }
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      console.log(`✅ GET ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`❌ GET ${endpoint} failed:`, error);
      throw error;
    }
  },

  post: async (endpoint, data) => {
    try {
      const sanitizedData = apiService.sanitize(data);
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(sanitizedData),
      });
      if (!response.ok) {
        let errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.error || errorText;
        } catch (e) {
          errorText = errorText.substring(0, 200);
        }
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  },

  put: async (endpoint, data) => {
    try {
      const sanitizedData = apiService.sanitize(data);
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(sanitizedData),
      });
      if (!response.ok) {
        let errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.error || errorText;
        } catch (e) {
          errorText = errorText.substring(0, 200);
        }
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  },

  delete: async (endpoint) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        let errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.error || errorText;
        } catch (e) {
          errorText = errorText.substring(0, 200);
        }
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  },
};

export const companiesAPI = {
  getAll: () => apiService.get('/companies'),
  getById: (id) => apiService.get(`/companies/${id}`),
  create: (data) => apiService.post('/companies', data),
  update: (id, data) => apiService.put(`/companies/${id}`, data),
  delete: (id) => apiService.delete(`/companies/${id}`),
  upgrade: (id, data) => apiService.post(`/companies/${id}/upgrade`, data),
};

export const dealsAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/deals${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => apiService.get(`/deals/${id}`),
  create: (data) => apiService.post('/deals', data),
  update: (id, data) => apiService.put(`/deals/${id}`, data),
  delete: (id) => apiService.delete(`/deals/${id}`),
};

export const contactsAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/contacts${queryString ? '?' + queryString : ''}`);
  },
  create: (data) => apiService.post('/contacts', data),
};

export const leadsAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/leads${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => apiService.get(`/leads/${id}`),
  create: (data) => apiService.post('/leads', data),
  update: (id, data) => apiService.put(`/leads/${id}`, data),
  delete: (id) => apiService.delete(`/leads/${id}`),
  convertToContact: (id, data) => apiService.post(`/leads/${id}/convert-to-contact`, data),
  convertToCompany: (id, data) => apiService.post(`/leads/${id}/convert-to-company`, data),
  convertToDeal: (id, data) => apiService.post(`/leads/${id}/convert-to-deal`, data),
};

export const usersAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/users${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => apiService.get(`/users/${id}`),
  create: (data) => apiService.post('/users', data),
  update: (id, data) => apiService.put(`/users/${id}`, data),
  delete: (id) => apiService.delete(`/users/${id}`),
};

export const plansAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/plans${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => apiService.get(`/plans/${id}`),
  create: (data) => apiService.post('/plans', data),
  update: (id, data) => apiService.put(`/plans/${id}`, data),
  delete: (id) => apiService.delete(`/plans/${id}`),
};

export const pipelineAPI = {
  getAll: () => apiService.get('/pipeline'),
  getById: (id) => apiService.get(`/pipeline/${id}`),
  create: (data) => apiService.post('/pipeline', data),
  update: (id, data) => apiService.put(`/pipeline/${id}`, data),
  delete: (id) => apiService.delete(`/pipeline/${id}`),
};

export const pipelineStagesAPI = {
  getAll: () => apiService.get('/pipeline-stages'),
  create: (data) => apiService.post('/pipeline-stages', data),
};

export const invoicesAPI = {
  getAll: () => apiService.get('/invoices'),
  getById: (id) => apiService.get(`/invoices/${id}`),
  create: (data) => apiService.post('/invoices', data),
  update: (id, data) => apiService.put(`/invoices/${id}`, data),
  delete: (id) => apiService.delete(`/invoices/${id}`),
  getMetrics: () => apiService.get('/invoices/metrics/summary'),
  getBreakdown: () => apiService.get('/invoices/status/breakdown'),
  getByCompany: (companyId) => apiService.get(`/companies/${companyId}/invoices`),
  getByDeal: (dealId) => apiService.get(`/deals/${dealId}/invoices`),
  linkToDeal: (invoiceId, dealId) => apiService.post(`/invoices/${invoiceId}/link-to-deal/${dealId}`, {}),
  linkToClient: (invoiceId, clientId) => apiService.post(`/invoices/${invoiceId}/link-to-client/${clientId}`, {}),
  getItems: (invoiceId) => apiService.get(`/invoices/${invoiceId}/items`),
};

export const campaignAPI = {
  getAll: () => apiService.get('/campaigns'),
  getById: (id) => apiService.get(`/campaigns/${id}`),
  create: (data) => apiService.post('/campaigns', data),
  update: (id, data) => apiService.put(`/campaigns/${id}`, data),
  delete: (id) => apiService.delete(`/campaigns/${id}`),
};

export const projectAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/projects${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => apiService.get(`/projects/${id}`),
  create: (data) => apiService.post('/projects', data),
  update: (id, data) => apiService.put(`/projects/${id}`, data),
  delete: (id) => apiService.delete(`/projects/${id}`),
  convertDealToProject: (dealId, data) => apiService.post(`/deals/${dealId}/convert-to-project`, data),
  getActivity: (projectId) => apiService.get(`/projects/${projectId}/activity`),
};

export const taskAPI = {
  create: (projectId, data) => apiService.post(`/projects/${projectId}/tasks`, data),
  getAll: (projectId) => apiService.get(`/projects/${projectId}/tasks`),
  update: (projectId, taskId, data) => apiService.put(`/projects/${projectId}/tasks/${taskId}`, data),
  delete: (projectId, taskId) => apiService.delete(`/projects/${projectId}/tasks/${taskId}`),
  
  createGeneral: (data) => apiService.post('/tasks', data),
  getAllGeneral: () => apiService.get('/tasks'),
  getById: (taskId) => apiService.get(`/tasks/${taskId}`),
  updateGeneral: (taskId, data) => apiService.put(`/tasks/${taskId}`, data),
  deleteGeneral: (taskId) => apiService.delete(`/tasks/${taskId}`),
};

export const projectCommentAPI = {
  create: (projectId, data) => apiService.post(`/projects/${projectId}/comments`, data),
  getAll: (projectId) => apiService.get(`/projects/${projectId}/comments`),
};

export const projectTeamAPI = {
  addMember: (projectId, data) => apiService.post(`/projects/${projectId}/team`, data),
  getMembers: (projectId) => apiService.get(`/projects/${projectId}/team`),
  removeMember: (projectId, userId) => apiService.delete(`/projects/${projectId}/team/${userId}`),
  assignTeam: (projectId, teamId) => apiService.post(`/projects/${projectId}/assign-team`, { team_id: teamId }),
};

export const proposalsAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/proposals${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => apiService.get(`/proposals/${id}`),
  create: (data) => apiService.post('/proposals', data),
  update: (id, data) => apiService.put(`/proposals/${id}`, data),
  delete: (id) => apiService.delete(`/proposals/${id}`),
  updateStatus: (id, data) => apiService.post(`/proposals/${id}/status`, data),
  submit: (id, data) => apiService.post(`/proposals/${id}/submit`, data),
  approve: (id, data) => apiService.post(`/proposals/${id}/approve`, data),
  reject: (id, data) => apiService.post(`/proposals/${id}/reject`, data),
  send: (id, data) => apiService.post(`/proposals/${id}/send`, data),
  getHistory: (id) => apiService.get(`/proposals/${id}/history`),
  convertToInvoice: (id, data) => apiService.post(`/proposals/${id}/convert-to-invoice`, data),
  convertToContract: (id, data) => apiService.post(`/proposals/${id}/convert-to-contract`, data),
};

export const contractsAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/contracts${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => apiService.get(`/contracts/${id}`),
  create: (data) => apiService.post('/contracts', data),
  update: (id, data) => apiService.put(`/contracts/${id}`, data),
  delete: (id) => apiService.delete(`/contracts/${id}`),
  convertToEstimation: (id, data) => apiService.post(`/contracts/${id}/convert-to-estimation`, data),
};

export const estimationsAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/estimations${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => apiService.get(`/estimations/${id}`),
  create: (data) => apiService.post('/estimations', data),
  update: (id, data) => apiService.put(`/estimations/${id}`, data),
  delete: (id) => apiService.delete(`/estimations/${id}`),
  send: (id, data) => apiService.post(`/estimations/${id}/send`, data),
  convertToInvoice: (id, data) => apiService.post(`/estimations/${id}/convert-to-invoice`, data),
  createItem: (estimationId, data) => apiService.post(`/estimations/${estimationId}/items`, data),
  getItems: (estimationId) => apiService.get(`/estimations/${estimationId}/items`),
  deleteItem: (itemId) => apiService.delete(`/estimation-items/${itemId}`),
};

export const paymentsAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/invoices${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => apiService.get(`/invoices/${id}`),
  create: (data) => apiService.post('/invoices', data),
  update: (id, data) => apiService.put(`/invoices/${id}`, data),
  delete: (id) => apiService.delete(`/invoices/${id}`),
  getByInvoice: (invoiceId) => apiService.get(`/invoices/${invoiceId}/items`),
  getMetrics: () => apiService.get('/invoices/metrics/summary'),
  markAsRefunded: (id, data) => apiService.post(`/invoices/${id}/refund`, data),
};

export const fileManagerAPI = {
  getFiles: (userId) => apiService.get(`/files${userId ? '?userId=' + userId : ''}`),
  getFolders: (userId) => apiService.get(`/folders${userId ? '?userId=' + userId : ''}`),
  getStorageStats: (userId) => apiService.get(`/files/storage-stats${userId ? '?userId=' + userId : ''}`),
  createFolder: (data) => apiService.post('/folders', data),
  uploadFile: (data) => apiService.post('/files', data),
  updateFileFavorite: (fileId, isFavorite) => apiService.put(`/files/${fileId}/favorite`, { isFavorite }),
  deleteFile: (fileId) => apiService.delete(`/files/${fileId}`),
  deleteFolder: (folderId) => apiService.delete(`/folders/${folderId}`),
};

export const activitiesAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/activities${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => apiService.get(`/activities/${id}`),
  create: (data) => apiService.post('/activities', data),
  update: (id, data) => apiService.put(`/activities/${id}`, data),
  delete: (id) => apiService.delete(`/activities/${id}`),
  getUnifiedFeed: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/activities/unified-feed${queryString ? '?' + queryString : ''}`);
  },
};

export const notesAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/notes${queryString ? '?' + queryString : ''}`);
  },
  create: (data) => apiService.post('/notes', data),
  delete: (id) => apiService.delete(`/notes/${id}`),
};

export const conversationsAPI = {
  getByUserId: (userId) => apiService.get(`/conversations/${userId}`),
  getMessagesByUserId: (userId, conversationWith, groupId) => {
    const params = new URLSearchParams();
    if (conversationWith) params.append('conversationWith', conversationWith);
    if (groupId) params.append('groupId', groupId);
    return apiService.get(`/messages/${userId}?${params.toString()}`);
  },
  getAvailableUsers: (userId, search = '') => {
    const params = new URLSearchParams(search ? { search } : {}).toString();
    return apiService.get(`/available-users/${userId}${params ? '?' + params : ''}`);
  },
  sendMessage: (data) => apiService.post('/messages', data),
  createGroup: (data) => apiService.post('/chat-groups', data),
  getGroupMembers: (groupId) => apiService.get(`/chat-groups/${groupId}/members`),
};

export const filesAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/files${queryString ? '?' + queryString : ''}`);
  },
  create: (data) => apiService.post('/files', data),
  toggleFavorite: (fileId) => apiService.put(`/files/${fileId}/favorite`, {}),
  delete: (fileId) => apiService.delete(`/files/${fileId}`),
  getStorageStats: () => apiService.get('/files/storage-stats'),
};

export const teamsAPI = {
  getAll: (departmentId) => apiService.get(`/teams${departmentId ? '?department_id=' + departmentId : ''}`),
  create: (data) => apiService.post('/teams', data),
  update: (teamId, data) => apiService.put(`/teams/${teamId}`, data),
  delete: (teamId) => apiService.delete(`/teams/${teamId}`),
  getMembers: (teamId) => apiService.get(`/teams/${teamId}/members`),
  addMember: (teamId, data) => apiService.post(`/teams/${teamId}/members`, data),
  removeMember: (teamId, userId) => apiService.delete(`/teams/${teamId}/members/${userId}`),
};

export const itManagerAPI = {
  getTeamTasks: () => apiService.get('/it/manager/team-tasks'),
  getPerformance: () => apiService.get('/it/manager/performance'),
  getDeadlines: () => apiService.get('/it/manager/deadlines'),
  getProjectsSummary: () => apiService.get('/it/manager/projects-summary'),
};

export const foldersAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/folders${queryString ? '?' + queryString : ''}`);
  },
  create: (data) => apiService.post('/folders', data),
  delete: (folderId) => apiService.delete(`/folders/${folderId}`),
};

export const marketingAPI = {
  getSeo: () => apiService.get('/marketing/seo'),
  getGmb: () => apiService.get('/marketing/gmb'),
  createSeo: (data) => apiService.post('/marketing/seo', data),
  createGmb: (data) => apiService.post('/marketing/gmb', data),
};

export const followupsAPI = {
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/followups${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => apiService.get(`/followups/${id}`),
  create: (data) => apiService.post('/followups', data),
  update: (id, data) => apiService.put(`/followups/${id}`, data),
  delete: (id) => apiService.delete(`/followups/${id}`),
  getMetrics: () => apiService.get('/followups/metrics/summary'),
  complete: (id, data) => apiService.post(`/followups/${id}/complete`, data),
  reschedule: (id, data) => apiService.post(`/followups/${id}/reschedule`, data),
  getByRelated: (related_type, related_id) => apiService.get(`/followups?related_type=${related_type}&related_id=${related_id}`),
  getEffectivenessAnalytics: () => apiService.get('/followups/analytics/effectiveness'),
};

export const salesAPI = {
  getTargets: (userId) => apiService.get(`/sales/targets${userId ? `?userId=${userId}` : ''}`),
  getReports: (userId) => apiService.get(`/sales/reports${userId ? `?userId=${userId}` : ''}`),
  getAnalytics: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiService.get(`/sales/analytics${queryString ? '?' + queryString : ''}`);
  },
};

export const createContract = (data) => contractsAPI.create(data);

export default apiService;
