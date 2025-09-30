import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Mock data for development
const mockInventoryItems = [
  {
    inventoryID: 1,
    clientID: 'CLIENT-123',
    itemName: 'iPhone 15',
    itemDescription: 'Personal mobile phone, space gray color',
    itemCategory: 'Electronics',
    itemCondition: 'Excellent',
    estimatedValue: 899.99,
    itemStatus: 'In Possession',
    locationStored: 'Client possession',
    storageDate: '2025-07-15',
    returnDate: null,
    photoDocs: 'iphone_photo.jpg',
    receiptDocs: 'iphone_receipt.pdf',
    insuranceCovered: true,
    insuranceClaimNumber: 'INS-2025-001',
    ownershipVerified: true,
    verificationMethod: 'Receipt provided',
    verifiedBy: 'John Doe, Case Manager',
    verificationDate: '2025-07-15',
    handledBy: 'Sarah Johnson',
    nextOfKinNotified: true,
    nextOfKinSignature: 'nok_signature.pdf',
    createdBy: 'test@example.com',
    createdAt: '2025-07-15T10:00:00Z',
    updatedBy: 'test@example.com',
    updatedAt: '2025-07-15T14:30:00Z'
  },
  {
    inventoryID: 2,
    clientID: 'CLIENT-123',
    itemName: 'Wedding Ring',
    itemDescription: 'Gold wedding band with inscription',
    itemCategory: 'Jewelry',
    itemCondition: 'Good',
    estimatedValue: 450.00,
    itemStatus: 'Stored',
    locationStored: 'Facility Safe - A1-234',
    storageDate: '2025-07-10',
    returnDate: null,
    photoDocs: 'ring_photo.jpg',
    receiptDocs: null,
    insuranceCovered: false,
    insuranceClaimNumber: null,
    ownershipVerified: true,
    verificationMethod: 'Family verification',
    verifiedBy: 'Lisa Chen',
    verificationDate: '2025-07-10',
    handledBy: 'Michael Rodriguez',
    nextOfKinNotified: true,
    nextOfKinSignature: 'family_signature.pdf',
    createdBy: 'test@example.com',
    createdAt: '2025-07-10T09:00:00Z',
    updatedBy: 'test@example.com',
    updatedAt: '2025-07-10T09:00:00Z'
  },
  {
    inventoryID: 3,
    clientID: 'CLIENT-123',
    itemName: 'Wallet with Contents',
    itemDescription: 'Brown leather wallet containing ID cards and $45 cash',
    itemCategory: 'Personal Items',
    itemCondition: 'Fair',
    estimatedValue: 75.00,
    itemStatus: 'Returned',
    locationStored: 'Returned to client',
    storageDate: '2025-07-05',
    returnDate: '2025-07-12',
    photoDocs: 'wallet_photo.jpg',
    receiptDocs: null,
    insuranceCovered: false,
    insuranceClaimNumber: null,
    ownershipVerified: true,
    verificationMethod: 'ID match',
    verifiedBy: 'Jane Smith',
    verificationDate: '2025-07-05',
    handledBy: 'Sarah Johnson',
    nextOfKinNotified: false,
    nextOfKinSignature: null,
    createdBy: 'test@example.com',
    createdAt: '2025-07-05T08:00:00Z',
    updatedBy: 'test@example.com',
    updatedAt: '2025-07-12T16:00:00Z'
  }
];

const mockCategories = [
  { category: 'Electronics', count: 1 },
  { category: 'Jewelry', count: 1 },
  { category: 'Personal Items', count: 1 },
  { category: 'Clothing', count: 0 },
  { category: 'Documents', count: 0 },
  { category: 'Medical Equipment', count: 0 },
  { category: 'Other', count: 0 }
];

const mockSummary = {
  totalItems: 3,
  totalValue: 1424.99,
  itemsInPossession: 1,
  itemsStored: 1,
  itemsReturned: 1,
  itemsMissing: 0,
  insuranceCovered: 1,
  ownershipVerified: 3,
  averageItemValue: 474.99,
  lastUpdated: '2025-07-15'
};

