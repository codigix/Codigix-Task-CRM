import re

with open('client/src/components/sales/AddNewLeadModal.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variables
content = content.replace(
    "const [fetchedCompanies, setFetchedCompanies] = useState([]);\n  const [selectedFile, setSelectedFile] = useState(null);",
    "const [fetchedCompanies, setFetchedCompanies] = useState([]);\n  const [selectedFile, setSelectedFile] = useState(null);\n  const [itServicesList, setItServicesList] = useState([]);\n  const [itServiceSearchOpen, setItServiceSearchOpen] = useState(false);\n  const [itServiceSearchTerm, setItServiceSearchTerm] = useState('');"
)

# 2. Add fetchItServicesData call
content = content.replace(
    "fetchUsers();\n      fetchCompaniesData();\n    }\n  }, [isOpen]);",
    "fetchUsers();\n      fetchCompaniesData();\n      fetchItServicesData();\n    }\n  }, [isOpen]);"
)

# 3. Add fetchItServicesData definition
fetch_func = """
  const fetchItServicesData = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/it-services`);
      if (response.ok) {
        const data = await response.json();
        setItServicesList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching IT services:', err);
    }
  };
"""
content = content.replace(
    "console.error('Error fetching companies:', err);\n    }\n  };",
    f"console.error('Error fetching companies:', err);\n    }}\n  }};\n{fetch_func}"
)

# 4. Add getFilteredItServices definition
filter_func = """
  const getFilteredItServices = () => {
    if (!itServiceSearchTerm.trim()) {
      return itServicesList;
    }
    return itServicesList.filter(s => {
      const serviceName = (s.name || '').toLowerCase();
      return serviceName.includes(itServiceSearchTerm.toLowerCase());
    });
  };
"""
content = content.replace(
    "return companyName.includes(searchTerm) || industry.includes(searchTerm);\n    });\n  };",
    f"return companyName.includes(searchTerm) || industry.includes(searchTerm);\n    }};\n  }};\n{filter_func}"
)

# 5. Modify the IT Services UI dropdown
ui_old = """                <select
                  name="it_services"
                  value={formData.it_services}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
                >
                  <option value="">Select IT Service</option>
                  {itServiceOptions.map(service => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>"""

ui_new = """                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setItServiceSearchOpen(!itServiceSearchOpen)}
                    className="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-red-500 transition text-left flex items-center justify-between"
                  >
                    <span className={formData.it_services ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.it_services || 'Select IT Service'}
                    </span>
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>

                  {itServiceSearchOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-20">
                      <div className="p-2 border-b border-gray-100">
                        <input
                          type="text"
                          placeholder="Search IT service..."
                          value={itServiceSearchTerm}
                          onChange={(e) => setItServiceSearchTerm(e.target.value)}
                          className="w-full p-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-red-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, it_services: '' }));
                            setItServiceSearchOpen(false);
                          }}
                          className="w-full p-2 text-left text-xs text-gray-500 hover:bg-gray-50 border-b border-gray-50"
                        >
                          None (Clear Selection)
                        </button>
                        {getFilteredItServices().map(service => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, it_services: service.name }));
                              setItServiceSearchOpen(false);
                            }}
                            className="w-full p-2 text-left text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                          >
                            {service.name}
                          </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, it_services: 'Other' }));
                              setItServiceSearchOpen(false);
                            }}
                            className="w-full p-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                          >
                            Other
                        </button>
                        {getFilteredItServices().length === 0 && (
                          <div className="p-2 text-xs text-gray-500 text-center">No services found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>"""

content = content.replace(ui_old, ui_new)

# 6. Reset search state in handleCancel
content = content.replace(
    "setCompanySearchTerm('');\n    setSelectedFile(null);",
    "setCompanySearchTerm('');\n    setItServiceSearchTerm('');\n    setItServiceSearchOpen(false);\n    setSelectedFile(null);"
)

with open('client/src/components/sales/AddNewLeadModal.js', 'w', encoding='utf-8') as f:
    f.write(content)
