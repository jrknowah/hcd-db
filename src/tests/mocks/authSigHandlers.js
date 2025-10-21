// src/tests/mocks/handlers.js - ADD THESE TO YOUR EXISTING HANDLERS

import { http, HttpResponse } from 'msw';

const API_URL = 'https://hcd-db-backend-fdfmekfgehbhf0db.westus2-01.azurewebsites.net';

// ========== MOCK AUTHORIZATION FORM STORAGE ==========
let mockAuthForms = {};

// Valid form types
const VALID_FORM_TYPES = [
  'orientation', 'clientRights', 'consentTreatment', 'preScreen',
  'privacyPractice', 'lahmis', 'phiRelease', 'residencePolicy',
  'authDisclosure', 'termination', 'advDirective', 'grievances',
  'healthDisclosure', 'consentPhoto', 'housingAgreement'
];

// ========== AUTHORIZATION FORM HANDLERS ==========

// GET /api/authorization/:clientID/form/:formType - Get specific form
export const authSigHandlers = [
  http.get(`${API_URL}/api/authorization/:clientID/form/:formType`, ({ params }) => {
    const { clientID, formType } = params;
    console.log(`🎭 MSW: GET form ${formType} for client ${clientID}`);
    
    // Validate form type
    if (!VALID_FORM_TYPES.includes(formType)) {
      return HttpResponse.json({
        message: 'Invalid form type',
        validTypes: VALID_FORM_TYPES
      }, { status: 400 });
    }
    
    const formKey = `${clientID}-${formType}`;
    const form = mockAuthForms[formKey];
    
    if (!form) {
      return HttpResponse.json({
        message: 'Form not found for this client',
        clientID,
        formType
      }, { status: 404 });
    }
    
    return HttpResponse.json(form);
  }),

  // POST /api/authorization/:clientID/form/:formType - Save/update form
  http.post(`${API_URL}/api/authorization/:clientID/form/:formType`, async ({ params, request }) => {
    const { clientID, formType } = params;
    const data = await request.json();
    console.log(`🎭 MSW: POST form ${formType} for client ${clientID}`);
    
    // Validate form type
    if (!VALID_FORM_TYPES.includes(formType)) {
      return HttpResponse.json({
        message: 'Invalid form type',
        validTypes: VALID_FORM_TYPES,
        provided: formType
      }, { status: 400 });
    }
    
    // Validate based on form type
    const validationErrors = validateFormData(formType, { ...data, clientID });
    if (validationErrors) {
      return HttpResponse.json({
        message: 'Validation failed',
        errors: validationErrors,
        formType
      }, { status: 422 });
    }
    
    const formKey = `${clientID}-${formType}`;
    const exists = !!mockAuthForms[formKey];
    
    // Determine status
    const isCompleted = data.signature && data.signature.trim() !== '';
    const status = data.status || (isCompleted ? 'completed' : 'in_progress');
    
    // Check if trying to modify submitted/approved form
    if (exists && ['submitted', 'approved'].includes(mockAuthForms[formKey].status) && 
        status !== mockAuthForms[formKey].status) {
      return HttpResponse.json({
        message: `Cannot modify form with status: ${mockAuthForms[formKey].status}`,
        currentStatus: mockAuthForms[formKey].status,
        formType
      }, { status: 409 });
    }
    
    // Create or update form
    const formData = {
      formID: exists ? mockAuthForms[formKey].formID : Math.floor(Math.random() * 10000),
      clientID,
      formType,
      checkboxes: data.checkboxes || {},
      signature: data.signature || '',
      status,
      completionPercentage: data.completionPercentage || 0,
      completedAt: isCompleted ? new Date().toISOString() : null,
      completedBy: isCompleted ? 'test-user@example.com' : null,
      createdAt: exists ? mockAuthForms[formKey].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      formData: {
        ...data.formData,
        clientReleaseItems: data.clientReleaseItems,
        clientReleasePurposes: data.clientReleasePurposes,
        clientReleasePHTItems: data.clientReleasePHTItems,
        consentPhotoSign1: data.consentPhotoSign1,
        consentPhotoEffectiveDate: data.consentPhotoEffectiveDate,
        consentPhotoExpireDate: data.consentPhotoExpireDate,
        acknowledged: data.acknowledged
      }
    };
    
    mockAuthForms[formKey] = formData;
    
    return HttpResponse.json({
      message: 'Form data saved successfully',
      formType,
      action: exists ? 'updated' : 'created',
      data: formData
    });
  }),

  // POST /api/authorization/:clientID/form/:formType/autosave - Auto-save
  http.post(`${API_URL}/api/authorization/:clientID/form/:formType/autosave`, async ({ params, request }) => {
    const { clientID, formType } = params;
    const data = await request.json();
    console.log(`🎭 MSW: Autosave form ${formType} for client ${clientID}`);
    
    if (!VALID_FORM_TYPES.includes(formType)) {
      return HttpResponse.json({
        message: 'Invalid form type'
      }, { status: 400 });
    }
    
    const formKey = `${clientID}-${formType}`;
    const exists = !!mockAuthForms[formKey];
    
    if (exists) {
      mockAuthForms[formKey] = {
        ...mockAuthForms[formKey],
        checkboxes: data.checkboxes || {},
        signature: data.signature || '',
        formData: data.formData || {},
        lastAutoSave: new Date().toISOString()
      };
    } else {
      mockAuthForms[formKey] = {
        formID: Math.floor(Math.random() * 10000),
        clientID,
        formType,
        checkboxes: data.checkboxes || {},
        signature: data.signature || '',
        formData: data.formData || {},
        status: 'draft',
        lastAutoSave: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
    }
    
    return HttpResponse.json({
      message: 'Auto-save successful',
      clientID,
      formType,
      autoSavedAt: new Date().toISOString()
    });
  }),

  // POST /api/authorization/:clientID/forms/bulk - Bulk save
  http.post(`${API_URL}/api/authorization/:clientID/forms/bulk`, async ({ params, request }) => {
    const { clientID } = params;
    const { forms } = await request.json();
    console.log(`🎭 MSW: Bulk save for client ${clientID}`);
    
    if (!Array.isArray(forms) || forms.length === 0) {
      return HttpResponse.json({
        message: 'Forms array is required'
      }, { status: 400 });
    }
    
    const savedForms = [];
    
    for (const formData of forms) {
      const { formType, ...data } = formData;
      
      if (!VALID_FORM_TYPES.includes(formType)) {
        continue;
      }
      
      const formKey = `${clientID}-${formType}`;
      const exists = !!mockAuthForms[formKey];
      const isCompleted = data.signature && data.signature.trim() !== '';
      const status = isCompleted ? 'completed' : 'in_progress';
      
      const savedForm = {
        formID: exists ? mockAuthForms[formKey].formID : Math.floor(Math.random() * 10000),
        clientID,
        formType,
        checkboxes: data.checkboxes || {},
        signature: data.signature || '',
        status,
        formData: data.formData || {},
        createdAt: exists ? mockAuthForms[formKey].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      mockAuthForms[formKey] = savedForm;
      savedForms.push(savedForm);
    }
    
    return HttpResponse.json({
      message: 'Bulk save successful',
      clientID,
      savedForms,
      totalSaved: savedForms.length
    });
  }),

  // POST /api/authorization/:clientID/submit - Submit forms
  http.post(`${API_URL}/api/authorization/:clientID/submit`, async ({ params, request }) => {
    const { clientID } = params;
    const { submissionNotes } = await request.json();
    console.log(`🎭 MSW: Submit forms for client ${clientID}`);
    
    // Check completion
    const clientForms = Object.entries(mockAuthForms)
      .filter(([key]) => key.startsWith(clientID))
      .map(([, form]) => form);
    
    const completedForms = clientForms.filter(f => f.status === 'completed').length;
    const totalForms = clientForms.length;
    
    if (completedForms < totalForms) {
      return HttpResponse.json({
        message: 'Cannot submit: Not all required forms are completed',
        totalForms,
        completedForms,
        remaining: totalForms - completedForms
      }, { status: 400 });
    }
    
    // Update all forms to submitted
    Object.keys(mockAuthForms).forEach(key => {
      if (key.startsWith(clientID) && mockAuthForms[key].status === 'completed') {
        mockAuthForms[key].status = 'submitted';
        mockAuthForms[key].submissionID = 1;
      }
    });
    
    const submission = {
      submissionID: 1,
      clientID,
      submissionNotes,
      submittedBy: 'test-user@example.com',
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    };
    
    return HttpResponse.json({
      message: 'Forms submitted successfully',
      submission
    });
  }),

  // GET /api/authorization/:clientID/submission-status - Get submission status
  http.get(`${API_URL}/api/authorization/:clientID/submission-status`, ({ params }) => {
    const { clientID } = params;
    console.log(`🎭 MSW: Get submission status for client ${clientID}`);
    
    const hasSubmission = Object.values(mockAuthForms)
      .some(form => form.clientID === clientID && form.status === 'submitted');
    
    if (!hasSubmission) {
      return HttpResponse.json({
        status: 'draft',
        message: 'No submissions found'
      });
    }
    
    return HttpResponse.json({
      submissionID: 1,
      clientID,
      status: 'submitted',
      submittedBy: 'test-user@example.com',
      submittedAt: new Date().toISOString()
    });
  })
];

// ========== VALIDATION HELPER ==========
function validateFormData(formType, data) {
  const errors = {};
  
  if (!data.clientID) {
    errors.clientID = 'Valid Client ID is required';
  }
  
  switch (formType) {
    case 'orientation':
      if (!data.checkboxes || typeof data.checkboxes !== 'object') {
        errors.checkboxes = 'Checkboxes data must be an object';
      } else if (Object.keys(data.checkboxes).length === 0) {
        errors.checkboxes = 'At least one checkbox must be acknowledged';
      } else {
        const invalidCheckboxes = Object.entries(data.checkboxes)
          .filter(([, value]) => typeof value !== 'boolean')
          .map(([key]) => key);
        if (invalidCheckboxes.length > 0) {
          errors.checkboxes = `Invalid checkbox values: ${invalidCheckboxes.join(', ')}`;
        }
      }
      
      if (!data.signature || typeof data.signature !== 'string' || data.signature.trim() === '') {
        errors.signature = 'Electronic signature is required';
      } else if (data.signature.length < 2) {
        errors.signature = 'Signature must be at least 2 characters';
      } else if (data.signature.length > 200) {
        errors.signature = 'Signature cannot exceed 200 characters';
      }
      
      if (data.completionPercentage !== undefined) {
        const percentage = parseFloat(data.completionPercentage);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          errors.completionPercentage = 'Completion percentage must be between 0-100';
        }
      }
      break;
      
    case 'clientRights':
      if (typeof data.acknowledged !== 'boolean') {
        errors.acknowledged = 'Acknowledged must be a boolean value';
      } else if (!data.acknowledged) {
        errors.acknowledged = 'Client rights must be acknowledged';
      }
      
      if (!data.signature || data.signature.trim() === '') {
        errors.signature = 'Electronic signature is required for rights acknowledgment';
      } else if (data.signature.length < 2) {
        errors.signature = 'Signature must be at least 2 characters';
      }
      break;
      
    case 'consentPhoto':
      if (!Array.isArray(data.clientReleaseItems)) {
        errors.clientReleaseItems = 'Release items must be an array';
      } else if (data.clientReleaseItems.length === 0) {
        errors.clientReleaseItems = 'At least one release item must be selected';
      } else {
        const invalidItems = data.clientReleaseItems.filter(item => 
          !item || typeof item !== 'object' || !item.value
        );
        if (invalidItems.length > 0) {
          errors.clientReleaseItems = 'clientReleaseItems contains invalid items';
        }
      }
      
      if (!Array.isArray(data.clientReleasePurposes)) {
        errors.clientReleasePurposes = 'Release purposes must be an array';
      } else if (data.clientReleasePurposes.length === 0) {
        errors.clientReleasePurposes = 'At least one purpose must be selected';
      }
      
      if (!data.consentPhotoSign1 || data.consentPhotoSign1.trim() === '') {
        errors.consentPhotoSign1 = 'Electronic signature is required';
      }
      
      if (data.consentPhotoEffectiveDate) {
        const effectiveDate = new Date(data.consentPhotoEffectiveDate);
        if (isNaN(effectiveDate.getTime())) {
          errors.consentPhotoEffectiveDate = 'Invalid effective date format';
        }
      }
      
      if (data.consentPhotoExpireDate) {
        const expireDate = new Date(data.consentPhotoExpireDate);
        if (isNaN(expireDate.getTime())) {
          errors.consentPhotoExpireDate = 'Invalid expiration date format';
        } else if (data.consentPhotoEffectiveDate) {
          const effectiveDate = new Date(data.consentPhotoEffectiveDate);
          if (expireDate <= effectiveDate) {
            errors.consentPhotoExpireDate = 'Expiration date must be after effective date';
          }
        }
      }
      break;
      
    case 'consentTreatment':
    case 'privacyPractice':
      if (!data.signature || data.signature.trim() === '') {
        errors.signature = 'Electronic signature is required';
      }
      break;
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}

// ========== UTILITY: Reset mock forms ==========
export const resetMockAuthForms = () => {
  mockAuthForms = {};
};

// Export handlers (add to your existing handlers array)
export default authSigHandlers;