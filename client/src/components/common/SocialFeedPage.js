import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreVertical, Home, Compass, Mail, Bookmark, ShoppingCart, FileText, Music, User, Star } from 'lucide-react';

const SocialFeedPage = () => {
  const [activeTab, setActiveTab] = useState('general');

  const [posts] = useState([
    {
      id: 1,
      author: 'Richard Smith',
      handle: '@richard442',
      location: 'United Kingdom',
      timestamp: 'About 1 hr ago',
      content: 'Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle. #MotivationMonday #Inspiration 🌟',
      images: true,
      likes: '340K',
      comments: '45',
      shares: '28'
    },
    {
      id: 2,
      author: 'Jason Heier',
      handle: '@jason118',
      location: 'United Kingdom',
      timestamp: 'About 1 hr ago',
      content: 'Drinking water boosts skin health and beauty. Stay hydrated! #HealthTips #Wellness 💧',
      images: true,
      likes: '340K',
      comments: '45',
      shares: '28'
    },
    {
      id: 3,
      author: 'Sophie Headrick',
      handle: '@sophie241',
      location: 'United Kingdom',
      timestamp: 'About 1 hr ago',
      content: 'Excited to announce the launch of our new product! Get yours now and enjoy a special discount. #NewRelease #Innovation 🎉',
      images: true,
      likes: '340K',
      comments: '45',
      shares: '28'
    }
  ]);

  const [generalPeoples] = useState([
    { id: 1, name: 'Anthony Lewis', location: 'United States', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-01.jpg' },
    { id: 2, name: 'Harvey Smith', location: 'Ukrain', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-02.jpg' },
    { id: 3, name: 'Stephan Peralt', location: 'Isreal', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-03.jpg' },
    { id: 4, name: 'Doglas Martini', location: 'Belgium', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-02.jpg' },
    { id: 5, name: 'Brian Villalobos', location: 'United Kingdom', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-09.jpg' },
    { id: 6, name: 'Linda Ray', location: 'Argentina', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-02.jpg' }
  ]);

  const [primaryPeoples] = useState([
    { id: 7, name: 'Anthony Lewis', location: 'United States', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-11.jpg' },
    { id: 8, name: 'Harvey Smith', location: 'Ukrain', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-10.jpg' },
    { id: 9, name: 'Stephan Peralt', location: 'Isreal', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-09.jpg' },
    { id: 10, name: 'Doglas Martini', location: 'Belgium', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-08.jpg' },
    { id: 11, name: 'Brian Villalobos', location: 'United Kingdom', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-07.jpg' }
  ]);

  const [savedFeeds] = useState([
    { title: 'World Health', icon: '⚕️', likes: '✓' },
    { title: 'Retail investor party continues even as...', icon: '📱', likes: '✓' },
    { title: 'T3 Tech', icon: '📺', likes: '✓' },
    { title: 'Followers', icon: '👥', likes: '✓' },
    { title: 'Evernote', icon: '🎯', likes: '✓' }
  ]);

  const displayedPeoples = activeTab === 'general' ? generalPeoples : primaryPeoples;

  return (
    <div className="p-3 sm:p-3 lg:p-3 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl  text-gray-900">Social Feed</h1>
          <div className="flex items-center gap-2 text-xs  text-gray-600 mt-2">
            <button className="text-gray-600 hover:text-gray-900">Home</button>
            <span>›</span>
            <button className="text-gray-600 hover:text-gray-900">Applications</button>
            <span>›</span>
            <span>Social Feed</span>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded  p-2 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <img src="https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-02.jpg" alt="James Hong" className="w-12 h-12 rounded-full" />
                <div>
                  <p className="text-xs   text-gray-900">James Hong</p>
                  <p className="text-xs text-gray-600">@James Hong324</p>
                </div>
              </div>
              <div className="flex gap-2 mb-4 text-center">
                <div>
                  <p className="text-lg  text-gray-900">89K</p>
                  <p className="text-xs text-gray-600">Followers</p>
                </div>
                <div>
                  <p className="text-lg  text-gray-900">45</p>
                  <p className="text-xs text-gray-600">Follows</p>
                </div>
              </div>
              <button className="w-full bg-red-600 text-white p-2  rounded  hover:bg-red-700   text-xs  flex items-center justify-center gap-2">
                ✎ Create Post
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded  p-2 mb-4">
              <div className="space-y-2">
                <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                  <Home size={16} />
                  All Feeds
                  <span className="ml-auto bg-red-600 text-white p-1  rounded-full text-xs ">56</span>
                </button>
                <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                  <Compass size={16} />
                  Explore
                </button>
                <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                  <Mail size={16} />
                  Messages
                </button>
                <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                  <FileText size={16} />
                  Lists
                </button>
                <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                  <Bookmark size={16} />
                  Bookmark
                </button>
                <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                  <ShoppingCart size={16} />
                  Marketplace
                </button>
                <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                  <FileText size={16} />
                  Files
                  <span className="ml-auto bg-red-600  text-white p-1  rounded-full text-xs ">14</span>
                </button>
                <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                  <Music size={16} />
                  Media
                </button>
                <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                  <User size={16} />
                  Profile
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded  p-2">
              <h3 className="text-xs   text-gray-900 mb-3">Pages You Liked</h3>
              <div className="space-y-2">
                {savedFeeds.slice(0, 4).map((feed, idx) => (
                  <button key={idx} className="w-full text-left p-2 text-xs  text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2">
                    <span className="text-lg">{feed.icon}</span>
                    <span className="flex-1 truncate">{feed.title}</span>
                    <Star size={14} />
                  </button>
                ))}
              </div>
              <button className="w-full text-left p-2 text-xs  text-gray-700 hover:bg-gray-50 rounded">
                Show More ›
              </button>
            </div>
          </div>

          <div className="flex-1 max-w-2xl">
            <div className="bg-white border border-gray-200 rounded  p-2 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <img src="https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-02.jpg" alt="James" className="w-10 h-10 rounded-full" />
                <input type="text" placeholder="What's on your mind?" className="flex-1 bg-gray-100 border-0 rounded-full p-2  text-xs " />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-600 hover:text-gray-900"><FileText size={16} /></button>
                  <button className="p-2 text-gray-600 hover:text-gray-900"><Music size={16} /></button>
                  <button className="p-2 text-gray-600 hover:text-gray-900"><Heart size={16} /></button>
                  <button className="p-2 text-gray-600 hover:text-gray-900"><Smile size={16} /></button>
                  <button className="p-2 text-gray-600 hover:text-gray-900"><MessageCircle size={16} /></button>
                  <button className="p-2 text-gray-600 hover:text-gray-900"><Share2 size={16} /></button>
                  <button className="p-2 text-gray-600 hover:text-gray-900"><MoreVertical size={16} /></button>
                </div>
                <button className="bg-red-600 text-white p-2  rounded  hover:bg-red-700   text-xs ">
                  ♥ Share Post
                </button>
              </div>
            </div>

            {posts.map((post) => (
              <div key={post.id} className="bg-white border border-gray-200 rounded  p-2 mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <img src={`https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-${post.id + 2}.jpg`} alt={post.author} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="text-xs   text-gray-900">{post.author}</p>
                      <p className="text-xs text-gray-600">{post.handle} • {post.location}</p>
                      <p className="text-xs text-gray-600">{post.timestamp}</p>
                    </div>
                  </div>
                  <button className="p-1 text-gray-600 hover:text-gray-900">
                    <MoreVertical size={16} />
                  </button>
                </div>

                <p className="text-xs  text-gray-700 mb-3">{post.content}</p>

                {post.images && (
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded  h-32"></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-yellow-400 rounded  h-16"></div>
                      <div className="bg-green-400 rounded  h-16"></div>
                      <div className="bg-purple-500 rounded  h-16"></div>
                      <div className="bg-pink-400 rounded  h-16"></div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-600 mb-3 border-t border-b border-gray-200 py-2">
                  <span>❤️ {post.likes} Likes</span>
                  <span>💬 {post.comments} Comments</span>
                  <span>🔄 {post.shares} Share</span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <button className="flex-1 px-3 py-1 text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center justify-center gap-1">
                    <Heart size={14} /> Like
                  </button>
                  <button className="flex-1 px-3 py-1 text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center justify-center gap-1">
                    <MessageCircle size={14} /> Comment
                  </button>
                  <button className="flex-1 px-3 py-1 text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center justify-center gap-1">
                    <Share2 size={14} /> Share
                  </button>
                </div>

                <div className="text-xs text-gray-600">
                  <div className="flex items-center gap-2 mb-2">
                    <img src="https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-02.jpg" alt="user" className="w-6 h-6 rounded-full" />
                    <span className="  text-gray-900">Frank Hoffman</span>
                    <span>12:45 PM</span>
                  </div>
                  <p className="text-gray-700 mb-2">Congratulations on the launch! I've been eagerly waiting for this product, and the special discount makes it even more exciting.</p>
                </div>

                <input type="text" placeholder="Enter Comments" className="w-full bg-gray-100 border-0 rounded p-2 text-xs  mt-2" />
              </div>
            ))}
          </div>

          <div className="w-80 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded  p-2 mb-4 sticky top-4">
              <h3 className="text-xs   text-gray-900 mb-3">Peoples</h3>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`px-3 py-1 rounded text-xs   ${activeTab === 'general' ? 'bg-red-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
                >
                  General
                </button>
                <button
                  onClick={() => setActiveTab('primary')}
                  className={`px-3 py-1 rounded text-xs   ${activeTab === 'primary' ? 'bg-red-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
                >
                  Primary
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                {displayedPeoples.map((person) => (
                  <div key={person.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <img src={person.avatar} alt={person.name} className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs  text-gray-900 truncate">{person.name}</p>
                        <p className="text-xs text-gray-600 truncate">{person.location}</p>
                      </div>
                    </div>
                    <button className="p-1 text-gray-600 hover:text-gray-900 text-lg   flex-shrink-0">+</button>
                  </div>
                ))}
              </div>
              <button className="text-xs  text-red  hover:text-red-700   mt-3 block w-full text-left">View All ›</button>
            </div>

            <div className="bg-white border border-gray-200 rounded  p-2 mb-4 sticky top-32">
              <h3 className="text-xs   text-gray-900 mb-3">Saved Feeds</h3>
              <div className="space-y-2">
                {savedFeeds.map((feed, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded">
                    <span className="text-lg">{feed.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs   text-gray-900">{feed.title}</p>
                    </div>
                    <span className="text-yellow-400">⭐</span>
                  </div>
                ))}
              </div>
              <button className="text-xs  text-red  hover:text-red-700   mt-3 block w-full text-left">View All ›</button>
            </div>

            <div className="bg-white border border-gray-200 rounded  p-2 sticky top-64">
              <h3 className="text-xs   text-gray-900 mb-3">Trending Hashtags</h3>
              <div className="space-y-2 text-xs">
                <button className="block text-red  hover:text-red-700   w-full text-left">#HealthTips #wellness #Motivation</button>
                <button className="block text-red  hover:text-red-700   w-full text-left">#integration</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialFeedPage;

const Smile = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
    <line x1="9" y1="9" x2="9.01" y2="9"></line>
    <line x1="15" y1="9" x2="15.01" y2="9"></line>
  </svg>
);
