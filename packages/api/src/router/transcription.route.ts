import type { TRPCRouterRecord } from "@trpc/server";

import { publicProcedure } from "../trpc";

interface TranscriptionItem {
  id: string;
  timestamp: string;
  content: string;
  status: "normal" | "silent" | "dismissed";
}

export const transcriptionRouter = {
  getAll: publicProcedure.query(async () => {
    const mockTranscriptions: { date: string; items: TranscriptionItem[] }[] = [
      {
        date: "TODAY",
        items: [
          {
            id: "1",
            timestamp: "09:40 PM",
            content: "Cats and dogs make fun-looking frogs.",
            status: "normal",
          },
          {
            id: "2",
            timestamp: "09:40 PM",
            content: "Cats and dogs make funny looking frogs.",
            status: "normal",
          },
          {
            id: "3",
            timestamp: "09:40 PM",
            content: "Audio is silent.",
            status: "silent",
          },
          {
            id: "4",
            timestamp: "09:40 PM",
            content:
              "Cats and dogs make fun-looking frogs. but they're interesting to discover whether or not we have that on TV.",
            status: "normal",
          },
          {
            id: "5",
            timestamp: "09:39 PM",
            content: "Audio is silent.",
            status: "silent",
          },
          {
            id: "6",
            timestamp: "09:39 PM",
            content: "cats and dogs make fun of looking frogs",
            status: "normal",
          },
          {
            id: "7",
            timestamp: "09:39 PM",
            content: "Cats and dogs make funny-looking frogs.",
            status: "normal",
          },
          {
            id: "8",
            timestamp: "09:38 PM",
            content: "The transcription was dismissed.",
            status: "dismissed",
          },
          {
            id: "9",
            timestamp: "09:38 PM",
            content: "The transcription was dismissed.",
            status: "dismissed",
          },
          {
            id: "10",
            timestamp: "09:38 PM",
            content: "Audio is silent.",
            status: "silent",
          },
          {
            id: "11",
            timestamp: "09:37 PM",
            content:
              "This is a test, and I'm interested to see how it handles both mine and your transcription. I'm curious mostly about the speed; I want to see how it handles processing this.",
            status: "normal",
          },
        ],
      },
      {
        date: "YESTERDAY",
        items: [
          {
            id: "12",
            timestamp: "12:56 AM",
            content: "Cats and dogs make funny looking frogs.",
            status: "normal",
          },
          {
            id: "13",
            timestamp: "12:56 AM",
            content: "Cats and dogs make fun of the frogs.",
            status: "normal",
          },
          {
            id: "14",
            timestamp: "12:37 AM",
            content: "Da-ba-da, da-ba-da, ba-da-ba-da.",
            status: "normal",
          },
          {
            id: "15",
            timestamp: "12:14 AM",
            content: "The transcription was dismissed.",
            status: "dismissed",
          },
          {
            id: "16",
            timestamp: "12:04 AM",
            content: "The transcription was dismissed.",
            status: "dismissed",
          },
        ],
      },
    ];

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return mockTranscriptions;
  }),
} satisfies TRPCRouterRecord;
