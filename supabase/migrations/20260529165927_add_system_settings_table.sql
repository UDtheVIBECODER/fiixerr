/*
  # Add system_settings table for POS/payment configuration

  ## Summary
  Creates a secure key-value store for system-wide configuration, initially used
  to hold payment gateway API keys and merchant credentials entered by the
  ULTIMATE_ADMIN owner.

  ## New Tables
  - `system_settings`
    - `id` (uuid, PK)
    - `key` (text, unique) — setting identifier e.g. "stripe_live_key"
    - `value` (text) — the setting value (encrypted at rest by Supabase)
    - `description` (text, nullable) — human-readable description
    - `updated_by` (uuid, FK → auth.users) — who last changed this
    - `updated_at` (timestamptz) — last modified timestamp
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled; locked down by default
  - Only ULTIMATE_ADMIN can SELECT, INSERT, UPDATE
  - No DELETE policy (soft-delete via value = '' if needed)
  - Uses has_role() SECURITY DEFINER helper already in place

  ## Notes
  - Payment credentials are stored server-side and only read from
    server functions; the client never receives raw API keys
  - The checkout page fetches a sanitized "enabled gateways" list,
    not the actual credentials
*/

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ULTIMATE_ADMIN can read all settings
CREATE POLICY "Ultimate admin can read system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'ULTIMATE_ADMIN'::app_role));

-- ULTIMATE_ADMIN can insert new settings
CREATE POLICY "Ultimate admin can insert system settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'ULTIMATE_ADMIN'::app_role));

-- ULTIMATE_ADMIN can update existing settings
CREATE POLICY "Ultimate admin can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'ULTIMATE_ADMIN'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ULTIMATE_ADMIN'::app_role));

-- Seed default gateway keys (empty values — owner fills them in)
INSERT INTO system_settings (key, description) VALUES
  ('stripe_publishable_key', 'Stripe publishable key (pk_live_...)'),
  ('stripe_secret_key', 'Stripe secret key (sk_live_...)'),
  ('paypal_client_id', 'PayPal client ID'),
  ('cashapp_merchant_id', 'Cash App Pay merchant ID'),
  ('enabled_gateways', 'Comma-separated list of active gateways: stripe,paypal,cashapp,applepay,googlepay')
ON CONFLICT (key) DO NOTHING;
