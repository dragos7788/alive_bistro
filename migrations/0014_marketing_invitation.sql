CREATE TABLE customer_marketing_invitations (
  customer_id TEXT PRIMARY KEY REFERENCES customers(id),
  shown_at INTEGER NOT NULL
);
