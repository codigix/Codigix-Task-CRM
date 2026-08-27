import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CustomDropdown from '../common/CustomDropdown';
import DateRangeDropdown from '../common/DateRangeDropdown';

const LeadsProjectsAreaChart = ({ projects, onDateRangeChange }) => {
  const [selectedPipeline, setSelectedPipeline] = useState('Sales Pipeline');
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');

  const generateMonthlyData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const monthCounts = {};

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentDate.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthCounts[key] = 0;
    }

    (projects || []).forEach((project) => {
      if (project.created_at || project.createdAt) {
        const date = new Date(project.created_at || project.createdAt);
        const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        if (monthCounts.hasOwnProperty(key)) {
          monthCounts[key]++;
        }
      }
    });

    return Object.entries(monthCounts).map(([key, count]) => ({
      month: monthNames[new Date(`${key}-01`).getMonth()],
      value: count,
    }));
  };

  const chartData = generateMonthlyData();

  return (
    <div className="bg-white rounded  border border-border-light">
      <div className="p-2 border-b border-border-light">
        <div className="flex items-center justify-between">
          <h2 className="text-md  text-gray-900">Projects Timeline</h2>
          <div className="flex gap-2">
            <CustomDropdown
              options={['Marketing Pipeline', 'Sales Pipeline', 'Email', 'Chats', 'Operational']}
              value={selectedPipeline}
              onChange={setSelectedPipeline}
            />
            <DateRangeDropdown
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              onDateRangeChange={onDateRangeChange}
              options={['Last 15 Days', 'Last 30 Days', 'Last 7 Days']}
            />
          </div>
        </div>
      </div>

      <div className="p-6 min-h-96">
        {chartData.length > 0 && chartData.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#a78bfa"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 text-lg   mb-2">No Projects Data</p>
              <p className="text-gray-500 text-xs ">Projects will appear here over time as they are created.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsProjectsAreaChart;
