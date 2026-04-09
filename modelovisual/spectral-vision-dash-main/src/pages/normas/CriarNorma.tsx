import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Plus, Save, FileText } from "lucide-react";

export default function CriarNorma() {
  const [numero, setNumero] = useState(0);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [documentos, setDocumentos] = useState<string[]>([""]);

  const addDocumento = () => {
    setDocumentos([...documentos, ""]);
  };

  const updateDocumento = (index: number, value: string) => {
    const newDocs = [...documentos];
    newDocs[index] = value;
    setDocumentos(newDocs);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Adicionar Norma
          </h1>
          <p className="text-sm text-muted-foreground">
            Dashboard / Normas Regulamentadoras / Adicionar Norma
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 fade-in-up max-w-3xl">
          <p className="text-muted-foreground mb-6">
            Preencha os campos abaixo para adicionar uma nova NR
          </p>

          <div className="space-y-6">
            {/* Número da NR */}
            <div className="w-full sm:w-1/4">
              <Label htmlFor="numero" className="text-muted-foreground text-sm">
                Número da NR
              </Label>
              <Input
                id="numero"
                type="number"
                value={numero}
                onChange={(e) => setNumero(parseInt(e.target.value) || 0)}
                className="mt-1.5 h-12 bg-background border-border"
              />
            </div>

            {/* Nome */}
            <div>
              <Label htmlFor="nome" className="text-muted-foreground text-sm">
                Nome
              </Label>
              <Input
                id="nome"
                type="text"
                placeholder="Nome da Norma Regulamentadora"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1.5 h-12 bg-background border-border"
              />
            </div>

            {/* Descrição */}
            <div>
              <Label htmlFor="descricao" className="text-muted-foreground text-sm">
                Descrição Rápida
              </Label>
              <Textarea
                id="descricao"
                placeholder="Breve descrição da norma"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="mt-1.5 min-h-[100px] bg-background border-border resize-none"
              />
            </div>

            {/* Documentos */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-primary" />
                <Label className="text-foreground font-medium">Documentos</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Adicione os documentos necessários para a conformidade com a NR cadastrada.
              </p>

              <div className="space-y-3">
                {documentos.map((doc, index) => (
                  <Input
                    key={index}
                    type="text"
                    placeholder="Nome do documento"
                    value={doc}
                    onChange={(e) => updateDocumento(index, e.target.value)}
                    className="h-12 bg-background border-border"
                  />
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addDocumento}
                className="mt-3 w-full border-primary/30 text-primary hover:bg-primary/10 h-12"
              >
                <Plus className="h-4 w-4 mr-2" />
                ADICIONAR DOCUMENTO
              </Button>
            </div>

            {/* Submit Button */}
            <Button className="w-full h-12 bg-gradient-orange hover:opacity-90 text-white font-semibold mt-4">
              <Save className="h-4 w-4 mr-2" />
              SALVAR NORMA
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
