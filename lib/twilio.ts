import twilio from "twilio"

// Initialize Twilio client with environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

if (!accountSid || !authToken) {
  console.warn(
    "Twilio environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) are not set. SMS functionality will be disabled.",
  )
}

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null

export default twilioClient
