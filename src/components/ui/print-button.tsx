"use client";
import { Button } from "@/components/ui/primitives";
export function PrintButton() { return <Button variant="secondary" onClick={() => window.print()}>Stampa / PDF</Button>; }
