"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { Doc } from "./_generated/dataModel";

// Initialize AWS SES client
const getSESClient = () => {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("AWS SES credentials not configured. Please set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY environment variables.");
  }

  return new SESClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

const FROM_EMAIL = "webshop@sib-utrecht.nl";
const CUSTOMER_SERVICE_EMAIL = "ict@sib-utrecht.nl";

/**
 * Format order items as HTML table
 */
const formatOrderItems = (items: Array<{
  productName: string;
  variantName: string;
  quantity: number;
  price: number;
  customFieldResponses?: Record<string, string>;
}>): string => {
  let html = `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
          <th style="padding: 12px; text-align: left;">Product</th>
          <th style="padding: 12px; text-align: left;">Variant</th>
          <th style="padding: 12px; text-align: center;">Quantity</th>
          <th style="padding: 12px; text-align: right;">Price</th>
          <th style="padding: 12px; text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const item of items) {
    const subtotal = item.price * item.quantity;
    html += `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px;">${item.productName}</td>
        <td style="padding: 12px;">${item.variantName}</td>
        <td style="padding: 12px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right;">€${item.price.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right;">€${subtotal.toFixed(2)}</td>
      </tr>
    `;

    // Add custom field responses if present
    if (item.customFieldResponses && Object.keys(item.customFieldResponses).length > 0) {
      html += `
        <tr style="background-color: #f9fafb;">
          <td colspan="5" style="padding: 8px 12px;">
            <strong>Additional Information:</strong><br/>
            ${Object.entries(item.customFieldResponses)
              .map(([key, value]) => `<span style="display: block; margin-left: 10px;">${key}: ${value}</span>`)
              .join('')}
          </td>
        </tr>
      `;
    }
  }

  html += `
      </tbody>
    </table>
  `;

  return html;
};

/**
 * Send email notification to webshop maintainer when a new order is created
 */
export const sendNewOrderEmail = internalAction({
  args: {
    orderId: v.string(),
    name: v.string(),
    email: v.string(),
    items: v.array(
      v.object({
        productName: v.string(),
        variantName: v.string(),
        quantity: v.number(),
        price: v.number(),
        customFieldResponses: v.optional(v.record(v.string(), v.string())),
      })
    ),
    totalAmount: v.number(),
    comments: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const sesClient = getSESClient();

      const orderItemsHtml = formatOrderItems(args.items);

      const htmlBody = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">New Order Received</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1e40af; margin-top: 0;">Order Details</h2>
              
              <div style="margin: 20px 0;">
                <p><strong>Order ID:</strong> ${args.orderId}</p>
                <p><strong>Customer Name:</strong> ${args.name}</p>
                <p><strong>Customer Email:</strong> ${args.email}</p>
                ${args.comments ? `<p><strong>Comments:</strong><br/>${args.comments}</p>` : ''}
              </div>

              <h3 style="color: #1e40af;">Order Items</h3>
              ${orderItemsHtml}

              <div style="text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; padding-top: 10px; border-top: 2px solid #1e40af;">
                <span>Total: €${args.totalAmount.toFixed(2)}</span>
              </div>

              <div style="margin-top: 30px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0;"><strong>⚠️ Action Required:</strong> This order is pending payment confirmation.</p>
              </div>
            </div>

            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 0; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">SIB-Utrecht Webshop - Automated Notification</p>
            </div>
          </body>
        </html>
      `;

      const textBody = `
New Order Received

Order ID: ${args.orderId}
Customer Name: ${args.name}
Customer Email: ${args.email}
${args.comments ? `Comments: ${args.comments}\n` : ''}

Order Items:
${args.items.map(item => {
  const subtotal = item.price * item.quantity;
  let itemText = `- ${item.productName} (${item.variantName}) x${item.quantity} @ €${item.price.toFixed(2)} = €${subtotal.toFixed(2)}`;
  
  if (item.customFieldResponses && Object.keys(item.customFieldResponses).length > 0) {
    itemText += `\n  Additional Info: ${Object.entries(item.customFieldResponses).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
  }
  
  return itemText;
}).join('\n')}

Total: €${args.totalAmount.toFixed(2)}

⚠️ This order is pending payment confirmation.