// Async thunks
export const fetchPersonalInventory = createAsyncThunk(
  'personalInventory/fetchPersonalInventory',
  async (clientID, { rejectWithValue }) => {
    try {
      // Check for mock data flag
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        return mockInventoryItems.filter(item => item.clientID === clientID);
      }

      const response = await fetch(`/api/personal-inventory/${clientID}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No inventory items found
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const addInventoryItem = createAsyncThunk(
  'personalInventory/addInventoryItem',
  async (itemData, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          ...itemData,
          inventoryID: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      const response = await fetch(`/api/personal-inventory/${itemData.clientID}/item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
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

export const updateInventoryItem = createAsyncThunk(
  'personalInventory/updateInventoryItem',
  async ({ inventoryID, updateData }, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return { ...updateData, inventoryID, updatedAt: new Date().toISOString() };
      }

      const response = await fetch(`/api/personal-inventory/item/${inventoryID}`, {
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

export const deleteInventoryItem = createAsyncThunk(
  'personalInventory/deleteInventoryItem',
  async (inventoryID, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return inventoryID;
      }

      const response = await fetch(`/api/personal-inventory/item/${inventoryID}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return inventoryID;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchInventoryCategories = createAsyncThunk(
  'personalInventory/fetchInventoryCategories',
  async (clientID, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 400));
        return mockCategories;
      }

      const response = await fetch(`/api/personal-inventory/${clientID}/categories`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchInventorySummary = createAsyncThunk(
  'personalInventory/fetchInventorySummary',
  async (clientID, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockSummary;
      }

      const response = await fetch(`/api/personal-inventory/${clientID}/summary`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const uploadInventoryFile = createAsyncThunk(
  'personalInventory/uploadInventoryFile',
  async ({ clientID, formData }, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          success: true,
          message: 'File uploaded successfully',
          fileName: formData.get('file').name,
          fileSize: formData.get('file').size
        };
      }

      const response = await fetch(`/api/personal-inventory/${clientID}/upload`, {
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

const initialState = {
  // Inventory items
  items: [],
  itemsLoading: false,
  itemsError: null,
  
  // Categories
  categories: [],
  categoriesLoading: false,
  categoriesError: null,
  
  // Summary
  summary: {},
  summaryLoading: false,
  summaryError: null,
  
  // Current item
  currentItem: {},
  itemSaving: false,
  itemSaveError: null,
  itemSaveSuccess: false,
  
  // File upload
  uploading: false,
  uploadError: null,
  uploadSuccess: false,
  uploadProgress: 0,
  
  // Filters
  categoryFilter: '',
  statusFilter: '',
  searchQuery: '',
  
  // UI states
  selectedItems: [],
  viewMode: 'list', // 'list' or 'grid'
  sortBy: 'itemName',
  sortOrder: 'asc',
  
  // Mock data flag
  useMockData: localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development'
};

const personalInventorySlice = createSlice({
  name: 'personalInventory',
  initialState,
  reducers: {
    clearError: (state) => {
      state.itemsError = null;
      state.itemSaveError = null;
      state.uploadError = null;
      state.categoriesError = null;
      state.summaryError = null;
    },
    clearSaveSuccess: (state) => {
      state.itemSaveSuccess = false;
      state.uploadSuccess = false;
    },
    setCurrentItem: (state, action) => {
      state.currentItem = action.payload;
    },
    clearCurrentItem: (state) => {
      state.currentItem = {};
    },
    setCategoryFilter: (state, action) => {
      state.categoryFilter = action.payload;
    },
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    clearFilters: (state) => {
      state.categoryFilter = '';
      state.statusFilter = '';
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
    selectItem: (state, action) => {
      if (!state.selectedItems.includes(action.payload)) {
        state.selectedItems.push(action.payload);
      }
    },
    deselectItem: (state, action) => {
      state.selectedItems = state.selectedItems.filter(id => id !== action.payload);
    },
    selectAllItems: (state) => {
      state.selectedItems = state.items.map(item => item.inventoryID);
    },
    deselectAllItems: (state) => {
      state.selectedItems = [];
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
      // Fetch Personal Inventory
      .addCase(fetchPersonalInventory.pending, (state) => {
        state.itemsLoading = true;
        state.itemsError = null;
      })
      .addCase(fetchPersonalInventory.fulfilled, (state, action) => {
        state.itemsLoading = false;
        state.items = action.payload;
        state.itemsError = null;
      })
      .addCase(fetchPersonalInventory.rejected, (state, action) => {
        state.itemsLoading = false;
        state.itemsError = action.payload;
      })
      
      // Add Inventory Item
      .addCase(addInventoryItem.pending, (state) => {
        state.itemSaving = true;
        state.itemSaveError = null;
        state.itemSaveSuccess = false;
      })
      .addCase(addInventoryItem.fulfilled, (state, action) => {
        state.itemSaving = false;
        state.items.push(action.payload);
        state.itemSaveSuccess = true;
        state.itemSaveError = null;
        state.currentItem = {};
      })
      .addCase(addInventoryItem.rejected, (state, action) => {
        state.itemSaving = false;
        state.itemSaveError = action.payload;
        state.itemSaveSuccess = false;
      })
      
      // Update Inventory Item
      .addCase(updateInventoryItem.pending, (state) => {
        state.itemSaving = true;
        state.itemSaveError = null;
      })
      .addCase(updateInventoryItem.fulfilled, (state, action) => {
        state.itemSaving = false;
        const index = state.items.findIndex(item => item.inventoryID === action.payload.inventoryID);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.itemSaveError = null;
      })
      .addCase(updateInventoryItem.rejected, (state, action) => {
        state.itemSaving = false;
        state.itemSaveError = action.payload;
      })
      
      // Delete Inventory Item
      .addCase(deleteInventoryItem.pending, (state) => {
        state.itemSaving = true;
        state.itemSaveError = null;
      })
      .addCase(deleteInventoryItem.fulfilled, (state, action) => {
        state.itemSaving = false;
        state.items = state.items.filter(item => item.inventoryID !== action.payload);
        state.selectedItems = state.selectedItems.filter(id => id !== action.payload);
        state.itemSaveError = null;
      })
      .addCase(deleteInventoryItem.rejected, (state, action) => {
        state.itemSaving = false;
        state.itemSaveError = action.payload;
      })
      
      // Fetch Inventory Categories
      .addCase(fetchInventoryCategories.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(fetchInventoryCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload;
        state.categoriesError = null;
      })
      .addCase(fetchInventoryCategories.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.payload;
      })
      
      // Fetch Inventory Summary
      .addCase(fetchInventorySummary.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchInventorySummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summary = action.payload;
        state.summaryError = null;
      })
      .addCase(fetchInventorySummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = action.payload;
      })
      
      // Upload Inventory File
      .addCase(uploadInventoryFile.pending, (state) => {
        state.uploading = true;
        state.uploadError = null;
        state.uploadSuccess = false;
        state.uploadProgress = 0;
      })
      .addCase(uploadInventoryFile.fulfilled, (state, action) => {
        state.uploading = false;
        state.uploadSuccess = true;
        state.uploadError = null;
        state.uploadProgress = 100;
      })
      .addCase(uploadInventoryFile.rejected, (state, action) => {
        state.uploading = false;
        state.uploadError = action.payload;
        state.uploadSuccess = false;
        state.uploadProgress = 0;
      });
  },
});

export const {
  clearError,
  clearSaveSuccess,
  setCurrentItem,
  clearCurrentItem,
  setCategoryFilter,
  setStatusFilter,
  setSearchQuery,
  clearFilters,
  setViewMode,
  setSortBy,
  setSortOrder,
  toggleSort,
  selectItem,
  deselectItem,
  selectAllItems,
  deselectAllItems,
  setUploadProgress,
  setMockDataFlag,
  resetState
} = personalInventorySlice.actions;

export default personalInventorySlice.reducer;