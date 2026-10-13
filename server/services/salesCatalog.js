/**
 * Default service catalogue and default rules (terms) for quotations. Managers can edit all of
 * this in Sales Settings; once saved there, the saved list replaces these defaults.
 *
 * A service has:
 *   billing   'monthly'  (retainer: repeats every month)   |  'one-time'  (project / fixed job)
 *   unit      what is counted: keyword, reel, creative, page, module, device ...
 *   rate      price per unit (per month for monthly services)
 *   slabs     [{ upTo, rate }]  volume price: the first slab whose upTo >= quantity sets the rate
 *             for ALL units (upTo null = no limit). So 10 keywords @1500, 25 @1200 ...
 *   defaultQty  quantity suggested when added
 *   scope     bullet points printed under "Scope of work" when the service is in a quotation
 */

const S = (id, name, category, billing, unit, rate, o = {}) => ({ id, name, category, billing, unit, rate, hsn: '998361', taxPct: 18, defaultQty: 1, slabs: [], scope: [], description: '', active: true, ...o });

const DEFAULT_SERVICES = [
  // ── Digital marketing (monthly) ──────────────────────────────────────────
  S('seo', 'SEO (keyword based)', 'Digital Marketing', 'monthly', 'keyword', 1500, {
    defaultQty: 10, slabs: [{ upTo: 10, rate: 1500 }, { upTo: 25, rate: 1200 }, { upTo: 50, rate: 1000 }, { upTo: null, rate: 850 }],
    description: 'Monthly SEO for the agreed keywords',
    scope: ['Keyword research and mapping to pages', 'On-page optimisation (titles, meta, headings, internal links, schema)', 'Monthly content / blog optimisation', 'Technical SEO audit and fixes', 'Backlink building (quality directories, guest posts, citations)', 'Monthly ranking and traffic report']
  }),
  S('gmb', 'Google Business Profile (GMB) management', 'Digital Marketing', 'monthly', 'location', 6000, {
    description: 'Monthly management of the Google Business Profile',
    scope: ['Profile optimisation (categories, services, attributes, photos)', 'Weekly posts and offers', 'Review monitoring and reply drafts', 'Q&A and messages management', 'Monthly insights report (calls, directions, views)']
  }),
  S('aeo', 'AEO: Answer Engine Optimisation', 'Digital Marketing', 'monthly', 'topic', 2500, {
    defaultQty: 8, slabs: [{ upTo: 10, rate: 2500 }, { upTo: 25, rate: 2000 }, { upTo: null, rate: 1700 }],
    description: 'Content and structure so answer engines and voice assistants quote the brand',
    scope: ['Question and intent research for each topic', 'FAQ and "answer-first" content writing', 'FAQ, HowTo and Speakable schema markup', 'Featured-snippet and People-Also-Ask targeting', 'Monthly answer-visibility report']
  }),
  S('geo', 'GEO: Generative Engine Optimisation', 'Digital Marketing', 'monthly', 'page', 3000, {
    defaultQty: 5, slabs: [{ upTo: 5, rate: 3000 }, { upTo: 15, rate: 2500 }, { upTo: null, rate: 2100 }],
    description: 'Make the brand cited by AI assistants (ChatGPT, Gemini, Perplexity, Copilot)',
    scope: ['AI-citation audit: what AI assistants say about the brand today', 'Entity and brand-mention building across trusted sources', 'Structured, citable page content (facts, statistics, comparisons)', 'llms.txt and crawler access review', 'Monthly AI-visibility report']
  }),
  S('smm', 'Social media management (platforms)', 'Digital Marketing', 'monthly', 'platform', 5000, {
    defaultQty: 2, description: 'Strategy, scheduling, community management and reporting',
    scope: ['Monthly content calendar approved by the client', 'Scheduling and posting on the chosen platforms', 'Comment and message monitoring (working hours)', 'Hashtag and trend research', 'Monthly performance report']
  }),
  S('posts', 'Social media posts (static)', 'Digital Marketing', 'monthly', 'post', 600, { defaultQty: 12, hsn: '998391', slabs: [{ upTo: 8, rate: 700 }, { upTo: 16, rate: 600 }, { upTo: null, rate: 500 }], description: 'Designed static posts with caption', scope: ['Design and caption for each post', 'One revision round per post'] }),
  S('reels', 'Reels / short videos', 'Digital Marketing', 'monthly', 'reel', 1800, { defaultQty: 4, hsn: '998391', slabs: [{ upTo: 4, rate: 1800 }, { upTo: 8, rate: 1500 }, { upTo: null, rate: 1300 }], description: 'Shot or stock-based reels with editing, captions and music', scope: ['Script / concept for each reel', 'Editing with captions, transitions and music', 'One revision round per reel'] }),
  S('creatives', 'Graphic creatives', 'Digital Marketing', 'monthly', 'creative', 600, { defaultQty: 10, hsn: '998391', slabs: [{ upTo: 10, rate: 600 }, { upTo: 20, rate: 500 }, { upTo: null, rate: 400 }], description: 'Posters, ad creatives, banners and carousels', scope: ['Design in brand colours and fonts', 'Source files on request', 'One revision round per creative'] }),
  S('meta', 'Meta Ads management (Facebook & Instagram)', 'Digital Marketing', 'monthly', 'campaign', 6000, {
    defaultQty: 1, description: 'Campaign setup, optimisation and reporting. Ad spend is paid by the client directly to Meta.',
    scope: ['Audience research and campaign structure', 'Ad creative testing (copy and visuals)', 'Daily monitoring and weekly optimisation', 'Pixel / Conversions API setup check', 'Weekly summary and monthly report', 'Ad spend is paid by the client directly to Meta and is not part of this fee']
  }),
  S('gads', 'Google Ads management', 'Digital Marketing', 'monthly', 'campaign', 8000, {
    defaultQty: 1, description: 'Search, Display, YouTube or Performance Max. Ad spend is paid directly to Google.',
    scope: ['Keyword and audience research', 'Campaign, ad group and ad copy setup', 'Conversion tracking setup (GA4 / Google Ads)', 'Bid, budget and negative-keyword optimisation', 'Weekly summary and monthly report', 'Ad spend is paid by the client directly to Google and is not part of this fee']
  }),
  S('blogs', 'Blog / article writing', 'Digital Marketing', 'monthly', 'article', 1500, { defaultQty: 4, slabs: [{ upTo: 4, rate: 1500 }, { upTo: 8, rate: 1300 }, { upTo: null, rate: 1100 }], description: 'SEO-friendly articles of about 800-1000 words', scope: ['Topic and keyword brief', 'Plagiarism-checked article, 800-1000 words', 'One revision round'] }),
  S('video', 'Video editing (long form)', 'Digital Marketing', 'monthly', 'video', 3500, { defaultQty: 1, hsn: '998391', description: 'Long-form edit with titles, captions and thumbnails', scope: ['Edit up to 10 minutes of footage', 'Titles, captions and background music', 'Thumbnail design', 'One revision round'] }),

  // ── Websites & hosting ───────────────────────────────────────────────────
  S('website', 'Website development', 'Web & Hosting', 'one-time', '', 45000, { hsn: '998314', description: 'Responsive business website', scope: ['Up to 8 pages: Home, About, Services, Contact and more', 'Responsive design for mobile and desktop', 'Contact form with email notification', 'Basic on-page SEO and speed optimisation', 'Google Analytics and Search Console setup', '1 month free support after go-live'] }),
  S('ecom', 'E-commerce website', 'Web & Hosting', 'one-time', '', 90000, { hsn: '998314', description: 'Online store with catalogue, cart and payments', scope: ['Product catalogue with categories and filters', 'Cart, checkout and payment gateway integration', 'Order management and email notifications', 'Shipping and tax (GST) settings', 'Admin dashboard to manage products and orders', '1 month free support after go-live'] }),
  S('landing', 'Landing page', 'Web & Hosting', 'one-time', 'page', 12000, { hsn: '998314', description: 'Single conversion-focused page for campaigns', scope: ['Design and build of one landing page', 'Lead form with CRM / email delivery', 'Speed and mobile optimisation'] }),
  S('hosting', 'Domain & hosting (1 year)', 'Web & Hosting', 'one-time', 'year', 6000, { hsn: '998315', description: 'Domain registration, hosting and SSL', scope: ['Domain registration or renewal', 'Hosting with SSL certificate', 'Daily backups'] }),
  S('maintenance', 'Website maintenance (AMC)', 'Web & Hosting', 'monthly', 'month', 3000, { hsn: '998316', description: 'Updates, backups, security and small changes', scope: ['Core, plugin and security updates', 'Weekly backups and uptime monitoring', 'Up to 2 hours of small changes per month'] }),

  // ── IT & software (projects) ─────────────────────────────────────────────
  S('erp', 'ERP development (custom)', 'IT & Software', 'one-time', 'module', 60000, {
    hsn: '998314', defaultQty: 5, description: 'Custom ERP built around the client\'s process, delivered module by module',
    scope: ['Requirement study, process mapping and sign-off', 'Role-based access and user management', 'Masters: customers, vendors, items, price lists, tax / GST', 'Sales and billing: quotations, orders, invoices, receipts', 'Purchase and inventory: purchase orders, GRN, stock, batches', 'Accounts: ledgers, payments, GST reports, outstanding', 'HR and payroll: attendance, leave, salary slips', 'Production / job work (if applicable)', 'Dashboards, MIS and export to Excel / PDF', 'Data migration from existing sheets or software', 'User training and go-live support']
  }),
  S('crm', 'CRM development (custom)', 'IT & Software', 'one-time', 'module', 40000, {
    hsn: '998314', defaultQty: 4, description: 'Custom CRM for leads, deals, follow-ups and billing',
    scope: ['Lead capture from website, forms, WhatsApp and calls', 'Pipeline with stages, follow-ups and reminders', 'Quotations, invoices and payment tracking', 'Customer records with full history', 'Tasks, team roles and approvals', 'Reports and dashboards', 'Email / WhatsApp / SMS integration', 'User training and go-live support']
  }),
  S('iot', 'IoT integration', 'IT & Software', 'one-time', 'device type', 50000, {
    hsn: '998314', defaultQty: 2, description: 'Connect devices and sensors to a live dashboard with alerts',
    scope: ['Device and sensor selection and connectivity design', 'Firmware / gateway integration (MQTT, HTTP, Modbus as applicable)', 'Secure cloud ingestion and data storage', 'Live dashboard, history and trend charts', 'Threshold alerts by SMS, email or WhatsApp', 'Remote control commands (if required)', 'Device onboarding and installation guidance', 'Hardware is supplied separately unless listed in the quotation']
  }),
  S('mobile', 'Mobile app development', 'IT & Software', 'one-time', 'app', 200000, { hsn: '998314', description: 'Android and iOS app', scope: ['UI / UX design of all screens', 'Android and iOS build (cross-platform)', 'Backend APIs and admin panel', 'Push notifications', 'Play Store and App Store publishing support', '3 months free bug-fix support'] }),
  S('webapp', 'Web application development', 'IT & Software', 'one-time', 'module', 35000, { hsn: '998314', defaultQty: 3, description: 'Custom web application', scope: ['Requirement study and wireframes', 'Frontend and backend development', 'Role-based login and admin panel', 'Reports and exports', 'Deployment and handover'] }),
  S('integration', 'API / third-party integration', 'IT & Software', 'one-time', 'integration', 15000, { hsn: '998314', defaultQty: 2, description: 'Payment gateway, WhatsApp, SMS, Tally, Zoho and similar', scope: ['Integration design and credentials set-up', 'Two-way data sync as agreed', 'Error handling and logs', 'Testing in sandbox and live'] }),
  S('automation', 'AI / workflow automation', 'IT & Software', 'one-time', 'workflow', 25000, { hsn: '998314', defaultQty: 2, description: 'Chatbots, document processing and workflow automation', scope: ['Workflow mapping and automation design', 'Build and connect with existing tools', 'Testing with real data', 'Documentation and handover'] }),
  S('migration', 'Data migration', 'IT & Software', 'one-time', 'source', 10000, { hsn: '998314', description: 'Move data from sheets or old software', scope: ['Data cleaning and mapping', 'Import with validation', 'Reconciliation report'] }),
  S('design', 'UI / UX design', 'IT & Software', 'one-time', 'screen', 2500, { hsn: '998391', defaultQty: 10, description: 'Wireframes and visual design', scope: ['Wireframes', 'Visual design in brand style', 'Clickable prototype'] }),
  S('devops', 'Cloud setup & deployment', 'IT & Software', 'one-time', '', 20000, { hsn: '998315', description: 'Server setup, CI/CD, monitoring and backups', scope: ['Cloud server set-up and hardening', 'CI/CD pipeline', 'Monitoring and alerts', 'Daily backups and restore test'] }),
  S('support', 'Software support & AMC', 'IT & Software', 'monthly', 'month', 15000, { hsn: '998316', description: 'Bug fixes, small changes, monitoring and updates', scope: ['Bug fixing with a response time of 1 working day', 'Up to 10 hours of changes per month', 'Server monitoring, backups and security updates', 'Monthly summary of work done'] })
];

