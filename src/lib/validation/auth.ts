import { z } from "zod";
export const loginSchema = z.object({
  email: z.string().trim().email("Inserisci un indirizzo email valido"),
  password: z.string().min(8, "La password ha almeno 8 caratteri"),
  next: z.string().optional(),
});
