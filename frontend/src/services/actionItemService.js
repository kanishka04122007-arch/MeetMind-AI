import api from './api';

export const actionItemService = {
  // Extract action items from transcript or document using AI
  async extractActionItems({ source_id, source_type = 'meeting', text = null, title = null }) {
    const response = await api.post('/action-items/extract', {
      source_id,
      source_type,
      text,
      title
    });
    return response.data;
  },

  // Create a manual task
  async createTask(data) {
    const response = await api.post('/action-items', data);
    return response.data;
  },

  // List all tasks with optional filters
  async getTasks(params = {}) {
    const response = await api.get('/action-items', { params });
    return response.data;
  },

  // Get aggregated task statistics for dashboard
  async getTaskStats() {
    const response = await api.get('/action-items/stats');
    return response.data;
  },

  // Get a single task by ID
  async getTask(taskId) {
    const response = await api.get(`/action-items/${taskId}`);
    return response.data;
  },

  // Update task (status, assignee, deadline, priority, description)
  async updateTask(taskId, data) {
    const response = await api.put(`/action-items/${taskId}`, data);
    return response.data;
  },

  // Delete task
  async deleteTask(taskId) {
    const response = await api.delete(`/action-items/${taskId}`);
    return response.data;
  }
};

export default actionItemService;
