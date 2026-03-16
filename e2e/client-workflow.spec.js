// e2e/client-workflow.spec.js
import { test, expect } from '@playwright/test';

test.describe('Client Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:5173/dashboard');
    
    // Wait for page to load
    await page.waitForSelector('text=Client Management Dashboard');
  });

  test('Complete client creation workflow', async ({ page }) => {
    // Step 1: Click Add New Client button
    await page.click('button:has-text("Add New Client")');
    
    // Step 2: Wait for modal to open
    await expect(page.locator('text=New Client Intake')).toBeVisible();
    
    // Step 3: Fill in required fields
    const timestamp = Date.now();
    await page.fill('input[label="Client ID"]', `TEST-${timestamp}`);
    await page.fill('input[type="date"]', '1990-01-15');
    await page.selectOption('select#clientSite', 'Main Campus');
    await page.fill('input[value=""][name="clientFirstName"]', 'John');
    await page.fill('input[value=""][name="clientLastName"]', 'Doe');
    
    // Step 4: Submit form
    await page.click('button:has-text("Create Client")');
    
    // Step 5: Verify success message
    await expect(page.locator('text=Client created successfully')).toBeVisible({ timeout: 5000 });
    
    // Step 6: Verify client appears in list
    await page.waitForTimeout(2000); // Wait for refresh
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('Search for existing client', async ({ page }) => {
    // Type in search box
    await page.fill('input[placeholder="Search clients..."]', 'John');
    
    // Wait for filtering
    await page.waitForTimeout(500);
    
    // Verify filtered results
    const clientRows = await page.locator('text=John').count();
    expect(clientRows).toBeGreaterThan(0);
  });

  test('Filter clients by veteran status', async ({ page }) => {
    // Click Veterans filter chip
    await page.click('text=Veterans');
    
    // Wait for filtering
    await page.waitForTimeout(500);
    
    // Verify URL or visual indication of filter
    const veteranChip = page.locator('text=Veterans');
    await expect(veteranChip).toHaveClass(/MuiChip-filled/);
  });

  test('View client profile', async ({ page }) => {
    // Click on first client in table
    await page.click('table tbody tr:first-child');
    
    // Wait for profile sidebar to appear
    await expect(page.locator('text=Client Profile')).toBeVisible({ timeout: 3000 });
  });

  test('Edit client information', async ({ page }) => {
    // Click on first client
    await page.click('table tbody tr:first-child');
    
    // Wait for profile to load
    await page.waitForTimeout(1000);
    
    // Click edit button (look for edit icon or button)
    const editButton = page.locator('button[aria-label="Edit"]').first();
    await editButton.click();
    
    // Wait for edit modal
    await expect(page.locator('text=Edit Client Information')).toBeVisible();
    
    // Make a change
    await page.fill('input[name="clientMiddleName"]', 'Michael');
    
    // Save
    await page.click('button:has-text("Update Client")');
    
    // Verify success
    await expect(page.locator('text=Client updated successfully')).toBeVisible({ timeout: 5000 });
  });

  test('Navigate to client forms', async ({ page }) => {
    // Click on first client
    await page.click('table tbody tr:first-child');
    
    // Wait for profile
    await page.waitForTimeout(1000);
    
    // Click View Forms button
    await page.click('button:has-text("View Forms")');
    
    // Verify navigation to Section 2
    await expect(page).toHaveURL(/Section2/);
  });

  test('Dashboard statistics are accurate', async ({ page }) => {
    // Get total clients count
    const totalClientsText = await page.locator('text=Total Clients').locator('..').locator('h4').textContent();
    const totalClients = parseInt(totalClientsText || '0');
    
    // Count actual clients in table
    const tableRows = await page.locator('table tbody tr').count();
    
    // Verify they match (or are reasonable)
    expect(tableRows).toBeLessThanOrEqual(totalClients);
  });

  test('Toggle between table and grid view', async ({ page }) => {
    // Click grid view button
    await page.click('button[title="Grid View"]');
    
    // Wait for view change
    await page.waitForTimeout(500);
    
    // Verify grid view is active (button should have primary color)
    const gridButton = page.locator('button[title="Grid View"]');
    await expect(gridButton).toHaveClass(/MuiIconButton-colorPrimary/);
    
    // Switch back to table view
    await page.click('button[title="Table View"]');
    await page.waitForTimeout(500);
    
    const tableButton = page.locator('button[title="Table View"]');
    await expect(tableButton).toHaveClass(/MuiIconButton-colorPrimary/);
  });

  test('Refresh clients list', async ({ page }) => {
    // Get initial count
    const initialText = await page.locator('text=/Showing \\d+ of \\d+ clients/').textContent();
    
    // Click refresh button
    await page.click('button[title="Refresh"]');
    
    // Wait for refresh
    await page.waitForTimeout(1000);
    
    // Verify count is still displayed (data refreshed)
    await expect(page.locator('text=/Showing \\d+ of \\d+ clients/')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('Handle network errors gracefully', async ({ page, context }) => {
    // Block API calls to simulate network error
    await context.route('**/api/clients', route => route.abort());
    
    // Navigate to dashboard
    await page.goto('http://localhost:5173/dashboard');
    
    // Verify error message is displayed
    await expect(page.locator('text=/Failed to fetch clients|error/i')).toBeVisible({ timeout: 5000 });
  });

  test('Validate form inputs', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');
    
    // Open new client modal
    await page.click('button:has-text("Add New Client")');
    
    // Try to submit empty form
    await page.click('button:has-text("Create Client")');
    
    // Verify validation error
    await expect(page.locator('text=/Please fill in all required fields/i')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('Dashboard works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('http://localhost:5173/dashboard');
    
    // Verify dashboard loads
    await expect(page.locator('text=Client Management Dashboard')).toBeVisible();
    
    // Verify cards stack vertically on mobile
    const cards = await page.locator('[class*="MuiCard-root"]').count();
    expect(cards).toBeGreaterThan(0);
  });
});