const TERMS_GENERAL = '1. Prices are valid for the period shown above.\n2. GST is charged as applicable.\n3. 50% advance with the order, balance on delivery.\n4. Monthly services are billed in advance.';

const TERMS_RETAINER = [
  '1. Billing: the monthly fee is invoiced in advance on the 1st of each month and is due within the payment days shown on the invoice. Part payments are welcome; any balance is shown on the next invoice.',
  '2. Deliverables: the quantities in this quotation (keywords, reels, creatives, posts and so on) are the monthly quota. Unused quota does not carry over unless agreed in writing. Extra work is quoted and billed separately.',
  '3. Ad spend: Google, Meta and other platform spend is paid by the client directly to the platform and is not part of our fee.',
  '4. Results: SEO, AEO and GEO results build over time (usually 3 to 6 months). We do not guarantee a ranking, a position or a number of leads. We report progress every month.',
  '5. Client inputs: logo, brand guidelines, photos, offers, access to website, Google Business Profile and ad accounts, and feedback within 3 working days. Delays move delivery dates and are not a reason to reduce the fee.',
  '6. Approvals: creatives and content are shared for approval. One revision round is included for each item.',
  '7. Changes: adding or removing services or quantities takes effect from the next billing month. Any change in price is confirmed by an updated quotation.',
  '8. Term and notice: this is a month-to-month service for the duration shown, renewable by agreement. Either side may stop with 30 days written notice; work already done in the month is payable.',
  '9. Accounts and content: client accounts stay in the client\'s name. Creatives are the client\'s property once paid for.',
  '10. Confidentiality: both sides keep each other\'s business information confidential.'
].join('\n');

