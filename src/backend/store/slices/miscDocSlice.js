import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Mock data for development
const mockDocuments = [
  {
    documentID: 1,
    clientID: 'CLIENT-123',
    fileName: 'medical-records.pdf',
    originalFileName: 'medical-records.pdf',
    fileSize: 2456789,
    mimeType: 'application/pdf',
    filePath: '/uploads/docs/medical-records.pdf',
    documentCategory: 'medical',
    documentDescription: 'Latest medical examination results and treatment history',
    uploadDate: '2025-07-15',
    lastAccessed: '2025-07-16',
    accessCount: 3,
    isArchived: false,
    retentionDate: '2027-07-15',
    confidentialityLevel: 'High',
    uploadedBy: 'john.doe@example.com',
    approvedBy: 'jane.smith@example.com',
    approvalDate: '2025-07-15',
    version: 1,
    checksum: 'abc123def456',
    tags: ['medical', 'current', 'treatment'],
    relatedDocuments: [],
    createdBy: 'john.doe@example.com',
    createdAt: '2025-07-15T10:00:00Z',
    updatedBy: 'john.doe@example.com',
    updatedAt: '2025-07-15T10:00:00Z'
  },
  {
    documentID: 2,
    clientID: 'CLIENT-123',
    fileName: 'benefits-letter.pdf',
    originalFileName: 'SSI_Approval_Letter.pdf',
    fileSize: 1234567,
    mimeType: 'application/pdf',
    filePath: '/uploads/docs/benefits-letter.pdf',
    documentCategory: 'benefits',
    documentDescription: 'SSI benefits approval letter with monthly amount details',
    uploadDate: '2025-07-14',
    lastAccessed: '2025-07-15',
    accessCount: 5,
    isArchived: false,
    retentionDate: '2030-07-14',
    confidentialityLevel: 'Medium',
    uploadedBy: 'jane.smith@example.com',
    approvedBy: 'admin@example.com',
    approvalDate: '2025-07-14',
    version: 1,
    checksum: 'def456ghi789',
    tags: ['benefits', 'ssi', 'approved'],
    relatedDocuments: [],
    createdBy: 'jane.smith@example.com',
    createdAt: '2025-07-14T14:00:00Z',
    updatedBy: 'jane.smith@example.com',
    updatedAt: '2025-07-14T14:00:00Z'
  },
  {
    documentID: 3,
    clientID: 'CLIENT-123',
    fileName: 'housing-application.pdf',
    originalFileName: 'Housing_Application_Form.pdf',
    fileSize: 987654,
    mimeType: 'application/pdf',
    filePath: '/uploads/docs/housing-application.pdf',
    documentCategory: 'housing',
    documentDescription: 'Completed housing assistance application form',
    uploadDate: '2025-07-13',
    lastAccessed: '2025-07-14',
    accessCount: 2,
    isArchived: false,
    retentionDate: '2026-07-13',
    confidentialityLevel: 'Medium',
    uploadedBy: 'mike.rodriguez@example.com',
    approvedBy: 'jane.smith@example.com',
    approvalDate: '2025-07-13',
    version: 2,
    checksum: 'ghi789jkl012',
    tags: ['housing', 'application', 'pending'],
    relatedDocuments: [1],
    createdBy: 'mike.rodriguez@example.com',
    createdAt: '2025-07-13T09:00:00Z',
    updatedBy: 'mike.rodriguez@example.com',
    updatedAt: '2025-07-13T15:00:00Z'
  }
];

const mockCategories = [
  { category: 'general', label: 'General Documents', count: 0 },
  { category: 'medical', label: 'Medical Records', count: 1 },
  { category: 'legal', label: 'Legal Documents', count: 0 },
  { category: 'financial', label: 'Financial Records', count: 0 },
  { category: 'identification', label: 'Identification', count: 0 },
  { category: 'benefits', label: 'Benefits Documentation', count: 1 },
  { category: 'housing', label: 'Housing Documents', count: 1 },
  { category: 'employment', label: 'Employment Records', count: 0 },
  { category: 'other', label: 'Other', count: 0 }
];

