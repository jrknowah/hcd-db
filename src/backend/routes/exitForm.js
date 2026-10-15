// routes/exitForm.js
// Section 1 Exit Form (one per client), mounted at /api/exit-form behind authMiddleware.
// Table: dbo.exit_form (store/dbScripts/exitForm.sql)
const sql = require('mssql');
const { createClientFormRouter } = require('../services/clientFormRecord');

// The exit date and reason are copied to the client so the dashboard can show
// them as Discharged (utils/clientStatus.js). Clearing the date makes them active again.
const syncClientDischarge = (transaction, { clientID, values }) =>
  transaction.request()
    .input('clientID', sql.NVarChar(50), clientID)
    .input('exitDate', sql.Date, values.exitDate)
    .input('exitReason', sql.NVarChar(255), values.exitReason)
    .query(`
      UPDATE dbo.Clients
      SET clientDischargeDate = @exitDate, clientExitReason = @exitReason
      WHERE clientID = @clientID
    `);

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
  afterSave: syncClientDischarge,
});
