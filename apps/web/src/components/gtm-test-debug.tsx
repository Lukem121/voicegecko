'use client';

import { log } from '@acme/observability/log';
import { sendGTMEvent } from '@next/third-parties/google';
import { useUser } from '~/hooks/auth';

/**
 * Debug component to manually test GTM events
 * Only use this in development!
 */
export function GTMTestDebug() {
  const user = useUser();

  const testPurchaseEvent = () => {
    if (!user?.email) {
      alert('User not logged in');
      return;
    }

    sendGTMEvent({
      event: 'purchase',
      currency: 'usd',
      value: 29.99,
      transaction_id: `test_${Date.now()}`,
      user_id: user.id,
      user_data: {
        email_address: user.email,
      },
      items: [
        {
          item_id: 'test_price_123',
          item_name: 'voice gecko pro',
          item_category: 'Subscription',
          currency: 'usd',
          price: 29.99,
          quantity: 1,
        },
      ],
      custom_parameters: {
        test_event: true,
      },
    });

    log.info('Test purchase event sent!');
  };

  const testUserIdentification = () => {
    if (!user?.email) {
      alert('User not logged in');
      return;
    }

    sendGTMEvent({
      event: 'user_identification',
      user_id: user.id,
      user_data: {
        email_address: user.email,
      },
      custom_parameters: {
        test_identification: true,
      },
    });

    log.info('Test user identification sent!');
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 space-y-2 rounded-lg bg-red-500 p-4 text-white">
      <h3 className="font-bold">GTM Debug Panel</h3>
      <div className="space-y-2">
        <button
          className="block rounded bg-blue-600 px-3 py-1 text-sm"
          onClick={testUserIdentification}
          type="button"
        >
          Test User ID
        </button>
        <button
          className="block rounded bg-green-600 px-3 py-1 text-sm"
          onClick={testPurchaseEvent}
          type="button"
        >
          Test Purchase
        </button>
      </div>
      <p className="text-xs">
        User:{' '}
        {user?.email ? `${user.email.substring(0, 3)}***` : 'Not logged in'}
      </p>
    </div>
  );
}
