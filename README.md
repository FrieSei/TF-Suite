# TF Suite - Medical Practice Management System

A comprehensive medical practice management system built with Next.js, Supabase, and Google Calendar integration.

## ⚠️ Security Notice

This application handles sensitive medical data. Before deploying:
- Configure proper authentication
- Set up secure database access
- Use environment variables for all sensitive data
- Ensure HIPAA compliance if used in the US
- Follow relevant medical data protection regulations in your region

## Features

- 🏥 Multi-location practice management
- 📅 Advanced appointment scheduling
- 👨‍⚕️ Surgeon and staff management
- 📱 Patient notifications (Email & SMS)
- 📊 Equipment tracking
- 🗓️ Google Calendar integration
- 🏷️ Customizable event types
- ⏰ Automated reminders
- 📈 Analytics dashboard

## Tech Stack

- Next.js 14
- Supabase (Auth & Database)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Google Calendar API
- Twilio (SMS)
- Nodemailer (Email)

## Prerequisites

- Node.js 18+
- Supabase account
- Google Cloud project with Calendar API enabled
- SMTP server for emails
- Twilio account for SMS

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tf-suite.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

4. Run database migrations:
   ```bash
   npx supabase db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for required environment variables.

## Database Setup

The application uses Supabase with PostgreSQL. Migration files are in `supabase/migrations/`.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Security

- 🔒 All routes are protected with authentication
- 🔐 Row Level Security enabled in database
- 📝 Audit logs for sensitive operations
- 🔑 Role-based access control
- 🏥 HIPAA-friendly architecture

## License

MIT License - See LICENSE file

## Support

Create an issue for bug reports or feature requests.