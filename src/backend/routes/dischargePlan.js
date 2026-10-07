// routes/dischargePlan.js
// Section 5 Discharge Plan (one per client), mounted at /api/discharge-plan behind authMiddleware.
// Table: dbo.discharge_plan (store/dbScripts/dischargePlan.sql)
const { createClientFormRouter } = require('../services/clientFormRecord');

module.exports = createClientFormRouter({
  table: 'dbo.discharge_plan',
  label: 'Discharge Plan',
  auditTable: 'discharge_plan',
  fields: {
    admissionDate: 'date',
    dischargeDate: 'date',
    primaryDiagnosis: 'text',
    assessmentGoals: 'text',
    dischargeDestination: 'text',
    medicationManagement: 'text',
    medicalEquipment: 'text',
    homeHealthServices: 'text',
    followUpAppointments: 'text',
    patientEducation: 'text',
  },
});
