import os
import re

file_path = r"d:\projects\Codigix-Task-CRM\client\src\components\hr\HRPerformance.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Context
if "const PerformanceContext" not in content:
    content = content.replace(
        "import Swal from 'sweetalert2';",
        "import Swal from 'sweetalert2';\n\nconst PerformanceContext = React.createContext();"
    )

# 2. Update Drawer
drawer_patch = """const Drawer = ({ isOpen, onClose, employee }) => {
  const { fetchEmployeeDetails, submitReview } = React.useContext(PerformanceContext);
  const [empDetails, setEmpDetails] = React.useState(null);
  
  React.useEffect(() => {
    if(isOpen && employee) {
      setEmpDetails(null);
      fetchEmployeeDetails(employee.id).then(setEmpDetails);
    }
  }, [isOpen, employee]);
"""
if "const [empDetails" not in content:
    content = content.replace("const Drawer = ({ isOpen, onClose, employee }) => {", drawer_patch)
    content = content.replace("const [activeTab, setActiveTab] = useState('Overview');", "const [activeTab, setActiveTab] = useState('Overview');\n  const mockTasks = empDetails?.tasks || [];\n  const mockTimeLogs = empDetails?.timeLogs || [];\n  const mockPastReviews = empDetails?.reviews || [];\n  const qualityMetrics = empDetails?.qualityMetrics || {avgQuality:0, avgOnTime:0, avgEfficiency:0};", 1)

# Fix drawer loading state rendering
if "if (!isOpen) return null;" in content:
    content = content.replace("if (!isOpen) return null;", "if (!isOpen) return null;\n  if (!empDetails) return (<div className={`fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 p-6 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>Loading...</div>);")

# 3. Update OverviewTab
overview_patch = """const OverviewTab = () => {
  const { overview, employees } = React.useContext(PerformanceContext);
  const { trendData = [], deptData = [], scoreBreakdown = [], averageScore = 0, totalReviews = 0 } = overview || {};
  const topEmployees = employees.filter(e => e.score).sort((a,b)=>b.score-a.score).slice(0,5);
  const recentReviews = []; // Handled separately or mocked
"""
if "const { overview, employees }" not in content:
    content = content.replace("const OverviewTab = () => {", overview_patch)

# 4. Update AllEmployeesTab
all_patch = """const AllEmployeesTab = ({ onSelectEmployee, handleGenerateReport }) => {
  const { employees, overview } = React.useContext(PerformanceContext);
  const { deptData = [], perfDistribution = [] } = overview || {};
  const allEmployees = employees;
"""
if "const allEmployees = employees;" not in content:
    content = content.replace("const AllEmployeesTab = ({ onSelectEmployee, handleGenerateReport }) => {", all_patch)

# 5. Update HRPerformance
hr_perf_patch = """const HRPerformance = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  const [employees, setEmployees] = useState([]);
  const [overview, setOverview] = useState({
    averageScore: 0,
    totalReviews: 0,
    trendData: [],
    deptData: [],
    scoreBreakdown: [],
    perfDistribution: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, employeesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/hr/performance/overview`),
        fetch(`${API_BASE_URL}/api/hr/performance/employees`)
      ]);
      const overviewData = await overviewRes.json();
      const employeesData = await employeesRes.json();
      
      setOverview(overviewData);
      setEmployees(employeesData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchEmployeeDetails = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/hr/performance/employees/${id}`);
      return await res.json();
    } catch(e) {
      console.error(e);
      return null;
    }
  };

  const submitReview = async (id, reviewData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/hr/performance/employees/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });
      if(res.ok) {
        Swal.fire('Success', 'Review submitted successfully', 'success');
        fetchData(); // refresh overview
        return true;
      }
    } catch(e) {
      console.error(e);
      Swal.fire('Error', 'Failed to submit review', 'error');
      return false;
    }
  };

"""
if "const [employees, setEmployees] = useState" not in content:
    content = content.replace(
        "const HRPerformance = () => {\n  const [activeTab, setActiveTab] = useState('Overview');\n  const [selectedEmployee, setSelectedEmployee] = useState(null);",
        hr_perf_patch
    )

    # Wrap the return with Context
    content = content.replace(
        "return (\n    <div className=\"min-h-screen",
        "return (\n    <PerformanceContext.Provider value={{ employees, overview, fetchEmployeeDetails, submitReview }}>\n    <div className=\"min-h-screen"
    )
    content = content.replace(
        "    </div>\n  );\n};\n\nexport default HRPerformance;",
        "    </div>\n    </PerformanceContext.Provider>\n  );\n};\n\nexport default HRPerformance;"
    )

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated HRPerformance.js")
