ALTER TABLE customer_marketing_invitations ADD COLUMN email_shown_at INTEGER;
ALTER TABLE customer_marketing_invitations ADD COLUMN push_shown_at INTEGER;
UPDATE customer_marketing_invitations SET email_shown_at=shown_at;
UPDATE customer_marketing_invitations SET push_shown_at=shown_at
WHERE EXISTS (SELECT 1 FROM customer_push_consent_events
  WHERE customer_id=customer_marketing_invitations.customer_id);
