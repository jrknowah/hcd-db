// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
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

import { fetchClients, addClient, setSelectedClient } from 'src/store/slices/clientSlice';
import logUserAction from 'src/config/logAction';

// ✅ Static mock data outside component
const MOCK_USER = {
  email: 'test@example.com',
  name: 'Test User',
};

const generateMockClientID = () => {
  return 'MOCK-' + Date.now().toString().slice(-6);
};

const NewClient = ({ onClientCreated }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // ✅ Safe selector with mock data fallback
  const reduxUser = useSelector((state) => state?.auth?.user);

  // ✅ Simple computed values
  const isDevelopment = import.meta.env.MODE === 'development';
  const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
  
  const currentUser = shouldUseMockData && !reduxUser ? MOCK_USER : reduxUser;

  const [formData, setFormData] = useState({
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
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ✅ Safe dispatch with mock data protection
  useEffect(() => {
    if (dispatch && !shouldUseMockData) {
      dispatch(fetchClients());
    }
  }, [dispatch, shouldUseMockData]);

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const validateForm = () => {
    const { clientFirstName, clientLastName, clientDOB, clientSite } = formData;
    if (!clientFirstName || !clientLastName || !clientDOB || !clientSite) {
      setError('Please fill in all required fields: First Name, Last Name, Date of Birth, and Site.');
      return false;
    }
    
    // Additional validation
    if (formData.clientSSN && formData.clientSSN.length !== 9) {
      setError('SSN must be exactly 9 digits.');
      return false;
    }

    setError(null);
    return true;
  };

  const resetForm = () => {
    setFormData({
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
    });
    setError(null);
    setSuccess(false);
  };

  const handleAddClient = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      if (shouldUseMockData) {
        // ✅ Mock client creation
        const mockClient = {
          ...formData,
          clientID: generateMockClientID(),
          createdAt: new Date().toISOString(),
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock success
        setSuccess(true);
        
        if (onClientCreated) {
          onClientCreated(mockClient.clientID);
        }

        // Mock navigation after delay
        setTimeout(() => {
          setSuccess(false);
          resetForm();
          // Don't actually navigate in mock mode, just show success
          alert(`✅ Mock client created successfully!\nClient ID: ${mockClient.clientID}\n\nIn production, you would be redirected to the Identification page.`);
        }, 2000);

        return;
      }

      // ✅ Real client creation
      const response = await dispatch(addClient(formData)).unwrap();
      
      if (currentUser) {
        await logUserAction(currentUser.email || '', 'CREATE_CLIENT', { 
          clientID: response.clientID 
        });
      }
      
      if (dispatch) {
        dispatch(setSelectedClient(response));
      }

      setSuccess(true);

      if (onClientCreated) {
        onClientCreated(response.clientID);
      }

      setTimeout(() => {
        navigate('/apps/Identification');
        resetForm();
      }, 3000);

    } catch (err) {
      console.error('❌ Error adding client:', err);
      setError('Failed to add client. Please check all fields and try again.');
    } finally {
      setLoading(false);
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

  return (
    <Card sx={{ 
      p: 3, 
      mx: 'auto',
      maxWidth: {
        xs: '95vw',  // 95% on mobile
        sm: '90vw',  // 90% on small screens
        md: 1400,    // 1400px on medium screens
        lg: 1600,    // 1600px on large screens
        xl: 1800,    // 1800px on extra large screens
      }
    }}>
      {/* ✅ Development indicator */}
      {shouldUseMockData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔧 Development Mode: Client creation will be simulated (no real database changes)
        </Alert>
      )}

      {/* ✅ Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ✅ Success message */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Client created successfully! {shouldUseMockData ? 'Redirecting...' : 'Redirecting to client chart...'}
        </Alert>
      )}

      <Typography variant="h5" gutterBottom>
        New Client Intake
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Fields marked with * are required
      </Typography>

      <Box component="form" sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          {/* First Row - Basic Info */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              Basic Information
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="ID Number"
              value={formData.clientID}
              onChange={handleChange('clientID')}
              disabled={loading}
              helperText="Leave blank for auto-generation"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Client Admit Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formData.clientAdmitDate}
              onChange={handleChange('clientAdmitDate')}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Date of Birth *"
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
            {renderSelect(
              'Site', 
              formData.clientSite, 
              handleChange('clientSite'), 
              hhhSiteList.map(s => s.value), 
              'clientSite',
              true
            )}
          </Grid>

          {/* Name Information */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 2, color: 'primary.main' }}>
              Name Information
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            First Name
            <TextField
              fullWidth
              label="First Name *"
              value={formData.clientFirstName}
              onChange={handleChange('clientFirstName')}
              disabled={loading}
              error={!formData.clientFirstName}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Middle Name"
              value={formData.clientMiddleName}
              onChange={handleChange('clientMiddleName')}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Last Name *"
              value={formData.clientLastName}
              onChange={handleChange('clientLastName')}
              disabled={loading}
              error={!formData.clientLastName}
              required
            />
          </Grid>

          {/* Identity Information */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 2, color: 'primary.main' }}>
              Identity & Demographics
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Aliases"
              value={formData.clientAliases}
              onChange={handleChange('clientAliases')}
              disabled={loading}
              helperText="Also known as / other names"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            {renderSelect('Citizenship Status', formData.clientCitizenship, handleChange('clientCitizenship'), clientCitizenStatus, 'clientCitizenship')}
          </Grid>
          <Grid item xs={12} sm={4}>
            {renderSelect('Veteran Status', formData.clientVetStatus, handleChange('clientVetStatus'), clientVeteranStatus, 'clientVetStatus')}
          </Grid>

          <Grid item xs={12} sm={4}>
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
            {renderSelect('Gender', formData.clientGender, handleChange('clientGender'), clientGenders, 'clientGender')}
          </Grid>
          <Grid item xs={12} sm={4}>
            {renderSelect('Pronouns', formData.clientPronouns, handleChange('clientPronouns'), clientPronounsList, 'clientPronouns')}
          </Grid>

          <Grid item xs={12} sm={4}>
            {renderSelect('Ethnicity', formData.clientEthnicity, handleChange('clientEthnicity'), clientEthnicityList, 'clientEthnicity')}
          </Grid>
          <Grid item xs={12} sm={4}>
            {renderSelect('Race', formData.clientRace, handleChange('clientRace'), clientRaceList, 'clientRace')}
          </Grid>
          <Grid item xs={12} sm={4}>
            {renderSelect('Primary Language', formData.clientPrimaryLang, handleChange('clientPrimaryLang'), clientLangList, 'clientPrimaryLang')}
          </Grid>

          {/* Additional Information */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 2, color: 'primary.main' }}>
              Additional Information
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            {renderSelect('Marital Status', formData.clientMaritalStatus, handleChange('clientMaritalStatus'), maritalStatusList, 'clientMaritalStatus')}
          </Grid>
          <Grid item xs={12} sm={4}>
            {renderSelect('Religious Preference', formData.clientReligiousPref, handleChange('clientReligiousPref'), religiousPrefList, 'clientReligiousPref')}
          </Grid>
          <Grid item xs={12} sm={4}>
            {renderSelect('Highest Education', formData.clientHighEd, handleChange('clientHighEd'), highestEdu, 'clientHighEd')}
          </Grid>

          {/* Submit Section */}
          <Grid item xs={12} sx={{ mt: 3, textAlign: 'center' }}>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={handleAddClient}
              disabled={loading}
              sx={{ minWidth: 200 }}
            >
              {loading ? 'Creating Client...' : 'Create Client'}
            </Button>
            
            {!loading && (
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
};

export default NewClient;