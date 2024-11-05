import { NextResponse } from 'next/server';
import { createTransport } from 'nodemailer';
import { supabase } from '@/lib/supabase';

// Admin email is separate from system email
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function POST(request: Request) {
  try {
    const { subject, message } = await request.json();

    // Get user information from the session
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || 'Anonymous User';

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: ADMIN_EMAIL,
      replyTo: userEmail, // Allows you to reply directly to the user
      subject: `[ClinicFlow] ${subject}`,
      html: `
        <p><strong>From:</strong> ${userEmail}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <p>${message.replace(/\n/g, '<br />')}</p>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending admin contact email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}