import api from './api';

export const meetingService = {
  // Upload audio file with progress callback
  async uploadAudio(file, title, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    if (title && title.trim()) {
      formData.append('title', title.trim());
    }

    const response = await api.post('/meetings/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },

  // Create demo meeting transcript with realistic scenario
  async createDemoMeeting(scenario = 'sprint_planning', title = null) {
    const response = await api.post('/meetings/demo', {
      scenario,
      title
    });
    return response.data;
  },

  // Get list of all meetings
  async getMeetings() {
    const response = await api.get('/meetings');
    return response.data;
  },

  // Get single meeting details
  async getMeeting(meetingId) {
    const response = await api.get(`/meetings/${meetingId}`);
    return response.data;
  },

  // Update transcript text or segments
  async updateTranscript(meetingId, data) {
    const response = await api.put(`/meetings/${meetingId}/transcript`, data);
    return response.data;
  },

  // Delete meeting
  async deleteMeeting(meetingId) {
    const response = await api.delete(`/meetings/${meetingId}`);
    return response.data;
  },

  // Get streamable audio URL
  getAudioUrl(fileUrl) {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('http')) return fileUrl;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    // If fileUrl is /api/meetings/audio/xyz, avoid double /api
    const cleanPath = fileUrl.startsWith('/api') ? fileUrl.substring(4) : fileUrl;
    return `${baseUrl.replace('/api', '')}/api${cleanPath}`;
  }
};

export default meetingService;
