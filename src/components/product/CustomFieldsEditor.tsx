import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CustomField {
  label: string;
  type: "text" | "email" | "tel" | "textarea";
  required: boolean;
  placeholder?: string;
}

interface CustomFieldsEditorProps {
  fields: CustomField[];
  responses: Record<string, string>;
  onResponseChange: (label: string, value: string) => void;
  showValidation?: boolean;
}

export function CustomFieldsEditor({
  fields,
  responses,
  onResponseChange,
  showValidation = false,
}: CustomFieldsEditorProps) {
  if (!fields || fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const value = responses[field.label] || "";
        const isEmpty = !value.trim();
        const showError = showValidation && field.required && isEmpty;

        return (
          <div key={field.label} className="space-y-1.5">
            <Label htmlFor={`custom-field-${field.label}`}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.type === "textarea" ? (
              <Textarea
                id={`custom-field-${field.label}`}
                placeholder={field.placeholder}
                value={value}
                onChange={(e) => onResponseChange(field.label, e.target.value)}
                required={field.required}
                className={showError ? "border-destructive" : ""}
              />
            ) : (
              <Input
                id={`custom-field-${field.label}`}
                type={field.type}
                placeholder={field.placeholder}
                value={value}
                onChange={(e) => onResponseChange(field.label, e.target.value)}
                required={field.required}
                className={showError ? "border-destructive" : ""}
              />
            )}
            {showError && (
              <p className="text-xs text-destructive">This field is required</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
