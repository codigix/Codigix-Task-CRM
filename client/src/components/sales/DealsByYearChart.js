import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CustomDropdown from '../common/CustomDropdown';
import DateRangeDropdown from '../common/DateRangeDropdown';

const DealsByYearChart = ({ deals, onDateRangeChange }) => {
  const [selectedPipeline, setSelectedPipeline] = useState('Marketing Pipeline');
  const [selectedPeriod, setSelectedPeriod] = useState('Last 15 Days');
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthMap = {};
  
  monthNames.forEach((month, index) => {
    monthMap[index] = 0;
  });

  deals.forEach((deal) => {
    if (deal.createdAt) {
      const date = new Date(deal.createdAt);
      const month = date.getMonth();
      monthMap[month] = (monthMap[month] || 0) + 1;
    }
  });

  const chartData = monthNames.map((month, index) => ({
    month,
    deals: monthMap[index] || 0
  }));

  return (
    <div className="bg-white rounded  border border-gray-100 ">
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm   text-gray-900">Deals by Year</h2>
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
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #f3f4f6',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '11px',
                  fontWeight: '600'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="deals" 
                stroke="#ffa500" 
                strokeWidth={3}
                dot={{ fill: '#ffa500', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-500">
            No deals data available
          </div>
        )}
      </div>
    </div>
  );
};

export default DealsByYearChart;
