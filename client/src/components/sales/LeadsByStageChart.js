import React, { useState } from 'react';
import Chart from 'react-apexcharts';
import CustomDropdown from '../common/CustomDropdown';
import DateRangeDropdown from '../common/DateRangeDropdown';


const LeadsByStageChart = ({ leads, onDateRangeChange }) => {
  const [selectedPipeline, setSelectedPipeline] = useState('Marketing Pipeline');
  const [selectedPeriod, setSelectedPeriod] = useState('Last 3 Months');

  const statusMap = {};
  (leads || []).forEach((lead) => {
    const status = lead.status || 'Unknown';
    statusMap[status] = (statusMap[status] || 0) + 1;
  });

  const stages = Object.keys(statusMap);
  const values = Object.values(statusMap);

  const chartSeries = [
    {
      data: values,
      name: 'Count',
    },
  ];

  const options = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'inherit',
      sparkline: { enabled: false },
    },
    colors: ['#ef4444'],
    plotOptions: {
      bar: {
        borderRadius: 0,
        horizontal: true,
        barHeight: '75%',
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => val,
      offsetX: 6,
      style: {
        fontSize: '12px',
        fontWeight: 600,
        colors: ['#6b7280'],
      },
    },
    xaxis: {
      categories: stages,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          fontSize: '12px',
          colors: '#6b7280',
          fontWeight: 500,
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '12px',
          colors: '#374151',
          fontWeight: 500,
        },
      },
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 3,
      padding: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      xaxis: {
        lines: {
          show: false,
        },
      },
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px',
      },
      y: {
        formatter: (val) => val + ' leads',
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
    <div className="bg-white rounded   border border-[#E5E7EB]">
      <div className="p-2 border-b border-[#E5E7EB]">
        <div className="flex items-center justify-between">
          <h2 className="text-md  text-gray-900">Leads By Stage</h2>
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
              options={['Last 3 Months', 'Last 6 Months', 'Last 12 Months']}
            />
          </div>
        </div>
      </div>

      {/* Chart Panel */}
      <div className="border-b border-[#EAECF0]">
        <div className="px-6 py-5 border-t border-[#EAECF0] bg-white">
          {values.length > 0 ? (
            <Chart options={options} series={chartSeries} type="bar" height={280} />
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default LeadsByStageChart;
