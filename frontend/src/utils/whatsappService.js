// utils/whatsappService.js
class WhatsAppService {
  constructor() {
    // You'll need to configure these based on your WhatsApp Business API provider
    this.apiEndpoint = process.env.REACT_APP_WHATSAPP_API_ENDPOINT;
    this.apiToken = process.env.REACT_APP_WHATSAPP_API_TOKEN;
    this.businessPhoneNumber = process.env.REACT_APP_WHATSAPP_BUSINESS_NUMBER;
    
    // For testing, you can use WhatsApp Business API, Twilio, or other providers
    this.isEnabled = !!(this.apiEndpoint && this.apiToken);
  }

  // Format phone number to international format
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present (assuming India +91)
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    } else if (cleaned.length === 13 && cleaned.startsWith('91')) {
      return cleaned.substring(1);
    }
    
    return cleaned;
  }

  // Send WhatsApp message using your preferred API
  async sendMessage(phoneNumber, message, templateData = null) {
    if (!this.isEnabled) {
      console.warn('WhatsApp service not configured');
      return false;
    }

    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    if (!formattedNumber) {
      console.error('Invalid phone number:', phoneNumber);
      return false;
    }

    try {
      // Example using WhatsApp Business API
      const response = await fetch(`${this.apiEndpoint}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedNumber,
          type: 'text',
          text: {
            body: message
          }
        })
      });

      if (response.ok) {
        console.log('WhatsApp message sent successfully');
        return true;
      } else {
        console.error('Failed to send WhatsApp message:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  // Send template message (for better delivery rates)
  async sendTemplateMessage(phoneNumber, templateName, templateParams = []) {
    if (!this.isEnabled) {
      console.warn('WhatsApp service not configured');
      return false;
    }

    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    if (!formattedNumber) {
      console.error('Invalid phone number:', phoneNumber);
      return false;
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedNumber,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en'
            },
            components: [
              {
                type: 'body',
                parameters: templateParams.map(param => ({
                  type: 'text',
                  text: param
                }))
              }
            ]
          }
        })
      });

      if (response.ok) {
        console.log('WhatsApp template message sent successfully');
        return true;
      } else {
        console.error('Failed to send WhatsApp template message:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error sending WhatsApp template message:', error);
      return false;
    }
  }

  // Generate order-specific messages
  generateOrderMessage(type, orderData) {
    const { itemName, price, pickupTime, adminNotes, userName, status } = orderData;
    const customerName = userName || 'Customer';
    const cafeLink = 'https://auntyscafe.com'; // Replace with your actual website

    switch (type) {
      case 'order_accepted':
        return `🍽️ *Order Accepted - Aunty's Café*

Hi ${customerName}! 👋

✅ Great news! Your order has been *accepted*:
📦 *Item:* ${itemName}
💰 *Price:* ₹${price}

We're now preparing your delicious meal! 👨‍🍳

${pickupTime ? `⏰ *Pickup Time:* ${pickupTime}` : '📱 Pickup time will be shared soon'}

Thanks for choosing Aunty's Café!
${cafeLink}`;

      case 'pickup_time_set':
        return `⏰ *Pickup Time Set - Aunty's Café*

Hi ${customerName}! 

Your order is almost ready! 🎉

📦 *Item:* ${itemName}
🕐 *Pickup Time:* ${pickupTime}

Please collect your order at the scheduled time. We'll have it ready for you!

Thanks for your patience! 😊
${cafeLink}`;

      case 'order_ready':
        return `🎉 *Order Ready for Pickup!*

Hi ${customerName}!

Your delicious meal is ready! 🍽️

📦 *Item:* ${itemName}
${pickupTime ? `🕐 *Pickup Time:* ${pickupTime}` : ''}

Please come and collect your order. We're excited for you to try it! 😋

*Location:* Aunty's Café
${cafeLink}`;

      case 'order_collected':
        return `✨ *Order Completed - Thank You!*

Hi ${customerName}!

Thank you for collecting your order! 🙏

📦 *Item:* ${itemName}

We hope you enjoy your meal! 😊 
Please visit us again soon.

Rate your experience: ${cafeLink}/feedback

- Team Aunty's Café ❤️`;

      case 'order_rejected':
        return `❌ *Order Update - Aunty's Café*

Hi ${customerName},

We're sorry, but your order couldn't be processed:

📦 *Item:* ${itemName}
❌ *Status:* Unable to fulfill

${adminNotes ? `📝 *Reason:* ${adminNotes}` : ''}

Please contact us for assistance or try ordering again.

📞 Call us: [Your Phone Number]
${cafeLink}

Sorry for the inconvenience! 🙏`;

      case 'admin_notes':
        return `📝 *Message from Aunty's Café*

Hi ${customerName}!

We have an update about your order:

📦 *Item:* ${itemName}
💬 *Message:* ${adminNotes}

If you have any questions, feel free to contact us!

${cafeLink}`;

      case 'new_menu_item':
        return `🆕 *New Dish Available - Aunty's Café*

Hello! 👋

We've added something delicious to our menu:

🍽️ *${itemName}*
💰 *Price:* ₹${price}
${orderData.veg ? '🥬 Vegetarian' : '🥩 Non-Vegetarian'}

${orderData.description ? `📝 ${orderData.description}` : ''}

Pre-order now to secure your meal!
${cafeLink}

#NewDish #AuntysCafe`;

      default:
        return `📱 *Update from Aunty's Café*

Hi ${customerName}!

Your order for ${itemName} has been updated.
Status: ${status}

${cafeLink}`;
    }
  }

  // Send order notification via WhatsApp
  async sendOrderNotification(type, orderData, phoneNumber) {
    if (!phoneNumber) {
      console.warn('No phone number provided for WhatsApp notification');
      return false;
    }

    const message = this.generateOrderMessage(type, orderData);
    return await this.sendMessage(phoneNumber, message);
  }

  // Bulk send for menu updates (to all subscribed users)
  async sendBulkMenuUpdate(menuItem, phoneNumbers) {
    if (!phoneNumbers || phoneNumbers.length === 0) {
      console.warn('No phone numbers provided for bulk WhatsApp notification');
      return;
    }

    const message = this.generateOrderMessage('new_menu_item', menuItem);
    const results = [];

    // Send with delay to avoid rate limiting
    for (let i = 0; i < phoneNumbers.length; i++) {
      const phoneNumber = phoneNumbers[i];
      
      // Add delay between messages (adjust based on your API limits)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }

      try {
        const success = await this.sendMessage(phoneNumber, message);
        results.push({ phoneNumber, success });
        console.log(`WhatsApp sent to ${phoneNumber}: ${success ? 'Success' : 'Failed'}`);
      } catch (error) {
        console.error(`Error sending to ${phoneNumber}:`, error);
        results.push({ phoneNumber, success: false, error: error.message });
      }
    }

    return results;
  }

  // Test WhatsApp connection
  async testConnection(testPhoneNumber) {
    const testMessage = `🧪 *Test Message - Aunty's Café*

This is a test message to verify WhatsApp integration.

If you received this, WhatsApp notifications are working! ✅

- Aunty's Café Team`;

    return await this.sendMessage(testPhoneNumber, testMessage);
  }
}

