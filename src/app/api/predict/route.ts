import { NextResponse } from "next/server";
import { z } from "zod";
import { spawn } from "child_process";

const predictRequestSchema = z.object({
  pickup_lat: z.number().finite(),
  pickup_lng: z.number().finite(),
  drop_lat: z.number().finite(),
  drop_lng: z.number().finite(),
  distance_km: z.number().finite().positive(),
  hour: z.number().int().min(0).max(23).optional(),
  day_of_week: z.number().int().min(0).max(6).optional(),
});

function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371.0;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lng1Rad = (lng1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const lng2Rad = (lng2 * Math.PI) / 180;
  
  const dLat = lat2Rad - lat1Rad;
  const dLng = lng2Rad - lng1Rad;
  
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateHeuristicFallback(
  pickup_lat: number,
  pickup_lng: number,
  distance_km: number,
  hour: number,
  day_of_week: number
) {
  let overcharge = 15.0;
  
  // Night surcharge hours
  if (hour >= 22 || hour <= 5) {
    overcharge += 50.0;
  } else if (hour >= 17 && hour <= 20) {
    overcharge += 25.0;
  }
  
  // Weekends
  if (day_of_week >= 5) {
    overcharge += 15.0;
  }
  
  // Proximity to high dispute zones (Indiranagar / Majestic)
  const indiranagarDist = calculateHaversineDistance(pickup_lat, pickup_lng, 12.9718, 77.6411);
  const majesticDist = calculateHaversineDistance(pickup_lat, pickup_lng, 12.9778722, 77.5705353);
  
  if (indiranagarDist < 2.5 || majesticDist < 2.0) {
    overcharge += 45.0;
  }
  
  // Distance markup scaling
  overcharge += Math.min(distance_km * 2.0, 30.0);
  
  return overcharge;
}

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = predictRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", details: parsed.error.format() }, { status: 400 });
  }

  const data = parsed.data;
  const now = new Date();
  
  // Resolve defaults if not supplied
  const hour = data.hour ?? now.getHours();
  // Node.js dayOfWeek: Sunday is 0, but python models standard: Monday is 0
  // NextJS day (0 is Sunday, 1 is Monday... 6 is Saturday)
  // Python day (0 is Monday, 1 is Tuesday... 6 is Sunday)
  const nextJsDay = data.day_of_week ?? now.getDay();
  const dayOfWeek = nextJsDay === 0 ? 6 : nextJsDay - 1; // Translate Sunday (0 -> 6), Monday (1 -> 0)...

  const fallbackPrediction = calculateHeuristicFallback(
    data.pickup_lat,
    data.pickup_lng,
    data.distance_km,
    hour,
    dayOfWeek
  );

  return new Promise((resolve) => {
    // Spawn Python process to run inference
    const args = [
      "ml/predict.py",
      data.pickup_lat.toString(),
      data.pickup_lng.toString(),
      data.drop_lat.toString(),
      data.drop_lng.toString(),
      data.distance_km.toString(),
      hour.toString(),
      dayOfWeek.toString(),
    ];

    const pythonProcess = spawn("python", args);
    let outputData = "";
    let errorData = "";

    pythonProcess.stdout.on("data", (chunk) => {
      outputData += chunk.toString();
    });

    pythonProcess.stderr.on("data", (chunk) => {
      errorData += chunk.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.warn(`Python ML predict script failed (exit code ${code}). Error: ${errorData}`);
        resolve(
          NextResponse.json({
            predicted_overcharge: Math.round(fallbackPrediction * 100) / 100,
            source: "heuristic_fallback",
            warning: "Subprocess failed. Used rule-based fallback.",
          })
        );
        return;
      }

      try {
        const result = JSON.parse(outputData.trim());
        resolve(NextResponse.json(result));
      } catch (parseError) {
        console.warn("Failed to parse ML predict output:", parseError, outputData);
        resolve(
          NextResponse.json({
            predicted_overcharge: Math.round(fallbackPrediction * 100) / 100,
            source: "heuristic_fallback",
            warning: "Inference response malformed. Used rule-based fallback.",
          })
        );
      }
    });

    pythonProcess.on("error", (spawnError) => {
      console.warn("Failed to spawn Python process. Is Python installed and in PATH?", spawnError.message);
      resolve(
        NextResponse.json({
          predicted_overcharge: Math.round(fallbackPrediction * 100) / 100,
          source: "heuristic_fallback",
          warning: "Python process spawn failed. Used rule-based fallback.",
        })
      );
    });
  });
}
