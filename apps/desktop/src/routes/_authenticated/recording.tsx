import { createFileRoute } from "@tanstack/react-router";
import { List, Mic, RotateCw, Search } from "lucide-react";

import { Button } from "@acme/ui/components/ui/button";
import { Card, CardContent } from "@acme/ui/components/ui/card";
import { Textarea } from "@acme/ui/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/recording")({
  component: RecordingPage,
});

function RecordingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Main Note Input */}
      <Card>
        <CardContent className="">
          <div className="space-y-4">
            <div className="relative">
              <Textarea
                placeholder="Start typing or click the microphone to record..."
                className="min-h-[200px] resize-none border-0 text-base focus-visible:ring-0"
              />
              <Button
                variant="secondary"
                size="icon"
                className={`absolute top-3 right-3 h-10 w-10 rounded-full`}
              >
                <Mic className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary">Finish</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recents Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-wide text-gray-500 uppercase">
            RECENTS
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="py-12 text-center">
          <p className="text-lg text-gray-500">No notes found</p>
        </div>
      </div>
    </div>
  );
}
