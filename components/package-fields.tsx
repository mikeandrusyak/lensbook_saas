import { Input } from "@/components/ui/input";

export type PackageFieldValues = {
  name: string;
  description: string;
  price: string;
  durationHours: string;
};

// The four fields shared by the "new package" and the "edit package" forms.
// maxLength, min and step are only hints for the user; the server checks everything again.
export function PackageFields({ defaults }: { defaults?: PackageFieldValues }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="name"
          name="name"
          maxLength={100}
          required
          defaultValue={defaults?.name}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description (optional)
        </label>
        <Input
          id="description"
          name="description"
          maxLength={500}
          defaultValue={defaults?.description}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="price" className="text-sm font-medium">
          Price (CHF)
        </label>
        <Input
          id="price"
          name="price"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          required
          defaultValue={defaults?.price}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="durationHours" className="text-sm font-medium">
          Duration (hours)
        </label>
        <Input
          id="durationHours"
          name="durationHours"
          type="number"
          inputMode="decimal"
          min="0.1"
          step="0.1"
          required
          defaultValue={defaults?.durationHours}
        />
      </div>
    </>
  );
}
