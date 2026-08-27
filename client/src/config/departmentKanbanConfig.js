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
      { id: 'ALL', name: 'All Marketing Spaces', code: 'ALL' },
      { id: 'MKT', name: 'Marketing Campaigns (MKT)', code: 'MKT' },
      { id: 'DES', name: 'Creative & Design (DES)', code: 'DES' },
      { id: 'VID', name: 'Video Production (VID)', code: 'VID' },
      { id: 'SMM', name: 'Social Media & Content (SMM)', code: 'SMM' },
      { id: 'SEO', name: 'SEO & Organic Growth (SEO)', code: 'SEO' },
      { id: 'WPD', name: 'Wordpress & Web Dev (WPD)', code: 'WPD' },
      { id: 'PPC', name: 'PPC & Paid Ads (PPC)', code: 'PPC' },
    ],
    issueTypes: [
      { name: 'Task', icon: CheckSquare, color: 'text-blue-500 bg-blue-50', description: 'General task or deliverable' },
      { name: 'Campaign', icon: Megaphone, color: 'text-orange-500 bg-orange-50', description: 'Marketing campaign or promo' },
      { name: 'Design', icon: Palette, color: 'text-purple-500 bg-purple-50', description: 'Graphic asset or UI design' },
      { name: 'Video', icon: Video, color: 'text-red-500 bg-red-50', description: 'Video reel or motion graphics' },
      { name: 'Content', icon: FileText, color: 'text-green-500 bg-green-50', description: 'Blog post, copy, or SEO article' },
      { name: 'Bug', icon: AlertCircle, color: 'text-red-600 bg-red-100', description: 'Website or tracking error' },
    ],
    roles: [
      'All Roles',
      'Graphics Designer',
      'Video Editor',
      'Social Media Marketing',
      'SEO & GMB',
      'PPC Manager',
      'Wordpress Developer',
      'Manager'
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
