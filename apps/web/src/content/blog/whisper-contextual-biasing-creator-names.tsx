import Link from 'next/link';
import type { ReactNode } from 'react';
import { APP_ROUTES } from '~/utils/app-routes';

const SOCIAL_FETCH_HOME = 'https://www.socialfetch.dev/';
const SOCIAL_FETCH_TRANSCRIPT_GUIDE =
  'https://www.socialfetch.dev/product/guides/how-to-get-tiktok-transcript';

function ExtLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      className="font-medium text-foreground underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <aside className="my-8 rounded-2xl border border-border bg-muted/40 px-5 py-4 text-muted-foreground text-sm leading-relaxed">
      {children}
    </aside>
  );
}

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2
      className="mt-12 mb-4 scroll-mt-28 font-semibold text-2xl text-foreground tracking-tight"
      id={id}
    >
      {children}
    </h2>
  );
}

function SubHeading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h3
      className="mt-8 mb-3 scroll-mt-28 font-semibold text-foreground text-lg"
      id={id}
    >
      {children}
    </h3>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="my-6 overflow-x-auto rounded-2xl border border-border bg-zinc-950 p-4 text-[13px] text-zinc-100 leading-relaxed dark:bg-zinc-900">
      <code>{children}</code>
    </pre>
  );
}

const ILLUSTRATIVE_CODE = `// Illustrative sketch — not production Voice Gecko source
async function socialVocabForVideo(videoUrl: string) {
  const res = await fetch(
    \`https://api.socialfetch.dev/v1/tiktok/videos/transcript?url=\${encodeURIComponent(videoUrl)}\`,
    { headers: { "x-api-key": process.env.SOCIALFETCH_API_KEY! } }
  );
  const json = await res.json();
  if (json.data?.lookupStatus !== "found") return [];

  // Prefer short spelling fragments over dumping the full transcript
  return extractCandidateSpellings(json.data.transcript?.content ?? "");
}

function buildWhisperSpellingGuide(terms: string[]) {
  // Whisper uses only the final ~224 tokens of the prompt —
  // put high-value entities at the end.
  return \`Vocabulary: \${terms.slice(0, 24).join(", ")}\`;
}`;

