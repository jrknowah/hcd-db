// hooks/useFormManager.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchFormData,
  saveFormData,
  autoSaveFormData,
  updateFormLocal,
  clearErrors,
  clearSuccessFlags,
  setUnsavedChanges,
  selectFormByType,
  selectFormLoading,
  selectSaving,
  selectAutoSaving,
  selectSaveSuccess,
  selectUnsavedChanges
} from '../store/slices/authSigSlice';

/**
 * Custom hook for managing form state, validation, and auto-save functionality
 * @param {string} formType - The type of form (e.g., 'orientation', 'phiRelease')
 * @param {string} clientID - The client ID
 * @param {object} formConfig - Form configuration object
 * @param {object} validationRules - Validation rules for the form
 * @param {number} autoSaveDelay - Auto-save delay in milliseconds (default: 30000)
 */
const useFormManager = (
  formType,
  clientID,
  formConfig = {},
  validationRules = {},
  autoSaveDelay = 30000
) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const formData = useSelector(selectFormByType(formType));
  const formLoading = useSelector(selectFormLoading(formType));
  const saving = useSelector(selectSaving);
  const autoSaving = useSelector(selectAutoSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const unsavedChanges = useSelector(selectUnsavedChanges);
  const formErrors = useSelector((state) => state.authSig.formErrors[formType]);
  const autoSaveEnabled = useSelector(state => state.authSig.autoSaveEnabled);
  
  // Local state
  const [localFormData, setLocalFormData] = useState({});
  const [localErrors, setLocalErrors] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // Auto-save refs
  const timeoutRef = useRef();
  const previousDataRef = useRef();
  const isInitializedRef = useRef(false);
  
  // Load form data when component mounts
  useEffect(() => {
    if (clientID && !isInitializedRef.current) {
      dispatch(fetchFormData({ clientID, formType }));
      isInitializedRef.current = true;
    }
  }, [dispatch, clientID, formType]);
  
  // Update local state when Redux form data changes
  useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      setLocalFormData(formData);
      setIsDirty(false);
    }
  }, [formData]);
  
  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !clientID || !isDirty) return;
    
    const currentData = JSON.stringify(localFormData);
    
    // Skip if data hasn't changed
    if (currentData === previousDataRef.current) return;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      if (localFormData && Object.keys(localFormData).length > 0) {
        dispatch(autoSaveFormData({ 
          clientID, 
          formType, 
          formData: {
            ...localFormData,
            lastAutoSaved: new Date().toISOString()
          }
        }));
        previousDataRef.current = currentData;
      }
    }, autoSaveDelay);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [localFormData, clientID, formType, autoSaveDelay, autoSaveEnabled, dispatch, isDirty]);
  
  // Update unsaved changes in Redux
  useEffect(() => {
    dispatch(setUnsavedChanges(isDirty && !saveSuccess));
  }, [dispatch, isDirty, saveSuccess]);
  
  // Handle success notifications
  useEffect(() => {
    if (saveSuccess) {
      setShowSuccessSnackbar(true);
      setIsDirty(false);
    }
  }, [saveSuccess]);
  
  // Update form field
  const updateField = useCallback((fieldName, value) => {
    setLocalFormData(prev => {
      const newData = { ...prev, [fieldName]: value };
      setIsDirty(true);
      setLocalErrors([]);
      
      // Update Redux store optimistically
      dispatch(updateFormLocal({
        formType,
        formData: newData
      }));
      
      return newData;
    });
  }, [dispatch, formType]);
  
  // Update multiple fields
  const updateFields = useCallback((updates) => {
    setLocalFormData(prev => {
      const newData = { ...prev, ...updates };
      setIsDirty(true);
      setLocalErrors([]);
      
      // Update Redux store optimistically
      dispatch(updateFormLocal({
        formType,
        formData: newData
      }));
      
      return newData;
    });
  }, [dispatch, formType]);
  
  // Validation
  const validationErrors = useMemo(() => {
    const errors = [];
    
    if (!clientID) {
      errors.push("No client selected. Please select a client first.");
      return errors;
    }
    
    // Apply custom validation rules
    if (validationRules.required) {
      validationRules.required.forEach(field => {
        if (!localFormData[field]) {
          errors.push(`${field} is required.`);
        }
      });
    }
    
    if (validationRules.custom) {
      const customErrors = validationRules.custom(localFormData, clientID);
      errors.push(...customErrors);
    }
    
    return errors;
  }, [localFormData, clientID, validationRules]);
  
  const isValid = validationErrors.length === 0;
  
  // Submit form
  const submitForm = useCallback(async (additionalData = {}) => {
    if (validationErrors.length > 0) {
      setLocalErrors(validationErrors);
      return { success: false, errors: validationErrors };
    }
    
    const submitData = {
      ...localFormData,
      ...additionalData,
      status: 'completed',
      submittedAt: new Date().toISOString(),
      formVersion: formConfig?.version || '1.0'
    };
    
    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType, 
        formData: submitData 
      })).unwrap();
      
      setLocalErrors([]);
      setIsDirty(false);
      return { success: true };
    } catch (error) {
      const errorMessage = error.message || `Failed to save ${formType} data`;
      setLocalErrors([errorMessage]);
      return { success: false, errors: [errorMessage] };
    }
  }, [dispatch, clientID, formType, localFormData, validationErrors, formConfig]);
  
  // Save as draft
  const saveDraft = useCallback(async () => {
    const draftData = {
      ...localFormData,
      status: 'draft',
      lastSaved: new Date().toISOString()
    };
    
    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType, 
        formData: draftData 
      })).unwrap();
      
      setIsDirty(false);
      return { success: true };
    } catch (error) {
      const errorMessage = error.message || `Failed to save ${formType} draft`;
      setLocalErrors([errorMessage]);
      return { success: false, errors: [errorMessage] };
    }
  }, [dispatch, clientID, formType, localFormData]);
  
  // Clear errors
  const clearFormErrors = useCallback(() => {
    setLocalErrors([]);
    dispatch(clearErrors());
  }, [dispatch]);
  
  // Clear success flags
  const clearSuccessState = useCallback(() => {
    setShowSuccessSnackbar(false);
    dispatch(clearSuccessFlags());
  }, [dispatch]);
  
  // Reset form
  const resetForm = useCallback(() => {
    setLocalFormData({});
    setLocalErrors([]);
    setIsDirty(false);
    setShowSuccessSnackbar(false);
  }, []);
  
  return {
    // State
    formData: localFormData,
    formLoading,
    saving,
    autoSaving,
    saveSuccess,
    unsavedChanges,
    isDirty,
    
    // Errors
    localErrors,
    formErrors,
    validationErrors,
    isValid,
    
    // UI State
    showSuccessSnackbar,
    
    // Actions
    updateField,
    updateFields,
    submitForm,
    saveDraft,
    clearFormErrors,
    clearSuccessState,
    resetForm
  };
};

