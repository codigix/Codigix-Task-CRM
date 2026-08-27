const express = require('express');
const router = express.Router();

module.exports = function (pool) {
  // GET /api/seo-gmb/geo-optimization
  router.get('/geo-optimization', async (req, res) => {
    try {
      const { projectId, startDate, endDate } = req.query;
      
      // In a real application, you would use these query parameters 
      // to filter database queries. We are returning structured mock data here 
      // as a stand-in for the database logic.
      
      const geoOptimizationData = {
        overview: {
          geoScore: { value: 86, change: 12.4, changeLabel: 'vs last 7 days' },
          aiVisibilityScore: { value: 78, change: 9.3, changeLabel: 'vs last 7 days' },
          aiMentions: { value: 1842, change: 18.7, changeLabel: 'vs last 7 days' },
          aiCitations: { value: 642, change: 15.2, changeLabel: 'vs last 7 days' },
          indexedPages: { value: 362, change: 6.4, changeLabel: 'vs last 7 days' },
          structuredDataScore: { value: 91, change: 7.6, changeLabel: 'vs last 7 days' },
        },
        sparklineData: [
          { v: 40 }, { v: 45 }, { v: 42 }, { v: 50 }, { v: 55 }, { v: 60 }
        ],
        trendData: [
          { date: 'May 24', chatgpt: 60, google: 65, gemini: 55, perplexity: 45, claude: 50, copilot: 40, grok: 35 },
          { date: 'May 25', chatgpt: 62, google: 68, gemini: 58, perplexity: 48, claude: 52, copilot: 41, grok: 36 },
          { date: 'May 26', chatgpt: 65, google: 70, gemini: 60, perplexity: 52, claude: 55, copilot: 45, grok: 38 },
          { date: 'May 27', chatgpt: 68, google: 72, gemini: 63, perplexity: 55, claude: 58, copilot: 48, grok: 40 },
          { date: 'May 28', chatgpt: 75, google: 78, gemini: 68, perplexity: 60, claude: 62, copilot: 52, grok: 42 },
          { date: 'May 29', chatgpt: 80, google: 82, gemini: 72, perplexity: 65, claude: 66, copilot: 55, grok: 45 },
          { date: 'May 30', chatgpt: 88, google: 85, gemini: 74, perplexity: 68, claude: 68, copilot: 60, grok: 48 }
        ],
        geoScoreDist: [
          { name: 'Content Quality', value: 92, color: '#3B82F6' },
          { name: 'Entity Optimization', value: 85, color: '#8B5CF6' },
          { name: 'Brand Signals', value: 78, color: '#F59E0B' },
          { name: 'Citations', value: 80, color: '#10B981' },
          { name: 'Technical SEO', value: 90, color: '#EC4899' }
        ],
        aiEngineVisibility: [
          { p: 'ChatGPT', s: 88, c: '+ 15%', color: 'bg-green-500' },
          { p: 'Google AI Overview', s: 85, c: '+ 12%', color: 'bg-blue-500' },
          { p: 'Gemini', s: 74, c: '+ 12%', color: 'bg-indigo-500' },
          { p: 'Perplexity', s: 68, c: '+ 8%', color: 'bg-cyan-500' },
          { p: 'Claude', s: 68, c: '+ 7%', color: 'bg-orange-500' },
          { p: 'Microsoft Copilot', s: 60, c: '+ 4%', color: 'bg-blue-600' },
          { p: 'Grok', s: 48, c: '+ 4%', color: 'bg-gray-800' }
        ],
        aiEngineOverview: [
          { p: 'ChatGPT', v: '88/100', c: '+ 15%', m: 632, ci: 216, tCol: '#10B981' },
          { p: 'Google AI Overview', v: '85/100', c: '+ 12%', m: 512, ci: 174, tCol: '#3B82F6' },
          { p: 'Gemini', v: '74/100', c: '+ 12%', m: 328, ci: 134, tCol: '#6366F1' },
          { p: 'Perplexity', v: '72/100', c: '+ 8%', m: 214, ci: 74, tCol: '#06B6D4' },
          { p: 'Claude', v: '65/100', c: '+ 7%', m: 156, ci: 56, tCol: '#F97316' },
          { p: 'Microsoft Copilot', v: '60/100', c: '+ 4%', m: 132, ci: 34, tCol: '#4F46E5' },
          { p: 'Grok', v: '48/100', c: '+ 4%', m: 68, ci: 20, tCol: '#1F2937' }
        ],
        aiEngineShare: [
          { name: 'ChatGPT', value: 36.9, color: '#10B981' },
          { name: 'Google AI', value: 25.1, color: '#3B82F6' },
          { name: 'Gemini', value: 16.1, color: '#6366F1' },
          { name: 'Perplexity', value: 10.5, color: '#06B6D4' },
          { name: 'Claude', value: 7.6, color: '#F97316' },
          { name: 'Copilot', value: 6.5, color: '#4F46E5' },
          { name: 'Grok', value: 3.3, color: '#1F2937' },
        ],
        aiEngineInsights: [
          { p: 'ChatGPT', h: 'Strong growth in brand mentions', st: '↑ 11% vs last 7 days', q: 'Top Query: best crm software' },
          { p: 'Google AI Overview', h: 'High visibility in AI overviews', st: '↑ 9% vs last 7 days', q: 'Top Query: crm tools for business' },
          { p: 'Gemini', h: 'Improved content coverage', st: '↑ 12% vs last 7 days', q: 'Top Query: crm for small business' },
          { p: 'Perplexity', h: 'Growing citation frequency', st: '↑ 8% vs last 7 days', q: 'Top Query: project management' },
        ],
        topCitations: [
          { s: 'chat.openai.com', m: 234, t: '+ 15.4%' },
          { s: 'perplexity.ai', m: 142, t: '+ 22.1%' },
          { s: 'gemini.google.com', m: 98, t: '+ 16.3%' },
          { s: 'claude.ai', m: 76, t: '+ 19.7%' },
          { s: 'copilot.microsoft.com', m: 48, t: '+ 12.8%' }
        ],
        optimizationOpportunities: [
          { t: 'Add FAQ schema to important pages', p: 'High' },
          { t: 'Improve product and service entity markup', p: 'High' },
          { t: 'Add organization schema markup', p: 'Medium' },
          { t: 'Increase content depth for key topics', p: 'Medium' },
          { t: 'Build more authoritative backlinks', p: 'Low' },
        ],
        recentAudits: [
          { n: 'Comprehensive GEO Audit', d: 'May 30, 2026', s: '86/100', st: 'Excellent' },
          { n: 'Schema & Entity Audit', d: 'May 27, 2026', s: '92/100', st: 'Excellent' },
          { n: 'Content Quality Audit', d: 'May 24, 2026', s: '78/100', st: 'Good' },
        ],
        citationsKpi: {
          total: { value: 642, change: 15.2 },
          highAuthority: { value: 218, change: 18.7 },
          new: { value: 86, change: 12.4 },
          lost: { value: 12, change: -4.3 },
          score: { value: 80, change: 11.6 }
        },
        citationsBySource: [
          { name: 'AI Platforms', value: 42.1, color: '#3B82F6' },
          { name: 'Websites', value: 31.1, color: '#10B981' },
          { name: 'Forums', value: 11.7, color: '#F59E0B' },
          { name: 'News Sites', value: 9.0, color: '#8B5CF6' },
          { name: 'Others', value: 6.1, color: '#9CA3AF' }
        ],
        topCitationSources: [
          { s: 'chat.openai.com', ty: 'AI Platform', c: 124, a: 'High', t: '+ 18%' },
          { s: 'perplexity.ai', ty: 'AI Platform', c: 98, a: 'High', t: '+ 15%' },
          { s: 'medium.com', ty: 'Website', c: 72, a: 'Medium', t: '+ 12%' },
          { s: 'reddit.com', ty: 'Forum', c: 45, a: 'Medium', t: '+ 8%' },
          { s: 'forbes.com', ty: 'News Site', c: 32, a: 'High', t: '+ 5%' },
        ],
        entitySchema: {
          coverage: { value: 91, trend: 7.6, status: 'Excellent', valid: 43, warnings: 4, errors: 2 },
          schemaTypes: [
            { t: 'WebSite', v: 1, w: 0, e: 0, c: '100%' },
            { t: 'Organization', v: 1, w: 0, e: 0, c: '100%' },
            { t: 'BreadcrumbList', v: 12, w: 1, e: 0, c: '92%' },
            { t: 'Article', v: 28, w: 4, e: 1, c: '85%' },
            { t: 'FAQPage', v: 15, w: 1, e: 0, c: '93%' },
            { t: 'Product', v: 10, w: 0, e: 1, c: '90%' },
          ],
          recognition: { total: 256, people: 28, organizations: 56, locations: 42, products: 38, services: 92 },
          topEntities: [
            { e: 'Codigix Infotech', t: 'Organization', m: 128, tr: '+ 18%' },
            { e: 'GEO Optimization', t: 'Service', m: 96, tr: '+ 15%' },
            { e: 'AI Content Generation', t: 'Service', m: 72, tr: '+ 12%' },
            { e: 'CRM Software', t: 'Product', m: 64, tr: '+ 14%' },
            { e: 'Mumbai', t: 'Location', m: 48, tr: '+ 10%' },
          ],
          schemaIssues: [
            { i: '2 pages missing Organization schema', type: 'error' },
            { i: '1 page has invalid FAQ schema', type: 'error' },
            { i: '3 pages missing Article schema', type: 'warning' },
            { i: '5 pages missing Breadcrumb schema', type: 'warning' },
            { i: '1 page has duplicate schema markup', type: 'warning' },
          ]
        },
        recommendationsOverview: {
          high: 8, medium: 12, low: 7, implemented: 15,
          items: [
            { r: 'Add FAQ schema to important pages', p: 'High', i: 'High', e: 'Low', s: 'Not Started', a: 'Fix Now' },
            { r: 'Improve product and service entity markup', p: 'High', i: 'High', e: 'Low', s: 'Not Started', a: 'Fix Now' },
            { r: 'Add organization schema markup', p: 'High', i: 'High', e: 'Low', s: 'In Progress', a: 'Continue' },
            { r: 'Increase content depth for key topics', p: 'Medium', i: 'Medium', e: 'Medium', s: 'In Progress', a: 'Continue' },
            { r: 'Build more authoritative backlinks', p: 'Medium', i: 'Medium', e: 'High', s: 'Not Started', a: 'Start' },
            { r: 'Optimize title and meta descriptions', p: 'Low', i: 'Low', e: 'Low', s: 'Completed', a: 'Done' },
            { r: 'Add internal links to top pages', p: 'Low', i: 'Low', e: 'Low', s: 'Completed', a: 'Done' },
          ]
        },
        auditReport: {
          summary: { score: 86, status: 'Excellent', date: 'May 30, 2026 10:30 AM' },
          details: { pagesCrawled: 362, indexablePages: 341, issuesFound: 24, warnings: 18, passedChecks: 231 },
          scoreBreakdown: [
            { n: 'Content Quality', v: 92 },
            { n: 'Entity Optimization', v: 85 },
            { n: 'Brand Signals', v: 78 },
            { n: 'Citations', v: 80 },
            { n: 'Technical SEO', v: 90 },
          ],
          sections: [
            { s: 'Content Quality', sc: '92/100', i: 3, st: 'Good' },
            { s: 'Entity & Schema', sc: '85/100', i: 8, st: 'Good' },
            { s: 'Citations & Mentions', sc: '80/100', i: 12, st: 'Good' },
            { s: 'Brand Signals', sc: '78/100', i: 7, st: 'Good' },
            { s: 'Technical SEO', sc: '90/100', i: 2, st: 'Excellent' },
          ],
          topIssues: [
            '8 pages missing FAQ schema',
            '3 pages have low content depth',
            '5 pages missing meta descriptions',
            '7 pages have broken internal links',
            '1 page missing canonical tag',
          ]
        }
      };

      res.status(200).json({ success: true, data: geoOptimizationData });
    } catch (error) {
      console.error('Error fetching GEO optimization data:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch GEO optimization data' });
    }
  });

  return router;
};
