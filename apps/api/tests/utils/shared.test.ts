import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateOTP, isValidIndianPhone, calculateDistance, formatCurrency } from '@localmed/shared';

describe('Shared Utilities', () => {
  describe('generateOTP', () => {
    it('should generate OTP of specified length', () => {
      const otp6 = generateOTP(6);
      const otp4 = generateOTP(4);

      expect(otp6).toHaveLength(6);
      expect(otp4).toHaveLength(4);
    });

    it('should generate numeric OTP', () => {
      const otp = generateOTP(6);
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('should generate different OTPs each time', () => {
      const otp1 = generateOTP(6);
      const otp2 = generateOTP(6);
      // Very unlikely to be same
      expect(otp1).not.toBe(otp2);
    });
  });

  describe('isValidIndianPhone', () => {
    it('should return true for valid Indian phone numbers', () => {
      expect(isValidIndianPhone('9876543210')).toBe(true);
      expect(isValidIndianPhone('9123456789')).toBe(true);
      expect(isValidIndianPhone('6123456789')).toBe(true);
      expect(isValidIndianPhone('7123456789')).toBe(true);
      expect(isValidIndianPhone('8123456789')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(isValidIndianPhone('1234567890')).toBe(false); // Starts with 1
      expect(isValidIndianPhone('987654321')).toBe(false);  // Only 9 digits
      expect(isValidIndianPhone('98765432101')).toBe(false); // 11 digits
      expect(isValidIndianPhone('')).toBe(false);
      expect(isValidIndianPhone('abcdefghij')).toBe(false);
    });

    it('should handle phone numbers with country code', () => {
      expect(isValidIndianPhone('+919876543210')).toBe(false); // With +91 prefix
      expect(isValidIndianPhone('919876543210')).toBe(false); // With 91 prefix
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Delhi to Mumbai approximately 1150 km
      const distance = calculateDistance(28.6139, 77.2090, 19.0760, 72.8777);
      expect(distance).toBeGreaterThan(1100);
      expect(distance).toBeLessThan(1200);
    });

    it('should return 0 for same location', () => {
      const distance = calculateDistance(28.6139, 77.2090, 28.6139, 77.2090);
      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      // Sydney to Perth
      const distance = calculateDistance(-33.8688, 151.2093, -31.9505, 115.8605);
      expect(distance).toBeGreaterThan(2000);
      expect(distance).toBeLessThan(4000);
    });
  });

  describe('formatCurrency', () => {
    it('should format amount in INR', () => {
      const formatted = formatCurrency(1000);
      expect(formatted).toContain('₹');
      expect(formatted).toContain('1,000');
    });

    it('should handle decimal amounts', () => {
      const formatted = formatCurrency(99.99);
      expect(formatted).toContain('99.99');
    });

    it('should handle zero', () => {
      const formatted = formatCurrency(0);
      expect(formatted).toContain('₹');
    });
  });
});