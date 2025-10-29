// src/backend/utils/validation.js
/**
 * Comprehensive validation utilities for production-ready API
 */

// ✅ Regular expressions for common validations
const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\d{10}$/,
  SSN: /^(\d{3}-\d{2}-\d{4}|\d{9}|\d{3}\s\d{2}\s\d{4})$/,
  CLIENT_ID: /^CL-\d{6}-\d{3}$/,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  NAME: /^[a-zA-Z\s'-]{1,100}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9\s]+$/,
};

// ✅ Validation rules for client data
const clientValidationRules = {
  clientID: {
    required: true,
    pattern: REGEX.CLIENT_ID,
    maxLength: 50,
    message: 'Client ID must be in format CL-XXXXXX-XXX'
  },
  clientFirstName: {
    required: true,
    pattern: REGEX.NAME,
    minLength: 1,
    maxLength: 100,
    message: 'First name must contain only letters, spaces, hyphens, and apostrophes'
  },
  clientLastName: {
    required: true,
    pattern: REGEX.NAME,
    minLength: 1,
    maxLength: 100,
    message: 'Last name must contain only letters, spaces, hyphens, and apostrophes'
  },
  clientMiddleName: {
    required: false,
    pattern: REGEX.NAME,
    maxLength: 100,
    message: 'Middle name must contain only letters, spaces, hyphens, and apostrophes'
  },
  clientDOB: {
    required: true,
    type: 'date',
    maxDate: new Date(),
    message: 'Date of birth cannot be in the future'
  },
  clientEmail: {
    required: false,
    pattern: REGEX.EMAIL,
    maxLength: 255,
    message: 'Invalid email format'
  },
  clientSSN: {
    required: false,
    pattern: REGEX.SSN,
    message: 'SSN must be 9 digits (with or without dashes)'
  },
  clientContactNum: {
    required: false,
    type: 'phone',
    message: 'Phone number must be 10 digits'
  }
};

// ✅ Main validation function
const validateField = (fieldName, value, rules) => {
  const errors = [];

  // Required field validation
  if (rules.required && (!value || value.trim() === '')) {
    errors.push(`${fieldName} is required`);
    return errors; // Return early if required field is missing
  }

  // Skip further validation if field is optional and empty
  if (!rules.required && (!value || value.trim() === '')) {
    return errors;
  }

  const trimmedValue = typeof value === 'string' ? value.trim() : value;

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(trimmedValue)) {
    errors.push(rules.message || `${fieldName} format is invalid`);
  }

  // Length validations
  if (rules.minLength && trimmedValue.length < rules.minLength) {
    errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
  }
  if (rules.maxLength && trimmedValue.length > rules.maxLength) {
    errors.push(`${fieldName} must not exceed ${rules.maxLength} characters`);
  }

  // Type-specific validations
  if (rules.type === 'date') {
    const date = new Date(trimmedValue);
    if (isNaN(date.getTime())) {
      errors.push(`${fieldName} must be a valid date`);
    } else if (rules.maxDate && date > rules.maxDate) {
      errors.push(rules.message || `${fieldName} cannot be in the future`);
    }
  }

  if (rules.type === 'phone') {
    const digitsOnly = trimmedValue.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      errors.push(rules.message || `${fieldName} must be 10 digits`);
    }
  }

  return errors;
};

// ✅ Validate entire client object
const validateClientData = (clientData, isUpdate = false) => {
  const errors = {};
  
  // Adjust rules for update operations
  const rules = { ...clientValidationRules };
  if (isUpdate) {
    // Make fields optional for updates (only validate if provided)
    Object.keys(rules).forEach(key => {
      if (key !== 'clientID') {
        rules[key].required = false;
      }
    });
  }

  // Validate each field
  Object.keys(rules).forEach(fieldName => {
    if (clientData.hasOwnProperty(fieldName)) {
      const fieldErrors = validateField(
        fieldName, 
        clientData[fieldName], 
        rules[fieldName]
      );
      
      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
      }
    } else if (rules[fieldName].required && !isUpdate) {
      errors[fieldName] = [`${fieldName} is required`];
    }
  });

  // Custom validation: SSN normalization
  if (clientData.clientSSN && !errors.clientSSN) {
    const cleanSSN = clientData.clientSSN.replace(/[-\s]/g, '');
    clientData.clientSSN = `${cleanSSN.slice(0,3)}-${cleanSSN.slice(3,5)}-${cleanSSN.slice(5)}`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: clientData
  };
};

