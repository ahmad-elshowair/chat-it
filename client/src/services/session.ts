export const setFingerprintInStorage = (fingerprint: string): void => {
  if (fingerprint) {
    sessionStorage.setItem("fingerprint", fingerprint);
  }
};

export const getFingerprintFromStorage = (): string | null => {
  return sessionStorage.getItem("fingerprint");
};

export const removeFingerprintFromStorage = (): void => {
  sessionStorage.removeItem("fingerprint");
};

export const getCsrfFromStorage = (): string | null => {
  return sessionStorage.getItem("csrf");
};

export const setCsrfInStorage = (csrf: string): void => {
  sessionStorage.setItem("csrf", csrf);
};

export const removeCsrfFromStorage = (): void => {
  sessionStorage.removeItem("csrf");
};
