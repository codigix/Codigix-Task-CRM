import React, { useState, useMemo } from 'react';
import { Search, Download, ChevronDown } from 'lucide-react';

const cardAnimationStyles = `
  @keyframes cardHover {
    0% {
      transform: translateY(0);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    100% {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes imageZoom {
    0% {
      transform: scale(1);
    }
    100% {
      transform: scale(1.05);
    }
  }

  .blog-card {
    animation: fadeIn 0.5s ease-out;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .blog-card:hover {
    animation: cardHover 0.3s ease-out forwards;
  }

  .blog-card:hover .blog-image {
    animation: imageZoom 0.3s ease-out forwards;
  }

  .blog-image {
    transition: transform 0.3s ease-out;
    overflow: hidden;
  }

  .tag-badge {
    animation: fadeIn 0.4s ease-out 0.1s backwards;
  }

  .edit-button {
    transition: all 0.2s ease-out;
  }

  .edit-button:hover {
    background-color: #f3f4f6;
    border-color: #d1d5db;
  }

  .status-badge {
    animation: fadeIn 0.4s ease-out 0.15s backwards;
  }

  .blog-title {
    transition: color 0.2s ease-out;
  }

  .blog-card:hover .blog-title {
    color: #3b82f6;
  }

  .btn-add:active {
    transform: scale(0.98);
  }

  .search-input {
    transition: all 0.3s ease;
  }

  .search-input:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .pagination-btn {
    transition: all 0.2s ease;
  }

  .pagination-btn:not(:disabled):hover {
    transform: translateY(-1px);
  }

  .pagination-btn:active:not(:disabled) {
    transform: translateY(0px);
  }

  .dropdown-menu {
    animation: fadeIn 0.2s ease-out;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease-out, visibility 0.2s ease-out;
  }

  .export-btn:hover + .dropdown-menu,
  .dropdown-menu:hover {
    opacity: 1;
    visibility: visible;
  }

  .export-btn {
    transition: all 0.2s ease;
  }

  .export-btn:hover {
    background-color: #f9fafb;
    border-color: #d1d5db;
  }

  .dropdown-menu button {
    transition: background-color 0.2s ease;
  }

  .dropdown-menu button:hover {
    background-color: #f3f4f6;
  }
`;

const blogsData = [
  {
    id: 1,
    tag: 'Sales Optimization',
    title: 'Improve Efficiency for Sales',
    excerpt: 'Discover how to optimize tools to boost your sales team\'s productivity and track important metrics.',
    comments: 40,
    date: '27 May 2025',
    image: 'https://picsum.photos/seed/blog1/800/480',
    status: 'Active',
  },
  {
    id: 2,
    tag: 'Automation',
    title: 'Automation Benefits for Growth',
    excerpt: 'Learn how automation features can streamline workflows and accelerate your business\'s growth.',
    comments: 123,
    date: '15 May 2025',
    image: 'https://picsum.photos/seed/blog2/800/480',
    status: 'Inactive',
  },
  {
    id: 3,
    tag: 'Marketing',
    title: 'Marketing Integration Guide',
    excerpt: 'Explore seamless integration strategies between customer management and marketing tools to increase conversions.',
    comments: 54,
    date: '04 May 2025',
    image: 'https://picsum.photos/seed/blog3/800/480',
    status: 'Active',
  },
  {
    id: 4,
    tag: 'Implementation',
    title: 'Avoid Setup Mistakes',
    excerpt: 'Identify common pitfalls in implementation and learn proactive steps to avoid costly mistakes during rollout.',
    comments: 152,
    date: '29 Apr 2025',
    image: 'https://picsum.photos/seed/blog4/800/480',
    status: 'Inactive',
  },
  {
    id: 5,
    tag: 'Product Features',
    title: 'Top Features for 2025',
    excerpt: 'Uncover must-have features for 2025 that improve customer relationships and operational efficiency.',
    comments: 58,
    date: '17 Apr 2025',
    image: 'https://picsum.photos/seed/blog5/800/480',
    status: 'Active',
  },
  {
    id: 6,
    tag: 'Data & Analytics',
    title: 'Data Insights for Success',
    excerpt: 'Leverage data insights to enhance customer engagement, identify opportunities, and make data-driven decisions.',
    comments: 78,
    date: '03 Apr 2025',
    image: 'https://picsum.photos/seed/blog6/800/480',
    status: 'Inactive',
  },
  {
    id: 7,
    tag: 'Customization',
    title: 'Customizing Effectively',
    excerpt: 'Tailor your system to fit your business processes, improving usability, adoption, and productivity.',
    comments: 56,
    date: '26 Mar 2025',
    image: 'https://picsum.photos/seed/blog7/800/480',
    status: 'Active',
  },
  {
    id: 8,
    tag: 'Future Trends',
    title: 'Future Trends & Innovations',
    excerpt: 'Explore emerging trends and innovations that are shaping the future of customer relationship management.',
    comments: 97,
    date: '13 Mar 2025',
    image: 'https://picsum.photos/seed/blog8/800/480',
    status: 'Inactive',
  },
  {
    id: 9,
    tag: 'Training & Adoption',
    title: 'User Training Tips',
    excerpt: 'Ensure your team\'s success with essential training strategies and onboarding tips to boost adoption.',
    comments: 34,
    date: '06 Mar 2025',
    image: 'https://picsum.photos/seed/blog9/800/480',
    status: 'Active',
  },
];

