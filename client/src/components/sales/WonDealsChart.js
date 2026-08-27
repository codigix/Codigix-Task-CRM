import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CustomDropdown from '../common/CustomDropdown';
import DateRangeDropdown from '../common/DateRangeDropdown';

const WonDealsChart = ({ deals, onDateRangeChange }) => {
  const [selectedPipeline, setSelectedPipeline] = useState('Marketing Pipeline');
  const [selectedPeriod, setSelectedPeriod] = useState('Last 15 Days');
  
  const stageMap = {};
  deals.forEach((deal) => {
    const wonStatuses = ['Won', 'Closed Won', 'Completed', 'Success'];
    const isWon = wonStatuses.includes(deal.status);
    
    if (isWon) {
      const pipeline = deal.pipeline || 'Unassigned';
      const stage = deal.stage || 'No Stage';
      const key = `${pipeline} - ${stage}`;
      
      if (!stageMap[key]) {
        stageMap[key] = 0;
      }
      stageMap[key] += 1;
    }
  });

  let chartData = Object.entries(stageMap).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value);
  
  if (chartData.length === 0) {
    chartData = [{
      name: 'No won deals',
      value: 0
    }];
  }

  return (
    <div className="bg-white rounded  border border-gray-100 ">
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm   text-gray-900">Won Deals Stage</h2>
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
              options={['Last 30 Days', 'Last 60 Days']}
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            barCategoryGap="40%"
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280' }} 
              width={100}
            />
            <Tooltip 
              cursor={{ fill: '#f9fafb' }}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #f3f4f6',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '600'
              }}
              formatter={(value) => value === 0 ? 'No data' : value}
            />
            <Bar dataKey="value" fill="#22c55e" radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WonDealsChart;
