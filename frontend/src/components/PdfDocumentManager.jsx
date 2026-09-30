import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Sparkles, 
  Search, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  BookOpen,
  Calendar,
  Hash,
  FileCode,
  FileCheck,
  RefreshCw,
  Eye
} from 'lucide-react';
import { documentService } from '../services/documentService';
import { SummaryViewerModal } from './SummaryViewerModal';
import { ActionItemExtractorModal } from './ActionItemExtractorModal';
import { CheckSquare } from 'lucide-react';

export const PdfDocumentManager = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [textSearch, setTextSearch] = useState('');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isActionItemsOpen, setIsActionItemsOpen] = useState(false);

  // Upload state
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Viewer state
  const [activePage, setActivePage] = useState('all'); // 'all' or page number int
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await documentService.getDocuments();
      setDocuments(data.documents || []);
      if (data.documents && data.documents.length > 0 && !selectedDoc) {
        loadDocumentDetails(data.documents[0]._id);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentDetails = async (docId) => {
    try {
      const details = await documentService.getDocument(docId);
      setSelectedDoc(details);
      setEditTitle(details.title);
      setEditText(details.extracted_text);
      setIsEditing(false);
      setActivePage('all');
    } catch (err) {
      console.error('Failed to load document details:', err);
    }
  };

  const validateFileSelection = (file) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    
    // Check if user uploaded audio/video or non-pdf
    if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.mp4') || name.endsWith('.m4a')) {
      setUploadError("Audio and video files must be uploaded via the 'Audio & Video Recordings' tab.");
      setSelectedFile(null);
      return false;
    }

    if (!name.endsWith('.pdf')) {
      setUploadError(`✗ Invalid format '${name.slice(name.lastIndexOf('.'))}'. Only genuine PDF documents (.pdf) are accepted.`);
      setSelectedFile(null);
      return false;
    }

    // Check size limit: 50MB
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 50MB.`);
      setSelectedFile(null);
      return false;
    }

    setUploadError(null);
    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFileSelection(file)) {
      setSelectedFile(file);
      if (!uploadTitle) {
        const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
        setUploadTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFileSelection(file)) {
      setSelectedFile(file);
      if (!uploadTitle) {
        const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
        setUploadTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const newDoc = await documentService.uploadPdf(
        selectedFile,
        uploadTitle,
        (progress) => setUploadProgress(progress)
      );

      await fetchDocuments();
      setSelectedDoc(newDoc);
      setEditTitle(newDoc.title);
      setEditText(newDoc.extracted_text);
      setSelectedFile(null);
      setUploadTitle('');
      showSuccessNotice('PDF Document uploaded and text extracted successfully!');
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Failed to upload and extract PDF text.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCreateDemo = async (scenario = 'meeting_notes') => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const demoDoc = await documentService.createDemoPdf(scenario);
      await fetchDocuments();
      setSelectedDoc(demoDoc);
      setEditTitle(demoDoc.title);
      setEditText(demoDoc.extracted_text);
      showSuccessNotice(`Sample PDF "${demoDoc.title}" generated with multi-page text!`);
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Failed to generate demo document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedDoc) return;
    setIsSaving(true);
    try {
      const updated = await documentService.updateDocumentText(selectedDoc._id, {
        title: editTitle,
        extracted_text: editText
      });
      setSelectedDoc(updated);
      setIsEditing(false);
      await fetchDocuments();
      showSuccessNotice('Document text updated successfully!');
    } catch (err) {
      console.error('Failed to update text:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this PDF document?')) return;
    try {
      await documentService.deleteDocument(docId);
      const remaining = documents.filter(d => d._id !== docId);
      setDocuments(remaining);
      if (selectedDoc?._id === docId) {
        if (remaining.length > 0) {
          loadDocumentDetails(remaining[0]._id);
        } else {
          setSelectedDoc(null);
        }
      }
      showSuccessNotice('Document deleted successfully.');
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleCopyText = () => {
    if (!selectedDoc) return;
    navigator.clipboard.writeText(selectedDoc.extracted_text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!selectedDoc) return;
    const blob = new Blob([selectedDoc.extracted_text || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDoc.title.replace(/\s+/g, '_')}_extracted_text.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const showSuccessNotice = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Filter documents
  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute text to display based on active page
  const getDisplayText = () => {
    if (!selectedDoc) return '';
    if (activePage === 'all') {
      return selectedDoc.extracted_text || '';
    }
    const pageObj = (selectedDoc.pages || []).find(p => p.page_number === activePage);
    return pageObj ? pageObj.text : '';
  };

  const currentDisplayText = getDisplayText();

  // Search highlighting helper
  const renderHighlightedText = (text, query) => {
    if (!query || !query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-400 text-slate-950 font-bold px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Toast feedback */}
      {actionSuccess && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-200 text-xs shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Top Banner: Objectives & Supported Format */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400">
                PDF Document Module
              </span>
              <span className="text-xs text-slate-400">&bull; pdfplumber / pypdf Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Meeting PDF Documents & Text Extraction
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Upload meeting agendas, slide decks, and note documents. The system validates file integrity, stores documents in <code className="text-purple-300 font-mono text-[11px] bg-purple-950/60 px-1 py-0.5 rounded">uploads/pdf/</code>, and extracts structured text for AI summarization.
            </p>
          </div>

          {/* Quick Demo Generation Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleCreateDemo('meeting_notes')}
              disabled={isUploading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow-sm disabled:opacity-50"
              title="Create 3-page Meeting Minutes sample PDF"
            >
              <FileCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Sample Meeting Notes</span>
            </button>
            <button
              onClick={() => handleCreateDemo('sprint_retro')}
              disabled={isUploading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow-sm disabled:opacity-50"
              title="Create Sprint Retrospective sample PDF"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Sample Retrospective</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload & Library + Document Details Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column (5 cols): Upload Box + Document Library */}
        <div className="lg:col-span-5 space-y-6">

          {/* PDF Upload Box */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-purple-400" />
                Upload PDF Document
              </h3>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                Max 50MB
              </span>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-purple-500 bg-purple-500/10'
                    : selectedFile
                    ? 'border-emerald-500/60 bg-emerald-500/5'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                }`}
                onClick={() => document.getElementById('pdf-file-input').click()}
              >
                <input
                  id="pdf-file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform ${
                    selectedFile 
                      ? 'bg-emerald-500/20 text-emerald-400 scale-105' 
                      : 'bg-purple-500/10 text-purple-400'
                  }`}>
                    <FileText className="w-6 h-6" />
                  </div>

                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-300 truncate max-w-xs">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for upload & extraction
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-300">
                        Drag and drop your meeting <span className="text-purple-400 font-bold">.pdf</span> here
                      </p>
                      <p className="text-[11px] text-slate-500">
                        or click to browse files from your computer
                      </p>
                    </div>
                  )}

                  {/* Format Validation Tags */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                      ✓ .pdf Accepted
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold">
                      ✗ .jpg / .mp4 Rejected
                    </span>
                  </div>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Sprint 4 Retrospective Notes"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Upload Error feedback */}
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Progress bar */}
              {isUploading && (
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      Uploading & Extracting Text...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Document...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload & Extract PDF Text</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Document Library List */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-200">PDF Documents Library</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                  {documents.length}
                </span>
              </div>
              <button
                onClick={fetchDocuments}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Refresh library"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PDF documents..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Loading PDF Documents...</span>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                  <FileText className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                  <p>No PDF documents found.</p>
                  <p className="text-[11px] text-slate-600">Upload a PDF or click "Sample Meeting Notes" above.</p>
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isSelected = selectedDoc?._id === doc._id;
                  return (
                    <div
                      key={doc._id}
                      onClick={() => loadDocumentDetails(doc._id)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-purple-950/30 border-purple-500/50 shadow-md shadow-purple-950/40'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">
                            {doc.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate font-mono">
                            {doc.fileName || doc.filename}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
                          {doc.page_count || 1} {doc.page_count === 1 ? 'page' : 'pages'}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          {doc.uploadDate || doc.created_at?.slice(0, 10)}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-400">
                          <Hash className="w-3 h-3 text-slate-600" />
                          {doc.word_count || 0} words
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc._id);
                          }}
                          className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                          title="Delete PDF"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Column (7 cols): Document Details & Multi-Page Extracted Text Viewer */}
        <div className="lg:col-span-7 space-y-6">
          {selectedDoc ? (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
              
              {/* Document Header & Metadata Strip */}
              <div className="space-y-3 pb-4 border-b border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        PDF Document
                      </span>
                      <span className="text-[11px] text-slate-400">Status: {selectedDoc.status || 'Uploaded'}</span>
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="mt-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-purple-500 text-sm font-bold text-white focus:outline-none w-full"
                      />
                    ) : (
                      <h3 className="text-lg font-black text-white mt-1">
                        {selectedDoc.title}
                      </h3>
                    )}
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsSummaryOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98]"
                      title="Generate AI Summary from PDF text (Module 3)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>AI Summary</span>
                    </button>

                    <button
                      onClick={handleCopyText}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                      title="Copy full text to clipboard"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
                      <span>{copied ? 'Copied' : 'Copy Text'}</span>
                    </button>

                    <button
                      onClick={handleDownloadTxt}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                      title="Download extracted text as .txt"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Export .txt</span>
                    </button>

                    {selectedDoc.stored_filename && (
                      <a
                        href={documentService.getPdfDownloadUrl(selectedDoc.stored_filename)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold transition-all border border-purple-500/30"
                        title="Download or preview original PDF file"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Original PDF</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Metrics Pill Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Pages</span>
                    <p className="text-sm font-bold text-purple-400">{selectedDoc.page_count || 1}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Words</span>
                    <p className="text-sm font-bold text-indigo-400">{selectedDoc.word_count || 0}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">File Size</span>
                    <p className="text-sm font-bold text-slate-300">
                      {((selectedDoc.file_size || 0) / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Upload Date</span>
                    <p className="text-sm font-bold text-emerald-400">{selectedDoc.uploadDate || '2026-09-28'}</p>
                  </div>
                </div>
              </div>

              {/* Page Selector Tabs */}
              {selectedDoc.pages && selectedDoc.pages.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    onClick={() => setActivePage('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      activePage === 'all'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    All Pages ({selectedDoc.page_count})
                  </button>
                  {selectedDoc.pages.map((p) => (
                    <button
                      key={p.page_number}
                      onClick={() => setActivePage(p.page_number)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        activePage === p.page_number
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Page {p.page_number} ({p.word_count} words)
                    </button>
                  ))}
                </div>
              )}

              {/* In-text Search Bar & Edit Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={textSearch}
                    onChange={(e) => setTextSearch(e.target.value)}
                    placeholder="Search inside extracted text..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                  {textSearch && (
                    <button
                      onClick={() => setTextSearch('')}
                      className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                      >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save Changes</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditTitle(selectedDoc.title);
                          setEditText(selectedDoc.extracted_text);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit Text</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Extracted Text Content View */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    {activePage === 'all' ? 'Complete Extracted Text' : `Extracted Text — Page ${activePage}`}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Extracted via pdfplumber layout engine
                  </span>
                </div>

                {isEditing ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={16}
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500 resize-y leading-relaxed"
                  />
                ) : (
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 max-h-[460px] overflow-y-auto leading-relaxed text-xs text-slate-300 whitespace-pre-wrap font-sans selection:bg-purple-500/30">
                    {currentDisplayText ? (
                      renderHighlightedText(currentDisplayText, textSearch)
                    ) : (
                      <p className="text-slate-500 italic">No text extracted from this page.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Document Metadata Details Accordion */}
              {selectedDoc.metadata && Object.keys(selectedDoc.metadata).length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileCode className="w-3 h-3 text-purple-400" />
                    PDF Document Metadata
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400">
                    {Object.entries(selectedDoc.metadata).map(([k, v]) => (
                      <div key={k} className="truncate">
                        <span className="text-slate-500 font-semibold">{k}:</span> {String(v)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="h-full min-h-[450px] p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col items-center justify-center text-center gap-3">
              <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <FileText className="w-8 h-8 text-purple-400" />
              </div>
              <h4 className="text-base font-bold text-white">No PDF Document Selected</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Select an uploaded meeting document from the library on the left, or upload a new PDF file using the dropzone.
              </p>
              <button
                onClick={() => handleCreateDemo('meeting_notes')}
                className="mt-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20"
              >
                Generate Sample Meeting PDF
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Module 3: AI Summary Generator Modal for PDF */}
      {selectedDoc && (
        <SummaryViewerModal
          isOpen={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          sourceId={selectedDoc._id}
          sourceType="document"
          sourceTitle={selectedDoc.title || selectedDoc.fileName}
          sourceText={selectedDoc.extracted_text}
        />
      )}
    </div>
  );
};

export default PdfDocumentManager;
