# Firearm Forms Management Application - Setup Guide

This application is built with Next.js 16, React 19, TypeScript, Tailwind CSS, and Supabase for managing firearm-related forms including special orders, transfers, and suppressor approvals.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Fastbound API credentials (optional, for webhook integration)

## Installation Steps

### 1. Install Dependencies

```bash
cd firearm-forms-app
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory by copying the template:

```bash
# Copy the template
cp env.template .env.local
```

Edit `.env.local` and add your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Fastbound API Configuration (Optional)
FASTBOUND_API_KEY=your_fastbound_api_key
FASTBOUND_API_URL=https://api.fastbound.com
```

### 3. Set Up Supabase Database

#### A. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details
5. Wait for the project to be created

#### B. Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
3. Copy the **anon/public** key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Add these to your `.env.local` file

#### C. Create Database Tables

Go to the **SQL Editor** in your Supabase dashboard and run the following SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Special Orders Table
CREATE TABLE special_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  firearm_type TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  caliber TEXT NOT NULL,
  serial_number TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2),
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inbound Transfers Table
CREATE TABLE inbound_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transferor_name TEXT NOT NULL,
  transferor_ffl TEXT,
  transferor_address TEXT NOT NULL,
  transferor_city TEXT NOT NULL,
  transferor_state TEXT NOT NULL,
  transferor_zip TEXT NOT NULL,
  firearm_type TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  caliber TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  transfer_date DATE NOT NULL,
  atf_form_type TEXT NOT NULL,
  tracking_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'received', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppressor Approvals Table
CREATE TABLE suppressor_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_city TEXT NOT NULL,
  customer_state TEXT NOT NULL,
  customer_zip TEXT NOT NULL,
  suppressor_manufacturer TEXT NOT NULL,
  suppressor_model TEXT NOT NULL,
  suppressor_caliber TEXT NOT NULL,
  suppressor_serial_number TEXT NOT NULL,
  trust_name TEXT,
  form_type TEXT NOT NULL CHECK (form_type IN ('Form 1', 'Form 4')),
  submission_date DATE NOT NULL,
  approval_date DATE,
  tax_stamp_number TEXT,
  examiner_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'denied', 'picked_up')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outbound Transfers Table
CREATE TABLE outbound_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transferee_name TEXT NOT NULL,
  transferee_ffl TEXT,
  transferee_address TEXT NOT NULL,
  transferee_city TEXT NOT NULL,
  transferee_state TEXT NOT NULL,
  transferee_zip TEXT NOT NULL,
  firearm_type TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  caliber TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  transfer_date DATE NOT NULL,
  atf_form_type TEXT NOT NULL,
  tracking_number TEXT,
  carrier TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shipped', 'delivered', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_special_orders_updated_at BEFORE UPDATE ON special_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inbound_transfers_updated_at BEFORE UPDATE ON inbound_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppressor_approvals_updated_at BEFORE UPDATE ON suppressor_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outbound_transfers_updated_at BEFORE UPDATE ON outbound_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_special_orders_status ON special_orders(status);
CREATE INDEX idx_special_orders_created_at ON special_orders(created_at DESC);
CREATE INDEX idx_inbound_transfers_status ON inbound_transfers(status);
CREATE INDEX idx_inbound_transfers_created_at ON inbound_transfers(created_at DESC);
CREATE INDEX idx_suppressor_approvals_status ON suppressor_approvals(status);
CREATE INDEX idx_suppressor_approvals_created_at ON suppressor_approvals(created_at DESC);
CREATE INDEX idx_outbound_transfers_status ON outbound_transfers(status);
CREATE INDEX idx_outbound_transfers_created_at ON outbound_transfers(created_at DESC);
```

#### D. Set Up Row Level Security (RLS) - Optional but Recommended

If you want to add security policies:

```sql
-- Enable RLS on all tables
ALTER TABLE special_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppressor_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies (example: allow all operations for now)
-- You should customize these based on your authentication needs

CREATE POLICY "Enable all operations for all users" ON special_orders
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON inbound_transfers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON suppressor_approvals
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON outbound_transfers
  FOR ALL USING (true) WITH CHECK (true);
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Fastbound Integration (Optional)

### Setting Up Webhooks

1. Log in to your Fastbound account
2. Navigate to API settings
3. Create a new webhook pointing to: `https://your-domain.com/api/fastbound`
4. Add your Fastbound API key to `.env.local`

### Using Fastbound Data

The application includes a Fastbound integration that can:
- Receive webhook notifications from Fastbound
- Fetch firearm data from Fastbound API
- Auto-populate form fields with Fastbound data

To use this feature, you'll need to implement the data mapping in `lib/fastbound.ts` based on your specific Fastbound API structure.

## Features

### Forms Available

1. **Special Order Form** - Track customer special orders for firearms
2. **Inbound Firearm Transfer** - Record incoming firearm transfers
3. **Suppressor Approval** - Manage NFA suppressor approval process
4. **Outbound Firearm Transfer** - Track outgoing firearm transfers

### Functionality

- ✅ Create new form entries
- ✅ View all submitted forms in a list
- ✅ Edit existing form entries
- ✅ View detailed form information
- ✅ Delete form entries
- ✅ Status tracking for each form type
- ✅ Responsive design (works on desktop and mobile)
- ✅ Real-time data persistence with Supabase
- ✅ Toast notifications for user feedback

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard
5. Deploy

### Environment Variables in Production

Make sure to add all environment variables from `.env.local` to your production environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `FASTBOUND_API_KEY` (if using Fastbound)
- `FASTBOUND_API_URL` (if using Fastbound)

## Troubleshooting

### Database Connection Issues

- Verify your Supabase URL and anon key are correct
- Check that your Supabase project is active
- Ensure RLS policies allow the operations you're trying to perform

### Forms Not Saving

- Check browser console for errors
- Verify all required fields are filled
- Check Supabase dashboard logs for errors

### Styling Issues

- Clear your browser cache
- Run `npm run build` to check for build errors
- Ensure Tailwind CSS is properly configured

## Support

For issues or questions:
1. Check the Supabase documentation: [https://supabase.com/docs](https://supabase.com/docs)
2. Check Next.js documentation: [https://nextjs.org/docs](https://nextjs.org/docs)
3. Review the code comments in the application files

## License

This application is provided as-is for your use.
