"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useFareStore } from "@/stores/fare-store";

const searchSchema = z.object({
  pickup: z.string().min(3, "Enter a pickup location."),
  dropoff: z.string().min(3, "Enter a drop location."),
  specialCharges: z.number().min(0, "Special charges cannot be negative."),
  nightSurcharge: z.boolean(),
});

type SearchFormValues = z.infer<typeof searchSchema>;

export function FareForm() {
  const { pickup, dropoff, nightSurcharge, specialCharges, setNightSurcharge } = useFareStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      pickup: pickup?.description ?? "",
      dropoff: dropoff?.description ?? "",
      specialCharges,
      nightSurcharge,
    },
  });

  const onSubmit = (data: SearchFormValues) => {
    console.log("Fare search submitted", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 rounded-[1.5rem] border border-slate-200/80 bg-white p-8 shadow-soft">
      <div className="space-y-2">
        <label htmlFor="pickup" className="text-sm font-medium text-slate-700">
          Pickup location
        </label>
        <input
          id="pickup"
          type="text"
          {...register("pickup")}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
          placeholder="Enter pickup point"
        />
        {errors.pickup && <p className="text-sm text-red-600">{errors.pickup.message}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="dropoff" className="text-sm font-medium text-slate-700">
          Drop location
        </label>
        <input
          id="dropoff"
          type="text"
          {...register("dropoff")}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
          placeholder="Enter drop point"
        />
        {errors.dropoff && <p className="text-sm text-red-600">{errors.dropoff.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="specialCharges" className="text-sm font-medium text-slate-700">
            Special charges
          </label>
          <input
            id="specialCharges"
            type="number"
            step="0.5"
            min="0"
            {...register("specialCharges", { valueAsNumber: true })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            placeholder="Toll, waiting, luggage"
          />
          {errors.specialCharges && <p className="text-sm text-red-600">{errors.specialCharges.message}</p>}
        </div>

        <div className="flex items-end justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Night surcharge</p>
            <p className="text-sm text-slate-500">20% after 10 PM</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={nightSurcharge}
              onChange={(event) => setNightSurcharge(event.target.checked)}
              className="peer sr-only"
            />
            <span className="inline-block h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-500"></span>
            <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5"></span>
          </label>
        </div>
      </div>

      <Button type="submit" className="w-full rounded-full px-6 py-3" size="lg">
        Calculate fare
      </Button>
    </form>
  );
}
