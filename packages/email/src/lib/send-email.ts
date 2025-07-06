import type { MailDataRequired } from "@sendgrid/mail";
import type { ReactElement } from "react";
import { render } from "@react-email/components";
import sendgrid from "@sendgrid/mail";

import { keys } from "../env";

sendgrid.setApiKey(keys().SENDGRID_API_KEY);

type Options = Omit<MailDataRequired, "html"> & {
  react: ReactElement;
};

export const sendEmail = async (options: Options) => {
  const html = await render(options.react);
  sendgrid.send({
    html,
    ...options,
  });
};
