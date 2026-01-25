# Email Setup Guide

This document explains how to configure email notifications for the SIB Webshop using AWS SES (Simple Email Service).

## Overview

The webshop sends two types of email notifications:

1. **New Order Notification** (to webshop maintainer)
   - Sent when a customer places an order
   - Contains order details, customer info, and payment pending status
   - Recipient: `info@sib-utrecht.nl`

2. **Payment Confirmation** (to customer and maintainer)
   - Sent when payment is successfully received
   - Contains order summary and confirmation
   - Recipients: Customer email + `info@sib-utrecht.nl`

## Required Environment Variables

Add the following environment variables to your Convex deployment:

```bash
# AWS Credentials
AWS_REGION=eu-west-1                    # The AWS region where your SES is configured
AWS_ACCESS_KEY_ID=your_access_key       # Your AWS access key ID
AWS_SECRET_ACCESS_KEY=your_secret_key   # Your AWS secret access key

# Email Configuration
SES_FROM_EMAIL=noreply@sib-utrecht.nl   # The verified sender email address (optional, defaults to noreply@sib-utrecht.nl)
```

## AWS SES Setup Steps

### 1. Create an AWS Account
If you don't have an AWS account, create one at https://aws.amazon.com/

### 2. Set Up SES in Your Region
1. Navigate to the AWS SES console
2. Choose a region (e.g., `eu-west-1` for Ireland - closest to Netherlands)
3. Note: SES starts in sandbox mode with sending limits

### 3. Verify Your Sender Email Address
1. Go to SES Console > Verified Identities
2. Click "Create identity"
3. Choose "Email address"
4. Enter `noreply@sib-utrecht.nl` (or your preferred sender address)
5. Click "Create identity"
6. Check the inbox for verification email and click the verification link

**Important:** You must verify the domain or email address before you can send emails from it.

### 4. Verify Recipient Email (Sandbox Only)
If you're in SES sandbox mode, you also need to verify recipient emails:
1. Verify `info@sib-utrecht.nl` using the same process
2. For testing, verify your test email addresses

### 5. Request Production Access (Optional)
To send to any email address without verification:
1. Go to SES Console > Account Dashboard
2. Click "Request production access"
3. Fill out the form explaining your use case
4. Wait for AWS approval (usually 24-48 hours)

### 6. Create IAM User for API Access
1. Go to IAM Console > Users
2. Click "Create user"
3. Enter username (e.g., `sib-webshop-ses`)
4. Click "Next"
5. Select "Attach policies directly"
6. Search for and select `AmazonSESFullAccess` (or create a custom policy with minimal permissions)
7. Click "Create user"

### 7. Generate Access Keys
1. Click on the newly created user
2. Go to "Security credentials" tab
3. Click "Create access key"
4. Choose "Application running outside AWS"
5. Click "Next" and "Create access key"
6. **Important:** Copy the Access Key ID and Secret Access Key immediately
7. Store them securely - you won't be able to see the secret key again

## Minimal IAM Policy (Recommended)

Instead of `AmazonSESFullAccess`, you can create a custom policy with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

## Setting Environment Variables in Convex

### Via Convex Dashboard
1. Go to your Convex dashboard
2. Select your project
3. Navigate to Settings > Environment Variables
4. Add each variable:
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `SES_FROM_EMAIL` (optional)

### Via Convex CLI
```bash
npx convex env set AWS_REGION eu-west-1
npx convex env set AWS_ACCESS_KEY_ID your_access_key_here
npx convex env set AWS_SECRET_ACCESS_KEY your_secret_key_here
npx convex env set SES_FROM_EMAIL noreply@sib-utrecht.nl
```

## Testing Email Functionality

### 1. Local Testing
When running locally with `npm run dev`, make sure to set environment variables in your deployment (not `.env.local`), as Convex actions run in the cloud even during local development.

### 2. Test Order
Create a test order with "TEST" in the name to clearly identify test orders:
1. Add items to cart
2. Proceed to checkout
3. Use name: "TEST - Your Name"
4. Use a verified email address (if in sandbox mode)
5. Complete the order

### 3. Check Email Delivery
- New order email should arrive at `info@sib-utrecht.nl`
- After payment confirmation, customer should receive confirmation email
- Maintainer should receive payment confirmation email

## Troubleshooting

### Emails Not Sending
1. **Check Convex logs** for error messages from the email actions
2. **Verify sender email** is verified in SES
3. **Check sandbox mode**: If in sandbox, recipient emails must be verified
4. **Verify AWS credentials** are correct and have necessary permissions
5. **Check AWS region** matches the SES configuration

### "Email address not verified" Error
- Verify both sender and recipient emails in SES console
- If in sandbox mode, all recipients must be verified
- Request production access to send to any email

### "Invalid AWS credentials" Error
- Double-check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- Ensure the IAM user has SES send permissions
- Verify the access keys haven't been deactivated

### Emails Going to Spam
- Set up SPF, DKIM, and DMARC records for your domain
- In SES Console, configure "Email Authentication" for your domain
- Consider using a dedicated email service provider for better deliverability

## Email Templates

The email service sends HTML and plain text versions of all emails:
- **New Order Email**: Blue theme with order details and "pending payment" warning
- **Payment Confirmation (Customer)**: Green theme with order summary and thank you message
- **Payment Confirmation (Maintainer)**: Green theme with order details and fulfillment notice

All emails include:
- Order ID
- Customer information
- Itemized order details with custom fields
- Total amount
- Comments (if provided)

## Cost Considerations

AWS SES pricing (as of 2024):
- First 1,000 emails/month: **FREE** (when sending from EC2)
- Additional emails: **$0.10 per 1,000 emails**
- First 62,000 emails/month from non-EC2: **FREE** (free tier)

For a typical webshop with moderate traffic, costs should be minimal.

## Security Best Practices

1. **Never commit AWS credentials** to version control
2. **Use IAM policies** with minimal required permissions
3. **Rotate access keys** periodically
4. **Monitor SES usage** in AWS CloudWatch
5. **Set up billing alerts** to detect unusual activity
6. **Use environment variables** for all sensitive configuration

## Support

For issues related to:
- **SES Configuration**: AWS Support or AWS Documentation
- **Webshop Integration**: Check Convex logs and this documentation
- **Email Deliverability**: Consider professional email deliverability services