const AllBlogsPage = () => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 9;

  const filtered = useMemo(() => {
    if (!query.trim()) return blogsData;
    const q = query.toLowerCase();
    return blogsData.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.tag.toLowerCase().includes(q) ||
        b.excerpt.toLowerCase().includes(q)
    );
  }, [query]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      <style>{cardAnimationStyles}</style>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-start justify-between gap-2 mb-6">
          <div>
            <h1 className="text-2xl  text-slate-800">
              All Blogs{' '}
              <span className="ml-2 inline-block bg-red-50 text-red  text-xs  p-1  rounded">
                {blogsData.length}
              </span>
            </h1>
            <div className="text-xs  text-gray-500 mt-1">Home › Blogs › All Blogs</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <button className="export-btn bg-white border border-gray-200 text-gray-700 text-xs  p-2 rounded  hover:bg-gray-50 flex items-center gap-2 transition-colors">
                <Download size={16} />
                Export
                <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
              </button>
              <div className="dropdown-menu absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded  shadow-lg group-hover:block z-10">
                <button className="w-full text-left p-2  text-xs  text-gray-700 transition-colors">
                  Export as PDF
                </button>
                <button className="w-full text-left p-2  text-xs  text-gray-700 border-t border-gray-200 transition-colors">
                  Export as Excel
                </button>
              </div>
            </div>
            <button className="btn-add bg-red-600 hover:bg-red-700 text-white text-xs  p-2  rounded   transition-colors active:bg-red-800">
              Add Blog
            </button>
          </div>
        </div>

        <div className="bg-white rounded  border border-gray-100 p-2 mb-6">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-3 text-[#1F2020] pointer-events-none" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="search-input w-full pl-10 pr-3 h-10 rounded  border border-gray-200 text-xs  focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pageData.map((post, index) => (
            <article
              key={post.id}
              className="blog-card bg-white border border-gray-100 rounded  overflow-hidden flex flex-col"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="relative blog-image h-44 bg-gray-200">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="tag-badge absolute top-3 left-3 bg-sky-600 text-white text-xs px-2.5 py-1 rounded   ">
                  {post.tag}
                </div>
              </div>

              <div className="p-2 flex-1 flex flex-col">
                <div className="flex items-center text-xs text-gray-500 gap-2 mb-3">
                  <div className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                    <span>💬</span>
                    <span>{post.comments} Comments</span>
                  </div>
                  <div className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                    <span>📅</span>
                    <span>{post.date}</span>
                  </div>
                </div>

                <h3 className="blog-title text-md  text-slate-800 leading-snug mb-2 line-clamp-2 cursor-pointer">
                  {post.title}
                </h3>

                <p className="text-xs  text-gray-500 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>

                <div className="border-t border-gray-100 pt-4 mt-auto" />

                <div className="mt-4 flex items-center justify-between">
                  <button className="edit-button flex items-center gap-2 text-xs  p-2 border border-gray-200 rounded text-gray-700   hover:text-gray-900">
                    ✏️ Edit
                  </button>

                  <div>
                    {post.status === 'Active' ? (
                      <span className="status-badge inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs ">
                        Active
                      </span>
                    ) : (
                      <span className="status-badge inline-block bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs ">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-20">
              No blogs found.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-8 text-xs  text-gray-600">
          <div />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="pagination-btn border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            <button className="bg-red-600 text-white px-3 py-1 rounded   cursor-default">{page}</button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="pagination-btn border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-10 text-xs text-[#1F2020] text-center">
          Copyright © 2025 <span className="text-red   ">Preadmin</span>
        </div>
      </div>
    </div>
  );
};

export default AllBlogsPage;
