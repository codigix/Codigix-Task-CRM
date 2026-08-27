import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CustomDropdown from '../common/CustomDropdown';
import DateRangeDropdown from '../common/DateRangeDropdown';

const DealsByStageChart = ({ deals, onDateRangeChange }) => {
  const [selectedPipeline, setSelectedPipeline] = useState('All');
  const [selectedPeriod, setSelectedPeriod] = useState('Last 15 Days');
  const chartData = [];
  const stageMap = {};

  deals.forEach((deal) => {
    const pipeline = deal.pipeline || 'Unassigned';
    const stage = deal.stage || 'No Stage';
    const key = `${pipeline} - ${stage}`;
    
    if (!stageMap[key]) {
      stageMap[key] = 0;
    }
    stageMap[key] += 1;
  });

  Object.keys(stageMap).forEach((key) => {
    chartData.push({
      name: key,
      deals: stageMap[key],
    });
  });
  
  chartData.sort((a, b) => b.deals - a.deals);

  return (
    <div className="bg-white rounded  border border-gray-100 ">
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm   text-gray-900">Deals By Stage</h2>
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
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
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
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #f3f4f6',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '11px',
                  fontWeight: '600'
                }}
              />
              <Bar dataKey="deals" fill="#38a189" radius={[0, 0, 0, 0]} />
            </BarChart>
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

export default DealsByStageChart;
