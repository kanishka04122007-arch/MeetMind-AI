import api from './api';

export const documentService = {
  // Upload meeting PDF document with progress tracking
  async uploadPdf(file, title, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    if (title && title.trim()) {
      formData.append('title', title.trim());
    }

    const response = await api.post('/documents/upload', formData, {
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

  // Create demo PDF meeting document with realistic scenario
  async createDemoPdf(scenario = 'meeting_notes', title = null) {
    const response = await api.post('/documents/demo', {
      scenario,
      title
    });
    return response.data;
  },

  // List all uploaded PDF documents for current user
  async getDocuments() {
    const response = await api.get('/documents');
    return response.data;
  },

  // Get single PDF document details with page breakdown and extracted text
  async getDocument(docId) {
    const response = await api.get(`/documents/${docId}`);
    return response.data;
  },

  // Update extracted text or title
  async updateDocumentText(docId, data) {
    const response = await api.put(`/documents/${docId}/text`, data);
    return response.data;
  },

  // Delete PDF document and remove file from disk
  async deleteDocument(docId) {
    const response = await api.delete(`/documents/${docId}`);
    return response.data;
  },

  // Get aggregated stats
  async getStats() {
    const response = await api.get('/documents/stats');
    return response.data;
  },

  // Get download/preview URL for PDF
  getPdfDownloadUrl(storedFilename) {
    if (!storedFilename) return null;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    return `${baseUrl}/documents/download/${storedFilename}`;
  }
};

export default documentService;
