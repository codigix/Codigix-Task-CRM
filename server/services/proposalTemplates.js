/**
 * Starting content for a proposal deck. The salesperson edits every part per client; nothing here
 * is fixed. Two kinds: 'it' (ERP / CRM / IoT / software, paid by milestones, with AMC) and
 * 'marketing' (SEO, GMB, AEO, GEO, social media, ads; priced from quantities per month).
 *
 * content = {
 *   sections:   which slides are in the deck
 *   cover:      { title, subtitle, date, preparedFor }
 *   about:      { text, stats: [{ value, label }] }
 *   summary:    { text, points: [], closing }
 *   overview:   { title, intro, items: [] }
 *   options:    [{ key, name, intro, groups: [{ title, items: [] }], lines: [{ name, unit, qty, rate, discountPct }],
 *                  priceMode: 'lines' | 'fixed', price, gstPct, months, startMonth, deadline, billing: 'one-time' | 'monthly' }]
 *   payment:    { milestones: [{ name, pct }], notes: [] }
 *   tech:       { title, blocks: [{ title, items: [] }] }
 *   support:    { title, intro, items: [], footer }
 *   amc:        { headline, includes: [], excludes: [], footer }
 *   notes:      []
 * }
 */

const ABOUT_TEXT = 'Codigix Infotech is a technology-driven company specializing in advanced IT solutions such as AI-based Automation, Custom ERP and CRM Systems, Mobile Applications, and Scalable Website Development. We design and develop intelligent, secure, and high-performance digital platforms tailored to meet unique business requirements. Our solutions are focused on streamlining operations, improving efficiency, and enabling data-driven decision-making. With a strong emphasis on innovation and quality, we help businesses adopt smart technologies that support long-term growth and operational excellence.';
const ABOUT_TEXT_MARKETING = 'We specialize in providing customized digital marketing solutions designed for your industry. Our expertise spans Social Media Marketing (SMM), Search Engine Optimization (SEO), Generative Engine Optimization (GEO), Paid Advertising (PPC), Web Development, Ecommerce Management (Amazon & Flipkart) and Google My Business (GMB) optimization. We help professionals and organizations boost their online visibility, connect meaningfully with their communities, and build a strong digital presence in today\u2019s competitive landscape.';

const DEFAULT_PROPOSAL_SETTINGS = {
  about: { text: ABOUT_TEXT, textMarketing: ABOUT_TEXT_MARKETING, stats: [{ value: '2021', label: 'Company has been established.' }, { value: '15', label: 'Team Members' }, { value: '44', label: 'Delighted customers' }], services: ['AI-based Automation', 'Custom ERP & CRM Systems', 'Mobile Applications', 'Websites & E-commerce', 'SEO, GMB, AEO & GEO', 'Social Media & Paid Ads'],
    clients: ['Moraya Multispeciality Charitable Hospital', 'Aditya Homoeopathic Hospital & Healing Centre', 'Sarvasva Health', 'Ayurlekha', 'Dr. Sheetal\u2019s Glow', 'Smiles for All'] },
  contact: { phones: '91127 06604 / 86687 37168', email: 'info@codigixinfotech.com', website: 'codigixinfotech.com', address: 'Office No 514, Brahma Sky Uzuri, Pimpri, Pune.' },
  contactMarketing: { name: 'Codigix Infotech Pvt Ltd', phones: '70665 56768', email: 'info@codigix.co', website: 'codigix.co', address: '514, Brahma Sky Uzuri, Pimpri, Pune.' }
};

