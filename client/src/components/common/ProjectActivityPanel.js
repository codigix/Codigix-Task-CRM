import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import { projectCommentAPI, projectAPI } from '../../services/api';

const ProjectActivityPanel = ({ projectId, currentUserId = 1 }) => {
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('comments');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [commentsRes, activityRes] = await Promise.all([
        projectCommentAPI.getAll(projectId),
        projectAPI.getActivity(projectId)
      ]);
      setComments(commentsRes);
      setActivity(activityRes);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await projectCommentAPI.create(projectId, {
        user_id: currentUserId,
        comment_text: newComment,
        task_id: null
      });
      setNewComment('');
      fetchData();
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-6 text-gray-600">Loading activity...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('comments')}
          className={`px-4 py-3   text-xs  flex items-center gap-2 border-b-2 ${activeTab === 'comments'
              ? 'border-red-600 text-red '
              : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
        >
          <MessageCircle size={16} /> Comments ({comments.length})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-3   text-xs  border-b-2 ${activeTab === 'activity'
              ? 'border-red-600 text-red '
              : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
        >
          Activity ({activity.length})
        </button>
      </div>

      {activeTab === 'comments' && (
        <div className="space-y-4">
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-grow p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="p-2 bg-red-600 text-white rounded  hover:bg-red-700 disabled:opacity-50 transition"
            >
              <Send size={16} />
            </button>
          </form>

          <div className="space-y-3">
            {comments.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs ">No comments yet. Start the conversation!</div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="bg-gray-50 rounded  p-3 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="  text-xs  text-gray-900">
                        {comment.first_name} {comment.last_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs  text-gray-700 mt-2">{comment.comment_text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-3">
          {activity.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-xs ">No activity yet</div>
          ) : (
            activity.map(act => (
              <div key={act.id} className="flex gap-3 pb-3 border-b border-gray-200 last:border-b-0">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs   text-gray-600">
                    {act.first_name?.[0]}{act.last_name?.[0]}
                  </span>
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-xs    text-gray-900">{act.first_name} {act.last_name}</p>
                  <p className="text-xs  text-gray-600 mt-1">{act.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(act.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectActivityPanel;