const mockSummary = {
  totalDocuments: 3,
  totalFileSize: 4678010,
  documentsByCategory: {
    'medical': 1,
    'benefits': 1,
    'housing': 1
  },
  recentUploads: 3,
  pendingApprovals: 0,
  archivedDocuments: 0,
  averageFileSize: 1559336.67,
  lastUpload: '2025-07-15',
  mostAccessedDocument: 'benefits-letter.pdf',
  retentionAlerts: 0
};

// Async thunks
export const fetchMiscDocuments = createAsyncThunk(
  'miscDoc/fetchMiscDocuments',
  async (clientID, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return mockDocuments.filter(doc => doc.clientID === clientID);
      }

      const response = await fetch(`/api/misc-documents/${clientID}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const uploadMiscDocument = createAsyncThunk(
  'miscDoc/uploadMiscDocument',
  async ({ clientID, formData }, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const file = formData.get('file');
        return {
          documentID: Date.now(),
          clientID,
          fileName: file.name,
          originalFileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          filePath: `/uploads/docs/${file.name}`,
          documentCategory: formData.get('category') || 'general',
          documentDescription: formData.get('description') || '',
          uploadDate: new Date().toISOString().split('T')[0],
          lastAccessed: null,
          accessCount: 0,
          isArchived: false,
          retentionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2).toISOString().split('T')[0],
          confidentialityLevel: 'Medium',
          uploadedBy: formData.get('uploadedBy') || 'system',
          approvedBy: null,
          approvalDate: null,
          version: 1,
          checksum: Math.random().toString(36).substr(2, 9),
          tags: [formData.get('category') || 'general'],
          relatedDocuments: [],
          createdBy: formData.get('uploadedBy') || 'system',
          createdAt: new Date().toISOString(),
          updatedBy: formData.get('uploadedBy') || 'system',
          updatedAt: new Date().toISOString()
        };
      }

      const response = await fetch(`/api/misc-documents/${clientID}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateMiscDocument = createAsyncThunk(
  'miscDoc/updateMiscDocument',
  async ({ documentID, updateData }, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return { ...updateData, documentID, updatedAt: new Date().toISOString() };
      }

      const response = await fetch(`/api/misc-documents/${documentID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteMiscDocument = createAsyncThunk(
  'miscDoc/deleteMiscDocument',
  async (documentID, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return documentID;
      }

      const response = await fetch(`/api/misc-documents/${documentID}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return documentID;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDocumentCategories = createAsyncThunk(
  'miscDoc/fetchDocumentCategories',
  async (clientID, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 400));
        return mockCategories;
      }

      const response = await fetch(`/api/misc-documents/${clientID}/categories`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDocumentSummary = createAsyncThunk(
  'miscDoc/fetchDocumentSummary',
  async (clientID, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockSummary;
      }

      const response = await fetch(`/api/misc-documents/${clientID}/summary`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const downloadDocument = createAsyncThunk(
  'miscDoc/downloadDocument',
  async ({ documentID, fileName }, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Create a mock download (in real app, this would trigger actual download)
        return { message: `Mock download of ${fileName}` };
      }

      const response = await fetch(`/api/misc-documents/${documentID}/download`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { message: 'File downloaded successfully' };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const approveDocument = createAsyncThunk(
  'miscDoc/approveDocument',
  async ({ documentID, approvedBy }, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          documentID,
          approvedBy,
          approvalDate: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString()
        };
      }

      const response = await fetch(`/api/misc-documents/${documentID}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approvedBy }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const archiveDocument = createAsyncThunk(
  'miscDoc/archiveDocument',
  async ({ documentID, isArchived }, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          documentID,
          isArchived,
          updatedAt: new Date().toISOString()
        };
      }

      const response = await fetch(`/api/misc-documents/${documentID}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isArchived }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Documents
  documents: [],
  documentsLoading: false,
  documentsError: null,
  
  // Categories
  categories: [],
  categoriesLoading: false,
  categoriesError: null,
  
  // Summary
  summary: {},
  summaryLoading: false,
  summaryError: null,
  
  // Current document
  currentDocument: {},
  documentSaving: false,
  documentSaveError: null,
  documentSaveSuccess: false,
  
  // File upload
  uploading: false,
  uploadError: null,
  uploadSuccess: false,
  uploadProgress: 0,
  
  // Download
  downloading: false,
  downloadError: null,
  downloadSuccess: false,
  
  // Filters
  categoryFilter: '',
  confidentialityFilter: '',
  dateFilter: '',
  searchQuery: '',
  
  // UI states
  selectedDocuments: [],
  viewMode: 'list',
  sortBy: 'uploadDate',
  sortOrder: 'desc',
  showArchived: false,
  
  // Mock data flag
  useMockData: localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development'
};

const miscDocSlice = createSlice({
  name: 'miscDoc',
  initialState,
  reducers: {
    clearError: (state) => {
      state.documentsError = null;
      state.documentSaveError = null;
      state.uploadError = null;
      state.downloadError = null;
      state.categoriesError = null;
      state.summaryError = null;
    },
    clearSaveSuccess: (state) => {
      state.documentSaveSuccess = false;
      state.uploadSuccess = false;
      state.downloadSuccess = false;
    },
    setCurrentDocument: (state, action) => {
      state.currentDocument = action.payload;
    },
    clearCurrentDocument: (state) => {
      state.currentDocument = {};
    },
    setCategoryFilter: (state, action) => {
      state.categoryFilter = action.payload;
    },
    setConfidentialityFilter: (state, action) => {
      state.confidentialityFilter = action.payload;
    },
    setDateFilter: (state, action) => {
      state.dateFilter = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    clearFilters: (state) => {
      state.categoryFilter = '';
      state.confidentialityFilter = '';
      state.dateFilter = '';
      state.searchQuery = '';
    },
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
    setSortBy: (state, action) => {
      state.sortBy = action.payload;
    },
    setSortOrder: (state, action) => {
      state.sortOrder = action.payload;
    },
    toggleSort: (state, action) => {
      if (state.sortBy === action.payload) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = action.payload;
        state.sortOrder = 'asc';
      }
    },
    toggleShowArchived: (state) => {
      state.showArchived = !state.showArchived;
    },
    selectDocument: (state, action) => {
      if (!state.selectedDocuments.includes(action.payload)) {
        state.selectedDocuments.push(action.payload);
      }
    },
    deselectDocument: (state, action) => {
      state.selectedDocuments = state.selectedDocuments.filter(id => id !== action.payload);
    },
    selectAllDocuments: (state) => {
      state.selectedDocuments = state.documents.map(doc => doc.documentID);
    },
    deselectAllDocuments: (state) => {
      state.selectedDocuments = [];
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    setMockDataFlag: (state, action) => {
      state.useMockData = action.payload;
      localStorage.setItem('useMockData', action.payload.toString());
    },
    resetState: (state) => {
      return { ...initialState, useMockData: state.useMockData };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Misc Documents
      .addCase(fetchMiscDocuments.pending, (state) => {
        state.documentsLoading = true;
        state.documentsError = null;
      })
      .addCase(fetchMiscDocuments.fulfilled, (state, action) => {
        state.documentsLoading = false;
        state.documents = action.payload;
        state.documentsError = null;
      })
      .addCase(fetchMiscDocuments.rejected, (state, action) => {
        state.documentsLoading = false;
        state.documentsError = action.payload;
      })
      
      // Upload Misc Document
      .addCase(uploadMiscDocument.pending, (state) => {
        state.uploading = true;
        state.uploadError = null;
        state.uploadSuccess = false;
        state.uploadProgress = 0;
      })
      .addCase(uploadMiscDocument.fulfilled, (state, action) => {
        state.uploading = false;
        state.documents.unshift(action.payload);
        state.uploadSuccess = true;
        state.uploadError = null;
        state.uploadProgress = 100;
      })
      .addCase(uploadMiscDocument.rejected, (state, action) => {
        state.uploading = false;
        state.uploadError = action.payload;
        state.uploadSuccess = false;
        state.uploadProgress = 0;
      })
      
      // Update Misc Document
      .addCase(updateMiscDocument.pending, (state) => {
        state.documentSaving = true;
        state.documentSaveError = null;
      })
      .addCase(updateMiscDocument.fulfilled, (state, action) => {
        state.documentSaving = false;
        const index = state.documents.findIndex(doc => doc.documentID === action.payload.documentID);
        if (index !== -1) {
          state.documents[index] = { ...state.documents[index], ...action.payload };
        }
        state.documentSaveError = null;
      })
      .addCase(updateMiscDocument.rejected, (state, action) => {
        state.documentSaving = false;
        state.documentSaveError = action.payload;
      })
      
      // Delete Misc Document
      .addCase(deleteMiscDocument.pending, (state) => {
        state.documentSaving = true;
        state.documentSaveError = null;
      })
      .addCase(deleteMiscDocument.fulfilled, (state, action) => {
        state.documentSaving = false;
        state.documents = state.documents.filter(doc => doc.documentID !== action.payload);
        state.selectedDocuments = state.selectedDocuments.filter(id => id !== action.payload);
        state.documentSaveError = null;
      })
      .addCase(deleteMiscDocument.rejected, (state, action) => {
        state.documentSaving = false;
        state.documentSaveError = action.payload;
      })
      
      // Fetch Document Categories
      .addCase(fetchDocumentCategories.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(fetchDocumentCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload;
        state.categoriesError = null;
      })
      .addCase(fetchDocumentCategories.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.payload;
      })
      
      // Fetch Document Summary
      .addCase(fetchDocumentSummary.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchDocumentSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summary = action.payload;
        state.summaryError = null;
      })
      .addCase(fetchDocumentSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = action.payload;
      })
      
      // Download Document
      .addCase(downloadDocument.pending, (state) => {
        state.downloading = true;
        state.downloadError = null;
        state.downloadSuccess = false;
      })
      .addCase(downloadDocument.fulfilled, (state, action) => {
        state.downloading = false;
        state.downloadSuccess = true;
        state.downloadError = null;
      })
      .addCase(downloadDocument.rejected, (state, action) => {
        state.downloading = false;
        state.downloadError = action.payload;
        state.downloadSuccess = false;
      })
      
      // Approve Document
      .addCase(approveDocument.pending, (state) => {
        state.documentSaving = true;
        state.documentSaveError = null;
      })
      .addCase(approveDocument.fulfilled, (state, action) => {
        state.documentSaving = false;
        const index = state.documents.findIndex(doc => doc.documentID === action.payload.documentID);
        if (index !== -1) {
          state.documents[index] = { ...state.documents[index], ...action.payload };
        }
        state.documentSaveError = null;
      })
      .addCase(approveDocument.rejected, (state, action) => {
        state.documentSaving = false;
        state.documentSaveError = action.payload;
      })
      
      // Archive Document
      .addCase(archiveDocument.pending, (state) => {
        state.documentSaving = true;
        state.documentSaveError = null;
      })
      .addCase(archiveDocument.fulfilled, (state, action) => {
        state.documentSaving = false;
        const index = state.documents.findIndex(doc => doc.documentID === action.payload.documentID);
        if (index !== -1) {
          state.documents[index] = { ...state.documents[index], ...action.payload };
        }
        state.documentSaveError = null;
      })
      .addCase(archiveDocument.rejected, (state, action) => {
        state.documentSaving = false;
        state.documentSaveError = action.payload;
      });
  },
});

export const {
  clearError,
  clearSaveSuccess,
  setCurrentDocument,
  clearCurrentDocument,
  setCategoryFilter,
  setConfidentialityFilter,
  setDateFilter,
  setSearchQuery,
  clearFilters,
  setViewMode,
  setSortBy,
  setSortOrder,
  toggleSort,
  toggleShowArchived,
  selectDocument,
  deselectDocument,
  selectAllDocuments,
  deselectAllDocuments,
  setUploadProgress,
  setMockDataFlag,
  resetState
} = miscDocSlice.actions;

export default miscDocSlice.reducer;