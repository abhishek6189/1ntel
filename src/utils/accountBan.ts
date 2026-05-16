import { toast } from "sonner";

export const BANNED_CONTACT_EMAIL = "1ntelcarz@gmail.com";
export const BANNED_CONTACT_PHONE = "+14378607157";

export const isAccountBanned = (profile: any) =>
  profile?.is_banned === true ||
  String(profile?.account_status || "").toLowerCase() === "banned";

export const showBannedAccountMessage = () => {
  toast.error(
    `Your account has been temporarily banned by the admin. Please contact ${BANNED_CONTACT_EMAIL} or ${BANNED_CONTACT_PHONE}.`,
    { duration: 10000 }
  );
};
