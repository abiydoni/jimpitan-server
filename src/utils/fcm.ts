import { getMessaging } from 'firebase-admin/messaging';

export const sendSyncNotification = async (topic: string, data: any) => {
  try {
    const payload = {
      data: {
        action: data.action || 'SYNC',
        ...data
      },
      topic: topic,
    };
    await getMessaging().send(payload);
    console.log(`FCM sync message sent to topic ${topic} with action ${data.action}`);
  } catch (error) {
    console.error('Error sending FCM sync message:', error);
  }
};
