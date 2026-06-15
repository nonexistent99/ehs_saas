import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

interface SignatureCaptureProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  description?: string;
  height?: number;
}

export function SignatureCapture({
  label,
  value = "",
  onChange,
  description,
  height = 132,
}: SignatureCaptureProps) {
  const signatureRef = useRef<any>(null);
  const [editing, setEditing] = useState(!value);

  useEffect(() => {
    if (!value) {
      setEditing(true);
      if (signatureRef.current) signatureRef.current.clear();
    }
  }, [value]);

  const capture = () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) return;
    const canvas = signatureRef.current.getTrimmedCanvas?.() || signatureRef.current.getCanvas?.();
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    signatureRef.current?.clear();
    onChange("");
    setEditing(true);
  };

  return (
    <div className="space-y-2 rounded-md border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-sm font-semibold">{label}</Label>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex gap-2">
          {value && !editing ? (
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-border" onClick={() => setEditing(true)}>
              Refazer
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-border" onClick={clear}>
            <Eraser size={11} className="mr-1" /> Limpar
          </Button>
        </div>
      </div>

      {value && !editing ? (
        <div className="flex items-center justify-center rounded border border-border bg-white p-2" style={{ height }}>
          <img src={value} alt="Assinatura" className="max-h-full max-w-full object-contain" />
        </div>
      ) : (
        <div className="rounded border border-border bg-white touch-none" style={{ height }}>
          <SignatureCanvas
            ref={signatureRef}
            penColor="black"
            onEnd={capture}
            canvasProps={{ className: "w-full h-full" }}
          />
        </div>
      )}

      {value && editing ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-border" onClick={() => setEditing(false)}>
            Usar assinatura
          </Button>
        </div>
      ) : null}
    </div>
  );
}
