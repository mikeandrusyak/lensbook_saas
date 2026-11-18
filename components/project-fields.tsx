import { Input } from "@/components/ui/input";

export type ProjectFieldValues = {
  names: string;
  email: string;
  eventDate: string;
  location: string;
};

// The four fields shared by the "new project" and the "edit project" forms.
// maxLength and type are only hints for the user; the server checks everything again.
export function ProjectFields({ defaults }: { defaults?: ProjectFieldValues }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="names" className="text-sm font-medium">
          Couple&apos;s names
        </label>
        <Input
          id="names"
          name="names"
          maxLength={200}
          required
          defaultValue={defaults?.names}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="off"
          maxLength={254}
          required
          defaultValue={defaults?.email}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="eventDate" className="text-sm font-medium">
          Event date (optional)
        </label>
        <Input
          id="eventDate"
          name="eventDate"
          type="date"
          defaultValue={defaults?.eventDate}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="location" className="text-sm font-medium">
          Location (optional)
        </label>
        <Input
          id="location"
          name="location"
          maxLength={200}
          defaultValue={defaults?.location}
        />
      </div>
    </>
  );
}
