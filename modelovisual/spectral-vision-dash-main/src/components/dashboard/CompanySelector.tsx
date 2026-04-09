import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

const companies = [
  { id: "1", name: "Equipe EHS" },
  { id: "2", name: "MSB Barcelona" },
  { id: "3", name: "MSB Madrid" },
  { id: "4", name: "Msb Valencia" },
];

export function CompanySelector() {
  return (
    <div className="fade-in-up">
      <Select defaultValue="all">
        <SelectTrigger className="w-full bg-card border-border h-12">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <SelectValue placeholder="Selecione uma empresa" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as empresas</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