const IT_TECH = { title: 'Technology Specifications:', blocks: [
  { title: 'UI & UX Design:', items: ['React Packages', 'Tailwind', 'CSS3', 'JavaScript', 'Responsive webpages'] },
  { title: 'Frontend / Backend Tech', items: ['React.js', 'Node.js', 'Rest API'] },
  { title: 'Server:', items: ['VPS (Recommended)', 'or', 'Internal Server'] },
  { title: 'Database:', items: ['MySQL-compatible cloud database'] }
] };
const IT_SUPPORT = { title: 'Post-Deployment Support', intro: 'A 2-month complimentary support period will be provided from the date of successful production deployment/go-live. This support will cover:', items: ['Bug fixing', 'Error resolution', 'Minor functional corrections', 'Deployment-related technical support', 'Existing feature stabilization', 'User support and issue resolution'], footer: 'After completion of the 2-month support period, the AMC will be applicable at 30% of the total project cost per year.' };
const IT_AMC = { headline: 'AMC will be charged at 30% of the total project cost per year, applicable after completion of the warranty period.', includes: ['Bug fixing and error resolution', 'Minor functional corrections', 'Performance optimization', 'Security updates and patches', 'Existing module maintenance', 'Database maintenance and optimization', 'Technical support (From Monday to Saturday Time: 9:30AM to 6:30PM)', 'Minor UI and report adjustments', 'Compatibility updates for the existing system'], excludes: ['Server or hosting charges', 'Domain renewal charges', 'SSL certificate renewal charges', 'New module development', 'Major changes to existing modules', 'New features or major customizations', 'Third-party API or integration charges', 'Third-party software or license fees', 'Government API or portal charges', 'Data migration from new external systems', 'On-site support or travel expenses unless specifically agreed'], footer: 'Any work outside the AMC scope will be estimated and charged separately after mutual approval.' };
const IT_NOTES = [
  'During the testing phase, the client is responsible for thoroughly reviewing the system and reporting any bugs. After deployment on the live environment, no changes or modifications to the core logic will be accepted.',
  'Before development begins, the client must review, confirm, and approve all logic and calculations and the PRD document shared by Codigix Infotech. Any changes to calculations after live deployment will be charged additionally.',
  'The above cost does not include charges for the domain name, SSL certificate, server, or hosting and any extra security requirements.',
  'Any additional requirements beyond the defined modules will be treated as change requests and will be charged separately.',
  'The quoted price includes implementation, training, and 2 month support within the defined scope.',
  'After handover, support beyond 2 months will be chargeable on an hourly basis or under an AMC (Annual Maintenance Contract).',
  'AMC charges will be 30% of the total project cost.',
  'An additional 18% GST will be applicable on the mentioned cost.'
];

const MARKETING_SUPPORT = { title: 'Reporting & Support', intro: 'What you can expect from us every month:', items: ['Monthly performance report by the 7th: rankings, traffic, leads, calls and ad results', 'One review call every month', 'A single point of contact on WhatsApp during working hours (Monday to Saturday, 9:30 AM to 6:30 PM)', 'Content calendar shared for approval before posting', 'One revision round for every creative, reel and article'], footer: 'Results build over time. SEO, AEO and GEO usually take 3 to 6 months to show a steady rise; we report progress every month and never guarantee a ranking or a number of leads.' };
const MARKETING_NOTES = [
  'Billing: the monthly fee is invoiced in advance on the 1st of every month. Part payments are welcome; any balance is shown on the next invoice.',
  'Deliverables: the quantities in the chosen plan (keywords, reels, creatives, posts and so on) are the monthly quota. Unused quota does not carry over unless agreed in writing.',
  'Ad spend on Google, Meta and other platforms is paid by the client directly to the platform and is not part of our fee.',
  'The client provides brand assets, offers, photos and access to the website, Google Business Profile and ad accounts, and gives feedback within 3 working days.',
  'Changes to services or quantities take effect from the next billing month. Either side may stop with 30 days written notice; work already done in the month is payable.',
  'An additional 18% GST will be applicable on the mentioned cost.'
];


