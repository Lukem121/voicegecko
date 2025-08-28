import { CheckCircle2 } from 'lucide-react';

import SectionHeader from '~/app/_landing/section-header';
import SectionWrapper from '~/app/_landing/section-wrapper';

export default function ContactSuccessPage() {
  return (
    <div className="bg-background">
      <SectionWrapper className="py-2 md:py-10" useXPadding={false}>
        <div className="relative z-10 w-full rounded-3xl bg-[#F9F8F6] p-4 md:p-12 lg:p-16 dark:bg-zinc-900">
          <div
            className="-inset-x-40 -top-16 pointer-events-none absolute bottom-[-8rem] rounded-[4rem] blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse 800px 600px at 50% 50%, rgba(124, 228, 93, 0.25), transparent)',
            }}
          />
          <div className="relative">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <SectionHeader
                description="Thanks for reaching out. We’ll get back to you shortly."
                eyebrow="Support"
                heading="Message received"
                headingSize="xl"
              />
            </div>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
