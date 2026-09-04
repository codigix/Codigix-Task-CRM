import React from 'react';
import { CheckSquare, Bookmark, AlertCircle, Megaphone, Palette, Video, FileText, Users, Briefcase, TestTube, Code, Globe, Shield } from 'lucide-react';

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
    issueTypes: [
      { name: 'Task', icon: CheckSquare, color: 'text-blue-500 bg-blue-50', description: 'General task or deliverable' },
      { name: 'Story', icon: Bookmark, color: 'text-green-500 bg-green-50', description: 'User story or feature' },
      { name: 'Bug', icon: AlertCircle, color: 'text-red-500 bg-red-50', description: 'Software defect or bug' },
      { name: 'Test', icon: TestTube, color: 'text-purple-500 bg-purple-50', description: 'QA test case or regression test' },
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
    issueTypes: [
      { name: 'Task', icon: CheckSquare, color: 'text-blue-500 bg-blue-50', description: 'General marketing task' },
      { name: 'Campaign', icon: Megaphone, color: 'text-orange-500 bg-orange-50', description: 'Marketing campaign or strategy' },
      { name: 'Design', icon: Palette, color: 'text-purple-500 bg-purple-50', description: 'Graphics, banners, visual assets' },
      { name: 'Video', icon: Video, color: 'text-red-500 bg-red-50', description: 'Reels, shorts, motion graphics' },
      { name: 'Content', icon: FileText, color: 'text-green-500 bg-green-50', description: 'Blogs, articles, ad copy' },
      { name: 'Search', icon: Globe, color: 'text-indigo-500 bg-indigo-50', description: 'SEO, GMB, GEO, AEO updates' },
      { name: 'Social', icon: Users, color: 'text-pink-500 bg-pink-50', description: 'Social media scheduling & posts' }
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
