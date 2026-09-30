import api from './api';

export const summaryService = {
  // Generate an AI Summary from Meeting Transcript or PDF Text
  async generateSummary({ source_id, source_type, style = 'executive', text = null, title = null }) {
    const payload = {
      source_id,
      source_type,
      style,
      text,
      title
    };
    const response = await api.post('/summaries/generate', payload);
    return response.data;
  },

  // Get list of all summaries
  async getSummaries() {
    const response = await api.get('/summaries');
    return response.data;
  },

  // Get single summary by ID
  async getSummary(summaryId) {
    const response = await api.get(`/summaries/${summaryId}`);
    return response.data;
  },

  // Get summary for a specific source meeting or document
  async getSummaryBySource(sourceId) {
    const response = await api.get(`/summaries/source/${sourceId}`);
    return response.data;
  },

  // Delete summary
  async deleteSummary(summaryId) {
    const response = await api.delete(`/summaries/${summaryId}`);
    return response.data;
  },

  // Get aggregate summary statistics
  async getSummaryStats() {
    const response = await api.get('/summaries/stats/overview');
    return response.data;
  },

  // Download PDF file
  async downloadPdf(summaryId, title = 'Meeting_Summary') {
    const response = await api.get(`/summaries/${summaryId}/pdf`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTitle = (title || 'Meeting_Summary').replace(/[^a-zA-Z0-9_\-]/g, '_');
    link.setAttribute('download', `${cleanTitle}_Summary.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Download TXT file
  async downloadTxt(summaryId, title = 'Meeting_Summary') {
    const response = await api.get(`/summaries/${summaryId}/txt`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTitle = (title || 'Meeting_Summary').replace(/[^a-zA-Z0-9_\-]/g, '_');
    link.setAttribute('download', `${cleanTitle}_Summary.txt`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

export default summaryService;
