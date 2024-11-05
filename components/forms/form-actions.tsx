"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FormActionsProps {
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  isLoading?: boolean;
  showBack?: boolean;
  showNext?: boolean;
  showSubmit?: boolean;
  submitText?: string;
  className?: string;
}

export function FormActions({
  onBack,
  onNext,
  onSubmit,
  isLoading,
  showBack = true,
  showNext = true,
  showSubmit = false,
  submitText = "Submit",
  className,
}: FormActionsProps) {
  return (
    <div className={className}>
      <div className="flex justify-between">
        {showBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            Back
          </Button>
        )}
        <div className="flex space-x-2">
          {showNext && (
            <Button
              type="button"
              onClick={onNext}
              disabled={isLoading}
            >
              Next
            </Button>
          )}
          {showSubmit && (
            <Button
              type="submit"
              onClick={onSubmit}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}