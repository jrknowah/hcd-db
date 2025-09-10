// services/pdfExportService.js
import html2pdf from 'html2pdf.js';

class PDFExportService {
  constructor() {
    this.defaultOptions = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: 'client_chart.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: 'in', 
        format: 'letter', 
        orientation: 'portrait',
        compress: true 
      },
      pagebreak: { 
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-break-before',
        after: '.page-break-after'
      }
    };
  }

  /**
   * Generate PDF from client data
   * @param {Object} clientData - Complete client information
   * @param {Object} options - Export options
   * @returns {Promise} PDF generation promise
   */
  async exportClientChart(clientData, options = {}) {
    const exportOptions = { ...this.defaultOptions, ...options };
    
    // Generate filename
    const filename = `${clientData.client?.clientLastName || 'Unknown'}_${clientData.client?.clientFirstName || 'Client'}_Complete_Chart.pdf`;
    exportOptions.filename = filename;

    try {
      // Create the HTML content
      const htmlContent = this.generateHTMLContent(clientData);
      
      console.log('🔍 Generated HTML content length:', htmlContent.length);
      console.log('📝 HTML preview:', htmlContent.substring(0, 500));
      
      // Create temporary container with better styling
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlContent;
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 8.5in;
        background: white;
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
        padding: 0.5in;
      `;
      
      document.body.appendChild(tempContainer);
      
      console.log('📄 Temp container created, content:', tempContainer.innerHTML.length);

      // Wait a bit for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate PDF with better options
      const pdfOptions = {
        ...exportOptions,
        html2canvas: {
          ...exportOptions.html2canvas,
          width: 816, // 8.5 inches * 96 DPI
          height: 1056, // 11 inches * 96 DPI
          scrollX: 0,
          scrollY: 0
        }
      };

      console.log('🔧 PDF options:', pdfOptions);

      await html2pdf().set(pdfOptions).from(tempContainer).save();
      
      console.log('✅ PDF generated successfully');
      
      return {
        success: true,
        filename: filename,
        message: 'PDF exported successfully'
      };
    } catch (error) {
      console.error('❌ PDF Export Error:', error);
      throw new Error(`Failed to export PDF: ${error.message}`);
    } finally {
      // Clean up
      const containers = document.querySelectorAll('div[style*="-9999px"]');
      containers.forEach(container => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      });
    }
  }

  /**
   * Generate complete HTML content for PDF
   * @param {Object} clientData - All client information
   * @returns {string} HTML content
   */
  generateHTMLContent(clientData) {
    const { 
      client, 
      clientFace, 
      referrals, 
      discharge, 
      files = [] 
    } = clientData;

    console.log('🔍 Generating HTML for client data:', {
      hasClient: !!client,
      hasClientFace: !!clientFace,
      hasReferrals: !!referrals,
      hasDischarge: !!discharge,
      filesCount: files?.length || 0
    });

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            color: #333; 
            line-height: 1.4; 
            background: white;
            padding: 20px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #2196F3; 
            padding-bottom: 20px; 
          }
          .header h1 { 
            margin: 0; 
            color: #2196F3; 
            font-size: 28px; 
          }
          .header h2 { 
            margin: 10px 0; 
            color: #333; 
            font-size: 22px; 
          }
          .header p { 
            margin: 5px 0; 
            color: #666; 
            font-size: 14px; 
          }
          .section { 
            margin-bottom: 40px; 
            page-break-inside: avoid; 
          }
          .section-title { 
            color: #2196F3; 
            border-bottom: 2px solid #2196F3; 
            padding-bottom: 10px; 
            margin-bottom: 20px; 
            font-size: 20px;
          }
          .subsection { 
            margin-bottom: 25px; 
          }
          .subsection-title { 
            color: #333; 
            margin-bottom: 15px; 
            background: #f5f5f5; 
            padding: 10px; 
            border-left: 4px solid #2196F3; 
          }
          .field-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-left: 20px; 
          }
          .field { 
            margin-bottom: 8px; 
          }
          .field strong { 
            color: #333; 
          }
          .content-box { 
            margin-left: 20px; 
            padding: 15px; 
            background: #fafafa; 
            border-radius: 5px; 
          }
          .alert-box { 
            background: #fff3cd; 
            padding: 15px; 
            border-radius: 5px; 
            border-left: 4px solid #FFC107; 
            margin-left: 20px; 
          }
          .file-list { 
            margin-left: 20px; 
          }
          .file-item { 
            margin-bottom: 5px; 
            padding: 5px; 
            background: #f9f9f9; 
          }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            text-align: center; 
            color: #666; 
            font-size: 12px; 
          }
          .page-break { 
            page-break-before: always; 
          }
        </style>
      </head>
      <body>
        ${this.generateHeader(client)}
        ${this.generateClientFaceSection(clientFace, client)}
        ${this.generateFilesSection(files)}
        ${this.generateReferralsSection(referrals)}
        ${this.generateDischargeSection(discharge)}
        ${this.generateFooter()}
      </body>
      </html>
    `;

    console.log('📝 Generated HTML content length:', content.length);
    return content;
  }

  /**
   * Generate PDF header
   */
  generateHeader(client) {
    const currentDate = new Date().toLocaleDateString();
    
    return `
      <div class="header">
        <h1>CLIENT CHART</h1>
        <h2>${client?.clientFirstName || 'Unknown'} ${client?.clientLastName || 'Client'}</h2>
        <p>Client ID: ${client?.clientID || 'N/A'} | Generated: ${currentDate}</p>
        <p>Site: ${client?.clientSite || 'N/A'} | DOB: ${client?.clientDOB ? new Date(client.clientDOB).toLocaleDateString() : 'N/A'}</p>
      </div>
    `;
  }

  /**
   * Generate Client Face Sheet section
   */
  generateClientFaceSection(clientFace, client) {
    if (!clientFace) {
      return `
        <div class="section">
          <h2 class="section-title">📋 CLIENT FACE SHEET</h2>
          <p style="color: #666; font-style: italic; margin-left: 20px;">No face sheet information available.</p>
        </div>
      `;
    }

    return `
      <div class="section page-break">
        <h2 class="section-title">📋 CLIENT FACE SHEET</h2>
        
        <!-- Contact Information -->
        <div class="subsection">
          <h3 class="subsection-title">📞 Contact Information</h3>
          <div class="field-grid">
            <div class="field"><strong>Primary Phone:</strong> ${clientFace.clientContactNum || 'Not provided'}</div>
            <div class="field"><strong>Alt Phone:</strong> ${clientFace.clientContactAltNum || 'Not provided'}</div>
            <div class="field" style="grid-column: span 2;"><strong>Email:</strong> ${clientFace.clientEmail || 'Not provided'}</div>
          </div>
        </div>

        <!-- Emergency Contact -->
        <div class="subsection">
          <h3 class="subsection-title">🚨 Emergency Contact</h3>
          <div style="margin-left: 20px;">
            <div class="field"><strong>Name:</strong> ${clientFace.clientEmgContactName || 'Not provided'}</div>
            <div class="field"><strong>Phone:</strong> ${clientFace.clientEmgContactNum || 'Not provided'}</div>
            <div class="field"><strong>Relationship:</strong> ${clientFace.clientEmgContactRel || 'Not provided'}</div>
            <div class="field"><strong>Address:</strong> ${clientFace.clientEmgContactAddress || 'Not provided'}</div>
          </div>
        </div>

        <!-- Medical Information -->
        <div class="subsection">
          <h3 class="subsection-title">🏥 Medical Insurance</h3>
          <div class="field-grid">
            <div class="field"><strong>Insurance Type:</strong> ${clientFace.clientMedInsType || 'Not provided'}</div>
            <div class="field"><strong>Carrier:</strong> ${clientFace.clientMedCarrier || 'Not provided'}</div>
            <div class="field" style="grid-column: span 2;"><strong>Insurance #:</strong> ${clientFace.clientMedInsNum || 'Not provided'}</div>
          </div>
        </div>

        <!-- Allergies -->
        <div class="subsection">
          <h3 class="subsection-title">⚠️ Allergies & Medical Notes</h3>
          <div class="alert-box">
            ${clientFace.clientAllergyComments || 'No allergy information provided'}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate Files section
   */
  generateFilesSection(files) {
    if (!files || files.length === 0) {
      return `
        <div style="margin-bottom: 40px;">
          <h2 style="color: #2196F3; border-bottom: 2px solid #2196F3; padding-bottom: 10px; margin-bottom: 20px;">
            📁 UPLOADED DOCUMENTS
          </h2>
          <p style="color: #666; font-style: italic; margin-left: 20px;">No documents uploaded.</p>
        </div>
      `;
    }

    const filesByType = files.reduce((acc, file) => {
      const type = file.docType || 'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(file);
      return acc;
    }, {});

    const filesHTML = Object.entries(filesByType).map(([docType, typeFiles]) => `
      <div style="margin-bottom: 20px;">
        <h4 style="color: #333; margin-bottom: 10px; background: #e3f2fd; padding: 8px; border-radius: 4px;">
          📄 ${docType} (${typeFiles.length} file${typeFiles.length > 1 ? 's' : ''})
        </h4>
        <ul style="margin: 0; padding-left: 30px;">
          ${typeFiles.map(file => `
            <li style="margin-bottom: 5px;">
              <strong>${file.fileName}</strong>
              <span style="color: #666; font-size: 12px;">
                (${this.formatFileSize(file.fileSize)} - ${new Date(file.uploadDate).toLocaleDateString()})
              </span>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('');

    return `
      <div class="page-break-before" style="margin-bottom: 40px;">
        <h2 style="color: #2196F3; border-bottom: 2px solid #2196F3; padding-bottom: 10px; margin-bottom: 20px;">
          📁 UPLOADED DOCUMENTS
        </h2>
        <div style="margin-left: 20px;">
          ${filesHTML}
        </div>
      </div>
    `;
  }

  /**
   * Generate Referrals section
   */
  generateReferralsSection(referrals) {
    if (!referrals) return '';

    const referralTypes = [
      { key: 'lahsaReferral', label: 'LAHSA Referral', icon: '🏠' },
      { key: 'odrReferral', label: 'ODR Referral', icon: '♿' },
      { key: 'dhsReferral', label: 'DHS Referral', icon: '🏥' }
    ];

    const referralsHTML = referralTypes.map(type => {
      const content = referrals[type.key];
      if (!content) return '';

      return `
        <div style="margin-bottom: 25px;">
          <h3 style="color: #333; margin-bottom: 15px; background: #f5f5f5; padding: 10px; border-left: 4px solid #9C27B0;">
            ${type.icon} ${type.label}
          </h3>
          <div style="margin-left: 20px; padding: 15px; background: #fafafa; border-radius: 5px;">
            ${content.split('\n').map(line => `<p style="margin: 8px 0;">${line}</p>`).join('')}
          </div>
        </div>
      `;
    }).filter(Boolean).join('');

    return `
      <div class="page-break-before" style="margin-bottom: 40px;">
        <h2 style="color: #2196F3; border-bottom: 2px solid #2196F3; padding-bottom: 10px; margin-bottom: 20px;">
          📝 REFERRALS
        </h2>
        ${referralsHTML || '<p style="color: #666; font-style: italic; margin-left: 20px;">No referral information provided.</p>'}
      </div>
    `;
  }

  /**
   * Generate Discharge section
   */
  generateDischargeSection(discharge) {
    if (!discharge) return '';

    const sections = [
      { key: 'clientDischargeDiag', label: 'Primary Diagnosis', icon: '🔍' },
      { key: 'clientDischargI', label: 'I. Assessment and Goals', icon: '🎯' },
      { key: 'clientDischargII', label: 'II. Discharge Destination', icon: '🏠' },
      { key: 'clientDischargIII', label: 'III. Medication Management', icon: '💊' },
      { key: 'clientDischargIV', label: 'IV. Medical Equipment & Supplies', icon: '🏥' },
      { key: 'clientDischargV', label: 'V. Home Health Services', icon: '👩‍⚕️' },
      { key: 'clientDischargVI', label: 'VI. Follow-up Appointments', icon: '📅' },
      { key: 'clientDischargVII', label: 'VII. Patient & Caregiver Education', icon: '📚' }
    ];

    const dischargeHTML = sections.map(section => {
      const content = discharge[section.key];
      if (!content) return '';

      return `
        <div style="margin-bottom: 25px;">
          <h3 style="color: #333; margin-bottom: 15px; background: #f5f5f5; padding: 10px; border-left: 4px solid #FF5722;">
            ${section.icon} ${section.label}
          </h3>
          <div style="margin-left: 20px; padding: 15px; background: #fafafa; border-radius: 5px;">
            ${content.split('\n').map(line => `<p style="margin: 8px 0;">${line}</p>`).join('')}
          </div>
        </div>
      `;
    }).filter(Boolean).join('');

    return `
      <div class="page-break-before" style="margin-bottom: 40px;">
        <h2 style="color: #2196F3; border-bottom: 2px solid #2196F3; padding-bottom: 10px; margin-bottom: 20px;">
          📋 DISCHARGE SUMMARY
        </h2>
        ${discharge.clientDischargeDate ? `
          <div style="margin-bottom: 20px; padding: 10px; background: #e8f5e8; border-radius: 5px; border-left: 4px solid #4CAF50;">
            <strong>📅 Discharge Date:</strong> ${new Date(discharge.clientDischargeDate).toLocaleDateString()}
          </div>
        ` : ''}
        ${dischargeHTML || '<p style="color: #666; font-style: italic; margin-left: 20px;">No discharge information provided.</p>'}
      </div>
    `;
  }

  /**
   * Generate PDF footer
   */
  generateFooter() {
    const timestamp = new Date().toLocaleString();
    
    return `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
        <p>This document was generated automatically on ${timestamp}</p>
        <p>© Healthcare Documentation System - Confidential Patient Information</p>
      </div>
    `;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Export with progress tracking
   */
  async exportWithProgress(clientData, onProgress, options = {}) {
    const steps = [
      { name: 'Collecting data', progress: 10 },
      { name: 'Generating HTML', progress: 30 },
      { name: 'Creating PDF', progress: 70 },
      { name: 'Finalizing', progress: 100 }
    ];

    try {
      for (const step of steps) {
        onProgress?.(step.progress, step.name);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const result = await this.exportClientChart(clientData, options);
      onProgress?.(100, 'Complete');
      return result;
    } catch (error) {
      onProgress?.(0, 'Error occurred');
      throw error;
    }
  }
}

// Export singleton instance
export const pdfExportService = new PDFExportService();
export default pdfExportService;