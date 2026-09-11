export interface LicenseAssessment {
  status: 'allow' | 'review';
  reason: string;
}

export function assessLicense(license: string): LicenseAssessment {
  const value = license.trim().toLowerCase();
  if (/\bcc0\b|public domain|svg repo license/.test(value)) {
    return { status: 'allow', reason: 'Low-friction license according to the configured policy.' };
  }
  if (!value || value === 'unknown') {
    return { status: 'review', reason: 'License could not be identified from the icon page.' };
  }
  return { status: 'review', reason: 'This license may have attribution, copyleft, non-commercial, trademark, or other obligations.' };
}
