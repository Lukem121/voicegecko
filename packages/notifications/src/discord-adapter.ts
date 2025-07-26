import { notificationsEnv } from "./env";

// Notification types enum for extensibility
export enum DiscordNotificationType {
  ERROR_REPORT = "ERROR_REPORT",
  FEEDBACK = "FEEDBACK",
  USER_SIGNUP = "USER_SIGNUP",
}

// Base interface for all notifications
interface BaseNotification {
  userId?: string;
  additionalContext?: Record<string, unknown>;
  url?: string;
  timestamp?: string;
}

// Specific notification interfaces
export interface ErrorReport extends BaseNotification {
  error: Error;
}

export interface FeedbackReport extends BaseNotification {
  feedbackType: "bug" | "feature" | "general";
  message: string;
  rating?: number;
}

export interface UserSignup extends BaseNotification {
  email: string;
  username?: string;
}

// Discord embed interface
interface DiscordEmbed {
  title: string;
  color: number;
  fields: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
  timestamp?: string;
}

export class DiscordAdapter {
  private webhookUrls: Map<DiscordNotificationType, string>;

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
      title: "🚨 Error Report",
      color: 0xff0000, // Red
      timestamp: report.timestamp ?? new Date().toISOString(),
      fields: [
        {
          name: "Error Message",
          value: errorMessage.slice(0, 1024), // Discord has a 1024 char limit per field
        },
        {
          name: "User ID",
          value: report.userId ?? "Not available",
        },
        {
          name: "URL",
          value: report.url ?? "Not available",
        },
      ],
    };

    if (stack) {
      embed.fields.push({
        name: "Stack Trace",
        value: `\`\`\`\n${stack.slice(0, 1000)}\n\`\`\``,
      });
    }

    if (report.additionalContext) {
      embed.fields.push({
        name: "Additional Context",
        value: `\`\`\`json\n${JSON.stringify(report.additionalContext, null, 2).slice(0, 1000)}\n\`\`\``,
      });
    }

    await this.sendWebhook(DiscordNotificationType.ERROR_REPORT, embed);
  }

  async sendFeedbackReport(report: FeedbackReport) {
    const embed: DiscordEmbed = {
      title: "💬 Feedback Report",
      color: 0x00ff00, // Green
      timestamp: report.timestamp ?? new Date().toISOString(),
      fields: [
        {
          name: "Feedback Type",
          value:
            report.feedbackType.charAt(0).toUpperCase() +
            report.feedbackType.slice(1),
          inline: true,
        },
        {
          name: "User ID",
          value: report.userId ?? "Anonymous",
          inline: true,
        },
        {
          name: "Message",
          value: report.message.slice(0, 1024),
        },
        {
          name: "URL",
          value: report.url ?? "Not available",
        },
      ],
    };

    if (report.rating) {
      embed.fields.push({
        name: "Rating",
        value: `${"⭐".repeat(report.rating)} (${report.rating}/5)`,
        inline: true,
      });
    }

    if (report.additionalContext) {
      embed.fields.push({
        name: "Additional Context",
        value: `\`\`\`json\n${JSON.stringify(report.additionalContext, null, 2).slice(0, 1000)}\n\`\`\``,
      });
    }

    await this.sendWebhook(DiscordNotificationType.FEEDBACK, embed);
  }

  async sendUserSignup(report: UserSignup) {
    const embed: DiscordEmbed = {
      title: "🎉 New User Signup",
      color: 0x7289da, // Discord blue
      timestamp: report.timestamp ?? new Date().toISOString(),
      fields: [
        {
          name: "Email",
          value: report.email,
          inline: true,
        },
        {
          name: "Username",
          value: report.username ?? "Not available",
          inline: true,
        },
        {
          name: "User ID",
          value: report.userId ?? "Not available",
          inline: true,
        },
      ],
    };

    if (report.additionalContext) {
      embed.fields.push({
        name: "Additional Context",
        value: `\`\`\`json\n${JSON.stringify(report.additionalContext, null, 2).slice(0, 1000)}\n\`\`\``,
        inline: false,
      });
    }

    await this.sendWebhook(DiscordNotificationType.USER_SIGNUP, embed);
  }

  private async sendWebhook(
    type: DiscordNotificationType,
    embed: DiscordEmbed,
  ) {
    try {
      const webhookUrl = this.webhookUrls.get(type);

      if (!webhookUrl) {
        console.warn(
          `Discord webhook URL not configured for notification type: ${type}`,
        );
        return;
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ embeds: [embed] }),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to send Discord ${type} notification`, { error });
    }
  }
}
