import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Globe, Table, Columns, Rows3, Calendar, BarChart2, Folder } from 'lucide-react';
import { isManagerDesignation } from '../../utils/access';

/**
 * Jira-style tab strip across the top of a department's work views.
 * Every tab points at a route that actually exists for that department — no dead tabs.
 */
const BoardTabs = ({ department, spaceName }) => {
  const { designation, username } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const dept = String(department || 'IT');
  const isMarketing = dept.toLowerCase() === 'marketing';
  const base = `/${isMarketing ? 'marketing' : 'it'}/${designation}/${username}`;

  const canPlanSprints = isManagerDesignation(designation);

  const tabs = [
    { key: 'dashboard', label: 'Summary', icon: Globe },
    { key: 'tasks', label: 'List', icon: Table },
    { key: 'kanban', label: 'Board', icon: Columns },
    // Sprint planning is a manager activity, so employees get no Backlog tab.
    { key: 'backlog', label: 'Backlog', icon: Rows3, hidden: !canPlanSprints },
    { key: 'projects', label: 'Projects', icon: Folder },
    // Planning views are for managers; an employee works from the Board and List.
    { key: 'calendar', label: 'Calendar', icon: Calendar, hidden: !canPlanSprints },
    // Both departments now share the workload report at /reports.
    { key: 'reports', label: 'Reports', icon: BarChart2 }
  ].filter(t => !t.hidden);

  const current = location.pathname.split('/').filter(Boolean).pop();

  return (
    // Pinned to the top of the page's scroll area so the workspace name and tabs stay put
    // while the content below scrolls. z-20 keeps it above plain content but still under
    // the filter dropdowns (z-30+), which must be able to overlap it.
    <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6">
      {spaceName && (
        <div className="pt-4 pb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
            {dept.charAt(0).toUpperCase()}
          </span>
          <h2 className="text-lg font-bold text-gray-900">{spaceName}</h2>
        </div>
      )}
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map(t => {
          const active = current === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => navigate(`${base}/${t.key}`)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BoardTabs;
