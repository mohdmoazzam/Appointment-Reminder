-- The product is now called ShowUp: update the seeded default email templates.
UPDATE "email_templates"
SET "html" = REPLACE("html", 'Appointment Reminder', 'ShowUp'),
    "text" = REPLACE("text", 'Appointment Reminder', 'ShowUp'),
    "subject" = REPLACE("subject", 'Appointment Reminder', 'ShowUp'),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "is_default" = true;
