import React, { useState } from 'react';
import Chart from 'react-apexcharts';
import DateRangeDropdown from '../common/DateRangeDropdown';

const LeadsProjectsByStageChart = ({ projects, onDateRangeChange }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');

  const stageMap = {};
  (projects || []).forEach((project) => {
    const stage = project.status || 'Unknown';
    stageMap[stage] = (stageMap[stage] || 0) + 1;
  });

  const labels = Object.keys(stageMap);
  const chartData = Object.values(stageMap);

  const colorPalette = ['#3b82f6', '#10b981', '#fbbf24', '#ef4444', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#14b8a6', '#a855f7'];
  const colors = labels.map((_, idx) => colorPalette[idx % colorPalette.length]);

  const options = {
    chart: {
      type: 'pie',
      sparkline: { enabled: false },
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    labels: labels,
    colors: colors,
    plotOptions: {
      pie: {
        donut: {
          size: '0%',
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => val.toFixed(1) + '%',
        },
      },
    },
    dataLabels: {
      background: {
        enabled: true,
        foreColor: '#fff',
        borderRadius: 2,
        padding: 4,
        opacity: 0.8,
      },
      style: {
        fontSize: '12px',
        fontWeight: 500,
      },
    },
    legend: {
      position: 'bottom',
      fontSize: '13px',
      fontWeight: 500,
      markers: {
        width: 10,
        height: 10,
        radius: 2,
      },
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px',
      },
      y: {
        formatter: (val) => val + ' items',
      },
    },
    states: {
      hover: {
        filter: {
          type: 'darken',
          value: 0.1,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded  border border-border-light">
      <div className="p-2 border-b border-border-light">
        <div className="flex items-center justify-between">
          <h2 className="text-xs  text-gray-900">Projects By Stage</h2>
          <DateRangeDropdown
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            onDateRangeChange={onDateRangeChange}
            options={['Last 15 Days', 'Last 30 Days', 'Last 7 Days']}
          />
        </div>
      </div>

      <div className="p-6 min-h-96">
        {chartData.length > 0 ? (
          <Chart options={options} series={chartData} type="pie" height={320} />
        ) : (
          <div className="h-96 flex flex-col items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 text-lg   mb-2">No Projects Available</p>
              <p className="text-gray-500 text-xs ">Create projects to see them displayed here by status.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsProjectsByStageChart;
