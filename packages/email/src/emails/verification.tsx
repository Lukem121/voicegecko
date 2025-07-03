import * as React from "react";

import { sendEmail } from "../index";
import LinkTemplate from "../templates/link";

type UserWithEmail = {
  email: string;
  name: string;
};

export const sendVerificationEmail = async ({
  user,
  url,
}: {
  user: UserWithEmail;
  url: string;
}) => {
  await sendEmail({
    to: {
      email: user.email,
      name: user.name,
    },
    from: {
      email: "no-reply@smmhubx.com",
      name: "smmhubx",
    },
    categories: ["verification"],
    subject: "Verify your email address",
    react: (
      <LinkTemplate
        heading="Verify your email address"
        description="Your verification link is below - click it to verify your email address. This will redirect you back to smmhubx."
        url={url}
      />
    ),
  });
};
