import { describe, expect, it } from 'vitest';
import { isStrongPassword, passwordRequirements } from './password-policy';

describe('password policy', () => {
  it('accepts a password that meets every requirement', () => {
    expect(isStrongPassword('Correct-Horse-9!')).toBe(true);
  });

  it('reports every unmet requirement', () => {
    expect(passwordRequirements('lowercase only').filter((item) => !item.met).map((item) => item.key))
      .toEqual(['uppercase', 'number', 'symbol', 'noSpaces']);
  });
});
