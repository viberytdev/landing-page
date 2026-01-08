import crypto from 'crypto';

/**
 * TypeScript License Key Generator for VibeRyt
 * 
 * License Types:
 * - TRIAL: Limited time trial (e.g., 7 days)
 * - LIFETIME: Permanent license
 * - DEMO: Demo version (limited recordings)
 */

export type LicenseType = 'T' | 'L' | 'D';

export interface LicenseMetadata {
  type: LicenseType;
  days: number;
  customerName: string;
  customerEmail: string;
  generatedDate: string;
  uniqueId: string;
}

export interface LicenseInfo {
  type: LicenseType;
  typeName: string;
  days: number;
  isLifetime: boolean;
  key: string;
}

export interface GeneratedLicense {
  licenseKey: string;
  metadata: LicenseMetadata;
}

export class LicenseKeyGenerator {
  private readonly secretSalt: string;

  private readonly LICENSE_TYPES: Record<LicenseType, string> = {
    T: 'TRIAL',
    L: 'LIFETIME',
    D: 'DEMO',
  };

  constructor(secretSalt?: string) {
    this.secretSalt = secretSalt || process.env.LICENSE_KEY_SECRET || 'VibeRyt2025SecretSalt';
  }

  /**
   * Generate a license key with embedded validity information
   */
  generateLicenseKey(
    licenseType: LicenseType = 'T',
    days: number = 7,
    customerName: string = '',
    customerEmail: string = ''
  ): GeneratedLicense {
    if (!Object.keys(this.LICENSE_TYPES).includes(licenseType)) {
      throw new Error(`Invalid license type. Must be one of: T, L, D`);
    }

    // Generate unique identifier
    const uniqueId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Create metadata
    const metadata: LicenseMetadata = {
      type: licenseType,
      days: licenseType === 'L' ? -1 : days,
      customerName,
      customerEmail,
      generatedDate: timestamp,
      uniqueId,
    };

    // Encode metadata into key segments
    const metadataString = JSON.stringify(metadata);
    const hashInput = `${metadataString}_${this.secretSalt}`;
    const hashDigest = crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex');

    // Extract segments from hash
    const seg1 = licenseType;
    const seg2 = licenseType === 'L' ? 'LIFE' : `${days.toString().padStart(4, '0')}`;
    const seg3 = hashDigest.substring(0, 4).toUpperCase();
    const seg4 = hashDigest.substring(4, 8).toUpperCase();
    const seg5 = hashDigest.substring(8, 12).toUpperCase();

    // Create key without checksum
    const keyWithoutChecksum = `VIBE-${seg1}${seg2}-${seg3}-${seg4}-${seg5}`;

    // Generate checksum
    const checksumInput = `${keyWithoutChecksum}_${this.secretSalt}`;
    const checksum = crypto
      .createHash('sha256')
      .update(checksumInput)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase();

    // Final license key
    const licenseKey = `${keyWithoutChecksum}-${checksum}`;

    return { licenseKey, metadata };
  }

  /**
   * Validate license key format and checksum
   */
  validateLicenseKeyFormat(licenseKey: string): { isValid: boolean; info: LicenseInfo | string } {
    try {
      // Basic format check
      if (!licenseKey.startsWith('VIBE-')) {
        return { isValid: false, info: 'Invalid prefix' };
      }

      const parts = licenseKey.split('-');
      if (parts.length !== 6) {
        return { isValid: false, info: 'Invalid format' };
      }

      // Extract components
      const [prefix, typeDuration, seg3, seg4, seg5, providedChecksum] = parts;

      // Validate checksum
      const keyWithoutChecksum = parts.slice(0, -1).join('-');
      const checksumInput = `${keyWithoutChecksum}_${this.secretSalt}`;
      const expectedChecksum = crypto
        .createHash('sha256')
        .update(checksumInput)
        .digest('hex')
        .substring(0, 4)
        .toUpperCase();

      if (providedChecksum !== expectedChecksum) {
        return { isValid: false, info: 'Invalid checksum' };
      }

      // Extract license type and duration
      const licenseType = typeDuration[0] as LicenseType;
      const durationStr = typeDuration.substring(1);

      if (!Object.keys(this.LICENSE_TYPES).includes(licenseType)) {
        return { isValid: false, info: 'Unknown license type' };
      }

      // Parse duration
      let days: number;
      if (durationStr === 'LIFE') {
        days = -1;
      } else {
        const parsed = parseInt(durationStr, 10);
        if (isNaN(parsed)) {
          return { isValid: false, info: 'Invalid duration format' };
        }
        days = parsed;
      }

      // Return license info
      const licenseInfo: LicenseInfo = {
        type: licenseType,
        typeName: this.LICENSE_TYPES[licenseType],
        days,
        isLifetime: licenseType === 'L',
        key: licenseKey,
      };

      return { isValid: true, info: licenseInfo };
    } catch (error) {
      return {
        isValid: false,
        info: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate trial license key (7 days)
   */
  generateTrialKey(customerName: string = '', customerEmail: string = ''): GeneratedLicense {
    return this.generateLicenseKey('T', 7, customerName, customerEmail);
  }

  /**
   * Generate lifetime license key
   */
  generateLifetimeKey(customerName: string = '', customerEmail: string = ''): GeneratedLicense {
    return this.generateLicenseKey('L', -1, customerName, customerEmail);
  }

  /**
   * Generate demo license key
   */
  generateDemoKey(
    recordings: number = 5,
    customerName: string = '',
    customerEmail: string = ''
  ): GeneratedLicense {
    return this.generateLicenseKey('D', recordings, customerName, customerEmail);
  }

  /**
   * Generate multiple license keys
   */
  generateBatchKeys(licenseType: LicenseType = 'T', days: number = 7, count: number = 10) {
    const keys = [];
    for (let i = 0; i < count; i++) {
      const customerId = `CUSTOMER_${String(i + 1).padStart(4, '0')}`;
      const { licenseKey, metadata } = this.generateLicenseKey(licenseType, days, customerId);
      keys.push({
        customerId,
        licenseKey,
        metadata,
      });
    }
    return keys;
  }
}

// Export singleton instance
export const licenseGenerator = new LicenseKeyGenerator();
