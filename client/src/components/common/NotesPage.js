import React, { useState, useEffect } from 'react';
import { Star, Trash2, MoreVertical, Download, Calendar, Plus, X, Edit2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const NotesPage = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    category: 'Personal',
    tag: 'Pending'
  });

  const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';

  useEffect(() => {
    const fetchNotesAsync = async () => {
      if (user?.id) {
        try {
          setLoading(true);
          const response = await fetch(`${apiUrl}/notes?userId=${user?.id}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch notes');
          }
          
          const data = await response.json();
          const notesWithDefaults = Array.isArray(data) ? data.map(note => ({
            ...note,
            is_important: note.is_important === true || note.is_important === 1 ? 1 : 0
          })) : [];
          setNotes(notesWithDefaults);
          setError('');
        } catch (err) {
          console.error('Error fetching notes:', err);
          setError('Failed to load notes');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchNotesAsync();
  }, [user?.id, apiUrl]);

  const handleAddNote = () => {
    setEditingNote(null);
    setFormData({
      title: '',
      description: '',
      priority: 'Medium',
      category: 'Personal',
      tag: 'Pending'
    });
    setIsModalOpen(true);
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      description: note.description,
      priority: note.priority,
      category: note.category,
      tag: note.tag || 'Pending'
    });
    setIsModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a note title');
      return;
    }

    console.log('Current user in handleSaveNote:', user);
    
    if (!user?.id) {
      console.error('User not authenticated:', user);
      alert('User not authenticated. Please log in again.');
      return;
    }

    try {
      if (editingNote) {
        const response = await fetch(`${apiUrl}/notes/${editingNote.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            category: formData.category,
            tag: formData.tag,
            is_important: editingNote.is_important
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update note');
        }

        const result = await response.json();
        const normalizedNote = {
          ...result.note,
          is_important: result.note.is_important === true || result.note.is_important === 1 ? 1 : 0
        };
        setNotes(notes.map(n => n.id === editingNote.id ? normalizedNote : n));
      } else {
        console.log('User object before creating note:', user);
        console.log('User ID type and value:', typeof user.id, user.id);
        
        let userId = user.id;
        
        if (typeof userId === 'string') {
          const parsed = parseInt(userId);
          if (isNaN(parsed)) {
            throw new Error(`Invalid user ID format: "${userId}" is not a valid number. Please log out and log in again.`);
          }
          userId = parsed;
        }
        
        if (!Number.isInteger(userId) || userId <= 0) {
          throw new Error(`Invalid user ID: ${userId}. Please log out and log in again.`);
        }
        
        console.log('Final user ID for request:', userId, 'type:', typeof userId);
        
        const noteData = {
          user_id: userId,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          category: formData.category,
          tag: formData.tag,
          is_important: false
        };

        console.log('Sending note data:', noteData);
        console.log('Request will be sent to:', `${apiUrl}/notes`);

        const response = await fetch(`${apiUrl}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteData)
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create note');
        }

        const result = await response.json();
        const normalizedNote = {
          ...result.note,
          is_important: result.note.is_important === true || result.note.is_important === 1 ? 1 : 0
        };
        setNotes([normalizedNote, ...notes]);
      }

      setIsModalOpen(false);
      setEditingNote(null);
    } catch (err) {
      console.error('Error saving note:', err);
      alert(`Failed to save note: ${err.message}`);
    }
  };

  const handleDeleteNote = async (id) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        const response = await fetch(`${apiUrl}/notes/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete note');
        }

        setNotes(notes.filter(n => n.id !== id));
      } catch (err) {
        console.error('Error deleting note:', err);
        alert('Failed to delete note');
      }
    }
  };

  const toggleImportant = async (note) => {
    try {
      const response = await fetch(`${apiUrl}/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_important: !note.is_important
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      const result = await response.json();
      const normalizedNote = {
        ...result.note,
        is_important: result.note.is_important === true || result.note.is_important === 1 ? 1 : 0
      };
      setNotes(notes.map(n => n.id === note.id ? normalizedNote : n));
    } catch (err) {
      console.error('Error updating note:', err);
      alert('Failed to update note');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Personal': { bg: 'bg-blue-100', text: 'text-white ', dot: 'bg-blue-500' },
      'Work': { bg: 'bg-green-100', text: 'text-green-600', dot: 'bg-green-500' },
      'Social': { bg: 'bg-yellow-100', text: 'text-yellow-600', dot: 'bg-yellow-500' }
    };
    return colors[category] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-500' };
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      'High': 'bg-red-100 text-red  border-red-300',
      'Medium': 'bg-yellow-100 text-yellow-600 border-yellow-300',
      'Low': 'bg-green-100 text-green-600 border-green-300'
    };
    return colors[priority] || 'bg-gray-100 text-gray-600';
  };

  const getTagColor = (tag) => {
    const colors = {
      'Pending': 'bg-blue-500',
      'Onhold': 'bg-red-500',
      'Inprogress': 'bg-yellow-500',
      'Done': 'bg-green-500'
    };
    return colors[tag] || 'bg-gray-500';
  };

  const getFilteredNotes = () => {
    let filtered = notes;

    if (activeFilter === 'important') {
      filtered = filtered.filter(n => n.is_important === true || n.is_important === 1);
    } else if (activeFilter === 'trash') {
      filtered = [];
    }

    if (selectedTag) {
      filtered = filtered.filter(n => n.tag === selectedTag);
    }

    if (selectedPriority) {
      filtered = filtered.filter(n => n.priority === selectedPriority);
    }

    return filtered;
  };

  const filteredNotes = getFilteredNotes();
  const importantNotes = notes.filter(n => n.is_important === true || n.is_important === 1);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const NoteCard = ({ note }) => {
    const categoryColor = getCategoryColor(note.category);
    return (
      <div key={note.id} className="bg-white border border-gray-200 rounded  p-2 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <span className={`px-3 py-1 rounded-full text-xs  border ${getPriorityBadge(note.priority)}`}>
            {note.priority}
          </span>
          <div className="relative group">
            <button className="text-[#1F2020] hover:text-gray-600">
              <MoreVertical size={18} />
            </button>
            <div className="hidden group-hover:block absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded  shadow-lg z-10">
              <button 
                onClick={() => handleEditNote(note)}
                className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700 flex items-center gap-2"
              >
                <Edit2 size={14} /> Edit
              </button>
              <button 
                onClick={() => handleDeleteNote(note.id)}
                className="w-full text-left p-2  hover:bg-red-50 text-xs  text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <h3 className="text-xs   text-gray-900 mb-2">{note.title}</h3>

        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
          <Calendar size={14} />
          {formatDate(note.created_at)}
        </div>

        <p className="text-xs  text-gray-600 mb-3 line-clamp-2">{note.description}</p>

        <div className="mb-2">
          <span className={`inline-block text-xs text-white p-1  rounded ${getTagColor(note.tag || 'Pending')}`}>
            {note.tag || 'Pending'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`https://i.pravatar.cc/150?u=${user?.email || 'user'}`} alt={note.category} className="w-6 h-6 rounded-full" />
            <span className={`p-1  rounded text-xs   ${categoryColor.text} ${categoryColor.bg}`}>
              {note.category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => toggleImportant(note)}
              className={`${note.is_important ? 'text-yellow-400' : 'text-[#1F2020]'} hover:text-yellow-500`}
            >
              <Star size={16} fill={note.is_important ? 'currentColor' : 'none'} />
            </button>
            <button 
              onClick={() => handleDeleteNote(note.id)}
              className="text-[#1F2020] hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getFilterLabel = () => {
    if (activeFilter === 'important') return 'Important Notes';
    if (activeFilter === 'trash') return 'Trash';
    if (selectedTag) return `${selectedTag} Notes`;
    if (selectedPriority) return `${selectedPriority} Priority Notes`;
    return 'All Notes';
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-3 lg:p-3 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-3 lg:p-3 bg-white min-h-screen">
      {error && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded  text-red-700">
          {error}
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl  text-gray-900">Notes</h1>
            <div className="flex items-center gap-2 text-xs  text-gray-600 mt-2">
              <button className="text-gray-600 hover:text-gray-900">Home</button>
              <span>›</span>
              <button className="text-gray-600 hover:text-gray-900">Applications</button>
              <span>›</span>
              <span>Notes</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <button className="flex items-center gap-2 p-2  border border-gray-300 text-gray-700 rounded  hover:bg-gray-50 transition-smooth   text-xs ">
                <Download size={16} />
                Export
              </button>
              <div className="hidden group-hover:block absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded  shadow-lg z-10">
                <button className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700">Export as PDF</button>
                <button className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700">Export as Excel</button>
              </div>
            </div>
            <button 
              onClick={handleAddNote}
              className="flex items-center gap-2 p-2  bg-red-600 text-white rounded  hover:bg-red-700 transition-smooth   text-xs text-xs "
            >
              <Plus size={16} />
              Add Notes
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-56 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded  p-2 sticky top-20">
              <h3 className="text-xs   text-gray-900 mb-3">Notes List</h3>
              
              <button 
                onClick={() => {
                  setActiveFilter('all');
                  setSelectedTag(null);
                  setSelectedPriority(null);
                }}
                className={`w-full p-2  rounded text-xs    mb-3 transition-smooth ${
                  activeFilter === 'all' && !selectedTag && !selectedPriority
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Notes ({notes.length})
              </button>
              
              <button 
                onClick={() => {
                  setActiveFilter('important');
                  setSelectedTag(null);
                  setSelectedPriority(null);
                }}
                className={`w-full text-left p-2  text-xs  rounded flex items-center gap-2 mb-2 transition-smooth ${
                  activeFilter === 'important'
                    ? 'bg-red-50 text-red   '
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Star size={16} className="text-yellow-400" />
                Important ({importantNotes.length})
              </button>
              
              <button 
                onClick={() => {
                  setActiveFilter('trash');
                  setSelectedTag(null);
                  setSelectedPriority(null);
                }}
                className={`w-full text-left p-2  text-xs  rounded flex items-center gap-2 transition-smooth ${
                  activeFilter === 'trash'
                    ? 'bg-red-50 text-red   '
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Trash2 size={16} />
                Trash
              </button>

              <div className="border-t border-gray-200 mt-4 pt-4">
                <h4 className="text-xs  text-gray-900 mb-3">Tags</h4>
                <div className="space-y-2">
                  {['Pending', 'Onhold', 'Inprogress', 'Done'].map((tag) => (
                    <button 
                      key={tag}
                      onClick={() => {
                        setSelectedTag(selectedTag === tag ? null : tag);
                        setActiveFilter('all');
                        setSelectedPriority(null);
                      }}
                      className={`flex items-center gap-2 text-xs  w-full p-1  rounded transition-smooth ${
                        selectedTag === tag
                          ? 'bg-blue-50 text-blue-700  '
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${getTagColor(tag)}`}></span>
                      {tag} ({notes.filter(n => (n.tag || 'Pending') === tag).length})
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 mt-4 pt-4">
                <h4 className="text-xs  text-gray-900 mb-3">Priority</h4>
                <div className="space-y-2">
                  {['High', 'Medium', 'Low'].map((priority) => (
                    <button 
                      key={priority}
                      onClick={() => {
                        setSelectedPriority(selectedPriority === priority ? null : priority);
                        setActiveFilter('all');
                        setSelectedTag(null);
                      }}
                      className={`px-3 py-1 rounded text-xs   w-full transition-smooth ${
                        selectedPriority === priority
                          ? `${getPriorityBadge(priority)} border-2`
                          : getPriorityBadge(priority)
                      }`}
                    >
                      {priority} ({notes.filter(n => n.priority === priority).length})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            {(activeFilter === 'important' || selectedTag || selectedPriority) && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl  text-gray-900">{getFilterLabel()}</h2>
                  <button 
                    onClick={() => {
                      setActiveFilter('all');
                      setSelectedTag(null);
                      setSelectedPriority(null);
                    }}
                    className="text-xs  text-red  hover:text-red-700  "
                  >
                    Clear Filter
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNotes.length > 0 ? (
                    filteredNotes.map((note) => <NoteCard key={note.id} note={note} />)
                  ) : (
                    <div className="col-span-3 text-center py-12">
                      <p className="text-gray-600">No notes found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeFilter === 'all' && !selectedTag && !selectedPriority && (
              <>
                {importantNotes.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl  text-gray-900">
                        <Star size={20} className="inline text-yellow-400 mr-2" />
                        Important Notes ({importantNotes.length})
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {importantNotes.map((note) => <NoteCard key={note.id} note={note} />)}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl  text-gray-900">All Notes ({notes.length})</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {notes.length > 0 ? (
                      notes.map((note) => <NoteCard key={note.id} note={note} />)
                    ) : (
                      <div className="col-span-3 text-center py-12">
                        <p className="text-gray-600 mb-4">No notes yet</p>
                        <button 
                          onClick={handleAddNote}
                          className="p-2  bg-red-600 text-white rounded  hover:bg-red-700"
                        >
                          Create Your First Note
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded  shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-betweenp-3  border-b border-gray-200">
              <h2 className="text-xl  text-gray-900">
                {editingNote ? 'Edit Note' : 'Add New Note'}
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingNote(null);
                }}
                className="text-[#1F2020] hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs    text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter note title"
                  className="w-full p-2  border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs    text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter note description"
                  rows="4"
                  className="w-full p-2  border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full p-2  border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs    text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2  border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Work">Work</option>
                    <option value="Social">Social</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs    text-gray-700 mb-2">Tag</label>
                <select
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  className="w-full p-2  border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Onhold">Onhold</option>
                  <option value="Inprogress">Inprogress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3p-3  border-t border-gray-200">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingNote(null);
                }}
                className="p-2  border border-gray-300 text-gray-700 rounded  hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="p-2  bg-red-600 text-white rounded  hover:bg-red-700"
              >
                {editingNote ? 'Update Note' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesPage;
