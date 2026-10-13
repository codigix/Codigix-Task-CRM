/**
 * Proposal content for the sales demo data: the Upase Process Equipments ERP proposal (two priced
 * options, payment milestones, technology, support, AMC) and a digital marketing proposal.
 * Used by scripts/seed-sales-demo.js.
 */

const upaseContent = (base) => ({
  ...base,
  cover: { ...base.cover, title: 'Project Proposal', subtitle: 'Custom ERP Development', date: '2026-09-16', preparedFor: 'Upase Process Equipments' },
  summary: {
    text: 'This proposal outlines the implementation of an integrated Enterprise Resource Planning (ERP) system designed to streamline manufacturing operations, improve inventory control, and enhance decision-making through real-time data visibility.\nThe proposed ERP system will cover end-to-end processes including:',
    points: ['Admin Panel', 'Production Planning & Execution', 'Manufacturing', 'Procurement', 'Inventory & Store Management', 'Sales Order & Dispatch', 'Quality Management', 'Accounts & HRM'],
    closing: 'The objective is to replace fragmented processes with a centralized, automated, and scalable system, enabling operational efficiency and accurate cost control.'
  },
  overview: {
    title: 'ERP Modules', intro: 'These are the overall project modules that have been reviewed and discussed with the client.',
    items: ['Sales & CRM', 'Project Management', 'Design Engineering & BOM', 'Material Planning & Inventory', 'Purchase & Vendor Management', 'Subcontracting / Job Work', 'Production Management', 'Quality Management', 'Accounts & Finance', 'Shipment & Dispatch', 'HRM & Payroll', 'Customer Project Portal', 'Admin & Management Control', 'Reports, Analytics & MIS']
  },
  options: [
    {
      key: 'A', name: 'Partial Modules (Option A)', intro: '', priceMode: 'fixed', price: 595000, gstPct: 18, billing: 'one-time', months: 0, startMonth: '', deadline: '15th January 2027', lines: [],
      groups: [
        { title: 'Sales & CRM Module', items: ['Lead Management, Lead Follow-ups', 'Customer Management', 'Requirement Gathering', 'RFQ Management', 'Estimation, Quotation, Quotation Revision, Quotation Follow-up, Customer Acceptance', 'Customer PO, PO Verification, Sales Order', 'Project Handover, Lost Enquiries, Sales Reports'] },
        { title: 'Project Management', items: ['Project Creation', 'Project Manager Assignment, Project Planning', 'Milestones, Activities, Tasks', 'Dependencies', 'Project Timeline, Resource Planning', 'Customer Communication', 'Issues, Risks', 'Change Requests, Approvals', 'Project Documents, Project Costing, Project Closure'] },
        { title: 'Design Engineering & BOM', items: ['Engineering Requests', 'Client Document Management', 'Document Review, Technical Review', 'Design Planning, Engineering Tasks, Calculations', 'Equipment Design', 'Drawings, Drawing Review', 'Customer Submission, Customer Comments', 'Drawing Revision', 'BOM Creation, BOM Review, BOM Revision & Release', 'Engineering Change Request'] },
        { title: 'Inventory Module', items: ['BOM-based Material Planning', 'Material Allocation, Stock Availability', 'Material Reservation, Project Stock', 'GRN', 'Material Issue & Release', 'Material Return, Stock Transfer, Material Tracking', 'QC Hold, Rejected Stock', 'Stock Ledger, Material Traceability'] },
        { title: 'Purchase & Vendor Management', items: ['Material Request, Purchase Requisition', 'Vendor Management, Vendor RFQ', 'Multiple Vendor Quotations', 'Technical Comparison, Commercial Comparison', 'Vendor Selection', 'Purchase Approval, Purchase Order', 'Vendor Confirmation, Delivery Tracking', 'Purchase Reports, Vendor Performance'] },
        { title: 'Subcontracting / Job Work', items: ['Subcontract Request', 'Operation Planning, Subcontract Vendor', 'Material Allocation, Material Sent to Vendor', 'Outward Challan, Inward Challan', 'Quantity Reconciliation', 'Subcontract QC', 'Rejection, Subcontract Costing'] },
        { title: 'Production Module', items: ['Production Planning', 'Production Orders, Routing', 'Operation Planning', 'Job Cards, Daily Production Plan', 'Machine Allocation', 'Employee/Operator Allocation', 'Material Release', 'Production Progress', 'In-process QC', 'Rework', 'Scrap', 'Production Hold', 'Production Completion'] },
        { title: 'Accounts & Finance', items: ['Customer Invoices', 'Proforma Invoice', 'Customer Receipts', 'Outstanding', 'Supplier Bills', 'Supplier Payments', 'Credit/Debit Notes', 'General Ledger', 'Project Costing', 'Project Profitability'] },
        { title: 'Quality Module', items: ['Incoming Material QC', 'MTC Verification, Inspection Plans', 'In-process QC', 'Welding Inspection, NDT', 'Dimensional Inspection, Final Inspection', 'Pressure Testing, NCR Management', 'Root Cause, Corrective Action', 'Rework/Repair, Re-inspection, Quality Release'] },
        { title: 'Shipment & Dispatch', items: ['Dispatch Request', 'Dispatch Planning', 'Dispatch Readiness', 'Packing', 'Package Management', 'Packing Inspection', 'Dispatch Approval', 'Shipment Tracking', 'Delivery, POD', 'Customer Acceptance'] },
        { title: 'HRM Module', items: ['Employee Master, Employee Documents', 'Departments, Designations, Roles', 'Skills, Certifications', 'Biometric Attendance', 'Shift Management', 'Holidays', 'Leave Types, Leave Requests', 'Leave Approval, Leave Balance', 'Performance'] },
        { title: 'Customer/Client Project Portal', items: ['Project QR Code', 'Secure Authentication', 'Project Overview', 'Project Timeline', 'Overall Progress', 'Production Progress', 'Shipment Status', 'Project Documents', 'Customer Communication', 'Delivery/POD Status', 'Read-only Access', 'Confidential Data Restriction'] },
        { title: 'Reports, Analytics & MIS', items: ['Sales Reports', 'Project Reports', 'Material Reports', 'Purchase Reports', 'Vendor Reports', 'Subcontract Reports', 'Production Reports', 'Machine/OEE Reports', 'Quality Reports', 'NCR Reports', 'Inventory Reports', 'Accounts Reports', 'HR Reports', 'Payroll Reports', 'Shipment Reports', 'Project Profitability', 'Management MIS'] },
        { title: 'Admin & Management', items: ['Executive Dashboard', 'Project Dashboard', 'Sales Dashboard', 'Procurement Dashboard', 'Production Dashboard', 'Quality Dashboard', 'Accounts Dashboard', 'HR Dashboard', 'Shipment Dashboard', 'Approval Center', 'Exception Center', 'Global Search', 'Traceability', 'User Management', 'Role & Permission Management', 'Workflow Configuration', 'Notifications', 'MIS Reports'] }
      ]
    },
    {
      key: 'B', name: 'Full Module (Option B)', intro: 'Full Module (Option B) includes all core modules and features covered under Partial Module (Option A). Additional statutory compliance and third-party/API integrations are included separately in Option B.',
      priceMode: 'fixed', price: 860000, gstPct: 18, billing: 'one-time', months: 0, startMonth: '', deadline: '31st March 2027', lines: [],
      groups: [
        { title: 'Accounts & Finance', items: ['GST Configuration & Automation', 'GSTR-1 Compliance Workflows', 'GSTR-3B Compliance Workflows', 'GSTR-2B Reconciliation', 'E-Invoice Integration', 'E-Way Bill Integration', 'Statutory Compliance Requirements'] },
        { title: 'HRM & Payroll', items: ['PF Compliance & Integration', 'ESI Compliance & Integration', 'Professional Tax Statutory Automation', 'TDS Statutory Payroll Compliance', 'Statutory Returns & Reports', 'Third-party Payroll Integrations', 'Other Applicable Statutory Compliance Requirements', 'Employee skill matrix', 'Welder/fitter/operator qualifications, training', 'EHS/safety training; certificate validity, training', 'Medical/PPE records where applicable', 'Restrict job allocation if mandatory qualification expired'] },
        { title: 'Attendance / HR Integrations', items: ['Biometric Device Integration', 'Biometric API Integration', 'Third-party Device Integration', 'Attendance Synchronization', 'External Attendance System Integration', 'Third-party Service Integration'] },
        { title: 'Accounts / Banking / External Services', items: ['External Accounting Platform Integrations', 'External Tax Platform Integrations', 'Government Portal Integrations', 'Government API Integrations', 'External Service Integrations', 'Provider Access & API Credential Integration', 'Licensed Third-party Integrations'] },
        { title: 'Welding Management', items: ['Weld Joint Register, Weld Map', 'WPS / PQR / WPQ Management, WPS Traceability', 'Welder ID Management', 'Welder Qualification & Validity, Filler Wire Issue', 'Joint-wise Welder Traceability', 'Filler Wire Traceability, Heat Traceability', 'Visual Inspection, NDT Management', 'Repair / Re-Weld / Re-NDT Cycle', 'WPQ Expiry Alerts', 'WPS Expiry Alerts'] }
      ]
    }
  ],
  payment: { milestones: [{ name: 'Advance against PO', pct: 50 }, { name: 'Once all Modules are completed by Codigix and tested from Client end', pct: 40 }, { name: 'After the System deployed', pct: 10 }], notes: [] }
});

