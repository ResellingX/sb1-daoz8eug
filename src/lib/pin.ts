const PIN_KEY = 'resellingx-pin';
const PRIVACY_KEY = 'resellingx-privacy-hidden';
const DEFAULT_PIN = '1234';

export function getPin(): string {
  return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
}

export function setPin(pin: string) {
  localStorage.setItem(PIN_KEY, pin);
}

export function verifyPin(input: string): boolean {
  return input === getPin();
}

export function isPrivacyHidden(): boolean {
  return localStorage.getItem(PRIVACY_KEY) === '1';
}

export function setPrivacyHidden(hidden: boolean) {
  localStorage.setItem(PRIVACY_KEY, hidden ? '1' : '0');
}