/** Digital marketing proposal: priced service pages, roles, plan of action, commitments, wrap up. */
const marketingContent = (ctx) => ({
  kind: 'marketing',
  sections: { about: true, agenda: true, services: true, roles: true, plan: true, wrapup: true },
  cover: { title: 'Proposal for SEO, GEO, GMB, SMM & Paid Ads', subtitle: '', date: '', preparedFor: ctx.preparedFor || '' },
  about: { heading: 'Codigix Infotech Pvt Ltd', text: '', clients: null },
  agenda: { title: 'Agenda', text: 'This proposal outlines a strategic approach to strengthening your brand\u2019s digital presence and increasing inquiries.\n\nOur Search Engine Optimization (SEO) and Generative Engine Optimization (GEO) services will improve your website\u2019s visibility across search engines and AI-powered platforms, helping more customers discover your business. We will also optimize your Google My Business (GMB) profile to strengthen your local presence and credibility. In addition, our Paid Advertising (PPC) strategies will drive high-quality, targeted leads, ensuring a steady increase in inquiries.' },
  blocks: [
    {
      type: 'service', title: 'SEO, GEO & GMB Optimization', note: '',
      variants: [{ label: '', price: 22000, priceLabel: 'Per Month', priceMode: 'fixed', note: 'We target initial Google Maps ranking improvements within 6 to 7 weeks, followed by significant organic ranking growth over the next 5-6 months.', rows: [{ description: 'Keywords for Ranking on Google Search', activities: '15 Main & 5 Synonyms Keywords', platform: 'Google & AI Powered ChatBot', qty: 0, rate: 0 }] }],
      groups: [
        { title: 'On-Page SEO', text: '', items: ['Keyword Research', 'Optimization of 5\u201310 pages/month:', '- Meta titles & descriptions', '- Headings (H1\u2013H3)', '- Internal linking', '- Image alt tags', '- Page speed & mobile checks'] },
        { title: 'Technical SEO', text: '', items: ['Monthly crawl audits (Screaming Frog / Ahrefs)', 'Fix broken links & redirects', 'Sitemap & robots.txt maintenance', 'Schema markup (services, FAQs, events)', 'Featured snippet optimisation'] },
        { title: 'Website Management & Optimisation', text: '', items: ['Timely website updates for mandatory information and new service additions'] },
        { title: 'Appointment Booking System (Free)', text: '', items: ['Free Appointment Booking system integration with your GMB Profile to track customer flow.'] },
        { title: 'Google My Business (GMB) Service Deliverables:', text: '', items: ['Set up and optimize GMB profile, Claiming & verification (if needed)', 'Local citation building', 'GMB profile optimization (Name, Category, Description, Services, Hours, etc.)', 'Geo-tagged image uploads (up to 5/month)', 'Weekly post publishing (Offers, Updates, Events, etc.)', 'Review monitoring & response suggestions', 'Q&A optimization', 'Local keyword integration', 'Monthly GMB performance report', 'Implement a review generation and response strategy to enhance credibility.'] },
        { title: 'Generative Engine Optimization (GEO) Service Deliverables:', text: '', items: ['AI Search Visibility Optimization', 'AI-Friendly Website Content Structure', 'Conversational Content Optimization', 'FAQ & Knowledge Base Development', 'Schema Markup & Structured Data Implementation', 'Entity-Based SEO Optimization', 'Brand Authority & Digital Footprint Enhancement', 'AI Citation & Mention Optimization', 'AI-Optimized Service & Product Pages', 'Content Optimization for AI Search Engines', 'GEO Performance Monitoring & Reporting', 'AI Search Trend Analysis', 'Continuous Content & AI Optimization'] }
      ],
      platforms: [], fee: ''
    },
    {
      type: 'service', title: 'Social Media Management (SMM)', note: 'We commit you to get minimum 10k views on Insta Reels & 2k Views on Youtube shoots.',
      variants: [
        { label: '', price: 15000, priceLabel: 'Per Month', priceMode: 'fixed', note: '', rows: [{ description: 'Static Post', activities: '5', platform: 'Instagram, Facebook', qty: 0, rate: 0 }, { description: 'Reels (Editing and Posting)', activities: '6', platform: 'Instagram, Facebook, Youtube', qty: 0, rate: 0 }] },
        { label: '', price: 10000, priceLabel: 'Per Month', priceMode: 'fixed', note: '', rows: [{ description: 'Static Post', activities: '5', platform: 'Instagram, Facebook', qty: 0, rate: 0 }, { description: 'Reels (Editing and Posting)', activities: '4', platform: 'Instagram, Facebook, Youtube', qty: 0, rate: 0 }] }
      ],
      groups: [
        { title: 'Strategy Development:', text: 'Build a targeted social media strategy to boost awareness and engagement by choosing the right platforms and setting clear goals for visibility, inquiries, and trust. Along with Increasing in Followers & Views on Reels.', items: [] },
        { title: 'Account Setup and Optimization:', text: 'Optimize social media profiles with strong visuals, clear brand details, and relevant keywords, while maintaining consistent tone, imagery, and messaging across platforms.', items: [] },
        { title: 'Content Creation:', text: 'Create engaging posts, stories, and reels with compelling captions, smart hashtags, and clear CTAs, supported by a content calendar for consistent posting.', items: [] },
        { title: 'Analytics and Reporting:', text: 'Deliver regular performance reports, analyze key metrics, and refine strategies using data and competitor insights.', items: [] },
        { title: 'Trend Monitoring:', text: 'Stay updated with social media trends and features to create relevant content and run creative campaigns aligned with audience interests.', items: [] },
        { title: 'Brand Reputation Management:', text: 'Monitor brand mentions and sentiment, address negative feedback strategically, and encourage positive reviews to build trust and credibility.', items: [] }
      ],
      platforms: [], fee: ''
    },
    { type: 'paid', title: 'Paid Campaign:', note: 'Above cost is only professional fees paid to the Agency. Your Ads budget will be extra based on your requirement.', variants: [], groups: [], platforms: ['Google (Search & Display)', 'Facebook', 'Instagram', 'Linkedin'], fee: 'Professional Fees: 25% of Total Ads Budget' }
  ],
  roles: {
    agencyTitle: 'Agency (Codigix Infotech)', clientTitle: 'Client',
    agency: ['Agency will provide content to client and based on those content, client has to record the videos and send it to agency.', 'Agency will edit and post the reels on Insta, Facebook & Youtube Shoots.', 'If client wants to shooting then it will be extra.', 'Writing blog content and publishing it is agency responsibility.', 'Managing & Optimizing client Insta, Facebook, Youtube, Linkedin (optional) is Agency responsibility.', 'Providing monthly content calendar before starting next month is agency & making sure that calendar is followed timely from client is Client responsibility.'],
    client: ['Record Videos and send it to agency.', 'Taking Reviews & Video Testimonial from customers.', 'Inform if you need any extra creatives apart from the decided package.', 'For Blog post, client should suggest topics.', 'Agency will conduct review meeting every month between 3rd to 7th date, so client should reserve the dates for meeting.', 'Client should provide GMB access, Website access, Social media account access.', 'Once Keywords for SEO & GMB is finalised then client can\u2019t change it. If he changes the keywords then again those keywords will take committed timeline to rank.']
  },
  plan: {
    title: 'Plan Of Action', commitmentsTitle: 'Commitments',
    rows: [
      { month: 'Month 1', focus: 'Foundation & Optimization', deliverables: 'Optimize Google Business Profile, Add service-wise & location-based keywords, Improve Google Posts & Q&A, Strengthen profile/personal branding, Start regular review & photo updates, Fix basic on-page SEO and local SEO gaps' },
      { month: 'Month 2', focus: 'Authority Building', deliverables: 'Create service-focused SEO content, Publish educational content, Build service & location keyword coverage, Improve internal linking & content structure, Strengthen Instagram/YouTube authority, Maintain consistent Google Posts & reviews' },
      { month: 'Month 3', focus: 'Growth & Lead Focus', deliverables: 'Push high-intent keywords, Build local citations/backlinks, Optimize conversion-focused content, Promote high-performing services/content, Strengthen Google \u2192 Social \u2192 Consultation funnel, Track rankings, calls, enquiries & profile actions' }
    ],
    commitments: ['We commit to achieving a minimum of 10k views per reel (Insta & FB)', 'YouTube Shorts, we will ensure a minimum of 2k views per video', 'Generating high-quality leads through targeted PPC campaigns.', 'Expect to see initial Map Pack shifts in 6 to 7 weeks, and full organic market dominance in 5 to 6 months.']
  },
  wrapup: { title: 'Wrap Up', points: ['18% GST will be extra on the above proposed cost (Optional).', 'Payment will be monthly basis.', 'We need 3 - 4 days to analyse your accounts and website.', 'Additional charges for Video Shooting & Photography.', 'Reviews & Coordination', '- Weekly review meeting', '- Monthly performance & action plan review'] },
  gstPct: 18,
  contact: { name: '', phones: '', email: '', website: '', address: '' },
  chosen: []
});