const TERMS_PROJECT = [
  '1. Payment: as per the milestone schedule in this quotation. Work on the next milestone begins after the previous milestone is paid.',
  '2. Scope: the work is limited to the scope of work in this quotation. Anything outside it is a change request.',
  '3. Change requests: changes to scope, features or design after sign-off are estimated in writing and need client approval before work starts. They may change the price and the timeline.',
  '4. Client responsibilities: timely inputs, access, content, decisions and feedback (within 3 working days). Delays by the client extend the timeline accordingly.',
  '5. Testing and acceptance: we deliver for User Acceptance Testing (UAT). The client reports issues within 7 days. Issues within scope are fixed free of charge. Deemed accepted if no response in 7 days or when the system is used in production.',
  '6. Warranty: 90 days from go-live for bugs in the delivered scope. Warranty does not cover changes by others, misuse, or third-party service failures.',
  '7. Support and AMC: after the warranty period, support is available under a separate AMC or on a time-and-materials basis.',
  '8. Third-party costs: hosting, domains, SMS / WhatsApp credits, payment-gateway charges, API subscriptions, licences and hardware (including IoT devices and sensors) are not included unless listed.',
  '9. Ownership: the client owns the custom source code and data after full payment. Our reusable components, frameworks and tools remain ours, and are licensed to the client for use in this system.',
  '10. Confidentiality and data: both sides keep each other\'s information confidential. The client is responsible for the legality of the data it provides.',
  '11. Liability: our total liability is limited to the fees paid for the affected milestone. We are not liable for indirect or consequential loss.',
  '12. Termination: either side may terminate with 15 days written notice. The client pays for work completed up to the date of termination.'
].join('\n');

