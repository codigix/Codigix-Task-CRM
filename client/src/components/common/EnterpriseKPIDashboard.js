import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, CheckCircle, AlertCircle, DollarSign, Zap } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const EnterpriseKPIDashboard = () => {
  const [kpiData, setKpiData] = useState({
    sales: {},
    marketing: {},
    it: {},
    accounts: {},
    admin: {}
  });
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('sales');

  useEffect(() => {
    fetchKPIData();
  }, []);

  const fetchKPIData = async () => {
    try {
      setLoading(true);

      // Simulated data - in production, this would come from calculated metrics
      const mockKPIData = {
        sales: {
          conversionRate: 32.5,
          followUpDiscipline: 87,
          dealClosureTime: 24,
          dealsWon: 18,
          dealsInPipeline: 45,
          avgDealValue: 45000,
          trend: [
            { month: 'Jan', conversion: 28, deals: 15 },
            { month: 'Feb', conversion: 30, deals: 16 },
            { month: 'Mar', conversion: 32.5, deals: 18 }
          ]
        },
        marketing: {
          campaignProgress: 78,
          seoRankingImprovement: 45,
          contentDeliveryTimeline: 92,
          activeProjects: 12,
          completedProjects: 8,
          contentItemsDelivered: 156,
          trend: [
            { month: 'Jan', seo: 35, content: 85 },
            { month: 'Feb', seo: 40, content: 88 },
            { month: 'Mar', seo: 45, content: 92 }
          ]
        },
        it: {
          taskCompletionRate: 89,
          bugResolutionRate: 94,
          deploymentSuccess: 97,
          tasksCompleted: 124,
          bugsResolved: 67,
          deployments: 15,
          trend: [
            { month: 'Jan', completion: 85, bugResolution: 90 },
            { month: 'Feb', completion: 87, bugResolution: 92 },
            { month: 'Mar', completion: 89, bugResolution: 94 }
          ]
        },
        accounts: {
          invoicePaymentRate: 91,
          outstandingAmount: 125000,
          averagePaymentDays: 22,
          totalInvoiced: 850000,
          totalCollected: 773000,
          overdue: 12,
          trend: [
            { month: 'Jan', collected: 750000, outstanding: 150000 },
            { month: 'Feb', collected: 760000, outstanding: 135000 },
            { month: 'Mar', collected: 773000, outstanding: 125000 }
          ]
        },
        admin: {
          overallPerformance: 88,
          employeeProductivity: 86,
          projectsOnTrack: 34,
          projectsAtRisk: 5,
          projectsDelayed: 3,
          avgProjectCompletion: 81,
          trend: [
            { month: 'Jan', performance: 82, ontrack: 28 },
            { month: 'Feb', performance: 85, ontrack: 31 },
            { month: 'Mar', performance: 88, ontrack: 34 }
          ]
        }
      };

      setKpiData(mockKPIData);
    } catch (error) {
      console.error('Failed to fetch KPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const KPICard = ({ title, value, unit, icon: Icon, color, trend }) => (
    <div className="bg-white rounded p-2   border border-gray-200 hover:shadow-lg transition">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl   ${color}`}>
            {value}{unit}
          </p>
          {trend && (
            <p className={`text-xs mt-2 ${trend > 0 ? 'text-green-600' : 'text-red '}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
            </p>
          )}
        </div>
        <div className={`p-2 rounded  ${color.replace('text', 'bg').replace('600', '100')}`}>
          <Icon size={24} className={color} />
        </div>
      </div>
    </div>
  );

  const renderSalesDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Conversion Rate"
          value={kpiData.sales.conversionRate}
          unit="%"
          icon={TrendingUp}
          color="text-green-600"
          trend={4.5}
        />
        <KPICard
          title="Follow-up Discipline"
          value={kpiData.sales.followUpDiscipline}
          unit="%"
          icon={CheckCircle}
          color="text-white "
          trend={2}
        />
        <KPICard
          title="Deal Closure Time"
          value={kpiData.sales.dealClosureTime}
          unit=" days"
          icon={Zap}
          color="text-purple-600"
          trend={-5}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded p-2   border border-gray-200">
          <h3 className="text-lg  mb-4 text-gray-800">Deals Overview</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Deals Won:</span>
              <span className=" text-green-600">{kpiData.sales.dealsWon}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">In Pipeline:</span>
              <span className="">{kpiData.sales.dealsInPipeline}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Deal Value:</span>
              <span className="">${(kpiData.sales.avgDealValue / 1000).toFixed(1)}K</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={kpiData.sales.trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="conversion" stroke="#10b981" name="Conversion %" />
            <Line type="monotone" dataKey="deals" stroke="#3b82f6" name="Deals Won" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderMarketingDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Campaign Progress"
          value={kpiData.marketing.campaignProgress}
          unit="%"
          icon={TrendingUp}
          color="text-purple-600"
          trend={8}
        />
        <KPICard
          title="SEO Ranking Improvement"
          value={kpiData.marketing.seoRankingImprovement}
          unit=" positions"
          icon={CheckCircle}
          color="text-orange-600"
          trend={5}
        />
        <KPICard
          title="Content Delivery Timeline"
          value={kpiData.marketing.contentDeliveryTimeline}
          unit="%"
          icon={Zap}
          color="text-pink-600"
          trend={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded p-2   border border-gray-200">
          <h3 className="text-lg  mb-4 text-gray-800">Project Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Projects:</span>
              <span className="">{kpiData.marketing.activeProjects}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed:</span>
              <span className=" text-green-600">{kpiData.marketing.completedProjects}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Content Items Delivered:</span>
              <span className="">{kpiData.marketing.contentItemsDelivered}</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={kpiData.marketing.trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="seo" stroke="#f97316" name="SEO Improvement" />
            <Line type="monotone" dataKey="content" stroke="#ec4899" name="Content Timeline %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderITDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Task Completion Rate"
          value={kpiData.it.taskCompletionRate}
          unit="%"
          icon={CheckCircle}
          color="text-green-600"
          trend={2}
        />
        <KPICard
          title="Bug Resolution Rate"
          value={kpiData.it.bugResolutionRate}
          unit="%"
          icon={AlertCircle}
          color="text-red "
          trend={2}
        />
        <KPICard
          title="Deployment Success"
          value={kpiData.it.deploymentSuccess}
          unit="%"
          icon={Zap}
          color="text-white "
          trend={1}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded p-2   border border-gray-200">
          <h3 className="text-lg  mb-4 text-gray-800">Team Metrics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tasks Completed:</span>
              <span className="">{kpiData.it.tasksCompleted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Bugs Resolved:</span>
              <span className=" text-green-600">{kpiData.it.bugsResolved}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Deployments:</span>
              <span className="">{kpiData.it.deployments}</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={kpiData.it.trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="completion" fill="#10b981" name="Completion Rate %" />
            <Bar dataKey="bugResolution" fill="#ef4444" name="Bug Resolution %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderAccountsDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Payment Rate"
          value={kpiData.accounts.invoicePaymentRate}
          unit="%"
          icon={DollarSign}
          color="text-green-600"
          trend={3}
        />
        <KPICard
          title="Outstanding Amount"
          value={(kpiData.accounts.outstandingAmount / 1000).toFixed(0)}
          unit="K"
          icon={AlertCircle}
          color="text-orange-600"
          trend={-8}
        />
        <KPICard
          title="Avg Payment Days"
          value={kpiData.accounts.averagePaymentDays}
          unit=" days"
          icon={Zap}
          color="text-white "
          trend={-2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded p-2   border border-gray-200">
          <h3 className="text-lg  mb-4 text-gray-800">Financial Overview</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Invoiced:</span>
              <span className="">${(kpiData.accounts.totalInvoiced / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Collected:</span>
              <span className=" text-green-600">${(kpiData.accounts.totalCollected / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Overdue Invoices:</span>
              <span className=" text-red ">{kpiData.accounts.overdue}</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={kpiData.accounts.trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
            <Legend />
            <Line type="monotone" dataKey="collected" stroke="#10b981" name="Collected" />
            <Line type="monotone" dataKey="outstanding" stroke="#f97316" name="Outstanding" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Overall Performance"
          value={kpiData.admin.overallPerformance}
          unit="%"
          icon={TrendingUp}
          color="text-white "
          trend={3}
        />
        <KPICard
          title="Employee Productivity"
          value={kpiData.admin.employeeProductivity}
          unit="%"
          icon={Users}
          color="text-green-600"
          trend={2}
        />
        <KPICard
          title="Projects On Track"
          value={kpiData.admin.projectsOnTrack}
          unit=""
          icon={CheckCircle}
          color="text-purple-600"
          trend={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded p-2   border border-gray-200">
          <h3 className="text-lg  mb-4 text-gray-800">Project Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">On Track:</span>
              <span className=" text-green-600">{kpiData.admin.projectsOnTrack}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">At Risk:</span>
              <span className=" text-orange-600">{kpiData.admin.projectsAtRisk}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delayed:</span>
              <span className=" text-red ">{kpiData.admin.projectsDelayed}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">Avg Completion:</span>
              <span className="">{kpiData.admin.avgProjectCompletion}%</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={kpiData.admin.trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="performance" fill="#3b82f6" name="Overall Performance %" />
            <Bar dataKey="ontrack" fill="#10b981" name="Projects On Track" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  if (loading) {
    return <div className="text-center py-10">Loading KPI Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'sales', label: '📊 Sales', color: 'bg-green-100 text-green-800' },
          { id: 'marketing', label: '📢 Marketing', color: 'bg-purple-100 text-purple-800' },
          { id: 'it', label: '💻 IT Services', color: 'bg-blue-100 text-blue-800' },
          { id: 'accounts', label: '💰 Accounts', color: 'bg-orange-100 text-orange-800' },
          { id: 'admin', label: '⚙️ Admin', color: 'bg-gray-100 text-gray-800' }
        ].map(dept => (
          <button
            key={dept.id}
            onClick={() => setSelectedDept(dept.id)}
            className={`p-2 rounded-full  text-sm whitespace-nowrap transition ${selectedDept === dept.id
                ? `${dept.color} shadow-lg`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {dept.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded  p-6 border border-gray-200">
        {selectedDept === 'sales' && renderSalesDashboard()}
        {selectedDept === 'marketing' && renderMarketingDashboard()}
        {selectedDept === 'it' && renderITDashboard()}
        {selectedDept === 'accounts' && renderAccountsDashboard()}
        {selectedDept === 'admin' && renderAdminDashboard()}
      </div>
    </div>
  );
};

export default EnterpriseKPIDashboard;
