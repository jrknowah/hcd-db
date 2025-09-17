// Updated NewClient.js with edit mode support

import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Alert,
  Card,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

import {
  clientEthnicityList,
  clientGenders,
  clientPronounsList,
  clientRaceList,
  highestEdu,
  maritalStatusList,
  religiousPrefList,
  clientLangList,
  clientVeteranStatus,
  clientCitizenStatus,
  hhhSiteList,
} from 'src/data/arrayList';

import { 
  fetchClients, 
  addClient, 
  updateClient, 
  setSelectedClient 
} from '../../backend/store/slices/clientSlice';

const NewClient = ({ onClientCreated, editMode = false, clientData = null }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Redux selectors
  const loading = useSelector((state) => state.clients?.loading || false);
  const error = useSelector((state) => state.clients?.error);
  const reduxUser = useSelector((state) => state?.auth?.user);

  // ✅ Initialize form data based on edit mode
  const getInitialFormData = () => {
    if (editMode && clientData) {
      return {
        clientID: clientData.clientID || '',
        clientAdmitDate: clientData.clientAdmitDate ? clientData.clientAdmitDate.split('T')[0] : '',
        clientDOB: clientData.clientDOB ? clientData.clientDOB.split('T')[0] : '',
        clientSite: clientData.clientSite || '',
        clientFirstName: clientData.clientFirstName || '',
        clientMiddleName: clientData.clientMiddleName || '',
        clientLastName: clientData.clientLastName || '',
        clientAliases: clientData.clientAliases || '',
        clientCitizenship: clientData.clientCitizenship || '',
        clientVetStatus: clientData.clientVetStatus || '',
        clientSSN: clientData.clientSSN || '',
        clientGender: clientData.clientGender || '',
        clientPronouns: clientData.clientPronouns || '',
        clientEthnicity: clientData.clientEthnicity || '',
        clientRace: clientData.clientRace || '',
        clientPrimaryLang: clientData.clientPrimaryLang || '',
        clientMaritalStatus: clientData.clientMaritalStatus || '',
        clientReligiousPref: clientData.clientReligiousPref || '',
        clientHighEd: clientData.clientHighEd || '',
      };
    }
    return {
      clientID: '',
      clientAdmitDate: '',
      clientDOB: '',
      clientSite: '',
      clientFirstName: '',
      clientMiddleName: '',
      clientLastName: '',
      clientAliases: '',
      clientCitizenship: '',
      clientVetStatus: '',
      clientSSN: '',
      clientGender: '',
      clientPronouns: '',
      clientEthnicity: '',
      clientRace: '',
      clientPrimaryLang: '',
      clientMaritalStatus: '',
      clientReligiousPref: '',
      clientHighEd: '',
    };
  };

  // Form state
  const [formData, setFormData] = useState(getInitialFormData);
  const [localError, setLocalError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ✅ Update form data when clientData changes (for edit mode)
  useEffect(() => {
    if (editMode && clientData) {
      setFormData(getInitialFormData());
    }
  }, [editMode, clientData]);

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    // Clear errors when user starts typing
    if (localError) setLocalError(null);
  };

  const validateForm = () => {
    const { clientID, clientFirstName, clientLastName, clientDOB, clientSite } = formData;
    
    // ✅ Client ID is always required (both new and edit)
    if (!clientID) {
      setLocalError('Please provide a Client ID.');
      return false;
    }
    
    if (!clientFirstName || !clientLastName || !clientDOB || !clientSite) {
      setLocalError('Please fill in all required fields: Client ID, First Name, Last Name, Date of Birth, and Site.');
      return false;
    }
    
    // Additional validation
    if (formData.clientSSN && formData.clientSSN.length !== 9) {
      setLocalError('SSN must be exactly 9 digits.');
      return false;
    }

    setLocalError(null);
    return true;
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    setLocalError(null);
    setSuccess(false);
  };

  // ✅ Updated handler to support both create and update with better error handling
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      let response;
      
      if (editMode) {
        console.log('🔄 Updating client with data:', {
          clientID: formData.clientID,
          updates: formData
        });
        
        // Update existing client
        response = await dispatch(updateClient({
          clientID: formData.clientID,
          updates: formData
        })).unwrap();
        
        console.log('✅ Update successful:', response);
        setSuccess(true);
        
        // ✅ Pass the clientID for navigation after update
        if (onClientCreated) {
          onClientCreated(formData.clientID);
        }
      } else {
        console.log('🔄 Creating new client with data:', formData);
        
        // Create new client
        response = await dispatch(addClient(formData)).unwrap();
        
        console.log('✅ Create successful:', response);
        setSuccess(true);
        
        // ✅ Pass the clientID for navigation after create
        if (onClientCreated) {
          onClientCreated(response.clientID || formData.clientID);
        }
      }

      // Reset form after successful creation (but not for edit mode)
      if (!editMode) {
        setTimeout(() => {
          resetForm();
        }, 2000);
      }

    } catch (err) {
      console.error(`❌ Error ${editMode ? 'updating' : 'adding'} client:`, err);
      console.error('❌ Full error object:', {
        message: err.message,
        stack: err.stack,
        response: err.response,
        status: err.status
      });
      
      setLocalError(err.message || `Failed to ${editMode ? 'update' : 'add'} client. Please check all fields and try again.`);
    }
  };

  const renderSelect = (label, value, onChange, options, fieldId, required = false) => (
    <FormControl fullWidth error={required && !value}>
      <InputLabel id={`${fieldId}-label`}>
        {label}{required && ' *'}
      </InputLabel>
      <Select
        labelId={`${fieldId}-label`}
        id={fieldId}
        value={value}
        label={label + (required ? ' *' : '')}
        onChange={onChange}
        disabled={loading}
      >
        {options.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const displayError = localError || error;

  return (
    <Card sx={{ 
      p: 3, 
      mx: 'auto',
      maxWidth: {
        xs: '95vw',
        sm: '90vw',
        md: 1400,
        lg: 1600,
        xl: 1800,
      }
    }}>
      {/* Error display */}
      {displayError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {displayError}
        </Alert>
      )}

      {/* Success message */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Client {editMode ? 'updated' : 'created'} successfully!
        </Alert>
      )}

      <Typography variant="h5" gutterBottom>
        {editMode ? 'Edit Client Information' : 'New Client Intake'}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Fields marked with * are required. Client ID must be unique.
      </Typography>

      <Box component="form" sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              Basic Information
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={3}>
            <Typography>Client ID</Typography>
            <TextField
              fullWidth
              label=""
              value={formData.clientID}
              onChange={handleChange('clientID')}
              disabled={loading} // ✅ Removed editMode from disabled condition
              error={!formData.clientID}
              helperText="Enter a unique client ID"
              required
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography>Client Admit Date</Typography>
            <TextField
              fullWidth
              label=""
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formData.clientAdmitDate}
              onChange={handleChange('clientAdmitDate')}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography>Date of Birth</Typography>
            <TextField
              fullWidth
              label=""
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formData.clientDOB}
              onChange={handleChange('clientDOB')}
              disabled={loading}
              error={!formData.clientDOB}
              required
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography>Site</Typography>
            {renderSelect(
              '', 
              formData.clientSite, 
              handleChange('clientSite'), 
              hhhSiteList.map(s => s.value), 
              'clientSite',
              true
            )}
          </Grid>
        </Grid>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* Name Information */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 2, color: 'primary.main' }}>
              Name Information
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Typography>First Name</Typography>
            <TextField
              fullWidth
              label=""
              value={formData.clientFirstName}
              onChange={handleChange('clientFirstName')}
              disabled={loading}
              error={!formData.clientFirstName}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography>Middle Name</Typography>
            <TextField
              fullWidth
              label=""
              value={formData.clientMiddleName}
              onChange={handleChange('clientMiddleName')}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography>Last Name</Typography>
            <TextField
              fullWidth
              label=""
              value={formData.clientLastName}
              onChange={handleChange('clientLastName')}
              disabled={loading}
              error={!formData.clientLastName}
              required
            />
          </Grid>
        </Grid>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* ... rest of the form fields remain the same ... */}
          {/* Identity Information */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 2, color: 'primary.main' }}>
              Identity & Demographics
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Typography>Aliases</Typography>
            <TextField
              fullWidth
              label=""
              value={formData.clientAliases}
              onChange={handleChange('clientAliases')}
              disabled={loading}
              helperText="Also known as / other names"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography>Citizenship Status</Typography>
            {renderSelect('', formData.clientCitizenship, handleChange('clientCitizenship'), clientCitizenStatus, 'clientCitizenship')}
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography>Veteran Status</Typography>
            {renderSelect('', formData.clientVetStatus, handleChange('clientVetStatus'), clientVeteranStatus, 'clientVetStatus')}
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography>SSN(XXX-XX-XXX)</Typography>
            <TextField
              fullWidth
              label="SSN"
              inputProps={{ maxLength: 9 }}
              value={formData.clientSSN}
              onChange={handleChange('clientSSN')}
              disabled={loading}
              helperText="9 digits, no dashes"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography>Gender</Typography>
            {renderSelect('', formData.clientGender, handleChange('clientGender'), clientGenders, 'clientGender')}
          </Grid>
        </Grid>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={4}>
            <Typography>Pronouns</Typography>
            {renderSelect('', formData.clientPronouns, handleChange('clientPronouns'), clientPronounsList, 'clientPronouns')}
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography>Ethnicity</Typography>
            {renderSelect('', formData.clientEthnicity, handleChange('clientEthnicity'), clientEthnicityList, 'clientEthnicity')}
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography>Race</Typography>
            {renderSelect('', formData.clientRace, handleChange('clientRace'), clientRaceList, 'clientRace')}
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography>Primary Language</Typography>
            {renderSelect('', formData.clientPrimaryLang, handleChange('clientPrimaryLang'), clientLangList, 'clientPrimaryLang')}
          </Grid>
        </Grid>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* Additional Information */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 2, color: 'primary.main' }}>
              Additional Information
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Typography>Marital Status</Typography>
            {renderSelect('', formData.clientMaritalStatus, handleChange('clientMaritalStatus'), maritalStatusList, 'clientMaritalStatus')}
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography>Religious Preference</Typography>
            {renderSelect('', formData.clientReligiousPref, handleChange('clientReligiousPref'), religiousPrefList, 'clientReligiousPref')}
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography>Highest Education</Typography>
            {renderSelect('', formData.clientHighEd, handleChange('clientHighEd'), highestEdu, 'clientHighEd')}
          </Grid>
        </Grid>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* Submit Section */}
          <Grid item xs={12} sx={{ mt: 3, textAlign: 'center' }}>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={handleSubmit}
              disabled={loading}
              sx={{ minWidth: 200 }}
            >
              {loading 
                ? `${editMode ? 'Updating' : 'Creating'} Client...` 
                : `${editMode ? 'Update' : 'Create'} Client`
              }
            </Button>
            
            {!loading && !editMode && (
              <Button 
                variant="outlined" 
                color="secondary" 
                size="large"
                onClick={resetForm}
                sx={{ ml: 2, minWidth: 150 }}
              >
                Reset Form
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>
    </Card>
  );
};

NewClient.propTypes = {
  onClientCreated: PropTypes.func,
  editMode: PropTypes.bool,
  clientData: PropTypes.object,
};

export default NewClient;