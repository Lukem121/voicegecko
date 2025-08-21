import { log } from '@acme/observability/log';
import { notificationsEnv } from './env';

// Notification types enum for extensibility
export const DiscordNotificationType = {
  ERROR_REPORT: 'ERROR_REPORT',
  FEEDBACK: 'FEEDBACK',
  USER_SIGNUP: 'USER_SIGNUP',
  SUBSCRIPTION: 'SUBSCRIPTION',
} as const;

// Base interface for all notifications
type BaseNotification = {
  userId?: string;
  additionalContext?: Record<string, unknown>;
  url?: string;
  timestamp?: string;
};

// Specific notification interfaces
export interface ErrorReport extends BaseNotification {
  error: Error;
}

export interface FeedbackReport extends BaseNotification {
  feedbackType: 'bug' | 'feature' | 'general';
  message: string;
  rating?: number;
}

export interface UserSignup extends BaseNotification {
  email: string;
  username?: string;
}

export interface SubscriptionEvent extends BaseNotification {
  subscriptionId: string;
  eventType: 'created' | 'cancelled' | 'deleted' | 'updated';
  planName?: string;
  status?: string;
  email?: string;
  username?: string;
  periodEnd?: string;
  periodStart?: string;
  cancelAtPeriodEnd?: boolean;
  cancellationReason?: string;
  cancellationFeedback?: string;
  previousStatus?: string;
  // Pricing information
  amount?: number;
  currency?: string;
  interval?: 'month' | 'year';
  intervalCount?: number;
}

// Discord embed interface
type DiscordEmbed = {
  title: string;
  color: number;
  fields: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
  timestamp?: string;
};

export class DiscordAdapter {
  private readonly webhookUrls: Map<
    (typeof DiscordNotificationType)[keyof typeof DiscordNotificationType],
    string
  >;

  constructor() {
    const env = notificationsEnv();

    this.webhookUrls = new Map([
      [
        DiscordNotificationType.ERROR_REPORT,
        env.DISCORD_ERROR_REPORT_WEBHOOK_URL,
      ],
      [DiscordNotificationType.FEEDBACK, env.DISCORD_FEEDBACK_WEBHOOK_URL],
      [
        DiscordNotificationType.USER_SIGNUP,
        env.DISCORD_USER_SIGNUP_WEBHOOK_URL,
      ],
      [
        DiscordNotificationType.SUBSCRIPTION,
        env.DISCORD_SUBSCRIPTION_WEBHOOK_URL,
      ],
    ]);
  }

  async sendErrorReport(report: ErrorReport) {
    const errorMessage =
      report.error instanceof Error
        ? report.error.message
        : String(report.error);
    const stack =
      report.error instanceof Error ? report.error.stack : undefined;

    const embed: DiscordEmbed = {
      title: '🚨 Error Report',
      color: 0xff_00_00, // Red
      timestamp: report.timestamp ?? new Date().toISOString(),
      fields: [
        {
          name: 'Error Message',
          value: errorMessage.slice(0, 1024), // Discord has a 1024 char limit per field
        },
        {
          name: 'User ID',
          value: report.userId ?? 'Not available',
        },
        {
          name: 'URL',
          value: report.url ?? 'Not available',
        },
      ],
    };

    if (stack) {
      embed.fields.push({
        name: 'Stack Trace',
        value: `\`\`\`\n${stack.slice(0, 1000)}\n\`\`\``,
      });
    }

    if (report.additionalContext) {
      embed.fields.push({
        name: 'Additional Context',
        value: `\`\`\`json\n${JSON.stringify(report.additionalContext, null, 2).slice(0, 1000)}\n\`\`\``,
      });
    }

    await this.sendWebhook(DiscordNotificationType.ERROR_REPORT, embed);
  }

  async sendFeedbackReport(report: FeedbackReport) {
    const embed: DiscordEmbed = {
      title: '💬 Feedback Report',
      color: 0x00_ff_00, // Green
      timestamp: report.timestamp ?? new Date().toISOString(),
      fields: [
        {
          name: 'Feedback Type',
          value:
            report.feedbackType.charAt(0).toUpperCase() +
            report.feedbackType.slice(1),
          inline: true,
        },
        {
          name: 'User ID',
          value: report.userId ?? 'Anonymous',
          inline: true,
        },
        {
          name: 'Message',
          value: report.message.slice(0, 1024),
        },
        {
          name: 'URL',
          value: report.url ?? 'Not available',
        },
      ],
    };

    if (report.rating) {
      embed.fields.push({
        name: 'Rating',
        value: `${'⭐'.repeat(report.rating)} (${report.rating}/5)`,
        inline: true,
      });
    }

    if (report.additionalContext) {
      embed.fields.push({
        name: 'Additional Context',
        value: `\`\`\`json\n${JSON.stringify(report.additionalContext, null, 2).slice(0, 1000)}\n\`\`\``,
      });
    }

    await this.sendWebhook(DiscordNotificationType.FEEDBACK, embed);
  }

