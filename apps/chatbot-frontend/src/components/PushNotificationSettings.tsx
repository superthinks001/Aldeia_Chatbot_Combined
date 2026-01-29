import React, { useState, useEffect } from 'react';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getSubscriptionStatus,
  isPushNotificationSupported
} from '../services/push-notification.service';
import { useAuth } from '../contexts/AuthContext';
import './PushNotificationSettings.css';

const PushNotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<{ subscribed: boolean; permission: NotificationPermission } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    if (!isPushNotificationSupported()) {
      setStatus({ subscribed: false, permission: 'denied' });
      return;
    }
    const currentStatus = await getSubscriptionStatus();
    setStatus(currentStatus);
  };

  const handleSubscribe = async () => {
    if (!user?.id) {
      alert('Please log in to enable push notifications');
      return;
    }

    setLoading(true);
    try {
      const subscription = await subscribeToPushNotifications(user.id);
      if (subscription) {
        await checkStatus();
        alert('Push notifications enabled!');
      } else {
        alert('Failed to enable push notifications. Please check your browser settings.');
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
      alert('Failed to enable push notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const success = await unsubscribeFromPushNotifications();
      if (success) {
        await checkStatus();
        alert('Push notifications disabled');
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      alert('Failed to disable push notifications');
    } finally {
      setLoading(false);
    }
  };

  if (!isPushNotificationSupported()) {
    return (
      <div style={{
        padding: '8px 12px',
        fontSize: 11,
        color: '#666',
        backgroundColor: '#f5f5f5',
        borderRadius: 4
      }}>
        Push notifications are not supported in this browser
      </div>
    );
  }

  if (!status) {
    return (
      <div style={{ padding: '8px 12px', fontSize: 11, color: '#666' }}>
        Checking notification status...
      </div>
    );
  }

  return (
    <div className="push-notification-settings">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#2c3e50' }}>
          🔔 Push Notifications
        </div>
        {status.subscribed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#2e7d32' }}>Enabled</span>
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '...' : 'Disable'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={loading || status.permission === 'denied'}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              backgroundColor: status.permission === 'denied' ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: (loading || status.permission === 'denied') ? 'not-allowed' : 'pointer',
              opacity: (loading || status.permission === 'denied') ? 0.6 : 1
            }}
            title={status.permission === 'denied' ? 'Notifications are blocked. Please enable in browser settings.' : 'Enable push notifications'}
          >
            {loading ? '...' : status.permission === 'denied' ? 'Blocked' : 'Enable'}
          </button>
        )}
      </div>
      {status.permission === 'denied' && (
        <div style={{
          padding: '8px 12px',
          fontSize: 10,
          color: '#f44336',
          backgroundColor: '#ffebee'
        }}>
          Notifications are blocked. Please enable them in your browser settings.
        </div>
      )}
    </div>
  );
};

export default PushNotificationSettings;
