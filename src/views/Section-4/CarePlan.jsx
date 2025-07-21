import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Typography,
  Box,
  Alert,
  IconButton,
  Chip,
  Paper,
  Divider
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Support as SupportIcon
} from "@mui/icons-material";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { fetchCarePlans, addCarePlan, editCarePlan, deleteCarePlan } from "../../store/slices/carePlanSlice";
import logUserAction from "../../config/logAction";

// ✅ Static mock data outside component
const MOCK_CLIENT = {
  clientID: 'mock-123',
  clientFirstName: 'John',
  clientLastName: 'Doe',
};

const MOCK_USER = {
  email: 'test@example.com',
  name: 'Test User',
};

const MOCK_CARE_PLANS = [
  {
    _id: 'plan-1',
    clientID: 'mock-123',
    careGoal: 'Obtain stable permanent housing',
    careSteps: '1. Complete housing application\n2. Gather required documentation\n3. Attend housing interviews\n4. Follow up with housing coordinators',
    careClientAct: 'Attend all scheduled appointments, provide necessary documentation, maintain contact with case manager',
    careCmAct: 'Assist with application process, provide transportation vouchers, coordinate with housing providers, advocate for client',
    careOutcome: 'Client successfully housed in permanent supportive housing within 90 days',
    status: 'In Progress',
    priority: 'High',
    targetDate: '2024-06-01',
    createdBy: 'test@example.com',
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-10T14:30:00Z'
  },
  {
    _id: 'plan-2',
    clientID: 'mock-123',
    careGoal: 'Improve mental health stability',
    careSteps: '1. Regular psychiatric appointments\n2. Medication compliance\n3. Weekly therapy sessions\n4. Develop coping strategies',
    careClientAct: 'Take medications as prescribed, attend therapy sessions, practice coping techniques daily',
    careCmAct: 'Coordinate mental health services, provide transportation assistance, monitor progress, crisis intervention as needed',
    careOutcome: 'Reduced symptoms of depression and anxiety, improved daily functioning',
    status: 'Active',
    priority: 'High',
    targetDate: '2024-05-15',
    createdBy: 'test@example.com',
    createdAt: '2024-03-05T11:15:00Z',
    updatedAt: '2024-03-12T09:45:00Z'
  },
  {
    _id: 'plan-3',
    clientID: 'mock-123',
    careGoal: 'Establish sustainable income',
    careSteps: '1. Apply for benefits (SSI/SSDI)\n2. Explore vocational training opportunities\n3. Develop job search skills\n4. Connect with employment services',
    careClientAct: 'Complete benefit applications, attend job training programs, actively search for employment opportunities',
    careCmAct: 'Assist with benefit applications, refer to vocational services, provide job search support, connect with employment specialists',
    careOutcome: 'Client receiving benefits and/or employed with sufficient income for independent living',
    status: 'Planning',
    priority: 'Medium',
    targetDate: '2024-08-01',
    createdBy: 'test@example.com',
    createdAt: '2024-03-08T13:20:00Z',
    updatedAt: '2024-03-08T13:20:00Z'
  }
];

