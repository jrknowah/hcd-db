// src/store/slices/nursingArchiveSlice.js - FIXED VERSION
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ✅ FIXED: Consistent API base URL using import.meta.env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ✅ FIXED: Consistent mock data helper function
const shouldUseMockData = (clientID) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isMockClient = clientID === 'mock-123' || clientID?.toString().startsWith('mock-');
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  
  return isDevelopment && isMockClient && !forceRealData;
};

// ✅ Async Thunks for API Calls

// Fetch documents for a client
export const fetchDocuments = createAsyncThunk(
    'nursingArchive/fetchDocuments',
    async (clientID, { rejectWithValue, getState }) => {
        const { nursingArchive } = getState();
        
        // ✅ FIXED: Use consistent mock data checking
        if (shouldUseMockData(clientID)) {
            console.log("🔧 Mock mode: Returning mock documents for", clientID);
            return [
                {
                    archiveID: 1,
                    documentName: "Nursing Assessment Form - July 2025",
                    originalFileName: "nursing_assessment_20250717.pdf",
                    fileExtension: "pdf",
                    fileSize: 245760,
                    categoryName: "Nursing Notes",
                    description: "Initial nursing assessment for client admission",
                    documentDate: "2025-07-17",
                    confidentialityLevel: "Standard",
                    uploadedBy: "nurse@hospital.com",
                    uploadedAt: "2025-07-17T10:30:00Z",
                    downloadCount: 3
                },
                {
                    archiveID: 2,
                    documentName: "Lab Results - Complete Blood Count",
                    originalFileName: "cbc_results_20250716.pdf",
                    fileExtension: "pdf",
                    fileSize: 189440,
                    categoryName: "Lab Reports",
                    description: "CBC results showing normal values",
                    documentDate: "2025-07-16",
                    confidentialityLevel: "Confidential",
                    uploadedBy: "lab@hospital.com",
                    uploadedAt: "2025-07-16T14:20:00Z",
                    downloadCount: 5
                },
                {
                    archiveID: 3,
                    documentName: "Chest X-Ray",
                    originalFileName: "chest_xray_20250715.jpg",
                    fileExtension: "jpg",
                    fileSize: 512000,
                    categoryName: "Imaging",
                    description: "Chest X-ray showing clear lungs",
                    documentDate: "2025-07-15",
                    confidentialityLevel: "Confidential",
                    uploadedBy: "radiologist@hospital.com",
                    uploadedAt: "2025-07-15T09:15:00Z",
                    downloadCount: 2
                }
            ];
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/nursing-archive/${clientID}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return []; // No documents found
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Fetch documents failed:', error);
            return rejectWithValue(error.message || 'Failed to fetch documents');
        }
    }
);

// Upload document
export const uploadDocument = createAsyncThunk(
    'nursingArchive/uploadDocument',
    async ({ clientID, formData }, { rejectWithValue }) => {
        
        // ✅ FIXED: Use consistent mock data checking
        if (shouldUseMockData(clientID)) {
            console.log("🔧 Mock mode: Simulating document upload for", clientID);
            return {
                archiveID: Date.now(),
                documentName: "Mock Document",
                originalFileName: "mock_document.pdf",
                fileExtension: "pdf",
                fileSize: 100000,
                categoryName: "Nursing Notes",
                description: "Mock uploaded document",
                documentDate: new Date().toISOString().split('T')[0],
                confidentialityLevel: "Standard",
                uploadedBy: "user@hospital.com",
                uploadedAt: new Date().toISOString(),
                downloadCount: 0
            };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/nursing-archive/${clientID}/upload`, {
                method: 'POST',
                body: formData, // FormData object
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Upload document failed:', error);
            return rejectWithValue(error.message || 'Failed to upload document');
        }
    }
);

// Download document
export const downloadDocument = createAsyncThunk(
    'nursingArchive/downloadDocument',
    async ({ documentID, fileName }, { rejectWithValue }) => {
        
        // ✅ FIXED: Mock download for development
        if (shouldUseMockData('mock-123')) {
            console.log("🔧 Mock mode: Simulating document download for", documentID);
            // Create a mock file download
            const link = document.createElement('a');
            link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('Mock document content');
            link.download = fileName;
            link.click();
            return { success: true, fileName };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/nursing-archive/document/${documentID}/download`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            window.URL.revokeObjectURL(url);

            return { success: true, fileName };
        } catch (error) {
            console.error('Download document failed:', error);
            return rejectWithValue(error.message || 'Failed to download document');
        }
    }
);

