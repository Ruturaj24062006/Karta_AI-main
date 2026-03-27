import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { ProcessingStep } from '../hooks/useAnalysisStepper';

type Props = {
  steps: ProcessingStep[];
};

export default function ProcessingStepper({ steps }: Props) {
  return (
    <div className="stepper">
      {steps.map((step) => {
        const isDone = step.status === 'completed';
        const isActive = step.status === 'running';
        const isFail = step.status === 'failed';

        let stepClass = 'step pending';
        if (isDone) stepClass = 'step success';
        if (isActive) stepClass = 'step active';
        if (isFail) stepClass = 'step failed';

        return (
          <div key={step.id} className={stepClass}>
            <div className="step-icon">
              <div className="step-icon-inner" style={isFail ? { background: '#DC2626', borderColor: '#DC2626' } : {}}>
                {isDone ? (
                  <Check size={18} strokeWidth={3} />
                ) : isActive ? (
                  <Loader2 size={18} className="spinner" />
                ) : isFail ? (
                  <AlertTriangle size={16} color="white" />
                ) : (
                  <div className="dot"></div>
                )}
              </div>
            </div>
            <div className="step-content">
              <div className="step-title" style={isFail ? { color: '#DC2626' } : {}}>{step.title}</div>
              <div className="step-subtitle">{step.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
