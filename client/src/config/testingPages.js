/**
 * Marketing pages (Marketing and SEO & GMB) that exist in the app (App.js routes) but are
 * hidden from the sidebars, grouped for the Testing workspace so each can be opened and checked.
 *
 * `path` may contain `{u}`, replaced with the signed-in person's `designation/username`
 * (the same part every department URL carries). `missing: true` marks a sidebar link that
 * has no page behind it yet - kept here so it gets checked and fixed, not forgotten.
 */

export const TESTING_GROUPS = [
  {
    id: 'seo',
    label: 'SEO & GMB',
    note: 'SEO & GMB pages that are routed but hidden from the sidebar. The new SEO platform is a separate app (seo-platform/).',
    pages: [
      { label: 'SEO Dashboard', path: '/seo-gmb/{u}/dashboard' },
      { label: 'SEO Projects', path: '/seo-gmb/{u}/projects' },
      { label: 'Project Setup', path: '/seo-gmb/{u}/project-setup' },
      { label: 'Website Audit', path: '/seo-gmb/{u}/website-audit' },
      { label: 'Keyword Management', path: '/seo-gmb/{u}/keyword-management' },
      { label: 'On-Page SEO', path: '/seo-gmb/{u}/on-page-seo' },
      { label: 'Content Marketing', path: '/seo-gmb/{u}/content-marketing' },
      { label: 'Off-Page SEO', path: '/seo-gmb/{u}/off-page-seo' },
      { label: 'GMB Profile', path: '/seo-gmb/{u}/gmb-profile' },
      { label: 'Google Posts', path: '/seo-gmb/{u}/google-posts' },
      { label: 'Customer Engagement', path: '/seo-gmb/{u}/customer-engagement' },
      { label: 'Media Management', path: '/seo-gmb/{u}/media-management' },
      { label: 'Local SEO', path: '/seo-gmb/{u}/local-seo' },
      { label: 'Google Integrations', path: '/seo-gmb/{u}/google-integrations' },
      { label: 'Rank Tracking', path: '/seo-gmb/{u}/rank-tracking' },
      { label: 'SEO Reports', path: '/seo-gmb/{u}/reports' },
      { label: 'Automation', path: '/seo-gmb/{u}/automation' },
      { label: 'GEO Optimization', path: '/seo-gmb/{u}/geo-optimization' },
      { label: 'AI Content Generation', path: '/seo-gmb/{u}/ai-content-generation' },
      { label: 'Predictive Analysis', path: '/seo-gmb/{u}/predictive-analysis' },
      { label: 'Location Intelligence', path: '/seo-gmb/{u}/location-intelligence' },
      { label: 'SEO Documents', path: '/seo-gmb/{u}/documents' },
      { label: 'SEO Daily Tasks', path: '/seo-gmb/{u}/tasks' },
      { label: 'SEO Calendar', path: '/seo-gmb/{u}/calendar' }
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    note: 'Pages with routes but no sidebar link (some were commented out of the sidebar).',
    pages: [
      { label: 'Marketing Dashboard', path: '/marketing/{u}/dashboard' },
      { label: 'Marketing Analytics', path: '/marketing/{u}/analytics' },
      { label: 'Marketing Backlog', path: '/marketing/{u}/backlog' },
      { label: 'Marketing Activities', path: '/marketing/{u}/activities' },
      { label: 'Marketing File Manager', path: '/marketing/{u}/file-manager' },
      { label: 'Marketing SEO / GMB view', path: '/marketing/{u}/seo-gmb' },
      { label: 'Ad Campaigns', path: '/marketing/{u}/campaign' },
      { label: 'Blogs Calendar', path: '/marketing/{u}/all-blogs' },
      { label: 'Blog Categories', path: '/blog-categories' },
      { label: 'Blog Comments', path: '/blog-comments' },
      { label: 'Blog Tags', path: '/blog-tags' }
    ]
  },
  {
    id: 'missing',
    label: 'Marketing links with no page',
    note: 'Linked from the PPC / Creative sidebars, but no page is built for them, so they open blank.',
    pages: [
      { label: 'Ad Analytics (PPC)', path: '/marketing/{u}/ad-analytics', missing: true },
      { label: 'Creative Assets', path: '/marketing/{u}/media-management', missing: true },
      { label: 'Content Library', path: '/marketing/{u}/content-library', missing: true }
    ]
  }
];

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

// The `designation/username` part of department URLs, built the way the sidebar builds it.
export const userPathOf = (user) => {
  const username = String(user?.username || user?.first_name || user?.name || 'user').toLowerCase().replace(/\s+/g, '-');
  return `${user?.role ? slug(user.role) : 'employee'}/${username}`;
};

export const resolveTestingPath = (path, user) => path.replace('{u}', userPathOf(user));

export const TESTING_PAGE_COUNT = TESTING_GROUPS.reduce((n, g) => n + g.pages.length, 0);

// Who gets the Testing workspace: admins, and anyone in a Testing department.
export const canUseTesting = (user) => {
  const role = String(user?.role || '');
  const dept = String(user?.department || '').toLowerCase();
  return role === 'Admin' || role === 'Super Admin' || ['admin', 'administration', 'management'].includes(dept) || dept.includes('testing');
};

export const isTestingDept = (user) => String(user?.department || '').toLowerCase().includes('testing');