  async sendUserSignup(report: UserSignup) {
    const embed: DiscordEmbed = {
      title: `🎉 New User Signup: ${report.username ?? report.email.split('@')[0]}`,
      color: 0x72_89_da, // Discord blue
      timestamp: report.timestamp ?? new Date().toISOString(),
      fields: [
        {
          name: 'Email',
          value: report.email,
          inline: true,
        },
        {
          name: 'Username',
          value: report.username ?? 'Not available',
          inline: true,
        },
        {
          name: 'User ID',
          value: report.userId ?? 'Not available',
          inline: true,
        },
      ],
    };

    if (report.additionalContext) {
      embed.fields.push({
        name: 'Additional Context',
        value: `\`\`\`json\n${JSON.stringify(report.additionalContext, null, 2).slice(0, 1000)}\n\`\`\``,
        inline: false,
      });
    }

    await this.sendWebhook(DiscordNotificationType.USER_SIGNUP, embed);
  }

  async sendSubscriptionEvent(event: SubscriptionEvent) {
    const { eventType } = event;

    // Get appropriate emoji and color based on event type
    const getEventConfig = (type: string) => {
      switch (type) {
        case 'created':
          return { emoji: '🎉', color: 0x00_ff_00, action: 'Created' }; // Green
        case 'cancelled':
          return { emoji: '⚠️', color: 0xff_a5_00, action: 'Cancelled' }; // Orange
        case 'deleted':
          return { emoji: '❌', color: 0xff_00_00, action: 'Deleted' }; // Red
        case 'updated':
          return { emoji: '🔄', color: 0x00_aa_ff, action: 'Updated' }; // Blue
        default:
          return { emoji: '📋', color: 0x72_89_da, action: 'Modified' }; // Discord blue
      }
    };

    const config = getEventConfig(eventType);
    const userDisplay =
      event.username || event.email?.split('@')[0] || 'Unknown User';

    const embed: DiscordEmbed = {
      title: `${config.emoji} Subscription ${config.action}: ${userDisplay}`,
      color: config.color,
      timestamp: event.timestamp ?? new Date().toISOString(),
      fields: [
        {
          name: 'Subscription ID',
          value: event.subscriptionId,
          inline: true,
        },
        {
          name: 'Event Type',
          value: eventType.charAt(0).toUpperCase() + eventType.slice(1),
          inline: true,
        },
      ],
    };

    if (event.email) {
      embed.fields.push({
        name: 'Email',
        value: event.email,
        inline: true,
      });
    }

    if (event.planName) {
      embed.fields.push({
        name: 'Plan',
        value: event.planName,
        inline: true,
      });
    }

    if (event.status) {
      embed.fields.push({
        name: 'Status',
        value: event.status.charAt(0).toUpperCase() + event.status.slice(1),
        inline: true,
      });
    }

    // Add pricing information
    if (event.amount !== undefined && event.currency) {
      const formattedAmount = (event.amount / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: event.currency.toUpperCase(),
      });

      let billingInfo = formattedAmount;
      if (event.interval && event.intervalCount) {
        const intervalDisplay =
          event.intervalCount === 1
            ? event.interval
            : `${event.intervalCount} ${event.interval}s`;
        billingInfo += ` / ${intervalDisplay}`;
      }

      embed.fields.push({
        name: 'Amount',
        value: billingInfo,
        inline: true,
      });
    }

    if (event.userId) {
      embed.fields.push({
        name: 'User ID',
        value: event.userId,
        inline: true,
      });
    }

    // Add period information for active subscriptions
    if (event.periodStart || event.periodEnd) {
      const periodInfo: string[] = [];
      if (event.periodStart) {
        periodInfo.push(`Start: ${event.periodStart}`);
      }
      if (event.periodEnd) {
        periodInfo.push(`End: ${event.periodEnd}`);
      }
      embed.fields.push({
        name: 'Period',
        value: periodInfo.join('\n'),
        inline: false,
      });
    }

    // Add cancellation details for cancelled subscriptions
    if (eventType === 'cancelled') {
      if (event.cancelAtPeriodEnd !== undefined) {
        embed.fields.push({
          name: 'Cancel at Period End',
          value: event.cancelAtPeriodEnd ? 'Yes' : 'No',
          inline: true,
        });
      }
      if (event.cancellationReason) {
        embed.fields.push({
          name: 'Cancellation Reason',
          value: event.cancellationReason,
          inline: false,
        });
      }
      if (event.cancellationFeedback) {
        embed.fields.push({
          name: 'Cancellation Feedback',
          value: event.cancellationFeedback.slice(0, 1024),
          inline: false,
        });
      }
    }

    // Add status change information for updates
    if (
      eventType === 'updated' &&
      event.previousStatus &&
      event.status !== event.previousStatus
    ) {
      embed.fields.push({
        name: 'Status Change',
        value: `${event.previousStatus} → ${event.status}`,
        inline: true,
      });
    }

    if (event.additionalContext) {
      embed.fields.push({
        name: 'Additional Context',
        value: `\`\`\`json\n${JSON.stringify(event.additionalContext, null, 2).slice(0, 1000)}\n\`\`\``,
        inline: false,
      });
    }

    await this.sendWebhook(DiscordNotificationType.SUBSCRIPTION, embed);
  }

  private async sendWebhook(
    type: (typeof DiscordNotificationType)[keyof typeof DiscordNotificationType],
    embed: DiscordEmbed
  ) {
    try {
      const webhookUrl = this.webhookUrls.get(type);

      if (!webhookUrl) {
        log.warn(
          `Discord webhook URL not configured for notification type: ${type}`
        );
        return;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      log.error(`Failed to send Discord ${type} notification`, { error });
    }
  }
}