/** Dr Karishma Dafle: digital marketing proposal for a fertility clinic (from the sample deck). */
const karishmaContent = (base) => {
  const c = JSON.parse(JSON.stringify(base));
  c.cover.preparedFor = 'Dr Karishma Dafle';
  c.about.text = 'We specialize in providing customized digital marketing solutions designed for Healthcare Sector. Our expertise spans Social Media Marketing (SMM), Search Engine Optimization (SEO), Paid Advertising (PPC), Web Development, Ecommerce Management (Amazon & Flipkart) and Google My Business (GMB) optimization. We help professionals and organizations boost their online visibility, connect meaningfully with their communities, and build a strong digital presence in today\u2019s competitive landscape.';
  c.agenda.text = 'This proposal outlines a strategic approach to strengthening your brand\u2019s digital presence and increasing inquiries.\n\nOur Search Engine Optimization (SEO) and Generative Engine Optimization (GEO) services will improve your website\u2019s visibility across search engines and AI-powered platforms, helping more patients discover your clinic. We will also optimize your Google My Business (GMB) profile to strengthen your local presence and credibility. In addition, our Paid Advertising (PPC) strategies will drive high-quality, targeted leads, ensuring a steady increase in patient inquiries.';
  const seo = c.blocks[0];
  seo.groups[2].items = ['Timely website updates for mandatory information and new course additions'];
  seo.groups[3].items = ['Free Appointment Booking system integration with you GMB Profile to track patient flow.'];
  c.roles.client[1] = 'Taking Reviews & Video Testimonial from Patients.';
  c.plan.rows = [
    { month: 'Month 1', focus: 'Foundation & Optimization', deliverables: 'Optimize Google Business Profile, Add service-wise & location-based keywords, Improve Google, Posts & Q&A, Strengthen doctor profile/personal branding, Start regular review & photo updates, Fix basic on-page SEO and local SEO gaps' },
    { month: 'Month 2', focus: 'Authority Building', deliverables: 'Create IVF/Fertility-focused SEO content, Publish doctor-led educational content, Build service & location keyword coverage, Improve internal linking & content structure, Strengthen Instagram/YouTube authority, Maintain consistent Google Posts & reviews' },
    { month: 'Month 3', focus: 'Growth & Lead Focus', deliverables: 'Push high-intent IVF & fertility keywords, Build local citations/backlinks, Optimize conversion-focused content, Promote high-performing services/content, Strengthen Google \u2192 Social \u2192 Consultation funnel, Track rankings, calls, enquiries & profile actions' }
  ];
  return c;
};

module.exports = { upaseContent, karishmaContent };