export function WhisperContextualBiasingArticle() {
  return (
    <article>
      <p className="text-muted-foreground text-lg leading-relaxed">
        You are drafting a reply to a Reel. You hit the hotkey and say:{' '}
        <em>
          “Love how Maya Chen explained the new AcmeGlow serum at twelve
          seconds.”
        </em>{' '}
        The transcript comes back with a mangled handle, the wrong product
        spelling, and a timestamp that looks like a street address. Your
        “99% accurate” speech model did fine on the filler words. It failed
        on the tokens that mattered.
      </p>

      <p>
        That gap — excellent aggregate word error rate, brittle proper nouns —
        is not a Voice Gecko quirk. It is a documented failure mode of modern
        automatic speech recognition (ASR). This article explains what the
        research shows, how Whisper’s prompt channel actually works, and how
        we extend Voice Gecko’s existing context stack with{' '}
        <strong>session-local social vocabulary</strong> so creator dictation
        gets handles and product names right more often.
      </p>

      <SectionHeading id="speed-vs-names">
        Speed is real. Name accuracy is the hidden tax.
      </SectionHeading>

      <p>
        Speech input is legitimately faster than typing for short messages.
        In a Stanford HCI study on mobile text entry, Ruan et al. found English
        speech input about{' '}
        <strong>3.0× faster</strong> than a state-of-the-art smartphone
        keyboard, with a lower overall error rate as well [
        <ExtLink href="https://hci.stanford.edu/research/speech/">6</ExtLink>
        ][
        <ExtLink href="https://arxiv.org/abs/1608.07323">6</ExtLink>
        ]. That is the marketing slide every dictation product loves.
      </p>

      <p>
        The same paper, though, measures the cost of correcting the initial
        speech transcript. Perfect speech would be even faster; real workflows
        spend time fixing mistakes. For creators, that tax concentrates on a
        tiny class of tokens:{' '}
        <strong>@handles, brand names, product drops, and niche slang</strong>.
        You can speak a caption at conversational pace and still lose the speed
        advantage retyping “AcmeGlow” three times.
      </p>

      <SectionHeading id="named-entities">
        What the research actually says about named entities
      </SectionHeading>

      <p>
        Word error rate (WER) averages over every token. Named entities are
        rare, short, and high-stakes — so they barely move the benchmark while
        dominating user frustration.
      </p>

      <SubHeading id="entity-error-rates">
        Benchmarks hide entity failure
      </SubHeading>

      <p>
        Zhou et al. evaluated 15 production speech models from OpenAI,
        Deepgram, Google, and Microsoft on U.S. street-name transcription —
        short, high-stakes utterances from linguistically diverse speakers.
        Despite low general WERs on standard benchmarks, they report an average
        street-name transcription error rate of about{' '}
        <strong>44%</strong> [
        <ExtLink href="https://arxiv.org/abs/2602.12249">3</ExtLink>
        ]. Almost every other street name was wrong.
      </p>

      <p>
        Street names are not Instagram handles. They are the same failure
        class: rare proper nouns with awkward phonetics and little training
        support. Creator names, product SKUs, and campaign hashtags land in
        that bucket.
      </p>

      <Callout>
        Prompting helps, but it is not magic. Summaries of the same
        street-name line of work note that even “perfect context” prompting —
        giving the model the full candidate list — still plateaus well below
        perfect accuracy [
        <ExtLink href="https://arxiv.org/abs/2602.12249">3</ExtLink>
        ]. Recognition remains hard. Context is necessary, not sufficient.
      </Callout>

      <SubHeading id="prompting-helps">
        Prompting Whisper with candidate names helps a lot
      </SubHeading>

      <p>
        Wei et al. (Interspeech 2024) studied Whisper on spoken named entities
        in a commercial banking setting — account names the model may have
        never heard, but that exist as a textual candidate list [
        <ExtLink href="https://www.isca-archive.org/interspeech_2024/wei24_interspeech.pdf">
          4
        </ExtLink>
        ]. Providing a prompt to the baseline Whisper model raised named-entity
        recall from <strong>0.078 to 0.412</strong> and cut WER from 32.01% to
        24.89%. The baseline model already has some sensitivity to prompts;
        prompt-aware fine-tuning improves further.
      </p>

      <p>
        Li et al.’s CB-Whisper work (LREC-COLING 2024) shows a similar jump on
        the Aishell hot-word subset: entity recall moved from{' '}
        <strong>8.4% with no prompt to 71.8% with a naive entity prompt</strong>{' '}
        [
        <ExtLink href="https://aclanthology.org/2024.lrec-main.262.pdf">
          5
        </ExtLink>
        ]. Other datasets saw absolute entity-recall gains on the order of
        10–20 points. The pattern is consistent: if you can put the right
        spellings in Whisper’s prompt channel, entity recall climbs.
      </p>

      <SectionHeading id="whisper-prompt-channel">
        How Whisper’s prompt channel actually works
      </SectionHeading>

      <p>
        Most modern dictation stacks — including Voice Gecko’s cloud and local
        Whisper paths — sit on the model family introduced in Radford et al.’s{' '}
        <em>Robust Speech Recognition via Large-Scale Weak Supervision</em> [
        <ExtLink href="https://arxiv.org/abs/2212.04356">1</ExtLink>
        ]. Whisper’s decoder can take prior text context. OpenAI’s prompting
        guide is the practical manual [
        <ExtLink href="https://github.com/openai/openai-cookbook/blob/main/examples/Whisper_prompting_guide.ipynb">
          2
        </ExtLink>
        ]:
      </p>

      <ul className="my-4 list-disc space-y-2 pl-6 text-foreground/90">
        <li>
          Prompts are <strong>not</strong> GPT-style instructions. Asking
          Whisper to “format as Markdown” does nothing useful. The model
          follows the <em>style</em> of the prompt, not commands inside it.
        </li>
        <li>
          Fictitious “spelling guides” work: a short list of people, products,
          and companies can steer spellings.
        </li>
        <li>
          The prompt is limited to roughly <strong>224 tokens</strong>. If you
          send more, only the <em>final</em> 224 tokens are used; earlier tokens
          are silently dropped.
        </li>
      </ul>

      <SubHeading id="prompt-recipe">A practical prompt recipe</SubHeading>

      <ol className="my-4 list-decimal space-y-2 pl-6 text-foreground/90">
        <li>
          Keep a short style seed if you need one (casual reply vs formal
          email).
        </li>
        <li>
          Append a compact spelling guide: comma-separated entities, not an
          essay.
        </li>
        <li>
          Put the highest-value entities at the <strong>end</strong> of the
          string so they survive the 224-token window.
        </li>
        <li>
          Prefer 10–30 critical terms over dumping a full video transcript into
          the prompt.
        </li>
      </ol>

      <SectionHeading id="voice-gecko-hints">
        What Voice Gecko already injects
      </SectionHeading>

      <p>
        Voice Gecko is a desktop dictation product: hotkey, speak, text lands
        on the clipboard or pastes into the focused app. Accuracy is not only
        “pick a bigger model.” We already build a per-session{' '}
        <strong>transcription hint</strong> from:
      </p>

      <ul className="my-4 list-disc space-y-2 pl-6 text-foreground/90">
        <li>
          <strong>Active window title</strong> — what app and document you are
          in
        </li>
        <li>
          <strong>Custom dictionary</strong> — stable terms you care about
          (capped so we stay inside Whisper’s prompt budget)
        </li>
        <li>
          <strong>Developer context</strong> — optional stack/project vocabulary
          for coding workflows
        </li>
        <li>
          <strong>Intent profiles</strong> — Developer / Formal / Chat / General,
          including Chat when the window looks like Slack or Discord
        </li>
      </ul>

      <p>
        That stack already improves technical terms and everyday polish. It
        still leaves a hole for social workflows: the vocabulary of{' '}
        <em>this</em> post changes every time you open a new creator.
      </p>

      <SectionHeading id="session-local-vocab">
        Session-local social vocabulary
      </SectionHeading>

      <p>
        A static dictionary wins forever on <em>your</em> brand name. It loses
        on:
      </p>

      <ul className="my-4 list-disc space-y-2 pl-6 text-foreground/90">
        <li>The creator you are replying to today</li>
        <li>A product drop that did not exist last week</li>
        <li>Slang and spoken product names inside this video’s audio</li>
      </ul>

      <p>
        The fix is architectural, not magical: when the focused context is a
        public social post or video, fetch a small set of public terms —
        author handle and display name, high-signal words from the spoken
        transcript, maybe a few caption tokens — and merge them into the
        trailing portion of the Whisper hint.
      </p>

      <SubHeading id="architecture">Architecture</SubHeading>

      <div className="my-8 overflow-x-auto rounded-2xl border border-border bg-muted/30 p-5">
        <p className="mb-3 font-medium text-foreground text-sm">
          Context → lookup → hint → speech model → paste
        </p>
        <ol className="space-y-2 font-mono text-muted-foreground text-xs sm:text-sm">
          <li>1. Active window / URL context (desktop)</li>
          <li>2. Optional server-side social lookup (public data only)</li>
          <li>3. Extract candidate spellings (truncate, end-load)</li>
          <li>4. Merge with user dictionary + profile seed</li>
          <li>5. Whisper / GPT-4o transcription with initial prompt</li>
          <li>6. Clipboard or Capsule review → paste</li>
        </ol>
      </div>

      <p>
        API keys stay on the server. The desktop never needs a social-data
        credential. We only use publicly available profile and media fields —
        you remain responsible for platform terms and how you use the text.
      </p>

      <SectionHeading id="worked-example">
        Worked example: TikTok reply dictation
      </SectionHeading>

      <p>
        Suppose a creator opens a public TikTok and wants to dictate a reply
        that mentions the speaker and a product named in the video. The server
        can pull a transcript via a social-data API — we use{' '}
        <ExtLink href={SOCIAL_FETCH_HOME}>Social Fetch</ExtLink> for this layer
        so we are not maintaining platform scrapers ourselves. Their{' '}
        <ExtLink href={SOCIAL_FETCH_TRANSCRIPT_GUIDE}>
          TikTok transcript guide
        </ExtLink>{' '}
        documents the lookup pattern (
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
          GET /v1/tiktok/videos/transcript
        </code>
        ).
      </p>

      <CodeBlock>{ILLUSTRATIVE_CODE}</CodeBlock>

      <p>
        Those candidate spellings feed the same hint builder we already use for
        dictionaries and developer context. Illustrative before/after (constructed
        example — not a measured benchmark):
      </p>

      <div className="my-8 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="py-2 pr-4 font-semibold">Spoken intent</th>
              <th className="py-2 pr-4 font-semibold">Without social context</th>
              <th className="py-2 font-semibold">With spelling guide</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-border border-b align-top">
              <td className="py-3 pr-4 text-foreground">
                “Love how Maya Chen explained AcmeGlow at twelve seconds”
              </td>
              <td className="py-3 pr-4">
                “Love how my agent explained acne glow at 12 seconds”
              </td>
              <td className="py-3 text-foreground">
                “Love how Maya Chen explained AcmeGlow at 12 seconds”
              </td>
            </tr>
            <tr className="align-top">
              <td className="py-3 pr-4 text-foreground">
                “Reply to @glowlabhq about the serum drop”
              </td>
              <td className="py-3 pr-4">
                “Reply to glow lab HQ about the serum drop”
              </td>
              <td className="py-3 text-foreground">
                “Reply to @glowlabhq about the serum drop”
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-muted-foreground text-sm">
        Table: illustrative outcomes for a creator-reply dictation session.
        Real gains depend on audio quality, accent, and how well the candidate
        list matches what was spoken.
      </p>

      <SectionHeading id="caveats">Caveats worth taking seriously</SectionHeading>

      <ul className="my-4 list-disc space-y-3 pl-6 text-foreground/90">
        <li>
          <strong>Prompting is not fine-tuning.</strong> Hard phonetics still
          fail. Entity error can remain high even with context [
          <ExtLink href="https://arxiv.org/abs/2602.12249">3</ExtLink>].
        </li>
        <li>
          <strong>Do not dump entire transcripts</strong> into the prompt.
          Extract entities, truncate, and end-load. Whisper will ignore anything
          past the last ~224 tokens [
          <ExtLink href="https://github.com/openai/openai-cookbook/blob/main/examples/Whisper_prompting_guide.ipynb">
            2
          </ExtLink>
          ].
        </li>
        <li>
          <strong>Over-biasing can invent names.</strong> Contextual prompting
          can pull unused candidates into the transcript. For social copy, a
          confirm-before-paste step (Voice Gecko’s Capsule compose mode) is a
          useful guardrail.
        </li>
        <li>
          <strong>Static dictionaries still matter</strong> for stable brand
          terms you use every day. Live social context is for the session-local
          long tail.
        </li>
        <li>
          <strong>Public data only, keys server-side.</strong> Treat social
          lookups like any other third-party API: least privilege, no secrets on
          the client, respect platform terms.
        </li>
      </ul>

      <SectionHeading id="close">Names, not slogans</SectionHeading>

      <p>
        Creators do not need another “150 words per minute” slogan. They need
        the names to be right. Contextual biasing is how serious ASR products
        close that gap — and live social context is how you keep the candidate
        list fresh when the post in front of you changes every minute.
      </p>

      <p>
        Voice Gecko already injects window context, dictionaries, and intent
        profiles into transcription. Extending that pipeline with a{' '}
        <ExtLink href={SOCIAL_FETCH_HOME}>live social data API</ExtLink> is how
        we keep creator handles and product terms in the spelling guide without
        asking users to maintain a scrapbook of every account they might reply
        to.
      </p>

      <p>
        If you dictate into emails, docs, and social apps all day,{' '}
        <Link
          className="font-medium text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          href={APP_ROUTES.MARKETING.DOWNLOAD}
        >
          download Voice Gecko
        </Link>{' '}
        and try context-aware dictation for yourself. For pricing and plans, see{' '}
        <Link
          className="font-medium text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          href={APP_ROUTES.MARKETING.PRICING}
        >
          Pricing
        </Link>
        .
      </p>

      <SectionHeading id="references">References</SectionHeading>

      <ol className="my-4 list-decimal space-y-3 pl-6 text-muted-foreground text-sm leading-relaxed">
        <li id="ref-1">
          Radford, A., et al. (2022/2023).{' '}
          <em>
            Robust Speech Recognition via Large-Scale Weak Supervision.
          </em>{' '}
          <ExtLink href="https://arxiv.org/abs/2212.04356">
            arXiv:2212.04356
          </ExtLink>
          ;{' '}
          <ExtLink href="https://proceedings.mlr.press/v202/radford23a.html">
            PMLR
          </ExtLink>
          .
        </li>
        <li id="ref-2">
          OpenAI Cookbook.{' '}
          <em>Whisper prompting guide.</em>{' '}
          <ExtLink href="https://github.com/openai/openai-cookbook/blob/main/examples/Whisper_prompting_guide.ipynb">
            GitHub notebook
          </ExtLink>
          .
        </li>
        <li id="ref-3">
          Zhou, K., et al. (2026).{' '}
          <em>
            “Sorry, I Didn’t Catch That”: How Speech Models Miss What Matters
            Most.
          </em>{' '}
          <ExtLink href="https://arxiv.org/abs/2602.12249">
            arXiv:2602.12249
          </ExtLink>
          .
        </li>
        <li id="ref-4">
          Wei, X., and McGregor, S. (2024).{' '}
          <em>
            Prompt Tuning for Speech Recognition on Unknown Spoken Name
            Entities.
          </em>{' '}
          Interspeech 2024.{' '}
          <ExtLink href="https://www.isca-archive.org/interspeech_2024/wei24_interspeech.pdf">
            PDF
          </ExtLink>
          .
        </li>
        <li id="ref-5">
          Li, Y., et al. (2024).{' '}
          <em>
            CB-Whisper: Contextual Biasing Whisper Using Open-Vocabulary
            Keyword-Spotting.
          </em>{' '}
          LREC-COLING 2024.{' '}
          <ExtLink href="https://aclanthology.org/2024.lrec-main.262.pdf">
            ACL Anthology PDF
          </ExtLink>
          .
        </li>
        <li id="ref-6">
          Ruan, S., et al. (2016/2018).{' '}
          <em>
            Comparing Speech and Keyboard Text Entry for Short Messages…
          </em>{' '}
          <ExtLink href="https://hci.stanford.edu/research/speech/">
            Stanford HCI project page
          </ExtLink>
          ;{' '}
          <ExtLink href="https://arxiv.org/abs/1608.07323">
            arXiv:1608.07323
          </ExtLink>
          .
        </li>
        <li id="ref-7">
          Social Fetch.{' '}
          <em>How to Get a TikTok Video Transcript with an API.</em>{' '}
          <ExtLink href={SOCIAL_FETCH_TRANSCRIPT_GUIDE}>
            Product guide
          </ExtLink>
          .
        </li>
      </ol>
    </article>
  );
}
