"use client";

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Select } from '@/components/ui/select';
import { useWizardValidation } from '@/hooks/use-wizard-validation';
import { WizardData } from '@/lib/validations/appointment';
import { LocationType } from '@/types/calendar';

interface AppointmentWizardProps {
  surgeonId?: string;
  onComplete: (appointment: {
    eventTypeId: string;
    startTime: Date;
    duration: number;
    location: LocationType;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

export function AppointmentWizard({ surgeonId, onComplete, onCancel }: AppointmentWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    eventTypeId: '',
    duration: 0,
    date: null,
    time: null,
    location: 'Vienna',
    notes: ''
  });

  const {
    errors,
    validateWizardStep,
    validateWizardData,
    getFieldError,
    clearErrors
  } = useWizardValidation();

  const handleNext = async () => {
    clearErrors();

    const isValid = await validateWizardStep(step, data);
    if (!isValid) return;

    if (step === 1) {
      if (data.date) {
        const endDate = new Date(data.date);
        endDate.setDate(endDate.getDate() + 7);
        // Implement fetchAvailableSlots if needed
        // await fetchAvailableSlots(data.date, endDate, data.duration);
      }
    }

    setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    clearErrors();

    const isValid = await validateWizardData(data);
    if (!isValid) return;

    if (!data.date || !data.time) return;

    const [hours, minutes] = data.time.split(':').map(Number);
    const startTime = new Date(data.date);
    startTime.setHours(hours, minutes, 0, 0);

    onComplete({
      eventTypeId: data.eventTypeId,
      startTime,
      duration: data.duration,
      location: data.location,
      notes: data.notes
    });
  };

  const renderField = (name: keyof WizardData, component: React.ReactNode) => {
    const error = getFieldError(name);
    return (
      <div className="space-y-2">
        {component}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            {renderField('location', (
              <>
                <label className="text-sm font-medium">Location</label>
                <Select
                  value={data.location}
                  onValueChange={(value: LocationType) => setData({ ...data, location: value })}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select location" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="Vienna">Vienna</Select.Item>
                    <Select.Item value="Graz">Graz</Select.Item>
                    <Select.Item value="Linz">Linz</Select.Item>
                  </Select.Content>
                </Select>
              </>
            ))}

            {renderField('eventTypeId', (
              <>
                <label className="text-sm font-medium">Procedure Type</label>
                <Select
                  value={data.eventTypeId}
                  onValueChange={(value) => setData({ ...data, eventTypeId: value, duration: 0 })}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select procedure type" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="consultation">Consultation</Select.Item>
                    <Select.Item value="surgery">Surgery</Select.Item>
                    <Select.Item value="followup">Follow-up</Select.Item>
                  </Select.Content>
                </Select>
              </>
            ))}

            {data.eventTypeId && renderField('duration', (
              <>
                <label className="text-sm font-medium">Duration</label>
                <Select
                  value={data.duration.toString()}
                  onValueChange={(value) => setData({ ...data, duration: parseInt(value) })}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select duration" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="30">30 minutes</Select.Item>
                    <Select.Item value="60">1 hour</Select.Item>
                    <Select.Item value="90">1.5 hours</Select.Item>
                    <Select.Item value="120">2 hours</Select.Item>
                  </Select.Content>
                </Select>
              </>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {renderStep()}
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-md hover:bg-gray-100"
        >
          Cancel
        </button>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(prev => prev - 1)}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={step === 3 ? handleSubmit : handleNext}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {step === 3 ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  );
}
