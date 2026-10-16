import React from 'react';
import { CheckSquare, Bookmark, AlertCircle, Users, Briefcase, Code, Shield } from 'lucide-react';

export const DEPARTMENT_KANBAN_CONFIG = {
  IT: {
    departmentName: 'IT Operations & Engineering',
    defaultPrefix: 'WR',
    spaces: [
      { id: 'ALL', name: 'All IT Spaces', code: 'ALL' },
      { id: 'KAN', name: 'My Kanban Space (KAN)', code: 'KAN' },
      { id: 'DEV', name: 'DevOps & Infra (DEV)', code: 'DEV' },
      { id: 'QA', name: 'QA & Testing (QA)', code: 'QA' },
    ],
    // Work item types (Jira style). The kind of work (GMB, SEO, design, video...) is a label.
    // Subtasks are created inside a task (its Subtasks list), so "Subtask" is not picked here.
    issueTypes: [
      { name: 'Task', icon: CheckSquare, color: 'text-blue-500 bg-blue-50', description: 'General task or deliverable' },
      { name: 'Story', icon: Bookmark, color: 'text-green-500 bg-green-50', description: 'User story or feature' },
      { name: 'Bug', icon: AlertCircle, color: 'text-red-500 bg-red-50', description: 'Defect or something broken' },
    ],
    roles: ['All Roles', 'Developer', 'Tester', 'DevOps Engineer', 'IT Manager']
  },
  Marketing: {
    departmentName: 'Marketing Campaigns & Media',
    defaultPrefix: 'MKT',
    spaces: [
      { id: 'ALL', name: 'All Marketing Work', code: 'ALL' },
      { id: 'MKT', name: 'Campaigns & Strategy (MKT)', code: 'MKT' },
      { id: 'SEO', name: 'Search Optimization (SEO)', code: 'SEO' },
      { id: 'SMM', name: 'Social Media & Outreach (SMM)', code: 'SMM' },
      { id: 'CRV', name: 'Creative & Video (CRV)', code: 'CRV' },
      { id: 'CNT', name: 'Content & Copy (CNT)', code: 'CNT' }
    ],
    // Same work item types as IT; campaign / design / video / content / SEO / GMB / social are labels.
    issueTypes: [
      { name: 'Task', icon: CheckSquare, color: 'text-blue-500 bg-blue-50', description: 'General marketing task' },
      { name: 'Story', icon: Bookmark, color: 'text-green-500 bg-green-50', description: 'A larger piece of work or feature' },
      { name: 'Bug', icon: AlertCircle, color: 'text-red-500 bg-red-50', description: 'Website error, tracking or publishing issue' }
    ],
    roles: [
      'All Roles',
      'SEO/GEO/AEO Executive',
      'Content Writer',
      'Creative Designer',
      'Social Media Manager',
      'Marketing Manager'
    ]
  },
  Sales: {
    departmentName: 'Sales Deals & Pipelines',
    defaultPrefix: 'SLS',
    spaces: [
      { id: 'ALL', name: 'All Sales Spaces', code: 'ALL' },
      { id: 'LD', name: 'Lead Qualification (LD)', code: 'LD' },
      { id: 'DP', name: 'Deals & Proposals (DP)', code: 'DP' },
      { id: 'CO', name: 'Customer Onboarding (CO)', code: 'CO' },
    ],
    issueTypes: [
      { name: 'Task', icon: CheckSquare, color: 'text-blue-500 bg-blue-50', description: 'Sales follow-up or meeting' },
      { name: 'Lead', icon: Users, color: 'text-green-500 bg-green-50', description: 'New lead opportunity' },
      { name: 'Deal', icon: Briefcase, color: 'text-orange-500 bg-orange-50', description: 'Active deal negotiation' },
    ],
    roles: ['All Roles', 'Sales Representative', 'Sales Executive', 'Sales Manager']
  }
};
