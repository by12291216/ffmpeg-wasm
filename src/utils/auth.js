import Cookies from "js-cookie";

const TOKEN_KEY = "accessToken";
export function getTokenAUTH() {
  return Cookies.get(TOKEN_KEY);
}