// Enhanced NotificationManager with WhatsApp integration
import { WhatsAppService } from './whatsappService';

class EnhancedNotificationManager {
  constructor() {
    this.whatsappService = new WhatsAppService();
    // ... existing notification manager code
  }

  // Enhanced method to send all types of notifications
  async sendOrderUpdate(type, orderData, userPreferences = {}) {
    const promises = [];

    // Browser notification (existing)
    if (userPreferences.browserNotifications !== false) {
      promises.push(this.showBrowserNotification(type, orderData));
    }

    // Toast notification (existing)
    if (userPreferences.toastNotifications !== false && document.visibilityState === 'visible') {
      promises.push(this.showToastNotification(type, orderData));
    }

    // WhatsApp notification (new)
    if (userPreferences.whatsappNotifications !== false && userPreferences.phoneNumber) {
      promises.push(
        this.whatsappService.sendOrderNotification(type, orderData, userPreferences.phoneNumber)
      );
    }

    // Email notification (you can add this too)
    if (userPreferences.emailNotifications !== false && userPreferences.email) {
      // promises.push(this.sendEmailNotification(type, orderData, userPreferences.email));
    }

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  // Send WhatsApp notification for order status updates
  async notifyOrderStatusUpdate(orderId, newStatus, orderDetails) {
    const statusTypeMap = {
      'Accepted': 'order_accepted',
      'Ready': 'order_ready',
      'Collected': 'order_collected',
      'Rejected': 'order_rejected'
    };

    const notificationType = statusTypeMap[newStatus];
    if (!notificationType) return;

    // Get user preferences (you'll need to implement this)
    const userPreferences = await this.getUserNotificationPreferences(orderDetails.customerEmail);
    
    await this.sendOrderUpdate(notificationType, orderDetails, userPreferences);
  }

  // Send WhatsApp notification for pickup time
  async notifyPickupTimeSet(orderId, pickupTime, orderDetails) {
    const userPreferences = await this.getUserNotificationPreferences(orderDetails.customerEmail);
    
    await this.sendOrderUpdate('pickup_time_set', {
      ...orderDetails,
      pickupTime
    }, userPreferences);
  }

  // Send WhatsApp notification for admin notes
  async notifyOrderUpdate(orderId, message, orderDetails) {
    const userPreferences = await this.getUserNotificationPreferences(orderDetails.customerEmail);
    
    await this.sendOrderUpdate('admin_notes', orderDetails, userPreferences);
  }

  // Get user notification preferences from Firestore
  async getUserNotificationPreferences(userEmail) {
    try {
      // You'll need to implement this based on your user preferences storage
      const userDoc = await getDocs(
        query(collection(db, 'userPreferences'), where('email', '==', userEmail))
      );
      
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        return {
          browserNotifications: userData.browserNotifications !== false,
          toastNotifications: userData.toastNotifications !== false,
          whatsappNotifications: userData.whatsappNotifications !== false,
          emailNotifications: userData.emailNotifications !== false,
          phoneNumber: userData.phoneNumber,
          email: userData.email
        };
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }

    // Default preferences if not found
    return {
      browserNotifications: true,
      toastNotifications: true,
      whatsappNotifications: false, // Default off until user provides phone number
      emailNotifications: true,
      phoneNumber: null,
      email: userEmail
    };
  }

  // Send new menu item notification to all subscribers
  async notifyNewMenuItem(menuItem) {
    try {
      // Get all users who have enabled WhatsApp notifications
      const subscribedUsersQuery = query(
        collection(db, 'userPreferences'),
        where('whatsappNotifications', '==', true),
        where('phoneNumber', '!=', null)
      );
      
      const subscribedUsers = await getDocs(subscribedUsersQuery);
      const phoneNumbers = subscribedUsers.docs
        .map(doc => doc.data().phoneNumber)
        .filter(phone => phone);

      if (phoneNumbers.length > 0) {
        await this.whatsappService.sendBulkMenuUpdate(menuItem, phoneNumbers);
      }
    } catch (error) {
      console.error('Error sending bulk WhatsApp notifications:', error);
    }
  }
}

export const NotificationManager = new EnhancedNotificationManager();
export { WhatsAppService };