// useWizardValidation.ts
import { useState } from 'react';
import { 
  validateStep, 
  validateCompleteData,
  ValidationError,
  WizardData,
  WizardStepData
} from '@/lib/validations/appointment';

export function useWizardValidation() {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validateWizardStep = async <T extends keyof typeof WizardStepSchemas>(
    step: T,
    data: Partial<WizardData>
  ): Promise<boolean> => {
    const validationErrors = await validateStep(step, data);
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // Change this to accept Partial<WizardData>
  const validateWizardData = async (data: Partial<WizardData>): Promise<boolean> => {
    const validationErrors = await validateCompleteData(data as WizardData);
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const getFieldError = (field: string): string | undefined => {
    const error = errors.find(err => err.path[0] === field);
    return error?.message;
  };

  const clearErrors = () => {
    setErrors([]);
  };
  
  return {
    errors,
    validateWizardStep,
    validateWizardData,
    getFieldError,
    clearErrors
  };
}
