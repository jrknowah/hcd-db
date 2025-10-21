// src/tests/clientFaceSlice.test.js
import { describe, test, expect } from 'vitest';
import clientFaceReducer, {
  updateFormField,
  updateAllergies,
  setValidationErrors,
  clearErrors,
  clearSuccess
} from '../backend/store/slices/clientFaceSlice';

describe('Client Face Redux Slice', () => {
  const initialState = {
    formData: {},
    allergies: [],
    loading: false,
    saving: false,
    error: null,
    validationErrors: [],
    saveSuccess: false,
    currentClientID: null,
    dataLoaded: false
  };

  test('should update form field', () => {
    const newState = clientFaceReducer(
      initialState,
      updateFormField({ field: 'clientContactNum', value: '(555) 123-4567' })
    );

    expect(newState.formData.clientContactNum).toBe('(555) 123-4567');
  });

  test('should update allergies array', () => {
    const allergies = ['Peanuts', 'Shellfish'];
    const newState = clientFaceReducer(
      initialState,
      updateAllergies(allergies)
    );

    expect(newState.allergies).toEqual(allergies);
  });

  test('should set validation errors', () => {
    const errors = ['Phone number is required', 'Email is required'];
    const newState = clientFaceReducer(
      initialState,
      setValidationErrors(errors)
    );

    expect(newState.validationErrors).toEqual(errors);
  });

  test('should clear errors', () => {
    const stateWithErrors = {
      ...initialState,
      error: 'Some error',
      validationErrors: ['Error 1', 'Error 2']
    };

    const newState = clientFaceReducer(stateWithErrors, clearErrors());

    expect(newState.error).toBeNull();
    expect(newState.validationErrors).toEqual([]);
  });

  test('should clear success message', () => {
    const stateWithSuccess = {
      ...initialState,
      saveSuccess: true
    };

    const newState = clientFaceReducer(stateWithSuccess, clearSuccess());

    expect(newState.saveSuccess).toBe(false);
  });
});