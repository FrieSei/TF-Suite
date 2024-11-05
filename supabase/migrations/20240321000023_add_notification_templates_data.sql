-- Insert German templates
INSERT INTO notification_templates (
    type,
    category,
    language,
    subject,
    body
) VALUES
-- Surgery templates
(
    'surgery',
    'reminder',
    'german',
    'Erinnerung an Ihre Operation',
    'Freundliche Erinnerung an Ihre Operation morgen. Wir freuen uns darauf, Sie bestens zu versorgen! Bitte denken Sie daran, 6 Stunden vor der Operation nichts zu essen oder zu trinken. Vermeiden Sie Aspirin und NSAIDs (wie Ibuprofen). Bei Fragen können Sie sich jederzeit an uns wenden. Wir freuen uns auf Sie!'
),
-- Minimal and consultation templates
(
    'minimal',
    'reminder',
    'german',
    'Terminerinnerung',
    'Freundliche Erinnerung an Ihren Termin morgen. Wir freuen uns auf Sie!'
),
(
    'consultation',
    'reminder',
    'german',
    'Terminerinnerung',
    'Freundliche Erinnerung an Ihren Termin morgen. Wir freuen uns auf Sie!'
);

-- Insert English templates
INSERT INTO notification_templates (
    type,
    category,
    language,
    subject,
    body
) VALUES
-- Surgery templates
(
    'surgery',
    'reminder',
    'english',
    'Surgery Reminder',
    'Just a friendly reminder about your surgery tomorrow. We''re looking forward to taking good care of you! Please remember not to eat or drink anything 6 hours before your surgery time. Make sure to avoid aspirin and NSAIDs (like ibuprofen). For any questions, feel free to reach out to us. We''re looking forward to seeing you!'
),
-- Minimal and consultation templates
(
    'minimal',
    'reminder',
    'english',
    'Appointment Reminder',
    'Just a friendly reminder about your appointment tomorrow. We''re looking forward to seeing you!'
),
(
    'consultation',
    'reminder',
    'english',
    'Appointment Reminder',
    'Just a friendly reminder about your appointment tomorrow. We''re looking forward to seeing you!'
);