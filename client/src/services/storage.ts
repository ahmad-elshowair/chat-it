export const setFingerprint = (fingerprint: string): void => {
  if (fingerprint) {
    localStorage.setItem("fingerprint", fingerprint);
  }
};

export const getFingerprint = (): string | null => {
  return localStorage.getItem("fingerprint");
};

export const removeFingerprint = (): void => {
  localStorage.removeItem("fingerprint");
};

export const setCsrf = (csrf: string): void => {
  localStorage.setItem("csrf", csrf);
};

export const getCsrf = (): string | null => {
  return localStorage.getItem("csrf");
};

export const removeCsrf = (): void => {
  localStorage.removeItem("csrf");
};

const parseExpiryTime = (expireString: string) => {
  const unit = expireString.slice(-1);
  const value = parseInt(expireString.slice(0, -1), 10);

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
};

export const setTokenExpiration = (expiresIn: string) => {
  const expiresInMs = parseExpiryTime(expiresIn);
  const expirationTime = Date.now() + expiresInMs;
  localStorage.setItem("token_expiration", expirationTime.toString());
};

export const getTokenExpiration = (): number | null => {
  const expiration = localStorage.getItem("token_expiration");
  return expiration ? parseInt(expiration, 10) : null;
};

export const isTokenExpired = (): boolean => {
  const expiration = getTokenExpiration();
  return expiration ? Date.now() > expiration : false;
};

export const clearAuthStorage = (): void => {
  removeFingerprint();
  removeCsrf();
  localStorage.removeItem("token_expiration");
};
