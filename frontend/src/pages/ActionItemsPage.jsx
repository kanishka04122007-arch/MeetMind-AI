import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Sparkles, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  Loader2, 
  Calendar, 
  ArrowRight, 
  FileText, 
  Mic, 
  RefreshCw,
  X,
  Save,
  Check,
  Flag,
  Layers,
  ChevronDown,
  LayoutGrid,
  List
} from 'lucide-react';
import { actionItemService } from '../services/actionItemService';
import { useAuth } from '../context/AuthContext';

export const ActionItemsPage = ({ onNavigateToTranscription }) => {
  const { showToast } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Pending', 'In Progress', 'Completed'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all', 'High', 'Medium', 'Low'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    task: '',
    assigned_to: '',
    deadline: '',
    priority: 'Medium',
    status: 'Pending'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [statusFilter, priorityFilter]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const [tasksRes, statsRes] = await Promise.allSettled([
        actionItemService.getTasks({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined
        }),
        actionItemService.getTaskStats()
      ]);

      if (tasksRes.status === 'fulfilled' && tasksRes.value) {
        setTasks(tasksRes.value.tasks || []);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      if (showToast) {
        showToast('Failed to load action items.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await actionItemService.updateTask(task.id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      if (showToast) {
        showToast(`Task marked as ${newStatus}!`, 'success');
      }
      // Refresh statistics in background
      actionItemService.getTaskStats().then(s => setStats(s)).catch(() => {});
    } catch (err) {
      console.error('Failed to update status:', err);
      if (showToast) {
        showToast('Failed to update task status.', 'error');
      }
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await actionItemService.updateTask(taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      if (showToast) {
        showToast(`Status changed to ${newStatus}`, 'success');
      }
      actionItemService.getTaskStats().then(s => setStats(s)).catch(() => {});
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this action item?')) return;
    try {
      await actionItemService.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (showToast) {
        showToast('Action item deleted successfully.', 'success');
      }
      actionItemService.getTaskStats().then(s => setStats(s)).catch(() => {});
    } catch (err) {
      console.error('Failed to delete task:', err);
      if (showToast) {
        showToast('Failed to delete task.', 'error');
      }
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setTaskForm({
      task: '',
      assigned_to: 'Engineering Team',
      deadline: 'Friday EOD',
      priority: 'Medium',
      status: 'Pending'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setTaskForm({
      task: task.task,
      assigned_to: task.assigned_to,
      deadline: task.deadline,
      priority: task.priority,
      status: task.status
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.task.trim()) {
      if (showToast) showToast('Task description cannot be empty.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingTask) {
        const updated = await actionItemService.updateTask(editingTask.id, taskForm);
        setTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t));
        if (showToast) showToast('Task updated successfully!', 'success');
      } else {
        const created = await actionItemService.createTask(taskForm);
        setTasks(prev => [created, ...prev]);
        if (showToast) showToast('New task added successfully!', 'success');
      }
      setIsModalOpen(false);
      actionItemService.getTaskStats().then(s => setStats(s)).catch(() => {});
    } catch (err) {
      console.error('Error submitting task form:', err);
      if (showToast) showToast('Failed to save task.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.task.toLowerCase().includes(q) ||
      (t.assigned_to && t.assigned_to.toLowerCase().includes(q)) ||
      (t.deadline && t.deadline.toLowerCase().includes(q)) ||
      (t.source_title && t.source_title.toLowerCase().includes(q))
    );
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'Low':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'In Progress':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Module 4 &bull; AI Action Item Extraction & Task Management</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Action Items & Deliverables Workspace
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Automatically identify responsibilities, deadlines, and priorities from meeting transcripts and summaries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Task</span>
            </button>

            <button
              onClick={loadTasks}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all shadow-md"
              title="Refresh task list"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Task Statistics Bar (Module 4 Requirement) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Tasks */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800/80 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Total Tasks
          </span>
          <p className="text-2xl font-mono font-extrabold text-white">
            {stats ? stats.total_tasks : tasks.length}
          </p>
          <span className="text-[10px] text-slate-500">Extracted across sessions</span>
        </div>

        {/* Pending */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800/80 space-y-1">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
            Pending
          </span>
          <p className="text-2xl font-mono font-extrabold text-amber-300">
            {stats ? stats.pending_tasks : tasks.filter(t => t.status === 'Pending').length}
          </p>
          <span className="text-[10px] text-slate-500">Awaiting action</span>
        </div>

        {/* In Progress */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800/80 space-y-1">
          <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
            In Progress
          </span>
          <p className="text-2xl font-mono font-extrabold text-blue-300">
            {stats ? stats.in_progress_tasks : tasks.filter(t => t.status === 'In Progress').length}
          </p>
          <span className="text-[10px] text-slate-500">Currently active</span>
        </div>

        {/* Completed */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800/80 space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
            Completed
          </span>
          <p className="text-2xl font-mono font-extrabold text-emerald-400">
            {stats ? stats.completed_tasks : tasks.filter(t => t.status === 'Completed').length}
          </p>
          <span className="text-[10px] text-slate-500">Resolved deliverables</span>
        </div>

        {/* Completion Rate */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800/80 space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
              Completion Rate
            </span>
            <span className="text-xs font-bold text-purple-300">
              {stats ? stats.completion_rate : 0}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${stats ? stats.completion_rate : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">Team velocity metric</span>
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by task, assignee, deadline, or meeting..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Filter Pills & View Mode */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
            {['all', 'Pending', 'In Progress', 'Completed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'all' ? 'All Status' : st}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
            {['all', 'High', 'Medium', 'Low'].map((pr) => (
              <button
                key={pr}
                onClick={() => setPriorityFilter(pr)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  priorityFilter === pr
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {pr === 'all' ? 'All Priority' : pr}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg ${viewMode === 'cards' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Task List Content */}
      {loading && tasks.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-xs">Loading action items...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 px-6 rounded-3xl bg-slate-950/40 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
            <CheckSquare className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-sm font-bold text-white">No Action Items Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
            {searchQuery 
              ? 'No tasks matched your search query. Try clearing your filters.' 
              : 'Extract action items automatically from any meeting transcript, or add a custom task.'}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Create New Task
            </button>
            {onNavigateToTranscription && (
              <button
                onClick={() => onNavigateToTranscription('audio')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
              >
                Go to Transcripts to Extract
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((t) => {
            const isCompleted = t.status === 'Completed';
            return (
              <div
                key={t.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 shadow-sm group hover:border-indigo-500/40 ${
                  isCompleted
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-75'
                    : 'bg-slate-900/70 border-slate-800/90 hover:bg-slate-900'
                }`}
              >
                {/* Header & Badges */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    {/* Priority badge */}
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getPriorityBadge(t.priority)}`}>
                      {t.priority} Priority
                    </span>

                    {/* Status Selector Dropdown */}
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      className={`text-[10px] font-bold rounded-lg px-2 py-0.5 border bg-slate-950 focus:outline-none cursor-pointer ${getStatusBadge(t.status)}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* Task Description with Checkbox */}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleComplete(t)}
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-700 hover:border-indigo-400 bg-slate-950'
                      }`}
                      title={isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
                    >
                      {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <p className={`text-xs font-semibold leading-relaxed ${isCompleted ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                      {t.task}
                    </p>
                  </div>
                </div>

                {/* Footer Metadata & Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-semibold text-indigo-300">{t.assigned_to || 'Unassigned'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span>{t.deadline || 'Next Sprint'}</span>
                    </div>
                  </div>

                  {/* Edit and Delete Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(t)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit task"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-10">Done</th>
                  <th className="py-3 px-4">Task Description</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredTasks.map((t) => {
                  const isCompleted = t.status === 'Completed';
                  return (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleComplete(t)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-700 hover:border-indigo-400 bg-slate-950'
                          }`}
                        >
                          {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <p className={`font-medium ${isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>
                          {t.task}
                        </p>
                        {t.source_title && (
                          <span className="text-[10px] text-slate-500 truncate block">
                            Source: {t.source_title}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-indigo-300 whitespace-nowrap">
                        {t.assigned_to || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {t.deadline || 'Next Sprint'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getPriorityBadge(t.priority)}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value)}
                          className={`text-[10px] font-bold rounded-lg px-2 py-0.5 border bg-slate-950 focus:outline-none cursor-pointer ${getStatusBadge(t.status)}`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">
                  {editingTask ? 'Edit Action Item' : 'Create New Action Item'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Task Description *</label>
                <textarea
                  rows={3}
                  value={taskForm.task}
                  onChange={(e) => setTaskForm({ ...taskForm, task: e.target.value })}
                  placeholder="e.g., Deliver updated API documentation and client SDK by Friday"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Responsible Person</label>
                  <input
                    type="text"
                    value={taskForm.assigned_to}
                    onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                    placeholder="e.g., Sarah Chen / Frontend Team"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Target Deadline</label>
                  <input
                    type="text"
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    placeholder="e.g., Friday 5:00 PM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Priority Level</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="High">High Priority (Urgent)</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Current Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTask ? 'Save Changes' : 'Create Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionItemsPage;
