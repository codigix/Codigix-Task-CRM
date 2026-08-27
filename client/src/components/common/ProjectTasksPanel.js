import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { taskAPI, projectTeamAPI } from '../../services/api';

const ProjectTasksPanel = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    assigned_to: null,
    due_date: ''
  });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, teamRes] = await Promise.all([
        taskAPI.getAll(projectId),
        projectTeamAPI.getMembers(projectId)
      ]);
      setTasks(tasksRes);
      setTeamMembers(teamRes);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await taskAPI.create(projectId, {
        ...newTask,
        status: 'Todo',
        assigned_by: 1
      });
      setNewTask({
        title: '',
        description: '',
        priority: 'Medium',
        assigned_to: null,
        due_date: ''
      });
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      await taskAPI.update(projectId, taskId, {
        ...task,
        status: newStatus
      });
      fetchData();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await taskAPI.delete(projectId, taskId);
      fetchData();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Critical': 'text-red  bg-red-50',
      'High': 'text-orange-600 bg-orange-50',
      'Medium': 'text-yellow-600 bg-yellow-50',
      'Low': 'text-green-600 bg-green-50'
    };
    return colors[priority] || colors.Medium;
  };

  const getStatusIcon = (status) => {
    const statuses = {
      'Todo': <Circle size={16} className="text-[#1F2020]" />,
      'In Progress': <AlertCircle size={16} className="text-blue-500" />,
      'In Review': <AlertCircle size={16} className="text-purple-500" />,
      'Completed': <CheckCircle size={16} className="text-green-500" />,
      'On Hold': <Circle size={16} className="text-red-500" />
    };
    return statuses[status] || statuses.Todo;
  };

  if (loading) return <div className="text-center py-6 text-gray-600">Loading tasks...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-md  text-gray-900">Project Tasks</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 p-2 bg-red-50 text-red  rounded  hover:bg-red-100 transition text-xs   "
        >
          <Plus size={16} /> Add Task
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddTask} className="bg-gray-50 border border-gray-200 rounded  p-2 space-y-3 mb-4">
          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
          />
          <textarea
            placeholder="Task description"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            rows="2"
            className="w-full p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500 resize-none"
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
            <select
              value={newTask.assigned_to || ''}
              onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value ? parseInt(e.target.value) : null })}
              className="p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
            >
              <option value="">Assign to...</option>
              {teamMembers.map(member => (
                <option key={member.user_id} value={member.user_id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              className="p-2 border border-gray-300 rounded  text-xs  focus:outline-none focus:border-red-500"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-2 text-xs    text-gray-700 border border-gray-300 rounded  hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="p-2 text-xs    text-white bg-red-600 rounded  hover:bg-red-700"
            >
              Create Task
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No tasks yet. Create one to get started!</div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="border border-gray-200 rounded  p-2 hover: transition bg-white">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleStatusChange(task.id, task.status === 'Completed' ? 'Todo' : 'Completed')}
                  className="mt-1 flex-shrink-0"
                >
                  {getStatusIcon(task.status)}
                </button>
                <div className="flex-grow min-w-0">
                  <h4 className={`  text-xs  ${task.status === 'Completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`inline-block p-1  rounded text-xs   ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.due_date && (
                      <span className="inline-block p-1  text-xs text-gray-600 bg-gray-100 rounded">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1 text-red  hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectTasksPanel;
