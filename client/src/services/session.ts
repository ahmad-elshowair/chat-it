export const setFingerprintInSessionStorage = (fingerprint: string): void => {
  if (fingerprint) {
    sessionStorage.setItem("fingerprint", fingerprint);
  }
};

export const getFingerprintFromSessionStorage = (): string | null => {
  return sessionStorage.getItem("fingerprint");
};

export const removeFingerprintFromSessionStorage = (): void => {
  sessionStorage.removeItem("fingerprint");
};

export const setCsrfInSessionStorage = (csrf: string): void => {
  sessionStorage.setItem("csrf", csrf);
};

export const getCsrfFromSessionStorage = (): string | null => {
  return sessionStorage.getItem("csrf");
};

export const removeCsrfFromSessionStorage = (): void => {
  sessionStorage.removeItem("csrf");
};
