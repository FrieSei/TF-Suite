"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  title: string;
  description?: string;
}

interface FormStepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function FormSteps({ steps, currentStep, className }: FormStepsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <nav aria-label="Progress">
        <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
          {steps.map((step, index) => (
            <li key={step.title} className="md:flex-1">
              <div
                className={cn(
                  "group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4",
                  index < currentStep
                    ? "border-primary"
                    : index === currentStep
                    ? "border-primary"
                    : "border-muted"
                )}
              >
                <span className="text-sm font-medium">
                  {index < currentStep ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <span className="text-muted-foreground">Step {index + 1}</span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    index <= currentStep
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="text-sm text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}