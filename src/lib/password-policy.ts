export interface PasswordRequirement {
  key: 'length' | 'lowercase' | 'uppercase' | 'number' | 'symbol' | 'noSpaces';
  met: boolean;
}

export function passwordRequirements(password: string): PasswordRequirement[] {
  return [
    { key: 'length', met: password.length >= 12 && password.length <= 128 },
    { key: 'lowercase', met: /[a-z]/.test(password) },
    { key: 'uppercase', met: /[A-Z]/.test(password) },
    { key: 'number', met: /[0-9]/.test(password) },
    { key: 'symbol', met: /[^\p{L}\p{N}\s]/u.test(password) },
    { key: 'noSpaces', met: !/\s/u.test(password) },
  ];
}

export const isStrongPassword = (password: string): boolean => passwordRequirements(password).every((item) => item.met);
