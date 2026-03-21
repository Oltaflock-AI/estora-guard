'use client';

interface PasswordStrengthProps {
  password: string;
  minLength?: number;
}

interface StrengthCheck {
  label: string;
  passed: boolean;
}

function getChecks(password: string, minLength: number): StrengthCheck[] {
  return [
    { label: `${minLength}+ characters`, passed: password.length >= minLength },
    { label: 'Uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'Number', passed: /\d/.test(password) },
    { label: 'Special character', passed: /[^a-zA-Z0-9]/.test(password) },
  ];
}

function getStrength(checks: StrengthCheck[]): {
  label: string;
  color: string;
  width: string;
} {
  const passed = checks.filter((c) => c.passed).length;
  if (passed <= 1) return { label: 'Weak', color: 'bg-error', width: 'w-1/5' };
  if (passed <= 2) return { label: 'Fair', color: 'bg-warning', width: 'w-2/5' };
  if (passed <= 3) return { label: 'Good', color: 'bg-warning', width: 'w-3/5' };
  if (passed <= 4) return { label: 'Strong', color: 'bg-success', width: 'w-4/5' };
  return { label: 'Excellent', color: 'bg-success', width: 'w-full' };
}

export default function PasswordStrength({
  password,
  minLength = 14,
}: PasswordStrengthProps) {
  if (!password) return null;

  const checks = getChecks(password, minLength);
  const strength = getStrength(checks);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
          />
        </div>
        <span className="text-[10px] font-medium text-secondary">
          {strength.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-1.5">
            <span
              className={`w-1 h-1 rounded-full flex-shrink-0 ${
                check.passed ? 'bg-success' : 'bg-border'
              }`}
            />
            <span
              className={`text-[10px] ${
                check.passed ? 'text-success' : 'text-disabled'
              }`}
            >
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
