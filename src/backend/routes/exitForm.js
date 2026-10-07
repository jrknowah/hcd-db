// routes/exitForm.js
// Section 1 Exit Form (one per client), mounted at /api/exit-form behind authMiddleware.
// Table: dbo.exit_form (store/dbScripts/exitForm.sql)
const { createClientFormRouter } = require('../services/clientFormRecord');

module.exports = createClientFormRouter({
  table: 'dbo.exit_form',
  label: 'Exit Form',
  auditTable: 'exit_form',
  fields: {
    staffNotifiedDate: 'date',
    employeeNotified: 'short',
    notificationMethods: 'list',
    formDate: 'date',
    agency: 'short',
    staffName: 'short',
    staffPhone: 'short',
    admitDate: 'date',
    exitDate: 'date',
    lengthOfStay: 'int',
    icmsProvider: 'short',
    icmsNotified: 'short',
    icmsCaseManager: 'short',
    icmsCaseManagerPhone: 'short',
    exitReason: 'short',
    levelOfCareChange: 'short',
    levelOfCareOther: 'short',
    permanentHousingType: 'short',
    otherReason: 'text',
    additionalInfo: 'text',
    dischargeDestination: 'text',
  },
});
