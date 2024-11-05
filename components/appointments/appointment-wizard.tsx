"use client";

// Previous imports remain the same...
import { useWizardValidation } from '@/hooks/use-wizard-validation';
import { WizardData } from '@/lib/validations/appointment';

// ... rest of the imports

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

  // ... existing queries and effects remain the same

  const handleNext = async () => {
    clearErrors();
    
    const isValid = await validateWizardStep(step, data);
    if (!isValid) return;

    if (step === 1 && selectedEventType) {
      if (data.date) {
        const endDate = new Date(data.date);
        endDate.setDate(endDate.getDate() + 7);
        await fetchAvailableSlots(data.date, endDate, data.duration);
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

  // Update form fields to show validation errors
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

  // Update the renderStep function to use renderField
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
                  {/* ... Select content remains the same ... */}
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
                  {/* ... Select content remains the same ... */}
                </Select>
              </>
            ))}

            {selectedEventType && renderField('duration', (
              <>
                <label className="text-sm font-medium">Duration</label>
                <Select
                  value={data.duration.toString()}
                  onValueChange={(value) => setData({ ...data, duration: parseInt(value) })}
                >
                  {/* ... Select content remains the same ... */}
                </Select>
              </>
            ))}
          </div>
        );

      // ... rest of the steps remain similar but updated with renderField
    }
  };

  // ... rest of the component remains the same
}