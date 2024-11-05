import dotenv from 'dotenv';
import { Twilio } from 'twilio';

// Load environment variables
dotenv.config({ path: '.env.local' });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.error('Missing required Twilio credentials');
  process.exit(1);
}

const client = new Twilio(accountSid, authToken);

async function testSMS() {
  try {
    // Test surgery reminder
    console.log('Sending surgery reminder test...');
    await client.messages.create({
      body: "Just a friendly reminder about your surgery tomorrow. We're looking forward to taking good care of you! Please remember not to eat or drink anything 6 hours before your surgery time. Make sure to avoid aspirin and NSAIDs (like ibuprofen). For any questions, feel free to reach out to us. We're looking forward to seeing you!",
      from: fromNumber,
      to: '+4367763412340'
    });

    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test simple appointment reminder
    console.log('Sending simple appointment reminder test...');
    await client.messages.create({
      body: "Just a friendly reminder about your appointment tomorrow. We're looking forward to seeing you!",
      from: fromNumber,
      to: '+4367763412340'
    });

    console.log('Test SMS messages sent successfully!');
  } catch (error) {
    console.error('Error sending test SMS:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    if (error.moreInfo) {
      console.error('More info:', error.moreInfo);
    }
  }
}

testSMS();