import { useState } from "react";
import { Button } from "./ui/button";
import { Camera, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, label, className }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB).");
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onChange(base64String);
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Erro ao processar imagem.");
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      {label && <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">{label}</label>}
      
      <div className="relative group border-2 border-dashed border-border rounded-xl aspect-video bg-secondary/30 flex items-center justify-center overflow-hidden transition-all hover:border-primary/50">
        {value ? (
          <>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button size="sm" variant="destructive" onClick={() => onChange("")} className="h-8 shadow-lg">
                <X size={14} className="mr-1.5" /> Remover
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <ImageIcon size={32} strokeWidth={1} />
                <span className="text-[10px] font-medium">PNG, JPG ou WEBP (Max 5MB)</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={loading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