const newContent = (kind, ctx = {}) => {
  const base = { sections: {}, cover: { date: ctx.date || '', preparedFor: ctx.preparedFor || '' } };
  if (kind === 'marketing') return marketingContent(ctx);
  return {
    ...base,
    sections: { about: true, summary: true, overview: true, options: true, budget: true, tech: true, support: true, amc: true, notes: true },
    cover: { ...base.cover, title: 'Project Proposal', subtitle: 'Custom Software Development' },
    about: { text: '', stats: null },
    summary: { text: 'This proposal outlines the implementation of an integrated system designed to streamline your operations, improve control and visibility, and support decisions with real-time data.\nThe proposed system will cover the following end-to-end processes:', points: ['Admin and user management', 'Core business operations', 'Reports, dashboards and MIS'], closing: 'The objective is to replace fragmented, manual processes with a centralized, automated and scalable system, enabling operational efficiency and accurate cost control.' },
    overview: { title: 'Modules', intro: 'These are the overall project modules that have been reviewed and discussed with the client.', items: [] },
    options: [
      { key: 'A', name: 'Partial Modules (Option A)', intro: '', groups: [{ title: 'Module name', items: ['Feature one', 'Feature two'] }], priceMode: 'fixed', price: 0, gstPct: 18, billing: 'one-time', months: 0, startMonth: '', deadline: '', lines: [] },
      { key: 'B', name: 'Full Module (Option B)', intro: 'Full Module (Option B) includes all core modules and features covered under Partial Module (Option A), plus the items below.', groups: [{ title: 'Additional module', items: ['Feature one'] }], priceMode: 'fixed', price: 0, gstPct: 18, billing: 'one-time', months: 0, startMonth: '', deadline: '', lines: [] }
    ],
    payment: { milestones: [{ name: 'Advance against PO', pct: 50 }, { name: 'Once all modules are completed by Codigix and tested from the client end', pct: 40 }, { name: 'After the system is deployed', pct: 10 }], notes: [] },
    tech: IT_TECH,
    support: IT_SUPPORT,
    amc: IT_AMC,
    notes: IT_NOTES
  };
};

module.exports = { newContent, DEFAULT_PROPOSAL_SETTINGS };
