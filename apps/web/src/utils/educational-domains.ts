import { EDUCATIONAL_DOMAINS } from "@acme/api/src/consts/educational-domains";

/**
 * Validates if an email address uses an educational domain
 * @param email - The email address to validate
 * @returns true if the email uses an educational domain, false otherwise
 */
export const isEducationalEmail = (email: string): boolean => {
  const emailDomain = email.toLowerCase();
  return EDUCATIONAL_DOMAINS.some((domain) => emailDomain.endsWith(domain));
};
