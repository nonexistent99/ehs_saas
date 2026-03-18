import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Column {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
}

interface SecurityModuleListProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  items: any[];
  isLoading: boolean;
  columns: Column[];
  formContent: React.ReactNode;
  onOpenForm?: () => void;
  formOpen: boolean;
  setFormOpen: (open: boolean) => void;
  emptyMessage?: string;
  actions?: (item: any) => React.ReactNode;
}

export function SecurityModuleList({
  title, subtitle, icon, items, isLoading, columns,
  formContent, onOpenForm, formOpen, setFormOpen, emptyMessage, actions
}: SecurityModuleListProps) {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={title}
        subtitle={subtitle || `${items.length} registro(s)`}
        actions={
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground" onClick={onOpenForm}>
                <Plus size={14} className="mr-2" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
              </DialogHeader>
              {formContent}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <div className="text-muted-foreground opacity-40 mb-3 flex justify-center">{icon}</div>
              <p className="text-muted-foreground">{emptyMessage || "Nenhum registro encontrado"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {columns.map(col => (
                    <th key={col.key} className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">
                      {col.label}
                    </th>
                  ))}
                  {actions && <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item: any, i: number) => (
                  <tr key={item.id || i} className="hover:bg-secondary/20 transition-colors">
                    {columns.map(col => (
                      <td key={col.key} className="px-4 py-3">
                        {col.render ? col.render(item) : (
                          <span className="text-sm text-foreground">{item[col.key] || "—"}</span>
                        )}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-3 text-right">
                        {actions(item)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