/** Section templates that start a new quotation of each type (the salesperson edits them). */
const PLAN_SECTIONS = {
  retainer: [
    { title: 'Reporting & communication', items: ['Monthly performance report shared by the 7th', 'One review call every month', 'A single point of contact on WhatsApp / email during working hours'] },
    { title: 'What we need from you', items: ['Brand assets: logo, colours, fonts, photos and offers', 'Access to website, Google Business Profile and ad accounts', 'Feedback and approvals within 3 working days'] },
    { title: 'Not included', items: ['Ad spend paid to Google, Meta or other platforms', 'Paid tools or stock subscriptions unless listed', 'Photo or video shoots unless listed'] }
  ],
  project: [
    { title: 'Deliverables', items: ['Fully working system as per the scope of work', 'Source code and database handed over after final payment', 'User manual and training session'] },
    { title: 'Assumptions', items: ['Requirements are frozen after sign-off of the scope', 'Client provides data and access on time', 'One point of contact from the client side for decisions'] },
    { title: 'Exclusions', items: ['Hosting, domain, SMS / WhatsApp credits and third-party licences', 'IoT devices, sensors and other hardware', 'Features not listed in the scope of work'] },
    { title: 'Support & warranty', items: ['90 days free bug-fix warranty after go-live', 'Support after warranty under AMC'] }
  ]
};

const DEFAULT_MILESTONES = [
  { name: 'Advance with the order', pct: 30 },
  { name: 'On delivery for testing (UAT)', pct: 40 },
  { name: 'On go-live', pct: 30 }
];

module.exports = { DEFAULT_SERVICES, TERMS_GENERAL, TERMS_RETAINER, TERMS_PROJECT, PLAN_SECTIONS, DEFAULT_MILESTONES };
