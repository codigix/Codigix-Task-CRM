import React from 'react';
import { Briefcase, CheckCircle, Clock } from 'lucide-react';

const ProjectKPISummary = ({ projects = [] }) => {
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'Completed').length;
  const activeProjects = projects.filter(p => 
    p.status && ['In Progress', 'Planning', 'Active'].includes(p.status)
  ).length;

  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  const cards = [
    {
      id: 'total',
      label: 'Total Projects',
      value: totalProjects,
      icon: Briefcase,
      bgColor: 'bg-blue-50',
      textColor: 'text-white ',
      borderColor: 'border-blue-200',
    },
    {
      id: 'active',
      label: 'Active Projects',
      value: activeProjects,
      icon: Clock,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-200',
    },
    {
      id: 'completed',
      label: 'Completed',
      value: completedProjects,
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      id: 'completion',
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: CheckCircle,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`${card.bgColor} ${card.borderColor} rounded border-2 p-2 transition-shadow hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs    text-gray-600 mb-1">{card.label}</p>
                <p className={`${card.textColor}  text-xl `}>{card.value}</p>
              </div>
              <Icon size={24} className={card.textColor} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectKPISummary;
