// e2e/section1.spec.js
import { test, expect } from '@playwright/test';

test.describe('Section 1 - Client Face Sheet E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Assume user is logged in
    await page.click('text=Clients');
    await page.click('text=John Doe'); // Select a client
    await page.click('text=Identification');
  });

  test('Complete Client Face Sheet workflow', async ({ page }) => {
    // Navigate to Client Face tab
    await page.click('text=Client Face Sheet');

    // Fill Contact Information
    await page.fill('[name="clientContactNum"]', '5551234567');
    await expect(page.locator('[name="clientContactNum"]')).toHaveValue('(555) 123-4567');

    await page.fill('[name="clientEmail"]', 'john.doe@example.com');
    await page.fill('[name="clientContactAltNum"]', '5559876543');

    // Fill Emergency Contact
    await page.fill('[name="clientEmgContactName"]', 'Jane Doe');
    await page.fill('[name="clientEmgContactNum"]', '5551112222');
    await page.fill('[name="clientEmgContactRel"]', 'Spouse');
    await page.fill('[name="clientEmgContactAddress"]', '123 Main St');

    // Fill Medical Insurance
    await page.fill('[name="clientMedInsType"]', 'Medicare');
    await page.fill('[name="clientMedCarrier"]', 'Blue Cross');
    await page.fill('[name="clientMedInsNum"]', 'MED123456789');

    // Select Allergies
    await page.click('text=Select allergies...');
    await page.click('text=Peanuts');
    await page.click('text=Shellfish');

    // Add allergy comments
    await page.fill('[name="clientAllergyComments"]', 'Severe peanut allergy');

    // Verify completion percentage increased
    await expect(page.locator('text=Form Completion')).toBeVisible();

    // Save form
    await page.click('text=Save Client Face Sheet');

    // Verify success message
    await expect(page.locator('text=Client Face Data Saved Successfully')).toBeVisible();
  });

  test('Upload identification documents', async ({ page }) => {
    await page.click('text=Identification Documents');

    // Upload ID Card
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'id-card.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF content')
    });

    await page.click('button:has-text("Upload")');

    // Verify upload success
    await expect(page.locator('text=uploaded successfully')).toBeVisible();
  });

  test('Complete Referrals workflow', async ({ page }) => {
    await page.click('text=Referrals');

    // Fill LAHSA referral
    await page.fill('textarea[name="lahsaReferral"]', 'LAHSA referral completed');

    // Fill ODR referral  
    await page.fill('textarea[name="odrReferral"]', 'ODR evaluation scheduled');

    // Fill DHS referral
    await page.fill('textarea[name="dhsReferral"]', 'DHS benefits approved');

    // Save
    await page.click('text=Save Referral Notes');

    // Verify success
    await expect(page.locator('text=saved successfully')).toBeVisible();
  });

  test('Complete Discharge Summary workflow', async ({ page }) => {
    await page.click('text=Discharge');

    // Fill discharge date
    await page.fill('[name="clientDischargeDate"]', '2025-03-15');

    // Fill primary diagnosis
    await page.fill('[name="clientDischargeDiag"]', 'Acute condition resolved');

    // Fill all 7 sections
    await page.fill('[name="clientDischargI"]', 'Assessment and goals completed');
    await page.fill('[name="clientDischargII"]', 'Discharge to home');
    await page.fill('[name="clientDischargIII"]', 'Medication list provided');
    await page.fill('[name="clientDischargIV"]', 'Medical equipment provided');
    await page.fill('[name="clientDischargV"]', 'Home health services arranged');
    await page.fill('[name="clientDischargVI"]', 'Follow-up scheduled');
    await page.fill('[name="clientDischargVII"]', 'Patient education completed');

    // Save
    await page.click('text=Save Discharge Summary');

    // Verify success
    await expect(page.locator('text=saved successfully')).toBeVisible();
  });

  test('Export complete chart to PDF', async ({ page }) => {
    await page.click('text=Export Chart');

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Export Complete Chart to PDF');

    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});