/**
 * Custom hook for managing stepper functionality
 * @param {array} steps - Array of step configurations
 * @param {function} onStepValidation - Function to validate each step
 */
const useFormStepper = (steps = [], onStepValidation = null) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [skippedSteps, setSkippedSteps] = useState(new Set());
  
  // Check if a step is completed
  const isStepCompleted = useCallback((stepIndex) => {
    return completedSteps.has(stepIndex);
  }, [completedSteps]);
  
  // Check if a step is skipped
  const isStepSkipped = useCallback((stepIndex) => {
    return skippedSteps.has(stepIndex);
  }, [skippedSteps]);
  
  // Mark step as completed
  const completeStep = useCallback((stepIndex) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]));
  }, []);
  
  // Mark step as skipped
  const skipStep = useCallback((stepIndex) => {
    setSkippedSteps(prev => new Set([...prev, stepIndex]));
  }, []);
  
  // Go to next step
  const nextStep = useCallback(() => {
    if (onStepValidation) {
      const isValid = onStepValidation(activeStep);
      if (!isValid) return false;
    }
    
    if (activeStep < steps.length - 1) {
      completeStep(activeStep);
      setActiveStep(prev => prev + 1);
      return true;
    }
    return false;
  }, [activeStep, steps.length, onStepValidation, completeStep]);
  
  // Go to previous step
  const previousStep = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
      return true;
    }
    return false;
  }, [activeStep]);
  
  // Go to specific step
  const goToStep = useCallback((stepIndex) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setActiveStep(stepIndex);
      return true;
    }
    return false;
  }, [steps.length]);
  
  // Reset stepper
  const resetStepper = useCallback(() => {
    setActiveStep(0);
    setCompletedSteps(new Set());
    setSkippedSteps(new Set());
  }, []);
  
  // Calculate progress
  const progress = useMemo(() => {
    const totalSteps = steps.length;
    const completed = completedSteps.size;
    return totalSteps > 0 ? Math.round((completed / totalSteps) * 100) : 0;
  }, [steps.length, completedSteps.size]);
  
  return {
    activeStep,
    completedSteps,
    skippedSteps,
    progress,
    isStepCompleted,
    isStepSkipped,
    completeStep,
    skipStep,
    nextStep,
    previousStep,
    goToStep,
    resetStepper
  };
};