const CarePlan = ({ clientID, exportMode }) => {
  const dispatch = useDispatch();
  
  // ✅ Safe selectors
  const reduxUser = useSelector((state) => state?.auth?.user);
  const reduxSelectedClient = useSelector((state) => state?.clients?.selectedClient);
  const carePlanState = useSelector((state) => state?.carePlans || {});
  const { data: reduxCarePlans = [], loading = false, error = null } = carePlanState;

  // ✅ Simple computed values
  const isDevelopment = import.meta.env.MODE === 'development';
  const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
  
  const currentUser = shouldUseMockData && !reduxUser ? MOCK_USER : reduxUser;
  const currentClient = shouldUseMockData && !reduxSelectedClient ? MOCK_CLIENT : reduxSelectedClient;
  const carePlans = shouldUseMockData ? MOCK_CARE_PLANS : reduxCarePlans;

  // Get clientID from props or current client
  const effectiveClientID = clientID || currentClient?.clientID;

  // ✅ Component state
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const initialFormState = {
    careGoal: "",
    careSteps: "",
    careClientAct: "",
    careCmAct: "",
    careOutcome: "",
    status: "Planning",
    priority: "Medium",
    targetDate: ""
  };

  const [formData, setFormData] = useState(initialFormState);

  // ✅ Load care plans when client changes
  useEffect(() => {
    if (!effectiveClientID) return;

    if (shouldUseMockData) {
      // Mock data is already set, no need to fetch
      return;
    }

    if (dispatch && effectiveClientID) {
      dispatch(fetchCarePlans(effectiveClientID));
    }
  }, [effectiveClientID, dispatch, shouldUseMockData]);

  const resetForm = () => {
    setFormData(initialFormState);
    setSaveError(null);
    setSaveSuccess(false);
    setEditMode(false);
    setEditingId(null);
  };

  const toggleModal = () => {
    setModalOpen(!modalOpen);
    if (modalOpen) {
      resetForm();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!effectiveClientID) {
      setSaveError("Please select a client before saving.");
      return;
    }

    if (!formData.careGoal.trim() || !formData.careSteps.trim()) {
      setSaveError("Please fill in at least the Goal and Steps fields.");
      return;
    }

    try {
      if (shouldUseMockData) {
        setTimeout(() => {
          setSaveSuccess(true);
          setTimeout(() => {
            setSaveSuccess(false);
            toggleModal();
          }, 2000);
        }, 1000);
        return;
      }

      if (editMode && editingId) {
        await dispatch(editCarePlan({
          id: editingId,
          updatedData: {
            ...formData,
            updatedBy: currentUser?.email || "unknown",
            updatedAt: new Date().toISOString()
          },
          user: currentUser
        })).unwrap();

        if (currentUser) {
          await logUserAction(currentUser, "EDIT_CARE_PLAN", {
            carePlanId: editingId,
            clientID: effectiveClientID,
            goal: formData.careGoal
          });
        }
      } else {
        await dispatch(addCarePlan({
          clientID: effectiveClientID,
          carePlanData: {
            ...formData,
            createdBy: currentUser?.email || "unknown",
            createdAt: new Date().toISOString()
          },
          user: currentUser
        })).unwrap();

        if (currentUser) {
          await logUserAction(currentUser, "ADD_CARE_PLAN", {
            clientID: effectiveClientID,
            goal: formData.careGoal
          });
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        toggleModal();
      }, 2000);

    } catch (err) {
      console.error("❌ Error saving care plan:", err);
      setSaveError(`Failed to save care plan: ${err.message || err}`);
    }
  };

  const handleEdit = (plan) => {
    setFormData({
      careGoal: plan.careGoal || "",
      careSteps: plan.careSteps || "",
      careClientAct: plan.careClientAct || "",
      careCmAct: plan.careCmAct || "",
      careOutcome: plan.careOutcome || "",
      status: plan.status || "Planning",
      priority: plan.priority || "Medium",
      targetDate: plan.targetDate || ""
    });
    setEditingId(plan._id);
    setEditMode(true);
    setModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    try {
      if (shouldUseMockData) {
        setTimeout(() => {
          setDeleteConfirmOpen(false);
          setDeletingId(null);
        }, 1000);
        return;
      }

      await dispatch(deleteCarePlan({ 
        id: deletingId, 
        user: currentUser 
      })).unwrap();

      if (currentUser) {
        await logUserAction(currentUser, "DELETE_CARE_PLAN", {
          carePlanId: deletingId,
          clientID: effectiveClientID
        });
      }

      setDeleteConfirmOpen(false);
      setDeletingId(null);
    } catch (err) {
      console.error("❌ Error deleting care plan:", err);
      setSaveError(`Failed to delete care plan: ${err.message || err}`);
      setDeleteConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Active': 
      case 'In Progress': return 'primary';
      case 'On Hold': return 'warning';
      case 'Planning': return 'info';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircleIcon />;
      case 'Active':
      case 'In Progress': return <ScheduleIcon />;
      default: return <AssignmentIcon />;
    }
  };

  // ✅ No client selected
  if (!effectiveClientID) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          {isDevelopment 
            ? `Development Mode: No client selected. Mock data ${shouldUseMockData ? 'enabled' : 'disabled'}.`
            : "Please select a client to view care plans."
          }
        </Alert>
      </Box>
    );
  }

  return (
    <Card sx={{ width: '100%' }}>
      {/* ✅ Development indicator */}
      {shouldUseMockData && (
        <Alert severity="info" sx={{ m: 2 }}>
          🔧 Development Mode: Using mock care plan data for {currentClient?.clientFirstName} {currentClient?.clientLastName}
        </Alert>
      )}

      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssignmentIcon color="primary" />
            <Typography variant="h5" component="h2">
              Care Plans
            </Typography>
          </Box>
          {!exportMode && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { 
                resetForm(); 
                setModalOpen(true); 
              }}
              disabled={loading}
            >
              Add Care Plan Goal
            </Button>
          )}
        </Box>

        {/* Stats */}
        {carePlans.length > 0 && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {carePlans.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Goals
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {carePlans.filter(plan => plan.status === 'Completed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {carePlans.filter(plan => plan.status === 'Active' || plan.status === 'In Progress').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main">
                    {carePlans.filter(plan => plan.priority === 'High').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    High Priority
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Success/Error Messages */}
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Care plan saved successfully!
          </Alert>
        )}
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}

        {/* Care Plans Table */}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Goal</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Steps</TableCell>
              <TableCell>Client Actions</TableCell>
              <TableCell>Case Manager Actions</TableCell>
              <TableCell>Expected Outcomes</TableCell>
              {!exportMode && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={exportMode ? 7 : 8} align="center">
                  <Alert severity="info">Loading care plans...</Alert>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={exportMode ? 7 : 8} align="center">
                  <Alert severity="error">Error: {error}</Alert>
                </TableCell>
              </TableRow>
            ) : carePlans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={exportMode ? 7 : 8} align="center">
                  <Alert severity="info">No care plans available.</Alert>
                </TableCell>
              </TableRow>
            ) : (
              carePlans.map((plan) => (
                <TableRow key={plan._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      {getStatusIcon(plan.status)}
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {plan.careGoal}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={plan.status || 'Planning'} 
                      color={getStatusColor(plan.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={plan.priority || 'Medium'} 
                      color={getPriorityColor(plan.priority)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {plan.careSteps}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          maxWidth: 200, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {plan.careClientAct}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <SupportIcon fontSize="small" color="action" />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          maxWidth: 200, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {plan.careCmAct}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {plan.careOutcome}
                    </Typography>
                  </TableCell>
                  {!exportMode && (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleEdit(plan)}
                          disabled={loading}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDeleteClick(plan._id)}
                          disabled={loading}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Add/Edit Care Plan Modal */}
        <Dialog open={modalOpen} onClose={toggleModal} maxWidth="lg" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {editMode ? <EditIcon /> : <AddIcon />}
              {editMode ? "Edit Care Plan Goal" : "Add Care Plan Goal"}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Goal"
                  name="careGoal"
                  value={formData.careGoal}
                  onChange={handleInputChange}
                  multiline
                  rows={2}
                  required
                  placeholder="Define the specific goal for this care plan..."
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  SelectProps={{ native: true }}
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  SelectProps={{ native: true }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Steps to Achieve Goal"
                  name="careSteps"
                  value={formData.careSteps}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  required
                  placeholder="List the specific steps needed to achieve this goal..."
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Client's Actions"
                  name="careClientAct"
                  value={formData.careClientAct}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  placeholder="What actions will the client take?"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Case Manager's Actions"
                  name="careCmAct"
                  value={formData.careCmAct}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  placeholder="What actions will the case manager take?"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Expected Outcomes"
                  name="careOutcome"
                  value={formData.careOutcome}
                  onChange={handleInputChange}
                  multiline
                  rows={2}
                  placeholder="Describe the expected outcomes when this goal is achieved..."
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Target Date"
                  name="targetDate"
                  value={formData.targetDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSave} variant="contained" color="primary">
              {editMode ? "Update Goal" : "Save Goal"}
            </Button>
            <Button onClick={toggleModal} color="secondary">
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this care plan? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
            <Button onClick={() => setDeleteConfirmOpen(false)} color="secondary">
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

CarePlan.propTypes = {
  clientID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  exportMode: PropTypes.bool,
};

CarePlan.defaultProps = {
  clientID: null,
  exportMode: false,
};

export default CarePlan;