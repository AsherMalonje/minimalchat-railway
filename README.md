# MinimalChat - Railway.app Deployment Guide

A modern, real-time messaging application with Google OAuth authentication, built for Railway.app and Supabase.

## Features

- 🔐 **Google OAuth Authentication** - Secure sign-in with Google accounts
- 💬 **Real-time Messaging** - Instant messaging with auto-refresh
- 👻 **Whisper Mode** - Self-destructing messages after 10 seconds
- 🎨 **Custom Themes** - Personalized chat bubble colors and dark/light modes
- 📱 **Responsive Design** - Works on desktop and mobile
- ⚡ **Typing Indicators** - See when someone is typing
- 🟢 **Online Status** - Real-time presence indicators

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Passport.js (Google OAuth)
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Railway.app
- **ORM**: Drizzle ORM

## Deployment Instructions

### 1. Setup Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to Settings → Database
3. Copy the **Connection string** (URI format)
4. Replace `[YOUR-PASSWORD]` with your database password

### 2. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. Application type: Web application
6. Authorized redirect URIs: `https://your-app-name.up.railway.app/api/auth/google/callback`
7. Copy Client ID and Client Secret

### 3. Deploy to Railway.app

1. Fork this repository to your GitHub account
2. Go to [railway.app](https://railway.app) and sign up
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your forked repository
5. Railway will automatically detect the Node.js app

### 4. Configure Environment Variables

In Railway dashboard, go to your project → Variables tab and add:

```
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
SESSION_SECRET=your_very_long_random_session_secret_here
NODE_ENV=production
```

### 5. Update Google OAuth Redirect URI

After Railway deployment:
1. Copy your Railway app URL (e.g., `https://your-app-name.up.railway.app`)
2. Go back to Google Cloud Console → Credentials
3. Edit your OAuth 2.0 Client ID
4. Update Authorized redirect URIs to: `https://your-app-name.up.railway.app/api/auth/google/callback`

### 6. Initialize Database

Railway will automatically run `npm run db:push` during deployment to set up your database tables.

## Local Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd minimalchat
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Fill in your `.env` file with:
   - Supabase DATABASE_URL
   - Google OAuth credentials
   - Random SESSION_SECRET

5. Initialize database:
```bash
npm run db:push
```

6. Start development server:
```bash
npm run dev
```

Visit `http://localhost:5000` to see your app.

## Project Structure

```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and configs
├── server/               # Express backend
│   ├── googleAuth.ts     # Google OAuth setup
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations
│   └── db.ts            # Database connection
├── shared/
│   └── schema.ts        # Shared TypeScript types
└── deployment files     # Railway, Docker configs
```

## Database Schema

The app automatically creates these tables:
- `users` - User profiles and preferences
- `chats` - One-to-one conversations
- `messages` - Chat messages with whisper mode
- `typing_indicators` - Real-time typing status
- `sessions` - Authentication sessions

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Supabase PostgreSQL connection string | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes |
| `SESSION_SECRET` | Random string for session encryption | Yes |
| `NODE_ENV` | Set to "production" for Railway | Yes |
| `PORT` | Port number (Railway sets automatically) | No |

## Support

If you encounter issues:

1. **Database Connection**: Verify your DATABASE_URL is correct
2. **Google OAuth**: Check redirect URIs match your deployment URL
3. **Environment Variables**: Ensure all required variables are set in Railway
4. **Build Issues**: Check Railway build logs for specific errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.