// Delete document
export const deleteDocument = createAsyncThunk(
    'nursingArchive/deleteDocument',
    async (documentID, { rejectWithValue }) => {
        
        // ✅ FIXED: Mock delete for development
        if (shouldUseMockData('mock-123')) {
            console.log("🔧 Mock mode: Simulating document delete for", documentID);
            return { documentID, deleted: true };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/nursing-archive/document/${documentID}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return { documentID, ...data };
        } catch (error) {
            console.error('Delete document failed:', error);
            return rejectWithValue(error.message || 'Failed to delete document');
        }
    }
);

// Search documents
export const searchDocuments = createAsyncThunk(
    'nursingArchive/searchDocuments',
    async ({ clientID, query, filters }, { rejectWithValue, getState }) => {
        const { nursingArchive } = getState();
        
        // ✅ FIXED: Mock search for development
        if (shouldUseMockData(clientID)) {
            console.log("🔧 Mock mode: Simulating document search for", clientID);
            // Simple mock search logic
            const mockDocuments = nursingArchive.documents || [];
            return mockDocuments.filter(doc => 
                doc.documentName.toLowerCase().includes(query.toLowerCase()) ||
                doc.description.toLowerCase().includes(query.toLowerCase())
            );
        }

        try {
            const queryParams = new URLSearchParams({
                q: query,
                ...filters
            });

            const response = await fetch(`${API_BASE_URL}/api/nursing-archive/${clientID}/search?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Search documents failed:', error);
            return rejectWithValue(error.message || 'Failed to search documents');
        }
    }
);

// Fetch categories
export const fetchCategories = createAsyncThunk(
    'nursingArchive/fetchCategories',
    async (_, { rejectWithValue }) => {
        
        // ✅ FIXED: Mock categories for development
        if (import.meta.env.MODE === 'development') {
            console.log("🔧 Mock mode: Returning mock categories");
            return [
                { id: 1, name: 'Nursing Notes', description: 'General nursing documentation' },
                { id: 2, name: 'Lab Reports', description: 'Laboratory test results' },
                { id: 3, name: 'Imaging', description: 'Medical imaging documents' },
                { id: 4, name: 'Medications', description: 'Medication administration records' },
                { id: 5, name: 'Assessments', description: 'Patient assessments and evaluations' },
                { id: 6, name: 'Care Plans', description: 'Care planning documents' },
                { id: 7, name: 'Forms', description: 'Various medical forms' },
                { id: 8, name: 'Images', description: 'Photo documentation' }
            ];
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/nursing-archive/categories`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Fetch categories failed:', error);
            return rejectWithValue(error.message || 'Failed to fetch categories');
        }
    }
);

// Share document
export const shareDocument = createAsyncThunk(
    'nursingArchive/shareDocument',
    async ({ documentID, shareData }, { rejectWithValue }) => {
        
        // ✅ FIXED: Mock share for development
        if (shouldUseMockData('mock-123')) {
            console.log("🔧 Mock mode: Simulating document share for", documentID);
            return {
                shareID: 'SHARE-' + Date.now(),
                shareLink: `https://mock-hospital.com/share/${documentID}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/nursing-archive/document/${documentID}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(shareData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Share document failed:', error);
            return rejectWithValue(error.message || 'Failed to share document');
        }
    }
);

// ✅ Initial State
const initialState = {
    // Document lists
    documents: [],
    documentsLoading: false,
    documentsError: null,
    
    // Upload states
    uploading: false,
    uploadProgress: 0,
    uploadError: null,
    uploadSuccess: false,
    
    // Current document
    currentDocument: null,
    documentLoading: false,
    documentError: null,
    
    // Categories
    categories: [],
    categoriesLoading: false,
    categoriesError: null,
    
    // Search and filters
    searchQuery: '',
    selectedCategory: null,
    dateRange: { start: null, end: null },
    filteredDocuments: [],
    
    // File operations
    downloading: false,
    downloadError: null,
    deleting: false,
    deleteError: null,
    
    // Sharing
    sharing: false,
    shareError: null,
    shareSuccess: false,
    shareData: null,
    
    // Audit trail
    auditLog: [],
    auditLoading: false,
    auditError: null,
    
    // Settings
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'],
    
    // ✅ FIXED: Consistent mock data flag
    useMockData: import.meta.env.MODE === 'development',
    
    // Activity tracking
    lastActivity: null,
    statsData: {
        totalDocuments: 0,
        totalSize: 0,
        totalDownloads: 0
    }
};

// ✅ Create Slice
const nursingArchiveSlice = createSlice({
    name: 'nursingArchive',
    initialState,
    reducers: {
        // Clear all errors
        clearErrors: (state) => {
            state.documentsError = null;
            state.uploadError = null;
            state.documentError = null;
            state.categoriesError = null;
            state.downloadError = null;
            state.deleteError = null;
            state.shareError = null;
            state.auditError = null;
        },
        
        // Clear upload success flag
        clearUploadSuccess: (state) => {
            state.uploadSuccess = false;
        },
        
        // Clear share success flag
        clearShareSuccess: (state) => {
            state.shareSuccess = false;
            state.shareData = null;
        },
        
        // Update search query
        setSearchQuery: (state, action) => {
            state.searchQuery = action.payload;
        },
        
        // Update selected category filter
        setSelectedCategory: (state, action) => {
            state.selectedCategory = action.payload;
        },
        
        // Update date range filter
        setDateRange: (state, action) => {
            state.dateRange = action.payload;
        },
        
        // Update filtered documents
        setFilteredDocuments: (state, action) => {
            state.filteredDocuments = action.payload;
        },
        
        // Update upload progress
        setUploadProgress: (state, action) => {
            state.uploadProgress = action.payload;
        },
        
        // Toggle mock data
        toggleMockData: (state) => {
            state.useMockData = !state.useMockData;
        },
        
        // Set mock data flag
        setMockData: (state, action) => {
            state.useMockData = action.payload;
        },
        
        // Update activity tracking
        updateActivity: (state) => {
            state.lastActivity = new Date().toISOString();
        },
        
        // Update statistics
        updateStats: (state) => {
            state.statsData = {
                totalDocuments: state.documents.length,
                totalSize: state.documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0),
                totalDownloads: state.documents.reduce((sum, doc) => sum + (doc.downloadCount || 0), 0)
            };
        }
    },
    extraReducers: (builder) => {
        builder
            // ✅ Fetch Documents
            .addCase(fetchDocuments.pending, (state) => {
                state.documentsLoading = true;
                state.documentsError = null;
            })
            .addCase(fetchDocuments.fulfilled, (state, action) => {
                state.documentsLoading = false;
                state.documents = action.payload || [];
                state.documentsError = null;
                // Update stats
                state.statsData = {
                    totalDocuments: action.payload?.length || 0,
                    totalSize: action.payload?.reduce((sum, doc) => sum + (doc.fileSize || 0), 0) || 0,
                    totalDownloads: action.payload?.reduce((sum, doc) => sum + (doc.downloadCount || 0), 0) || 0
                };
            })
            .addCase(fetchDocuments.rejected, (state, action) => {
                state.documentsLoading = false;
                state.documentsError = action.payload || 'Failed to fetch documents';
            })
            
            // ✅ Upload Document
            .addCase(uploadDocument.pending, (state) => {
                state.uploading = true;
                state.uploadError = null;
                state.uploadSuccess = false;
                state.uploadProgress = 0;
            })
            .addCase(uploadDocument.fulfilled, (state, action) => {
                state.uploading = false;
                state.uploadSuccess = true;
                state.uploadError = null;
                state.uploadProgress = 100;
                // Add new document to list
                if (action.payload) {
                    state.documents.unshift(action.payload);
                }
            })
            .addCase(uploadDocument.rejected, (state, action) => {
                state.uploading = false;
                state.uploadError = action.payload || 'Failed to upload document';
                state.uploadSuccess = false;
                state.uploadProgress = 0;
            })
            
            // ✅ Download Document
            .addCase(downloadDocument.pending, (state) => {
                state.downloading = true;
                state.downloadError = null;
            })
            .addCase(downloadDocument.fulfilled, (state, action) => {
                state.downloading = false;
                state.downloadError = null;
                // Increment download count for the document
                const document = state.documents.find(doc => doc.fileName === action.payload.fileName);
                if (document) {
                    document.downloadCount = (document.downloadCount || 0) + 1;
                }
            })
            .addCase(downloadDocument.rejected, (state, action) => {
                state.downloading = false;
                state.downloadError = action.payload || 'Failed to download document';
            })
            
            // ✅ Delete Document
            .addCase(deleteDocument.pending, (state) => {
                state.deleting = true;
                state.deleteError = null;
            })
            .addCase(deleteDocument.fulfilled, (state, action) => {
                state.deleting = false;
                state.deleteError = null;
                // Remove document from list
                state.documents = state.documents.filter(doc => doc.archiveID !== action.payload.documentID);
            })
            .addCase(deleteDocument.rejected, (state, action) => {
                state.deleting = false;
                state.deleteError = action.payload || 'Failed to delete document';
            })
            
            // ✅ Search Documents
            .addCase(searchDocuments.pending, (state) => {
                state.documentsLoading = true;
                state.documentsError = null;
            })
            .addCase(searchDocuments.fulfilled, (state, action) => {
                state.documentsLoading = false;
                state.filteredDocuments = action.payload || [];
                state.documentsError = null;
            })
            .addCase(searchDocuments.rejected, (state, action) => {
                state.documentsLoading = false;
                state.documentsError = action.payload || 'Failed to search documents';
            })
            
            // ✅ Fetch Categories
            .addCase(fetchCategories.pending, (state) => {
                state.categoriesLoading = true;
                state.categoriesError = null;
            })
            .addCase(fetchCategories.fulfilled, (state, action) => {
                state.categoriesLoading = false;
                state.categories = action.payload || [];
                state.categoriesError = null;
            })
            .addCase(fetchCategories.rejected, (state, action) => {
                state.categoriesLoading = false;
                state.categoriesError = action.payload || 'Failed to fetch categories';
            })
            
            // ✅ Share Document
            .addCase(shareDocument.pending, (state) => {
                state.sharing = true;
                state.shareError = null;
                state.shareSuccess = false;
            })
            .addCase(shareDocument.fulfilled, (state, action) => {
                state.sharing = false;
                state.shareSuccess = true;
                state.shareError = null;
                state.shareData = action.payload;
            })
            .addCase(shareDocument.rejected, (state, action) => {
                state.sharing = false;
                state.shareError = action.payload || 'Failed to share document';
                state.shareSuccess = false;
            });
    }
});

// ✅ Export Actions
export const {
    clearErrors,
    clearUploadSuccess,
    clearShareSuccess,
    setSearchQuery,
    setSelectedCategory,
    setDateRange,
    setFilteredDocuments,
    setUploadProgress,
    toggleMockData,
    setMockData,
    updateActivity,
    updateStats
} = nursingArchiveSlice.actions;

// ✅ Selectors
export const selectDocuments = (state) => state.nursingArchive.documents;
export const selectDocumentsLoading = (state) => state.nursingArchive.documentsLoading;
export const selectDocumentsError = (state) => state.nursingArchive.documentsError;
export const selectUploading = (state) => state.nursingArchive.uploading;
export const selectUploadProgress = (state) => state.nursingArchive.uploadProgress;
export const selectUploadSuccess = (state) => state.nursingArchive.uploadSuccess;
export const selectCategories = (state) => state.nursingArchive.categories;
export const selectSearchQuery = (state) => state.nursingArchive.searchQuery;
export const selectSelectedCategory = (state) => state.nursingArchive.selectedCategory;
export const selectFilteredDocuments = (state) => state.nursingArchive.filteredDocuments;
export const selectStatsData = (state) => state.nursingArchive.statsData;
export const selectUseMockData = (state) => state.nursingArchive.useMockData;

// ✅ Export Reducer
export default nursingArchiveSlice.reducer;