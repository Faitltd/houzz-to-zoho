import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import logging
import os
from config import (
    SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD,
    NOTIFICATION_EMAIL_FROM, NOTIFICATION_EMAIL_TO,
    ENABLE_EMAIL_NOTIFICATIONS
)

logger = logging.getLogger(__name__)

class EmailNotifier:
    """Handles sending email notifications."""
    
    def __init__(self):
        self.smtp_server = SMTP_SERVER
        self.smtp_port = SMTP_PORT
        self.username = SMTP_USERNAME
        self.password = SMTP_PASSWORD
        self.from_email = NOTIFICATION_EMAIL_FROM
        self.to_email = NOTIFICATION_EMAIL_TO
        self.enabled = ENABLE_EMAIL_NOTIFICATIONS
    
    def send_email(self, subject, body, attachments=None, html=False):
        """
        Send an email notification.
        
        Args:
            subject: Email subject
            body: Email body
            attachments: List of file paths to attach
            html: Whether the body is HTML
        
        Returns:
            True if the email was sent successfully, False otherwise
        """
        if not self.enabled:
            logger.info("Email notifications are disabled. Skipping email.")
            return False
        
        try:
            # Create the email message
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = self.to_email
            msg['Subject'] = subject
            
            # Add the body
            if html:
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))
            
            # Add attachments
            if attachments:
                for file_path in attachments:
                    if os.path.exists(file_path):
                        with open(file_path, 'rb') as f:
                            attachment = MIMEApplication(f.read(), _subtype="txt")
                            attachment.add_header('Content-Disposition', 'attachment', filename=os.path.basename(file_path))
                            msg.attach(attachment)
            
            # Create a secure SSL context
            context = ssl.create_default_context()
            
            # Send the email
            with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, context=context) as server:
                server.login(self.username, self.password)
                server.sendmail(self.from_email, self.to_email, msg.as_string())
            
            logger.info(f"Email notification sent to {self.to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email notification: {str(e)}")
            return False
    
    def send_success_notification(self, estimate_id, estimate_number, customer_name=None):
        """Send a notification when an estimate is successfully created."""
        subject = f"Houzz to Zoho: Estimate {estimate_number} Created"
        
        customer_info = f"for {customer_name}" if customer_name else ""
        
        body = f"""
        A new estimate has been successfully created in Zoho Books:
        
        Estimate Number: {estimate_number}
        Estimate ID: {estimate_id}
        {customer_info}
        
        You can view the estimate in Zoho Books.
        
        This is an automated notification from the Houzz to Zoho integration.
        """
        
        return self.send_email(subject, body)
    
    def send_error_notification(self, error_message, log_file=None):
        """Send a notification when an error occurs."""
        subject = "Houzz to Zoho: Error Occurred"
        
        body = f"""
        An error occurred in the Houzz to Zoho integration:
        
        {error_message}
        
        Please check the logs for more details.
        
        This is an automated notification from the Houzz to Zoho integration.
        """
        
        attachments = [log_file] if log_file and os.path.exists(log_file) else None
        
        return self.send_email(subject, body, attachments)
    
    def send_sync_summary(self, processed_files, created_estimates, errors=None):
        """Send a summary of the sync process."""
        subject = "Houzz to Zoho: Sync Summary"
        
        body = f"""
        Houzz to Zoho Sync Summary:
        
        Files Processed: {len(processed_files)}
        Estimates Created: {len(created_estimates)}
        Errors: {len(errors) if errors else 0}
        
        Processed Files:
        {', '.join(processed_files) if processed_files else 'None'}
        
        Created Estimates:
        {', '.join([f"{num} (ID: {id})" for id, num in created_estimates]) if created_estimates else 'None'}
        
        Errors:
        {', '.join(errors) if errors else 'None'}
        
        This is an automated notification from the Houzz to Zoho integration.
        """
        
        return self.send_email(subject, body)
