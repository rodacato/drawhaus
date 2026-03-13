import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setupApi } from "@/api/setup";
import { SetupProgress } from "@/components/setup/SetupProgress";
import { SetupStep1 } from "@/components/setup/SetupStep1";
import { SetupStep2 } from "@/components/setup/SetupStep2";
import { SetupStep3 } from "@/components/setup/SetupStep3";
import { ui } from "@/lib/ui";

export function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setupApi.getStatus().then((status) => {
      if (status.setupCompleted) {
        navigate("/login", { replace: true });
      } else {
        setStep(typeof status.step === "number" ? status.step : 1);
        setLoading(false);
      }
    }).catch(() => {
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  async function handleComplete() {
    try {
      await setupApi.complete();
      navigate("/dashboard", { replace: true });
    } catch {
      navigate("/dashboard", { replace: true });
    }
  }

  function handleStepComplete() {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-sm text-text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-8">
      <section className={`${ui.card} w-full max-w-md space-y-6`}>
        <div className="space-y-4 text-center">
          <img src="/logo-icon.svg" alt="Drawhaus" className="mx-auto h-10 w-10" />
          <h1 className={ui.h1}>Setup</h1>
          <SetupProgress current={step} />
        </div>

        {step === 1 && <SetupStep1 onComplete={handleStepComplete} />}
        {step === 2 && <SetupStep2 onComplete={handleStepComplete} />}
        {step === 3 && <SetupStep3 onComplete={handleStepComplete} />}
      </section>
    </div>
  );
}
