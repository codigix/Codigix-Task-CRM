import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle, MoreHorizontal, MessageCircle, ChevronDown, Edit3, Trash2, X, MapPin, Mail, Phone, Globe, FolderOpen, Star, FileText, FileSpreadsheet, Send, Copy } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const fileBadgeStyles = {
  doc: { label: 'DOC', bg: 'bg-blue-50', text: 'text-white ' },
  pdf: { label: 'PDF', bg: 'bg-red-50', text: 'text-red ' },
  xls: { label: 'XLS', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  jpg: { label: 'JPG', bg: 'bg-orange-50', text: 'text-orange-600' },
  txt: { label: 'TXT', bg: 'bg-gray-100', text: 'text-gray-600' }
};

const callStatusStyles = {
  busy: { label: 'Busy', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  noAnswer: { label: 'No Answer', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  unavailable: { label: 'Unavailable', bg: 'bg-red-50', text: 'text-red ', border: 'border-red-200' },
  wrongNumber: { label: 'Wrong Number', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  leftVoiceMessage: { label: 'Left Voice Message', bg: 'bg-blue-50', text: 'text-white ', border: 'border-blue-200' },
  movingForward: { label: 'Moving Forward', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  connected: { label: 'Connected', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  default: { label: 'Scheduled', bg: 'bg-blue-50', text: 'text-white ', border: 'border-blue-200' }
};

const emailStatusStyles = {
  sent: { label: 'Sent', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  scheduled: { label: 'Scheduled', bg: 'bg-blue-50', text: 'text-white ', border: 'border-blue-200' },
  failed: { label: 'Failed', bg: 'bg-red-50', text: 'text-red ', border: 'border-red-200' }
};

const callStatusOptions = [
  { value: 'busy', label: 'Busy' },
  { value: 'noAnswer', label: 'No Answer' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'wrongNumber', label: 'Wrong Number' },
  { value: 'leftVoiceMessage', label: 'Left Voice Message' },
  { value: 'movingForward', label: 'Moving Forward' }
];

const callActionOptions = [
  { value: 'edit', label: 'Edit', icon: Edit3 },
  { value: 'delete', label: 'Delete', icon: Trash2 }
];

const getFileBadgeStyle = (type = 'doc') => fileBadgeStyles[type] || fileBadgeStyles.doc;
const getCallStatusStyle = (status = 'default') => callStatusStyles[status] || callStatusStyles.default;
const getEmailStatusStyle = (status = 'sent') => emailStatusStyles[status] || emailStatusStyles.sent;

const CompanyDetailsPage = ({ company = {}, onBack }) => {
  const companyProfile = {
    id: company?.id ?? 'NVW-88912',
    name: company?.name ?? 'NovaWave LLC',
    rating: company?.rating ?? '5.0',
    address: company?.address ?? '22, Ave Street, Newyork, USA',
    email: company?.email ?? 'novawave@gmail.com',
    phone: company?.phone ?? '+1-12445-47878',
    website: company?.website ?? 'www.novawavellc.com',
    industry: company?.industry ?? 'Aviation Tech',
    createdAt: company?.createdAt ?? '27 Sep 2025, 11:45 PM',
    logo: company?.logo || null
  };

  const companyData = {
    ...companyProfile,
    basicInformation: [
      { label: 'Email', value: companyProfile.email, icon: Mail },
      { label: 'Phone', value: companyProfile.phone, icon: Phone },
      { label: 'Address', value: companyProfile.address, icon: MapPin },
      { label: 'Created', value: companyProfile.createdAt, icon: Globe }
    ],
    otherInformation: [
      { label: 'Language', value: 'English' },
      { label: 'Currency', value: 'United States dollar' },
      { label: 'Last Modified', value: '27 Sep 2023, 11:45 pm' },
      { label: 'Source', value: 'Paid Campaign' }
    ],
    tags: [
      { id: 'tag1', label: 'Collab', classes: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
      { id: 'tag2', label: 'Rated', classes: 'bg-red-50 text-red  border border-red-100' }
    ],
    associatedCompanies: [
      { id: 'assoc1', name: 'Summit Peak', rating: '5.0', initials: 'SP', color: 'bg-blue-500' },
      { id: 'assoc2', name: 'RiverStone Ltd', rating: '4.3', initials: 'RL', color: 'bg-amber-500' }
    ],
    socialProfiles: [
      { id: 'social1', label: 'Website', value: companyProfile.website },
      { id: 'social2', label: 'LinkedIn', value: 'linkedin.com/company/novawave' },
      { id: 'social3', label: 'Twitter', value: '@novawave' }
    ],
    settings: ['Share Contact', 'Add to Favourite', 'Delete Contact'],
    activities: [
      {
        id: 1,
        date: '28 May 2025',
        items: [
          {
            id: 'a1',
            type: 'message',
            title: 'You sent 1 Message to the contact.',
            timestamp: '10:25 pm',
            iconBg: '#e5f0ff',
            iconColor: '#2867ff',
            icon: '📩'
          },
          {
            id: 'a2',
            type: 'call',
            title: 'Denwar responded to your appointment schedule question by call at 09:30pm.',
            timestamp: '09:25 pm',
            iconBg: '#e8f9ef',
            iconColor: '#3bb54a',
            icon: '📞'
          },
          {
            id: 'a3',
            type: 'note',
            title: 'Notes added by Antony',
            description:
              "Please accept my apologies for the inconvenience caused. It would be much appreciated if it's possible to reschedule to 6:00 PM, or any other day that week.",
            timestamp: '10:00 pm',
            iconBg: '#fde8e8',
            iconColor: '#e63535',
            icon: '📝'
          }
        ]
      },
      {
        id: 2,
        date: '27 May 2025',
        items: [
          {
            id: 'a4',
            type: 'meeting',
            title: 'Meeting With Abraham',
            description: 'Scheduled on 05:00 pm',
            timestamp: '05:00 pm',
            iconBg: '#fff4e5',
            iconColor: '#f3a009',
            icon: '👥'
          },
          {
            id: 'a5',
            type: 'call',
            title: 'Drain responded to your appointment schedule question.',
            timestamp: '09:25 pm',
            iconBg: '#e8f9ef',
            iconColor: '#3bb54a',
            icon: '📞'
          }
        ]
      }
    ],
    notes: [
      {
        id: 'n1',
        author: { name: 'Darlee Robertson', initials: 'DR', color: 'bg-cyan-500' },
        createdAt: '18 Sep 2023, 12:10 pm',
        title: 'Notes added by Antony',
        badge: { label: 'Review', bg: 'bg-blue-50', text: 'text-white ' },
        description:
          "A project review evaluates the success of an initiative and identifies areas for improvement. It can also evaluate a current project to determine whether it's on the right track. Or, it can determine the success of a completed project.",
        attachments: [
          { id: 'f1', name: 'Project Specs.xls', size: '365 KB', type: 'xls' },
          { id: 'f2', name: '637.jpg', size: '365 KB', type: 'jpg' }
        ],
        comments: [
          {
            id: 'c1',
            text: 'Notes capture the outcome of every review and provide context for the next milestone.',
            meta: 'Commented by Aeron on 15 Sep 2024, 11:15 pm'
          }
        ]
      },
      {
        id: 'n2',
        author: { name: 'Sharon Roy', initials: 'SR', color: 'bg-orange-500' },
        createdAt: '18 Sep 2023, 09:52 am',
        title: 'Notes added by Antony',
        badge: { label: 'Planning', bg: 'bg-purple-50', text: 'text-purple-600' },
        description:
          'Notes usually contain a list of the most important project elements such as stakeholders, scope, success criteria, deliverables, and timeline. They also include reminders for upcoming milestones and dependencies that we need to track in the next sync.',
        attachments: [{ id: 'f3', name: 'Andewpass.txt', size: '365 KB', type: 'txt' }],
        comments: [
          {
            id: 'c2',
            text:
              'The best way to get a project done faster is to start sooner. A goal without a timeline is just a dream. Each milestone should stay ambitious yet attainable.',
            meta: 'Commented by Aeron on 15 Sep 2024, 11:15 pm'
          }
        ]
      },
      {
        id: 'n3',
        author: { name: 'Vaughan Lewis', initials: 'VL', color: 'bg-amber-500' },
        createdAt: '20 Sep 2023, 10:26 pm',
        title: 'Notes added by Antony',
        badge: { label: 'General', bg: 'bg-green-50', text: 'text-green-600' },
        description:
          "Projects play a crucial role in the success of organizations, and their importance cannot be overstated. Whether it's launching a new product, improving an existing service, or optimizing an internal process, every initiative benefits from clear notes.",
        attachments: [],
        comments: []
      }
    ],
    calls: [
      {
        id: 'call1',
        contact: { name: 'Darlee Robertson', initials: 'DR', color: 'bg-cyan-500' },
        meta: 'logged a call on 23 Jul 2023, 10:00 pm',
        description:
          "A project review evaluates the success of an initiative and identifies areas for improvement. It can also evaluate a current project to determine whether it's on the right track. Or, it can determine the success of a completed project.",
        status: 'busy'
      },
      {
        id: 'call2',
        contact: { name: 'Sharon Roy', initials: 'SR', color: 'bg-orange-500' },
        meta: 'logged a call on 18 Sep 2025, 09:52 am',
        description:
          "A project plan typically contains a list of the essential elements of a project, such as stakeholders, scope, timelines, estimated cost, and communication methods. The project manager typically lists the information based on the assignment.",
        status: 'noAnswer'
      },
      {
        id: 'call3',
        contact: { name: 'Vaughan Lewis', initials: 'VL', color: 'bg-amber-500' },
        meta: 'logged a call on 20 Sep 2025, 10:26 pm',
        description:
          "Projects play a crucial role in the success of organizations, and their importance cannot be overstated. Whether it's launching a new product, improving an existing service, or optimizing an internal process, every initiative benefits from clear documentation.",
        status: 'connected'
      }
    ],
    upcomingActivity: {
      title: 'Product Meeting',
      description:
        'A product team meeting is a gathering of the cross-functional product team – ideally including team members from product, engineering, marketing, and customer support.',
      timestamp: '25 Jul 2023, 05:00 pm',
      iconBg: '#fff4e5',
      iconColor: '#f3a009',
      icon: '📌',
      reminder: '1 hr',
      priority: 'High',
      assignedTo: 'Jerald Sen'
    },
    files: {
      summary: {
        title: 'Manage Documents',
        description: 'Send customizable quotes, proposals and contracts to close deals faster.',
        actionLabel: 'Create Document'
      },
      items: [
        {
          id: 'file1',
          title: 'Collier-Turner Proposal',
          description: 'Send customizable quotes, proposals and contracts to close deals faster.',
          owner: { name: 'Vaughan Lewis', initials: 'VL', color: 'bg-amber-500', role: 'Owner' },
          badges: [
            { id: 'fb1', label: 'Proposal', bg: 'bg-red-50', text: 'text-red ', border: 'border border-red-100' },
            { id: 'fb2', label: 'Draft', bg: 'bg-blue-50', text: 'text-white ', border: 'border border-blue-100' }
          ]
        },
        {
          id: 'file2',
          title: 'Collier-Turner Proposal',
          description: 'Send customizable quotes, proposals and contracts to close deals faster.',
          owner: { name: 'Jessica Louise', initials: 'JL', color: 'bg-pink-500', role: 'Owner' },
          badges: [
            { id: 'fb3', label: 'Quote', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border border-purple-100' },
            { id: 'fb4', label: 'Sent', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border border-emerald-100' }
          ]
        },
        {
          id: 'file3',
          title: 'Collier-Turner Proposal',
          description: 'Send customizable quotes, proposals and contracts to close deals faster.',
          owner: { name: 'Dawn Mercha', initials: 'DM', color: 'bg-blue-500', role: 'Owner' },
          badges: [
            { id: 'fb5', label: 'Proposal', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border border-orange-100' },
            { id: 'fb6', label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border border-gray-200' }
          ]
        }
      ]
    },
    documentForm: {
      tabs: [
        { id: 'basic', label: 'Basic Info', icon: '📄' },
        { id: 'recipient', label: 'Add Recipient', icon: '➕' }
      ],
      deals: ['Collier Group', 'Wisozk Holdings', 'Walter Logistics'],
      documentTypes: ['Contract', 'Proposal', 'Quote'],
      owners: ['Darlee Robertson', 'Jessica Sen', 'Admin'],
      signatureOptions: [
        {
          id: 'noSign',
          value: 'noSign',
          title: 'No Signature',
          description: 'This document does not require a signature before acceptance.'
        },
        {
          id: 'eSign',
          value: 'eSign',
          title: 'Use e-signature',
          description: 'This document require e-signature before acceptance.'
        }
      ],
      recipientFields: [
        { id: 'recipientName', label: 'Recipients Name', placeholder: 'Enter Name' },
        { id: 'recipientEmail', label: 'Recipients Email', placeholder: 'Email Address' }
      ],
      messageTemplate: {
        subjectPlaceholder: 'Enter Subject',
        subjectValue: 'Kickoff proposal approval',
        bodyPlaceholder: 'Your document is ready',
        bodyValue: 'Please review the prepared document and sign before the upcoming milestone review.'
      },
      contentPlaceholder: 'Add Content'
    },
    noteForm: {
      titleLabel: 'Title',
      titlePlaceholder: 'Team sync at Starbucks',
      noteLabel: 'Note',
      notePlaceholder: 'Add note details',
      attachmentLabel: 'Attachment',
      dropInfo: {
        text: 'Drop your files here or',
        action: 'browse'
      },
      helperText: 'Maximum size : 50 MB',
      attachments: [{ id: 'na1', name: 'Project Specs.xls', size: '365 KB', type: 'xls' }],
      buttons: {
        cancel: 'Cancel',
        confirm: 'Confirm'
      }
    },
    callForm: {
      statusOptions: ['Busy', 'No Answer', 'Unavailable', 'Left Voice Message', 'Moving Forward'],
      followUpDate: '2025-01-23',
      notePlaceholder: 'Add note details here',
      followUpLabel: 'Create a follow up task'
    },
    emails: {
      summary: {
        title: 'Manage Emails',
        description: 'You can send and reply to emails directly via this section.',
        helper: 'Email sync keeps this panel aligned with your connected inbox.',
        actionLabel: 'Connect Account'
      },
      threads: [
        {
          id: 'e1',
          sender: { name: 'Darlee Robertson', email: 'darlee@trulysell.com', initials: 'DR', color: 'bg-cyan-500' },
          to: ['Jessica Sen', 'Product Team'],
          cc: ['design@trulysell.com'],
          subject: 'Kickoff call recap & action items',
          snippet:
            "Thanks for taking the time for today's call. Please review the milestones and confirm the owners before tomorrow's sync.",
          timestamp: '26 Sep 2025, 09:35 am',
          status: 'sent',
          badges: [{ id: 'eb1', label: 'Priority', bg: 'bg-red-50', text: 'text-red ' }],
          attachments: [
            { id: 'ea1', name: 'Kickoff-Notes.doc', size: '245 KB', type: 'doc' },
            { id: 'ea2', name: 'Sprint-Plan.xls', size: '512 KB', type: 'xls' }
          ]
        },
        {
          id: 'e2',
          sender: { name: 'Sharon Roy', email: 'sharon@trulysell.com', initials: 'SR', color: 'bg-orange-500' },
          to: ['Marketing Squad'],
          cc: ['research@trulysell.com'],
          subject: 'Updated design explorations for onboarding',
          snippet:
            'Sharing revised explorations that address the comments on typography, padding, and badge alignment for the onboarding journey.',
          timestamp: '25 Sep 2025, 05:10 pm',
          status: 'draft',
          badges: [{ id: 'eb2', label: 'Design', bg: 'bg-purple-50', text: 'text-purple-600' }],
          attachments: [{ id: 'ea3', name: 'Onboarding-Screens.jpg', size: '1.8 MB', type: 'jpg' }]
        },
        {
          id: 'e3',
          sender: { name: 'Vaughan Lewis', email: 'vaughan@partners.co', initials: 'VL', color: 'bg-amber-500' },
          to: ['Jessica Sen'],
          cc: ['legal@partners.co'],
          subject: 'Contract redlines & compliance checklist',
          snippet:
            "Please review the annotated contract and checklist ahead of tomorrow's review call so we can finalize sign-off before deployment.",
          timestamp: '24 Sep 2025, 08:45 pm',
          status: 'scheduled',
          badges: [{ id: 'eb3', label: 'Contract', bg: 'bg-blue-50', text: 'text-white ' }],
          attachments: [
            { id: 'ea4', name: 'Contract-v3.pdf', size: '845 KB', type: 'pdf' },
            { id: 'ea5', name: 'Compliance-Checklist.txt', size: '64 KB', type: 'txt' }
          ]
        }
      ]
    }
  };

  const [activeTab, setActiveTab] = useState('activities');
  const [callEntries, setCallEntries] = useState(companyData.calls);
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
  const [openActionDropdown, setOpenActionDropdown] = useState(null);
  const [isCreateDocumentOpen, setIsCreateDocumentOpen] = useState(false);
  const [documentTab, setDocumentTab] = useState('basic');
  const [selectedSignature, setSelectedSignature] = useState('eSign');
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isCreateCallOpen, setIsCreateCallOpen] = useState(false);
  const [isFollowUpTask, setIsFollowUpTask] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isComposeEmailOpen, setIsComposeEmailOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [companyContacts, setCompanyContacts] = useState([]);
  const [companyDeals, setCompanyDeals] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingDeals, setLoadingDeals] = useState(false);

  useEffect(() => {
    const handleClick = () => {
      setOpenStatusDropdown(null);
      setOpenActionDropdown(null);
      setIsExportMenuOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (companyProfile.id && companyProfile.id !== 'NVW-88912') {
      fetchCompanyContacts();
      fetchCompanyDeals();
    }
  }, [companyProfile.id]);

  const fetchCompanyContacts = async () => {
    setLoadingContacts(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/companies/${companyProfile.id}/contacts`);
      if (response.ok) {
        const data = await response.json();
        setCompanyContacts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching company contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchCompanyDeals = async () => {
    setLoadingDeals(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/companies/${companyProfile.id}/deals`);
      if (response.ok) {
        const data = await response.json();
        setCompanyDeals(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching company deals:', error);
    } finally {
      setLoadingDeals(false);
    }
  };

  useEffect(() => {
    if (isCreateDocumentOpen || isAddNoteOpen || isCreateCallOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCreateDocumentOpen, isAddNoteOpen, isCreateCallOpen]);

  const handleStatusSelect = (callId, status) => {
    setCallEntries((prev) => prev.map((call) => (call.id === callId ? { ...call, status } : call)));
    setOpenStatusDropdown(null);
  };

  const handleActionSelect = () => {
    setOpenActionDropdown(null);
  };

  const toggleStatusDropdown = (event, callId) => {
    event.stopPropagation();
    setOpenStatusDropdown((prev) => (prev === callId ? null : callId));
    setOpenActionDropdown(null);
  };

  const toggleActionDropdown = (event, callId) => {
    event.stopPropagation();
    setOpenActionDropdown((prev) => (prev === callId ? null : callId));
    setOpenStatusDropdown(null);
  };

  const openCreateDocumentModal = () => {
    setDocumentTab('basic');
    setSelectedSignature('eSign');
    setIsCreateDocumentOpen(true);
  };

  const closeCreateDocumentModal = () => {
    setIsCreateDocumentOpen(false);
  };

  const openAddNoteModal = () => {
    setIsAddNoteOpen(true);
  };

  const closeAddNoteModal = () => {
    setIsAddNoteOpen(false);
  };

  const openCreateCallModal = () => {
    setIsCreateCallOpen(true);
  };

  const closeCreateCallModal = () => {
    setIsCreateCallOpen(false);
    setIsFollowUpTask(false);
  };

  return (
    <div className="bg-gray-50 min-h-screenp-3 ">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[22px]  flex items-center gap-2">
          Companies
          <span className="text-xs bg-red-500 text-white p-1  rounded ">125</span>
        </h1>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded  border border-gray-200 text-gray-500 hover:text-gray-700 bg-white flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded  border border-gray-200 text-gray-500 hover:text-gray-700 bg-white flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-xs  text-gray-500 flex items-center gap-2 mb-4">
        <span>Home</span>
        <span>/</span>
        <span className="text-gray-700">Companies</span>
      </div>

      <button
        onClick={() => onBack?.()}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 text-xs "
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeWidth="2" d="M15 18l-6-6 6-6" />
        </svg>
        Back to Companies
      </button>

      <div className="bg-white  border border-gray-200 rounded  p-2 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full text-white flex items-center justify-center text-2xl overflow-hidden flex-shrink-0 shadow-md ${companyProfile.logo && companyProfile.logo.startsWith('data:') ? 'bg-white' : 'bg-gradient-to-br from-indigo-400 to-indigo-600'}`}>
              {companyProfile.logo && companyProfile.logo.startsWith('data:') ? (
                <img
                  src={companyProfile.logo}
                  alt={companyProfile.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : null}
              {!companyProfile.logo || !companyProfile.logo.startsWith('data:') ? (
                '✈️'
              ) : null}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl  text-gray-900">{companyData.name}</h2>
                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs  rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                  ⭐ {companyData.rating}
                </span>
              </div>
              <p className="text-xs  text-gray-600 flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4 text-red-500" />
                {companyData.address}
              </p>
              <p className="text-xs text-gray-500 mt-1">Company Id : <span className=" text-gray-800">{companyData.id}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsFavorited(!isFavorited)}
              className="w-9 h-9 rounded  border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-colors"
            >
              <Star className={`w-4 h-4 ${isFavorited ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </button>
            <button className="p-2  text-xs  rounded  border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
              + Add Deal
            </button>
            <button
              onClick={() => setIsComposeEmailOpen(true)}
              className="p-2  text-xs  rounded  bg-red-500 text-white hover:bg-red-600"
            >
              Send Email
            </button>
            <button className="w-9 h-9 rounded  border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-colors">
              <Send className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded  border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-colors">
              <Copy className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExportMenuOpen(!isExportMenuOpen);
                }}
                className="w-9 h-9 rounded  border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {isExportMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded  shadow-lg z-10">
                  <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Export as PDF
                  </button>
                  <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Export as Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-80 space-y-5">
          <div className="bg-white rounded  border border-gray-200 p-2 ">
            <h3 className="text-xs   text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-3">
              {companyData.basicInformation.map((info) => {
                const Icon = info.icon;
                return (
                  <div key={info.label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded  bg-gray-100 flex items-center justify-center text-gray-600">
                      {Icon ? <Icon className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500  ">{info.label}</p>
                      <p className="text-xs   text-gray-900">{info.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded  border border-gray-200 p-2 ">
            <h3 className="text-xs   text-gray-900 mb-4">Other Information</h3>
            <div className="space-y-3">
              {companyData.otherInformation.map((info) => (
                <div key={info.label} className="flex justify-between">
                  <span className="text-xs text-gray-500  ">{info.label}</span>
                  <span className="text-xs  text-gray-900">{info.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded  border border-gray-200 p-2 ">
            <h3 className="text-xs   text-gray-900 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {companyData.tags.map((tag) => (
                <span key={tag.id} className={`text-xs  px-3 py-1 rounded-full ${tag.classes}`}>
                  {tag.label}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded  border border-gray-200 p-2 ">
            <h3 className="text-xs   text-gray-900 mb-4">Company</h3>
            <div className="space-y-4">
              {companyData.associatedCompanies.map((assoc) => (
                <div key={assoc.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full text-white text-xs  flex items-center justify-center ${assoc.color}`}>
                      {assoc.initials}
                    </div>
                    <div>
                      <p className="text-xs   text-gray-900">{assoc.name}</p>
                      <p className="text-xs text-gray-500">⭐ {assoc.rating}</p>
                    </div>
                  </div>
                  <button className="text-xs  text-red-500">View</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded  border border-gray-200 p-2 ">
            <h3 className="text-xs   text-gray-900 mb-4">Social Profile</h3>
            <div className="space-y-3">
              {companyData.socialProfiles.map((social) => (
                <div key={social.id} className="flex justify-between">
                  <span className="text-xs text-gray-500">{social.label}</span>
                  <span className="text-xs  text-gray-900">{social.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded  border border-gray-200 p-2 ">
            <h3 className="text-xs   text-gray-900 mb-4">Settings</h3>
            <div className="space-y-3">
              {companyData.settings.map((item) => (
                <button key={item} className="w-full text-left text-xs   text-gray-700 hover:text-red-500">
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5">
          <div className="bg-white rounded   border border-gray-200 overflow-hidden">
            <div className="flex gap-8 px-6 border-b border-gray-200 overflow-x-auto">
              {['Contacts', 'Deals', 'Activities', 'Notes', 'Calls', 'Files', 'Email'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`py-3 text-xs    transition-colors whitespace-nowrap ${activeTab === tab.toLowerCase()
                    ? 'text-red-500 border-b-2 border-red-500'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-2">
              {activeTab === 'contacts' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs   text-gray-900">Contacts ({companyContacts.length})</h3>
                    <button className="flex items-center gap-2 border border-gray-300 p-2 rounded text-xs text-gray-700 hover:bg-gray-50   bg-red-500 text-white hover:bg-red-600">
                      + Add Contact
                    </button>
                  </div>

                  {loadingContacts ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Loading contacts...</p>
                    </div>
                  ) : companyContacts.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-gray-300 rounded ">
                      <p className="text-gray-500">No contacts linked to this company yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {companyContacts.map((contact) => (
                        <div key={contact.id} className="border border-gray-200 rounded  p-2 flex justify-between items-start hover:bg-gray-50 transition">
                          <div className="flex gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs   flex-shrink-0">
                              {contact.first_name?.[0]}{contact.last_name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 text-xs   ">{contact.first_name} {contact.last_name}</p>
                              <p className="text-gray-600 text-xs">{contact.email}</p>
                              {contact.phone && <p className="text-gray-600 text-xs">{contact.phone}</p>}
                              {contact.position && <p className="text-gray-500 text-xs">{contact.position}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-2">
                            <button className="text-[#1F2020] hover:text-gray-600 p-1">✎</button>
                            <button className="text-[#1F2020] hover:text-red  p-1">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'deals' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs   text-gray-900">Deals ({companyDeals.length})</h3>
                    <button className="flex items-center gap-2 border border-gray-300 p-2 rounded text-xs text-gray-700 hover:bg-gray-50   bg-red-500 text-white hover:bg-red-600">
                      + Add Deal
                    </button>
                  </div>

                  {loadingDeals ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Loading deals...</p>
                    </div>
                  ) : companyDeals.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-gray-300 rounded ">
                      <p className="text-gray-500">No deals linked to this company yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {companyDeals.map((deal) => (
                        <div key={deal.id} className="border border-gray-200 rounded  p-2 hover:bg-gray-50 transition">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="text-gray-900 text-xs  ">{deal.deal_name}</p>
                              <p className="text-gray-600 text-xs mt-1">Value: {deal.currency} {deal.deal_value}</p>
                            </div>
                            <span className={`text-xs   p-1  rounded-full ${deal.status === 'Won' ? 'bg-green-50 text-green-700' :
                              deal.status === 'Lost' ? 'bg-red-50 text-red-700' :
                                'bg-blue-50 text-blue-700'
                              }`}>
                              {deal.status || 'Pending'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2">
                            {deal.contact_id && <p>Contact: {deal.first_name} {deal.last_name}</p>}
                            {deal.assignee_id && <p>Assignee: {deal.assignee_first_name} {deal.assignee_last_name}</p>}
                            {deal.expected_close_date && <p>Close Date: {new Date(deal.expected_close_date).toLocaleDateString()}</p>}
                            {deal.priority && <p>Priority: {deal.priority}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activities' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs   text-gray-900">Activities</h3>
                    <button className="flex items-center gap-2 border border-gray-300 p-2 rounded text-xs text-gray-700 hover:bg-gray-50  ">
                      Sort By
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </button>
                  </div>

                  {companyData.activities.map((dateGroup) => (
                    <div key={dateGroup.id} className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs  " style={{ backgroundColor: '#e3ebff', color: '#3d5afe' }}>
                        📅 {dateGroup.date}
                      </div>

                      {dateGroup.items.map((activity) => (
                        <div key={activity.id} className="border border-gray-200 rounded  p-2 flex gap-3 hover:bg-gray-50 transition">
                          <div
                            className="w-10 h-10 rounded  flex items-center justify-center text-base flex-shrink-0"
                            style={{
                              backgroundColor: activity.iconBg,
                              color: activity.iconColor
                            }}
                          >
                            {activity.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900 text-xs   ">{activity.title}</p>
                            {activity.description && (
                              <p className="text-gray-600 text-xs mt-1">{activity.description}</p>
                            )}
                            <p className="text-gray-500 text-xs mt-1">{activity.timestamp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs   mt-4" style={{ backgroundColor: '#e3ebff', color: '#3d5afe' }}>
                    📅 Upcoming Activity
                  </div>

                  <div className="border border-gray-200 rounded  p-2">
                    <div className="flex gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded  flex items-center justify-center text-base flex-shrink-0"
                        style={{
                          backgroundColor: companyData.upcomingActivity.iconBg,
                          color: companyData.upcomingActivity.iconColor
                        }}
                      >
                        {companyData.upcomingActivity.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-gray-900 text-xs  ">{companyData.upcomingActivity.title}</h4>
                        <p className="text-gray-600 text-xs mt-1">{companyData.upcomingActivity.description}</p>
                        <p className="text-gray-500 text-xs mt-1">{companyData.upcomingActivity.timestamp}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-gray-200">
                      <div>
                        <label className="block text-xs   text-gray-700 mb-1.5">
                          Reminder <span className="text-red-500">*</span>
                        </label>
                        <select className="w-full border border-gray-300 rounded  h-9 px-2.5 text-xs text-gray-700">
                          <option>{companyData.upcomingActivity.reminder}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs   text-gray-700 mb-1.5">
                          Task Priority <span className="text-red-500">*</span>
                        </label>
                        <select className="w-full border border-gray-300 rounded  h-9 px-2.5 text-xs text-gray-700">
                          <option>{companyData.upcomingActivity.priority}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs   text-gray-700 mb-1.5">
                          Assigned To <span className="text-red-500">*</span>
                        </label>
                        <select className="w-full border border-gray-300 rounded  h-9 px-2.5 text-xs text-gray-700">
                          <option>{companyData.upcomingActivity.assignedTo}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs   text-gray-900">Notes</h3>
                      <span className="p-1  text-xs  text-gray-600 bg-gray-100 rounded ">
                        {companyData.notes.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-2 border border-gray-300 p-2 rounded text-xs text-gray-700 hover:bg-gray-50  ">
                        Sort By
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </button>
                      <button
                        className="flex items-center gap-1.5 rounded  bg-red-500 text-white p-2  text-xs  hover:bg-red-600"
                        onClick={(event) => {
                          event.stopPropagation();
                          openAddNoteModal();
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Add New
                      </button>
                    </div>
                  </div>

                  {companyData.notes.map((note) => (
                    <div key={note.id} className="rounded  border border-gray-200  p-2 bg-white space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-full text-white text-xs   flex items-center justify-center ${note.author.color}`}>
                            {note.author.initials}
                          </div>
                          <div>
                            <p className="text-xs   text-gray-900">{note.author.name}</p>
                            <p className="text-xs text-gray-500">{note.createdAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs  px-2.5 py-1 rounded-full ${note.badge.bg} ${note.badge.text}`}>
                            {note.badge.label}
                          </span>
                          <button className="w-9 h-9 rounded  border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs   text-gray-900">{note.title}</p>
                        <p className="text-xs  text-gray-600 leading-relaxed">{note.description}</p>
                      </div>

                      {note.attachments && note.attachments.length > 0 && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {note.attachments.map((file) => {
                            const style = getFileBadgeStyle(file.type);
                            return (
                              <div key={file.id} className="flex items-center justify-between gap-3 rounded  border border-gray-200 bg-gray-50 px-3 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-11 h-11 rounded  flex items-center justify-center text-xs  ${style.bg} ${style.text}`}>
                                    {style.label}
                                  </div>
                                  <div>
                                    <p className="text-xs   text-gray-900">{file.name}</p>
                                    <p className="text-xs text-gray-500">{file.size}</p>
                                  </div>
                                </div>
                                <button className="w-8 h-8 rounded  border border-gray-200 text-gray-500 hover:text-gray-700 bg-white flex items-center justify-center">
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {note.comments && note.comments.length > 0 && (
                        <div className="space-y-3">
                          {note.comments.map((comment) => (
                            <div key={comment.id} className="rounded  border border-dashed border-gray-200 bg-gray-50 p-3">
                              <p className="text-xs  text-gray-700 leading-relaxed">{comment.text}</p>
                              {comment.meta && <p className="text-xs text-gray-500 mt-2">{comment.meta}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                        <button className="flex items-center gap-2 border border-gray-200 rounded  p-2 text-xs  text-gray-600 bg-white hover:bg-gray-50">
                          <MessageCircle className="w-3.5 h-3.5" />
                          Reply
                        </button>
                        <button className="text-xs  text-red-500 hover:text-red ">Add Comment</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'calls' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xs   text-gray-900">Calls</h3>
                    <button
                      className="flex items-center gap-1.5 rounded  bg-red-500 text-white p-2  text-xs  hover:bg-red-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        openCreateCallModal();
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Add New
                    </button>
                  </div>

                  {callEntries.map((call) => {
                    const statusStyle = getCallStatusStyle(call.status);
                    return (
                      <div key={call.id} className="rounded  border border-gray-200  p-2 bg-white space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-full text-white text-xs   flex items-center justify-center ${call.contact.color}`}>
                              {call.contact.initials}
                            </div>
                            <div>
                              <p className="text-xs   text-gray-900">{call.contact.name}</p>
                              <p className="text-xs text-gray-500">{call.meta}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative" onClick={(event) => event.stopPropagation()}>
                              <button
                                onClick={(event) => toggleStatusDropdown(event, call.id)}
                                className={`flex items-center gap-1.5 p-2 text-xs  rounded  border ${statusStyle.border} ${statusStyle.bg} ${statusStyle.text}`}
                              >
                                {statusStyle.label}
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              {openStatusDropdown === call.id && (
                                <div className="absolute right-0 mt-2 w-48 rounded  border border-gray-200 bg-white shadow-lg py-1 z-20" onClick={(event) => event.stopPropagation()}>
                                  {callStatusOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleStatusSelect(call.id, option.value);
                                      }}
                                      className={`w-full text-left p-2  text-xs   transition ${option.value === call.status ? 'text-red-500 bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="relative" onClick={(event) => event.stopPropagation()}>
                              <button
                                className="w-9 h-9 rounded  border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white"
                                onClick={(event) => toggleActionDropdown(event, call.id)}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {openActionDropdown === call.id && (
                                <div className="absolute right-0 mt-2 w-32 rounded  border border-gray-200 bg-white shadow-lg py-1 z-20" onClick={(event) => event.stopPropagation()}>
                                  {callActionOptions.map((action) => {
                                    const Icon = action.icon;
                                    return (
                                      <button
                                        key={action.value}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleActionSelect(call.id, action.value);
                                        }}
                                        className="w-full flex items-center gap-2 p-2  text-xs   text-gray-700 hover:bg-gray-50"
                                      >
                                        <Icon className="w-3.5 h-3.5" />
                                        {action.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs  text-gray-600 leading-relaxed">{call.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'files' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs   text-gray-900">Files</h3>
                      <span className="p-1  text-xs  text-gray-600 bg-gray-100 rounded ">
                        {companyData.files.items.length}
                      </span>
                    </div>
                    <button
                      className="rounded  bg-red-500 text-white p-2  text-xs  hover:bg-red-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        openCreateDocumentModal();
                      }}
                    >
                      Create Document
                    </button>
                  </div>

                  <div className="rounded  border border-gray-200  p-2 bg-white">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 className="text-xs   text-gray-900">{companyData.files.summary.title}</h4>
                        <p className="text-xs  text-gray-600 mt-1">{companyData.files.summary.description}</p>
                      </div>
                      <button
                        className="inline-flex items-center justify-center rounded  bg-red-500 text-white p-2  text-xs  hover:bg-red-600 md:self-start"
                        onClick={(event) => {
                          event.stopPropagation();
                          openCreateDocumentModal();
                        }}
                      >
                        {companyData.files.summary.actionLabel}
                      </button>
                    </div>
                  </div>

                  {companyData.files.items.map((file) => (
                    <div key={file.id} className="rounded  border border-gray-200  p-2 bg-white">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-xs   text-gray-900">{file.title}</h4>
                            <p className="text-xs  text-gray-600 mt-1">{file.description}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className={`w-11 h-11 rounded-full text-white text-xs   flex items-center justify-center ${file.owner.color}`}>
                              {file.owner.initials}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs   text-gray-900">{file.owner.name}</p>
                              <span className="p-1  text-xs  text-gray-600 bg-gray-100 rounded ">
                                {file.owner.role}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {file.badges.map((badge) => (
                            <span
                              key={badge.id}
                              className={`px-3 py-1 text-xs  rounded  ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {badge.label}
                            </span>
                          ))}
                          <button className="w-9 h-9 rounded  border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'email' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs   text-gray-900">Email</h3>
                      <span className="p-1  text-xs  text-gray-600 bg-gray-100 rounded ">
                        {companyData.emails.threads.length}
                      </span>
                    </div>
                    <button className="flex items-center gap-1.5 rounded  bg-red-500 text-white p-2  text-xs  hover:bg-red-600">
                      <Plus className="w-4 h-4" />
                      Create Email
                    </button>
                  </div>

                  <div className="rounded  border border-gray-200 bg-white  p-2">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 className="text-xs   text-gray-900">{companyData.emails.summary.title}</h4>
                        <p className="text-xs  text-gray-600 mt-1">{companyData.emails.summary.description}</p>
                        <p className="text-xs text-gray-500 mt-2">{companyData.emails.summary.helper}</p>
                      </div>
                      <button className="inline-flex items-center justify-center rounded  bg-green-600 text-white px-5 py-2 text-xs  hover:bg-green-700">
                        {companyData.emails.summary.actionLabel}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {companyData.emails.threads.map((thread) => {
                      const statusStyle = getEmailStatusStyle(thread.status);
                      return (
                        <div key={thread.id} className="rounded  border border-gray-200 bg-white  p-2 space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-full text-white text-xs   flex items-center justify-center ${thread.sender.color}`}>
                                {thread.sender.initials}
                              </div>
                              <div>
                                <p className="text-xs   text-gray-900">{thread.sender.name}</p>
                                <p className="text-xs text-gray-500">{thread.sender.email}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 justify-end">
                              {thread.badges &&
                                thread.badges.map((badge) => (
                                  <span key={badge.id} className={`text-xs  px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                                    {badge.label}
                                  </span>
                                ))}
                              <span className={`px-3 py-1 text-xs  rounded  border ${statusStyle.border} ${statusStyle.bg} ${statusStyle.text}`}>
                                {statusStyle.label}
                              </span>
                              <span className="text-xs text-gray-500">{thread.timestamp}</span>
                              <button className="w-9 h-9 rounded  border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-base  text-gray-900">{thread.subject}</h4>
                            <p className="text-xs  text-gray-600 mt-1 leading-relaxed">{thread.snippet}</p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <div>
                              <p className="text-xs  text-gray-500  tracking-wide">To</p>
                              <p className="text-xs    text-gray-900">{thread.to.join(', ')}</p>
                            </div>
                            <div>
                              <p className="text-xs  text-gray-500  tracking-wide">Cc</p>
                              <p className="text-xs    text-gray-900">{thread.cc && thread.cc.length ? thread.cc.join(', ') : '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs  text-gray-500  tracking-wide">Sent On</p>
                              <p className="text-xs    text-gray-900">{thread.timestamp}</p>
                            </div>
                          </div>

                          {thread.attachments && thread.attachments.length > 0 && (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {thread.attachments.map((file) => {
                                const style = getFileBadgeStyle(file.type);
                                return (
                                  <div key={file.id} className="flex items-center gap-3 rounded  border border-gray-200 bg-gray-50 px-3 py-3">
                                    <div className={`w-11 h-11 rounded  flex items-center justify-center text-xs  ${style.bg} ${style.text}`}>
                                      {style.label}
                                    </div>
                                    <div>
                                      <p className="text-xs   text-gray-900">{file.name}</p>
                                      <p className="text-xs text-gray-500">{file.size}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <button className="flex items-center gap-2 border border-gray-200 rounded  p-2 text-xs  text-gray-600 bg-white hover:bg-gray-50">
                                <MessageCircle className="w-3.5 h-3.5" />
                                Reply
                              </button>
                              <button className="flex items-center gap-2 border border-gray-200 rounded  p-2 text-xs  text-gray-600 bg-white hover:bg-gray-50">
                                Forward
                              </button>
                            </div>
                            <button className="text-xs  text-red-500 hover:text-red ">View Thread</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isCreateDocumentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 sm:px-6">
          <div className="absolute inset-0 bg-black/40" onClick={closeCreateDocumentModal}></div>
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-2  border-b border-gray-200">
              <h3 className="text-md  text-gray-900">Create New File</h3>
              <button
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700"
                onClick={closeCreateDocumentModal}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto">
              <div className="flex flex-wrap gap-3 mb-6">
                {companyData.documentForm.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`flex items-center gap-2 text-xs   p-2  rounded-full border transition-all ${documentTab === tab.id
                      ? 'bg-red-500 text-white border-red-500 shadow-md'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    onClick={() => setDocumentTab(tab.id)}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {documentTab === 'basic' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs  text-gray-700 mb-1">
                      Deal <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500">
                      <option value="">Select</option>
                      {companyData.documentForm.deals.map((deal) => (
                        <option key={deal} value={deal}>
                          {deal}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1">
                        Document Type <span className="text-red-500">*</span>
                      </label>
                      <select className="w-full border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        <option value="">Select</option>
                        {companyData.documentForm.documentTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1">
                        Owner <span className="text-red-500">*</span>
                      </label>
                      <select className="w-full border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        <option value="">Select</option>
                        {companyData.documentForm.owners.map((owner) => (
                          <option key={owner} value={owner}>
                            {owner}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs  text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter Title"
                    />
                  </div>
                  <div className="border border-gray-200 rounded-2xl bg-gray-50 p-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs   text-gray-900">Signature</h4>
                      <span className="text-xs text-red-500 ">Required</span>
                    </div>
                    <div className="space-y-3">
                      {companyData.documentForm.signatureOptions.map((option) => (
                        <label
                          key={option.id}
                          className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${selectedSignature === option.value
                            ? 'bg-white border-red-200 '
                            : 'border-gray-200'
                            }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            name="signature"
                            value={option.value}
                            checked={selectedSignature === option.value}
                            onChange={() => setSelectedSignature(option.value)}
                          />
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center mt-1 ${selectedSignature === option.value ? 'border-red-500' : 'border-gray-300'
                              }`}
                          >
                            {selectedSignature === option.value && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                          </span>
                          <div>
                            <p className="text-xs   text-gray-900">{option.title}</p>
                            <p className="text-xs text-gray-600">{option.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {selectedSignature === 'eSign' && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs  text-gray-700 mb-1">
                            {companyData.documentForm.recipientFields[0].label} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            placeholder={companyData.documentForm.recipientFields[0].placeholder}
                          />
                        </div>
                        <div>
                          <label className="block text-xs  text-gray-700 mb-1">
                            {companyData.documentForm.recipientFields[1].label} <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              className="flex-1 border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              placeholder={companyData.documentForm.recipientFields[1].placeholder}
                            />
                            <button className="w-11 h-11 rounded  border border-gray-200 text-gray-500 hover:text-gray-700 bg-white flex items-center justify-center">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs  text-gray-700 mb-1">
                      Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows="3"
                      className="w-full border border-gray-300 rounded  p-2 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder={companyData.documentForm.contentPlaceholder}
                    ></textarea>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-4">
                    <button
                      className="p-2  text-xs   text-gray-600 border border-gray-300 rounded  hover:bg-gray-50"
                      onClick={closeCreateDocumentModal}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-5 py-2 text-xs   text-white bg-red-500 rounded  hover:bg-red-600"
                      onClick={() => setDocumentTab('recipient')}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {documentTab === 'recipient' && (
                <div className="space-y-5">
                  <div className="border border-gray-200 rounded-2xl bg-gray-50 p-2 space-y-4">
                    <div>
                      <h4 className="text-xs   text-gray-900">Send the document to following signers</h4>
                      <p className="text-xs text-gray-600">In order to send the document to the signers</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs  text-gray-700 mb-1">
                          {companyData.documentForm.recipientFields[0].label} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder={companyData.documentForm.recipientFields[0].placeholder}
                        />
                      </div>
                      <div>
                        <label className="block text-xs  text-gray-700 mb-1">
                          {companyData.documentForm.recipientFields[1].label} <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="flex-1 border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            placeholder={companyData.documentForm.recipientFields[1].placeholder}
                          />
                          <button className="w-11 h-11 rounded  border border-gray-200 text-gray-500 hover:text-gray-700 bg-white flex items-center justify-center">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1">
                        Message Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder={companyData.documentForm.messageTemplate.subjectPlaceholder}
                        defaultValue={companyData.documentForm.messageTemplate.subjectValue}
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1">
                        Message Text <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows="3"
                        className="w-full border border-gray-300 rounded  p-2 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder={companyData.documentForm.messageTemplate.bodyPlaceholder}
                        defaultValue={companyData.documentForm.messageTemplate.bodyValue}
                      ></textarea>
                    </div>
                    <button className="inline-flex items-center justify-center px-5 py-2 text-xs   text-green-600 bg-green-50 border border-green-200 rounded  hover:bg-green-100">
                      Send Now
                    </button>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-2 text-xs text-emerald-700">
                      <p className="flex items-start gap-2">
                        <span className="text-base">✔</span>
                        Document sent successfully to the selected recipients
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-4">
                    <button
                      className="p-2  text-xs   text-gray-600 border border-gray-300 rounded  hover:bg-gray-50"
                      onClick={closeCreateDocumentModal}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-5 py-2 text-xs   text-white bg-red-500 rounded  hover:bg-red-600"
                      onClick={closeCreateDocumentModal}
                    >
                      Save & Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAddNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 sm:px-6">
          <div className="absolute inset-0 bg-black/40" onClick={closeAddNoteModal}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-[28px] shadow-[0_32px_90px_rgba(15,23,42,0.18)] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
              <h3 className="text-md  text-gray-900">Add New Notes</h3>
              <button
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700"
                onClick={closeAddNoteModal}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-7 py-6 overflow-y-auto space-y-6">
              <div>
                <label className="block text-xs  text-gray-700 mb-2">
                  {companyData.noteForm.titleLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={companyData.noteForm.titlePlaceholder}
                  className="w-full border border-gray-200 rounded-2xl h-12 px-4 text-xs  text-gray-800 bg-white  focus:ring-2 focus:ring-red-100 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-2">
                  {companyData.noteForm.noteLabel} <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="4"
                  placeholder={companyData.noteForm.notePlaceholder}
                  className="w-full border border-gray-200 rounded-2xl p-2 text-xs text-gray-800 bg-white  focus:ring-2 focus:ring-red-100 focus:border-red-500"
                ></textarea>
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-2">
                  {companyData.noteForm.attachmentLabel} <span className="text-red-500">*</span>
                </label>
                <div className="rounded-2xl border border-dashed border-gray-200 bg-whitep-3  text-center flex flex-col items-center gap-3 shadow-[0_24px_65px_rgba(15,23,42,0.08)]">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-xs  text-gray-700">
                    {companyData.noteForm.dropInfo.text}{' '}
                    <label htmlFor="company-note-attachment" className="text-red-500  cursor-pointer">
                      {companyData.noteForm.dropInfo.action}
                    </label>
                  </p>
                  <input id="company-note-attachment" type="file" className="sr-only" />
                  <p className="text-xs text-gray-500">{companyData.noteForm.helperText}</p>
                </div>
              </div>
              {companyData.noteForm.attachments && companyData.noteForm.attachments.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {companyData.noteForm.attachments.map((attachment) => {
                    const badge = getFileBadgeStyle(attachment.type);
                    return (
                      <div key={attachment.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-[0_22px_70px_rgba(15,23,42,0.1)]">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs  ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </div>
                          <div>
                            <p className="text-xs   text-gray-900">{attachment.name}</p>
                            <p className="text-xs text-gray-500">{attachment.size}</p>
                          </div>
                        </div>
                        <button className="w-9 h-9 rounded-full border border-gray-200 text-gray-500 hover:text-red-500 flex items-center justify-center">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-7 py-5">
              <button
                className="p-2  text-xs   text-gray-600 border border-gray-300 rounded  hover:bg-gray-50"
                onClick={closeAddNoteModal}
              >
                {companyData.noteForm.buttons.cancel}
              </button>
              <button
                className="px-5 py-2 text-xs   text-white bg-red-500 rounded  hover:bg-red-600"
                onClick={closeAddNoteModal}
              >
                {companyData.noteForm.buttons.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateCallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 sm:px-6">
          <div className="absolute inset-0 bg-black/40" onClick={closeCreateCallModal}></div>
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-2  border-b border-gray-200">
              <h3 className="text-md  text-gray-900">Create Call Log</h3>
              <button
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700"
                onClick={closeCreateCallModal}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs  text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select className="w-full border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500">
                  {companyData.callForm.statusOptions.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">
                  Follow Up Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  defaultValue={companyData.callForm.followUpDate}
                  className="w-full border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">
                  Note <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="4"
                  placeholder={companyData.callForm.notePlaceholder}
                  className="w-full border border-gray-300 rounded  p-2 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                ></textarea>
              </div>
              <label className="flex items-center gap-2 text-xs  text-gray-700  ">
                <input
                  type="checkbox"
                  checked={isFollowUpTask}
                  onChange={(event) => setIsFollowUpTask(event.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                />
                {companyData.callForm.followUpLabel}
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-2 ">
              <button
                className="p-2  text-xs   text-gray-600 border border-gray-300 rounded  hover:bg-gray-50"
                onClick={closeCreateCallModal}
              >
                Cancel
              </button>
              <button className="px-5 py-2 text-xs   text-white bg-red-500 rounded  hover:bg-red-600" onClick={closeCreateCallModal}>
                Create New
              </button>
            </div>
          </div>
        </div>
      )}

      {isComposeEmailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 sm:px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsComposeEmailOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-2  border-b border-gray-200">
              <h3 className="text-md  text-gray-900">Compose Email</h3>
              <button
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700"
                onClick={() => setIsComposeEmailOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs  text-gray-700 mb-1">
                  To <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Recipient email address"
                  defaultValue={companyData.email}
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">
                  CC
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Add CC email addresses"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded  h-11 px-3 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Email subject"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="6"
                  className="w-full border border-gray-300 rounded  p-2 text-xs  text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Compose your email message"
                ></textarea>
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-2">
                  Attachment
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded p-3  text-center">
                  <p className="text-xs  text-gray-600">
                    Drop your files here or <span className="text-red-500 cursor-pointer ">browse</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Maximum size: 25 MB</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-2 ">
              <button
                className="p-2  text-xs   text-gray-600 border border-gray-300 rounded  hover:bg-gray-50"
                onClick={() => setIsComposeEmailOpen(false)}
              >
                Cancel
              </button>
              <button className="px-5 py-2 text-xs   text-white bg-red-500 rounded  hover:bg-red-600">
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDetailsPage;
