import React, { useState } from 'react';
import Chart from 'react-apexcharts';
import DateRangeDropdown from './DateRangeDropdown';

const ProjectByStageChart = ({ projects, onDateRangeChange }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');

  const statusMap = {};
  (projects || []).forEach((project) => {
    const status = project.status || 'Unknown';
    statusMap[status] = (statusMap[status] || 0) + 1;
  });

  const labels = Object.keys(statusMap);
  const chartData = Object.values(statusMap);

  const options = {
    chart: {
      type: 'donut',
      sparkline: { enabled: false },
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    labels: labels,
    colors: ['#6366f1', '#f59e0b', '#3b82f6', '#ef4444'],
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: {
              fontSize: '14px',
              fontWeight: 600,
              color: '#6b7280',
            },
            value: {
              fontSize: '18px',
              fontWeight: 700,
              color: '#1f2937',
              formatter: (val) => val,
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '13px',
              color: '#9ca3af',
              formatter: () => {
                const sum = chartData.reduce((a, b) => a + b, 0);
                return sum;
              },
            },
          },
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => val.toFixed(0) + '%',
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
        fontSize: '11px',
        fontWeight: 600,
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
        formatter: (val) => val + ' projects',
      },
    },
    states: {
      hover: {
        filter: {
          type: 'darken',
          value: 0.15,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded  border border-border-light">
      <div className="p-2 border-b border-border-light">
        <div className="flex items-center justify-between">
          <h2 className="text-md  text-gray-900">Project By Stage</h2>
          <DateRangeDropdown
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            onDateRangeChange={onDateRangeChange}
            options={['Last 15 Days', 'Last 30 Days', 'Last 7 Days']}
          />
        </div>
      </div>

      <div className="p-2">
        {chartData.length > 0 ? (
          <Chart options={options} series={chartData} type="donut" height={320} />
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-500">
            No data available
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectByStageChart;