---
SIB-Utrecht Webshop - Automated Notification
      `.trim();

      const command = new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: {
          ToAddresses: [CUSTOMER_SERVICE_EMAIL],
        },
        Message: {
          Subject: {
            Data: `New Order: ${args.orderId}`,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: "UTF-8",
            },
            Text: {
              Data: textBody,
              Charset: "UTF-8",
            },
          },
        },
      });

      const response = await sesClient.send(command);

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error: any) {
      console.error("Failed to send new order email:", error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Send payment confirmation email to customer
 */
export const sendPaymentConfirmationToCustomer = internalAction({
  args: {
    orderId: v.string(),
    name: v.string(),
    email: v.string(),
    items: v.array(
      v.object({
        productName: v.string(),
        variantName: v.string(),
        quantity: v.number(),
        price: v.number(),
        customFieldResponses: v.optional(v.record(v.string(), v.string())),
      })
    ),
    totalAmount: v.number(),
    comments: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const sesClient = getSESClient();

      const orderItemsHtml = formatOrderItems(args.items);

      const htmlBody = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">Payment Confirmed! 🎉</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
              <p>Dear ${args.name},</p>
              
              <p>Thank you for your order! Your payment has been successfully received.</p>

              <h2 style="color: #059669; margin-top: 30px;">Order Summary</h2>
              
              <div style="margin: 20px 0;">
                <p><strong>Order ID:</strong> ${args.orderId}</p>
                ${args.comments ? `<p><strong>Your Comments:</strong><br/>${args.comments}</p>` : ''}
              </div>

              <h3 style="color: #059669;">Order Items</h3>
              ${orderItemsHtml}

              <div style="text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; padding-top: 10px; border-top: 2px solid #059669;">
                <span>Total Paid: €${args.totalAmount.toFixed(2)}</span>
              </div>

              <p style="margin-top: 30px;">If you have any questions, please contact us at <a href="mailto:${CUSTOMER_SERVICE_EMAIL}" style="color: #1e40af;">${CUSTOMER_SERVICE_EMAIL}</a>.</p>

              <p>Best regards,<br/>
              <strong>SIB-Utrecht</strong></p>
            </div>

            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 0; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">SIB-Utrecht Webshop</p>
            </div>
          </body>
        </html>
      `;

      const textBody = `
Payment Confirmed!

Dear ${args.name},

Thank you for your order! Your payment has been successfully received.

Order Summary
Order ID: ${args.orderId}
${args.comments ? `Your Comments: ${args.comments}\n` : ''}

Order Items:
${args.items.map(item => {
  const subtotal = item.price * item.quantity;
  let itemText = `- ${item.productName} (${item.variantName}) x${item.quantity} @ €${item.price.toFixed(2)} = €${subtotal.toFixed(2)}`;
  
  if (item.customFieldResponses && Object.keys(item.customFieldResponses).length > 0) {
    itemText += `\n  Additional Info: ${Object.entries(item.customFieldResponses).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
  }
  
  return itemText;
}).join('\n')}

Total Paid: €${args.totalAmount.toFixed(2)}

✓ Order Confirmed: You will receive further information about your order via email.

If you have any questions, please contact us at ${CUSTOMER_SERVICE_EMAIL}.

Best regards,
SIB-Utrecht

---
SIB-Utrecht Webshop
      `.trim();

      const command = new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: {
          ToAddresses: [args.email],
        },
        Message: {
          Subject: {
            Data: `Payment Confirmed - Order ${args.orderId}`,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: "UTF-8",
            },
            Text: {
              Data: textBody,
              Charset: "UTF-8",
            },
          },
        },
      });

      const response = await sesClient.send(command);

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error: any) {
      console.error("Failed to send payment confirmation to customer:", error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Send payment confirmation notification to webshop maintainer
 */
export const sendPaymentConfirmationToMaintainer = internalAction({
  args: {
    orderId: v.string(),
    name: v.string(),
    email: v.string(),
    items: v.array(
      v.object({
        productName: v.string(),
        variantName: v.string(),
        quantity: v.number(),
        price: v.number(),
        customFieldResponses: v.optional(v.record(v.string(), v.string())),
      })
    ),
    totalAmount: v.number(),
    comments: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const sesClient = getSESClient();

      const orderItemsHtml = formatOrderItems(args.items);

      const htmlBody = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">Payment Confirmed</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
              <h2 style="color: #059669; margin-top: 0;">Order Payment Received</h2>
              
              <div style="margin: 20px 0;">
                <p><strong>Order ID:</strong> ${args.orderId}</p>
                <p><strong>Customer Name:</strong> ${args.name}</p>
                <p><strong>Customer Email:</strong> ${args.email}</p>
                ${args.comments ? `<p><strong>Comments:</strong><br/>${args.comments}</p>` : ''}
              </div>

              <h3 style="color: #059669;">Order Items</h3>
              ${orderItemsHtml}

              <div style="text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; padding-top: 10px; border-top: 2px solid #059669;">
                <span>Total Received: €${args.totalAmount.toFixed(2)}</span>
              </div>

              <div style="margin-top: 30px; padding: 15px; background-color: #d1fae5; border-left: 4px solid #059669; border-radius: 4px;">
                <p style="margin: 0;"><strong>✓ Payment Successful:</strong> Customer has been notified. Order can now be fulfilled.</p>
              </div>
            </div>

            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 0; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">SIB-Utrecht Webshop - Automated Notification</p>
            </div>
          </body>
        </html>
      `;

      const textBody = `
Payment Confirmed

Order Payment Received

Order ID: ${args.orderId}
Customer Name: ${args.name}
Customer Email: ${args.email}
${args.comments ? `Comments: ${args.comments}\n` : ''}

Order Items:
${args.items.map(item => {
  const subtotal = item.price * item.quantity;
  let itemText = `- ${item.productName} (${item.variantName}) x${item.quantity} @ €${item.price.toFixed(2)} = €${subtotal.toFixed(2)}`;
  
  if (item.customFieldResponses && Object.keys(item.customFieldResponses).length > 0) {
    itemText += `\n  Additional Info: ${Object.entries(item.customFieldResponses).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
  }
  
  return itemText;
}).join('\n')}

Total Received: €${args.totalAmount.toFixed(2)}

✓ Payment Successful: Customer has been notified. Order can now be fulfilled.

---
SIB-Utrecht Webshop - Automated Notification
      `.trim();

      const command = new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: {
          ToAddresses: [CUSTOMER_SERVICE_EMAIL],
        },
        Message: {
          Subject: {
            Data: `Payment Confirmed: ${args.orderId}`,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: "UTF-8",
            },
            Text: {
              Data: textBody,
              Charset: "UTF-8",
            },
          },
        },
      });

      const response = await sesClient.send(command);

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error: any) {
      console.error("Failed to send payment confirmation to maintainer:", error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});
