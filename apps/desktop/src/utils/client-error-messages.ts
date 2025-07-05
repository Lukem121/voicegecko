// Client-safe error messages for Tauri desktop app
// This file avoids importing any server-side dependencies

type ExtendedErrorCodes =
  | "USER_ALREADY_EXISTS"
  | "USER_BANNED"
  | "BANNED_USER"
  | "FAILED_TO_CREATE_SESSION"
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_TOKEN"
  | "INVALID_EMAIL_OR_PASSWORD"
  | "USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER"
  | "USERNAME_IS_INVALID"
  | "USERNAME_IS_TOO_SHORT"
  | "USERNAME_IS_TOO_LONG";

type ErrorTypes = Partial<
  Record<
    ExtendedErrorCodes,
    {
      en: string;
      es: string;
    }
  >
>;

const errorCodes = {
  USER_ALREADY_EXISTS: {
    en: "User already exists",
    es: "Usuario ya existe",
  },
  USER_BANNED: {
    en: "Your account has been banned. Please contact support for more information.",
    es: "Tu cuenta ha sido bloqueada. Por favor, contacta con soporte para más información.",
  },
  BANNED_USER: {
    en: "Your account has been banned. Please contact support for more information.",
    es: "Tu cuenta ha sido bloqueada. Por favor, contacta con soporte para más información.",
  },
  FAILED_TO_CREATE_SESSION: {
    en: "Authentication failed. This could be due to account restrictions or system issues. Please contact support if this persists.",
    es: "Autenticación fallida. Esto podría deberse a restricciones de cuenta o problemas del sistema. Por favor, contacta con soporte si esto persiste.",
  },
  EMAIL_NOT_VERIFIED: {
    en: "Please verify your email address. We have sent you a new verification email, check spam folder.",
    es: "Por favor, verifique su dirección de correo electrónico. Hemos enviado un nuevo correo de verificación, revise la carpeta de spam.",
  },
  USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER: {
    en: "Username already exists, please try another.",
    es: "El nombre de usuario ya existe, por favor intente con otro.",
  },
  INVALID_TOKEN: {
    en: "Invalid token, please request a new password reset.",
    es: "Token inválido, por favor solicite un nuevo restablecimiento de contraseña.",
  },
  INVALID_EMAIL_OR_PASSWORD: {
    en: "Invalid email or password",
    es: "Correo electrónico o contraseña inválidos",
  },
  USERNAME_IS_INVALID: {
    en: "Username is invalid",
    es: "El nombre de usuario es inválido",
  },
  USERNAME_IS_TOO_SHORT: {
    en: "Username is too short",
    es: "El nombre de usuario es demasiado corto",
  },
  USERNAME_IS_TOO_LONG: {
    en: "Username is too long",
    es: "El nombre de usuario es demasiado largo",
  },
} satisfies ErrorTypes;

export const getClientAuthErrorMessage = (
  code: string | ExtendedErrorCodes,
  lang: "en" | "es",
  defaultMessage = "An unexpected error occurred.",
) => {
  if (code in errorCodes) {
    return errorCodes[code as keyof typeof errorCodes][lang];
  }
  return defaultMessage;
};