// ✅ Validate phone number
const validatePhone = (phone) => {
  if (!phone || phone.trim() === '') return { isValid: true };
  
  const digitsOnly = phone.replace(/\D/g, '');
  const isValid = digitsOnly.length === 10;
  
  return {
    isValid,
    error: isValid ? null : 'Phone number must be 10 digits',
    normalized: isValid ? phone : null
  };
};

// ✅ Validate email
const validateEmail = (email) => {
  if (!email || email.trim() === '') return { isValid: true };
  
  const isValid = REGEX.EMAIL.test(email.trim());
  
  return {
    isValid,
    error: isValid ? null : 'Invalid email format',
    normalized: isValid ? email.trim().toLowerCase() : null
  };
};

// ✅ Validate SSN
const validateSSN = (ssn) => {
  if (!ssn || ssn.trim() === '') return { isValid: true };
  
  const trimmed = ssn.trim();
  const isValid = REGEX.SSN.test(trimmed);
  
  // Normalize to XXX-XX-XXXX format
  const cleanSSN = trimmed.replace(/[-\s]/g, '');
  const normalized = isValid 
    ? `${cleanSSN.slice(0,3)}-${cleanSSN.slice(3,5)}-${cleanSSN.slice(5)}`
    : null;
  
  return {
    isValid,
    error: isValid ? null : 'SSN must be 9 digits (format: XXX-XX-XXXX)',
    normalized
  };
};

// ✅ Validate date
const validateDate = (date, options = {}) => {
  if (!date || date.trim() === '') {
    return options.required 
      ? { isValid: false, error: 'Date is required' }
      : { isValid: true };
  }
  
  const parsedDate = new Date(date);
  const isValidDate = !isNaN(parsedDate.getTime());
  
  if (!isValidDate) {
    return { isValid: false, error: 'Invalid date format' };
  }
  
  // Check if date is in the future (if not allowed)
  if (options.noFuture && parsedDate > new Date()) {
    return { isValid: false, error: 'Date cannot be in the future' };
  }
  
  // Check if date is in the past (if not allowed)
  if (options.noPast && parsedDate < new Date()) {
    return { isValid: false, error: 'Date cannot be in the past' };
  }
  
  // Check minimum date
  if (options.minDate && parsedDate < new Date(options.minDate)) {
    return { 
      isValid: false, 
      error: `Date cannot be before ${options.minDate}` 
    };
  }
  
  // Check maximum date
  if (options.maxDate && parsedDate > new Date(options.maxDate)) {
    return { 
      isValid: false, 
      error: `Date cannot be after ${options.maxDate}` 
    };
  }
  
  return {
    isValid: true,
    normalized: parsedDate.toISOString().split('T')[0]
  };
};

// ✅ Sanitize string input (prevent XSS)
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

// ✅ Validate client face data
const validateClientFaceData = (data) => {
  const errors = {};
  
  // Validate phone numbers
  const phoneFields = [
    'clientContactNum',
    'clientContactAltNum', 
    'clientEmgContactNum',
    'clientMedPrimaryPhyPhone'
  ];
  
  phoneFields.forEach(field => {
    if (data[field]) {
      const validation = validatePhone(data[field]);
      if (!validation.isValid) {
        errors[field] = validation.error;
      }
    }
  });
  
  // Validate email
  if (data.clientEmail) {
    const validation = validateEmail(data.clientEmail);
    if (!validation.isValid) {
      errors.clientEmail = validation.error;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// ✅ Validate client ID format
const validateClientID = (clientID) => {
  if (!clientID || clientID.trim() === '') {
    return { isValid: false, error: 'Client ID is required' };
  }
  
  const isValid = REGEX.CLIENT_ID.test(clientID.trim());
  
  return {
    isValid,
    error: isValid ? null : 'Client ID must be in format CL-XXXXXX-XXX',
    normalized: isValid ? clientID.trim() : null
  };
};

// ✅ Batch validate multiple fields
const batchValidate = (data, validationSchema) => {
  const errors = {};
  
  Object.keys(validationSchema).forEach(field => {
    if (data.hasOwnProperty(field)) {
      const fieldErrors = validateField(
        field,
        data[field],
        validationSchema[field]
      );
      
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = {
  // Main validators
  validateClientData,
  validateClientFaceData,
  
  // Field-specific validators
  validatePhone,
  validateEmail,
  validateSSN,
  validateDate,
  validateClientID,
  
  // Utility functions
  sanitizeString,
  batchValidate,
  
  // Validation rules (for reference)
  clientValidationRules,
  REGEX
};