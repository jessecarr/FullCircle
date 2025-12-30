# Quick Start Guide

## Next Steps to Get Your Application Running

### 1. Set Up Supabase Database

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Once created, go to **Settings** → **API** and copy:
   - Project URL
   - anon/public key

4. Create `.env.local` file in the project root:
   ```bash
   cp env.template .env.local
   ```

5. Edit `.env.local` and paste your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

6. In Supabase, go to **SQL Editor** and run the database setup script from `SETUP.md`

### 2. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Test the Forms

The application includes 4 main forms accessible via tabs:

- **Special Order Form** - For tracking customer firearm orders
- **Inbound Transfer** - For recording incoming firearm transfers  
- **Suppressor Approval** - For managing NFA suppressor approvals
- **Outbound Transfer** - For tracking outgoing firearm transfers

Each form has:
- ✅ Create new entries
- ✅ View all entries in a list
- ✅ Edit existing entries
- ✅ View detailed information
- ✅ Delete entries
- ✅ Status tracking

### 4. Optional: Fastbound Integration

If you want to integrate with Fastbound:

1. Add to `.env.local`:
   ```env
   FASTBOUND_API_KEY=your_fastbound_api_key
   FASTBOUND_API_URL=https://api.fastbound.com
   ```

2. Configure webhook in Fastbound to point to:
   ```
   https://your-domain.com/api/fastbound
   ```

### Need Help?

- See `SETUP.md` for detailed database setup instructions
- See `README.md` for full documentation
- Check Supabase dashboard for database errors
- Check browser console for frontend errors

## Common Issues

**Forms not saving?**
- Verify Supabase credentials in `.env.local`
- Check that database tables are created
- Review Supabase dashboard logs

**Styling looks broken?**
- Clear browser cache
- Restart dev server

**Module not found errors?**
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then run `npm install`