/**
 * Custom hook for managing accordion state with tracking
 * @param {array} sections - Array of section configurations
 */
const useFormAccordion = (sections = []) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [visitedSections, setVisitedSections] = useState(new Set());
  
  // Handle accordion change
  const handleAccordionChange = useCallback((sectionId) => (event, isExpanded) => {
    if (isExpanded) {
      setExpandedSection(sectionId);
      setVisitedSections(prev => new Set([...prev, sectionId]));
    } else {
      setExpandedSection(null);
    }
  }, []);
  
  // Check if section is visited
  const isSectionVisited = useCallback((sectionId) => {
    return visitedSections.has(sectionId);
  }, [visitedSections]);
  
  // Get completion percentage
  const completionPercentage = useMemo(() => {
    const totalSections = sections.length;
    const visitedCount = visitedSections.size;
    return totalSections > 0 ? Math.round((visitedCount / totalSections) * 100) : 0;
  }, [sections.length, visitedSections.size]);
  
  // Mark section as visited
  const markSectionVisited = useCallback((sectionId) => {
    setVisitedSections(prev => new Set([...prev, sectionId]));
  }, []);
  
  // Reset accordion state
  const resetAccordion = useCallback(() => {
    setExpandedSection(null);
    setVisitedSections(new Set());
  }, []);
  
  return {
    expandedSection,
    visitedSections,
    completionPercentage,
    handleAccordionChange,
    isSectionVisited,
    markSectionVisited,
    resetAccordion
  };
};

/**
 * Utility function for form validation
 */
const createFormValidator = (rules) => {
  return (formData, clientID) => {
    const errors = [];
    
    // Required field validation
    if (rules.required) {
      rules.required.forEach(field => {
        const value = formData[field];
        if (!value || (typeof value === 'string' && !value.trim())) {
          errors.push(`${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required.`);
        }
      });
    }
    
    // Email validation
    if (rules.email) {
      rules.email.forEach(field => {
        const value = formData[field];
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`${field.replace(/([A-Z])/g, ' $1').toLowerCase()} must be a valid email address.`);
        }
      });
    }
    
    // Phone validation
    if (rules.phone) {
      rules.phone.forEach(field => {
        const value = formData[field];
        if (value && !/^\d{10}$/.test(value.replace(/\D/g, ''))) {
          errors.push(`${field.replace(/([A-Z])/g, ' $1').toLowerCase()} must be a valid phone number.`);
        }
      });
    }
    
    // Minimum length validation
    if (rules.minLength) {
      Object.entries(rules.minLength).forEach(([field, minLen]) => {
        const value = formData[field];
        if (value && value.length < minLen) {
          errors.push(`${field.replace(/([A-Z])/g, ' $1').toLowerCase()} must be at least ${minLen} characters long.`);
        }
      });
    }
    
    // Custom validation functions
    if (rules.custom) {
      Object.entries(rules.custom).forEach(([field, validator]) => {
        const value = formData[field];
        const result = validator(value, formData, clientID);
        if (result !== true) {
          errors.push(result || `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is invalid.`);
        }
      });
    }
    
    return errors;
  };
};

/**
 * Utility function for calculating form completion percentage
 */
const calculateFormCompletion = (formData, requiredFields = [], totalFields = []) => {
  const fields = totalFields.length > 0 ? totalFields : requiredFields;
  if (fields.length === 0) return 0;
  
  const completedFields = fields.filter(field => {
    const value = formData[field];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
    return value !== null && value !== undefined && value !== '';
  });
  
  return Math.round((completedFields.length / fields.length) * 100);
};

/**
 * Utility function for deep copying form data
 */
const deepCopyFormData = (data) => {
  return JSON.parse(JSON.stringify(data));
};

/**
 * Utility function for form data comparison
 */
const compareFormData = (data1, data2) => {
  return JSON.stringify(data1) === JSON.stringify(data2);
};

/**
 * Form field change handler factory
 */
const createFieldChangeHandler = (updateField) => {
  return (fieldName) => (event) => {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    updateField(fieldName, value);
  };
};

/**
 * Debounced update function for performance optimization
 */
const useDebouncedUpdate = (callback, delay = 300) => {
  const timeoutRef = useRef();
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

/**
 * Form navigation guard hook
 */
const useFormNavigationGuard = (isDirty, message = 'You have unsaved changes. Are you sure you want to leave?') => {
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);
};

// Export all hooks and utilities
export {
  useFormManager,
  useFormStepper,
  useFormAccordion,
  createFormValidator,
  calculateFormCompletion,
  deepCopyFormData,
  compareFormData,
  createFieldChangeHandler,
  useDebouncedUpdate,
  useFormNavigationGuard
};