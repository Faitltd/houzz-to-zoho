const axios = require('axios');
const nodemailer = require('nodemailer');

/**
 * Send a notification email
 * @param {string} to - The recipient email address
 * @param {string} subject - The email subject
 * @param {string} body - The email body
 * @param {boolean} isHtml - Whether the body is HTML
 * @returns {Promise<boolean>} Whether the email was sent successfully
 */
async function sendNotificationEmail(to, subject, body, isHtml = false) {
  // Skip if email notifications are disabled
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'true') {
    console.log('Email notifications are disabled. Skipping email.');
    return false;
  }
  
  try {
    console.log(`Sending notification email to ${to}...`);
    
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_SERVER || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });
    
    // Send the email
    const info = await transporter.sendMail({
      from: process.env.NOTIFICATION_EMAIL_FROM || process.env.SMTP_USERNAME,
      to,
      subject,
      [isHtml ? 'html' : 'text']: body
    });
    
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending notification email:', error.message);
    return false;
  }
}

/**
 * Send a success notification email
 * @param {string} estimateId - The Zoho estimate ID
 * @param {string} estimateNumber - The Zoho estimate number
 * @param {string} customerName - The customer name
 * @returns {Promise<boolean>} Whether the email was sent successfully
 */
async function sendSuccessNotification(estimateId, estimateNumber, customerName) {
  const to = process.env.NOTIFICATION_EMAIL_TO;
  const subject = `Houzz to Zoho: Estimate ${estimateNumber} Created`;
  
  const body = `
A new estimate has been successfully created in Zoho Books:

Estimate Number: ${estimateNumber}
Estimate ID: ${estimateId}
Customer: ${customerName || 'Unknown'}

You can view the estimate in Zoho Books.

This is an automated notification from the Houzz to Zoho integration.
  `;
  
  return sendNotificationEmail(to, subject, body);
}

/**
 * Send an error notification email
 * @param {string} errorMessage - The error message
 * @returns {Promise<boolean>} Whether the email was sent successfully
 */
async function sendErrorNotification(errorMessage) {
  const to = process.env.NOTIFICATION_EMAIL_TO;
  const subject = 'Houzz to Zoho: Error Occurred';
  
  const body = `
An error occurred in the Houzz to Zoho integration:

${errorMessage}

Please check the logs for more details.

This is an automated notification from the Houzz to Zoho integration.
  `;
  
  return sendNotificationEmail(to, subject, body);
}

/**
 * Send a sync summary email
 * @param {Array} processedFiles - The processed files
 * @param {Array} createdEstimates - The created estimates
 * @param {Array} errors - The errors
 * @returns {Promise<boolean>} Whether the email was sent successfully
 */
async function sendSyncSummary(processedFiles, createdEstimates, errors = []) {
  const to = process.env.NOTIFICATION_EMAIL_TO;
  const subject = 'Houzz to Zoho: Sync Summary';
  
  const body = `
Houzz to Zoho Sync Summary:

Files Processed: ${processedFiles.length}
Estimates Created: ${createdEstimates.length}
Errors: ${errors.length}

Processed Files:
${processedFiles.map(file => `- ${file}`).join('\n')}

Created Estimates:
${createdEstimates.map(([id, number]) => `- ${number} (ID: ${id})`).join('\n')}

${errors.length > 0 ? `Errors:\n${errors.map(error => `- ${error}`).join('\n')}` : ''}

This is an automated notification from the Houzz to Zoho integration.
  `;
  
  return sendNotificationEmail(to, subject, body);
}

module.exports = {
  sendNotificationEmail,
  sendSuccessNotification,
  sendErrorNotification,
  sendSyncSummary
};
